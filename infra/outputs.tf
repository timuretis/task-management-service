output "public_ip" {
  description = "The instance's fixed public address."
  value       = aws_eip.app.public_ip
}

output "dns_records" {
  description = "A records to add by hand at the DNS host (D28)."
  value = {
    (var.web_domain) = aws_eip.app.public_ip
    (var.api_domain) = aws_eip.app.public_ip
  }
}

output "instance_id" {
  description = "Instance ID, for the console and for SSM."
  value       = aws_instance.app.id
}

output "ssh_command" {
  description = "Log in, or add -L 5432:127.0.0.1:5432 -N to tunnel to Postgres (D32)."
  value       = "ssh ec2-user@${aws_eip.app.public_ip}"
}

output "log_group" {
  description = "CloudWatch log group with the container logs."
  value       = aws_cloudwatch_log_group.app.name
}
