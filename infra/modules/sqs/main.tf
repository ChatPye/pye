variable "name_prefix" { type = string }
variable "tags" { type = map(string) }

resource "aws_sqs_queue" "dlq" {
  name = "${var.name_prefix}-jobs-dlq"
  tags = var.tags
}

resource "aws_sqs_queue" "jobs" {
  name                       = "${var.name_prefix}-jobs"
  visibility_timeout_seconds = 900
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })
  tags = var.tags
}

output "queue_url" { value = aws_sqs_queue.jobs.url }
output "queue_arn" { value = aws_sqs_queue.jobs.arn }
output "dlq_arn" { value = aws_sqs_queue.dlq.arn }
