package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// ExternalAPIResult holds the result from any external API call.
type ExternalAPIResult struct {
	Source  string      `json:"source"`
	RawData interface{} `json:"raw_data"`
	Error   string      `json:"error,omitempty"`
}

func callExternalAPI(ctx context.Context, inputType, content, region, apiKey, baseURL string) (*ExternalAPIResult, error) {
	if apiKey == "" {
		return &ExternalAPIResult{Source: inputType, Error: "WHOSCALL_API_KEY not configured"}, nil
	}

	switch inputType {
	case "image":
		return callContentCheck(ctx, content, region, apiKey, baseURL)
	case "phone":
		return callNumberCheck(ctx, content, region, apiKey, baseURL)
	case "url":
		return callURLCheck(ctx, content, apiKey, baseURL)
	case "text", "video", "audio", "file":
		// Parse URLs and phone numbers from text, query each via Whoscall
		return callTextExtract(ctx, content, region, apiKey, baseURL)
	default:
		return nil, fmt.Errorf("unsupported input_type: %s", inputType)
	}
}

// ── Text Extract (parse URLs & phones from text, check each) ────

var (
	urlRegex   = regexp.MustCompile(`https?://[^\s<>"']+`)
	phoneRegex = regexp.MustCompile(`(?:0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4}|\+?886[-\s]?\d{1,2}[-\s]?\d{3,4}[-\s]?\d{3,4})`)
)

func callTextExtract(ctx context.Context, text, region, apiKey, baseURL string) (*ExternalAPIResult, error) {
	urls := urlRegex.FindAllString(text, -1)
	phones := phoneRegex.FindAllString(text, -1)

	if len(urls) == 0 && len(phones) == 0 {
		return &ExternalAPIResult{Source: "text", RawData: nil}, nil
	}

	// Collect all sub-results
	var subResults []map[string]interface{}

	for _, u := range urls {
		log.Printf("  text-extract: checking URL %s", u)
		result, err := callURLCheck(ctx, u, apiKey, baseURL)
		if err != nil {
			log.Printf("  text-extract: URL check error: %v", err)
			subResults = append(subResults, map[string]interface{}{
				"type": "url", "value": u, "error": err.Error(),
			})
			continue
		}
		subResults = append(subResults, map[string]interface{}{
			"type": "url", "value": u, "result": result.RawData,
		})
	}

	for _, p := range phones {
		log.Printf("  text-extract: checking phone %s", p)
		result, err := callNumberCheck(ctx, p, region, apiKey, baseURL)
		if err != nil {
			log.Printf("  text-extract: number check error: %v", err)
			subResults = append(subResults, map[string]interface{}{
				"type": "phone", "value": p, "error": err.Error(),
			})
			continue
		}
		subResults = append(subResults, map[string]interface{}{
			"type": "phone", "value": p, "result": result.RawData,
		})
	}

	return &ExternalAPIResult{
		Source:  "text-extract",
		RawData: subResults,
	}, nil
}

// ── Content Check (Image) ───────────────────────────────────────

func callContentCheck(ctx context.Context, base64Image, region, apiKey, baseURL string) (*ExternalAPIResult, error) {
	reqBody, _ := json.Marshal(map[string]string{
		"region": region,
		"image":  base64Image,
	})

	submitReq, err := http.NewRequestWithContext(ctx, "POST", baseURL+"/content-check", bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("content-check build request: %w", err)
	}
	submitReq.Header.Set("x-api-key", apiKey)
	submitReq.Header.Set("Content-Type", "application/json")
	submitReq.Header.Set("Accept-Language", "zh-TW")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(submitReq)
	if err != nil {
		return nil, fmt.Errorf("content-check submit: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("content-check submit status %d: %s", resp.StatusCode, string(body))
	}

	var submitResp struct {
		JobID int `json:"job_id"`
	}
	if err := json.Unmarshal(body, &submitResp); err != nil {
		return nil, fmt.Errorf("content-check parse submit response: %w", err)
	}

	// Poll for result (max 60s, every 3s)
	pollClient := &http.Client{Timeout: 10 * time.Second}
	pollURL := fmt.Sprintf("%s/content-check/%d", baseURL, submitResp.JobID)

	for i := 0; i < 20; i++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(3 * time.Second):
		}

		pollReq, err := http.NewRequestWithContext(ctx, "GET", pollURL, nil)
		if err != nil {
			log.Printf("content-check poll build request error (attempt %d): %v", i+1, err)
			continue
		}
		pollReq.Header.Set("x-api-key", apiKey)
		pollReq.Header.Set("Accept-Language", "zh-TW")

		pollResp, err := pollClient.Do(pollReq)
		if err != nil {
			log.Printf("content-check poll request error (attempt %d): %v", i+1, err)
			continue
		}
		pollBody, _ := io.ReadAll(pollResp.Body)
		pollResp.Body.Close()

		if pollResp.StatusCode != 200 {
			log.Printf("content-check poll status %d (attempt %d): %s", pollResp.StatusCode, i+1, string(pollBody))
			continue
		}

		var result map[string]interface{}
		if err := json.Unmarshal(pollBody, &result); err != nil {
			log.Printf("content-check poll parse error (attempt %d): %v", i+1, err)
			continue
		}

		if status, ok := result["status"].(float64); ok && status == 3 {
			return &ExternalAPIResult{Source: "content-check", RawData: result}, nil
		}
		if status, ok := result["status"].(float64); ok && status == 2 {
			return nil, fmt.Errorf("content-check job %d failed", submitResp.JobID)
		}
	}

	return nil, fmt.Errorf("content-check job %d timed out", submitResp.JobID)
}

// ── Number Check (Phone) ────────────────────────────────────────

func callNumberCheck(ctx context.Context, number, country, apiKey, baseURL string) (*ExternalAPIResult, error) {
	number = strings.TrimSpace(number)
	if country == "" {
		country = "TW"
	}

	endpoint := fmt.Sprintf("%s/number-check/%s/%s", baseURL, url.PathEscape(country), url.PathEscape(number))
	req, err := http.NewRequestWithContext(ctx, "GET", endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("number-check build request: %w", err)
	}
	req.Header.Set("x-api-key", apiKey)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("number-check: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("number-check status %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("number-check parse: %w", err)
	}

	return &ExternalAPIResult{Source: "number-check", RawData: result}, nil
}

// ── URL Check ───────────────────────────────────────────────────

func callURLCheck(ctx context.Context, targetURL, apiKey, baseURL string) (*ExternalAPIResult, error) {
	targetURL = strings.TrimSpace(targetURL)
	// Try cache first
	result, err := doURLCheck(ctx, baseURL+"/url-check-cache", targetURL, apiKey)
	if err == nil {
		return result, nil
	}

	// Fallback to full check
	return doURLCheck(ctx, baseURL+"/url-check", targetURL, apiKey)
}

func doURLCheck(ctx context.Context, endpoint, targetURL, apiKey string) (*ExternalAPIResult, error) {
	reqBody, _ := json.Marshal(map[string]string{"url": targetURL})
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("url-check build request: %w", err)
	}
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("url-check: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	// 503 = stale data but still usable
	if resp.StatusCode != 200 && resp.StatusCode != 503 {
		return nil, fmt.Errorf("url-check status %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("url-check parse: %w", err)
	}

	return &ExternalAPIResult{Source: "url-check", RawData: result}, nil
}
