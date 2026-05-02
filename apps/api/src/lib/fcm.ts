import crypto from 'node:crypto';

/**
 * FCM HTTP v1 client (singleton). Uses direct fetch + service-account JWT
 * (signed with Node crypto, RS256) so we don't add the heavy `firebase-admin`
 * dependency. firebase-admin isn't in package.json, and adding it pulls in a
 * gRPC native binding tree we don't need on Render free tier.
 *
 * Env vars (all required to enable):
 *   FCM_PROJECT_ID    — e.g. "darshya-prod"
 *   FCM_CLIENT_EMAIL  — service-account email
 *   FCM_PRIVATE_KEY   — full PEM, with BEGIN/END lines. Pass via env with
 *                       literal "\n" allowed; we normalise.
 *
 * If any is missing → `enabled = false` and every send returns `{skipped:true}`.
 * Tokens are never logged in full.
 */

const projectId = process.env.FCM_PROJECT_ID ?? '';
const clientEmail = process.env.FCM_CLIENT_EMAIL ?? '';
const privateKeyRaw = process.env.FCM_PRIVATE_KEY ?? '';
const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

const enabled = !!(projectId && clientEmail && privateKey);

const FCM_AUDIENCE = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: CachedToken | null = null;

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function maskToken(token: string): string {
  if (token.length <= 8) return '***';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 60 > now) {
    return cachedToken.accessToken;
  }
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
    throw new Error(`FCM token exchange failed: ${resp.status} ${text.slice(0, 200)}`);
  }
  const json = (await resp.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error('FCM token exchange returned no access_token');
  cachedToken = {
    accessToken: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600),
  };
  return cachedToken.accessToken;
}

export interface FcmPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface FcmSendResult {
  ok: boolean;
  skipped?: boolean;
  expired?: boolean; // 404 / UNREGISTERED / INVALID_ARGUMENT — drop token
  error?: string;
}

export async function sendFcm(token: string, payload: FcmPayload): Promise<FcmSendResult> {
  if (!enabled) return { ok: false, skipped: true };
  if (!token) return { ok: false, error: 'empty token' };
  try {
    const accessToken = await getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          data: payload.data,
        },
      }),
    });
    if (resp.ok) return { ok: true };
    const text = await resp.text();
    // FCM returns 404 / 400 with errorCode UNREGISTERED or INVALID_ARGUMENT for
    // dead tokens — caller should delete from DB.
    if (
      resp.status === 404 ||
      /UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND/.test(text)
    ) {
      return { ok: false, expired: true };
    }
    return {
      ok: false,
      error: `FCM ${resp.status} ${maskToken(token)}: ${text.slice(0, 200)}`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendFcmMulticast(
  tokens: string[],
  payload: FcmPayload,
): Promise<{ sent: number; expired: string[]; failed: number; skipped?: boolean }> {
  if (!enabled) return { sent: 0, expired: [], failed: 0, skipped: true };
  const expired: string[] = [];
  let sent = 0;
  let failed = 0;
  // FCM HTTP v1 has no batch endpoint (only the deprecated legacy API did);
  // serial fan-out keeps memory flat. Caller controls batch size upstream.
  for (const t of tokens) {
    const r = await sendFcm(t, payload);
    if (r.ok) sent++;
    else if (r.expired) expired.push(t);
    else if (!r.skipped) failed++;
  }
  return { sent, expired, failed };
}

export const fcmConfig = { enabled, projectId };
