package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

// ══════════════════════════════════════════════════════════════════
// Mock implementations
// ══════════════════════════════════════════════════════════════════

// ── Mock ExternalAPI ────────────────────────────────────────────

type mockExternalAPI struct {
	result *ExternalAPIResult
	err    error
	called bool
}

func (m *mockExternalAPI) Call(ctx context.Context, inputType, content, region, apiKey, baseURL string) (*ExternalAPIResult, error) {
	m.called = true
	if m.err != nil {
		return nil, m.err
	}
	if m.result != nil {
		return m.result, nil
	}
	return &ExternalAPIResult{Source: inputType, RawData: nil}, nil
}

// ── Mock KnowledgeBase ──────────────────────────────────────────

type mockKnowledgeBase struct {
	context string
	err     error
	called  bool
}

func (m *mockKnowledgeBase) Query(ctx context.Context, region, kbID, query string) (string, error) {
	m.called = true
	return m.context, m.err
}

// ── Mock Analyzer ───────────────────────────────────────────────

type mockAnalyzer struct {
	analysis *BedrockAnalysis
	err      error
	called   bool
	// Capture what was passed in
	receivedReq        *AnalysisRequest
	receivedAPIResults []*ExternalAPIResult
	receivedKBContext  string
}

func (m *mockAnalyzer) Analyze(ctx context.Context, region, modelID string, req *AnalysisRequest, apiResults []*ExternalAPIResult, kbContext string) (*BedrockAnalysis, error) {
	m.called = true
	m.receivedReq = req
	m.receivedAPIResults = apiResults
	m.receivedKBContext = kbContext
	if m.err != nil {
		return nil, m.err
	}
	return m.analysis, nil
}

// ── Mock Transcriber ────────────────────────────────────────────

type mockTranscriber struct {
	text        string
	err         error
	called      bool
	calledFromS3 bool
	lastS3Key   string
}

func (m *mockTranscriber) Transcribe(ctx context.Context, region, bucket, base64Content, fileExt string) (string, error) {
	m.called = true
	return m.text, m.err
}

func (m *mockTranscriber) TranscribeFromS3(ctx context.Context, region, bucket, s3Key, fileExt string) (string, error) {
	m.called = true
	m.calledFromS3 = true
	m.lastS3Key = s3Key
	return m.text, m.err
}

// ── Mock FileExtractor ──────────────────────────────────────────

type mockFileExtractor struct {
	text   string
	err    error
	called bool
}

func (m *mockFileExtractor) Extract(ctx context.Context, bucket, s3Key, fileExt string) (string, error) {
	m.called = true
	return m.text, m.err
}

// ── Mock VideoAnalyzer ──────────────────────────────────────────

type mockVideoAnalyzer struct {
	result *VideoAnalysisResult
	err    error
	called bool
}

func (m *mockVideoAnalyzer) Analyze(ctx context.Context, bucket, s3Key string) (*VideoAnalysisResult, error) {
	m.called = true
	if m.err != nil {
		return nil, m.err
	}
	return m.result, nil
}

// ── Mock DB ─────────────────────────────────────────────────────

type mockDB struct {
	err       error
	called    bool
	lastEvent *EventData
}

func (m *mockDB) WriteScanEvent(ctx context.Context, e *EventData) error {
	m.called = true
	m.lastEvent = e
	return m.err
}

// ── Helper: build mock deps ─────────────────────────────────────

func newMockDeps() (*Dependencies, *mockExternalAPI, *mockKnowledgeBase, *mockAnalyzer, *mockTranscriber, *mockFileExtractor, *mockVideoAnalyzer, *mockDB) {
	ext := &mockExternalAPI{}
	kb := &mockKnowledgeBase{}
	az := &mockAnalyzer{
		analysis: &BedrockAnalysis{
			RiskLevel:   "high",
			RiskScore:   92,
			ScamType:    "假冒官方詐騙",
			Summary:     "偵測到高風險詐騙特徵",
			Reason:      "訊息要求操作 ATM 並提供驗證碼",
			RiskFactors: []string{"要求操作ATM", "索取驗證碼"},
			TopSignals:  []string{"假冒官方", "緊急催促", "索取敏感資訊"},
		},
	}
	tx := &mockTranscriber{}
	fe := &mockFileExtractor{}
	va := &mockVideoAnalyzer{}
	db := &mockDB{}

	d := &Dependencies{
		Config:        Config{},
		ExternalAPI:   ext,
		KnowledgeBase: kb,
		Analyzer:      az,
		Transcriber:   tx,
		FileExtractor: fe,
		VideoAnalyzer: va,
		DB:            db,
	}
	return d, ext, kb, az, tx, fe, va, db
}

func makeRequest(body interface{}) events.APIGatewayV2HTTPRequest {
	b, _ := json.Marshal(body)
	return events.APIGatewayV2HTTPRequest{Body: string(b)}
}

// ══════════════════════════════════════════════════════════════════
// Unit tests (pure functions)
// ══════════════════════════════════════════════════════════════════

func TestValidateRequest_Valid(t *testing.T) {
	cases := []AnalysisRequest{
		{UserID: "u1", InputType: []string{"text"}, InputContent: "hello"},
		{UserID: "u1", InputType: []string{"url"}, InputContent: "https://example.com"},
		{UserID: "u1", InputType: []string{"phone"}, InputContent: "+886912345678"},
		{UserID: "u1", InputType: []string{"image"}, InputContent: "base64data"},
		{UserID: "u1", InputType: []string{"video"}, InputContent: "base64data", FileExt: "mp4"},
		{UserID: "u1", InputType: []string{"audio"}, InputContent: "base64data", FileExt: "m4a"},
		{UserID: "u1", InputType: []string{"file"}, InputContent: "base64data", FileExt: "pdf"},
		{UserID: "u1", InputType: []string{"text", "url"}, InputContent: "check https://example.com"},
		{UserID: "u1", InputType: []string{"text", "image"}, InputContent: "base64data"},
	}
	for _, c := range cases {
		if err := validateRequest(&c); err != nil {
			t.Errorf("validateRequest(%+v) unexpected error: %v", c, err)
		}
	}
}

func TestValidateRequest_Errors(t *testing.T) {
	cases := []struct {
		name string
		req  AnalysisRequest
	}{
		{"missing user_id", AnalysisRequest{InputType: []string{"text"}, InputContent: "hi"}},
		{"invalid input_type", AnalysisRequest{UserID: "u1", InputType: []string{"unknown"}, InputContent: "hi"}},
		{"missing input_content", AnalysisRequest{UserID: "u1", InputType: []string{"text"}}},
		{"empty input_type", AnalysisRequest{UserID: "u1", InputType: []string{}, InputContent: "hi"}},
		{"video without file_ext", AnalysisRequest{UserID: "u1", InputType: []string{"video"}, InputContent: "data"}},
		{"audio without file_ext", AnalysisRequest{UserID: "u1", InputType: []string{"audio"}, InputContent: "data"}},
		{"file without file_ext", AnalysisRequest{UserID: "u1", InputType: []string{"file"}, InputContent: "data"}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if err := validateRequest(&c.req); err == nil {
				t.Errorf("expected error for %s", c.name)
			}
		})
	}
}

func TestErrorResponse(t *testing.T) {
	resp := errorResponse(400, "bad request")
	if resp.StatusCode != 400 {
		t.Errorf("expected status 400, got %d", resp.StatusCode)
	}
	var body map[string]string
	json.Unmarshal([]byte(resp.Body), &body)
	if body["error"] != "bad request" {
		t.Errorf("expected 'bad request', got %q", body["error"])
	}
}

func TestTruncateContent(t *testing.T) {
	if got := truncateContent("hello", 10); got != "hello" {
		t.Errorf("expected 'hello', got %q", got)
	}
	if got := truncateContent("abcdef", 3); got != "abc" {
		t.Errorf("expected 'abc', got %q", got)
	}
	if got := truncateContent("你好世界測試", 4); got != "你好世界" {
		t.Errorf("expected '你好世界', got %q", got)
	}
}

func TestBuildKBQuery(t *testing.T) {
	cases := []struct {
		inputTypes []string
		content    string
		expected   string
	}{
		{[]string{"url"}, "https://scam.com", "詐騙網址 https://scam.com"},
		{[]string{"phone"}, "+886123", "詐騙電話號碼 +886123"},
		{[]string{"image"}, "base64...", "詐騙截圖分析"},
		{[]string{"text"}, "短文", "短文"},
		{[]string{"video"}, "轉錄文字", "轉錄文字"},
		{[]string{"audio"}, "轉錄文字", "轉錄文字"},
		{[]string{"text", "url"}, "快點擊 https://scam.com", "快點擊 https://scam.com 詐騙網址 快點擊 https://scam.com"},
	}
	for _, c := range cases {
		if got := buildKBQuery(c.inputTypes, c.content); got != c.expected {
			t.Errorf("buildKBQuery(%v, %q) = %q, want %q", c.inputTypes, c.content, got, c.expected)
		}
	}
	// Long text truncation
	longText := make([]rune, 250)
	for i := range longText {
		longText[i] = '你'
	}
	got := buildKBQuery([]string{"text"}, string(longText))
	if len([]rune(got)) != 200 {
		t.Errorf("expected 200 runes, got %d", len([]rune(got)))
	}
}

func TestExtractJSON(t *testing.T) {
	cases := []struct {
		name, input, expected string
	}{
		{"raw JSON", `{"risk_level": "high"}`, `{"risk_level": "high"}`},
		{"markdown json block", "text\n```json\n{\"a\": 1}\n```\nend", `{"a": 1}`},
		{"markdown code block", "```\n{\"a\": 2}\n```", `{"a": 2}`},
		{"embedded JSON", `前文 {"a": 3} 後文`, `{"a": 3}`},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := extractJSON(c.input); got != c.expected {
				t.Errorf("extractJSON = %q, want %q", got, c.expected)
			}
		})
	}
}

func TestResolveMediaFormat(t *testing.T) {
	cases := map[string]string{
		"mp3": "mp3", "mp4": "mp4", "m4a": "mp4", "wav": "wav",
		"flac": "flac", "ogg": "ogg", "webm": "webm", "amr": "amr",
		".MP3": "mp3", "xyz": "mp4",
	}
	for ext, expected := range cases {
		if got := string(resolveMediaFormat(ext)); got != expected {
			t.Errorf("resolveMediaFormat(%q) = %q, want %q", ext, got, expected)
		}
	}
}

// ══════════════════════════════════════════════════════════════════
// Pipeline integration tests (with mocks)
// ══════════════════════════════════════════════════════════════════

func TestPipeline_TextHighRisk(t *testing.T) {
	d, ext, _, az, tx, _, _, db := newMockDeps()

	req := makeRequest(AnalysisRequest{
		UserID:       "user-123",
		InputType:    []string{"text"},
		InputContent: "我是銀行客服，請立即操作ATM解除分期付款",
	})

	resp, err := handleAnalysis(context.Background(), req, d)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}

	var result AnalysisResponse
	json.Unmarshal([]byte(resp.Body), &result)

	// Verify pipeline was called correctly
	if !ext.called {
		t.Error("ExternalAPI.Call should have been called")
	}
	if !az.called {
		t.Error("Analyzer.Analyze should have been called")
	}
	if !db.called {
		t.Error("DB.WriteScanEvent should have been called")
	}
	if tx.called {
		t.Error("Transcriber should NOT have been called for text input")
	}

	// Verify response data
	if result.Data.RiskLevel != "high" {
		t.Errorf("expected risk_level 'high', got %q", result.Data.RiskLevel)
	}
	if result.Data.RiskScore != 92 {
		t.Errorf("expected risk_score 92, got %d", result.Data.RiskScore)
	}
	if result.Data.NotifyStatus != "pending" {
		t.Errorf("expected notify_status 'pending' for high risk, got %q", result.Data.NotifyStatus)
	}
	if result.Data.UserID != "user-123" {
		t.Errorf("expected user_id 'user-123', got %q", result.Data.UserID)
	}
	if result.Data.ScamType != "假冒官方詐騙" {
		t.Errorf("expected scam_type '假冒官方詐騙', got %q", result.Data.ScamType)
	}

	// Verify DB received same data
	if db.lastEvent.RiskLevel != "high" {
		t.Errorf("DB event risk_level mismatch: %q", db.lastEvent.RiskLevel)
	}
}

func TestPipeline_TextLowRisk(t *testing.T) {
	d, _, _, az, _, _, _, db := newMockDeps()
	az.analysis = &BedrockAnalysis{
		RiskLevel:   "low",
		RiskScore:   12,
		ScamType:    "無",
		Summary:     "一般訊息",
		Reason:      "無詐騙特徵",
		RiskFactors: []string{},
		TopSignals:  []string{},
	}

	req := makeRequest(AnalysisRequest{
		UserID: "user-123", InputType: []string{"text"}, InputContent: "今天天氣很好",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)
	var result AnalysisResponse
	json.Unmarshal([]byte(resp.Body), &result)

	if result.Data.RiskLevel != "low" {
		t.Errorf("expected 'low', got %q", result.Data.RiskLevel)
	}
	if result.Data.NotifyStatus != "not_required" {
		t.Errorf("expected 'not_required' for low risk, got %q", result.Data.NotifyStatus)
	}
	if db.lastEvent.NotifyStatus != "not_required" {
		t.Errorf("DB should have 'not_required', got %q", db.lastEvent.NotifyStatus)
	}
}

func TestPipeline_URLWithAPIResult(t *testing.T) {
	d, ext, _, az, _, _, _, _ := newMockDeps()
	ext.result = &ExternalAPIResult{
		Source:  "url-check",
		RawData: map[string]interface{}{"trust_score": float64(15)},
	}

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"url"}, InputContent: "https://scam-site.xyz",
	})

	handleAnalysis(context.Background(), req, d)

	// Verify the API result was passed to the analyzer
	if len(az.receivedAPIResults) == 0 {
		t.Fatal("Analyzer should have received API results")
	}
	if az.receivedAPIResults[0].Source != "url-check" {
		t.Errorf("expected source 'url-check', got %q", az.receivedAPIResults[0].Source)
	}
}

func TestPipeline_PhoneWithKBContext(t *testing.T) {
	d, _, kb, az, _, _, _, _ := newMockDeps()
	d.Config.BedrockKBID = "kb-test-123"
	kb.context = "類似案例：+886900111222 為已知詐騙號碼"

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"phone"}, InputContent: "+886900111222",
	})

	handleAnalysis(context.Background(), req, d)

	if !kb.called {
		t.Error("KnowledgeBase.Query should have been called")
	}
	if az.receivedKBContext != "類似案例：+886900111222 為已知詐騙號碼" {
		t.Errorf("Analyzer should have received KB context, got %q", az.receivedKBContext)
	}
}

func TestPipeline_AudioTranscribe(t *testing.T) {
	d, _, _, az, tx, _, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.text = "你好，我是銀行客服"

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"audio"}, InputContent: "base64audiodata", FileExt: "m4a",
	})

	handleAnalysis(context.Background(), req, d)

	if !tx.called {
		t.Error("Transcriber should have been called for audio")
	}
	// Analyzer should receive the transcribed text, not the base64
	if az.receivedReq.InputContent != "你好，我是銀行客服" {
		t.Errorf("Analyzer should have received transcribed text, got %q", az.receivedReq.InputContent)
	}
}

func TestPipeline_VideoTranscribe(t *testing.T) {
	d, _, _, az, tx, _, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.text = "投資必賺，保證獲利"

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"video"}, InputContent: "base64video", FileExt: "mp4",
	})

	handleAnalysis(context.Background(), req, d)

	if !tx.called {
		t.Error("Transcriber should have been called for video")
	}
	if az.receivedReq.InputContent != "投資必賺，保證獲利" {
		t.Errorf("expected transcribed text, got %q", az.receivedReq.InputContent)
	}
}

func TestPipeline_FileTranscribe(t *testing.T) {
	d, _, _, az, tx, _, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.text = "匯款到以下帳戶"

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"file"}, InputContent: "base64file", FileExt: "wav",
	})

	handleAnalysis(context.Background(), req, d)

	if !tx.called {
		t.Error("Transcriber should have been called for file")
	}
	if az.receivedReq.InputContent != "匯款到以下帳戶" {
		t.Errorf("expected transcribed text, got %q", az.receivedReq.InputContent)
	}
}

func TestPipeline_TranscribeEmptyResult(t *testing.T) {
	d, _, _, az, tx, _, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.text = "" // empty transcription

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"audio"}, InputContent: "base64", FileExt: "m4a",
	})

	handleAnalysis(context.Background(), req, d)

	// Should fall back to placeholder text
	if az.receivedReq.InputContent != "(無法辨識語音內容)" {
		t.Errorf("expected fallback text, got %q", az.receivedReq.InputContent)
	}
}

func TestPipeline_AudioWithoutS3Bucket(t *testing.T) {
	d, _, _, _, _, _, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = ""

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"audio"}, InputContent: "base64", FileExt: "m4a",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)
	if resp.StatusCode != 500 {
		t.Errorf("expected 500, got %d", resp.StatusCode)
	}
}

func TestPipeline_TranscribeError(t *testing.T) {
	d, _, _, _, tx, _, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.err = fmt.Errorf("transcription timeout")

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"audio"}, InputContent: "base64", FileExt: "m4a",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)
	if resp.StatusCode != 500 {
		t.Errorf("expected 500, got %d", resp.StatusCode)
	}
}

func TestPipeline_ExternalAPIError_NonFatal(t *testing.T) {
	d, ext, _, az, _, _, _, _ := newMockDeps()
	ext.err = fmt.Errorf("API timeout")

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"url"}, InputContent: "https://example.com",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)

	// Should still succeed — external API error is non-fatal
	if resp.StatusCode != 200 {
		t.Errorf("expected 200 (non-fatal API error), got %d", resp.StatusCode)
	}
	// Analyzer should receive the error in API results
	if len(az.receivedAPIResults) == 0 || az.receivedAPIResults[0].Error != "API timeout" {
		t.Errorf("expected API error passed through")
	}
}

func TestPipeline_KBError_NonFatal(t *testing.T) {
	d, _, kb, az, _, _, _, _ := newMockDeps()
	d.Config.BedrockKBID = "kb-123"
	kb.err = fmt.Errorf("KB unavailable")

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"text"}, InputContent: "test",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)
	if resp.StatusCode != 200 {
		t.Errorf("expected 200 (non-fatal KB error), got %d", resp.StatusCode)
	}
	if az.receivedKBContext != "" {
		t.Errorf("expected empty KB context on error, got %q", az.receivedKBContext)
	}
}

func TestPipeline_AnalyzerError_Fatal(t *testing.T) {
	d, _, _, az, _, _, _, _ := newMockDeps()
	az.analysis = nil
	az.err = fmt.Errorf("model invocation failed")

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"text"}, InputContent: "test",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)
	if resp.StatusCode != 500 {
		t.Errorf("expected 500 for analyzer error, got %d", resp.StatusCode)
	}
}

func TestPipeline_DBError_NonFatal(t *testing.T) {
	d, _, _, _, _, _, _, db := newMockDeps()
	db.err = fmt.Errorf("connection refused")

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"text"}, InputContent: "test",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)
	// DB error is non-fatal — should still return 200
	if resp.StatusCode != 200 {
		t.Errorf("expected 200 (non-fatal DB error), got %d", resp.StatusCode)
	}
}

func TestPipeline_InvalidJSON(t *testing.T) {
	d, _, _, _, _, _, _, _ := newMockDeps()
	resp, _ := handleAnalysis(context.Background(), events.APIGatewayV2HTTPRequest{Body: "not json"}, d)
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestPipeline_MissingFields(t *testing.T) {
	d, _, _, _, _, _, _, _ := newMockDeps()
	req := makeRequest(map[string]string{"input_type": "text"})
	resp, _ := handleAnalysis(context.Background(), req, d)
	if resp.StatusCode != 400 {
		t.Errorf("expected 400, got %d", resp.StatusCode)
	}
}

func TestPipeline_DefaultRegion(t *testing.T) {
	d, _, _, az, _, _, _, _ := newMockDeps()

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"text"}, InputContent: "test",
		// Region omitted — should default to "TW"
	})

	handleAnalysis(context.Background(), req, d)

	if az.receivedReq.Region != "TW" {
		t.Errorf("expected default region 'TW', got %q", az.receivedReq.Region)
	}
}

func TestPipeline_ContentTruncatedInResponse(t *testing.T) {
	d, _, _, _, _, _, _, db := newMockDeps()

	longContent := make([]rune, 1000)
	for i := range longContent {
		longContent[i] = '字'
	}

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"text"}, InputContent: string(longContent),
	})

	resp, _ := handleAnalysis(context.Background(), req, d)
	var result AnalysisResponse
	json.Unmarshal([]byte(resp.Body), &result)

	if len([]rune(result.Data.InputContent)) != 500 {
		t.Errorf("expected content truncated to 500 runes, got %d", len([]rune(result.Data.InputContent)))
	}
	if len([]rune(db.lastEvent.InputContent)) != 500 {
		t.Errorf("DB event should also be truncated, got %d", len([]rune(db.lastEvent.InputContent)))
	}
}

func TestPipeline_AudioFromS3Key(t *testing.T) {
	d, _, _, az, tx, _, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.text = "從S3轉錄的內容"

	req := makeRequest(AnalysisRequest{
		UserID:       "u1",
		InputType:    []string{"audio"},
		InputContent: "placeholder",
		S3Key:        "uploads/abc123.m4a",
		FileExt:      "m4a",
	})

	handleAnalysis(context.Background(), req, d)

	if !tx.calledFromS3 {
		t.Error("TranscribeFromS3 should have been called when S3Key is provided")
	}
	if tx.lastS3Key != "uploads/abc123.m4a" {
		t.Errorf("expected S3 key 'uploads/abc123.m4a', got %q", tx.lastS3Key)
	}
	if az.receivedReq.InputContent != "從S3轉錄的內容" {
		t.Errorf("expected transcribed text from S3, got %q", az.receivedReq.InputContent)
	}
}

func TestPipeline_ImageCallsExternalAPI(t *testing.T) {
	d, ext, _, _, tx, _, _, _ := newMockDeps()
	ext.result = &ExternalAPIResult{
		Source:  "content-check",
		RawData: map[string]interface{}{"category": "SCAM"},
	}

	req := makeRequest(AnalysisRequest{
		UserID: "u1", InputType: []string{"image"}, InputContent: "base64imagedata",
	})

	handleAnalysis(context.Background(), req, d)

	if !ext.called {
		t.Error("ExternalAPI should be called for image")
	}
	if tx.called {
		t.Error("Transcriber should NOT be called for image")
	}
}

func TestPipeline_VideoWithRekognition(t *testing.T) {
	d, _, _, az, tx, _, va, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.text = "請匯款到以下帳戶"
	va.result = &VideoAnalysisResult{
		ModerationLabels: []ModerationItem{
			{Name: "Explicit Nudity", ParentName: "Nudity", Confidence: 85.5},
		},
		Labels: []LabelItem{
			{Name: "Person", Confidence: 99.1},
			{Name: "Text", Confidence: 88.3},
		},
	}

	req := makeRequest(AnalysisRequest{
		UserID:    "u1",
		InputType: []string{"video"},
		S3Key:     "uploads/test-video.mp4",
		FileExt:   "mp4",
		InputContent: "placeholder",
	})

	handleAnalysis(context.Background(), req, d)

	if !tx.calledFromS3 {
		t.Error("TranscribeFromS3 should have been called for video with S3 key")
	}
	if !va.called {
		t.Error("VideoAnalyzer should have been called for video with S3 key")
	}
	if az.receivedReq.InputContent != "請匯款到以下帳戶" {
		t.Errorf("expected transcribed text, got %q", az.receivedReq.InputContent)
	}
	// Rekognition context should be passed to analyzer via kbContext
	if !strings.Contains(az.receivedKBContext, "Rekognition") {
		t.Errorf("expected Rekognition context in KB context, got %q", az.receivedKBContext)
	}
	if !strings.Contains(az.receivedKBContext, "Explicit Nudity") {
		t.Errorf("expected moderation label in context, got %q", az.receivedKBContext)
	}
}

func TestPipeline_VideoWithoutS3Key_NoRekognition(t *testing.T) {
	d, _, _, _, tx, _, va, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.text = "測試內容"

	req := makeRequest(AnalysisRequest{
		UserID:       "u1",
		InputType:    []string{"video"},
		InputContent: "base64video",
		FileExt:      "mp4",
	})

	handleAnalysis(context.Background(), req, d)

	if !tx.called {
		t.Error("Transcriber should have been called")
	}
	if va.called {
		t.Error("VideoAnalyzer should NOT be called for legacy base64 video (no S3 key)")
	}
}

func TestPipeline_AudioNoRekognition(t *testing.T) {
	d, _, _, _, tx, _, va, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.text = "音檔內容"

	req := makeRequest(AnalysisRequest{
		UserID:       "u1",
		InputType:    []string{"audio"},
		S3Key:        "uploads/test.m4a",
		FileExt:      "m4a",
		InputContent: "placeholder",
	})

	handleAnalysis(context.Background(), req, d)

	if !tx.calledFromS3 {
		t.Error("TranscribeFromS3 should have been called for audio")
	}
	if va.called {
		t.Error("VideoAnalyzer should NOT be called for audio")
	}
}

func TestPipeline_RekognitionError_NonFatal(t *testing.T) {
	d, _, _, az, tx, _, va, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.text = "影片轉錄內容"
	va.err = fmt.Errorf("rekognition timeout")

	req := makeRequest(AnalysisRequest{
		UserID:       "u1",
		InputType:    []string{"video"},
		S3Key:        "uploads/test.mp4",
		FileExt:      "mp4",
		InputContent: "placeholder",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)

	// Rekognition error is non-fatal — should still return 200
	if resp.StatusCode != 200 {
		t.Errorf("expected 200 (Rekognition error is non-fatal), got %d", resp.StatusCode)
	}
	if az.receivedReq.InputContent != "影片轉錄內容" {
		t.Errorf("transcription should still work, got %q", az.receivedReq.InputContent)
	}
}

func TestPipeline_VideoTranscribeFailButRekognitionOK(t *testing.T) {
	d, _, _, az, tx, _, va, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.err = fmt.Errorf("Failed to parse audio file")
	va.result = &VideoAnalysisResult{
		Labels: []LabelItem{
			{Name: "Text", Confidence: 99.0},
			{Name: "Document", Confidence: 85.0},
		},
	}

	req := makeRequest(AnalysisRequest{
		UserID:       "u1",
		InputType:    []string{"video"},
		S3Key:        "uploads/silent-screen-recording.mov",
		FileExt:      "mov",
		InputContent: "placeholder",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)

	// Transcribe failed but Rekognition succeeded — pipeline should continue
	if resp.StatusCode != 200 {
		t.Errorf("expected 200 (video with Rekognition should continue), got %d: %s", resp.StatusCode, resp.Body)
	}
	if !va.called {
		t.Error("VideoAnalyzer should have been called")
	}
	if !strings.Contains(az.receivedKBContext, "Text") {
		t.Errorf("Rekognition context should be passed to analyzer, got %q", az.receivedKBContext)
	}
}

func TestPipeline_VideoBothTranscribeAndRekognitionFail(t *testing.T) {
	d, _, _, az, tx, _, va, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.err = fmt.Errorf("Failed to parse audio file")
	va.err = fmt.Errorf("rekognition timeout")

	req := makeRequest(AnalysisRequest{
		UserID:       "u1",
		InputType:    []string{"video"},
		S3Key:        "uploads/broken.mp4",
		FileExt:      "mp4",
		InputContent: "placeholder",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)

	// Video Transcribe failure is always non-fatal — pipeline continues with placeholder
	if resp.StatusCode != 200 {
		t.Errorf("expected 200 (video transcribe failure is non-fatal), got %d", resp.StatusCode)
	}
	// Should use placeholder text since transcription failed
	if az.receivedReq.InputContent != "(無法辨識語音內容)" {
		t.Errorf("expected placeholder text, got %q", az.receivedReq.InputContent)
	}
}

// ══════════════════════════════════════════════════════════════════
// File extraction tests
// ══════════════════════════════════════════════════════════════════

func TestPipeline_PDFFileExtraction(t *testing.T) {
	d, _, _, az, tx, fe, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	fe.text = "Game Theory Chapter 2 Homework"

	req := makeRequest(AnalysisRequest{
		UserID:       "u1",
		InputType:    []string{"file"},
		S3Key:        "uploads/homework.pdf",
		FileExt:      "pdf",
		InputContent: "placeholder",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)

	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}
	if !fe.called {
		t.Error("FileExtractor should have been called for PDF")
	}
	if tx.called {
		t.Error("Transcriber should NOT be called for PDF")
	}
	if az.receivedReq.InputContent != "Game Theory Chapter 2 Homework" {
		t.Errorf("expected extracted text, got %q", az.receivedReq.InputContent)
	}
}

func TestPipeline_PythonFileExtraction(t *testing.T) {
	d, _, _, az, tx, fe, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	fe.text = "import random\nprint(random.choice(['ha','haha']))"

	req := makeRequest(AnalysisRequest{
		UserID:       "u1",
		InputType:    []string{"file"},
		S3Key:        "uploads/joke.py",
		FileExt:      "py",
		InputContent: "placeholder",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)

	if resp.StatusCode != 200 {
		t.Errorf("expected 200, got %d: %s", resp.StatusCode, resp.Body)
	}
	if !fe.called {
		t.Error("FileExtractor should have been called for .py")
	}
	if tx.called {
		t.Error("Transcriber should NOT be called for .py")
	}
	if az.receivedReq.InputContent != "import random\nprint(random.choice(['ha','haha']))" {
		t.Errorf("expected extracted text, got %q", az.receivedReq.InputContent)
	}
}

func TestPipeline_AudioFileStillTranscribes(t *testing.T) {
	d, _, _, _, tx, fe, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	tx.text = "音檔內容"

	req := makeRequest(AnalysisRequest{
		UserID:       "u1",
		InputType:    []string{"file"},
		S3Key:        "uploads/recording.m4a",
		FileExt:      "m4a",
		InputContent: "placeholder",
	})

	handleAnalysis(context.Background(), req, d)

	if fe.called {
		t.Error("FileExtractor should NOT be called for .m4a")
	}
	if !tx.calledFromS3 {
		t.Error("Transcriber should be called for .m4a file")
	}
}

func TestPipeline_FileExtractionError(t *testing.T) {
	d, _, _, _, _, fe, _, _ := newMockDeps()
	d.Config.TranscribeS3Bucket = "test-bucket"
	fe.err = fmt.Errorf("pdftotext not found")

	req := makeRequest(AnalysisRequest{
		UserID:       "u1",
		InputType:    []string{"file"},
		S3Key:        "uploads/test.pdf",
		FileExt:      "pdf",
		InputContent: "placeholder",
	})

	resp, _ := handleAnalysis(context.Background(), req, d)

	if resp.StatusCode != 500 {
		t.Errorf("expected 500 for extraction error, got %d", resp.StatusCode)
	}
}

func TestIsDocumentFile(t *testing.T) {
	docs := []string{"pdf", "py", "txt", "json", "csv", "md", "go", "js", "html"}
	for _, ext := range docs {
		if !isDocumentFile(ext) {
			t.Errorf("expected isDocumentFile(%q) = true", ext)
		}
	}
	nonDocs := []string{"m4a", "mp3", "wav", "mp4", "mov", "ogg", "flac"}
	for _, ext := range nonDocs {
		if isDocumentFile(ext) {
			t.Errorf("expected isDocumentFile(%q) = false", ext)
		}
	}
}
