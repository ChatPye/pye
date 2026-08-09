variable "name_prefix" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }
variable "tags" { type = map(string) }
variable "desired_count" { type = number, default = 1 }
variable "scale_to_zero" { type = bool, default = false }

resource "aws_ecs_cluster" "this" {
  name = "${var.name_prefix}-cluster"
  tags = var.tags
}

resource "aws_security_group" "services" {
  name   = "${var.name_prefix}-ecs-sg"
  vpc_id = var.vpc_id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = var.tags
}

# Task definitions and services are wired by CodePipeline deploy stage.
output "cluster_name" { value = aws_ecs_cluster.this.name }
output "cluster_arn" { value = aws_ecs_cluster.this.arn }
output "service_security_group_id" { value = aws_security_group.services.id }
