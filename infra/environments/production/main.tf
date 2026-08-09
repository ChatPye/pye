terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "chatpye-terraform-state-production"
    key            = "production/terraform.tfstate"
    region         = "eu-west-2"
    encrypt        = true
    dynamodb_table = "chatpye-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags { tags = local.default_tags }
}

variable "aws_region" { type = string, default = "eu-west-2" }
variable "codestar_connection_arn" { type = string }

locals {
  name_prefix  = "chatpye-production"
  default_tags = {
    Application         = "ChatPye"
    Environment         = "production"
    Owner               = "platform-team"
    CostCentre          = "engineering"
    DataClassification  = "confidential"
    ManagedBy           = "Terraform"
  }
}

module "vpc" {
  source      = "../../modules/vpc"
  name_prefix = local.name_prefix
  vpc_cidr    = "10.30.0.0/16"
  tags        = local.default_tags
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

module "rds" {
  source      = "../../modules/rds"
  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  instance_class = "db.r6g.large"
  tags        = local.default_tags
}

module "elasticache" {
  source      = "../../modules/elasticache"
  name_prefix = local.name_prefix
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids
  tags        = local.default_tags
}

module "ecs" {
  source             = "../../modules/ecs"
  name_prefix        = local.name_prefix
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  desired_count      = 2
  tags               = local.default_tags
}

module "alb" {
  source            = "../../modules/alb"
  name_prefix       = local.name_prefix
  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  enable_public     = true
  tags              = local.default_tags
}

module "waf" {
  source      = "../../modules/waf"
  name_prefix = local.name_prefix
  alb_arn     = module.alb.alb_arn
  tags        = local.default_tags
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
  repository_name         = "ChatPye/chatpye-web"
  branch                  = "main"
  codestar_connection_arn = var.codestar_connection_arn
  tags                    = local.default_tags
}

output "alb_dns_name" { value = module.alb.alb_dns_name }
