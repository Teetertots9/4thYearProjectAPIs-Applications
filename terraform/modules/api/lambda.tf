###################################
# applications-api-authorizer lambda function
###################################

resource "aws_iam_role" "applications-api-authorizer-invocation-role" {
  name = "${var.prefix}-applications-api-authorizer-invocation-role-${var.stage}"
  path = "/"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "apigateway.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_role_policy" "applications-api-authorizer-invocation-policy" {
  name = "${var.prefix}-applications-api-authorizer-invocation-policy-${var.stage}"
  role = aws_iam_role.applications-api-authorizer-invocation-role.id

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "lambda:InvokeFunction",
      "Effect": "Allow",
      "Resource": "${aws_lambda_function.applications-api-authorizer.arn}"
    }
  ]
}
EOF
}


# IAM role which dictates what other AWS services the Lambda function
# may access.
resource "aws_iam_role" "applications-api-authorizer-role" {
  name = "${var.prefix}-applications-api-authorizer-role-${var.stage}"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "applications-api-authorizer-policy" {
    name        = "${var.prefix}-applications-api-authorizer-policy-${var.stage}"
    description = ""
    policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:*:*:*"
      ]
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "applications-api-authorizer-attach" {
    role       = aws_iam_role.applications-api-authorizer-role.name
    policy_arn = aws_iam_policy.applications-api-authorizer-policy.arn
}

resource "aws_lambda_function" "applications-api-authorizer" {
  function_name = "${var.prefix}-applications-api-authorizer-${var.stage}"

  # The zip containing the lambda function
  filename    = "../../../lambda/dist/functions/api-authorizer.zip"
  source_code_hash = filebase64sha256("../../../lambda/dist/functions/api-authorizer.zip")

  # "index" is the filename within the zip file (index.js) and "handler"
  # is the name of the property under which the handler function was
  # exported in that file.
  handler = "index.handler"
  runtime = var.runtime
  timeout = 10

  role = aws_iam_role.applications-api-authorizer-role.arn

  // The run time environment dependencies (package.json & node_modules)
  layers = [aws_lambda_layer_version.lambda_layer.id]

  environment {
    variables = {
      region =  var.region,
      userpool_id = var.cognito_user_pool_id
    }
  }
}

###################################
# get-applications lambda function
###################################

resource "aws_lambda_function" "get-applications" {
  function_name = "${var.prefix}-get-applications-${var.stage}"

  # The zip containing the lambda function
  filename    = "../../../lambda/dist/functions/get.zip"
  source_code_hash = filebase64sha256("../../../lambda/dist/functions/get.zip")

  # "index" is the filename within the zip file (index.js) and "handler"
  # is the name of the property under which the handler function was
  # exported in that file.
  handler = "index.handler"
  runtime = var.runtime
  timeout = 10

  role = aws_iam_role.get-applications-role.arn

  // The run time environment dependencies (package.json & node_modules)
  layers = [aws_lambda_layer_version.lambda_layer.id]

  environment {
    variables = {
      region =  var.region,
      table = aws_dynamodb_table.applications_table.id,
      events_api = "https://do2v2vx79f.execute-api.eu-west-1.amazonaws.com/dev"
    }
  }
}

# IAM role which dictates what other AWS services the Lambda function
# may access.
resource "aws_iam_role" "get-applications-role" {
  name = "${var.prefix}-get-applications-role-${var.stage}"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "get-applications-policy" {
    name        = "${var.prefix}-get-applications-policy-${var.stage}"
    description = ""
    policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:*:*:*"
      ]
    },
    {
      "Action": [
        "dynamodb:Scan"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:dynamodb:${var.region}:${var.account_id}:table/${aws_dynamodb_table.applications_table.id}"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "get-applications-attach" {
    role       = aws_iam_role.get-applications-role.name
    policy_arn = aws_iam_policy.get-applications-policy.arn
}

resource "aws_lambda_permission" "get-applications-apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get-applications.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_rest_api.applications-api.execution_arn}/*/*"
}

###################################
# create-application function
###################################

resource "aws_lambda_function" "create-application" {
  function_name = "${var.prefix}-create-application-${var.stage}"

  # The zip containing the lambda function
  filename    = "../../../lambda/dist/functions/create.zip"
  source_code_hash = filebase64sha256("../../../lambda/dist/functions/create.zip")

  # "index" is the filename within the zip file (index.js) and "handler"
  # is the name of the property under which the handler function was
  # exported in that file.
  handler = "index.handler"
  runtime = var.runtime
  timeout = 10

  role = aws_iam_role.create-application-role.arn

  // The run time environment dependencies (package.json & node_modules)
  layers = [aws_lambda_layer_version.lambda_layer.id]

  environment {
    variables = {
      region =  var.region,
      table = aws_dynamodb_table.applications_table.id
    }
  }
}

# IAM role which dictates what other AWS services the Lambda function
# may access.
resource "aws_iam_role" "create-application-role" {
  name = "${var.prefix}-create-application-role-${var.stage}"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "create-application-policy" {
    name        = "${var.prefix}-create-application-policy-${var.stage}"
    description = ""
    policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:*:*:*"
      ]
    },
    {
      "Action": [
        "dynamodb:PutItem"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:dynamodb:${var.region}:${var.account_id}:table/${aws_dynamodb_table.applications_table.id}"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "create-application-attach" {
    role       = aws_iam_role.create-application-role.name
    policy_arn = aws_iam_policy.create-application-policy.arn
}

resource "aws_lambda_permission" "create-application-apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.create-application.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_rest_api.applications-api.execution_arn}/*/*"
}


###################################
# get-application-details function
###################################

resource "aws_lambda_function" "get-application-details" {
  function_name = "${var.prefix}-get-application-details-${var.stage}"

  # The zip containing the lambda function
  filename    = "../../../lambda/dist/functions/get-item.zip"
  source_code_hash = filebase64sha256("../../../lambda/dist/functions/get-item.zip")

  # "index" is the filename within the zip file (index.js) and "handler"
  # is the name of the property under which the handler function was
  # exported in that file.
  handler = "index.handler"
  runtime = var.runtime
  timeout = 10

  role = aws_iam_role.get-application-details-role.arn

  // The run time environment dependencies (package.json & node_modules)
  layers = [aws_lambda_layer_version.lambda_layer.id]

  environment {
    variables = {
      region =  var.region,
      table = aws_dynamodb_table.applications_table.id
    }
  }
}

# IAM role which dictates what other AWS services the Lambda function
# may access.
resource "aws_iam_role" "get-application-details-role" {
  name = "${var.prefix}-get-application-details-role-${var.stage}"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "get-application-details-policy" {
    name        = "${var.prefix}-get-application-details-policy-${var.stage}"
    description = ""
    policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:*:*:*"
      ]
    },
    {
      "Action": [
        "dynamodb:GetItem"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:dynamodb:${var.region}:${var.account_id}:table/${aws_dynamodb_table.applications_table.id}"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "get-application-details-attach" {
    role       = aws_iam_role.get-application-details-role.name
    policy_arn = aws_iam_policy.get-application-details-policy.arn
}

resource "aws_lambda_permission" "get-application-details-apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get-application-details.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_rest_api.applications-api.execution_arn}/*/*"
}


###################################
# delete-application function
###################################

resource "aws_lambda_function" "delete-application" {
  function_name = "${var.prefix}-delete-application-${var.stage}"

  # The zip containing the lambda function
  filename    = "../../../lambda/dist/functions/delete.zip"
  source_code_hash = filebase64sha256("../../../lambda/dist/functions/delete.zip")

  # "index" is the filename within the zip file (index.js) and "handler"
  # is the name of the property under which the handler function was
  # exported in that file.
  handler = "index.handler"
  runtime = var.runtime
  timeout = 10

  role = aws_iam_role.delete-application-role.arn

  // The run time environment dependencies (package.json & node_modules)
  layers = [aws_lambda_layer_version.lambda_layer.id]

  environment {
    variables = {
      region =  var.region,
      table = aws_dynamodb_table.applications_table.id
    }
  }
}

# IAM role which dictates what other AWS services the Lambda function
# may access.
resource "aws_iam_role" "delete-application-role" {
  name = "${var.prefix}-delete-application-role-${var.stage}"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "delete-application-policy" {
    name        = "${var.prefix}-delete-application-policy-${var.stage}"
    description = ""
    policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:*:*:*"
      ]
    },
    {
      "Action": [
        "dynamodb:DeleteItem"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:dynamodb:${var.region}:${var.account_id}:table/${aws_dynamodb_table.applications_table.id}"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "delete-application-attach" {
    role       = aws_iam_role.delete-application-role.name
    policy_arn = aws_iam_policy.delete-application-policy.arn
}

resource "aws_lambda_permission" "delete-application-apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.delete-application.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_rest_api.applications-api.execution_arn}/*/*"
}

###################################
# update-application function
###################################

resource "aws_lambda_function" "update-application" {
  function_name = "${var.prefix}-update-application-${var.stage}"

  # The zip containing the lambda function
  filename    = "../../../lambda/dist/functions/update.zip"
  source_code_hash = filebase64sha256("../../../lambda/dist/functions/update.zip")

  # "index" is the filename within the zip file (index.js) and "handler"
  # is the name of the property under which the handler function was
  # exported in that file.
  handler = "index.handler"
  runtime = var.runtime
  timeout = 10

  role = aws_iam_role.update-application-role.arn

  // The run time environment dependencies (package.json & node_modules)
  layers = [aws_lambda_layer_version.lambda_layer.id]

  environment {
    variables = {
      region =  var.region,
      table = aws_dynamodb_table.applications_table.id
    }
  }
}

# IAM role which dictates what other AWS services the Lambda function
# may access.
resource "aws_iam_role" "update-application-role" {
  name = "${var.prefix}-update-application-role-${var.stage}"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "update-application-policy" {
    name        = "${var.prefix}-update-application-policy-${var.stage}"
    description = ""
    policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:*:*:*"
      ]
    },
    {
      "Action": [
        "dynamodb:UpdateItem"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:dynamodb:${var.region}:${var.account_id}:table/${aws_dynamodb_table.applications_table.id}"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "update-application-attach" {
    role       = aws_iam_role.update-application-role.name
    policy_arn = aws_iam_policy.update-application-policy.arn
}

resource "aws_lambda_permission" "update-application-apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.update-application.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_rest_api.applications-api.execution_arn}/*/*"
}

###################################
# get-applications-for function
###################################

resource "aws_lambda_function" "get-applications-for" {
  function_name = "${var.prefix}-get-applications-for-${var.stage}"

  # The zip containing the lambda function
  filename    = "../../../lambda/dist/functions/get-for.zip"
  source_code_hash = filebase64sha256("../../../lambda/dist/functions/get-for.zip")

  # "index" is the filename within the zip file (index.js) and "handler"
  # is the name of the property under which the handler function was
  # exported in that file.
  handler = "index.handler"
  runtime = var.runtime
  timeout = 10

  role = aws_iam_role.get-applications-for-role.arn

  // The run time environment dependencies (package.json & node_modules)
  layers = [aws_lambda_layer_version.lambda_layer.id]

  environment {
    variables = {
      region =  var.region,
      table = aws_dynamodb_table.applications_table.id
    }
  }
}

# IAM role which dictates what other AWS services the Lambda function
# may access.
resource "aws_iam_role" "get-applications-for-role" {
  name = "${var.prefix}-get-applications-for-role-${var.stage}"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}

resource "aws_iam_policy" "get-applications-for-policy" {
    name        = "${var.prefix}-get-applications-for-policy-${var.stage}"
    description = ""
    policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": [
        "arn:aws:logs:*:*:*"
      ]
    },
    {
      "Action": [
        "dynamodb:Query"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:dynamodb:${var.region}:${var.account_id}:table/${aws_dynamodb_table.applications_table.id}"
    },
    {
      "Action": [
        "dynamodb:Query"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:dynamodb:${var.region}:${var.account_id}:table/${aws_dynamodb_table.applications_table.id}/index/*"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "get-applications-for-attach" {
    role       = aws_iam_role.get-applications-for-role.name
    policy_arn = aws_iam_policy.get-applications-for-policy.arn
}

resource "aws_lambda_permission" "get-applications-for-apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get-applications-for.arn
  principal     = "apigateway.amazonaws.com"

  # The /*/* portion grants access from any method on any resource
  # within the API Gateway "REST API".
  source_arn = "${aws_api_gateway_rest_api.applications-api.execution_arn}/*/*"
}
