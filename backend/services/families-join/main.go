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

type joinFamilyRequest struct {
	UserID     string `json:"user_id"`
	InviteCode string `json:"invite_code"`
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

	rawBody := req.Body
	if req.IsBase64Encoded {
		decoded, err := base64.StdEncoding.DecodeString(req.Body)
		if err != nil {
			return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid body"})
		}
		rawBody = string(decoded)
	}

	var input joinFamilyRequest
	if err := json.NewDecoder(strings.NewReader(rawBody)).Decode(&input); err != nil {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid json"})
	}
	if input.UserID == "" || input.InviteCode == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing required fields"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var familyID, familyName string
	err := db.QueryRowContext(ctx, `
		SELECT family_id::text, family_name
		FROM families
		WHERE invite_code = $1
	`, input.InviteCode).Scan(&familyID, &familyName)
	if err == sql.ErrNoRows {
		return jsonResp(http.StatusNotFound, map[string]string{"error": "Invalid invite code"})
	}
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to lookup family"})
	}

	_, err = db.ExecContext(ctx, `
		UPDATE users SET family_id = $1 WHERE user_id = $2
	`, familyID, input.UserID)
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to join family"})
	}

	return jsonResp(http.StatusOK, map[string]interface{}{
		"message": "Successfully joined the family",
		"data": map[string]interface{}{
			"family_id":   familyID,
			"family_name": familyName,
		},
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
