package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"sync"

	"time"

	_ "github.com/lib/pq"
)

var (
	db     *sql.DB
	dbOnce sync.Once
	dbErr  error
)

func getDB() (*sql.DB, error) {
	dbOnce.Do(func() {
		host := os.Getenv("DB_HOST")
		port := os.Getenv("DB_PORT")
		name := os.Getenv("DB_NAME")
		user := os.Getenv("DB_USER")
		pass := os.Getenv("DB_PASS")

		if host == "" || name == "" || user == "" {
			dbErr = fmt.Errorf("missing DB environment variables")
			return
		}
		if port == "" {
			port = "5432"
		}

		dsn := fmt.Sprintf("host=%s port=%s dbname=%s user=%s password=%s sslmode=require",
			host, port, name, user, pass)

		db, dbErr = sql.Open("postgres", dsn)
		if dbErr != nil {
			return
		}
		db.SetMaxOpenConns(5)
		db.SetMaxIdleConns(2)
	})
	return db, dbErr
}

func writeScanEvent(ctx context.Context, e *EventData) error {
	conn, err := getDB()
	if err != nil {
		return fmt.Errorf("get db: %w", err)
	}

	riskFactorsJSON, _ := json.Marshal(e.RiskFactors)
	topSignalsJSON, _ := json.Marshal(e.TopSignals)
	inputTypesJSON, _ := json.Marshal(e.InputType)

	_, err = conn.ExecContext(ctx,
		`INSERT INTO scan_events (event_id, user_id, input_type, input_content, s3_key, risk_level, risk_score, scam_type, summary, consequence, reason, risk_factors, top_signals, notify_status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		e.EventID,
		e.UserID,
		inputTypesJSON,
		e.InputContent,
		e.S3Key,
		e.RiskLevel,
		e.RiskScore,
		e.ScamType,
		e.Summary,
		e.Consequence,
		e.Reason,
		riskFactorsJSON,
		topSignalsJSON,
		e.NotifyStatus,
	)
	if err != nil {
		return fmt.Errorf("insert scan_event: %w", err)
	}

	return nil
}

// findRecentScanEvent looks for a scan_event created within the last 5 minutes.
// For text/url/phone/image: matches by user_id + input_type + input_content prefix (200 chars).
// For video/audio/file: matches by user_id + input_type + s3_key.
func findRecentScanEvent(ctx context.Context, userID string, inputType []string, inputContent, s3Key string) (*EventData, error) {
	conn, err := getDB()
	if err != nil {
		return nil, fmt.Errorf("get db: %w", err)
	}

	cutoff := time.Now().UTC().Add(-5 * time.Minute)
	inputTypesJSON, _ := json.Marshal(inputType)

	var query string
	var args []interface{}

	if s3Key != "" {
		// video/audio/file: match by s3_key
		query = `SELECT event_id, user_id, input_type, input_content, risk_level, risk_score,
		                scam_type, summary, consequence, reason, risk_factors, top_signals,
		                notify_status, created_at
		         FROM scan_events
		         WHERE user_id = $1 AND input_type = $2::jsonb AND s3_key = $3 AND created_at >= $4
		         ORDER BY created_at DESC
		         LIMIT 1`
		args = []interface{}{userID, string(inputTypesJSON), s3Key, cutoff}
	} else {
		// text/url/phone/image: match by input_content prefix
		contentPrefix := truncateRunes(inputContent, 200)
		query = `SELECT event_id, user_id, input_type, input_content, risk_level, risk_score,
		                scam_type, summary, consequence, reason, risk_factors, top_signals,
		                notify_status, created_at
		         FROM scan_events
		         WHERE user_id = $1 AND input_type = $2::jsonb AND input_content LIKE $3 AND created_at >= $4
		         ORDER BY created_at DESC
		         LIMIT 1`
		args = []interface{}{userID, string(inputTypesJSON), contentPrefix + "%", cutoff}
	}

	var e EventData
	var inputTypeDB []byte
	var riskFactorsJSON, topSignalsJSON []byte
	var createdAt time.Time

	err = conn.QueryRowContext(ctx, query, args...).Scan(
		&e.EventID, &e.UserID, &inputTypeDB, &e.InputContent,
		&e.RiskLevel, &e.RiskScore, &e.ScamType, &e.Summary,
		&e.Consequence, &e.Reason, &riskFactorsJSON, &topSignalsJSON,
		&e.NotifyStatus, &createdAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("query scan_event: %w", err)
	}

	_ = json.Unmarshal(inputTypeDB, &e.InputType)
	if e.InputType == nil {
		e.InputType = []string{}
	}
	e.CreatedAt = createdAt.Format(time.RFC3339)
	_ = json.Unmarshal(riskFactorsJSON, &e.RiskFactors)
	_ = json.Unmarshal(topSignalsJSON, &e.TopSignals)
	if e.RiskFactors == nil {
		e.RiskFactors = []string{}
	}
	if e.TopSignals == nil {
		e.TopSignals = []string{}
	}

	return &e, nil
}

func truncateRunes(s string, max int) string {
	runes := []rune(s)
	if len(runes) > max {
		return string(runes[:max])
	}
	return s
}
