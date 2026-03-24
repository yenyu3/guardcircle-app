variable "aws_region" {
  description = "AWS region to deploy backend state resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "guardcircle"
}

variable "state_key" {
  description = "State file key path"
  type        = string
  default     = "guardcircle/terraform.tfstate"
}
