package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/transcribe"
	transcribetypes "github.com/aws/aws-sdk-go-v2/service/transcribe/types"
	"github.com/google/uuid"
)

// transcribeMedia uploads base64 media to S3 and runs Amazon Transcribe,
// returning the transcribed text.
func transcribeMedia(ctx context.Context, s3Client *s3.Client, txClient *transcribe.Client, bucket, base64Content, fileExt string) (string, error) {
	// Strip data URI prefix if present (e.g. "data:audio/m4a;base64,...")
	raw := base64Content
	if idx := strings.Index(raw, ","); idx != -1 && strings.HasPrefix(raw, "data:") {
		raw = raw[idx+1:]
	}
	decoded, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		return "", fmt.Errorf("decode base64: %w", err)
	}

	// Upload to S3
	objectKey := fmt.Sprintf("transcribe-input/%s.%s", uuid.New().String(), strings.TrimPrefix(fileExt, "."))

	_, err = s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(objectKey),
		Body:   bytes.NewReader(decoded),
	})
	if err != nil {
		return "", fmt.Errorf("s3 upload: %w", err)
	}

	// Start transcription job
	jobName := fmt.Sprintf("gc-%s", uuid.New().String())
	mediaURI := fmt.Sprintf("s3://%s/%s", bucket, objectKey)

	_, err = txClient.StartTranscriptionJob(ctx, &transcribe.StartTranscriptionJobInput{
		TranscriptionJobName: aws.String(jobName),
		LanguageCode:         transcribetypes.LanguageCodeZhTw,
		Media: &transcribetypes.Media{
			MediaFileUri: aws.String(mediaURI),
		},
		MediaFormat: resolveMediaFormat(fileExt),
	})
	if err != nil {
		return "", fmt.Errorf("start transcription: %w", err)
	}

	// Poll for completion (max 120s, every 5s)
	for i := 0; i < 24; i++ {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		case <-time.After(5 * time.Second):
		}

		status, err := txClient.GetTranscriptionJob(ctx, &transcribe.GetTranscriptionJobInput{
			TranscriptionJobName: aws.String(jobName),
		})
		if err != nil {
			continue
		}

		job := status.TranscriptionJob
		if job.TranscriptionJobStatus == transcribetypes.TranscriptionJobStatusCompleted {
			if job.Transcript != nil && job.Transcript.TranscriptFileUri != nil {
				text, err := fetchTranscriptText(ctx, *job.Transcript.TranscriptFileUri)
				if err != nil {
					return "", fmt.Errorf("fetch transcript: %w", err)
				}
				// Cleanup S3 object (best effort, synchronous so it completes before Lambda freezes)
				if _, delErr := s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
					Bucket: aws.String(bucket),
					Key:    aws.String(objectKey),
				}); delErr != nil {
					fmt.Printf("s3 cleanup warning: %v\n", delErr)
				}
				return text, nil
			}
		}
		if job.TranscriptionJobStatus == transcribetypes.TranscriptionJobStatusFailed {
			reason := ""
			if job.FailureReason != nil {
				reason = *job.FailureReason
			}
			return "", fmt.Errorf("transcription failed: %s", reason)
		}
	}

	return "", fmt.Errorf("transcription job %s timed out", jobName)
}

func resolveMediaFormat(ext string) transcribetypes.MediaFormat {
	ext = strings.ToLower(strings.TrimPrefix(ext, "."))
	switch ext {
	case "mp3":
		return transcribetypes.MediaFormatMp3
	case "mp4", "m4v":
		return transcribetypes.MediaFormatMp4
	case "m4a":
		return transcribetypes.MediaFormatMp4
	case "wav":
		return transcribetypes.MediaFormatWav
	case "flac":
		return transcribetypes.MediaFormatFlac
	case "ogg", "oga":
		return transcribetypes.MediaFormatOgg
	case "webm":
		return transcribetypes.MediaFormatWebm
	case "amr":
		return transcribetypes.MediaFormatAmr
	default:
		return transcribetypes.MediaFormatMp4
	}
}

// fetchTranscriptText downloads the Transcribe result JSON and extracts plain text.
func fetchTranscriptText(ctx context.Context, transcriptURI string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", transcriptURI, nil)
	if err != nil {
		return "", err
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	// Transcribe output format:
	// { "results": { "transcripts": [ { "transcript": "..." } ] } }
	var result struct {
		Results struct {
			Transcripts []struct {
				Transcript string `json:"transcript"`
			} `json:"transcripts"`
		} `json:"results"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("parse transcript JSON: %w", err)
	}

	var texts []string
	for _, t := range result.Results.Transcripts {
		if t.Transcript != "" {
			texts = append(texts, t.Transcript)
		}
	}

	return strings.Join(texts, " "), nil
}
