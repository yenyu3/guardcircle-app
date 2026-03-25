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

	familyID := req.PathParameters["family_id"]
	if familyID == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing family_id"})
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
			u.user_id::text,
			u.nickname,
			u.role,
			se.event_id::text,
			se.risk_level,
			se.input_type,
			to_char(se.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM users u
		LEFT JOIN LATERAL (
			SELECT event_id, risk_level, input_type, created_at
			FROM scan_events
			WHERE user_id = u.user_id
			ORDER BY created_at DESC
			LIMIT 1
		) se ON true
		WHERE u.family_id = $1
		ORDER BY u.created_at ASC
	`, familyID)
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to fetch members"})
	}
	defer rows.Close()

	members := make([]map[string]interface{}, 0)
	var lastUpdated string
	for rows.Next() {
		var userID, nickname, role string
		var eventID, riskLevel, inputType, createdAt sql.NullString
		if err := rows.Scan(&userID, &nickname, &role, &eventID, &riskLevel, &inputType, &createdAt); err != nil {
			return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to read members"})
		}

		var lastEvent interface{}
		if eventID.Valid {
			lastEvent = map[string]interface{}{
				"event_id":   eventID.String,
				"risk_level": riskLevel.String,
				"input_type": inputType.String,
				"created_at": createdAt.String,
			}
			if createdAt.String > lastUpdated {
				lastUpdated = createdAt.String
			}
		} else {
			lastEvent = nil
		}

		members = append(members, map[string]interface{}{
			"user_id":    userID,
			"nickname":   nickname,
			"role":       role,
			"last_event": lastEvent,
		})
	}

	return jsonResp(http.StatusOK, map[string]interface{}{
		"family_id":     familyID,
		"last_updated":  lastUpdated,
		"members_status": members,
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
