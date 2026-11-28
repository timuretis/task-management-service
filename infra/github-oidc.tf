# How GitHub Actions deploys without any stored AWS key (D29).
# GitHub signs a short-lived token for each workflow run; AWS checks it and hands out temporary credentials.

# Tells AWS to trust tokens issued by GitHub. An account can have only one provider per URL,
# so if another project already created it, import it instead (see docs/aws-setup.md).
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_policy_document" "deploy_trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    # Only runs of this repository on its main branch. A pull request or another branch gets no access.
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["${var.github_subject_prefix}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "deploy" {
  name                 = "task-management-service-deploy"
  assume_role_policy   = data.aws_iam_policy_document.deploy_trust.json
  max_session_duration = 3600
}

# The deploy role can run a shell command on our one instance and read the result. Nothing else.
data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "RunCommandOnThisInstanceOnly"
    actions   = ["ssm:SendCommand"]
    resources = [aws_instance.app.arn]
  }

  statement {
    sid       = "UseTheShellDocumentOnly"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ssm:${var.region}::document/AWS-RunShellScript"]
  }

  # AWS does not support narrowing this action to a resource, so it needs "*". It only reads results.
  statement {
    sid       = "ReadCommandResults"
    actions   = ["ssm:GetCommandInvocation"]
    resources = ["*"]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "deploy-through-ssm"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
