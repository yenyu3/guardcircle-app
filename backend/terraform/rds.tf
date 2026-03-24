resource "random_password" "db" {
  length  = 24
  special = true
}

resource "random_id" "db_subnet_suffix" {
  byte_length = 2
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project_name}-db-subnet-group-${random_id.db_subnet_suffix.hex}"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_b.id]

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_secretsmanager_secret" "db" {
  name = "${var.project_name}-db-credentials"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db.result
    dbname   = var.db_name
  })
}

resource "aws_rds_cluster" "this" {
  cluster_identifier   = "${var.project_name}-aurora"
  engine               = "aurora-postgresql"
  database_name        = var.db_name
  master_username      = var.db_username
  master_password      = random_password.db.result
  db_subnet_group_name = aws_db_subnet_group.this.name

  vpc_security_group_ids = [aws_security_group.db.id]
  enable_http_endpoint   = true

  backup_retention_period = 7
  skip_final_snapshot     = true
  deletion_protection     = false

  tags = {
    Name = "${var.project_name}-aurora"
  }
}

resource "aws_rds_cluster_instance" "this" {
  identifier         = "${var.project_name}-aurora-1"
  cluster_identifier = aws_rds_cluster.this.id
  instance_class     = var.db_instance_class
  engine             = aws_rds_cluster.this.engine

  tags = {
    Name = "${var.project_name}-aurora-1"
  }
}
