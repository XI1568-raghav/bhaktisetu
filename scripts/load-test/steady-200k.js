// k6 load test — Steady 200K MAU (50K concurrent peak)
// Roadmap: R-Q4-E-004 (P0) — Scenario A
//
// Models normal 200K MAU day load. 25% concurrency ratio at peak hour = 50K concurrent.
// Run: k6 run --env BASE_URL=https://api-staging.darshya.online scripts/load-test/steady-200k.js

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://api-staging.darshya.online';
const WEB_URL = __ENV.WEB_URL || 'https://staging.darshya.online';

const errorRate = new Rate('errors');

export const options = {
  scenarios: {
    steady_200k: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10m', target: 10000 }, // ramp to morning baseline
        { duration: '30m', target: 30000 }, // mid-day
        { duration: '30m', target: 50000 }, // peak hour (evening aarti)
        { duration: '30m', target: 30000 }, // post-peak drift
        { duration: '10m', target: 0 }, // cooldown
      ],
      gracefulRampDown: '60s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<400', 'p(99)<800'],
    http_req_failed: ['rate<0.005'],
    errors: ['rate<0.01'],
  },
};

export default function () {
  const r = Math.random();
  if (r < 0.6) {
    browseFlow();
  } else if (r < 0.85) {
    darshanFlow();
  } else {
    bookingFlow();
  }
  sleep(Math.random() * 5 + 2); // 2-7s think-time (steadier than spike)
}

function browseFlow() {
  group('browse', () => {
    const res = http.get(`${WEB_URL}/`);
    check(res, { 'home 200': (r) => r.status === 200 }) || errorRate.add(1);

    const temples = http.get(`${BASE_URL}/api/v1/temples?limit=20`);
    check(temples, { 'temples 200': (r) => r.status === 200 }) || errorRate.add(1);
  });
}

function darshanFlow() {
  group('darshan', () => {
    const live = http.get(`${BASE_URL}/api/v1/darshan/live`);
    check(live, { 'live 200': (r) => r.status === 200 }) || errorRate.add(1);
  });
}

function bookingFlow() {
  group('booking', () => {
    const types = http.get(`${BASE_URL}/api/v1/pujas/types`);
    check(types, { 'types 200': (r) => r.status === 200 }) || errorRate.add(1);

    const detail = http.get(`${BASE_URL}/api/v1/pujas/rudrabhishek`);
    check(detail, { 'detail 200': (r) => r.status === 200 }) || errorRate.add(1);
  });
}
