terraform {
  required_version = ">= 1.7.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Service Account for Cloud Run API execution with minimal privilege
resource "google_service_account" "api_runner" {
  account_id   = "bodhai-api-${var.environment}"
  display_name = "BodhAI API Service Account (${var.environment})"
}

# Cloud Run v2 Service for BodhAI API
resource "google_cloud_run_v2_service" "api_service" {
  name     = "bodhai-api-${var.environment}"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.api_runner.email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = var.api_image

      resources {
        limits = {
          cpu    = "2000m"
          memory = "2Gi"
        }
      }

      ports {
        container_port = 8000
      }

      env {
        name  = "APP_ENV"
        value = var.environment
      }
      env {
        name  = "DEBUG"
        value = "false"
      }
      env {
        name  = "PORT"
        value = "8000"
      }

      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = var.database_url_secret_name
            version = "latest"
          }
        }
      }

      env {
        name = "SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = var.secret_key_secret_name
            version = "latest"
          }
        }
      }

      startup_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
          port = 8000
        }
        period_seconds    = 15
        failure_threshold = 3
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Allow public unauthenticated invocations through Cloud Armor / API Gateway
resource "google_cloud_run_service_iam_member" "public_invoker" {
  location = google_cloud_run_v2_service.api_service.location
  service  = google_cloud_run_v2_service.api_service.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
