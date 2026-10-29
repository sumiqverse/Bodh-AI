# BodhAI Cryptographic Key & Secret Rotation Runbook

## Overview

Regular rotation of cryptographic secrets and external API credentials is required for compliance with ISO/IEC 27001 and DPDP Act 2023 guidelines. This runbook details zero-downtime rotation procedures for:

1. Application Session & JWT Secret Keys (`SECRET_KEY`)
2. Database Master & Application Credentials (`DATABASE_URL`)
3. Supabase External JWT Secrets (`SUPABASE_JWT_SECRET`)
4. AI Tutor LLM API Keys (`OPENAI_API_KEY`)

---

## 1. Rotating Application `SECRET_KEY` (Dual-Key Verification)

The `SECRET_KEY` signs user sessions and authentication tokens. To rotate without invalidating active school classroom sessions:

### Step 1: Generate High-Entropy New Secret Key

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

### Step 2: Deploy Dual-Verification Secret

Configure `SECRET_KEY` to the new secret and `FALLBACK_SECRET_KEYS` to the old secret. The authentication verifier attempts decryption with the new primary key first, falling back to previous keys for tokens issued before rotation.

### Step 3: Deprecate Old Secret (7 Days Later)

After `REFRESH_TOKEN_EXPIRE_DAYS` (7 days) elapsed and all active client tokens refreshed:
Remove the old key from `FALLBACK_SECRET_KEYS`.

---

## 2. Rotating PostgreSQL Database Credentials

Supabase and Cloud SQL allow zero-downtime credential rotation via dual role provisioning:

### Step 1: Provision Secondary Database Role

```sql
-- Connect via administrator connection
CREATE ROLE bodhai_app_v2 WITH LOGIN PASSWORD 'NEW_STRONG_SECURE_PASSWORD_123!';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO bodhai_app_v2;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO bodhai_app_v2;
```

### Step 2: Update Cloud Secret Manager

Update Secret Manager secret `bodhai-database-url` with `bodhai_app_v2` connection string.

### Step 3: Trigger Rolling Deployment

Trigger a Cloud Run revision deployment. New container instances connect using `bodhai_app_v2`.

### Step 4: Revoke Legacy Database Role

```sql
REVOKE CONNECT ON DATABASE bodhai_prod FROM bodhai_app_v1;
DROP ROLE bodhai_app_v1;
```

---

## 3. Rotating OpenAI / LLM API Key

1. Log into OpenAI API Platform -> API Keys -> Create new Secret Key (`sk-proj-...`).
2. Update GCP Secret Manager:
   ```bash
   echo -n "sk-proj-NEW_KEY_HERE" | gcloud secrets versions add bodhai-openai-api-key --data-file=-
   ```
3. Update Cloud Run environment configuration:
   ```bash
   gcloud run services update bodhai-api --region asia-south1
   ```
4. Test AI Tutor chat endpoint:
   ```bash
   curl -X POST https://api.bodhai.org/api/v1/tutor/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "Test ping", "context_id": "test"}'
   ```
5. Revoke the old OpenAI API key in the OpenAI developer console.
