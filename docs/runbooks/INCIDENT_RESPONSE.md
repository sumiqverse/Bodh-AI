# BodhAI Incident Response & Operational Runbook

## 1. Severity Classification Matrix

| Level                | Definition                                                                                                                   | Impact                                               | Response Time (SLA)         | Primary Notification                                 |
| :------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- | :-------------------------- | :--------------------------------------------------- |
| **SEV-1 (Critical)** | Core platform blackout, data corruption, database unreachable, or student authentication failure affecting $> 5\%$ of users. | Platform offline; active classrooms blocked.         | **$\le 15$ minutes** (24/7) | PagerDuty + Emergency Phone Call + Incident War Room |
| **SEV-2 (High)**     | Degradation of key subsystems (AI tutor outage, offline sync queue backlog $> 5,000$, latency p95 $> 500$ ms).               | Feature degraded; learning continues with fallbacks. | **$\le 60$ minutes**        | Slack `#alerts-urgent` + Tech Lead ping              |
| **SEV-3 (Moderate)** | Non-blocking bugs, single-school localized connectivity issue, UI glitch on unsupported browser.                             | Minor inconvenience; workarounds available.          | Next business day           | Jira / GitHub Issue                                  |

---

## 2. Incident Commander (IC) Workflow

### Phase 1: Triage & Containment (Minutes 0–15)

1. **Assign Incident Commander**: First responding engineer assumes IC role and opens a dedicated war room channel (`#inc-YYYYMMDD-<name>`).
2. **Assess Severity**: Check `/health`, Sentry error rates, and live telemetry dashboards.
3. **Engage Degraded Mode**: If database or backend is saturated, enable Maintenance Mode or rate limit throttling:
   ```bash
   # Enable maintenance mode via Cloud Run / Vercel env variable
   gcloud run services update bodhai-api --update-env-vars MAINTENANCE_MODE=true
   ```

### Phase 2: Diagnosis & Mitigation (Minutes 15–45)

1. **Examine Recent Deployments**:
   Check if the incident was precipitated by a recent release tag or database migration.
   ```bash
   git log -n 5 --oneline
   ```
2. **Execute Rollback**: If regression was caused by recent code release, initiate immediate rollback per `docs/runbooks/ROLLBACK.md`.
3. **Database Concurrency Check**:
   Query active PostgreSQL connections:
   ```sql
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   ```
4. **Isolate AI Tutor Failures**: If LLM provider is timing out, engage circuit breaker per `docs/runbooks/LLM_OUTAGE.md`.

### Phase 3: Resolution & Verification

1. Run synthetic verification probes:
   ```bash
   curl -f https://api.bodhai.org/health
   curl -f https://bodhai.org/api/health
   ```
2. Confirm error rate drops below 0.1% and p95 latency returns below 300 ms on dashboard.
3. Stand down incident war room.

### Phase 4: Blameless Post-Mortem (Within 48 Hours)

- Draft post-mortem in `docs/incidents/postmortems/YYYY-MM-DD-incident.md`.
- Capture timeline, root cause (5 Whys), affected student count, and corrective action items with owners.

---

## 3. Communication Templates

### Broadcast to School Administrators & Teachers (English)

> **Subject**: [Resolved/Update] BodhAI Platform Incident Notification  
> Dear School Administrators and Teachers,  
> At [Time IST], BodhAI experienced a service disruption impacting [Component: e.g., Diagnostic Quizzes / AI Tutor].  
> Our engineering team responded immediately and [mitigated the issue / restored service].  
> All offline completed attempts stored on student devices will synchronize automatically as connections normalize. No learning data was lost.  
> We apologize for any classroom inconvenience caused.

### Broadcast to School Administrators & Teachers (Hindi)

> **विषय**: [समाधान/अपडेट] बोधएआई (BodhAI) प्लेटफ़ॉर्म सेवा सूचना  
> प्रिय विद्यालय व्यवस्थापक एवं शिक्षकगण,  
> आज [समय IST] पर, बोधएआई प्लेटफ़ॉर्म में [घटक: जैसे नैदानिक मूल्यांकन / एआई ट्यूटर] पर अस्थायी तकनीकी बाधा आई थी।  
> हमारी इंजीनियरिंग टीम ने त्वरित कार्रवाई करते हुए [समस्या का समाधान कर दिया है / सेवा बहाल कर दी है]।  
> छात्र उपकरणों में सुरक्षित सभी ऑफलाइन उत्तर स्वतः सिंक्रनाइज़ हो जाएंगे। कोई भी अध्ययन डेटा नष्ट नहीं हुआ है।
