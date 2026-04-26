import webpush from 'web-push';

/**
 * Web Push notifications via VAPID. Free, browser-native, no FCM
 * dependency. Works on Chrome, Edge, Firefox, Safari (16.4+ desktop
 * and iOS 16.4+ when added to home screen).
 *
 * Env vars:
 *   VAPID_PUBLIC_KEY   — generated via `npx web-push generate-vapid-keys`
 *   VAPID_PRIVATE_KEY  — paired private key
 *   VAPID_SUBJECT      — mailto: or https: URL identifying the app
 *
 * If keys are absent, sendPush is a no-op so the rest of the API works
 * unchanged in environments without push configured.
 */

const publicKey = process.env.VAPID_PUBLIC_KEY ?? '';
const privateKey = process.env.VAPID_PRIVATE_KEY ?? '';
const subject = process.env.VAPID_SUBJECT ?? 'mailto:support@darshya.online';

const enabled = !!(publicKey && privateKey);

if (enabled) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  tag?: string;
}

interface PushResult {
  ok: boolean;
  skipped?: boolean;
  expired?: boolean; // 404/410 — caller should delete this subscription
  error?: string;
}

export async function sendPush(
  subscription: PushSubscriptionPayload,
  payload: PushPayload,
): Promise<PushResult> {
  if (!enabled) return { ok: false, skipped: true };
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      TTL: 60 * 60 * 24, // 24h — drop if user offline that long
      urgency: 'normal',
    });
    return { ok: true };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      // Subscription gone — caller should remove from DB
      return { ok: false, expired: true };
    }
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const webPushConfig = { enabled, publicKey };
