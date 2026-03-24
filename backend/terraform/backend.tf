terraform {
  backend "s3" {
    bucket         = "guardcircle-tfstate"
    key            = "guardcircle/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "guardcircle-tfstate-lock"
    encrypt        = true
  }
}
