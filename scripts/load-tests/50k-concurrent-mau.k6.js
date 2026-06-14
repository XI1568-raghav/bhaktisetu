/**
 * R-Q3-E-006 — 50K concurrent MAU scale test
 *
 * Validates Render auto-scale + API capacity under 50K virtual users
 * representing the projected Q3 monthly-active-user load.
 *
 * Stages (ramping VUs):
 *   - warmup    0 →  500   over 2m
 *   - climb   500 → 10000  over 5m
 *   - climb 10000 → 25000  over 8m
 *   - peak  25000 → 50000  over 10m
 *   - hold  50000           for  15m  (auto-scale + stability window)
 *   - drain 50000 → 0       over 5m
 * Total: 45m wall clock.
 *
 * Thresholds (PASS gate for KPI scale_test_max_concurrent):
 *   - http_req_failed         < 1%
 *   - http_req_duration p95   < 1500 ms
 *   - http_req_duration p99   < 3000 ms
 *
 * Run:
 *   k6 run \
 *     -e BASE_URL=https://api.darshya.online \
 *     -e PROFILE=full \
 *     scripts/load-tests/50k-concurrent-mau.k6.js
 *
 * Smoke profile (PROFILE=smoke) caps at 200 VUs / 2m for CI gating.
 *
 * NOTE: Render free-tier WILL throttle long before 50K. Founder must
 * provision a paid Render plan for the soak window OR run from a
 * sandbox copy of the API. See docs/engineering/R-Q3-E-006-handoff.md.
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://api.darshya.online';
const PROFILE = __ENV.PROFILE || 'smoke';

const errorRate = new Rate('errors');
const healthLatency = new Trend('health_latency_ms');
const listingLatency = new Trend('listing_latency_ms');

const PROFILES = {
  smoke: {
    stages: [
      { duration: '30s', target: 50 },
      { duration: '1m', target: 200 },
      { duration: '30s', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.02'],
      http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    },
  },
  midscale: {
    stages: [
      { duration: '1m', target: 500 },
      { duration: '3m', target: 5000 },
      { duration: '5m', target: 5000 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.01'],
      http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    },
  },
  full: {
    stages: [
      { duration: '2m', target: 500 },
      { duration: '5m', target: 10000 },
      { duration: '8m', target: 25000 },
      { duration: '10m', target: 50000 },
      { duration: '15m', target: 50000 },
      { duration: '5m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.01'],
      http_req_duration: ['p(95)<1500', 'p(99)<3000'],
      errors: ['rate<0.01'],
    },
  },
};

const profile = PROFILES[PROFILE] || PROFILES.smoke;

export const options = {
  stages: profile.stages,
  thresholds: profile.thresholds,
  noConnectionReuse: false,
  userAgent: 'darshya-load-test/R-Q3-E-006',
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

// Realistic traffic mix per Darshya devotee persona (Aarti):
//   60% browse pujas/temples (read)
//   20% panchang/today (read)
//   15% health/uptime probe (read)
//    5% search (read)
// Auth + write paths intentionally excluded — booking flow requires
// real Razorpay handshake which cannot be load-tested without polluting
// payment provider. Lane separately covered by booking-flow-smoke.k6.js.
function pickRoute() {
  const r = Math.random();
  if (r < 0.60) return '/api/v1/pujas/types';
  if (r < 0.80) return '/api/v1/panchang/today';
  if (r < 0.95) return '/health';
  return '/api/v1/search?q=ganesha';
}

export default function () {
  group('listing', function () {
    const path = pickRoute();
    const url = `${BASE_URL}${path}`;
    const res = http.get(url, {
      tags: { name: path },
      timeout: '10s',
    });

    const ok = check(res, {
      'status is 200 or 401': (r) => r.status === 200 || r.status === 401,
      'body not empty': (r) => r.body && r.body.length > 0,
      'p(95) latency under 3s': (r) => r.timings.duration < 3000,
    });

    if (!ok) errorRate.add(1);
    else errorRate.add(0);

    if (path === '/health') healthLatency.add(res.timings.duration);
    else listingLatency.add(res.timings.duration);
  });

  sleep(Math.random() * 2 + 1); // 1-3s think time per virtual devotee
}

export function handleSummary(data) {
  const max = data.metrics.vus_max ? data.metrics.vus_max.values.max : 0;
  const p95 = data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0;
  const failRate = data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0;

  const summary = {
    profile: PROFILE,
    base_url: BASE_URL,
    scale_test_max_concurrent: max,
    p95_ms: Math.round(p95),
    error_rate: Number(failRate.toFixed(4)),
    timestamp: new Date().toISOString(),
  };

  return {
    'stdout': JSON.stringify(summary, null, 2) + '\n',
    'docs/agent-reports/scale-test-latest.json': JSON.stringify(summary, null, 2),
  };
}
