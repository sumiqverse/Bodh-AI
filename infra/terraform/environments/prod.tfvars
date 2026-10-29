project_id               = "bodhai-prod"
region                   = "asia-south1"
environment              = "production"
api_image                = "asia-south1-docker.pkg.dev/bodhai-prod/containers/bodhai-api:v1.0.0"
min_instances            = 1
max_instances            = 10
database_url_secret_name = "bodhai-prod-database-url"
secret_key_secret_name   = "bodhai-prod-secret-key"
