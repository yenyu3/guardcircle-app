resource "aws_security_group" "lambda" {
  name        = "${var.project_name}-lambda-sg"
  description = "Lambda security group"
  vpc_id      = aws_vpc.this.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-lambda-sg"
  }
}

resource "aws_security_group_rule" "db_from_lambda" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.lambda.id
  description              = "PostgreSQL from Lambda"
}

resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

locals {
  lambda_env = {
    DB_HOST = aws_rds_cluster.this.endpoint
    DB_PORT = tostring(aws_rds_cluster.this.port)
    DB_NAME = var.db_name
    DB_USER = var.db_username
    DB_PASS = random_password.db.result
  }

  lambda_subnets = [aws_subnet.private_a.id, aws_subnet.private_b.id]
}

resource "aws_lambda_function" "users_create" {
  function_name = "${var.project_name}-users-create"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = module.docker_image["users_create"].image_uri
  architectures = [var.lambda_architecture]

  vpc_config {
    subnet_ids         = local.lambda_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "users_get" {
  function_name = "${var.project_name}-users-get"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = module.docker_image["users_get"].image_uri
  architectures = [var.lambda_architecture]

  vpc_config {
    subnet_ids         = local.lambda_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "users_patch" {
  function_name = "${var.project_name}-users-patch"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = module.docker_image["users_patch"].image_uri
  architectures = [var.lambda_architecture]

  vpc_config {
    subnet_ids         = local.lambda_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "families_create" {
  function_name = "${var.project_name}-families-create"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = module.docker_image["families_create"].image_uri
  architectures = [var.lambda_architecture]

  vpc_config {
    subnet_ids         = local.lambda_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "families_join" {
  function_name = "${var.project_name}-families-join"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = module.docker_image["families_join"].image_uri
  architectures = [var.lambda_architecture]

  vpc_config {
    subnet_ids         = local.lambda_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "families_scan_events" {
  function_name = "${var.project_name}-families-scan-events"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = module.docker_image["families_scan_events"].image_uri
  architectures = [var.lambda_architecture]

  vpc_config {
    subnet_ids         = local.lambda_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "analysis" {
  function_name = "${var.project_name}-analysis"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = module.docker_image["analysis"].image_uri
  architectures = [var.lambda_architecture]

  vpc_config {
    subnet_ids         = local.lambda_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "user_event" {
  function_name = "${var.project_name}-user-event"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = module.docker_image["user_event"].image_uri
  architectures = [var.lambda_architecture]

  vpc_config {
    subnet_ids         = local.lambda_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "families_feed" {
  function_name = "${var.project_name}-families-feed"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = module.docker_image["families_feed"].image_uri
  architectures = [var.lambda_architecture]

  vpc_config {
    subnet_ids         = local.lambda_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }
}

resource "aws_lambda_function" "auth_login" {
  function_name = "${var.project_name}-auth-login"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = module.docker_image["auth_login"].image_uri
  architectures = [var.lambda_architecture]

  vpc_config {
    subnet_ids         = local.lambda_subnets
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = local.lambda_env
  }
}
