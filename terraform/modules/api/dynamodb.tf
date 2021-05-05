resource "aws_dynamodb_table" "applications_table" {
  name           = var.table_name
  read_capacity  = 1
  write_capacity = 1
  hash_key       = "applicationId"

  attribute {
    name = "applicationId"
    type = "S"
  }

  attribute {
    name = "eventId"
    type = "S"
  }

  global_secondary_index {
    name            = "EventIndex"
    read_capacity   = 1
    write_capacity  = 1
    hash_key        = "eventId"
    projection_type = "ALL"

  }

  tags = {
    Name        = "applications table"
    Environment = var.stage
  }
}
