#!/usr/bin/env node
/**
 * FCM smoke test — sends a single test push to a target device token.
 *
 * Env-or-noop pattern. If FCM_PROJECT_ID / FCM_CLIENT_EMAIL / FCM_PRIVATE_KEY
 * are unset, exits 0 with a clear "skipped — not configured" message so CI
 * and dev shells never red-fail on a missing optional integration.
 *
 * Usage (after founder pastes FCM creds in Render env):
 *   FCM_TARGET_TOKEN="expo-push-token-here" \
 *   FCM_PROJECT_ID="darshya-prod" \
 *   FCM_CLIENT_EMAIL="firebase-adminsdk@…iam.gserviceaccount.com" \
 *   FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n…" \
 *   node apps/api/scripts/smoke-fcm-push.mjs
 *
 * Or with optional payload override:
 *   FCM_TARGET_TOKEN=… node apps/api/scripts/smoke-fcm-push.mjs "Custom title" "Custom body"
 *
 * Closes the founder verification half of R-Q1-E-011 (per agent_brief).
 * After this returns ok:true, flip the roadmap item shipped + log fcm_push_live=1.
 */

import crypto from 'node:crypto';

const projectId = process.env.FCM_PROJECT_ID ?? '';
const clientEmail = process.env.FCM_CLIENT_EMAIL ?? '';
const privateKeyRaw = process.env.FCM_PRIVATE_KEY ?? '';
const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
const targetToken = process.env.FCM_TARGET_TOKEN ?? '';

const title = process.argv[2] ?? 'Darshya test push';
const body = process.argv[3] ?? 'If you see this, FCM is live end-to-end. Jai Shri Ram 🙏';

const enabled = !!(projectId && clientEmail && privateKey);

if (!enabled) {
  console.log('[smoke-fcm-push] SKIPPED — FCM env vars not set.');
  console.log('  Required: FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY');
  console.log('  Founder action: paste service-account creds in Render env, then re-run.');
  process.exit(0);
}

if (!targetToken) {
  console.error('[smoke-fcm-push] ERROR — FCM_TARGET_TOKEN env var required.');
  console.error('  Get the token from the mobile devotee app debug surface (apps/mobile/app/_layout.tsx).');
  process.exit(1);
}

function base64UrlEncode(input) {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function maskToken(token) {
  if (token.length <= 8) return '***';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

const FCM_AUDIENCE = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: clientEmail,
    scope: FCM_SCOPE,
    aud: FCM_AUDIENCE,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claim))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey);
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`;

  const resp = await fetch(FCM_AUDIENCE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed ${resp.status}: ${text.slice(0, 200)}`);
  }
  const json = await resp.json();
  if (!json.access_token) throw new Error('No access_token in response');
  return json.access_token;
}

async function sendTestPush() {
  console.log(`[smoke-fcm-push] project=${projectId} target=${maskToken(targetToken)}`);
  const accessToken = await getAccessToken();
  console.log('[smoke-fcm-push] OAuth token acquired.');

  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: targetToken,
        notification: { title, body },
        data: { source: 'smoke-fcm-push', ts: String(Date.now()) },
      },
    }),
  });

  const text = await resp.text();
  if (resp.ok) {
    console.log(`[smoke-fcm-push] OK ${resp.status} — push dispatched.`);
    console.log(`  Response: ${text.slice(0, 200)}`);
    console.log('  Verify on device: notification should arrive within ~5s.');
    process.exit(0);
  }

  console.error(`[smoke-fcm-push] FAILED ${resp.status}`);
  console.error(`  Response: ${text.slice(0, 500)}`);
  if (resp.status === 404 || /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND/.test(text)) {
    console.error('  Hint: token appears expired/invalid. Re-fetch from device and retry.');
  }
  process.exit(1);
}

sendTestPush().catch((err) => {
  console.error('[smoke-fcm-push] EXCEPTION', err instanceof Error ? err.message : err);
  process.exit(1);
});
