locals {
  schema_sql_path = "${path.module}/sql/schema.sql"
}

resource "null_resource" "schema" {
  count = var.run_schema_migration ? 1 : 0

  triggers = {
    schema_sha  = filesha256(local.schema_sql_path)
    cluster_arn = aws_rds_cluster.this.arn
  }

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]
    command = <<-EOT
      set -euo pipefail
      FILE="${local.schema_sql_path}"
      python3 - <<'PY'
import os
import subprocess

file_path = os.environ["SCHEMA_FILE"]
cluster_arn = os.environ["CLUSTER_ARN"]
secret_arn = os.environ["SECRET_ARN"]
db_name = os.environ["DB_NAME"]

with open(file_path, "r", encoding="utf-8") as f:
    sql = f.read()

stmts = [s.strip() for s in sql.split(";") if s.strip()]
for stmt in stmts:
    subprocess.run(
        [
            "aws", "rds-data", "execute-statement",
            "--resource-arn", cluster_arn,
            "--secret-arn", secret_arn,
            "--database", db_name,
            "--sql", stmt,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
    )
PY
    EOT

    environment = {
      SCHEMA_FILE = local.schema_sql_path
      CLUSTER_ARN = aws_rds_cluster.this.arn
      SECRET_ARN  = aws_secretsmanager_secret.db.arn
      DB_NAME     = var.db_name
    }
  }

  depends_on = [aws_rds_cluster_instance.this, aws_secretsmanager_secret_version.db]
}
