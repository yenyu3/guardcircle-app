# Frontend

## Deploy (Web -> S3 + CloudFront)

Make sure the backend infrastructure is already deployed (Terraform apply) before deploying the frontend.

Before running the deploy script, export your AWS profile:

```bash
export AWS_PROFILE=your-profile-name
```

Then run:

```bash
./scripts/deploy-frontend.sh
```
