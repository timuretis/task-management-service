# One EC2 instance runs the whole stack with Docker Compose (D27). Everything it needs is below.

# The default VPC and its subnets exist in every account; using them keeps the network out of this file.
data "aws_vpc" "default" {
  default = true
}

# Latest Amazon Linux 2023, looked up by AWS's public parameter. Only the first `apply` uses it:
# the instance ignores later AMI changes (see ignore_changes), so a new AMI never replaces it.
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

# --- Network access (D35) ---

resource "aws_security_group" "app" {
  name        = "task-management-service"
  description = "SSH from the author, HTTP and HTTPS from everywhere"
  vpc_id      = data.aws_vpc.default.id
}

resource "aws_vpc_security_group_ingress_rule" "ssh" {
  security_group_id = aws_security_group.app.id
  description       = "SSH from the author only"
  cidr_ipv4         = var.ssh_cidr
  ip_protocol       = "tcp"
  from_port         = 22
  to_port           = 22
}

# Port 80 is only used by Caddy to get certificates and to redirect to HTTPS.
resource "aws_vpc_security_group_ingress_rule" "http" {
  security_group_id = aws_security_group.app.id
  description       = "HTTP, redirected to HTTPS by Caddy"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "https" {
  security_group_id = aws_security_group.app.id
  description       = "HTTPS"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

# The instance must reach Docker Hub, GHCR, GitHub, Let's Encrypt and AWS APIs.
resource "aws_vpc_security_group_egress_rule" "all" {
  security_group_id = aws_security_group.app.id
  description       = "All outbound traffic"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_key_pair" "author" {
  key_name   = "task-management-service"
  public_key = var.ssh_public_key
}

# --- Permissions of the instance itself (D29, D35, D36) ---

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "instance" {
  name               = "task-management-service-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

# Lets the SSM agent on the instance receive Run Command from CI.
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Lets Docker's awslogs driver write to our log group and nowhere else.
# The driver only creates streams and puts events; the group is created below.
data "aws_iam_policy_document" "logs" {
  statement {
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.app.arn}:*"]
  }
}

resource "aws_iam_role_policy" "logs" {
  name   = "write-container-logs"
  role   = aws_iam_role.instance.id
  policy = data.aws_iam_policy_document.logs.json
}

resource "aws_iam_instance_profile" "instance" {
  name = "task-management-service-instance"
  role = aws_iam_role.instance.name
}

resource "aws_cloudwatch_log_group" "app" {
  name              = var.log_group_name
  retention_in_days = 14
}

# --- The instance ---

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.al2023.value
  instance_type          = var.instance_type
  key_name               = aws_key_pair.author.key_name
  vpc_security_group_ids = [aws_security_group.app.id]
  iam_instance_profile   = aws_iam_instance_profile.instance.name

  # IMDSv2 only, one network hop: a container (one hop further away) cannot read the
  # instance role's credentials from the metadata service (D35).
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  # Postgres data lives on this disk (D27), so it is encrypted.
  root_block_device {
    encrypted   = true
    volume_type = "gp3"
    volume_size = 20
  }

  tags = {
    Name = "task-management-service"
  }

  # The instance holds the database, so a newer AMI or an edited startup script must never replace it.
  # To really rebuild it, the author removes this on purpose and accepts the data loss.
  lifecycle {
    ignore_changes = [ami, user_data]
  }
}

# A fixed public address, so the two DNS records survive a stop and start of the instance.
resource "aws_eip" "app" {
  domain   = "vpc"
  instance = aws_instance.app.id
}
