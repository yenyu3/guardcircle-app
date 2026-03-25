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
	if userID == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing user_id"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var familyID sql.NullString
	var phone, nickname, gender, birthday, role, contactPhone, createdAt, updatedAt string
	err := db.QueryRowContext(ctx, `
		SELECT 
			user_id::text,
			family_id::text,
			phone,
			nickname,
			gender,
			COALESCE(to_char(birthday, 'YYYY-MM-DD'), ''),
			role,
			contact_phone,
			to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
			to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
		FROM users
		WHERE user_id = $1
	`, userID).Scan(&userID, &familyID, &phone, &nickname, &gender, &birthday, &role, &contactPhone, &createdAt, &updatedAt)
	if err == sql.ErrNoRows {
		return jsonResp(http.StatusNotFound, map[string]string{"error": "user not found"})
	}
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to fetch user"})
	}

	data := map[string]interface{}{
		"user_id":       userID,
		"phone":         phone,
		"nickname":      nickname,
		"gender":        gender,
		"birthday":      birthday,
		"role":          role,
		"contact_phone": contactPhone,
		"created_at":    createdAt,
		"updated_at":    updatedAt,
	}
	if familyID.Valid {
		data["family_id"] = familyID.String
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
