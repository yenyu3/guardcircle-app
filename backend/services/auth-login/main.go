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
	"golang.org/x/crypto/bcrypt"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var db *sql.DB

type loginRequest struct {
	Phone    string `json:"phone"`
	Password string `json:"password"`
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

	var input loginRequest
	if err := json.NewDecoder(strings.NewReader(rawBody)).Decode(&input); err != nil {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid json"})
	}
	if input.Phone == "" || input.Password == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing required fields"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var userID, nickname, role, phone, passwordHash string
	var familyID sql.NullString
	err := db.QueryRowContext(ctx, `
		SELECT user_id::text, family_id::text, nickname, role, phone, password_hash
		FROM users
		WHERE phone = $1
	`, input.Phone).Scan(&userID, &familyID, &nickname, &role, &phone, &passwordHash)
	if err == sql.ErrNoRows {
		return invalidCredentials()
	}
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to fetch user"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(input.Password)); err != nil {
		return invalidCredentials()
	}

	data := map[string]interface{}{
		"user_id":  userID,
		"nickname": nickname,
		"role":     role,
		"phone":    phone,
	}
	if familyID.Valid {
		data["family_id"] = familyID.String
	}

	return jsonResp(http.StatusOK, map[string]interface{}{
		"message": "Login successful",
		"data":    data,
	})
}

func invalidCredentials() (events.APIGatewayV2HTTPResponse, error) {
	return jsonResp(http.StatusUnauthorized, map[string]interface{}{
		"error": map[string]interface{}{
			"code":    "INVALID_CREDENTIALS",
			"message": "手機號碼或密碼錯誤",
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
