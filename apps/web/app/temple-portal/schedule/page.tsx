'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Save, Plus, Trash2, ArrowLeft, Clock } from 'lucide-react';

/**
 * Temple manager schedule self-edit. Mirrors /admin/temples/[slug] from Layer K3
 * but scoped to the temple this user manages (currently passed via ?slug=...).
 *
 * Once Temple has a manager relation in schema, the slug resolves via
 * request.currentUser. Today: pick from dropdown of temples user can manage,
 * defaulting to query param.
 */

type TimingsForm = {
  closedOn?: string;
  specialDays?: string;
  regularHours: { key: string; value: string }[];
};

const HH_MM_RANGE = /^\s*(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*$/;

export default function TempleScheduleEditor() {
  const [slug, setSlug] = useState<string | null>(null);
  const [form, setForm] = useState<TimingsForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get('slug') || (typeof window !== 'undefined' ? window.localStorage.getItem('temple_portal_slug') : null);
    if (s) setSlug(s);
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/v1/temple-portal/schedule?slug=${encodeURIComponent(slug)}`, { credentials: 'include' })
      .then((r) => r.ok ? r.json() : Promise.reject(r))
      .then((data) => {
        const ti = data?.timingInfo ?? {};
        const rh = ti.regularHours && typeof ti.regularHours === 'object' ? ti.regularHours : {};
        setForm({
          closedOn: ti.closedOn ?? '',
          specialDays: ti.specialDays ?? '',
          regularHours: Object.entries(rh).map(([k, v]) => ({ key: k, value: String(v) })),
        });
      })
      .catch(() => setToast('Failed to load schedule. You may not manage this temple.'));
  }, [slug]);

  function updateRow(i: number, patch: Partial<{ key: string; value: string }>) {
    if (!form) return;
    const rh = [...form.regularHours];
    rh[i] = { ...rh[i]!, ...patch };
    setForm({ ...form, regularHours: rh });
  }

  function addRow() {
    if (!form) return;
    setForm({ ...form, regularHours: [...form.regularHours, { key: '', value: '' }] });
  }

  function removeRow(i: number) {
    if (!form) return;
    setForm({ ...form, regularHours: form.regularHours.filter((_, idx) => idx !== i) });
  }

  function validate(): boolean {
    if (!form) return false;
    const next: Record<number, string> = {};
    form.regularHours.forEach((row, i) => {
      if (!row.key.trim()) next[i] = 'Slot name required';
      else if (!HH_MM_RANGE.test(row.value)) next[i] = 'Format must be HH:MM - HH:MM';
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!form || !slug) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const regularHours: Record<string, string> = {};
      for (const r of form.regularHours) regularHours[r.key.trim()] = r.value.trim();
      const res = await fetch(`/api/v1/temple-portal/schedule?slug=${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regularHours, closedOn: form.closedOn || null, specialDays: form.specialDays || null }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setToast('Schedule saved');
    } catch (err) {
      setToast(`Save failed: ${(err as Error).message}`);
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
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Aarti & Darshan Schedule</h1>
      <p className="text-sm text-surface-500 mb-6">Edit live darshan windows. Devotees see "Live" / "Next Aarti" badges based on these timings.</p>

      {!slug && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No temple selected. Add <code>?slug=&lt;your-temple&gt;</code> to the URL.
        </div>
      )}

      {form && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Closed on (e.g. "Open all days" or "Mondays")</label>
            <input
              type="text"
              value={form.closedOn ?? ''}
              onChange={(e) => setForm({ ...form, closedOn: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-600 mb-1">Special days (e.g. "Shivaratri extended hours")</label>
            <input
              type="text"
              value={form.specialDays ?? ''}
              onChange={(e) => setForm({ ...form, specialDays: e.target.value })}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-surface-700 mb-2">Regular Hours</h2>
            <p className="text-xs text-surface-500 mb-3">Slot name uses camelCase (e.g. mangalaAarti). Time format: HH:MM - HH:MM (24h).</p>
            <div className="space-y-2">
              {form.regularHours.map((row, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder="mangalaAarti"
                    value={row.key}
                    onChange={(e) => updateRow(i, { key: e.target.value })}
                    className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="03:00 - 04:00"
                    value={row.value}
                    onChange={(e) => updateRow(i, { value: e.target.value })}
                    className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm font-mono"
                  />
                  <button type="button" onClick={() => removeRow(i)} className="rounded-lg p-2 text-surface-500 hover:bg-red-50 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {Object.entries(errors).map(([i, msg]) => (
                <div key={i} className="text-xs text-red-600 ml-1">Row {Number(i) + 1}: {msg}</div>
              ))}
            </div>
            <button type="button" onClick={addRow} className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-surface-700 hover:border-saffron-300 hover:text-saffron-700">
              <Plus className="w-3 h-3" /> Add slot
            </button>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 hover:bg-saffron-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save schedule'}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 rounded-lg bg-surface-800 text-white text-sm px-4 py-2 shadow-warm-md flex items-center gap-2">
          <Clock className="w-4 h-4" /> {toast}
        </div>
      )}
    </div>
  );
}
