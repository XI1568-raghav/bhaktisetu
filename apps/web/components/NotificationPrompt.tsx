'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { API_BASE_URL } from '../lib/api-config';

import { buttonClass } from '../components/ui/button-recipe';
/**
 * Web push subscription prompt. Three states:
 *   - hidden: feature unsupported, user dismissed today, or already subscribed
 *   - prompt: show "Enable notifications" CTA
 *   - error:  permission denied or subscription failed
 *
 * The CTA only appears for signed-in users (we read `poojly_session`
 * from localStorage). Anonymous visitors don't see it — push without an
 * account is just spam.
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

function getAccessToken(): string | null {
  try {
    const raw = localStorage.getItem('poojly_session');
    if (!raw) return null;
    return JSON.parse(raw)?.accessToken ?? null;
  } catch {
    return null;
  }
}

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
  const [state, setState] = useState<'hidden' | 'prompt' | 'busy' | 'error'>('hidden');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;
    if (!getAccessToken()) return;
    if (isDismissed()) return;
    // Brief delay so we don't slam the user on first paint
    const t = window.setTimeout(() => setState('prompt'), 4000);
    return () => window.clearTimeout(t);
  }, []);

  const enable = async () => {
    setState('busy');
    try {
      const token = getAccessToken();
      if (!token) throw new Error('Sign in to enable notifications');

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

      const subRes = await fetch(`${API_BASE_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
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
