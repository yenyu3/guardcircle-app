package main

import (
	"encoding/json"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

func handler(req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	body := map[string]interface{}{
		"message": "Successfully joined the family",
		"data": map[string]interface{}{
			"family_id":   "a1b2c3d4-e5f6-7890-abcd-1234567890ab",
			"family_name": "王小明的溫馨家園",
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
