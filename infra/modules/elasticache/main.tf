variable "name_prefix" { type = string }
variable "subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }
variable "node_type" { type = string, default = "cache.t4g.micro" }
variable "enabled" { type = bool, default = true }
variable "tags" { type = map(string) }

resource "aws_security_group" "redis" {
  count  = var.enabled ? 1 : 0
  name   = "${var.name_prefix}-redis-sg"
  vpc_id = var.vpc_id
  ingress {
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  tags = var.tags
}

resource "aws_elasticache_subnet_group" "this" {
  count      = var.enabled ? 1 : 0
  name       = "${var.name_prefix}-redis-subnets"
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_cluster" "this" {
  count                = var.enabled ? 1 : 0
  cluster_id           = "${var.name_prefix}-redis"
  engine               = "redis"
  node_type            = var.node_type
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  subnet_group_name    = aws_elasticache_subnet_group.this[0].name
  security_group_ids   = [aws_security_group.redis[0].id]
  tags                 = var.tags
}

output "redis_endpoint" {
  value = var.enabled ? aws_elasticache_cluster.this[0].cache_nodes[0].address : null
}
