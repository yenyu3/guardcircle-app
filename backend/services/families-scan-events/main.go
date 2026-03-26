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
			se.input_type,
			se.input_content,
			se.risk_level,
			se.risk_score,
			se.reason,
			se.notify_status,
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
		var eventID, userID, nickname, inputType, inputContent, riskLevel, reason, notifyStatus, createdAt string
		var riskScore sql.NullInt32
		if err := rows.Scan(&eventID, &userID, &nickname, &inputType, &inputContent, &riskLevel, &riskScore, &reason, &notifyStatus, &createdAt); err != nil {
			return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to read events"})
		}
		item := map[string]interface{}{
			"event_id":      eventID,
			"user_id":       userID,
			"user_nickname": nickname,
			"input_type":    inputType,
			"input_content": inputContent,
			"risk_level":    riskLevel,
			"reason":        reason,
			"notify_status": notifyStatus,
			"created_at":    createdAt,
		}
		if riskScore.Valid {
			item["risk_score"] = int(riskScore.Int32)
		}
		eventsList = append(eventsList, item)
	}

	return jsonResp(http.StatusOK, map[string]interface{}{
		"family_id":   familyID,
		"family_name": familyName,
		"events":      eventsList,
	})
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
