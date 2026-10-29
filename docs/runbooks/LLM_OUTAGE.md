# BodhAI LLM Provider Outage & AI Tutor Degraded Mode Runbook

## Overview

BodhAI employs an AI conversational tutor for Socratic hint generation and misconception remediation. In the event of an upstream outage at OpenAI / external LLM provider, BodhAI's built-in **Circuit Breaker** and **Deterministic Rule-Based Fallback Engine** preserve continuous learning without student disruption.

---

## 1. Automated Circuit Breaker Operation

The AI Tutor client in `apps/api/app/services/tutor_service.py` implements an automated 3-state circuit breaker:

```
          Success
  +--------------------+
  |                    |
  v                    |
+---------+  3 Failures  +------+  30s Timeout  +-----------+
| CLOSED  +------------->+ OPEN +-------------->+ HALF_OPEN |
+---------+              +------+               +-----+-----+
                                                      |
                                                      | 1 Failure
                                                      v
                                                   +------+
                                                   | OPEN |
                                                   +------+
```

- **CLOSED (Normal)**: All tutor requests forward to OpenAI `gpt-4o-mini`.
- **OPEN (Trip)**: After 3 consecutive timeouts ($> 5.0\text{s}$) or 5xx API errors, circuit trips to OPEN. All subsequent requests are intercepted locally without making network calls.
- **HALF_OPEN (Probe)**: After 30 seconds of quiet time, exactly one probe request tests upstream recovery.

---

## 2. Fallback Behavior During Outage

When the circuit is OPEN, the backend immediately executes deterministic Socratic ladder logic:

1. **Level 1 Hint (Restatement)**: Returns the verified curriculum definition from NCERT textbook grounding embeddings cached locally.
2. **Level 2 Hint (Sub-step Prompt)**: Decomposes the mathematical formula into prerequisite steps.
3. **Level 3 Hint (Worked Example)**: Provides an isomorphic worked example from the offline question bank.
4. **Latency Guarantee**: Fallback responses return in $< 15\text{ ms}$, maintaining the p95 $< 300\text{ ms}$ SLO.

---

## 3. Operator Manual Intervention Protocol

If an extended external outage ($> 1\text{ hour}$) is declared on the OpenAI status page (`https://status.openai.com`):

### Step 1: Force Mock / Local Provider Mode

Manually force the application configuration to avoid repeated half-open timeouts:

```bash
gcloud run services update bodhai-api \
  --update-env-vars TUTOR_LLM_PROVIDER=mock \
  --region asia-south1
```

### Step 2: Notify Teachers & Proctors

Post banner update informing teachers that AI Tutor is operating in "Deterministic Scaffold Mode":

> _Notice: BodhAI AI Tutor is currently using verified textbook hints while upstream network maintenance completes. Quizzes, adaptive grading, and mastery progress are completely unaffected._

### Step 3: Monitor Recovery & Restore

Once upstream status reports green:

```bash
gcloud run services update bodhai-api \
  --update-env-vars TUTOR_LLM_PROVIDER=openai \
  --region asia-south1
```

Verify chat endpoint responds within SLA:

```bash
curl -f -X POST https://api.bodhai.org/api/v1/tutor/chat ...
```
