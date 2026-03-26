package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"sync"

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

	_, err = conn.ExecContext(ctx,
		`INSERT INTO scan_events (event_id, user_id, input_type, input_content, risk_level, risk_score, scam_type, summary, reason, risk_factors, top_signals, notify_status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		e.EventID,
		e.UserID,
		e.InputType,
		e.InputContent,
		e.RiskLevel,
		e.RiskScore,
		e.ScamType,
		e.Summary,
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
