output "api_service_url" {
  description = "Public URL of the deployed BodhAI API Cloud Run service"
  value       = google_cloud_run_v2_service.api_service.uri
}

output "service_account_email" {
  description = "IAM Service Account email executing the container"
  value       = google_service_account.api_runner.email
}
