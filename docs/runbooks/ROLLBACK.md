# BodhAI Deployment & Database Rollback Runbook

## Overview

When a production or staging release introduces regressions, high error rates ($> 1\%$), or latency violations ($p95 > 300\text{ ms}$), follow this runbook to safely roll back services to the last known stable release within $\le 5$ minutes.

---

## 1. Web Application Rollback (Vercel / Container)

### Option A: Vercel Instant Rollback (Preferred for Web)

1. Navigate to Vercel Dashboard -> BodhAI Project -> Deployments.
2. Select the previous stable deployment tagged with the prior SemVer release.
3. Click **"Instant Rollback"** or execute via CLI:
   ```bash
   npx vercel rollback <deployment-id-or-url> --token $VERCEL_TOKEN
   ```
4. Verify edge routing:
   ```bash
   curl -I https://bodhai.org/api/health
   ```

### Option B: Cloud Run Standalone Web Container

```bash
# List previous revisions
gcloud run revisions list --service bodhai-web --region asia-south1 --limit 5

# Route 100% traffic back to previous stable revision
gcloud run services update-traffic bodhai-web \
  --to-revisions=bodhai-web-PREVIOUS_REVISION=100 \
  --region asia-south1
```

---

## 2. API Backend Rollback (Google Cloud Run)

To revert the Python FastAPI container without redeploying:

```bash
# 1. Inspect recent revisions
gcloud run revisions list --service bodhai-api --region asia-south1 --limit 5

# 2. Re-route 100% traffic to previous healthy revision
gcloud run services update-traffic bodhai-api \
  --to-revisions=bodhai-api-PREVIOUS_REVISION=100 \
  --region asia-south1

# 3. Verify health status
curl -f https://api.bodhai.org/health
```

---

## 3. Database Schema Rollback

Because BodhAI follows the **Expand-Contract** migration pattern (`docs/migrations/MIGRATION_STRATEGY.md`), the previous application version is fully compatible with the expanded database schema. **In 95% of incidents, database rollback is NOT necessary during code rollback.**

If an erroneous migration script itself caused locking or failure:

```bash
# 1. Connect to deployment environment shell / bastion
cd apps/api

# 2. Check current Alembic revision
uv run alembic current

# 3. Revert exactly one migration revision
uv run alembic downgrade -1

# 4. Check database schema integrity
uv run alembic heads
```

---

## 4. Post-Rollback Verification Checklist

- [ ] Web health check returns HTTP 200: `https://bodhai.org/api/health`
- [ ] API health check returns HTTP 200: `https://api.bodhai.org/health`
- [ ] Sentry error rate drops to $< 0.1\%$ in real-time stream.
- [ ] Attempt submission endpoint `/api/v1/adaptive/attempt` succeeds with $< 200\text{ ms}$ latency.
- [ ] Notify team in `#deployments` Slack channel with rollback revision ID and rationale.
