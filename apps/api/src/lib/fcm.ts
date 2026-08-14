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
  /** 404 / UNREGISTERED / NOT_FOUND — the device is gone; the caller SHOULD drop the row. */
  expired?: boolean;
  /**
   * The token is structurally wrong or FCM says INVALID_ARGUMENT.
   *
   * NOTIF-07: this used to be folded into `expired`, so the first send after a
   * web devotee enabled aarti reminders DELETED their registration — the toggle
   * went on, nothing was ever delivered, and the row that would have let anyone
   * diagnose it was gone. A malformed token is a BUG on the write path
   * (apps/web registers a Web Push endpoint URL here), not a dead device, and
   * deleting it destroys the only evidence. Callers must keep the row, count it
   * separately and shout.
   */
  invalidToken?: boolean;
  error?: string;
}

/**
 * Is this an FCM HTTP v1 registration token?
 *
 * FCM v1 requires a registration token in `message.token`. It is an opaque
 * URL-safe string (base64url plus `:`), never a URL and never JSON.
 * apps/web/components/AartiOptIn.tsx registers `pushSubscription.endpoint`
 * (`https://fcm.googleapis.com/fcm/send/...`) or, on its fallback branch, the
 * whole `JSON.stringify(subJson)` — both of which FCM rejects. The component's
 * comment claims "the API treats both as opaque strings"; FCM does not, so the
 * API must say so instead of silently posting garbage.
 */
export function isFcmRegistrationToken(token: string): boolean {
  const t = token?.trim() ?? '';
  if (t.length < 60) return false; // real tokens are ~150+ chars
  if (/^\s*[{[]/.test(t)) return false; // a serialised PushSubscription
  if (/^https?:/i.test(t) || t.includes('://')) return false; // a push endpoint URL
  if (/\s/.test(t)) return false;
  return /^[A-Za-z0-9_:.-]+$/.test(t);
}

export async function sendFcm(token: string, payload: FcmPayload): Promise<FcmSendResult> {
  if (!enabled) return { ok: false, skipped: true };
  if (!token) return { ok: false, error: 'empty token' };
  if (!isFcmRegistrationToken(token)) {
    // Refuse BEFORE the network call. Posting a push endpoint URL to FCM buys
    // an INVALID_ARGUMENT round-trip and nothing else.
    return {
      ok: false,
      invalidToken: true,
      error: `not an FCM registration token (${maskToken(token)}) — looks like a Web Push endpoint or serialised subscription`,
    };
  }
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
    // NOTIF-07: INVALID_ARGUMENT is NOT in this bucket. UNREGISTERED / NOT_FOUND
    // mean the app was uninstalled or the token rotated — the device is gone and
    // the row is dead weight. INVALID_ARGUMENT means we sent something that was
    // never a token, which is our bug; deleting the row hides it forever.
    if (resp.status === 404 || /UNREGISTERED|NOT_FOUND/.test(text)) {
      return { ok: false, expired: true };
    }
    if (/INVALID_ARGUMENT/.test(text)) {
      return {
        ok: false,
        invalidToken: true,
        error: `FCM INVALID_ARGUMENT ${maskToken(token)}: ${text.slice(0, 200)}`,
      };
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
): Promise<{
  sent: number;
  expired: string[];
  /** Tokens that are not FCM tokens at all. NOT deleted — see FcmSendResult. */
  invalid: string[];
  failed: number;
  skipped?: boolean;
}> {
  if (!enabled) return { sent: 0, expired: [], invalid: [], failed: 0, skipped: true };
  const expired: string[] = [];
  const invalid: string[] = [];
  let sent = 0;
  let failed = 0;
  // FCM HTTP v1 has no batch endpoint (only the deprecated legacy API did);
  // serial fan-out keeps memory flat. Caller controls batch size upstream.
  for (const t of tokens) {
    const r = await sendFcm(t, payload);
    if (r.ok) sent++;
    else if (r.expired) expired.push(t);
    else if (r.invalidToken) invalid.push(t);
    else if (!r.skipped) failed++;
  }
  return { sent, expired, invalid, failed };
}

export const fcmConfig = { enabled, projectId };
