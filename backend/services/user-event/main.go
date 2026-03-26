package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	_ "github.com/jackc/pgx/v5/stdlib"
)

var (
	db            *sql.DB
	s3Presigner   *s3.PresignClient
	uploadsBucket string
)

func init() {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	pass := os.Getenv("DB_PASS")
	name := os.Getenv("DB_NAME")
	if host == "" || port == "" || user == "" || pass == "" || name == "" {
		return
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=require", host, port, user, pass, name)
	conn, err := sql.Open("pgx", dsn)
	if err != nil {
		return
	}
	conn.SetMaxIdleConns(2)
	conn.SetMaxOpenConns(5)
	conn.SetConnMaxLifetime(5 * time.Minute)
	db = conn

	uploadsBucket = os.Getenv("UPLOADS_BUCKET")
	if uploadsBucket != "" {
		cfg, err := awsconfig.LoadDefaultConfig(context.Background())
		if err == nil {
			s3Presigner = s3.NewPresignClient(s3.NewFromConfig(cfg))
		}
	}
}

func handler(req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	if db == nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "database not configured"})
	}

	userID := req.PathParameters["user_id"]
	eventID := req.PathParameters["event_id"]
	if userID == "" || eventID == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing user_id or event_id"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var inputTypeJSON, inputContent, riskLevel, scamType, summary, consequence, reason, notifyStatus, updatedBy, updatedAt, createdAt string
	var riskScore sql.NullInt32
	var riskFactors sql.NullString
	var topSignals sql.NullString
	var s3Key sql.NullString

	err := db.QueryRowContext(ctx, `
		SELECT 
			input_type::text,
			input_content,
			COALESCE(s3_key, ''),
			risk_level,
			risk_score,
			scam_type,
			summary,
			COALESCE(consequence, ''),
			reason,
			risk_factors::text,
			top_signals::text,
			notify_status,
			COALESCE(updated_by, ''),
			COALESCE(to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
			to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM scan_events
		WHERE user_id = $1 AND event_id = $2
	`, userID, eventID).Scan(&inputTypeJSON, &inputContent, &s3Key, &riskLevel, &riskScore, &scamType, &summary, &consequence, &reason, &riskFactors, &topSignals, &notifyStatus, &updatedBy, &updatedAt, &createdAt)
	if err == sql.ErrNoRows {
		return jsonResp(http.StatusNotFound, map[string]string{"error": "event not found"})
	}
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to fetch event"})
	}

	var inputTypeParsed []string
	if inputTypeJSON != "" {
		_ = json.Unmarshal([]byte(inputTypeJSON), &inputTypeParsed)
	}

	var topSignalsVal interface{}
	if topSignals.Valid && topSignals.String != "" {
		var parsed interface{}
		if err := json.Unmarshal([]byte(topSignals.String), &parsed); err == nil {
			topSignalsVal = parsed
		}
	}
	var riskFactorsVal interface{}
	if riskFactors.Valid && riskFactors.String != "" {
		var parsed interface{}
		if err := json.Unmarshal([]byte(riskFactors.String), &parsed); err == nil {
			riskFactorsVal = parsed
		}
	}

	data := map[string]interface{}{
		"event_id":      eventID,
		"user_id":       userID,
		"input_type":    inputTypeParsed,
		"input_content": inputContent,
		"risk_level":    riskLevel,
		"scam_type":     scamType,
		"summary":       summary,
		"consequence":   consequence,
		"reason":        reason,
		"notify_status": notifyStatus,
		"updated_by":    updatedBy,
		"updated_at":    updatedAt,
		"created_at":    createdAt,
		"raw_result":    nil,
	}
	if riskScore.Valid {
		data["risk_score"] = int(riskScore.Int32)
	}
	if riskFactorsVal != nil {
		data["risk_factors"] = riskFactorsVal
	}
	if topSignalsVal != nil {
		data["top_signals"] = topSignalsVal
	}
	if s3Key.Valid && s3Key.String != "" {
		data["s3_key"] = s3Key.String
		if url := presignGetURL(ctx, s3Key.String); url != "" {
			data["media_url"] = url
		}
	}

	return jsonResp(http.StatusOK, map[string]interface{}{"data": data})
}

func presignGetURL(ctx context.Context, key string) string {
	if s3Presigner == nil || uploadsBucket == "" {
		return ""
	}
	out, err := s3Presigner.PresignGetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(uploadsBucket),
		Key:    aws.String(key),
	}, func(opts *s3.PresignOptions) {
		opts.Expires = 1 * time.Hour
	})
	if err != nil {
		return ""
	}
	return out.URL
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

func main() {
	lambda.Start(handler)
}
