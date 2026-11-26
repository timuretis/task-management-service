terraform {
  required_version = ">= 1.9"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region

  # Every resource gets this tag, so the console shows what belongs to the project.
  default_tags {
    tags = {
      Project = "task-management-service"
    }
  }
}
