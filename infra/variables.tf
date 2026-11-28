variable "region" {
  description = "AWS region. Frankfurt, close to the author (D27)."
  type        = string
  default     = "eu-central-1"
}

variable "instance_type" {
  description = "EC2 size. t3.small (2 GB) runs Postgres, the API, nginx and Caddy."
  type        = string
  default     = "t3.small"
}

variable "ssh_cidr" {
  description = "The only address allowed to open SSH (port 22), as a /32 CIDR, e.g. 203.0.113.7/32."
  type        = string

  validation {
    condition     = can(cidrnetmask(var.ssh_cidr)) && var.ssh_cidr != "0.0.0.0/0"
    error_message = "ssh_cidr must be a valid CIDR block and must not be 0.0.0.0/0 (SSH open to the world)."
  }
}

variable "ssh_public_key" {
  description = "Contents of the public key (the .pub file) that may log in as ec2-user."
  type        = string
}

variable "web_domain" {
  description = "Public name of the web app. Only used to print the DNS records to add."
  type        = string
  default     = "tasks.timur.co.il"
}

variable "api_domain" {
  description = "Public name of the API. Only used to print the DNS records to add."
  type        = string
  default     = "tasks-api.timur.co.il"
}

variable "log_group_name" {
  description = "CloudWatch log group the containers write to. Must match compose.prod.yml (D36)."
  type        = string
  default     = "/task-management-service"
}

variable "github_subject_prefix" {
  description = <<-EOT
    How GitHub names this repository inside its OIDC token (D29). GitHub now puts the numeric owner and repo IDs in
    the name, so renaming or transferring a repo cannot hand its access to someone else. Find yours with:
    gh api repos/OWNER/REPO/actions/oidc/customization/sub --jq .sub_claim_prefix
  EOT
  type        = string
  default     = "repo:timuretis@7100371/task-management-service@1472149549"
}
