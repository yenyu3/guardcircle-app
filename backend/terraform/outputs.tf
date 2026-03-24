output "db_endpoint" {
  value = aws_rds_cluster.this.endpoint
}

output "db_port" {
  value = aws_rds_cluster.this.port
}

output "db_name" {
  value = var.db_name
}

output "db_username" {
  value = var.db_username
}

output "db_password" {
  value     = random_password.db.result
  sensitive = true
}

output "lambda_names" {
  value = [
    aws_lambda_function.users_create.function_name,
    aws_lambda_function.users_get.function_name,
    aws_lambda_function.users_patch.function_name,
    aws_lambda_function.families_create.function_name,
    aws_lambda_function.families_join.function_name,
    aws_lambda_function.families_scan_events.function_name,
    aws_lambda_function.analysis.function_name,
    aws_lambda_function.user_event.function_name,
    aws_lambda_function.families_feed.function_name,
  ]
}

output "api_base_url" {
  value = aws_apigatewayv2_api.http.api_endpoint
}

output "image_uris" {
  value = {
    for k, m in module.docker_image :
    k => m.image_uri
  }
}
