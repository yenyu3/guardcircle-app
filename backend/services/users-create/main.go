package main

import (
    "context"
    "database/sql"
    "encoding/base64"
    "encoding/json"
    "errors"
    "fmt"
    "log"
    "net/http"
    "os"
    "strings"
    "time"

    "github.com/aws/aws-lambda-go/events"
    "github.com/aws/aws-lambda-go/lambda"
    "github.com/jackc/pgconn"
    _ "github.com/jackc/pgx/v5/stdlib"
    "golang.org/x/crypto/bcrypt"
)

var db *sql.DB

type createUserRequest struct {
    Phone        string `json:"phone"`
    Password     string `json:"password"`
    Nickname     string `json:"nickname"`
    Gender       string `json:"gender"`
    Birthday     string `json:"birthday"`
    Role         string `json:"role"`
    ContactPhone string `json:"contact_phone"`
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

    var input createUserRequest
    if err := json.NewDecoder(strings.NewReader(rawBody)).Decode(&input); err != nil {
        return jsonResp(http.StatusBadRequest, map[string]string{"error": "invalid json"})
    }

    if input.Phone == "" || input.Password == "" || input.Nickname == "" || input.ContactPhone == "" {
        return jsonResp(http.StatusBadRequest, map[string]string{"error": "missing required fields"})
    }

    hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
    if err != nil {
        return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to hash password"})
    }

    role := input.Role
    if role == "" {
        role = "youth"
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    var userID, nickname, userRole string
    err = db.QueryRowContext(ctx, `
        INSERT INTO users (phone, password_hash, nickname, gender, birthday, role, contact_phone)
        VALUES ($1, $2, $3, $4, NULLIF($5, '')::date, $6, $7)
        RETURNING user_id::text, nickname, role
    `, input.Phone, string(hash), input.Nickname, input.Gender, input.Birthday, role, input.ContactPhone).Scan(&userID, &nickname, &userRole)
    if err != nil {
        var pgErr *pgconn.PgError
        if errors.As(err, &pgErr) && pgErr.Code == "23505" {
            return jsonResp(http.StatusConflict, map[string]string{"error": "phone already exists"})
        }
        log.Printf("failed to create user: %v", err)
        return jsonResp(http.StatusInternalServerError, map[string]string{"error": "failed to create user"})
    }

    return jsonResp(http.StatusCreated, map[string]interface{}{
        "message": "user created successfully",
        "data": map[string]interface{}{
            "user_id":  userID,
            "nickname": nickname,
            "role":     userRole,
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
