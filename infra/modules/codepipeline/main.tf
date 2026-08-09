variable "name_prefix" { type = string }
variable "repository_name" { type = string }
variable "branch" { type = string, default = "main" }
variable "codestar_connection_arn" { type = string }
variable "compute_type" { type = string, default = "BUILD_GENERAL1_SMALL" }
variable "tags" { type = map(string) }

resource "aws_codebuild_project" "build" {
  name         = "${var.name_prefix}-build"
  service_role = aws_iam_role.codebuild.arn
  artifacts { type = "CODEPIPELINE" }
  environment {
    compute_type                = var.compute_type
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    privileged_mode             = true
  }
  source {
    type      = "CODEPIPELINE"
    buildspec = "infra/buildspec.yml"
  }
  tags = var.tags
}

resource "aws_iam_role" "codebuild" {
  name = "${var.name_prefix}-codebuild"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = var.tags
}

resource "aws_codepipeline" "this" {
  name     = "${var.name_prefix}-pipeline"
  role_arn = aws_iam_role.codepipeline.arn
  artifact_store {
    location = aws_s3_bucket.artifacts.bucket
    type     = "S3"
  }
  stage {
    name = "Source"
    action {
      name             = "GitHub"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source"]
      configuration = {
        ConnectionArn    = var.codestar_connection_arn
        FullRepositoryId = var.repository_name
        BranchName       = var.branch
      }
    }
  }
  stage {
    name = "Build"
    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      input_artifacts  = ["source"]
      output_artifacts = ["build"]
      version          = "1"
      configuration    = { ProjectName = aws_codebuild_project.build.name }
    }
  }
  tags = var.tags
}

resource "aws_s3_bucket" "artifacts" {
  bucket = "${var.name_prefix}-pipeline-artifacts"
  tags   = var.tags
}

resource "aws_iam_role" "codepipeline" {
  name = "${var.name_prefix}-codepipeline"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
  tags = var.tags
}

output "pipeline_name" { value = aws_codepipeline.this.name }
