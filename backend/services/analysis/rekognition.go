package main

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/rekognition"
	rektypes "github.com/aws/aws-sdk-go-v2/service/rekognition/types"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// VideoAnalysisResult holds combined Rekognition results for a video.
type VideoAnalysisResult struct {
	ModerationLabels []ModerationItem `json:"moderation_labels,omitempty"`
	Labels           []LabelItem      `json:"labels,omitempty"`
	OCRTexts         []string         `json:"ocr_texts,omitempty"`
}

type ModerationItem struct {
	Name       string  `json:"name"`
	ParentName string  `json:"parent_name,omitempty"`
	Confidence float32 `json:"confidence"`
	TimestampMs int64  `json:"timestamp_ms"`
}

type LabelItem struct {
	Name        string  `json:"name"`
	Confidence  float32 `json:"confidence"`
	TimestampMs int64   `json:"timestamp_ms"`
}

// analyzeVideoWithRekognition runs content moderation, label detection, and OCR on a video in S3.
func analyzeVideoWithRekognition(ctx context.Context, client *rekognition.Client, s3Client *s3.Client, bucket, s3Key string) (*VideoAnalysisResult, error) {
	s3Object := &rektypes.S3Object{
		Bucket: aws.String(bucket),
		Name:   aws.String(s3Key),
	}
	video := &rektypes.Video{S3Object: s3Object}

	// Start content moderation
	modOut, err := client.StartContentModeration(ctx, &rekognition.StartContentModerationInput{
		Video:            video,
		MinConfidence:    aws.Float32(50),
	})
	if err != nil {
		return nil, fmt.Errorf("start content moderation: %w", err)
	}

	// Start label detection
	labelOut, err := client.StartLabelDetection(ctx, &rekognition.StartLabelDetectionInput{
		Video:         video,
		MinConfidence: aws.Float32(70),
	})
	if err != nil {
		return nil, fmt.Errorf("start label detection: %w", err)
	}

	// Poll both jobs (max 240s, every 5s)
	var modLabels []ModerationItem
	var labels []LabelItem
	modDone, labelDone := false, false

	for i := 0; i < 48; i++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(5 * time.Second):
		}

		if !modDone {
			modResult, err := client.GetContentModeration(ctx, &rekognition.GetContentModerationInput{
				JobId: modOut.JobId,
			})
			if err == nil {
				switch modResult.JobStatus {
				case rektypes.VideoJobStatusSucceeded:
					modDone = true
					for _, item := range modResult.ModerationLabels {
						if item.ModerationLabel != nil {
							modLabels = append(modLabels, ModerationItem{
								Name:        aws.ToString(item.ModerationLabel.Name),
								ParentName:  aws.ToString(item.ModerationLabel.ParentName),
								Confidence:  aws.ToFloat32(item.ModerationLabel.Confidence),
								TimestampMs: item.Timestamp,
							})
						}
					}
				case rektypes.VideoJobStatusFailed:
					modDone = true
					fmt.Printf("content moderation failed: %s\n", aws.ToString(modResult.StatusMessage))
				}
			}
		}

		if !labelDone {
			labelResult, err := client.GetLabelDetection(ctx, &rekognition.GetLabelDetectionInput{
				JobId: labelOut.JobId,
			})
			if err == nil {
				switch labelResult.JobStatus {
				case rektypes.VideoJobStatusSucceeded:
					labelDone = true
					for _, item := range labelResult.Labels {
						if item.Label != nil {
							labels = append(labels, LabelItem{
								Name:        aws.ToString(item.Label.Name),
								Confidence:  aws.ToFloat32(item.Label.Confidence),
								TimestampMs: item.Timestamp,
							})
						}
					}
				case rektypes.VideoJobStatusFailed:
					labelDone = true
					fmt.Printf("label detection failed: %s\n", aws.ToString(labelResult.StatusMessage))
				}
			}
		}

		if modDone && labelDone {
			break
		}
	}

	// Deduplicate labels by name (keep highest confidence)
	labels = deduplicateLabels(labels)

	// OCR: extract keyframes with ffmpeg, run DetectText on each
	ocrTexts := extractVideoOCR(ctx, client, s3Client, bucket, s3Key)

	return &VideoAnalysisResult{
		ModerationLabels: modLabels,
		Labels:           labels,
		OCRTexts:         ocrTexts,
	}, nil
}

// deduplicateLabels keeps the highest-confidence entry per label name.
func deduplicateLabels(items []LabelItem) []LabelItem {
	best := make(map[string]LabelItem)
	for _, item := range items {
		if existing, ok := best[item.Name]; !ok || item.Confidence > existing.Confidence {
			best[item.Name] = item
		}
	}
	result := make([]LabelItem, 0, len(best))
	for _, v := range best {
		result = append(result, v)
	}
	return result
}

// ── Video OCR: ffmpeg keyframes + DetectText ────────────────────

// extractVideoOCR downloads the video, extracts keyframes via ffmpeg,
// and runs Rekognition DetectText on each frame.
// Returns deduplicated OCR text lines. Errors are non-fatal (returns nil).
func extractVideoOCR(ctx context.Context, rekClient *rekognition.Client, s3Client *s3.Client, bucket, s3Key string) []string {
	// Check ffmpeg availability
	if _, err := exec.LookPath("ffmpeg"); err != nil {
		log.Printf("[REKOGNITION-OCR] ffmpeg not found, skipping OCR")
		return nil
	}

	tmpDir, err := os.MkdirTemp("", "rek-ocr-*")
	if err != nil {
		log.Printf("[REKOGNITION-OCR] create temp dir: %v", err)
		return nil
	}
	defer os.RemoveAll(tmpDir)

	ext := filepath.Ext(s3Key)
	if ext == "" {
		ext = ".mp4"
	}
	videoPath := filepath.Join(tmpDir, "input"+ext)

	// Download video from S3
	log.Printf("[REKOGNITION-OCR] downloading video from s3://%s/%s", bucket, s3Key)
	getResp, err := s3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(s3Key),
	})
	if err != nil {
		log.Printf("[REKOGNITION-OCR] s3 download: %v", err)
		return nil
	}
	defer getResp.Body.Close()

	videoFile, err := os.Create(videoPath)
	if err != nil {
		log.Printf("[REKOGNITION-OCR] create video file: %v", err)
		return nil
	}
	if _, err := io.Copy(videoFile, getResp.Body); err != nil {
		videoFile.Close()
		log.Printf("[REKOGNITION-OCR] write video file: %v", err)
		return nil
	}
	videoFile.Close()

	// Extract keyframes with ffmpeg: 1 frame every 5 seconds, max 10 frames
	framesPattern := filepath.Join(tmpDir, "frame_%03d.jpg")
	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-i", videoPath,
		"-vf", "fps=1/5", // 1 frame per 5 seconds
		"-frames:v", "10", // max 10 frames
		"-q:v", "2", // good JPEG quality
		framesPattern,
		"-y", "-loglevel", "error",
	)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		log.Printf("[REKOGNITION-OCR] ffmpeg error: %v: %s", err, stderr.String())
		return nil
	}

	// Find extracted frames
	frames, _ := filepath.Glob(filepath.Join(tmpDir, "frame_*.jpg"))
	sort.Strings(frames)
	if len(frames) == 0 {
		log.Printf("[REKOGNITION-OCR] no frames extracted")
		return nil
	}
	log.Printf("[REKOGNITION-OCR] extracted %d keyframes", len(frames))

	// Run DetectText on each frame
	seen := make(map[string]bool)
	var allTexts []string

	for _, framePath := range frames {
		frameData, err := os.ReadFile(framePath)
		if err != nil {
			continue
		}

		resp, err := rekClient.DetectText(ctx, &rekognition.DetectTextInput{
			Image: &rektypes.Image{
				Bytes: frameData,
			},
		})
		if err != nil {
			log.Printf("[REKOGNITION-OCR] DetectText error: %v", err)
			continue
		}

		for _, det := range resp.TextDetections {
			// Only take LINE type (not WORD) to avoid duplicates
			if det.Type == rektypes.TextTypesLine && det.DetectedText != nil {
				text := strings.TrimSpace(*det.DetectedText)
				if text != "" && !seen[text] {
					seen[text] = true
					allTexts = append(allTexts, text)
				}
			}
		}
	}

	log.Printf("[REKOGNITION-OCR] detected %d unique text lines", len(allTexts))
	return allTexts
}

// formatRekognitionContext builds a text summary for Bedrock prompt.
func formatRekognitionContext(result *VideoAnalysisResult) string {
	if result == nil {
		return ""
	}

	var sb strings.Builder

	if len(result.ModerationLabels) > 0 {
		sb.WriteString("### Rekognition 內容審核結果\n")
		seen := make(map[string]bool)
		for _, m := range result.ModerationLabels {
			key := m.Name
			if seen[key] {
				continue
			}
			seen[key] = true
			if m.ParentName != "" {
				sb.WriteString(fmt.Sprintf("- %s > %s (信心度: %.1f%%)\n", m.ParentName, m.Name, m.Confidence))
			} else {
				sb.WriteString(fmt.Sprintf("- %s (信心度: %.1f%%)\n", m.Name, m.Confidence))
			}
		}
		sb.WriteString("\n")
	}

	if len(result.Labels) > 0 {
		sb.WriteString("### Rekognition 影片物件/場景偵測\n")
		for _, l := range result.Labels {
			sb.WriteString(fmt.Sprintf("- %s (信心度: %.1f%%)\n", l.Name, l.Confidence))
		}
		sb.WriteString("\n")
	}

	if len(result.OCRTexts) > 0 {
		sb.WriteString("### Rekognition 影片文字辨識 (OCR)\n")
		for _, t := range result.OCRTexts {
			sb.WriteString(fmt.Sprintf("- %s\n", t))
		}
		sb.WriteString("\n")
	}

	return sb.String()
}
