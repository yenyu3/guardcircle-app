package main

import (
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	body := map[string]interface{}{
		"message": "analysis completed",
		"data": map[string]interface{}{
			"event_id":      "770e8400-e29b-41d4-a716-446655440000",
			"user_id":       "550e8400-e29b-41d4-a716-446655440000",
			"input_type":    "text",
			"input_content": "我是銀行客服，你的帳戶異常，請立即提供驗證碼",
			"risk_level":    "high",
			"risk_score":    92,
			"reason":        "訊息中出現假冒銀行客服、強調帳戶異常與索取驗證碼等高風險特徵",
			"top_signals":   []string{"假冒官方", "緊急催促", "索取敏感資訊"},
			"notify_status": "pending",
			"created_at":    "2026-03-23T10:10:00Z",
		},
	}
	b, _ := json.Marshal(body)
	return events.APIGatewayV2HTTPResponse{
		StatusCode: 200,
		Headers: map[string]string{
			"content-type": "application/json",
		},
		Body: string(b),
	}, nil
}

func main() {
	lambda.Start(handler)
}
