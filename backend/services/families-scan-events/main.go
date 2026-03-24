package main

import (
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	body := map[string]interface{}{
		"family_id":   "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
		"family_name": "王小明的溫馨家園",
		"events": []map[string]interface{}{
			{
				"event_id":      "e987-f654-3210",
				"user_id":       "550e8400-e29b-41d4-a716-446655440000",
				"user_nickname": "小明",
				"input_type":    "url",
				"input_content": "http://scam-link.com",
				"risk_level":    "high",
				"risk_score":    95,
				"reason":        "偵測到惡意釣魚網址",
				"notify_status": "sent",
				"created_at":    "2026-03-23T15:30:00Z",
			},
			{
				"event_id":      "d123-c456-7890",
				"user_id":       "550e8400-e29b-41d4-a716-446655440000",
				"user_nickname": "小明",
				"input_type":    "text",
				"input_content": "恭喜中獎，請點擊...",
				"risk_level":    "medium",
				"risk_score":    60,
				"reason":        "疑似詐騙關鍵字",
				"notify_status": "pending",
				"created_at":    "2026-03-23T14:20:00Z",
			},
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
