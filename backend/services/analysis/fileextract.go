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
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

const maxExtractedChars = 50000

// extractFileText downloads a file from S3 and extracts its text content.
// PDF files use pdftotext; text/code files are read directly.
func extractFileText(ctx context.Context, s3Client *s3.Client, bucket, s3Key, fileExt string) (string, error) {
	ext := strings.ToLower(strings.TrimPrefix(fileExt, "."))

	// Download from S3
	getResp, err := s3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(s3Key),
	})
	if err != nil {
		return "", fmt.Errorf("s3 download: %w", err)
	}
	defer getResp.Body.Close()

	if isTextFile(ext) {
		return readTextContent(getResp.Body)
	}

	if isPDFFile(ext) {
		return extractPDFText(ctx, getResp.Body, ext)
	}

	return "", fmt.Errorf("unsupported file extension for text extraction: %s", ext)
}

// readTextContent reads a text/code file body directly.
func readTextContent(body io.Reader) (string, error) {
	data, err := io.ReadAll(body)
	if err != nil {
		return "", fmt.Errorf("read file: %w", err)
	}

	// Check for binary content (null bytes in first 512 bytes)
	check := data
	if len(check) > 512 {
		check = check[:512]
	}
	if bytes.ContainsRune(check, 0) {
		return "", fmt.Errorf("file appears to be binary, not text")
	}

	text := string(data)
	return truncateExtracted(text), nil
}

// extractPDFText saves PDF to /tmp and runs pdftotext.
func extractPDFText(ctx context.Context, body io.Reader, ext string) (string, error) {
	if _, err := exec.LookPath("pdftotext"); err != nil {
		return "", fmt.Errorf("pdftotext not found: %w", err)
	}

	tmpFile := filepath.Join(os.TempDir(), fmt.Sprintf("extract-%s.%s", uuid.New().String(), ext))
	defer os.Remove(tmpFile)

	f, err := os.Create(tmpFile)
	if err != nil {
		return "", fmt.Errorf("create temp file: %w", err)
	}
	if _, err := io.Copy(f, body); err != nil {
		f.Close()
		return "", fmt.Errorf("write temp file: %w", err)
	}
	f.Close()

	var stdout, stderr bytes.Buffer
	cmd := exec.CommandContext(ctx, "pdftotext", "-layout", tmpFile, "-")
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("pdftotext: %w: %s", err, stderr.String())
	}

	text := strings.TrimSpace(stdout.String())
	if text == "" {
		log.Printf("[FILE_EXTRACT] pdftotext returned empty — PDF may be scanned/image-only")
	}

	return truncateExtracted(text), nil
}

func truncateExtracted(s string) string {
	runes := []rune(s)
	if len(runes) > maxExtractedChars {
		return string(runes[:maxExtractedChars])
	}
	return s
}

func isPDFFile(ext string) bool {
	return strings.ToLower(strings.TrimPrefix(ext, ".")) == "pdf"
}

func isTextFile(ext string) bool {
	textExts := map[string]bool{
		"txt": true, "py": true, "js": true, "json": true, "csv": true,
		"md": true, "html": true, "xml": true, "yaml": true, "yml": true,
		"log": true, "go": true, "java": true, "c": true, "cpp": true,
		"sh": true, "ts": true, "css": true, "sql": true, "r": true,
		"rb": true, "php": true, "swift": true, "kt": true, "rs": true,
	}
	return textExts[strings.ToLower(strings.TrimPrefix(ext, "."))]
}

// isDocumentFile returns true if the file extension is a PDF or text file
// that should go through file extraction instead of Transcribe.
func isDocumentFile(ext string) bool {
	e := strings.ToLower(strings.TrimPrefix(ext, "."))
	return isPDFFile(e) || isTextFile(e)
}
