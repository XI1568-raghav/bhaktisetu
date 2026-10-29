'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Save, Plus, Trash2, ArrowLeft, Clock } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { UserFacingError, serverErrorText, userFacingMessage } from '../../../lib/friendly-error';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';
import { API_BASE_URL } from '../../../lib/api-config';
import {
  SLOT_SUGGESTIONS,
  regularHoursFromRows,
  rowsFromRegularHours,
  validateRows,
  type RowIssue,
  type ScheduleRow,
} from '../../../lib/temple-schedule';

/**
 * Temple manager schedule self-edit. Mirrors /admin/temples/[slug] from Layer K3
 * but scoped to the temple this user manages. With no ?slug= the API resolves
 * the manager's own temple (same approved-profile name match as the dashboard)
 * and returns its slug, which the save call then uses.
 *
 * Slots are edited as a name ("Mangala Aarti") plus two time pickers. The
 * camelCase key and the "HH:MM - HH:MM" value the API stores are derived on save.
 */

type TimingsForm = {
  closedOn?: string;
  specialDays?: string;
  rows: ScheduleRow[];
};

const inputClass = 'w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm';

export default function TempleScheduleEditor() {
  const { session } = useAuth();
  const token = session?.accessToken;
  const [slug, setSlug] = useState<string | null>(null);
  const [templeName, setTempleName] = useState<string | null>(null);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<TimingsForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<number, RowIssue>>({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams(window.location.search);
    const typed = params.get('slug');
    const qs = typed ? `?slug=${encodeURIComponent(typed)}` : '';
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/temple-portal/schedule${qs}`, {
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (r.status === 409) {
          const body = await r.json().catch(() => null);
          if (!cancelled) {
            setBlocker(
              typeof body?.message === 'string'
                ? body.message
                : 'Your temple is not linked to a listed temple yet.',
            );
          }
          return;
        }
        if (!r.ok) throw new Error('load failed');
        const data = await r.json();
        if (cancelled) return;
        setSlug(typeof data?.slug === 'string' ? data.slug : typed);
        setTempleName(typeof data?.name === 'string' ? data.name : null);
        const ti = data?.timingInfo ?? {};
        const rh = ti.regularHours && typeof ti.regularHours === 'object' ? ti.regularHours : {};
        setForm({
          closedOn: ti.closedOn ?? '',
          specialDays: ti.specialDays ?? '',
          rows: rowsFromRegularHours(rh),
        });
      } catch {
        if (!cancelled) setLoadError('We could not load your schedule. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const revalidate = useCallback((rows: ScheduleRow[], hadErrors: boolean) => {
    // Re-check as the manager fixes things, but stay quiet until they have
    // pressed Save once so a half-typed row is not shouted at.
    if (hadErrors) setIssues(validateRows(rows).errors);
  }, []);

  function updateRow(i: number, patch: Partial<ScheduleRow>) {
    if (!form) return;
    const rows = form.rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    setForm({ ...form, rows });
    revalidate(rows, Object.keys(issues).length > 0);
  }

  function addRow(name = '') {
    if (!form) return;
    setForm({ ...form, rows: [...form.rows, { name, start: '', end: '' }] });
  }

  function removeRow(i: number) {
    if (!form) return;
    const rows = form.rows.filter((_, idx) => idx !== i);
    setForm({ ...form, rows });
    setIssues({});
  }

  async function save() {
    if (!form || !slug) return;
    const check = validateRows(form.rows);
    setIssues(check.errors);
    if (!check.ok) {
      setToast('Fix the highlighted slots, then save again.');
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/temple-portal/schedule?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          regularHours: regularHoursFromRows(form.rows),
          closedOn: form.closedOn || null,
          specialDays: form.specialDays || null,
        }),
      });
      // RES-09: `Save failed: HTTP 500` was the toast a temple manager saw.
      if (!res.ok) {
        throw new UserFacingError(
          serverErrorText(await res.text().catch(() => ''), 'We could not save your schedule.'),
          res.status,
        );
      }
      setToast('Schedule saved');
    } catch (err) {
      setToast(userFacingMessage(err, 'We could not save your schedule. Please try again.'));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/temple-portal" className="inline-flex items-center gap-1 text-sm text-saffron-600 hover:text-saffron-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>
      <h1 className={`${H1.portal} mb-1`}>Aarti & Darshan Schedule</h1>
      <p className="text-sm text-surface-500 mb-6">Edit live darshan windows. Devotees see "Live" / "Next Aarti" badges based on these timings.</p>

      {templeName && <p className="text-sm font-medium text-surface-700 mb-4">{templeName}</p>}

      {blocker && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {blocker}
        </div>
      )}

      {loading && !blocker && <p className="text-sm text-surface-500">Loading your schedule…</p>}

      {loadError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}{' '}
          <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="font-medium underline hover:no-underline">
            Try again
          </button>
        </div>
      )}

      {form && (
        <div className="space-y-5">
          <div>
            <label htmlFor="sched-closed" className="block text-xs font-medium text-surface-600 mb-1">Closed on (e.g. "Open all days" or "Mondays")</label>
            <input
              id="sched-closed"
              type="text"
              value={form.closedOn ?? ''}
              onChange={(e) => setForm({ ...form, closedOn: e.target.value })}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="sched-special" className="block text-xs font-medium text-surface-600 mb-1">Special days (e.g. "Shivaratri extended hours")</label>
            <input
              id="sched-special"
              type="text"
              value={form.specialDays ?? ''}
              onChange={(e) => setForm({ ...form, specialDays: e.target.value })}
              maxLength={500}
              className={inputClass}
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-surface-700 mb-1">Regular Hours</h2>
            <p className="prose-meta text-surface-500 mb-3">
              One row per aarti or darshan window. Type a name such as "Mangala Aarti" and pick the start and end time
              (24-hour clock, Indian time).
            </p>
            <datalist id="slot-suggestions">
              {SLOT_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>

            {form.rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-white px-4 py-6 text-center" data-testid="schedule-empty">
                <Clock className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-surface-700">No timings added yet</p>
                <p className="prose-meta text-surface-500 mt-1">
                  Start with one of these, then set its times. Devotees see the Live badge during any slot with
                  &quot;Aarti&quot; in its name.
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {SLOT_SUGGESTIONS.slice(0, 4).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => addRow(s)}
                      className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-surface-700 hover:border-saffron-300 hover:text-saffron-700"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {form.rows.map((row, i) => {
                  const issue = issues[i];
                  return (
                    <li key={i} className="rounded-lg border border-[var(--color-border)] bg-white p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-start">
                        <div>
                          <label htmlFor={`slot-name-${i}`} className="sr-only">Slot {i + 1} name</label>
                          <input
                            id={`slot-name-${i}`}
                            type="text"
                            list="slot-suggestions"
                            placeholder="Slot name, e.g. Mangala Aarti"
                            value={row.name}
                            onChange={(e) => updateRow(i, { name: e.target.value })}
                            maxLength={60}
                            aria-invalid={Boolean(issue?.name)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label htmlFor={`slot-start-${i}`} className="sr-only">Slot {i + 1} start time</label>
                          <input
                            id={`slot-start-${i}`}
                            type="time"
                            value={row.start}
                            onChange={(e) => updateRow(i, { start: e.target.value })}
                            aria-invalid={Boolean(issue?.time)}
                            className={`${inputClass} sm:w-32`}
                          />
                        </div>
                        <div>
                          <label htmlFor={`slot-end-${i}`} className="sr-only">Slot {i + 1} end time</label>
                          <input
                            id={`slot-end-${i}`}
                            type="time"
                            value={row.end}
                            onChange={(e) => updateRow(i, { end: e.target.value })}
                            aria-invalid={Boolean(issue?.time)}
                            className={`${inputClass} sm:w-32`}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRow(i)}
                          aria-label={`Remove slot ${i + 1}`}
                          className="justify-self-end rounded-lg p-2 text-surface-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {issue?.name && <p role="alert" className="prose-meta text-red-700 mt-1.5">{issue.name}</p>}
                      {issue?.time && <p role="alert" className="prose-meta text-red-700 mt-1.5">{issue.time}</p>}
                      {!issue?.name && !issue?.time && issue?.note && (
                        <p className="prose-meta text-surface-500 mt-1.5">{issue.note}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" onClick={() => addRow()} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-surface-700 hover:border-saffron-300 hover:text-saffron-700">
              <Plus className="w-3 h-3" /> Add slot
            </button>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className={buttonClass('primary', 'md')}
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save schedule'}
          </button>
        </div>
      )}

      {toast && (
        <div role="status" className="fixed bottom-6 right-6 rounded-lg bg-surface-800 text-white text-sm px-4 py-2 shadow-warm-md flex items-center gap-2">
          <Clock className="w-4 h-4" /> {toast}
        </div>
      )}
    </div>
  );
}
