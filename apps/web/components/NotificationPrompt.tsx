'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from '../lib/api-config';
import { useAuth } from '../lib/auth-context';

import { buttonClass } from '../components/ui/button-recipe';
/**
 * Web push subscription prompt. Three states:
 *   - hidden: feature unsupported, user dismissed today, or already subscribed
 *   - prompt: show "Enable notifications" CTA
 *   - error:  permission denied or subscription failed
 *
 * The CTA only appears for signed-in users (`useAuth().isAuthenticated`).
 * Anonymous visitors don't see it — push without an account is just spam.
 *
 * Dismissals are stored in localStorage (`darshya_push_dismissed_at`)
 * and respected for 7 days. After that we show the prompt again.
 */

const DISMISS_KEY = 'darshya_push_dismissed_at';
const DISMISS_DAYS = 7;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

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
 * MEMORY ONLY — has no such key, so it failed the probe and was never
 * prompted, even though the app knows exactly who it is.
 *
 * `useAuth()` answers both questions from one owner. `credentials: 'include'`
 * (the default inside `fetchWithTimeout`) is the other half: the API is a
 * different ORIGIN, `fetch` defaults to 'same-origin', and without it the
 * cookie that authenticates a token-free browser is never sent.
 */

function isDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? '0');
    if (!at) return false;
    const days = (Date.now() - at) / (1000 * 60 * 60 * 24);
    return days < DISMISS_DAYS;
  } catch {
    return false;
  }
}

export function NotificationPrompt() {
  const { session, isAuthenticated } = useAuth();
  const token = session?.accessToken;
  const [state, setState] = useState<'hidden' | 'prompt' | 'busy' | 'error'>('hidden');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;
    if (!isAuthenticated) return;
    if (isDismissed()) return;
    // Brief delay so we don't slam the user on first paint
    const t = window.setTimeout(() => setState('prompt'), 4000);
    return () => window.clearTimeout(t);
    // Re-run when the session settles: auth-context resolves asynchronously
    // (it may have to revive from the cookie first), so on a signed-in browser
    // the first pass through this effect legitimately sees `false`.
  }, [isAuthenticated]);

  const enable = async () => {
    setState('busy');
    try {
      if (!isAuthenticated) throw new Error('Sign in to enable notifications');

      const keyRes = await fetch(`${API_BASE_URL}/notifications/vapid-public-key`);
      const keyData = (await keyRes.json()) as { publicKey?: string; enabled?: boolean };
      if (!keyData.enabled || !keyData.publicKey) {
        throw new Error('Push notifications are not configured on the server yet');
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error(
          permission === 'denied'
            ? 'Permission denied — enable in browser settings to receive notifications'
            : 'Permission not granted',
        );
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey) as BufferSource,
      });

      const subRes = await fetchWithTimeout(
        `${API_BASE_URL}/notifications/subscribe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        },
        DATA_FETCH_TIMEOUT_MS,
      );
      if (!subRes.ok) throw new Error('Server rejected subscription');

      setState('hidden');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not enable notifications');
      setState('error');
      // Persist dismiss so denied users aren't re-prompted on every navigation
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
      // Auto-hide error toast after 6s — it's informational, not actionable
      window.setTimeout(() => setState('hidden'), 6000);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setState('hidden');
  };

  if (state === 'hidden') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-saffron-200 bg-white shadow-lg p-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 text-surface-400 hover:text-surface-700"
      >
        <X className="w-4 h-4" />
      </button>
      {state === 'error' ? (
        <div className="flex gap-3">
          <BellOff className="w-5 h-5 text-saffron-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-surface-800">Could not enable notifications</p>
            <p className="text-xs text-surface-500 mt-1">{errorMsg}</p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <Bell className="w-5 h-5 text-saffron-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-surface-800">Get darshan & festival reminders</p>
            <p className="text-xs text-surface-500 mt-1">
              We'll notify you when your puja goes live and on auspicious days.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={enable}
                disabled={state === 'busy'}
                className={buttonClass('primary', 'md')}
              >
                {state === 'busy' ? 'Enabling…' : 'Enable'}
              </button>
              <button
                onClick={dismiss}
                className="text-xs font-medium px-3 py-1.5 rounded-md text-surface-600 hover:bg-surface-100"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
