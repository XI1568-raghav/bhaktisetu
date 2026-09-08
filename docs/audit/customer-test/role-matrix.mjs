#!/usr/bin/env node
/**
 * Authenticated role matrix against prod.
 *
 * Two questions, both of which the unauthenticated sweep cannot answer:
 *   1. Does each role's OWN surface actually work when logged in? (200, not 500)
 *   2. Does every role get REFUSED on every other role's surface? A 200 here is
 *      a P0 authorization leak — one role reading another's data.
 *
 * Reads credentials from the file written by ct-provision-accounts.mjs --out,
 * so no password is ever hardcoded here.
 *
 *   node role-matrix.mjs --creds <path-to-ct-accounts.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const CREDS = argv[argv.indexOf('--creds') + 1];
const API = 'https://api.darshya.online/api/v1';
const DELAY_MS = 250;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { password, accounts } = JSON.parse(readFileSync(CREDS, 'utf-8'));

// Endpoints that belong to exactly one role. `owner` is the only role allowed a
// success; every other role must be refused.
const SURFACES = [
  { owner: 'ADMIN',               paths: ['/admin/users?limit=1', '/admin/dashboard', '/admin/revenue', '/admin/pending-approvals', '/admin/temples?limit=1', '/admin/priests?limit=1'] },
  { owner: 'PANDIT',              paths: ['/priest/dashboard', '/priest/bookings?limit=1', '/priest/offers', '/priest/payouts', '/priest/profile', '/priest/reviews', '/priest/pujas'] },
  { owner: 'STORE_OWNER',         paths: ['/store-admin/dashboard', '/store-admin/products', '/store-admin/profile', '/store-admin/revenue', '/store-admin/reviews'] },
  { owner: 'ASTROLOGER',          paths: ['/astrologer-portal/dashboard', '/astrologer-portal/online', '/astrologer-portal/earnings'] },
  { owner: 'WELLNESS_INSTRUCTOR', paths: ['/wellness-portal/dashboard', '/wellness-portal/students'] },
  { owner: 'GAUSHALA_MANAGER',    paths: ['/gaushala-portal/dashboard', '/gaushala-portal/donations'] },
  { owner: 'TEMPLE_MANAGER',      paths: ['/temple-portal/dashboard', '/temple-portal/bookings', '/temple-portal/donations', '/temple-portal/payouts', '/temple-portal/pujas', '/temple-portal/darshan'] },
];

// Any authenticated user may reach these.
const SHARED = ['/auth/me', '/payouts/balance', '/bookings?limit=1', '/notifications?limit=1'];

// /auth/* is capped at 10 requests / minute / key (server.ts:233). Eight logins
// plus any earlier manual ones blow that budget, so tokens are cached to disk
// and reused until they expire — a re-run costs zero logins.
const TOKEN_CACHE = resolve(HERE, '.token-cache.json');
function loadCache() {
  try { return JSON.parse(readFileSync(TOKEN_CACHE, 'utf-8')); } catch { return {}; }
}
function saveCache(c) { writeFileSync(TOKEN_CACHE, JSON.stringify(c, null, 2)); }

async function login(email, attempt = 0) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 429 && attempt < 6) {
    // The window is a minute; wait it out rather than hammering.
    const wait = 62_000;
    console.log(`    429 on ${email} — waiting ${wait / 1000}s for the auth window to reset`);
    await sleep(wait);
    return login(email, attempt + 1);
  }
  const body = await res.json().catch(() => ({}));
  return {
    status: res.status,
    token: body?.session?.accessToken || body?.accessToken || null,
    role: body?.user?.role || body?.role || null,
    expiresAt: body?.session?.expiresAt || 0,
  };
}

async function call(path, token) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch(`${API}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { status: res.status, bytes: text.length, snippet: res.status >= 400 ? text.slice(0, 120) : null };
  } catch (e) {
    return { status: 0, bytes: 0, snippet: String(e?.name === 'AbortError' ? 'timeout' : e?.message) };
  } finally {
    clearTimeout(t);
  }
}

const sessions = {};
const cache = loadCache();
console.log('logging in as each role (cached tokens reused)...');
for (const a of accounts) {
  const cached = cache[a.email];
  if (cached?.token && cached.expiresAt > Date.now() + 60_000) {
    sessions[a.role] = cached;
    console.log(`  ${a.role.padEnd(20)} cached token, role=${cached.role}`);
    continue;
  }
  const s = await login(a.email);
  sessions[a.role] = s;
  if (s.token) cache[a.email] = s;
  console.log(`  ${a.role.padEnd(20)} login=${s.status} role=${s.role} token=${s.token ? 'yes' : 'NO'}`);
  saveCache(cache);
  await sleep(DELAY_MS);
}
saveCache(cache);

const findings = [];
const rows = [];

console.log('\nowner-surface checks (each role on its OWN endpoints)...');
for (const surface of SURFACES) {
  const s = sessions[surface.owner];
  if (!s?.token) { console.log(`  SKIP ${surface.owner} — no token`); continue; }
  for (const p of surface.paths) {
    const r = await call(p, s.token);
    rows.push({ kind: 'own', role: surface.owner, path: p, ...r });
    // 404 = endpoint does not exist at this path (test-harness error, not a bug).
    // 5xx or 401/403 for the OWNER is a real defect.
    if (r.status >= 500 || r.status === 401 || r.status === 403) {
      findings.push({ severity: r.status >= 500 ? 'P1' : 'P1', kind: 'OWN_SURFACE_DENIED', role: surface.owner, path: p, status: r.status, detail: r.snippet });
      console.log(`  FAIL ${surface.owner} ${p} -> ${r.status} ${r.snippet ? r.snippet.replace(/\s+/g, ' ').slice(0, 90) : ''}`);
    } else if (r.status === 404) {
      console.log(`  n/a  ${surface.owner} ${p} -> 404 (path may not exist; verify before filing)`);
    }
    await sleep(DELAY_MS);
  }
}

console.log('\nescalation checks (every OTHER role must be refused)...');
for (const surface of SURFACES) {
  for (const a of accounts) {
    if (a.role === surface.owner) continue;
    const s = sessions[a.role];
    if (!s?.token) continue;
    // Probe one representative path per surface to keep the matrix affordable.
    const p = surface.paths[0];
    const r = await call(p, s.token);
    rows.push({ kind: 'cross', role: a.role, owner: surface.owner, path: p, ...r });
    if (r.status === 200) {
      findings.push({ severity: 'P0', kind: 'AUTH_LEAK', role: a.role, path: p, owner: surface.owner, status: 200, detail: `${a.role} read ${surface.owner}'s endpoint` });
      console.log(`  P0 LEAK  ${a.role} -> ${p} returned 200`);
    }
    await sleep(DELAY_MS);
  }
}

console.log('\nshared-surface checks...');
for (const a of accounts) {
  const s = sessions[a.role];
  if (!s?.token) continue;
  for (const p of SHARED) {
    const r = await call(p, s.token);
    rows.push({ kind: 'shared', role: a.role, path: p, ...r });
    if (r.status >= 500) {
      findings.push({ severity: 'P1', kind: 'SHARED_5XX', role: a.role, path: p, status: r.status, detail: r.snippet });
      console.log(`  FAIL ${a.role} ${p} -> ${r.status}`);
    }
    await sleep(DELAY_MS);
  }
}

console.log('\nunauthenticated control (every owner surface must refuse a no-token call)...');
for (const surface of SURFACES) {
  const p = surface.paths[0];
  const r = await call(p, null);
  rows.push({ kind: 'anon', path: p, ...r });
  if (r.status === 200) {
    findings.push({ severity: 'P0', kind: 'UNAUTH_LEAK', path: p, status: 200, detail: 'reachable with no token' });
    console.log(`  P0 LEAK  anonymous -> ${p} returned 200`);
  }
  await sleep(DELAY_MS);
}

const out = { generatedAt: new Date().toISOString(), api: API, findings, rows };
writeFileSync(resolve(HERE, 'LEDGER-roles.json'), JSON.stringify(out, null, 2));

const byStatus = rows.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
console.log('\n=== summary ===');
console.log('calls by status:', JSON.stringify(byStatus));
console.log(`findings: ${findings.length}`);
findings.forEach((f) => console.log(`  ${f.severity} ${f.kind} ${f.role || 'anon'} ${f.path} -> ${f.status}`));
