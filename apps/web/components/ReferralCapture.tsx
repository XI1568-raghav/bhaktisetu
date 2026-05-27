'use client';

import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '../lib/api-config';
import { useAuth } from '../lib/auth-context';

const COOKIE_NAME = 'darshya_ref';
const COOKIE_DAYS = 30;
const CLAIM_FLAG = 'darshya_ref_claimed';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.$?*|{}()[\]\\/+^]/g, '\\$&')}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]!) : null;
}

function writeCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

// Captures ?ref=CODE on any page into a 30-day cookie, then auto-calls
// /referrals/claim once the user authenticates. Idempotent — the claim
// endpoint itself dedupes and the localStorage flag prevents repeated
// network calls in the same browser.
export function ReferralCapture(): null {
  const { session, isAuthenticated } = useAuth();
  const claimedRef = useRef(false);

  // 1. Capture ?ref=CODE into the cookie on first render.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    if (!code) return;
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
    if (clean.length < 4) return;
    const existing = readCookie(COOKIE_NAME);
    // Last-touch wins — overwrite if newer ?ref= present.
    if (existing !== clean) {
      writeCookie(COOKIE_NAME, clean, COOKIE_DAYS);
      // New code → reset the claim flag so the next signed-in user can claim it.
      try { window.localStorage.removeItem(CLAIM_FLAG); } catch { /* ignore */ }
    }
  }, []);

  // 2. Once authenticated, fire-and-forget /claim. Demo tokens skipped —
  // the API won't accept them.
  useEffect(() => {
    if (!isAuthenticated || !session?.accessToken) return;
    if (session.accessToken.startsWith('demo-')) return;
    if (claimedRef.current) return;

    const code = readCookie(COOKIE_NAME);
    if (!code) return;

    let alreadyForThisUser = false;
    try {
      alreadyForThisUser = window.localStorage.getItem(CLAIM_FLAG) === code;
    } catch { /* ignore */ }
    if (alreadyForThisUser) return;

    claimedRef.current = true;
    fetch(`${API_BASE_URL}/referrals/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ code }),
    })
      .then((res) => res.json().then((j) => ({ status: res.status, body: j })))
      .then(({ status, body }) => {
        // 201 created, 200 already-claimed, 400 self-referral all "done".
        if (status === 201 || status === 200 || status === 400) {
          try { window.localStorage.setItem(CLAIM_FLAG, code); } catch { /* ignore */ }
        }
        // Surface to PostHog if available (lazy import — keeps bundle thin).
        if (status === 201 && body?.status) {
          import('../lib/posthog')
            .then((m) => m.capture('referral_claim_signed_up', { code }))
            .catch(() => { /* ignore */ });
        }
      })
      .catch(() => { /* network error — try again next session */ });
  }, [isAuthenticated, session?.accessToken]);

  return null;
}
