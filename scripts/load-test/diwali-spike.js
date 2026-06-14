// k6 load test — Diwali night 100K concurrent spike
// Roadmap: R-Q4-E-004 (P0)
//
// Run:  k6 run --env BASE_URL=https://api-staging.darshya.online scripts/load-test/diwali-spike.js
//
// Distributed run (5 AWS Lightsail $5 nodes for ~$25 one-time):
//   k6 run --out cloud scripts/load-test/diwali-spike.js
//
// Target env: STAGING scaled to 80% prod capacity. NEVER run against prod.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://api-staging.darshya.online';
const WEB_URL = __ENV.WEB_URL || 'https://staging.darshya.online';

// Custom metrics
const errorRate = new Rate('errors');
const bookingDuration = new Trend('booking_duration');
const darshanDuration = new Trend('darshan_duration');

export const options = {
  scenarios: {
    // Scenario B: Diwali peak — 100K concurrent sustained 60min
    diwali_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30m', target: 30000 }, // T-4h normal browsing
        { duration: '30m', target: 70000 }, // T-1h booking + darshan ramp
        { duration: '60m', target: 100000 }, // T-0 → T+1h sustained peak
        { duration: '30m', target: 50000 }, // T+2h drift
        { duration: '15m', target: 0 }, // cooldown
      ],
      gracefulRampDown: '60s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    http_req_failed: ['rate<0.005'], // <0.5% 5xx target
    errors: ['rate<0.01'],
    booking_duration: ['p(95)<600'],
    darshan_duration: ['p(95)<400'],
  },
  // Distribute across 5 regions if running on k6 Cloud
  ext: {
    loadimpact: {
      distribution: {
        'amazon:in:mumbai': { loadZone: 'amazon:in:mumbai', percent: 60 },
        'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 15 },
        'amazon:gb:london': { loadZone: 'amazon:gb:london', percent: 10 },
        'amazon:sg:singapore': { loadZone: 'amazon:sg:singapore', percent: 10 },
        'amazon:ae:dubai': { loadZone: 'amazon:ae:dubai', percent: 5 },
      },
    },
  },
};

// Weighted user behaviour mix (matches PostHog funnel data Q3 2026)
// 50% browse (home + temple list), 25% live darshan, 15% puja booking, 10% pandit ask
const BEHAVIOUR_BROWSE = 0.5;
const BEHAVIOUR_DARSHAN = 0.75; // cumulative
const BEHAVIOUR_BOOKING = 0.9; // cumulative

export default function () {
  const r = Math.random();

  if (r < BEHAVIOUR_BROWSE) {
    browseFlow();
  } else if (r < BEHAVIOUR_DARSHAN) {
    darshanFlow();
  } else if (r < BEHAVIOUR_BOOKING) {
    bookingFlow();
  } else {
    pandithAskFlow();
  }

  sleep(Math.random() * 3 + 1); // 1-4s think-time
}

function browseFlow() {
  group('browse', () => {
    const res = http.get(`${WEB_URL}/`, { tags: { flow: 'browse' } });
    check(res, { 'home 200': (r) => r.status === 200 }) || errorRate.add(1);

    const temples = http.get(`${BASE_URL}/api/v1/temples?limit=20`, {
      tags: { flow: 'browse', endpoint: 'temples-list' },
    });
    check(temples, { 'temples 200': (r) => r.status === 200 }) || errorRate.add(1);

    const pujas = http.get(`${BASE_URL}/api/v1/pujas/types/popular`, {
      tags: { flow: 'browse', endpoint: 'pujas-popular' },
    });
    check(pujas, { 'pujas 200': (r) => r.status === 200 }) || errorRate.add(1);
  });
}

function darshanFlow() {
  group('darshan', () => {
    const start = Date.now();
    const live = http.get(`${BASE_URL}/api/v1/darshan/live`, {
      tags: { flow: 'darshan', endpoint: 'darshan-live' },
    });
    check(live, { 'darshan 200': (r) => r.status === 200 }) || errorRate.add(1);

    const schedule = http.get(`${BASE_URL}/api/v1/darshan/schedule?date=today`, {
      tags: { flow: 'darshan', endpoint: 'darshan-schedule' },
    });
    check(schedule, { 'schedule 200': (r) => r.status === 200 }) || errorRate.add(1);

    darshanDuration.add(Date.now() - start);
  });
}

function bookingFlow() {
  group('booking', () => {
    const start = Date.now();
    // Browse puja types
    const types = http.get(`${BASE_URL}/api/v1/pujas/types`, {
      tags: { flow: 'booking', endpoint: 'puja-types' },
    });
    check(types, { 'types 200': (r) => r.status === 200 }) || errorRate.add(1);

    // View one puja detail
    const detail = http.get(`${BASE_URL}/api/v1/pujas/rudrabhishek`, {
      tags: { flow: 'booking', endpoint: 'puja-detail' },
    });
    check(detail, { 'detail 200': (r) => r.status === 200 }) || errorRate.add(1);

    // Check available temples for this puja
    const templesForPuja = http.get(`${BASE_URL}/api/v1/pujas/rudrabhishek/temples`, {
      tags: { flow: 'booking', endpoint: 'puja-temples' },
    });
    check(templesForPuja, { 'puja-temples 200': (r) => r.status === 200 }) || errorRate.add(1);

    bookingDuration.add(Date.now() - start);
  });
}

function pandithAskFlow() {
  group('ask-pandit', () => {
    // Read-only ask-pandit page hit (POST has rate-limit + LLM cost, skip in load test)
    const res = http.get(`${WEB_URL}/ask-pandit`, {
      tags: { flow: 'ask-pandit', endpoint: 'ask-pandit-page' },
    });
    check(res, { 'ask-pandit 200': (r) => r.status === 200 }) || errorRate.add(1);
  });
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'docs/load-test/diwali-spike-summary.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const m = data.metrics;
  const p95 = m.http_req_duration?.values?.['p(95)']?.toFixed(0) || 'n/a';
  const p99 = m.http_req_duration?.values?.['p(99)']?.toFixed(0) || 'n/a';
  const failRate = ((m.http_req_failed?.values?.rate || 0) * 100).toFixed(2);
  const reqs = m.http_reqs?.values?.count || 0;
  const rps = (m.http_reqs?.values?.rate || 0).toFixed(0);

  return `
================ R-Q4-E-004 Diwali Spike Summary ================
Total requests: ${reqs}
RPS sustained: ${rps}
http_req_duration p95: ${p95}ms (target <400ms)
http_req_duration p99: ${p99}ms (target <800ms)
http_req_failed rate: ${failRate}% (target <0.5%)
=================================================================
`;
}
