'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from '../../../lib/api-config';
import { serverErrorMessage } from '../../../lib/friendly-error';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';

interface RosterRow {
  id: string;
  priestId: string;
  displayName: string;
  isPrimary: boolean;
}
interface InvitationRow {
  id: string;
  priestId: string;
  displayName: string;
  isPrimary: boolean;
  status: 'pending' | 'declined';
}
interface PanditOption {
  id: string;
  displayName: string;
  specializations?: string[];
  experienceYears?: number;
  invited?: boolean;
}

/**
 * The temple's pandit roster. A manager can only INVITE a pandit: they appear
 * under "On your roster" once they accept, and until then they are shown as
 * "Invited — waiting for the pandit".
 */
export default function TemplePriestsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [pandits, setPandits] = useState<PanditOption[]>([]);
  const [panditsFailed, setPanditsFailed] = useState(false);
  const [selected, setSelected] = useState('');
  const [primary, setPrimary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/temple-portal/priests`,
        { headers: { Authorization: `Bearer ${token}` } },
        DATA_FETCH_TIMEOUT_MS,
      );
      if (!res.ok) throw new Error('bad status');
      const data = await res.json();
      setRoster(data.priests ?? []);
      setInvitations(data.invitations ?? []);
      // The picker lists every live pandit not yet on the roster. It is a
      // separate request so a failure here never hides the roster itself.
      try {
        const cRes = await fetchWithTimeout(
          `${API_BASE_URL}/temple-portal/priests/candidates`,
          { headers: { Authorization: `Bearer ${token}` } },
          DATA_FETCH_TIMEOUT_MS,
        );
        if (!cRes.ok) throw new Error('bad status');
        const cData = await cRes.json();
        setPandits(cData.candidates ?? []);
        setPanditsFailed(false);
      } catch {
        setPandits([]);
        setPanditsFailed(true);
      }
    } catch {
      setError('We could not load your roster. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite() {
    if (!selected || !headers) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/temple-portal/priests`,
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ priestId: selected, isPrimary: primary }),
        },
        DATA_FETCH_TIMEOUT_MS,
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice(serverErrorMessage(body, 'We could not send the invitation.'));
      } else {
        setNotice('Invitation sent. The pandit joins your roster only after they accept.');
        setSelected('');
        setPrimary(false);
      }
      await load();
    } catch {
      setNotice('We could not send the invitation. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(path: string, confirmText?: string) {
    if (!headers) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setNotice(null);
    try {
      const res = await fetchWithTimeout(
        `${API_BASE_URL}/temple-portal/priests/${path}`,
        { method: 'DELETE', headers },
        DATA_FETCH_TIMEOUT_MS,
      );
      if (!res.ok) setNotice('We could not remove that. Please try again.');
      await load();
    } catch {
      setNotice('We could not remove that. Please try again.');
    }
  }

  const onRosterIds = new Set(roster.map((r) => r.priestId));
  const options = pandits.filter((p) => !onRosterIds.has(p.id));
  const selectedOption = options.find((p) => p.id === selected);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className={H1.portal}>Pandits</h1>
        <p className="mt-0.5 text-sm text-surface-500">
          Invite pandits to your temple. They join your roster only when they accept.
        </p>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-surface-700">{notice}</p>}

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-4">
        <h2 className="text-sm font-semibold text-surface-800">Invite a pandit</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            aria-label="Pandit"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="min-w-[14rem] rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          >
            <option value="">Choose a pandit…</option>
            {options.map((p) => (
              <option key={p.id} value={p.id} disabled={p.invited}>
                {p.displayName}
                {p.specializations && p.specializations.length > 0 ? ` — ${p.specializations.slice(0, 2).join(', ')}` : ''}
                {p.invited ? ' (already invited)' : ''}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-surface-700">
            <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} />
            Ask them to be the primary pandit
          </label>
          <button type="button" disabled={!selected || busy} onClick={invite} className={buttonClass('primary', 'md')}>
            {busy ? 'Sending…' : 'Send invitation'}
          </button>
        </div>
        {!loading && panditsFailed && (
          <p className="prose-meta mt-2 text-red-700">We could not load the list of pandits. Reload the page to try again.</p>
        )}
        {!loading && !panditsFailed && options.length === 0 && (
          <p className="prose-meta mt-2 text-surface-500">
            There is no pandit to invite right now. Pandits show up here once they have a live pandit account on Darshya.
          </p>
        )}
        {selectedOption && (
          <p className="prose-meta mt-2 text-surface-500">
            {selectedOption.displayName} gets your invitation on their pandit dashboard and joins your roster only if they accept.
          </p>
        )}
      </section>

      <section className="rounded-xl border border-[var(--color-border)] bg-white p-4">
        <h2 className="text-sm font-semibold text-surface-800">On your roster</h2>
        {loading ? (
          <p className="mt-3 text-sm text-surface-500">Loading…</p>
        ) : roster.length === 0 ? (
          <p className="mt-3 text-sm text-surface-500">No pandits have accepted yet. Invite one above; once they accept, you can assign them to your pujas.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-border)]">
            {roster.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {r.displayName}
                  {r.isPrimary && <span className="ml-2 rounded bg-saffron-50 px-1.5 py-0.5 text-xs text-saffron-700">Primary</span>}
                  <span className="ml-2 text-xs text-green-700">On your roster</span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(r.id, `Remove ${r.displayName} from your roster? Any puja offering assigned to them will have its pandit cleared.`)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {invitations.length > 0 && (
        <section className="rounded-xl border border-[var(--color-border)] bg-white p-4">
          <h2 className="text-sm font-semibold text-surface-800">Invitations</h2>
          <ul className="mt-3 divide-y divide-[var(--color-border)]">
            {invitations.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {i.displayName}
                  <span className={`ml-2 text-xs ${i.status === 'pending' ? 'text-amber-700' : 'text-surface-500'}`}>
                    {i.status === 'pending' ? 'Invited — waiting for the pandit' : 'Declined by the pandit'}
                  </span>
                </span>
                <button type="button" onClick={() => remove(`invites/${i.id}`)} className="text-xs text-surface-600 hover:underline">
                  {i.status === 'pending' ? 'Withdraw' : 'Dismiss'}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
