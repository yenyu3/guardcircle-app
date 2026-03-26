# Technology Stack

## Frontend

- **Framework**: React Native with Expo (~54.0.0)
- **Language**: TypeScript (~5.9.2)
- **State Management**: Zustand (^5.0.12)
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **UI Components**: Custom components with Expo Vector Icons, Linear Gradient
- **Key Libraries**: 
  - expo-image-picker, expo-document-picker (content submission)
  - expo-notifications (alerts)
  - react-native-qrcode-svg (invite codes)
  - expo-clipboard, expo-sharing (content sharing)

## Backend

- **Language**: Go (Golang)
- **Architecture**: Serverless microservices on AWS Lambda
- **Deployment**: Docker containers via ECR
- **Database**: AWS Aurora PostgreSQL (Serverless v2)
- **API**: AWS API Gateway v2 (HTTP API)
- **Infrastructure**: Terraform (>= 1.5)
- **Region**: us-east-1

### Lambda Functions
9 containerized Go services handling users, families, analysis, and events.

## AI/ML Pipeline

- **Framework**: PyTorch (>=2.3.0), Transformers (>=4.51.0)
- **Training**: QLoRA fine-tuning with PEFT, TRL, bitsandbytes
- **Model**: Qwen3 7B (scam detection)
- **Data**: HuggingFace datasets, custom preprocessing pipeline
- **Deployment**: SageMaker (optional) or local training

## Common Commands

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps  # Install dependencies
npm start                        # Start Expo dev server
npm run android                  # Run on Android
npm run ios                      # Run on iOS
```

### Backend
```bash
cd backend/terraform
terraform init -reconfigure
terraform apply -var="run_schema_migration=true"  # Deploy all
terraform output -raw api_base_url                # Get API URL
```

### AI Pipeline
```bash
cd ai/sft_pipeline
pip install -r requirements.txt
python run_pipeline.py  # Run full training pipeline
```

## Development Requirements

- Node.js 18+
- Expo Go app (iOS/Android)
- Terraform >= 1.5
- AWS CLI (authenticated)
- Docker (for Lambda builds)
- Python 3.8+ with uv/pip (for AI pipeline)
