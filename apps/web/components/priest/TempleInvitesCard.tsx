'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Check, X } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from '../../lib/api-config';
import { serverErrorMessage } from '../../lib/friendly-error';
import { takeWarmed } from '../../lib/warm-get';
import { buttonClass } from '../ui/button-recipe';

interface TempleInvite {
  id: string;
  templeName: string;
  templeCity: string;
  isPrimary: boolean;
}

/**
 * Pending "join our roster" invitations from temples. A temple manager can only
 * invite a pandit; nothing links the pandit to the temple until they accept
 * here. Renders nothing when there is nothing to answer, and says so plainly
 * when the check itself failed (an unseen invitation must not look like none).
 */
export default function TempleInvitesCard() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [invites, setInvites] = useState<TempleInvite[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      // The portal page starts this request with the dashboard (lib/warm-get.ts); use it when present.
      const url = `${API_BASE_URL}/priest/temple-invites`;
      const warmed = takeWarmed(url, token);
      const res = warmed
        ? await warmed
        : await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${token}` } }, DATA_FETCH_TIMEOUT_MS);
      // 403 = no active pandit account yet (or it was suspended): there is nothing to
      // show yet, and that is not a failure worth a banner.
      if (res.status === 403) {
        setInvites([]);
        setLoadFailed(false);
        return;
      }
      if (!res.ok) throw new Error('bad status');
      const data = (await res.json()) as { invites?: TempleInvite[] };
      setInvites(data.invites ?? []);
      setLoadFailed(false);
    } catch {
      setLoadFailed(true);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function answer(id: string, action: 'accept' | 'decline') {
    if (!token) return;
    setBusyId(id);
    setMessage(null);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/priest/temple-invites/${id}/${action}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        DATA_FETCH_TIMEOUT_MS,
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setMessage(serverErrorMessage(body, 'We could not save your answer. Please try again.'));
      } else {
        setMessage(typeof body?.message === 'string' ? body.message : null);
      }
      await load();
    } catch {
      setMessage('We could not save your answer. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  if (loadFailed && invites === null) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        We could not check for temple invitations right now.
      </p>
    );
  }
  if (!invites || (invites.length === 0 && !message)) return null;

  return (
    <section aria-label="Temple invitations" className="rounded-xl border border-saffron-200 bg-saffron-50/50 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-800">
        <Building2 className="h-4 w-4 text-saffron-700" /> Temple invitations
      </h2>
      {message && <p role="status" className="mt-2 text-xs text-surface-600">{message}</p>}
      <ul className="mt-3 space-y-3">
        {invites.map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-surface-800">{inv.templeName}</p>
              <p className="text-xs text-surface-500">
                {inv.templeCity}
                {inv.isPrimary ? ' · asks you to be its primary pandit' : ''}
              </p>
              <p className="text-xs text-surface-500">
                This temple asked you to join its roster. You are only added if you accept.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busyId === inv.id}
                onClick={() => answer(inv.id, 'accept')}
                className={buttonClass('primary', 'sm')}
              >
                <Check className="h-3 w-3" /> Accept
              </button>
              <button
                type="button"
                disabled={busyId === inv.id}
                onClick={() => answer(inv.id, 'decline')}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-surface-700 hover:bg-surface-50 disabled:opacity-50"
              >
                <X className="h-3 w-3" /> Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
