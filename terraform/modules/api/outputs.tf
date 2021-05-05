output "api_base_url" {
  value = aws_api_gateway_deployment.applications-api.invoke_url
}