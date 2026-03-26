package main

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type presignRequest struct {
	FileName    string `json:"file_name"`
	ContentType string `json:"content_type"`
	FileSize    int64  `json:"file_size"`
	Purpose     string `json:"purpose"`
	ExpiresIn   int64  `json:"expires_in"`
}

type presignResponse struct {
	UploadURL string            `json:"upload_url"`
	ObjectKey string            `json:"object_key"`
	Bucket    string            `json:"bucket"`
	ExpiresIn int64             `json:"expires_in"`
	Method    string            `json:"method"`
	Headers   map[string]string `json:"headers"`
}

type dependencies struct {
	Bucket    string
	Presigner *s3.PresignClient
}

var deps *dependencies

func main() {
	deps = mustInitDeps()
	lambda.Start(handler)
}

func handler(req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	if deps == nil || deps.Presigner == nil || deps.Bucket == "" {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "presign not configured"})
	}

	rawBody := req.Body
	if req.IsBase64Encoded {
		decoded, err := base64.StdEncoding.DecodeString(req.Body)
		if err != nil {
			return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid body"})
		}
		rawBody = string(decoded)
	}

	var input presignRequest
	if err := json.Unmarshal([]byte(rawBody), &input); err != nil {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid json"})
	}

	if strings.TrimSpace(input.FileName) == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "file_name is required"})
	}
	if strings.TrimSpace(input.ContentType) == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "content_type is required"})
	}

	expires := int64(3600)
	if input.ExpiresIn > 0 && input.ExpiresIn <= 604800 {
		expires = input.ExpiresIn
	}

	objectKey := buildObjectKey(input.FileName, input.Purpose)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	out, err := deps.Presigner.PresignPutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(deps.Bucket),
		Key:         aws.String(objectKey),
		ContentType: aws.String(input.ContentType),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = time.Duration(expires) * time.Second
	})
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to generate presigned url"})
	}

	resp := presignResponse{
		UploadURL: out.URL,
		ObjectKey: objectKey,
		Bucket:    deps.Bucket,
		ExpiresIn: expires,
		Method:    "PUT",
		Headers: map[string]string{
			"Content-Type": input.ContentType,
		},
	}
	return jsonResp(http.StatusOK, resp)
}

func mustInitDeps() *dependencies {
	bucket := os.Getenv("UPLOADS_BUCKET")
	if bucket == "" {
		return nil
	}

	cfg, err := awsconfig.LoadDefaultConfig(context.Background())
	if err != nil {
		return nil
	}
	s3Client := s3.NewFromConfig(cfg)
	return &dependencies{
		Bucket:    bucket,
		Presigner: s3.NewPresignClient(s3Client),
	}
}

func buildObjectKey(fileName, purpose string) string {
	base := path.Base(fileName)
	base = strings.ReplaceAll(base, " ", "_")
	if purpose == "" {
		purpose = "uploads"
	}
	datePrefix := time.Now().UTC().Format("2006/01/02")
	return fmt.Sprintf("%s/%s/%s-%s", purpose, datePrefix, uuid.New().String(), base)
}

func jsonResp(status int, body interface{}) (events.APIGatewayV2HTTPResponse, error) {
	b, _ := json.Marshal(body)
	return events.APIGatewayV2HTTPResponse{
		StatusCode: status,
		Headers: map[string]string{
			"content-type": "application/json",
		},
		Body: string(b),
	}, nil
}
