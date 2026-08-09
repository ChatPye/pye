variable "name_prefix" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "enable_public" { type = bool, default = false }
variable "tags" { type = map(string) }

resource "aws_security_group" "alb" {
  count  = var.enable_public ? 1 : 0
  name   = "${var.name_prefix}-alb-sg"
  vpc_id = var.vpc_id
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = var.tags
}

resource "aws_lb" "this" {
  count              = var.enable_public ? 1 : 0
  name               = "${var.name_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb[0].id]
  subnets            = var.public_subnet_ids
  tags               = var.tags
}

output "alb_arn" { value = try(aws_lb.this[0].arn, null) }
output "alb_dns_name" { value = try(aws_lb.this[0].dns_name, null) }
