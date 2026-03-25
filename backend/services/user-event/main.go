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
	_ "github.com/jackc/pgx/v5/stdlib"
)

var db *sql.DB

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

	userID := req.PathParameters["user_id"]
	eventID := req.PathParameters["event_id"]
	if userID == "" || eventID == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing user_id or event_id"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var inputType, inputContent, riskLevel, reason, notifyStatus, createdAt string
	var riskScore sql.NullInt32
	var topSignals sql.NullString

	err := db.QueryRowContext(ctx, `
		SELECT 
			input_type,
			input_content,
			risk_level,
			risk_score,
			reason,
			top_signals::text,
			notify_status,
			to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM scan_events
		WHERE user_id = $1 AND event_id = $2
	`, userID, eventID).Scan(&inputType, &inputContent, &riskLevel, &riskScore, &reason, &topSignals, &notifyStatus, &createdAt)
	if err == sql.ErrNoRows {
		return jsonResp(http.StatusNotFound, map[string]string{"error": "event not found"})
	}
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to fetch event"})
	}

	var topSignalsVal interface{}
	if topSignals.Valid && topSignals.String != "" {
		var parsed interface{}
		if err := json.Unmarshal([]byte(topSignals.String), &parsed); err == nil {
			topSignalsVal = parsed
		}
	}

	data := map[string]interface{}{
		"event_id":      eventID,
		"user_id":       userID,
		"input_type":    inputType,
		"input_content": inputContent,
		"risk_level":    riskLevel,
		"reason":        reason,
		"notify_status": notifyStatus,
		"created_at":    createdAt,
		"raw_result":    nil,
	}
	if riskScore.Valid {
		data["risk_score"] = int(riskScore.Int32)
	}
	if topSignalsVal != nil {
		data["top_signals"] = topSignalsVal
	}

	return jsonResp(http.StatusOK, map[string]interface{}{"data": data})
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
