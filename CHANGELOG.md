# Changelog

All notable changes to the BodhAI platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned

- Audio narration for visual-impaired and bilingual spoken hints.
- Federated multi-school diagnostic benchmarks.

---

## [1.0.0] - 2026-10-27

### Added

- **Production & Pilot Readiness Release**:
  - Multi-stage non-root Dockerfiles for API (Python 3.12 slim, uv venv) and Web (Node 22 alpine, Next.js standalone output) with container health checks.
  - Development, staging, and production environment templates (`.env.development`, `.env.staging`, `.env.production`) with strict secret validation.
  - GitHub Actions Continuous Delivery (`cd.yml`) with automated staging rollout and manual release tag approvals for production.
  - End-to-End browser test suite across Chromium, Firefox, and WebKit using Playwright.
  - Zero-downtime expand-contract migration architecture (`docs/migrations/MIGRATION_STRATEGY.md`) and verified disaster recovery restore drill (`docs/runbooks/RESTORE_DRILL.md`).
  - Infrastructure as Code blueprints in `infra/terraform/` for Google Cloud Run, Secret Manager, and IAM service accounts.
  - Architectural Decision Record (`docs/ADR/0002-production-infrastructure-targets.md`) analyzing Web on Vercel/containers, API on Cloud Run, Supabase PostgreSQL, and Upstash Redis.
  - Observability system: Sentry integration with client/server PII scrubbing, OpenTelemetry metrics registry, structured logging with `structlog`, and SLO definitions (99.5% availability, p95 < 300 ms).
  - Production operations suite: automated backup/restore scripts, typed feature flags (`aiTutor`, `offlineMode`, `demoMode`, `feedbackForm`), accessible maintenance mode page with middleware gating, and runbooks for incident response, rollbacks, key rotations, and LLM outages.
  - Pilot readiness: Privacy-preserving client analytics (zero PII), evaluation dashboard computing ROC-AUC and Expected Calibration Error (ECE) for next-response prediction, in-app feedback modal, judge demo mode with synthetic data, teacher quick-start guides in English and Hindi, and comprehensive root README.

### Changed

- Elevated automated test coverage gates ($\ge 85\%$ API, 80% Web).
- Strict CSP headers eliminating `unsafe-inline` via cryptographically secure per-request nonce.

### Security

- DPDP Act 2023 compliance with automated retention pruning and consent version enforcement.
- OWASP ASVS Level 2 verification with STRIDE threat model.

---

## [0.1.0] - 2026-10-25

### Added

- Initial monorepo scaffolding using Turborepo and pnpm workspaces.
- FastAPI backend with initial student attempt tracking and adaptive assessment engine.
- Next.js 15 App Router web client with bilingual support (English and Hindi).
