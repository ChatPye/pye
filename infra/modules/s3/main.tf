variable "name_prefix" { type = string }
variable "tags" { type = map(string) }
variable "enable_lifecycle" { type = bool, default = true }

resource "aws_s3_bucket" "assets" {
  bucket = "${var.name_prefix}-assets"
  tags   = var.tags
}

resource "aws_s3_bucket_server_side_encryption_configuration" "assets" {
  bucket = aws_s3_bucket.assets.id
  rule {
    apply_server_side_encryption_by_default { sse_algorithm = "aws:kms" }
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  bucket                  = aws_s3_bucket.assets.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "assets" {
  count  = var.enable_lifecycle ? 1 : 0
  bucket = aws_s3_bucket.assets.id
  rule {
    id     = "transition-ia"
    status = "Enabled"
    transition { days = 90, storage_class = "STANDARD_IA" }
  }
}

output "bucket_name" { value = aws_s3_bucket.assets.id }
