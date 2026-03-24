package main

import (
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	familyID := "a1b2c3d4-e5f6-7890-abcd-1234567890ab"
	body := map[string]interface{}{
		"data": map[string]interface{}{
			"user_id":       "550e8400-e29b-41d4-a716-446655440000",
			"family_id":     familyID,
			"phone":         "0912345678",
			"nickname":      "小明",
			"gender":        "male",
			"birthday":      "2010-05-20",
			"role":          "youth",
			"contact_phone": "0987654321",
			"created_at":    "2026-03-23T10:00:00Z",
			"updated_at":    "2026-03-23T10:00:00Z",
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
