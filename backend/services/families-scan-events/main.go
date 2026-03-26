package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
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

	familyID := req.PathParameters["family_id"]
	if familyID == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing family_id"})
	}

	limit := 20
	offset := 0
	if v, ok := req.QueryStringParameters["limit"]; ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			limit = n
		}
	}
	if v, ok := req.QueryStringParameters["offset"]; ok && v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var familyName string
	err := db.QueryRowContext(ctx, `
		SELECT family_name FROM families WHERE family_id = $1
	`, familyID).Scan(&familyName)
	if err == sql.ErrNoRows {
		return jsonResp(http.StatusNotFound, map[string]string{"error": "family not found"})
	}
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to fetch family"})
	}

	rows, err := db.QueryContext(ctx, `
		SELECT
			se.event_id::text,
			se.user_id::text,
			u.nickname,
			se.input_type::text,
			se.input_content,
			COALESCE(se.s3_key, ''),
			se.risk_level,
			se.risk_score,
			se.scam_type,
			se.summary,
			COALESCE(se.consequence, ''),
			se.reason,
			se.risk_factors::text,
			se.top_signals::text,
			se.notify_status,
			COALESCE(se.updated_by, ''),
			COALESCE(to_char(se.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
			to_char(se.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM scan_events se
		JOIN users u ON u.user_id = se.user_id
		WHERE u.family_id = $1
		ORDER BY se.created_at DESC
		LIMIT $2 OFFSET $3
	`, familyID, limit, offset)
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to fetch events"})
	}
	defer rows.Close()

	eventsList := make([]map[string]interface{}, 0)
	for rows.Next() {
		var eventID, userID, nickname, inputTypeJSON, inputContent, s3Key, riskLevel, scamType, summary, consequence, reason, notifyStatus, updatedBy, updatedAt, createdAt string
		var riskScore sql.NullInt32
		var riskFactors sql.NullString
		var topSignals sql.NullString
		if err := rows.Scan(&eventID, &userID, &nickname, &inputTypeJSON, &inputContent, &s3Key, &riskLevel, &riskScore, &scamType, &summary, &consequence, &reason, &riskFactors, &topSignals, &notifyStatus, &updatedBy, &updatedAt, &createdAt); err != nil {
			return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to read events"})
		}
		var inputTypeParsed []string
		if inputTypeJSON != "" {
			_ = json.Unmarshal([]byte(inputTypeJSON), &inputTypeParsed)
		}
		item := map[string]interface{}{
			"event_id":      eventID,
			"user_id":       userID,
			"user_nickname": nickname,
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
		}
		if riskScore.Valid {
			item["risk_score"] = int(riskScore.Int32)
		}
		if riskFactors.Valid && riskFactors.String != "" {
			var parsed interface{}
			if err := json.Unmarshal([]byte(riskFactors.String), &parsed); err == nil {
				item["risk_factors"] = parsed
			}
		}
		if topSignals.Valid && topSignals.String != "" {
			var parsed interface{}
			if err := json.Unmarshal([]byte(topSignals.String), &parsed); err == nil {
				item["top_signals"] = parsed
			}
		}
		if s3Key != "" {
			item["s3_key"] = s3Key
			if url := presignGetURL(ctx, s3Key); url != "" {
				item["media_url"] = url
			}
		}
		eventsList = append(eventsList, item)
	}

	return jsonResp(http.StatusOK, map[string]interface{}{
		"family_id":   familyID,
		"family_name": familyName,
		"events":      eventsList,
	})
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
