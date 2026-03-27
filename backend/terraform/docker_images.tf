locals {
  lambda_platform = var.lambda_architecture == "x86_64" ? "linux/amd64" : "linux/arm64"

  services = {
    users_create = {
      function_name = "${var.project_name}-users-create"
      source_path   = "${path.root}/../services/users-create"
    }
    users_get = {
      function_name = "${var.project_name}-users-get"
      source_path   = "${path.root}/../services/users-get"
    }
    users_patch = {
      function_name = "${var.project_name}-users-patch"
      source_path   = "${path.root}/../services/users-patch"
    }
    families_create = {
      function_name = "${var.project_name}-families-create"
      source_path   = "${path.root}/../services/families-create"
    }
    families_join = {
      function_name = "${var.project_name}-families-join"
      source_path   = "${path.root}/../services/families-join"
    }
    families_add_member = {
      function_name = "${var.project_name}-families-add-member"
      source_path   = "${path.root}/../services/families-add-member"
    }
    families_scan_events = {
      function_name = "${var.project_name}-families-scan-events"
      source_path   = "${path.root}/../services/families-scan-events"
    }
    analysis = {
      function_name = "${var.project_name}-analysis"
      source_path   = "${path.root}/../services/analysis"
    }
    user_event = {
      function_name = "${var.project_name}-user-event"
      source_path   = "${path.root}/../services/user-event"
    }
    families_feed = {
      function_name = "${var.project_name}-families-feed"
      source_path   = "${path.root}/../services/families-feed"
    }
    auth_login = {
      function_name = "${var.project_name}-auth-login"
      source_path   = "${path.root}/../services/auth-login"
    }
    scan_events_notify_status = {
      function_name = "${var.project_name}-scan-events-notify-status"
      source_path   = "${path.root}/../services/scan-events-notify-status"
    }
    uploads_presign = {
      function_name = "${var.project_name}-uploads-presign"
      source_path   = "${path.root}/../services/uploads-presign"
    }
  }

  service_dir_sha = {
    for k, v in local.services :
    k => sha256(join("", [for f in fileset(v.source_path, "**") : filesha256("${v.source_path}/${f}")]))
  }
}

module "docker_image" {
  source  = "terraform-aws-modules/lambda/aws//modules/docker-build"
  version = "7.7.0"

  for_each = local.services

  create_ecr_repo      = true
  keep_remotely        = true
  keep_locally         = true
  use_image_tag        = false
  image_tag_mutability = "MUTABLE"

  ecr_repo    = each.value.function_name
  source_path = each.value.source_path
  platform    = local.lambda_platform

  triggers = {
    dir_sha = local.service_dir_sha[each.key]
  }
}
