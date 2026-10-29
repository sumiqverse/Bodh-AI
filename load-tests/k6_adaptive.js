/* global __ENV */
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metric trends for granular latency analysis
const attemptDuration = new Trend('attempt_duration_ms', true);
const nextItemDuration = new Trend('next_item_duration_ms', true);
const successRate = new Rate('successful_requests');
const failureRate = new Rate('failed_requests');
const throughputCounter = new Counter('total_transactions');

// Target Workload: 500 req/s mixed traffic (60% attempts / 40% next-item)
// Performance Gates: p95 latency < 300ms, failure rate < 1%
export const options = {
  scenarios: {
    constant_rate_stress: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { target: 200, duration: '20s' }, // Warm-up ramp
        { target: 500, duration: '30s' }, // Ramp to 500 req/s
        { target: 500, duration: '2m' }, // Sustained 500 req/s peak load
        { target: 50, duration: '20s' }, // Cool-down
      ],
    },
  },
  thresholds: {
    // Quality Gate: p95 latency strictly under 300ms across all requests
    http_req_duration: ['p(95)<300', 'p(99)<600'],
    // Quality Gate: 95th percentile for attempts under 300ms
    attempt_duration_ms: ['p(95)<300'],
    // Quality Gate: 95th percentile for adaptive next-item recommendation under 300ms
    next_item_duration_ms: ['p(95)<300'],
    // Quality Gate: Overall HTTP error rate strictly under 1%
    http_req_failed: ['rate<0.01'],
    failed_requests: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:8000';

// Pre-seeded UUIDs and mock authorization tokens
const TEST_STUDENT_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const TEST_QUESTION_ID = 'b7d8c6d1-4e4b-489e-8c90-95b2d7110189';
const TEST_SKILL_ID = 'e8b7c3a1-1234-4567-89ab-cdef01234567';

const HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  Authorization: 'Bearer test-load-bearer-token',
  'X-Request-ID': 'k6-load-runner',
};

export default function () {
  const isAttempt = Math.random() < 0.6; // 60% attempts / 40% adaptive next-item

  if (isAttempt) {
    // 1. Submit Student Assessment Attempt
    const attemptPayload = JSON.stringify({
      student_id: TEST_STUDENT_ID,
      question_id: TEST_QUESTION_ID,
      skill_id: TEST_SKILL_ID,
      response: 'B',
      is_correct: Math.random() > 0.3,
      duration_ms: Math.floor(Math.random() * 25000) + 5000,
      client_timestamp: new Date().toISOString(),
    });

    const res = http.post(`${BASE_URL}/api/v1/attempts`, attemptPayload, {
      headers: HEADERS,
      tags: { endpoint: 'submit_attempt' },
    });

    attemptDuration.add(res.timings.duration);
    throughputCounter.add(1);

    const isOk = check(res, {
      'attempt status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'attempt response contains id': (r) => r.body && r.body.includes('id'),
    });

    if (isOk) {
      successRate.add(1);
      failureRate.add(0);
    } else {
      successRate.add(0);
      failureRate.add(1);
    }
  } else {
    // 2. Query Adaptive Diagnostic / Next-Item Recommendation
    const progressPayload = JSON.stringify({
      student_id: TEST_STUDENT_ID,
      grade: 7,
      subject: 'Mathematics',
      language: 'en',
    });

    const res = http.post(`${BASE_URL}/api/v1/adaptive/diagnostic/progress`, progressPayload, {
      headers: HEADERS,
      tags: { endpoint: 'adaptive_next_item' },
    });

    nextItemDuration.add(res.timings.duration);
    throughputCounter.add(1);

    const isOk = check(res, {
      'next-item status is 200': (r) => r.status === 200,
      'next-item returned question or recommendation': (r) =>
        r.body && (r.body.includes('question') || r.body.includes('skill')),
    });

    if (isOk) {
      successRate.add(1);
      failureRate.add(0);
    } else {
      successRate.add(0);
      failureRate.add(1);
    }
  }
}
