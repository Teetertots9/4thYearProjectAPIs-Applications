variable "region" {
  default = ""
}
variable "stage" {
  default = "prod"
}

variable "prefix" {
  default = "seobooker"
}

variable "account_id" {
  default = "703387863451"
}

variable "api_name" {
  default = "applications"
}

variable "table_name" {
  default = "applications_table"
}

variable "cognito_user_pool_name" {
  default = "seobooker-user-pool-prod"
}

variable "runtime" {
  default = "nodejs12.x"
}
