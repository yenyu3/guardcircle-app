package main

import (
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	body := map[string]interface{}{
		"message": "user created successfully",
		"data": map[string]interface{}{
			"user_id":  "550e8400-e29b-41d4-a716-446655440000",
			"nickname": "小明",
			"role":     "youth",
		},
	}
	b, _ := json.Marshal(body)
	return events.APIGatewayV2HTTPResponse{
		StatusCode: 201,
		Headers: map[string]string{
			"content-type": "application/json",
		},
		Body: string(b),
	}, nil
}

func main() {
	lambda.Start(handler)
}
