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
	Consequence string   `json:"consequence"`
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

func analyzeWithBedrock(ctx context.Context, client *bedrockruntime.Client, modelID string, req *AnalysisRequest, apiResults []*ExternalAPIResult, kbContext string) (*BedrockAnalysis, error) {
	prompt := buildPrompt(req, apiResults, kbContext)

	// Build message content: multimodal for image, text-only otherwise
	var contentBlocks []map[string]interface{}

	if isImageRequest(req.InputType) && req.InputContent != "" {
		// Add image as vision content block
		mediaType := detectImageMediaType(req.InputContent)
		contentBlocks = append(contentBlocks, map[string]interface{}{
			"type": "image",
			"source": map[string]interface{}{
				"type":         "base64",
				"media_type":   mediaType,
				"data":         req.InputContent,
			},
		})
		// Add text prompt after image
		contentBlocks = append(contentBlocks, map[string]interface{}{
			"type": "text",
			"text": prompt,
		})
	} else {
		contentBlocks = append(contentBlocks, map[string]interface{}{
			"type": "text",
			"text": prompt,
		})
	}

	payload := map[string]interface{}{
		"anthropic_version": "bedrock-2023-05-31",
		"max_tokens":        2048,
		"messages": []map[string]interface{}{
			{
				"role":    "user",
				"content": contentBlocks,
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
	return `你是 GuardCircle 的詐騙偵測 AI 分析師。你的任務是根據使用者提交的內容、外部 API 查詢結果和知識庫中的相似詐騙案例，**審慎地**判斷該內容的風險等級。

## 分析框架

你必須依照以下步驟思考（在 reason 欄位中呈現你的推理過程）：

### 第一步：情境還原
判斷這段內容最可能出現的情境（朋友對話、商業通知、陌生訊息、官方通知等）。

### 第二步：後果鏈推理
假設接收者完全配合這段內容的要求，推演最終會發生什麼：
- 會被要求轉帳、提供帳號/密碼/驗證碼嗎？
- 會被導向釣魚網站輸入個資嗎？
- 會損失金錢或個人資料嗎？
- 還是只是正常的資訊傳遞，沒有任何實質危害？

### 第三步：證據加權
根據實際證據評分，而非僅憑「感覺像詐騙」：
- 外部 API（Whoscall）有明確標記為惡意 → 加重
- 外部 API 無資料或評分為 null → 此項不作為風險依據，不加分也不扣分
- 知識庫有高度相似的已知詐騙案例 → 加重
- 內容包含明確的資金操作指示（帳號、轉帳、匯款）→ 加重
- 內容僅有可疑用詞但無具體危害行為 → 不應判為 high

## 評分校準標準

**high (70-100)** — 必須同時滿足：
  1. 有明確的詐騙劇本（如：假冒身份 + 要求資金操作）
  2. 後果鏈推理結果會導致受害者**直接損失金錢或洩露關鍵憑證**
  3. 至少有一項客觀證據支持（外部 API 標記、已知詐騙模式、明確的帳號/連結）

**medium (31-69)** — 符合以下任一：
  - 有可疑特徵（誇大承諾、製造緊迫感、陌生人主動聯繫）但缺乏明確的資金操作指示
  - 包含短網址或不明連結，但無法確認是否為釣魚
  - 部分符合詐騙模式，但也可能是正常商業行為

**low (0-30)** — 符合以下任一：
  - 日常對話、正常通知、已知品牌的合法訊息
  - 即使完全配合內容要求，也不會造成任何損失
  - 雖然語氣可能稍顯異常，但沒有任何具體的危害行為

## 重要原則
- **寧可 medium 也不要輕易判 high**：high 代表「幾乎確定是詐騙」，會觸發緊急通知，誤報會降低使用者信任
- **正常商業訊息不是詐騙**：銀行帳單通知、外送平台通知、快遞取貨通知是日常生活的一部分
- **朋友分享連結不等於詐騙**：除非連結本身被外部 API 明確標記為惡意
- **不確定時降級處理**：如果證據不足以支持某個風險等級，降一級

## 輸出格式

只回傳嚴格的 JSON（不要 markdown 格式或額外文字）：
{
  "risk_level": "low" | "medium" | "high",
  "risk_score": 0-100 的整數,
  "scam_type": "詐騙分類名稱，如：假冒官方詐騙、投資詐騙、釣魚網站、交友詐騙、無（安全）",
  "summary": "一段簡短的風險摘要，供使用者快速了解",
  "consequence": "後果鏈推理：如果接收者配合，最終會發生什麼",
  "reason": "完整的判斷推理過程，包含情境還原、後果分析、證據加權",
  "risk_factors": ["風險因素1", "風險因素2"],
  "top_signals": ["信號1", "信號2", "信號3"]
}

請用繁體中文回覆。只回傳 JSON，不要有其他文字。`
}

func buildPrompt(req *AnalysisRequest, apiResults []*ExternalAPIResult, kbContext string) string {
	var sb strings.Builder

	typeLabel := strings.Join(req.InputType, ", ")

	if isImageRequest(req.InputType) && !hasTextTypes(req.InputType) {
		// Image-only: use vision content block (handled in analyzeWithBedrock)
		sb.WriteString(fmt.Sprintf("## 使用者提交內容\n- 類型：%s\n- 圖片已附在上方，請直接分析圖片內容\n\n", typeLabel))
	} else if isImageRequest(req.InputType) && hasTextTypes(req.InputType) {
		// Mixed: text + image
		sb.WriteString(fmt.Sprintf("## 使用者提交內容\n- 類型：%s\n- 文字內容：%s\n- 圖片已附在上方，請一併分析\n\n", typeLabel, truncateForPrompt(req.InputContent, 2000)))
	} else {
		sb.WriteString(fmt.Sprintf("## 使用者提交內容\n- 類型：%s\n- 內容：%s\n\n", typeLabel, truncateForPrompt(req.InputContent, 2000)))
	}

	for _, apiResult := range apiResults {
		if apiResult != nil && apiResult.RawData != nil {
			apiJSON, _ := json.MarshalIndent(apiResult.RawData, "", "  ")
			sb.WriteString(fmt.Sprintf("## 外部 API 查詢結果（來源：%s）\n```json\n%s\n```\n\n", apiResult.Source, string(apiJSON)))
		}
		if apiResult != nil && apiResult.Error != "" {
			sb.WriteString(fmt.Sprintf("## 外部 API 查詢備註（%s）\n%s\n\n", apiResult.Source, apiResult.Error))
		}
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

// isImageRequest checks if input types contain "image".
func isImageRequest(inputTypes []string) bool {
	for _, t := range inputTypes {
		if t == "image" {
			return true
		}
	}
	return false
}

// hasTextTypes checks if input types contain any text-based type (text, url, phone).
func hasTextTypes(inputTypes []string) bool {
	for _, t := range inputTypes {
		if t == "text" || t == "url" || t == "phone" {
			return true
		}
	}
	return false
}

// detectImageMediaType guesses media type from base64 header magic bytes.
func detectImageMediaType(base64Data string) string {
	if len(base64Data) < 4 {
		return "image/png"
	}
	// Check common base64 prefixes
	switch {
	case strings.HasPrefix(base64Data, "/9j/"):
		return "image/jpeg"
	case strings.HasPrefix(base64Data, "iVBOR"):
		return "image/png"
	case strings.HasPrefix(base64Data, "R0lGOD"):
		return "image/gif"
	case strings.HasPrefix(base64Data, "UklGR"):
		return "image/webp"
	default:
		return "image/png"
	}
}

// extractImageKBQuery builds a KB query from Whoscall content-check results for images.
func extractImageKBQuery(apiResults []*ExternalAPIResult) string {
	for _, r := range apiResults {
		if r == nil || r.Source != "content-check" || r.RawData == nil {
			continue
		}
		// Try to extract meaningful text from content-check result
		raw, err := json.Marshal(r.RawData)
		if err != nil {
			continue
		}
		var result map[string]interface{}
		if err := json.Unmarshal(raw, &result); err != nil {
			continue
		}

		var parts []string
		// Extract category/label if present
		if cat, ok := result["category"].(string); ok && cat != "" {
			parts = append(parts, cat)
		}
		if label, ok := result["label"].(string); ok && label != "" {
			parts = append(parts, label)
		}
		if desc, ok := result["description"].(string); ok && desc != "" {
			parts = append(parts, desc)
		}
		// Extract tags array if present
		if tags, ok := result["tags"].([]interface{}); ok {
			for _, tag := range tags {
				if s, ok := tag.(string); ok {
					parts = append(parts, s)
				}
			}
		}
		if len(parts) > 0 {
			return "詐騙圖片分析 " + strings.Join(parts, " ")
		}
	}
	return "詐騙截圖分析"
}
