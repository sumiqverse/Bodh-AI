# BodhAI Observability: Dashboards, Alerts, and SLOs

## 1. Service Level Objectives (SLOs) & Targets

| Objective                    | Target                      | Measurement Method                                     | Alert Threshold (Burn Rate)      |
| :--------------------------- | :-------------------------- | :----------------------------------------------------- | :------------------------------- |
| **Availability**             | **99.5%** monthly           | Synthetic probes (`/health`) & non-5xx HTTP responses  | Error rate > 1.0% over 5m window |
| **API Latency**              | **p95 < 300 ms**            | Server-side execution duration (`X-Response-Time-MS`)  | p95 > 300 ms over 10m window     |
| **PWA Core Web Vitals**      | **LCP < 2.5s, INP < 200ms** | Chrome UX Report (CrUX) and Real User Monitoring (RUM) | 75th percentile LCP > 2.5s       |
| **Offline Sync Reliability** | **99.9%** completion        | Client outbox batch commitment success                 | Sync failure rate > 5.0%         |

---

## 2. Production Dashboards Specification

### A. Latency & Throughput Dashboard

- **Panel 1: Request Latency Percentiles (p50, p95, p99)**
  - _Query_: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))`
  - _Target Line_: 300 ms (SLO ceiling).
  - _Breakdown_: Global vs. `/api/v1/adaptive/next`, `/api/v1/sync/attempts`, `/api/v1/tutor/chat`.
- **Panel 2: Request Throughput (RPS)**
  - _Query_: `sum(rate(http_requests_total[1m])) by (method, status_code)`
  - _Visualization_: Stacked area chart partitioned by 2xx, 3xx, 4xx, 5xx.
- **Panel 3: Database Query Duration**
  - _Query_: `rate(sqlalchemy_query_duration_seconds_sum[5m]) / rate(sqlalchemy_query_duration_seconds_count[5m])`

### B. Error & Incident Dashboard

- **Panel 1: HTTP Error Rate (%)**
  - _Query_: `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100`
  - _Alert Line_: Red trigger at 1.0%.
- **Panel 2: Client-side Crash & Error Rate**
  - Ingested via Sentry Browser SDK (PII-scrubbed).
  - Categorized by device type (Desktop vs. Low-End Android Phone).
- **Panel 3: Top Unhandled Exception Signatures**
  - Ranked table of Sentry issue groups with stack traces and affected user counts.

### C. Offline Sync & Queue Backlog Dashboard

- **Panel 1: Offline Attempt Sync Failure Rate**
  - _Query_: `sum(rate(sync_failures_total[5m])) / sum(rate(sync_attempts_total[5m])) * 100`
- **Panel 2: Unprocessed Outbox Queue Backlog**
  - _Query_: `redis_list_length{key="sync:outbox:pending"}`
  - _Alert Threshold_: > 5,000 pending items.
- **Panel 3: Conflict Resolution Distribution**
  - Breakdown: `client_wins`, `server_wins`, `merged_attempts`.

### D. LLM Cost & Usage Dashboard

- **Panel 1: Cumulative Monthly LLM Spend (USD)**
  - _Query_: `sum(llm_cost_usd_total)`
  - _Budget Line_: $100.00 / month soft quota limit.
- **Panel 2: Token Ingestion & Completion Volume**
  - Prompt tokens vs. Completion tokens per hour.
- **Panel 3: AI Tutor Circuit Breaker Status**
  - State indicator: `CLOSED` (Normal), `HALF_OPEN` (Testing), `OPEN` (Fallback engaged).

---

## 3. Alerting Rules & Escalation Tiers

### P1 - Critical (Page On-Call Immediately)

- **High Error Rate**: Error rate > 1.0% for 5 consecutive minutes.
- **Endpoint Blackout**: API `/health` or Web `/api/health` probes fail 3 consecutive attempts.
- **Sync Deadlock**: Outbox queue backlog exceeds 10,000 attempts with zero drains in 15 minutes.
- **Channel**: PagerDuty / Telegram Critical Bot / SMS.

### P2 - Warning (Investigate Within Business Hours)

- **Degraded Latency**: p95 response time > 300 ms for 10 minutes.
- **Elevated LLM Spend**: Month-to-date LLM expenditure exceeds 80% before Day 20 of billing cycle.
- **High Cache Miss Rate**: Redis cache hit ratio drops below 70%.
- **Channel**: Slack `#alerts-ops` / Email digest.

---

## 4. Synthetic Uptime Verification Probes

- **Frequency**: Every 60 seconds from 3 geographic regions (Mumbai, Bengaluru, Delhi).
- **API Health Check**: `GET https://api.bodhai.org/health`
  - Asserts HTTP 200, latency < 200 ms, JSON `{"status": "ok"}`.
- **Web Health Check**: `GET https://bodhai.org/api/health`
  - Asserts HTTP 200, latency < 150 ms, JSON `{"status": "healthy"}`.
- **Maintenance Bypass**: Header `X-BodhAI-Bypass-Maintenance: <secret>` verifies origin during maintenance windows.
