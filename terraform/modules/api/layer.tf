resource "aws_lambda_layer_version" "lambda_layer" {
  layer_name = "${var.prefix}_${var.api_name}_api_layer_${var.stage}"

  # The zip containing the lambda function
  filename = "../../../lambda/dist/layer/nodejs.zip"
  source_code_hash = filebase64sha256("../../../lambda/dist/layer/nodejs.zip")
  compatible_runtimes = [var.runtime]
}
