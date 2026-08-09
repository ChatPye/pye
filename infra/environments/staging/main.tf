terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "chatpye-terraform-state-staging"
    key            = "staging/terraform.tfstate"
    region         = "eu-west-2"
    encrypt        = true
    dynamodb_table = "chatpye-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = local.default_tags
  }
}

variable "aws_region" { type = string, default = "eu-west-2" }
variable "codestar_connection_arn" { type = string }

locals {
  name_prefix  = "chatpye-staging"
  default_tags = {
    Application         = "ChatPye"
    Environment         = "staging"
    Owner               = "platform-team"
    CostCentre          = "engineering"
    DataClassification  = "confidential"
    ManagedBy           = "Terraform"
  }
}

module "vpc" {
  source            = "../../modules/vpc"
  name_prefix       = local.name_prefix
  vpc_cidr          = "10.20.0.0/16"
  nat_gateway_count = 1
  tags              = local.default_tags
}

module "kms" {
  source      = "../../modules/kms"
  name_prefix = local.name_prefix
  tags        = local.default_tags
}

module "ecr" {
  source      = "../../modules/ecr"
  name_prefix = local.name_prefix
  tags        = local.default_tags
}

module "s3" {
  source      = "../../modules/s3"
  name_prefix = local.name_prefix
  tags        = local.default_tags
}

module "sqs" {
  source      = "../../modules/sqs"
  name_prefix = local.name_prefix
  tags        = local.default_tags
}

module "ecs" {
  source             = "../../modules/ecs"
  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  scale_to_zero      = true
  desired_count      = 0
  tags               = local.default_tags
}

module "rds" {
  source                     = "../../modules/rds"
  name_prefix                = local.name_prefix
  vpc_id                     = module.vpc.vpc_id
  subnet_ids                 = module.vpc.private_subnet_ids
  instance_class             = "db.t4g.micro"
  allowed_security_group_ids = [module.ecs.service_security_group_id]
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${local.name_prefix}-final"
  tags                       = local.default_tags
}

module "secrets" {
  source      = "../../modules/secrets"
  name_prefix = local.name_prefix
  kms_key_arn = module.kms.key_arn
  tags        = local.default_tags
}

module "cloudwatch" {
  source      = "../../modules/cloudwatch"
  name_prefix = local.name_prefix
  tags        = local.default_tags
}

module "codepipeline" {
  source                  = "../../modules/codepipeline"
  name_prefix             = local.name_prefix
  repository_name         = "ChatPye/pye"
  branch                  = "main"
  codestar_connection_arn = var.codestar_connection_arn
  tags                    = local.default_tags
}

# Staging: no public ALB/WAF — internal access only
module "alb" {
  source            = "../../modules/alb"
  name_prefix       = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  enable_public     = false
  tags              = local.default_tags
}

output "rds_endpoint" { value = module.rds.endpoint }
output "sqs_queue_url" { value = module.sqs.queue_url }
output "ecr_web" { value = module.ecr.web_repository_url }
