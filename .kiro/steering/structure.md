# Project Structure

## Repository Layout

```
guardcircle-app/
├── frontend/          # React Native mobile app
├── backend/           # Go microservices + infrastructure
└── ai/                # ML training pipeline
```

## Frontend Structure

```
frontend/
├── App.tsx                    # Root component
├── index.ts                   # Entry point
├── app.json                   # Expo configuration
└── src/
    ├── screens/               # Screen components by feature
    │   ├── auth/              # Login, role selection, join family
    │   ├── detect/            # Detection flow (input, analysis, results)
    │   ├── family/            # Family circle management
    │   └── settings/          # User settings
    ├── components/            # Reusable UI components (Button, Card, Banner)
    ├── navigation/            # Navigation configuration
    ├── store/                 # Zustand state management
    ├── mock/                  # Mock data for development
    ├── theme/                 # Design tokens (colors, fonts, spacing)
    └── types/                 # TypeScript type definitions
```

### Frontend Conventions

- Screens organized by feature area (auth, detect, family, settings)
- Shared components in `components/`
- Global state in `store/` using Zustand
- Theme constants centralized in `theme/`
- TypeScript types in `types/`

## Backend Structure

```
backend/
├── services/                  # Go Lambda microservices
│   ├── analysis/              # Scam detection analysis
│   ├── user-event/            # User event tracking
│   ├── users-{create,get,patch}/        # User CRUD
│   ├── families-{create,join,feed}/     # Family CRUD
│   └── families-scan-events/  # Scan event retrieval
└── terraform/                 # Infrastructure as Code
    ├── backend-bootstrap/     # S3 + DynamoDB for Terraform state
    ├── sql/                   # Database schema migrations
    ├── *.tf                   # Resource definitions
    └── variables.tf           # Configuration variables
```

### Backend Conventions

- Each Lambda function is a separate Go service with its own directory
- Each service has: `main.go`, `Dockerfile`, `go.mod`, `go.sum`
- Services use AWS Lambda Go SDK (`github.com/aws/aws-lambda-go`)
- API Gateway v2 HTTP request/response events
- All services return JSON responses with `message` and `data` fields
- Database connection via environment variables (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS)

### Infrastructure Conventions

- Terraform manages all AWS resources
- State stored in S3 with DynamoDB locking (created by backend-bootstrap)
- Lambda functions deployed as Docker containers via ECR
- VPC with public/private subnets across 2 AZs
- Aurora PostgreSQL in private subnets
- Lambda functions in private subnets with NAT gateway egress

## AI Pipeline Structure

```
ai/sft_pipeline/
├── config.py                  # Configuration settings
├── requirements.txt           # Python dependencies
├── run_pipeline.py            # Main pipeline orchestrator
├── stage1_*.py                # Data download and preprocessing
├── stage2_*.py                # Dataset generation (justifications, non-scam)
├── train_local_stage1.py      # Local QLoRA training
└── sagemaker_*.ipynb          # SageMaker training notebooks
```

### AI Pipeline Conventions

- Multi-stage pipeline: download → preprocess → generate → train
- Stage 1: Data acquisition and cleaning
- Stage 2: Synthetic data generation for balanced training
- Training uses QLoRA (4-bit quantization) for efficiency
- Model: Qwen3 7B fine-tuned for Traditional Chinese scam detection

## Database Schema

Core tables:
- `families`: Family circles with invite codes
- `users`: User accounts with role (guardian/gatekeeper/youth)
- `scan_events`: Scam detection submissions and results

Key relationships:
- Users belong to families (many-to-one)
- Scan events belong to users (many-to-one)
- Cascade delete: family deletion removes user associations
- Cascade delete: user deletion removes their scan events

## Naming Conventions

- **Files**: kebab-case for directories and files
- **Go**: PascalCase for exported, camelCase for unexported
- **TypeScript**: PascalCase for components, camelCase for functions/variables
- **Database**: snake_case for tables and columns
- **Terraform**: snake_case for resources and variables
- **Lambda functions**: `{project_name}-{service-name}` format
