'use client';

/**
 * Admin temple editor. Temples created from a temple-manager profile start at
 * lat/lng 0, an empty pincode and "pending review"; devotees cannot book until
 * an admin fixes the location and verifies them. Every temple should also have
 * puja offerings, so a temple with none gets a one-click standard set.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Search } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
import { userFacingMessage } from '../../../lib/friendly-error';
import {
  FLAG_LABELS,
  addStandardOfferings,
  getAdminTemple,
  listAdminTemples,
  updateAdminTemple,
  type AdminTemple,
  type TempleEditInput,
} from './temples-api';
import { toForm, validateForm, type FormState } from './temple-form';
import { placeLabel } from '../../../lib/place-label';

const fieldCls = 'w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm';

export default function AdminTemplesPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminTemple[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [editing, setEditing] = useState<AdminTemple | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoadError(null);
      const r = await listAdminTemples(token, q);
      setRows(r.temples);
      setTotal(r.total);
    } catch (err) {
      setLoadError(userFacingMessage(err, 'Could not load temples.'));
    } finally {
      setLoading(false);
    }
  }, [token, q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  async function open(t: AdminTemple) {
    setActionError(null);
    setSuccess(null);
    setErrors({});
    setEditing(t);
    setForm(toForm(t));
    try {
      const full = await getAdminTemple(token, t.id);
      setEditing(full);
      setForm(toForm(full));
    } catch (err) {
      setActionError(userFacingMessage(err, 'Could not load this temple.'));
    }
  }

  async function run<T>(label: string, fn: () => Promise<T>, onOk: (r: T) => string) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(label);
    setActionError(null);
    setSuccess(null);
    try {
      const r = await fn();
      setSuccess(onOk(r));
      await load();
    } catch (err) {
      setActionError(userFacingMessage(err, 'That did not work.'));
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  }

  async function save() {
    if (!editing || !form) return;
    const errs = validateForm(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    const input: TempleEditInput = {
      name: form.name.trim(),
      description: form.description.trim(),
      deityPrimary: form.deityPrimary.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      lat: Number(form.lat),
      lng: Number(form.lng),
    };
    await run('save', () => updateAdminTemple(token, editing.id, input), (t) => {
      setEditing(t);
      setForm(toForm(t));
      return `${t.name} saved.`;
    });
  }

  async function toggleVerified() {
    if (!editing) return;
    const next = !editing.isVerified;
    await run('verify', () => updateAdminTemple(token, editing.id, { isVerified: next }), (t) => {
      setEditing(t);
      return next ? `${t.name} is verified and can now be booked.` : `${t.name} is no longer verified (pending review).`;
    });
  }

  async function standardOfferings() {
    if (!editing) return;
    await run('offerings', () => addStandardOfferings(token, editing.id), (r) => {
      void getAdminTemple(token, editing.id).then(setEditing).catch(() => undefined);
      return r.added > 0
        ? `Added ${r.added} standard offering${r.added === 1 ? '' : 's'}. ${editing.name} can now be booked.`
        : 'This temple already has all the standard offerings. Nothing changed.';
    });
  }

  const set = (k: keyof FormState) => (e: { target: { value: string } }) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  const flagged = (editing?.flags ?? []).filter(Boolean);

  return (
    <div>
      <h1 className={`${H1.portal} mb-1`}>Temples</h1>
      <p className="text-sm text-surface-500 mb-4">
        Fix a temple&apos;s details, verify it so devotees can book, and give it puja offerings. A temple needs a real
        location, a 6 digit pincode and at least one offering to be bookable.
      </p>

      {success && (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {(loadError || actionError) && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{actionError ?? loadError}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <section aria-label="Temples">
          <label className="relative block mb-3">
            <span className="sr-only">Search temples</span>
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-surface-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, city or slug"
              className={`${fieldCls} pl-9`}
            />
          </label>
          {loading ? (
            <p className="text-sm text-surface-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
          ) : rows.length === 0 && !loadError ? (
            <p className="text-sm text-surface-500">No temples match.</p>
          ) : (
            <>
              <p className="text-xs text-surface-500 mb-2">{total} temple{total === 1 ? '' : 's'}</p>
              <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                {rows.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => void open(t)}
                      aria-current={editing?.id === t.id}
                      className={`w-full text-left px-4 py-3 hover:bg-saffron-50 ${editing?.id === t.id ? 'bg-saffron-50' : ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-surface-800">{t.name}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            t.isVerified ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {t.isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-surface-500">
                        {placeLabel(t.city, t.state)} · {t.activeOfferings} offering{t.activeOfferings === 1 ? '' : 's'}
                      </div>
                      {t.flags.length > 0 && (
                        <div className="mt-1 text-xs text-red-700">
                          {t.flags.map((f) => FLAG_LABELS[f] ?? f).join(' · ')}
                        </div>
                      )}
                      {t.activeOfferings === 0 && (
                        <div className="mt-1 text-xs text-amber-700">No offerings: booking dead-ends</div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section aria-label="Edit temple">
          {!editing || !form ? (
            <p className="text-sm text-surface-500">Select a temple to edit it.</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <h2 className="text-lg font-semibold text-surface-800">{editing.name}</h2>
              <p className="text-xs text-surface-500">/{editing.slug}</p>
              {flagged.length > 0 && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  Fix before verifying: {flagged.map((f) => FLAG_LABELS[f] ?? f).join('; ')}.
                </div>
              )}

              {(
                [
                  ['name', 'Name'],
                  ['deityPrimary', 'Deity'],
                  ['addressLine', 'Address'],
                  ['city', 'City'],
                  ['state', 'State'],
                  ['pincode', 'Pincode (6 digits)'],
                  ['lat', 'Latitude (-90 to 90)'],
                  ['lng', 'Longitude (-180 to 180)'],
                ] as [keyof FormState, string][]
              ).map(([k, label]) => (
                <label key={k} className="block text-sm">
                  <span className="mb-1 block font-medium text-surface-700">{label}</span>
                  <input
                    value={form[k]}
                    onChange={set(k)}
                    inputMode={k === 'pincode' || k === 'lat' || k === 'lng' ? 'decimal' : undefined}
                    aria-invalid={Boolean(errors[k])}
                    className={fieldCls}
                  />
                  {errors[k] && <span className="mt-1 block text-xs text-red-700">{errors[k]}</span>}
                </label>
              ))}
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-surface-700">Description</span>
                <textarea value={form.description} onChange={set('description')} rows={3} className={fieldCls} />
                {errors.description && <span className="mt-1 block text-xs text-red-700">{errors.description}</span>}
              </label>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={busy !== null}
                  className={buttonClass('primary', 'md', 'disabled:opacity-60')}
                >
                  {busy === 'save' ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={() => void toggleVerified()}
                  disabled={busy !== null}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-surface-700 hover:bg-saffron-50 disabled:opacity-60"
                >
                  {busy === 'verify' ? 'Working…' : editing.isVerified ? 'Mark as not verified' : 'Verify temple'}
                </button>
                <button
                  type="button"
                  onClick={() => void standardOfferings()}
                  disabled={busy !== null}
                  className="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-surface-700 hover:bg-saffron-50 disabled:opacity-60"
                >
                  {busy === 'offerings' ? 'Adding…' : 'Add standard offerings'}
                </button>
              </div>
              <p className="text-xs text-surface-500">
                Verified: {editing.isVerified ? 'yes' : 'no'} · Active offerings: {editing.activeOfferings}. Standard
                offerings are five common pujas with no assigned priest, so bookings go to the open pandit pool. Existing
                offerings are never changed.
              </p>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
