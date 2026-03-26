package main

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime"
	kbtypes "github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime/types"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
)

// BedrockAnalysis is the structured output from Claude.
type BedrockAnalysis struct {
	RiskLevel   string   `json:"risk_level"`
	RiskScore   int      `json:"risk_score"`
	ScamType    string   `json:"scam_type"`
	Summary     string   `json:"summary"`
	Reason      string   `json:"reason"`
	RiskFactors []string `json:"risk_factors"`
	TopSignals  []string `json:"top_signals"`
}

// ── Knowledge Base Query ────────────────────────────────────────

func queryKnowledgeBase(ctx context.Context, client *bedrockagentruntime.Client, kbID, query string) (string, error) {
	resp, err := client.Retrieve(ctx, &bedrockagentruntime.RetrieveInput{
		KnowledgeBaseId: aws.String(kbID),
		RetrievalQuery: &kbtypes.KnowledgeBaseQuery{
			Text: aws.String(query),
		},
		RetrievalConfiguration: &kbtypes.KnowledgeBaseRetrievalConfiguration{
			VectorSearchConfiguration: &kbtypes.KnowledgeBaseVectorSearchConfiguration{
				NumberOfResults: aws.Int32(3),
			},
		},
	})
	if err != nil {
		return "", fmt.Errorf("KB retrieve: %w", err)
	}

	var chunks []string
	for _, result := range resp.RetrievalResults {
		if result.Content != nil && result.Content.Text != nil {
			chunks = append(chunks, *result.Content.Text)
		}
	}

	if len(chunks) == 0 {
		return "", nil
	}
	return strings.Join(chunks, "\n---\n"), nil
}

// ── Bedrock Claude Analysis ─────────────────────────────────────

func analyzeWithBedrock(ctx context.Context, client *bedrockruntime.Client, modelID string, req *AnalysisRequest, apiResult *ExternalAPIResult, kbContext string) (*BedrockAnalysis, error) {
	prompt := buildPrompt(req, apiResult, kbContext)

	payload := map[string]interface{}{
		"anthropic_version": "bedrock-2023-05-31",
		"max_tokens":        2048,
		"messages": []map[string]interface{}{
			{
				"role":    "user",
				"content": prompt,
			},
		},
		"system": systemPrompt(),
	}

	payloadBytes, _ := json.Marshal(payload)

	resp, err := client.InvokeModel(ctx, &bedrockruntime.InvokeModelInput{
		ModelId:     aws.String(modelID),
		ContentType: aws.String("application/json"),
		Body:        payloadBytes,
	})
	if err != nil {
		return nil, fmt.Errorf("invoke model: %w", err)
	}

	var modelResp struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(resp.Body, &modelResp); err != nil {
		return nil, fmt.Errorf("parse model response: %w", err)
	}

	if len(modelResp.Content) == 0 {
		return nil, fmt.Errorf("empty model response")
	}

	// Extract JSON from response (Claude may wrap it in markdown code blocks)
	rawText := modelResp.Content[0].Text
	jsonStr := extractJSON(rawText)

	var analysis BedrockAnalysis
	if err := json.Unmarshal([]byte(jsonStr), &analysis); err != nil {
		return nil, fmt.Errorf("parse analysis JSON: %w (raw: %s)", err, rawText)
	}

	// Validate and clamp
	switch analysis.RiskLevel {
	case "low", "medium", "high":
	default:
		analysis.RiskLevel = "low"
	}
	if analysis.RiskScore < 0 {
		analysis.RiskScore = 0
	}
	if analysis.RiskScore > 100 {
		analysis.RiskScore = 100
	}
	if analysis.RiskFactors == nil {
		analysis.RiskFactors = []string{}
	}
	if analysis.TopSignals == nil {
		analysis.TopSignals = []string{}
	}

	return &analysis, nil
}

func systemPrompt() string {
	return `你是 GuardCircle 的詐騙偵測 AI 分析師。你的任務是根據使用者提交的內容、外部 API 查詢結果和知識庫中的相似詐騙案例，判斷該內容是否為詐騙。

你必須回傳嚴格的 JSON 格式（不要包含任何 markdown 格式或額外文字），欄位如下：
{
  "risk_level": "low" | "medium" | "high",
  "risk_score": 0-100 的整數,
  "scam_type": "詐騙分類名稱，如：假冒官方詐騙、投資詐騙、釣魚網站、交友詐騙、無（安全）",
  "summary": "一段簡短的風險摘要，供使用者快速了解",
  "reason": "詳細的判斷依據說明",
  "risk_factors": ["風險因素1", "風險因素2"],
  "top_signals": ["信號1", "信號2", "信號3"]
}

評分標準：
- risk_score 0-30, risk_level "low": 內容安全，無明顯詐騙特徵
- risk_score 31-69, risk_level "medium": 有可疑特徵，需謹慎
- risk_score 70-100, risk_level "high": 高度可能為詐騙

請用繁體中文回覆。只回傳 JSON，不要有其他文字。`
}

func buildPrompt(req *AnalysisRequest, apiResult *ExternalAPIResult, kbContext string) string {
	var sb strings.Builder

	sb.WriteString(fmt.Sprintf("## 使用者提交內容\n- 類型：%s\n- 內容：%s\n\n", req.InputType, truncateForPrompt(req.InputContent, 2000)))

	if apiResult != nil && apiResult.RawData != nil {
		apiJSON, _ := json.MarshalIndent(apiResult.RawData, "", "  ")
		sb.WriteString(fmt.Sprintf("## 外部 API 查詢結果（來源：%s）\n```json\n%s\n```\n\n", apiResult.Source, string(apiJSON)))
	}
	if apiResult != nil && apiResult.Error != "" {
		sb.WriteString(fmt.Sprintf("## 外部 API 查詢備註\n%s\n\n", apiResult.Error))
	}

	if kbContext != "" {
		sb.WriteString(fmt.Sprintf("## 知識庫中的相似詐騙案例\n%s\n\n", kbContext))
	}

	sb.WriteString("請根據以上所有資訊，判斷此內容是否為詐騙，並回傳結構化 JSON 分析結果。")

	return sb.String()
}

func truncateForPrompt(s string, max int) string {
	runes := []rune(s)
	if len(runes) > max {
		return string(runes[:max]) + "..."
	}
	return s
}

func extractJSON(text string) string {
	// Try to find JSON between ```json ... ``` or ``` ... ```
	if idx := strings.Index(text, "```json"); idx != -1 {
		start := idx + 7
		if end := strings.Index(text[start:], "```"); end != -1 {
			return strings.TrimSpace(text[start : start+end])
		}
	}
	if idx := strings.Index(text, "```"); idx != -1 {
		start := idx + 3
		if end := strings.Index(text[start:], "```"); end != -1 {
			return strings.TrimSpace(text[start : start+end])
		}
	}
	// Try to find raw JSON object
	if idx := strings.Index(text, "{"); idx != -1 {
		if end := strings.LastIndex(text, "}"); end != -1 {
			return text[idx : end+1]
		}
	}
	return text
}
