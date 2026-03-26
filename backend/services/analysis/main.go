package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/google/uuid"
)

// ── Request / Response ──────────────────────────────────────────

type AnalysisRequest struct {
	UserID       string   `json:"user_id"`
	InputType    []string `json:"input_type"`    // ["text"] | ["text","url"] | ["image"] etc.
	InputContent string   `json:"input_content"` // raw text, URL, phone number, or base64 encoded media
	FileExt      string   `json:"file_ext,omitempty"` // file extension for video/audio/file (e.g. "mp4", "m4a", "pdf")
	Region       string   `json:"region,omitempty"`
}

type AnalysisResponse struct {
	Message string     `json:"message"`
	Data    *EventData `json:"data"`
}

type EventData struct {
	EventID      string   `json:"event_id"`
	UserID       string   `json:"user_id"`
	InputType    string   `json:"input_type"`
	InputContent string   `json:"input_content"`
	RiskLevel    string   `json:"risk_level"`
	RiskScore    int      `json:"risk_score"`
	ScamType     string   `json:"scam_type"`
	Summary      string   `json:"summary"`
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

	// 2. For video/audio/file: transcribe to text first
	needsTranscribe := false
	for _, t := range ar.InputType {
		if t == "video" || t == "audio" || t == "file" {
			needsTranscribe = true
			break
		}
	}
	if needsTranscribe {
		if cfg.TranscribeS3Bucket == "" {
			return errorResponse(500, "TRANSCRIBE_S3_BUCKET not configured"), nil
		}
		transcribedText, err := d.Transcriber.Transcribe(ctx, cfg.BedrockRegion, cfg.TranscribeS3Bucket, ar.InputContent, ar.FileExt)
		if err != nil {
			log.Printf("transcribe error: %v", err)
			return errorResponse(500, "Media transcription failed"), nil
		}
		if transcribedText == "" {
			transcribedText = "(無法辨識語音內容)"
		}
		ar.InputContent = transcribedText
	}

	// 3. Call external API for each input type
	var apiResults []*ExternalAPIResult
	for _, inputType := range ar.InputType {
		result, err := d.ExternalAPI.Call(ctx, inputType, ar.InputContent, ar.Region, cfg.WhoscallAPIKey, cfg.WhoscallBaseURL)
		if err != nil {
			log.Printf("external API error for %s (non-fatal): %v", inputType, err)
			result = &ExternalAPIResult{
				Source: inputType,
				Error:  err.Error(),
			}
		}
		apiResults = append(apiResults, result)
	}

	// 4. Query Bedrock Knowledge Base for similar scam cases
	var kbContext string
	if cfg.BedrockKBID != "" {
		var kbErr error
		kbContext, kbErr = d.KnowledgeBase.Query(ctx, cfg.BedrockRegion, cfg.BedrockKBID, buildKBQuery(ar.InputType[0], ar.InputContent))
		if kbErr != nil {
			log.Printf("knowledge base query error (non-fatal): %v", kbErr)
		}
	}

	// 5. Send everything to Bedrock Claude Sonnet for analysis
	analysis, err := d.Analyzer.Analyze(ctx, cfg.BedrockRegion, cfg.BedrockModelID, &ar, apiResults, kbContext)
	if err != nil {
		log.Printf("bedrock analysis error: %v", err)
		return errorResponse(500, "AI analysis failed"), nil
	}

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
		InputType:    strings.Join(ar.InputType, ","),
		InputContent: truncateContent(ar.InputContent, 500),
		RiskLevel:    analysis.RiskLevel,
		RiskScore:    analysis.RiskScore,
		ScamType:     analysis.ScamType,
		Summary:      analysis.Summary,
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

func buildKBQuery(inputType, content string) string {
	switch inputType {
	case "text", "video", "audio", "file":
		r := []rune(content)
		if len(r) > 200 {
			return string(r[:200])
		}
		return content
	case "url":
		return "詐騙網址 " + content
	case "phone":
		return "詐騙電話號碼 " + content
	case "image":
		return "詐騙截圖分析"
	default:
		return content
	}
}
