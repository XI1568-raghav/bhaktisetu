'use client';

/**
 * Weekly-digest unsubscribe landing page (devotee revamp 2026-08-05).
 *
 * The digest email links to /account/digest/unsubscribe?u=<userId>, but no such
 * page existed — the link 404'd. This page reads the user id, POSTs to
 * /api/v1/digest/unsubscribe, and confirms. The link is meant to work from an
 * email while signed out, so no AuthGuard.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../../../lib/api-config';

function UnsubscribeContent() {
  const params = useSearchParams();
  const userId = params.get('u');
  const [state, setState] = useState<'loading' | 'done' | 'invalid' | 'error'>('loading');

  useEffect(() => {
    if (!userId) {
      setState('invalid');
      return;
    }
    fetch(`${API_BASE_URL}/digest/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
      .then((r) => setState(r.ok ? 'done' : 'error'))
      .catch(() => setState('error'));
  }, [userId]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-surface-100 p-8 text-center shadow-warm-sm">
        {state === 'loading' && <p className="text-surface-600">Updating your preference…</p>}
        {state === 'done' && (
          <>
            <h1 className="text-xl font-semibold text-surface-800 mb-2">You're unsubscribed</h1>
            <p className="text-surface-600">
              You'll no longer receive the weekly Darshya digest. You can re-enable it anytime from
              your profile settings.
            </p>
          </>
        )}
        {state === 'invalid' && (
          <>
            <h1 className="text-xl font-semibold text-surface-800 mb-2">Invalid link</h1>
            <p className="text-surface-600">This unsubscribe link is missing its identifier.</p>
          </>
        )}
        {state === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-surface-800 mb-2">Something went wrong</h1>
            <p className="text-surface-600">We couldn't update your preference just now. Please try again.</p>
          </>
        )}
        <a href="/" className="mt-6 inline-block text-saffron-600 font-medium hover:text-saffron-700">
          Back to Darshya
        </a>
      </div>
    </div>
  );
}

export default function DigestUnsubscribePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center">Loading…</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
