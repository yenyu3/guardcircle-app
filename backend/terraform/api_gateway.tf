resource "aws_apigatewayv2_api" "http" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.users_create.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "users_get" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.users_get.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "users_patch" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.users_patch.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "families_create" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.families_create.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "families_join" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.families_join.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "families_scan_events" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.families_scan_events.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "analysis" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.analysis.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "user_event" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.user_event.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "families_feed" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.families_feed.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "auth_login" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth_login.arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "post_users" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /users"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"
}

resource "aws_apigatewayv2_route" "get_user" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /users/{user_id}"
  target    = "integrations/${aws_apigatewayv2_integration.users_get.id}"
}

resource "aws_apigatewayv2_route" "patch_user" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "PATCH /users/{user_id}"
  target    = "integrations/${aws_apigatewayv2_integration.users_patch.id}"
}

resource "aws_apigatewayv2_route" "post_families" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /families"
  target    = "integrations/${aws_apigatewayv2_integration.families_create.id}"
}

resource "aws_apigatewayv2_route" "post_families_join" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /families/join"
  target    = "integrations/${aws_apigatewayv2_integration.families_join.id}"
}

resource "aws_apigatewayv2_route" "get_family_scan_events" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /families/{family_id}/scan-events"
  target    = "integrations/${aws_apigatewayv2_integration.families_scan_events.id}"
}

resource "aws_apigatewayv2_route" "get_family_feed" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /families/{family_id}/feed"
  target    = "integrations/${aws_apigatewayv2_integration.families_feed.id}"
}

resource "aws_apigatewayv2_route" "post_analysis" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /analysis"
  target    = "integrations/${aws_apigatewayv2_integration.analysis.id}"
}

resource "aws_apigatewayv2_route" "get_user_event" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "GET /users/{user_id}/events/{event_id}"
  target    = "integrations/${aws_apigatewayv2_integration.user_event.id}"
}

resource "aws_apigatewayv2_route" "post_auth_login" {
  api_id    = aws_apigatewayv2_api.http.id
  route_key = "POST /auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.auth_login.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "apigw_invoke_users_create" {
  statement_id  = "AllowApiGatewayInvokeUsersCreate"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.users_create.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_users_get" {
  statement_id  = "AllowApiGatewayInvokeUsersGet"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.users_get.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_users_patch" {
  statement_id  = "AllowApiGatewayInvokeUsersPatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.users_patch.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_families_create" {
  statement_id  = "AllowApiGatewayInvokeFamiliesCreate"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.families_create.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_families_join" {
  statement_id  = "AllowApiGatewayInvokeFamiliesJoin"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.families_join.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_families_scan_events" {
  statement_id  = "AllowApiGatewayInvokeFamiliesScanEvents"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.families_scan_events.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_analysis" {
  statement_id  = "AllowApiGatewayInvokeAnalysis"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.analysis.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_user_event" {
  statement_id  = "AllowApiGatewayInvokeUserEvent"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.user_event.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_families_feed" {
  statement_id  = "AllowApiGatewayInvokeFamiliesFeed"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.families_feed.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_auth_login" {
  statement_id  = "AllowApiGatewayInvokeAuthLogin"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_login.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
