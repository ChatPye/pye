variable "name_prefix" { type = string }
variable "subnet_ids" { type = list(string) }
variable "vpc_id" { type = string }
variable "instance_class" { type = string, default = "db.t4g.medium" }
variable "allowed_security_group_ids" { type = list(string), default = [] }
variable "skip_final_snapshot" { type = bool, default = false }
variable "deletion_protection" { type = bool, default = false }
variable "final_snapshot_identifier" { type = string, default = null }
variable "tags" { type = map(string) }

resource "aws_security_group" "db" {
  name   = "${var.name_prefix}-rds-sg"
  vpc_id = var.vpc_id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.allowed_security_group_ids
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = var.tags
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-db-subnets"
  subnet_ids = var.subnet_ids
  tags       = var.tags
}

resource "aws_db_instance" "this" {
  identifier                  = "${var.name_prefix}-postgres"
  engine                      = "postgres"
  engine_version              = "16"
  instance_class              = var.instance_class
  allocated_storage           = 50
  storage_encrypted           = true
  db_subnet_group_name        = aws_db_subnet_group.this.name
  vpc_security_group_ids      = [aws_security_group.db.id]
  username                    = "chatpye"
  manage_master_user_password = true
  skip_final_snapshot         = var.skip_final_snapshot
  final_snapshot_identifier   = var.final_snapshot_identifier
  deletion_protection         = var.deletion_protection
  backup_retention_period     = 7
  publicly_accessible         = false
  tags                        = var.tags
}

output "endpoint" { value = aws_db_instance.this.address }
output "port" { value = aws_db_instance.this.port }
