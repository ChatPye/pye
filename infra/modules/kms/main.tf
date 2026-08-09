variable "name_prefix" { type = string }
variable "tags" { type = map(string) }

resource "aws_kms_key" "this" {
  description             = "${var.name_prefix} application key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  tags                    = var.tags
}

resource "aws_kms_alias" "this" {
  name          = "alias/${var.name_prefix}"
  target_key_id = aws_kms_key.this.key_id
}

output "key_arn" { value = aws_kms_key.this.arn }
