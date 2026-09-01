'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from '../lib/api-config';
import { useAuth } from '../lib/auth-context';
import { UserFacingError, userFacingMessage } from '../lib/friendly-error';

import { buttonClass } from '../components/ui/button-recipe';
/**
 * AartiOptIn — toggle that requests browser notification permission, registers
 * the device with FCM (web push via firebase-messaging or VAPID fallback),
 * and persists `aartiOptIn` on the device row.
 *
 * For the web build we use the existing service worker / PushManager flow
 * to obtain a subscription endpoint, then submit it as a "deviceToken" string
 * to the API. (Native iOS / Android apps will pass real FCM tokens from the
 * Firebase SDK directly.)
 *
 * Anonymous visitors get a sign-in CTA. We never push without an account.
 */

const STORAGE_KEY = 'darshya_aarti_opt_in';

/**
 * SEC-02 step 3 — this file used to hand-build its own Bearer from
 * `localStorage['poojly_session'].accessToken`, and used the presence of that
 * value as its "is anyone signed in" test.
 *
 * Both were wrong for the same reason. Six files read that key by hand, and
 * between them they are what keeps the access token in localStorage:
 * lib/auth-context cannot stop WRITING it while surfaces outside that module
 * read it directly. And a browser revived from the httpOnly `darshya_session`
 * cookie — which lib/auth-context does today, keeping the revived session in
 * MEMORY ONLY — has no such key, so it failed the probe and was treated as
 * anonymous even though the app knows exactly who it is.
 *
 * `useAuth()` answers both questions from one owner. `credentials: 'include'`
 * (the default inside `fetchWithTimeout`) is the other half: the API is a
 * different ORIGIN, `fetch` defaults to 'same-origin', and without it the
 * cookie that authenticates a token-free browser is never sent.
 */

function detectPlatform(): 'web' | 'ios' | 'android' {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'web';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

interface AartiOptInProps {
  variant?: 'inline' | 'card';
}

export default function AartiOptIn({ variant = 'card' }: AartiOptInProps) {
  const { session, isAuthenticated } = useAuth();
  const token = session?.accessToken;
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setOptedIn(localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      setOptedIn(false);
    }
  }, []);

  const enable = async () => {
    setBusy(true);
    setError('');
    try {
      // RES-09: these three are copy the PRODUCT wrote for a user, so they
      // must reach the screen unchanged. A bare Error would be classified as
      // unrecognised and replaced by the generic fallback below.
      if (!isAuthenticated) throw new UserFacingError('Sign in to enable aarti reminders');
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new UserFacingError('This browser does not support push notifications');
      }

      // Reuse the VAPID key endpoint as the application server key for web
      // push. For native FCM clients (iOS/Android), the SDK will provide a
      // real FCM registration token — the API treats both as opaque strings.
      const keyRes = await fetch(`${API_BASE_URL}/notifications/vapid-public-key`);
      const keyData = (await keyRes.json()) as { publicKey?: string; enabled?: boolean };
      if (!keyData.enabled || !keyData.publicKey) {
        throw new UserFacingError('Notifications are not configured on the server yet');
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new UserFacingError(
          permission === 'denied'
            ? 'Notifications are blocked for this site. Allow them in your browser settings to get aarti reminders.'
            : 'We need notification permission to send aarti reminders.',
        );
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as BufferSource,
      });

      // The endpoint is unique per browser+keypair — use it as the deviceToken.
      const subJson = sub.toJSON();
      const deviceToken = subJson.endpoint || JSON.stringify(subJson);

      const resp = await fetchWithTimeout(
        `${API_BASE_URL}/notifications/register-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            deviceToken,
            platform: detectPlatform(),
            language: navigator.language?.slice(0, 2),
            aartiOptIn: true,
          }),
        },
        DATA_FETCH_TIMEOUT_MS,
      );
      if (!resp.ok) throw new UserFacingError('We could not register this device for reminders.', resp.status);

      localStorage.setItem(STORAGE_KEY, '1');
      setOptedIn(true);
    } catch (err) {
      // RES-09 class: `Server rejected token` and the browser's own
      // "Failed to fetch" used to render straight into the control.
      setError(userFacingMessage(err, 'We could not turn on aarti reminders. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError('');
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      const deviceToken = sub?.endpoint;
      if (deviceToken) {
        await fetchWithTimeout(
          `${API_BASE_URL}/notifications/unregister-token`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ deviceToken }),
          },
          DATA_FETCH_TIMEOUT_MS,
        );
      }
      try {
        await sub?.unsubscribe();
      } catch {
        /* ignore */
      }
      localStorage.removeItem(STORAGE_KEY);
      setOptedIn(false);
    } catch (err) {
      setError(userFacingMessage(err, 'We could not turn off aarti reminders. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  if (optedIn === null) return null;

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={optedIn ? disable : enable}
        disabled={busy}
        className="inline-flex items-center gap-2 text-sm font-medium text-saffron-700 hover:text-saffron-900 disabled:opacity-50"
      >
        {optedIn ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        {busy ? 'Working…' : optedIn ? 'Aarti reminders on' : 'Notify me 15 min before aarti'}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-saffron-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <Bell className="w-5 h-5 text-saffron-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-surface-800">15-minute aarti reminders</p>
          <p className="text-xs text-surface-500 mt-1">
            Get a push 15 min before each live aarti at temples you follow.
          </p>
          {error ? <p className="text-xs text-red-600 mt-2">{error}</p> : null}
          <button
            type="button"
            onClick={optedIn ? disable : enable}
            disabled={busy}
            className={buttonClass('primary', 'md', 'mt-3')}
          >
            {busy ? 'Working…' : optedIn ? 'Turn off' : 'Enable reminders'}
          </button>
        </div>
      </div>
    </div>
  );
}
