# Backend Deployment

**Prereqs**
- Terraform >= 1.5
- AWS CLI authenticated (profile or env vars)
- Docker running (required for Lambda container build/push)
- Region: `us-east-1`

**1) Create Terraform Backend (one-time)**
```sh
cd backend/terraform/backend-bootstrap
terraform init
terraform apply
```

**2) Deploy All Resources (clean environment)**
This creates VPC, Aurora, API Gateway, 9 Lambda functions, ECR repos, and runs schema migration.
```sh
cd ../
terraform init -reconfigure
terraform apply -var="run_schema_migration=true"
```

**3) Get API Base URL**
```sh
terraform output -raw api_base_url
```

**4) Re-run Schema Migration (if needed)**
If you changed `backend/terraform/sql/schema.sql`, force rerun:
```sh
terraform apply -var="run_schema_migration=true" -replace="null_resource.schema[0]"
```

**Notes**
- Lambda responses are hardcoded (MVP fake responses).
- Aurora cluster identifier: `guardcircle-aurora`
- Database name: `guardcircle`

**Troubleshooting**
- State lock stuck: `terraform force-unlock <LOCK_ID>`
- ECR push/build issues: ensure Docker is running and AWS CLI is authenticated.
