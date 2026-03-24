output "bucket_name" {
  value = aws_s3_bucket.tfstate.bucket
}

output "dynamodb_table_name" {
  value = aws_dynamodb_table.tfstate_lock.name
}

output "region" {
  value = var.aws_region
}

output "state_key" {
  value = var.state_key
}
