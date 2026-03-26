package main

import (
	"context"
	"log"
	"os"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	txclient "github.com/aws/aws-sdk-go-v2/service/transcribe"
)

// Config holds all configuration read from environment variables.
type Config struct {
	WhoscallAPIKey   string
	WhoscallBaseURL  string
	BedrockKBID      string
	BedrockRegion    string
	BedrockModelID   string
	TranscribeS3Bucket string
}

// Dependencies groups all external service interfaces for the analysis pipeline.
// Production uses real implementations; tests inject mocks.
type Dependencies struct {
	Config         Config
	ExternalAPI    ExternalAPIClient
	KnowledgeBase  KnowledgeBaseClient
	Analyzer       AnalyzerClient
	Transcriber    TranscriberClient
	DB             DBClient
}

// ExternalAPIClient calls Whoscall APIs (content-check, number-check, url-check).
type ExternalAPIClient interface {
	Call(ctx context.Context, inputType, content, region, apiKey, baseURL string) (*ExternalAPIResult, error)
}

// KnowledgeBaseClient queries Bedrock Knowledge Base for similar scam cases.
type KnowledgeBaseClient interface {
	Query(ctx context.Context, region, kbID, query string) (string, error)
}

// AnalyzerClient sends data to Bedrock Claude for scam analysis.
type AnalyzerClient interface {
	Analyze(ctx context.Context, region, modelID string, req *AnalysisRequest, apiResult *ExternalAPIResult, kbContext string) (*BedrockAnalysis, error)
}

// TranscriberClient transcribes media (video/audio/file) to text.
type TranscriberClient interface {
	Transcribe(ctx context.Context, region, bucket, base64Content, fileExt string) (string, error)
}

// DBClient writes scan events to the database.
type DBClient interface {
	WriteScanEvent(ctx context.Context, e *EventData) error
}

// ── Real implementations ────────────────────────────────────────

type realExternalAPI struct{}

func (r *realExternalAPI) Call(ctx context.Context, inputType, content, region, apiKey, baseURL string) (*ExternalAPIResult, error) {
	return callExternalAPI(ctx, inputType, content, region, apiKey, baseURL)
}

type realKnowledgeBase struct {
	client *bedrockagentruntime.Client
}

func (r *realKnowledgeBase) Query(ctx context.Context, region, kbID, query string) (string, error) {
	return queryKnowledgeBase(ctx, r.client, kbID, query)
}

type realAnalyzer struct {
	client *bedrockruntime.Client
}

func (r *realAnalyzer) Analyze(ctx context.Context, region, modelID string, req *AnalysisRequest, apiResult *ExternalAPIResult, kbContext string) (*BedrockAnalysis, error) {
	return analyzeWithBedrock(ctx, r.client, modelID, req, apiResult, kbContext)
}

type realTranscriber struct {
	s3Client *s3.Client
	txClient *txclient.Client
}

func (r *realTranscriber) Transcribe(ctx context.Context, region, bucket, base64Content, fileExt string) (string, error) {
	return transcribeMedia(ctx, r.s3Client, r.txClient, bucket, base64Content, fileExt)
}

type realDB struct{}

func (r *realDB) WriteScanEvent(ctx context.Context, e *EventData) error {
	return writeScanEvent(ctx, e)
}

// loadConfig reads all configuration from environment variables.
func loadConfig() Config {
	region := os.Getenv("BEDROCK_REGION")
	if region == "" {
		region = "us-east-1"
	}
	baseURL := os.Getenv("WHOSCALL_BASE_URL")
	if baseURL == "" {
		baseURL = "https://hljaj2f6gf.execute-api.ap-northeast-1.amazonaws.com/prod"
	}
	modelID := os.Getenv("BEDROCK_MODEL_ID")
	if modelID == "" {
		modelID = "anthropic.claude-sonnet-4-20250514-v1:0"
	}
	return Config{
		WhoscallAPIKey:     os.Getenv("WHOSCALL_API_KEY"),
		WhoscallBaseURL:    baseURL,
		BedrockKBID:        os.Getenv("BEDROCK_KB_ID"),
		BedrockRegion:      region,
		BedrockModelID:     modelID,
		TranscribeS3Bucket: os.Getenv("TRANSCRIBE_S3_BUCKET"),
	}
}

// newProductionDeps returns Dependencies wired to real AWS services.
// AWS clients are initialized once and reused across invocations.
func newProductionDeps() *Dependencies {
	cfg := loadConfig()

	awsCfg, err := awsconfig.LoadDefaultConfig(context.Background(), awsconfig.WithRegion(cfg.BedrockRegion))
	if err != nil {
		log.Fatalf("failed to load AWS config: %v", err)
	}

	return &Dependencies{
		Config:        cfg,
		ExternalAPI:   &realExternalAPI{},
		KnowledgeBase: &realKnowledgeBase{client: bedrockagentruntime.NewFromConfig(awsCfg)},
		Analyzer:      &realAnalyzer{client: bedrockruntime.NewFromConfig(awsCfg)},
		Transcriber:   &realTranscriber{s3Client: s3.NewFromConfig(awsCfg), txClient: txclient.NewFromConfig(awsCfg)},
		DB:            &realDB{},
	}
}
