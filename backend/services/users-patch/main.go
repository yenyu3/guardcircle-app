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

type updateUserRequest struct {
	Nickname     *string `json:"nickname"`
	ContactPhone *string `json:"contact_phone"`
	Gender       *string `json:"gender"`
	Birthday     *string `json:"birthday"`
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

	userID := req.PathParameters["user_id"]
	if userID == "" {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing user_id"})
	}

	rawBody := req.Body
	if req.IsBase64Encoded {
		decoded, err := base64.StdEncoding.DecodeString(req.Body)
		if err != nil {
			return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid body"})
		}
		rawBody = string(decoded)
	}

	var input updateUserRequest
	if err := json.NewDecoder(strings.NewReader(rawBody)).Decode(&input); err != nil {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid json"})
	}

	sets := make([]string, 0)
	args := make([]interface{}, 0)
	idx := 1

	if input.Nickname != nil {
		sets = append(sets, fmt.Sprintf("nickname = $%d", idx))
		args = append(args, *input.Nickname)
		idx++
	}
	if input.ContactPhone != nil {
		sets = append(sets, fmt.Sprintf("contact_phone = $%d", idx))
		args = append(args, *input.ContactPhone)
		idx++
	}
	if input.Gender != nil {
		sets = append(sets, fmt.Sprintf("gender = $%d", idx))
		args = append(args, *input.Gender)
		idx++
	}
	if input.Birthday != nil {
		sets = append(sets, fmt.Sprintf("birthday = NULLIF($%d, '')::date", idx))
		args = append(args, *input.Birthday)
		idx++
	}

	if len(sets) == 0 {
		return jsonResp(http.StatusBadRequest, map[string]string{"error": "no fields to update"})
	}

	sets = append(sets, "updated_at = CURRENT_TIMESTAMP")
	args = append(args, userID)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := fmt.Sprintf(`
		UPDATE users
		SET %s
		WHERE user_id = $%d
		RETURNING nickname, to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
	`, strings.Join(sets, ", "), idx)

	var nickname, updatedAt string
	err := db.QueryRowContext(ctx, query, args...).Scan(&nickname, &updatedAt)
	if err == sql.ErrNoRows {
		return jsonResp(http.StatusNotFound, map[string]string{"error": "user not found"})
	}
	if err != nil {
		return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to update user"})
	}

	return jsonResp(http.StatusOK, map[string]interface{}{
		"message": "User profile updated successfully",
		"data": map[string]interface{}{
			"user_id":    userID,
			"nickname":   nickname,
			"updated_at": updatedAt,
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
