variable "name_prefix" { type = string }
variable "kms_key_arn" { type = string }
variable "tags" { type = map(string) }

resource "aws_secretsmanager_secret" "app" {
  name       = "${var.name_prefix}/app"
  kms_key_id = var.kms_key_arn
  tags       = var.tags
}

output "app_secret_arn" { value = aws_secretsmanager_secret.app.arn }
