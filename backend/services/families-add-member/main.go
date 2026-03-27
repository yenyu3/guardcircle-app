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

type addMemberRequest struct {
	Phone    string `json:"phone"`
	FamilyID string `json:"family_id"`
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

	var input addMemberRequest
	if err := json.NewDecoder(strings.NewReader(rawBody)).Decode(&input); err != nil {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid json"})
	}
	if input.Phone == "" || input.FamilyID == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing required fields"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var familyName string
	err := db.QueryRowContext(ctx, `
		SELECT family_name FROM families WHERE family_id = $1
	`, input.FamilyID).Scan(&familyName)
	if err == sql.ErrNoRows {
		return jsonResp(http.StatusNotFound, map[string]string{"error": "family not found"})
	}
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to lookup family"})
	}

	var userID string
	err = db.QueryRowContext(ctx, `
		SELECT user_id::text FROM users WHERE phone = $1
	`, input.Phone).Scan(&userID)
	if err == sql.ErrNoRows {
		return jsonResp(http.StatusNotFound, map[string]string{"error": "user not found"})
	}
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to lookup user"})
	}

	_, err = db.ExecContext(ctx, `
		UPDATE users SET family_id = $1 WHERE user_id = $2
	`, input.FamilyID, userID)
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to update user"})
	}

	return jsonResp(http.StatusOK, map[string]interface{}{
		"message": "Successfully added member to family",
		"data": map[string]interface{}{
			"user_id":     userID,
			"phone":       input.Phone,
			"family_id":   input.FamilyID,
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
