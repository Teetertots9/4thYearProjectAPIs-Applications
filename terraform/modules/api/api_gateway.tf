resource "aws_api_gateway_rest_api" "applications-api" {
  name        = "${var.prefix}-applications-api-${var.stage}"
  description = "${var.prefix}-applications-api-${var.stage}"
  body = file("../../../swagger/${var.stage}/swagger.yaml")
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_deployment" "applications-api" {
  rest_api_id = aws_api_gateway_rest_api.applications-api.id
  stage_name  = var.stage

  stage_description = md5(file("../../../swagger/${var.stage}/swagger.yaml"))
  
  depends_on = [aws_api_gateway_rest_api.applications-api]
}