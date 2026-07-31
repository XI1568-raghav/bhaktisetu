#!/usr/bin/env node
// End-to-end role smoke against prod. Logs in each demo account, hits role surfaces, reports pass/fail.
// Usage: node apps/api/scripts/smoke-all-roles.mjs [api-base] [web-base]

const API = process.argv[2] || 'https://api.darshya.online';
const WEB = process.argv[3] || 'https://darshya.online';

const roles = [
  { email: 'devotee@demo.com', role: 'devotee', dashboard: '/dashboard' },
  { email: 'pandit@demo.com', role: 'priest', dashboard: '/priest' },
  { email: 'store@demo.com', role: 'store', dashboard: '/store-admin' },
  { email: 'astro@demo.com', role: 'astrologer', dashboard: '/astrologer-portal' },
  { email: 'wellness@demo.com', role: 'wellness', dashboard: '/wellness-portal' },
  { email: 'gaushala@demo.com', role: 'gaushala', dashboard: '/gaushala-portal' },
  { email: 'temple@demo.com', role: 'temple', dashboard: '/temple-portal' },
  { email: 'admin@demo.com', role: 'admin', dashboard: '/admin' },
];

const publicGets = [
  '/health',
  '/api/v1/temples',
  '/api/v1/pujas/types',
  '/api/v1/gurukuls',
  '/api/v1/gurukuls/sampurnanand-sanskrit-vidyalaya',
  '/api/v1/knowledge/sanskrit',
  '/api/v1/knowledge/ved',
  '/api/v1/knowledge/sanatan',
  '/api/v1/panchang/today?lat=28.6139&lng=77.2090',
  '/api/v1/content',
  '/api/v1/priests',
  '/api/v1/store/products',
  '/api/v1/astrology/horoscope/daily?sign=aries',
  '/api/v1/astrology/astrologers',
  '/api/v1/yatra-packages',
];

const roleEndpoints = {
  devotee: [
    '/api/v1/users/me',
    '/api/v1/users/me/bookings',
    '/api/v1/me/reading-progress',
    '/api/v1/notifications/vapid-public-key',
    '/api/v1/gurukuls/mine/list',
    '/api/v1/gurukul-portal/applications',
    '/api/v1/lessons',
  ],
  priest: [
    '/api/v1/users/me',
    '/api/v1/priest/dashboard',
    '/api/v1/priest/bookings',
    '/api/v1/priest/profile',
    '/api/v1/priest/pujas',
  ],
  store: [
    '/api/v1/users/me',
    '/api/v1/store-admin/dashboard',
    '/api/v1/store-admin/products',
    '/api/v1/store-admin/revenue',
  ],
  astrologer: ['/api/v1/users/me', '/api/v1/astrologer-portal/dashboard'],
  wellness: [
    '/api/v1/users/me',
    '/api/v1/wellness-portal/dashboard',
    '/api/v1/wellness-portal/students',
  ],
  gaushala: [
    '/api/v1/users/me',
    '/api/v1/gaushala-portal/dashboard',
    '/api/v1/gaushala-portal/cows',
    '/api/v1/gaushala-portal/volunteers',
    '/api/v1/gaushala-portal/donations',
  ],
  temple: [
    '/api/v1/users/me',
    '/api/v1/temple-portal/dashboard',
    '/api/v1/temple-portal/pujas',
    '/api/v1/temple-portal/darshan',
    '/api/v1/temple-portal/donations',
  ],
  admin: [
    '/api/v1/users/me',
    '/api/v1/admin/dashboard',
    '/api/v1/admin/temples',
    '/api/v1/admin/pending-approvals',
    '/api/v1/admin/bookings',
    '/api/v1/admin/leads',
    '/api/v1/admin/gurukuls/?status=all',
    '/api/v1/admin/content-queue',
  ],
};

const results = [];
function record(role, kind, path, status, ok, note = '') {
  results.push({ role, kind, path, status, ok, note });
}

async function req(method, path, { token, body, headers = {} } = {}) {
  const init = { method, headers: { ...headers } };
  if (body) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  if (token) init.headers.authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${API}${path}`, init);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text };
  } catch (err) {
    return { status: 0, json: null, text: String(err) };
  }
}

async function webGet(path) {
  try {
    const res = await fetch(`${WEB}${path}`, { method: 'GET', redirect: 'manual' });
    return res.status;
  } catch {
    return 0;
  }
}

async function login(email) {
  const r = await req('POST', '/api/v1/auth/login', { body: { email, password: 'demo123' } });
  return r.json?.session?.accessToken || null;
}

async function runPublic() {
  for (const path of publicGets) {
    const r = await req('GET', path);
    const ok = r.status >= 200 && r.status < 300;
    record('public', 'GET', path, r.status, ok, r.text.slice(0, 120).replace(/\s+/g, ' '));
  }
}

async function runRole(entry) {
  const token = await login(entry.email);
  if (!token) {
    record(entry.role, 'LOGIN', '/api/v1/auth/login', 0, false, 'no token');
    return;
  }
  record(entry.role, 'LOGIN', '/api/v1/auth/login', 200, true, 'ok');

  const webStatus = await webGet(entry.dashboard);
  const webOk = webStatus === 200 || webStatus === 307 || webStatus === 308;
  record(entry.role, 'WEB', entry.dashboard, webStatus, webOk, '');

  for (const path of roleEndpoints[entry.role] || []) {
    const r = await req('GET', path, { token });
    const ok = r.status >= 200 && r.status < 300;
    record(entry.role, 'API', path, r.status, ok, r.text.slice(0, 120).replace(/\s+/g, ' '));
  }
}

async function permsCheck() {
  const dtoken = await login('devotee@demo.com');
  const r = await req('GET', '/api/v1/admin/gurukuls/?status=all', { token: dtoken });
  const ok = r.status === 401 || r.status === 403;
  record(
    'perms',
    'DENY',
    'devotee → /admin/gurukuls',
    r.status,
    ok,
    ok ? 'correctly blocked' : 'SHOULD BE BLOCKED',
  );
}

async function adminGurukulMutation() {
  const t = await login('admin@demo.com');
  const list = await req('GET', '/api/v1/admin/gurukuls/?status=all', { token: t });
  const id = list.json?.gurukuls?.[0]?.id;
  // Distinguish the two failure modes the old "list empty" note conflated:
  // an auth/permission failure (401/403) is a REAL bug; a 200 with an empty
  // list just means no gurukul rows are seeded in prod (data, not auth).
  if (!id) {
    const authFailed = list.status === 401 || list.status === 403;
    const note = authFailed
      ? `gurukul-mut: AUTH FAILED (HTTP ${list.status}) — real guard bug`
      : `gurukul-mut: 200 but no gurukul rows seeded in prod — data, not auth`;
    record('admin', 'API', note, list.status, false);
    return;
  }
  const original = list.json.gurukuls[0].isVerified;
  const off = await req('PATCH', `/api/v1/admin/gurukuls/${id}/verify`, {
    token: t,
    body: { isVerified: !original },
  });
  record('admin', 'PATCH', `verify toggle`, off.status, off.status === 200, off.text.slice(0, 120));
  const on = await req('PATCH', `/api/v1/admin/gurukuls/${id}/verify`, {
    token: t,
    body: { isVerified: original },
  });
  record('admin', 'PATCH', `verify restore`, on.status, on.status === 200, on.text.slice(0, 120));
}

async function publicWebPages() {
  // Critical public pages users actually visit.
  const pages = [
    '/',
    '/auth/login',
    '/auth/signup',
    '/dashboard',
    '/pujas',
    '/temples',
    '/gurukuls',
    '/become-gurukul',
    '/gurukul-portal',
    '/sanskrit',
    '/ved',
    '/sanatan',
    '/learn-sanskrit',
    '/about',
    '/contact',
    '/pricing',
  ];
  for (const p of pages) {
    const s = await webGet(p);
    const ok = s === 200 || s === 307 || s === 308;
    record('web-public', 'GET', p, s, ok);
  }
}

(async () => {
  console.log(`Smoke API=${API} WEB=${WEB}\n`);
  await runPublic();
  await publicWebPages();
  for (const r of roles) await runRole(r);
  await permsCheck();
  await adminGurukulMutation();

  const byRole = {};
  for (const r of results) (byRole[r.role] ||= []).push(r);
  let pass = 0,
    fail = 0;
  for (const [role, rows] of Object.entries(byRole)) {
    console.log(`\n=== ${role} ===`);
    for (const r of rows) {
      const tag = r.ok ? 'PASS' : 'FAIL';
      console.log(
        `  [${tag}] ${r.kind.padEnd(5)} ${String(r.status).padEnd(4)} ${r.path}${r.ok ? '' : `  -- ${r.note}`}`,
      );
      r.ok ? pass++ : fail++;
    }
  }
  console.log(`\nTotal: ${pass} pass, ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
})();
