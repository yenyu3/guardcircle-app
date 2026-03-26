package main

import (
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
	_ "github.com/jackc/pgx/v5/stdlib"
)

var db *sql.DB

type updateNotifyStatusRequest struct {
	NotifyStatus string `json:"notify_status"`
	UpdatedBy    string `json:"updated_by"`
}

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
}

func handler(req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	if db == nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "database not configured"})
	}

	eventID := req.PathParameters["event_id"]
	if eventID == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing event_id"})
	}

	rawBody := req.Body
	if req.IsBase64Encoded {
		decoded, err := base64.StdEncoding.DecodeString(req.Body)
		if err != nil {
			return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid body"})
		}
		rawBody = string(decoded)
	}

	var input updateNotifyStatusRequest
	if err := json.NewDecoder(strings.NewReader(rawBody)).Decode(&input); err != nil {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid json"})
	}

	if !isValidNotifyStatus(input.NotifyStatus) {
		return jsonResp(http.StatusBadRequest, map[string]interface{}{
			"error": map[string]interface{}{
				"code":    "INVALID_STATUS",
				"message": "不支援的通知狀態值",
			},
		})
	}
	if strings.TrimSpace(input.UpdatedBy) == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "updated_by is required"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var notifyStatus, updatedBy, updatedAt string
	err := db.QueryRowContext(ctx, `
		UPDATE scan_events
		SET notify_status = $1,
		    updated_by = $2,
		    updated_at = CURRENT_TIMESTAMP
		WHERE event_id = $3
		RETURNING notify_status, updated_by, to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	`, input.NotifyStatus, input.UpdatedBy, eventID).Scan(&notifyStatus, &updatedBy, &updatedAt)
	if err == sql.ErrNoRows {
		return jsonResp(http.StatusNotFound, map[string]string{"error": "event not found"})
	}
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to update notify status"})
	}

	return jsonResp(http.StatusOK, map[string]interface{}{
		"message": "Notification status updated successfully",
		"data": map[string]interface{}{
			"event_id":      eventID,
			"notify_status": notifyStatus,
			"updated_by":    updatedBy,
			"updated_at":    updatedAt,
		},
	})
}

func isValidNotifyStatus(v string) bool {
	switch v {
	case "pending", "sent", "not_required", "failed":
		return true
	default:
		return false
	}
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
