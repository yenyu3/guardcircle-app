variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name prefix for all resources"
  type        = string
  default     = "guardcircle"
}

variable "db_name" {
  description = "Initial database name"
  type        = string
  default     = "guardcircle"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  default     = "guardcircle_admin"
}

variable "db_instance_class" {
  description = "Aurora DB instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "db_allowed_cidr" {
  description = "CIDR allowed to access PostgreSQL (5432). Default is VPC-only."
  type        = string
  default     = "10.0.0.0/16"
}

variable "run_schema_migration" {
  description = "Set true to run schema migration via RDS Data API"
  type        = bool
  default     = false
}

variable "lambda_architecture" {
  description = "Lambda architecture for container images"
  type        = string
  default     = "arm64"
}

variable "whoscall_api_key" {
  description = "Whoscall API key for external scam-check APIs"
  type        = string
  default     = ""
  sensitive   = true
}

variable "whoscall_base_url" {
  description = "Whoscall API base URL"
  type        = string
  default     = ""
}

variable "bedrock_model_id" {
  description = "Bedrock model ID for scam analysis (defaults to Claude Sonnet 4 in Go code)"
  type        = string
  default     = ""
}

variable "bedrock_kb_id" {
  description = "AWS Bedrock Knowledge Base ID for similar scam retrieval"
  type        = string
  default     = ""
}

variable "transcribe_s3_bucket" {
  description = "S3 bucket for temporary Transcribe media uploads"
  type        = string
  default     = ""
}
