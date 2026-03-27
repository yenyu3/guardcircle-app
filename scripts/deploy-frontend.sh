#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
TF_DIR="$ROOT_DIR/backend/terraform"

command -v aws >/dev/null 2>&1 || { echo "aws CLI not found"; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm not found"; exit 1; }

echo "[1/4] Build web bundle"
cd "$FRONTEND_DIR"
npx expo export -p web

echo "[2/4] Resolve S3 bucket"
cd "$TF_DIR"
FRONTEND_BUCKET="$(terraform output -raw frontend_bucket_name)"
CF_DOMAIN="$(terraform output -raw cloudfront_domain_name)"

echo "[3/4] Upload to S3"
aws s3 sync "$FRONTEND_DIR/dist" "s3://${FRONTEND_BUCKET}" --delete

echo "[4/4] CloudFront invalidation"
CF_QUERY="$(printf "DistributionList.Items[?DomainName=='%s'].Id | [0]" "$CF_DOMAIN")"
CF_ID="$(aws cloudfront list-distributions --query "$CF_QUERY" --output text)"
if [[ "$CF_ID" != "None" && -n "$CF_ID" ]]; then
  aws cloudfront create-invalidation --distribution-id "$CF_ID" --paths "/*" >/dev/null
  echo "Invalidation created for $CF_ID"
else
  echo "CloudFront distribution not found for domain: $CF_DOMAIN"
fi

echo "Done. URL: https://${CF_DOMAIN}"
