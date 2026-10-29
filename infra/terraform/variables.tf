variable "project_id" {
  description = "GCP / Cloud Project ID"
  type        = string
  default     = "bodhai-prod"
}

variable "region" {
  description = "Primary deployment cloud region"
  type        = string
  default     = "asia-south1"
}

variable "environment" {
  description = "Target deployment environment (staging or production)"
  type        = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be either staging or production."
  }
}

variable "api_image" {
  description = "Docker image repository URL for BodhAI API"
  type        = string
  default     = "asia-south1-docker.pkg.dev/bodhai-prod/containers/bodhai-api:latest"
}

variable "min_instances" {
  description = "Minimum container instances (1 for prod to eliminate cold starts)"
  type        = number
  default     = 1
}

variable "max_instances" {
  description = "Maximum container instances for auto-scaling"
  type        = number
  default     = 10
}

variable "database_url_secret_name" {
  description = "Secret Manager secret ID containing async PostgreSQL connection URI"
  type        = string
  default     = "bodhai-database-url"
}

variable "secret_key_secret_name" {
  description = "Secret Manager secret ID containing application cryptographic secret"
  type        = string
  default     = "bodhai-secret-key"
}
