package main

import (
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	body := map[string]interface{}{
		"family_id":   "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
		"last_updated": "2026-03-23T10:45:00Z",
		"members_status": []map[string]interface{}{
			{
				"user_id":  "550e8400-e29b-41d4-a716-446655440000",
				"nickname": "小明",
				"role":     "youth",
				"last_event": map[string]interface{}{
					"event_id":   "e987-f654",
					"risk_level": "high",
					"input_type": "url",
					"created_at": "2026-03-23T10:10:00Z",
				},
			},
			{
				"user_id":    "770e1234-e29b-4444",
				"nickname":   "王爸爸",
				"role":       "guardian",
				"last_event": nil,
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
