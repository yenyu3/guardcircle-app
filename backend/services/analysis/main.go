package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
)

// ── Request / Response ──────────────────────────────────────────

type AnalysisRequest struct {
	UserID       string   `json:"user_id"`
	InputType    []string `json:"input_type"`    // ["text"] | ["text","url"] | ["image"] etc.
	InputContent string   `json:"input_content"` // raw text, URL, phone number, base64 image, or S3 key for media
	S3Key        string   `json:"s3_key,omitempty"`  // S3 object key for video/audio/file (uploaded via presigned URL)
	FileExt      string   `json:"file_ext,omitempty"` // file extension for video/audio/file (e.g. "mp4", "m4a", "pdf")
	Region       string   `json:"region,omitempty"`
	Poll         bool     `json:"poll,omitempty"` // if true, skip analysis and poll DB for recent result
}

type AnalysisResponse struct {
	Message string     `json:"message"`
	Data    *EventData `json:"data"`
}

type EventData struct {
	EventID      string   `json:"event_id"`
	UserID       string   `json:"user_id"`
	InputType    []string `json:"input_type"`
	InputContent string   `json:"input_content"`
	S3Key        string   `json:"s3_key,omitempty"`
	RiskLevel    string   `json:"risk_level"`
	RiskScore    int      `json:"risk_score"`
	ScamType     string   `json:"scam_type"`
	Summary      string   `json:"summary"`
	Consequence  string   `json:"consequence"`
	Reason       string   `json:"reason"`
	RiskFactors  []string `json:"risk_factors"`
	TopSignals   []string `json:"top_signals"`
	NotifyStatus string   `json:"notify_status"`
	CreatedAt    string   `json:"created_at"`
}

// ── Lambda entry point ──────────────────────────────────────────

var deps *Dependencies

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	return handleAnalysis(ctx, req, deps)
}

func main() {
	deps = newProductionDeps()
	lambda.Start(handler)
}

// ── Core pipeline (testable) ────────────────────────────────────

func handleAnalysis(ctx context.Context, req events.APIGatewayV2HTTPRequest, d *Dependencies) (events.APIGatewayV2HTTPResponse, error) {
	// 1. Parse request
	var ar AnalysisRequest
	if err := json.Unmarshal([]byte(req.Body), &ar); err != nil {
		log.Printf("invalid JSON body: %v", err)
		return errorResponse(400, "Invalid JSON body"), nil
	}
	if err := validateRequest(&ar); err != nil {
		return errorResponse(400, err.Error()), nil
	}

	if ar.Region == "" {
		ar.Region = "TW"
	}

	cfg := d.Config

	// Poll mode: skip analysis, wait for a recent result in DB
	if ar.Poll {
		log.Printf("[POLL] user_id=%s input_type=%v — polling for recent result", ar.UserID, ar.InputType)
		return handlePoll(ctx, &ar, d)
	}

	log.Printf("[PIPELINE] user_id=%s input_type=%v region=%s", ar.UserID, ar.InputType, ar.Region)

	// 2. Route media/file types to appropriate handler
	needsTranscribe := false
	needsFileExtract := false
	isVideo := false
	for _, t := range ar.InputType {
		if t == "video" || t == "audio" {
			needsTranscribe = true
		}
		if t == "file" {
			if isDocumentFile(ar.FileExt) {
				needsFileExtract = true
			} else {
				needsTranscribe = true
			}
		}
		if t == "video" {
			isVideo = true
		}
	}

	var rekognitionContext string

	// 2a. File extraction (PDF, text/code files)
	if needsFileExtract {
		if cfg.TranscribeS3Bucket == "" {
			return errorResponse(500, "TRANSCRIBE_S3_BUCKET not configured"), nil
		}
		if ar.S3Key == "" {
			return errorResponse(400, "s3_key is required for file upload"), nil
		}
		log.Printf("[FILE_EXTRACT] extracting text from s3 key=%s ext=%s", ar.S3Key, ar.FileExt)
		extractedText, err := d.FileExtractor.Extract(ctx, cfg.TranscribeS3Bucket, ar.S3Key, ar.FileExt)
		if err != nil {
			log.Printf("[FILE_EXTRACT] error: %v", err)
			return errorResponse(500, "File text extraction failed"), nil
		}
		if extractedText == "" {
			extractedText = "(無法擷取檔案文字內容)"
		}
		log.Printf("[FILE_EXTRACT] extracted %d chars", len([]rune(extractedText)))
		ar.InputContent = extractedText
	}

	// 2b. Transcribe (video/audio, or non-document files)
	if needsTranscribe {
		if cfg.TranscribeS3Bucket == "" {
			return errorResponse(500, "TRANSCRIBE_S3_BUCKET not configured"), nil
		}

		var transcribedText string
		var transcribeErr error

		if isVideo && ar.S3Key != "" {
			// Video with S3 key: run Transcribe + Rekognition in parallel
			log.Printf("[TRANSCRIBE] using S3 key: %s", ar.S3Key)
			log.Printf("[REKOGNITION] starting video analysis: %s", ar.S3Key)

			var wg sync.WaitGroup
			var rekResult *VideoAnalysisResult
			var rekErr error

			wg.Add(2)
			go func() {
				defer wg.Done()
				transcribedText, transcribeErr = d.Transcriber.TranscribeFromS3(ctx, cfg.BedrockRegion, cfg.TranscribeS3Bucket, ar.S3Key, ar.FileExt)
			}()
			go func() {
				defer wg.Done()
				rekResult, rekErr = d.VideoAnalyzer.Analyze(ctx, cfg.TranscribeS3Bucket, ar.S3Key)
			}()
			wg.Wait()

			if rekErr != nil {
				log.Printf("[REKOGNITION] error (non-fatal): %v", rekErr)
			} else if rekResult != nil {
				rekognitionContext = formatRekognitionContext(rekResult)
				log.Printf("[REKOGNITION] results:\n%s", rekognitionContext)
			}
		} else if ar.S3Key != "" {
			// Audio/file with S3 key
			log.Printf("[TRANSCRIBE] using S3 key: %s", ar.S3Key)
			transcribedText, transcribeErr = d.Transcriber.TranscribeFromS3(ctx, cfg.BedrockRegion, cfg.TranscribeS3Bucket, ar.S3Key, ar.FileExt)
		} else {
			// Legacy: base64 encoded content
			log.Printf("[TRANSCRIBE] using base64 content (legacy)")
			transcribedText, transcribeErr = d.Transcriber.Transcribe(ctx, cfg.BedrockRegion, cfg.TranscribeS3Bucket, ar.InputContent, ar.FileExt)
		}

		if transcribeErr != nil {
			if isVideo {
				// Video: Transcribe failure is non-fatal (e.g. no audio track in screen recordings)
				// Pipeline continues with Rekognition visual analysis and/or placeholder text
				log.Printf("[TRANSCRIBE] error (non-fatal for video): %v", transcribeErr)
			} else {
				log.Printf("[TRANSCRIBE] error: %v", transcribeErr)
				return errorResponse(500, "Media transcription failed"), nil
			}
		}
		if transcribedText == "" {
			transcribedText = "(無法辨識語音內容)"
		}
		ar.InputContent = transcribedText
	}

	// 3. Call external API for each input type
	var apiResults []*ExternalAPIResult
	for _, inputType := range ar.InputType {
		log.Printf("[EXTERNAL_API] calling type=%s", inputType)
		result, err := d.ExternalAPI.Call(ctx, inputType, ar.InputContent, ar.Region, cfg.WhoscallAPIKey, cfg.WhoscallBaseURL)
		if err != nil {
			log.Printf("[EXTERNAL_API] error type=%s: %v", inputType, err)
			result = &ExternalAPIResult{
				Source: inputType,
				Error:  err.Error(),
			}
		} else {
			resultJSON, _ := json.MarshalIndent(result, "", "  ")
			log.Printf("[EXTERNAL_API] result type=%s:\n%s", inputType, string(resultJSON))
		}
		apiResults = append(apiResults, result)
	}

	// 4. Query Bedrock Knowledge Base for similar scam cases
	var kbContext string
	if cfg.BedrockKBID != "" {
		var kbQuery string
		if isImageRequest(ar.InputType) {
			kbQuery = extractImageKBQuery(apiResults)
		} else {
			kbQuery = buildKBQuery(ar.InputType, ar.InputContent)
		}
		log.Printf("[KB] querying kb_id=%s query=%q", cfg.BedrockKBID, kbQuery)
		var kbErr error
		kbContext, kbErr = d.KnowledgeBase.Query(ctx, cfg.BedrockRegion, cfg.BedrockKBID, kbQuery)
		if kbErr != nil {
			log.Printf("[KB] error: %v", kbErr)
		} else if kbContext == "" {
			log.Printf("[KB] no matching results")
		} else {
			log.Printf("[KB] found results:\n%s", kbContext)
		}
	} else {
		log.Printf("[KB] skipped (BEDROCK_KB_ID not set)")
	}

	// 5. Append Rekognition context (if any) to KB context
	if rekognitionContext != "" {
		if kbContext != "" {
			kbContext += "\n\n"
		}
		kbContext += rekognitionContext
	}

	// 6. Send everything to Bedrock Claude Sonnet for analysis
	log.Printf("[BEDROCK] analyzing with model=%s", cfg.BedrockModelID)
	analysis, err := d.Analyzer.Analyze(ctx, cfg.BedrockRegion, cfg.BedrockModelID, &ar, apiResults, kbContext)
	if err != nil {
		log.Printf("[BEDROCK] error: %v", err)
		return errorResponse(500, "AI analysis failed"), nil
	}
	analysisJSON, _ := json.MarshalIndent(analysis, "", "  ")
	log.Printf("[BEDROCK] analysis result:\n%s", string(analysisJSON))

	// 6. Build event data
	now := time.Now().UTC()
	eventID := uuid.New().String()

	notifyStatus := "not_required"
	if analysis.RiskLevel == "high" {
		notifyStatus = "pending"
	}

	eventData := &EventData{
		EventID:      eventID,
		UserID:       ar.UserID,
		InputType:    ar.InputType,
		InputContent: truncateContent(ar.InputContent, 500),
		S3Key:        ar.S3Key,
		RiskLevel:    analysis.RiskLevel,
		RiskScore:    analysis.RiskScore,
		ScamType:     analysis.ScamType,
		Summary:      analysis.Summary,
		Consequence:  analysis.Consequence,
		Reason:       analysis.Reason,
		RiskFactors:  analysis.RiskFactors,
		TopSignals:   analysis.TopSignals,
		NotifyStatus: notifyStatus,
		CreatedAt:    now.Format(time.RFC3339),
	}

	// 7. Write to DB
	if err := d.DB.WriteScanEvent(ctx, eventData); err != nil {
		log.Printf("db write error (non-fatal): %v", err)
	}

	// 8. Return response
	resp := AnalysisResponse{
		Message: "analysis completed",
		Data:    eventData,
	}
	b, _ := json.Marshal(resp)
	return events.APIGatewayV2HTTPResponse{
		StatusCode: 200,
		Headers:    map[string]string{"content-type": "application/json"},
		Body:       string(b),
	}, nil
}

// ── Poll mode ───────────────────────────────────────────────────

// handlePoll waits for a recent scan_event matching user_id + input_type.
// Checks every 5 seconds, up to 25 seconds (to stay under API Gateway 30s timeout).
func handlePoll(ctx context.Context, ar *AnalysisRequest, d *Dependencies) (events.APIGatewayV2HTTPResponse, error) {
	for i := 0; i < 5; i++ {
		event, err := d.DB.FindRecentScanEvent(ctx, ar.UserID, ar.InputType, ar.InputContent, ar.S3Key)
		if err != nil {
			log.Printf("[POLL] db query error: %v", err)
		}
		if event != nil {
			log.Printf("[POLL] found result event_id=%s", event.EventID)
			resp := AnalysisResponse{
				Message: "analysis completed",
				Data:    event,
			}
			b, _ := json.Marshal(resp)
			return events.APIGatewayV2HTTPResponse{
				StatusCode: 200,
				Headers:    map[string]string{"content-type": "application/json"},
				Body:       string(b),
			}, nil
		}

		if i < 4 {
			select {
			case <-ctx.Done():
				return errorResponse(504, "Poll cancelled"), nil
			case <-time.After(5 * time.Second):
			}
		}
	}

	// Not found after 25 seconds — tell frontend to keep trying
	log.Printf("[POLL] no result found after 25s")
	return errorResponse(202, "Analysis still in progress, please retry"), nil
}

// ── Helpers ─────────────────────────────────────────────────────

func validateRequest(r *AnalysisRequest) error {
	if r.UserID == "" {
		return fmt.Errorf("missing required field: user_id")
	}
	if len(r.InputType) == 0 {
		return fmt.Errorf("missing required field: input_type")
	}
	validTypes := map[string]bool{
		"text": true, "url": true, "phone": true, "image": true,
		"video": true, "audio": true, "file": true,
	}
	for _, t := range r.InputType {
		if !validTypes[t] {
			return fmt.Errorf("invalid input_type: %q, must be text|url|phone|image|video|audio|file", t)
		}
		if (t == "video" || t == "audio" || t == "file") && r.FileExt == "" {
			return fmt.Errorf("file_ext is required for input_type %q", t)
		}
	}
	if r.InputContent == "" {
		return fmt.Errorf("missing required field: input_content")
	}
	return nil
}

func errorResponse(status int, msg string) events.APIGatewayV2HTTPResponse {
	body, _ := json.Marshal(map[string]string{"error": msg})
	return events.APIGatewayV2HTTPResponse{
		StatusCode: status,
		Headers:    map[string]string{"content-type": "application/json"},
		Body:       string(body),
	}
}

func truncateContent(s string, max int) string {
	runes := []rune(s)
	if len(runes) > max {
		return string(runes[:max])
	}
	return s
}

func buildKBQuery(inputTypes []string, content string) string {
	var parts []string
	typeSet := make(map[string]bool)
	for _, t := range inputTypes {
		typeSet[t] = true
	}

	// Text content (truncated)
	if typeSet["text"] || typeSet["video"] || typeSet["audio"] || typeSet["file"] {
		r := []rune(content)
		if len(r) > 200 {
			parts = append(parts, string(r[:200]))
		} else {
			parts = append(parts, content)
		}
	}

	if typeSet["url"] {
		parts = append(parts, "詐騙網址 "+content)
	}
	if typeSet["phone"] {
		parts = append(parts, "詐騙電話號碼 "+content)
	}
	if typeSet["image"] {
		parts = append(parts, "詐騙截圖分析")
	}

	if len(parts) == 0 {
		r := []rune(content)
		if len(r) > 200 {
			return string(r[:200])
		}
		return content
	}

	return strings.Join(parts, " ")
}
