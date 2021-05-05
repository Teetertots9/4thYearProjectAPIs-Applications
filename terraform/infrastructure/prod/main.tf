#
# Configure the S3 backend, which needs to be set up separately
#
terraform {
  backend "s3" {
    region     = "eu-west-1"
    bucket         = "seobooker.tf-prod-infra-state"
    key            = "api/applications-api/terraform.tfstate"
    dynamodb_table = "seobooker_prod_infra"
  }
}



# Configure the AWS Provider
provider "aws" {
  region     = var.region
}

#
# Set up the api resources
#
module api {
  source = "../../modules/api"
  region = var.region
  stage = var.stage
  prefix = var.prefix
  account_id = var.account_id
  api_name = var.api_name
  table_name =  "${var.prefix}_${var.table_name}_${var.stage}"
  runtime = var.runtime
  
  cognito_user_pool_id = ""
  

}