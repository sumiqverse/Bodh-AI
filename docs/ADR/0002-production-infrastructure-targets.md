# ADR 0002: Production Hosting Targets and Infrastructure Topology

- **Status**: Accepted
- **Date**: 2026-10-27
- **Deciders**: BodhAI Architecture & Platform Team

---

## Context

BodhAI is preparing for production deployment and field pilot operations across Indian secondary schools (Classes 6–10). The platform architecture comprises:

- An accessible Next.js 15 App Router web client (`apps/web`).
- A high-throughput Python 3.12 FastAPI microservice (`apps/api`).
- Relational student attempt tracking, knowledge state graphs, and vector-embedded curriculum chunks.
- Distributed cache, session state, and sliding-window rate limiting.

We need reliable, low-latency, cost-effective infrastructure in India (e.g. `ap-south-1` / Mumbai) that satisfies our SLO targets (99.5% availability, p95 API response time < 300 ms) while minimizing DevOps overhead during the pilot phase.

---

## Evaluated Options & Target Selection

### 1. Web Application (`apps/web`)

- **Options Evaluated**: Vercel vs AWS Amplify vs Containerized (Google Cloud Run / Fly.io / Render).
- **Selected Target**: **Vercel** (Primary) with **Google Cloud Run (Standalone Docker)** (Secondary / Private deployments).
- **Rationale**:
  - Vercel provides native Next.js App Router optimizations, edge caching for localized static content (`/en`, `/hi`), zero-config source map ingestion for Sentry, and automatic preview deployments.
  - For schools or government networks mandating self-hosted containers within sovereign VPCs, our multi-stage standalone Dockerfile (`apps/web/Dockerfile`) packages the complete Node 22 runtime and server tracing within a lightweight 140MB image.

### 2. Backend API (`apps/api`)

- **Options Evaluated**: Google Cloud Run vs Fly.io vs Render.
- **Selected Target**: **Google Cloud Run** (`asia-south1` Mumbai).
- **Rationale**:
  - Fully managed serverless container runtime with sub-second scale-up.
  - Native integration with Google Cloud Armor for DDoS protection and Google Cloud Secret Manager.
  - Scale-to-min-instances=1 to eliminate cold starts for educational sessions, achieving p95 < 250 ms.
  - Health check probes integrate directly with Cloud Run readiness and liveness checks.

### 3. Relational & Vector Database

- **Options Evaluated**: Self-managed PostgreSQL vs AWS RDS vs Supabase Managed Postgres.
- **Selected Target**: **Supabase Managed PostgreSQL 16** (`ap-south-1` Mumbai).
- **Rationale**:
  - Integrated `pgvector` extension natively supported for AI tutor textbook chunk retrieval.
  - Built-in transaction-level connection pooling via PgBouncer / Supavisor, handling thousands of concurrent school device requests.
  - Automated daily backups, point-in-time recovery (PITR), and row-level encryption.
  - Compliance with DPDP Act 2023 requirements when provisioned in Indian cloud regions.

### 4. Cache & Distributed Rate Limiter

- **Options Evaluated**: Self-hosted Redis container vs AWS ElastiCache vs Upstash Serverless Redis / Redis Cloud.
- **Selected Target**: **Upstash Serverless Redis** (or Managed Redis Cloud).
- **Rationale**:
  - Low-overhead serverless pay-per-request pricing ideal for bursting classroom usage during school hours.
  - Sub-15ms latency in Mumbai region.
  - Native TLS encryption (`rediss://`) and token-bucket sliding rate limit script execution.

---

## Infrastructure Topology Diagram

```
+-------------------------------------------------------------+
|                        Client Edge                          |
|         (Low-end Android Phones, Tablets, Desktop Web)       |
+------------------------------+------------------------------+
                               |
               +---------------+---------------+
               |                               |
       Static & UI Routes              Dynamic API Requests
               |                               |
               v                               v
    +--------------------+          +--------------------+
    |  Vercel Edge / CDN |          |  Google Cloud Run  |
    |  (Next.js Web PWA) |          |  (FastAPI Backend) |
    +--------------------+          +---------+----------+
                                              |
                     +------------------------+-----------------------+
                     |                                                |
                     v                                                v
    +----------------------------------+            +----------------------------------+
    |    Supabase Managed Postgres     |            |     Upstash Serverless Redis     |
    |  - PgBouncer Connection Pooler   |            |  - Rate Limiting (Sliding Window)|
    |  - pgvector RAG Embeddings       |            |  - Active Session Metadata       |
    |  - Automated PITR Backups        |            |  - Circuit Breaker State         |
    +----------------------------------+            +----------------------------------+
```

---

## Consequences

### Positive

- Strict separation of compute layers: web edge vs API execution.
- Negligible operational maintenance during pilot phase.
- Seamless horizontal scaling during peak school classroom periods (9 AM – 4 PM IST).
- Direct compliance with Indian data locality regulations.

### Negative / Trade-offs

- Egress network latency between Vercel and Cloud Run: Mitigated by colocation in Mumbai (`bom1` / `asia-south1`).
- Supabase connection limits during massive spikes: Mitigated by PgBouncer session pooling.
