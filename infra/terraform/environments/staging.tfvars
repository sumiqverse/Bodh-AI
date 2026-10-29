project_id               = "bodhai-staging"
region                   = "asia-south1"
environment              = "staging"
api_image                = "asia-south1-docker.pkg.dev/bodhai-staging/containers/bodhai-api:latest"
min_instances            = 0
max_instances            = 2
database_url_secret_name = "bodhai-staging-database-url"
secret_key_secret_name   = "bodhai-staging-secret-key"
