variable "name_prefix" { type = string }
variable "tags" { type = map(string) }

resource "aws_cloudwatch_dashboard" "ops" {
  dashboard_name = "${var.name_prefix}-ops"
  dashboard_body = jsonencode({
    widgets = [{
      type   = "text"
      x      = 0
      y      = 0
      width  = 24
      height = 2
      properties = { markdown = "# ChatPye ${var.name_prefix} — wire ECS/SQS/RDS metrics in deploy" }
    }]
  })
}

resource "aws_cloudwatch_metric_alarm" "sqs_age" {
  alarm_name          = "${var.name_prefix}-sqs-age"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ApproximateAgeOfOldestMessage"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Maximum"
  threshold           = 900
  alarm_description   = "Job queue backing up"
  tags                = var.tags
}
