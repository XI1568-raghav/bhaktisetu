import crypto from 'node:crypto';

/**
 * Device-push client (singleton). TWO rails, dispatched on token SHAPE:
 *
 *   1. Expo Push Service  — `ExponentPushToken[…]`, POSTed to exp.host.
 *      This is the rail apps/mobile speaks. `expo-notifications`
 *      `getExpoPushTokenAsync()` returns the SAME bracketed format on iOS and
 *      on Android, so one stored column and one send path cover both stores.
 *      Needs no credentials in THIS service: the FCM v1 service account and
 *      the APNs key live in the EAS project (expo.dev → credentials), and
 *      Expo fans out to FCM/APNs on our behalf. `EXPO_ACCESS_TOKEN` is
 *      OPTIONAL and only turns on Expo's enhanced-security mode.
 *
 *   2. FCM HTTP v1 — raw `…:APA91b…` registration tokens, for any client that
 *      obtains one directly (none today; kept because rows may already exist
 *      and because a future bare-RN client would land here). Direct fetch +
 *      service-account JWT (Node crypto, RS256) so we don't add the heavy
 *      `firebase-admin` dependency: it isn't in package.json and it pulls in a
 *      gRPC native binding tree we don't need on Render free tier.
 *
 * NOTIF-17: rail 1 exists because the two ends did not agree. The mobile client
 * has always produced an Expo token (~41 chars, bracketed) while this file
 * validated with `isFcmRegistrationToken` (length ≥ 60, `[A-Za-z0-9_:.-]+`) —
 * the Expo token fails BOTH checks, so `POST /register-token` answered a hard
 * 400 and no phone could ever register. The fix is a sibling validator plus
 * shape dispatch, NOT a loosened `isFcmRegistrationToken`: that function is the
 * only thing stopping apps/web from posting a Web Push endpoint URL (NOTIF-07).
 *
 * FCM env vars (all required to enable rail 2):
 *   FCM_PROJECT_ID    — e.g. "darshya-prod"
 *   FCM_CLIENT_EMAIL  — service-account email
 *   FCM_PRIVATE_KEY   — full PEM, with BEGIN/END lines. Pass via env with
 *                       literal "\n" allowed; we normalise.
 *
 * If any is missing → `enabled = false` and every rail-2 send returns
 * `{skipped:true}`. Rail 1 is unaffected by those vars.
 * Tokens are never logged in full.
 */

const projectId = process.env.FCM_PROJECT_ID ?? '';
const clientEmail = process.env.FCM_CLIENT_EMAIL ?? '';
const privateKeyRaw = process.env.FCM_PRIVATE_KEY ?? '';
const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

const enabled = !!(projectId && clientEmail && privateKey);

const FCM_AUDIENCE = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';
/**
 * OPTIONAL. Only needed if the owner turns on "enhanced security for push
 * notifications" in the Expo dashboard; without it Expo accepts unauthenticated
 * sends to tokens belonging to the project. Never logged.
 */
const expoAccessToken = process.env.EXPO_ACCESS_TOKEN ?? '';
/**
 * Rail 1 needs no server-side credentials, so it is always available. This is
 * deliberately NOT folded into `fcmConfig.enabled`: that flag answers "are FCM
 * v1 service-account creds present?" and /health/channels reports it as such.
 * Claiming push is configured because a credential-free HTTP endpoint exists
 * would be exactly the dark-transport-reads-green failure NOTIF-03 fixed.
 */
const expoEnabled = true;

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
  if (/^[0-9a-f]{64}$/i.test(t)) return false; // a raw APNs device token — 64 hex, not FCM
  return /^[A-Za-z0-9_:.-]+$/.test(t);
}

/**
 * Is this an Expo Push Service token?
 *
 * The only shape `expo-notifications` `getExpoPushTokenAsync()` produces:
 * `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]` (the modern `ExpoPushToken[…]`
 * spelling is accepted too). Identical on iOS and Android — that platform
 * symmetry is the whole reason this rail was chosen over raw FCM/APNs, where
 * iOS would hand back a 64-hex APNs token that FCM cannot deliver to.
 *
 * Strict on purpose. `expo-server-sdk`'s own `isExpoPushToken` also accepts a
 * bare UUID (a legacy form nothing in this product emits) and does not look at
 * the payload between the brackets at all; a validator that waves through
 * `ExponentPushToken[]` or `ExponentPushToken[{"endpoint":…}]` is no better
 * than no validator. We require a non-empty URL-safe body of plausible length.
 */
export function isExpoPushToken(token: string): boolean {
  const t = token?.trim() ?? '';
  if (t.length > 256) return false;
  return /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{16,128}\]$/.test(t);
}

/**
 * Is this a device-push token we can actually deliver to, on either rail?
 *
 * This is what the write path (`POST /notifications/register-token`) must use.
 * It is the union of two STRICT validators, never a loosened one: a Web Push
 * endpoint URL, a serialised PushSubscription, an empty bracket pair and a raw
 * APNs token are all still refused.
 */
export function isPushToken(token: string): boolean {
  return isExpoPushToken(token) || isFcmRegistrationToken(token);
}

interface ExpoTicket {
  status?: string;
  message?: string;
  details?: { error?: string };
}

/**
 * Send one message through the Expo Push Service.
 *
 * Expo answers 200 with a *ticket* even for per-message failures, so the status
 * code alone proves nothing — the ticket has to be read. Classification follows
 * the same NOTIF-07 rule as the FCM path: only a genuinely dead device is
 * `expired` (the caller deletes those rows); a token/credential problem is
 * `invalidToken`/`error` and the row is KEPT so the bug stays diagnosable.
 */
export async function sendExpoPush(token: string, payload: FcmPayload): Promise<FcmSendResult> {
  if (!expoEnabled) return { ok: false, skipped: true };
  if (!isExpoPushToken(token)) {
    return {
      ok: false,
      invalidToken: true,
      error: `not an Expo push token (${maskToken(token)})`,
    };
  }
  try {
    const headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
    };
    if (expoAccessToken) headers.authorization = `Bearer ${expoAccessToken}`;
    const resp = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default',
        priority: 'high',
        // Must match the channel apps/mobile creates in lib/push-notifications.ts,
        // or Android 8+ drops the notification silently.
        channelId: 'default',
      }),
    });
    const text = await resp.text();
    if (!resp.ok) {
      return {
        ok: false,
        error: `Expo push ${resp.status} ${maskToken(token)}: ${text.slice(0, 200)}`,
      };
    }
    let parsed: { data?: ExpoTicket | ExpoTicket[]; errors?: Array<{ message?: string }> };
    try {
      parsed = JSON.parse(text || '{}');
    } catch {
      return {
        ok: false,
        error: `Expo push returned non-JSON for ${maskToken(token)}: ${text.slice(0, 200)}`,
      };
    }
    if (parsed.errors?.length) {
      return {
        ok: false,
        error: `Expo push request error ${maskToken(token)}: ${parsed.errors[0]?.message ?? 'unknown'}`,
      };
    }
    const ticket = Array.isArray(parsed.data) ? parsed.data[0] : parsed.data;
    if (!ticket) {
      return { ok: false, error: `Expo push returned no ticket for ${maskToken(token)}` };
    }
    if (ticket.status === 'ok') return { ok: true };
    const code = ticket.details?.error ?? '';
    // The app was uninstalled or the token rotated — the device is gone.
    if (code === 'DeviceNotRegistered') return { ok: false, expired: true };
    // MismatchSenderId / InvalidCredentials are OUR configuration being wrong
    // (wrong FCM service account or APNs key on the EAS project). Deleting the
    // row would hide a misconfiguration behind an empty audience.
    return {
      ok: false,
      error: `Expo push ${code || 'error'} ${maskToken(token)}: ${(ticket.message ?? '').slice(0, 200)}`,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Send one device push, choosing the rail from the token's SHAPE.
 *
 * Kept under the historical name because every caller (jobs/aarti-notify.ts,
 * routes/notifications.ts) already imports it; the rail is an implementation
 * detail of the stored token, not of the call site.
 */
export async function sendFcm(token: string, payload: FcmPayload): Promise<FcmSendResult> {
  // Rail 1 first: an Expo token must NOT be gated on the FCM service-account
  // env, which it does not use. Gating it there would reproduce the original
  // defect one layer down — a registered phone with a silently skipped send.
  if (token && isExpoPushToken(token)) return sendExpoPush(token.trim(), payload);
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
  // Only "everything here is a dark rail-2 send" is a skip. One Expo token in
  // the batch is deliverable with no FCM credentials at all, and sendFcm below
  // still returns `skipped` per-token for the rail-2 rows (never counted as
  // `failed`), so mixed batches stay honest.
  if (!enabled && !tokens.some((t) => isExpoPushToken(t))) {
    return { sent: 0, expired: [], invalid: [], failed: 0, skipped: true };
  }
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

/** Rail 2 (raw FCM HTTP v1) credential state. Reported by /health/channels. */
export const fcmConfig = { enabled, projectId };

/**
 * Rail 1 (Expo Push Service) state. `enabled` is always true — the endpoint
 * needs no server credentials — so this says "this service CAN call Expo", not
 * "push is fully provisioned". Whether Expo can then reach FCM/APNs depends on
 * credentials held in the EAS project, which this service cannot observe.
 */
export const expoPushConfig = {
  enabled: expoEnabled,
  endpoint: EXPO_PUSH_ENDPOINT,
  enhancedSecurity: !!expoAccessToken,
};
