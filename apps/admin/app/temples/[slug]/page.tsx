"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { H1 } from "../../../components/ui/heading-recipe";

interface Temple {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  timingInfo: TimingInfo | null;
  updatedAt: string;
}

interface TimingInfo {
  regularHours?: Record<string, string>;
  closedOn?: string;
  specialDays?: string;
  [k: string]: unknown;
}

interface AuditEntry {
  id: string;
  changed_by: string | null;
  before: unknown;
  after: unknown;
  created_at: string;
}

interface DetailResponse {
  temple: Temple;
  history: AuditEntry[];
}

const HHMM_RANGE = /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/;

type Row = { key: string; value: string };

function rowsFromTiming(t: TimingInfo | null | undefined): Row[] {
  if (!t || !t.regularHours) return [];
  return Object.entries(t.regularHours).map(([key, value]) => ({ key, value }));
}

export default function TempleEditPage() {
  const params = useParams<{ slug: string }>();
  const slug = typeof params?.slug === "string" ? params.slug : "";

  const [temple, setTemple] = useState<Temple | null>(null);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [closedOn, setClosedOn] = useState("");
  const [specialDays, setSpecialDays] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!slug) return;
    setLoading(true);
    fetch(`/api/temples/${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load (HTTP ${res.status})`);
        return (await res.json()) as DetailResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setTemple(data.temple);
        setHistory(data.history ?? []);
        setRows(rowsFromTiming(data.temple.timingInfo));
        const t = data.temple.timingInfo ?? {};
        setClosedOn(typeof t.closedOn === "string" ? t.closedOn : "");
        setSpecialDays(typeof t.specialDays === "string" ? t.specialDays : "");
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const validation = useMemo(() => {
    const errs: Record<number, string> = {};
    const seenKeys = new Set<string>();
    rows.forEach((r, i) => {
      const trimmedKey = r.key.trim();
      if (!trimmedKey) {
        errs[i] = "Name required";
        return;
      }
      if (seenKeys.has(trimmedKey)) {
        errs[i] = "Duplicate name";
        return;
      }
      seenKeys.add(trimmedKey);
      if (!HHMM_RANGE.test(r.value.trim())) {
        errs[i] = 'Use "HH:MM - HH:MM"';
      }
    });
    return errs;
  }, [rows]);

  const hasErrors = Object.keys(validation).length > 0 || rows.length === 0;

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addRow() {
    setRows((prev) => [...prev, { key: "", value: "" }]);
  }

  async function handleSave() {
    if (hasErrors || !slug) return;
    setSaving(true);
    setError(null);
    setToast(null);
    try {
      const regularHours: Record<string, string> = {};
      for (const r of rows) {
        regularHours[r.key.trim()] = r.value.trim();
      }
      const body: Record<string, unknown> = { regularHours };
      if (closedOn.trim()) body.closedOn = closedOn.trim();
      if (specialDays.trim()) body.specialDays = specialDays.trim();
      const res = await fetch(`/api/temples/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Save failed (HTTP ${res.status}): ${text.slice(0, 200)}`);
      }
      const json = (await res.json()) as { temple: Temple };
      setTemple(json.temple);
      setRows(rowsFromTiming(json.temple.timingInfo));
      setToast("Saved");
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm">
        <Link href="/temples" className="text-stone-600 hover:text-stone-900">
          ← All temples
        </Link>
      </nav>

      {loading ? (
        <p className="text-sm text-stone-600">Loading…</p>
      ) : error && !temple ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-semibold">Could not load temple</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : temple ? (
        <>
          <header className="mb-6">
            <h1 className={H1.portal}>{temple.name}</h1>
            <p className="mt-1 text-sm text-stone-600">
              <span className="font-mono">{temple.slug}</span>
              {temple.city ? ` · ${[temple.city, temple.state].filter(Boolean).join(", ")}` : null}
            </p>
          </header>

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-stone-900">Aarti slots</h2>
            <p className="mt-1 text-xs text-stone-500">
              Each slot is a labelled time range. Format: <code className="font-mono">HH:MM - HH:MM</code>{" "}
              (24-hour).
            </p>

            <div className="mt-4 space-y-2">
              {rows.length === 0 ? (
                <p className="text-xs italic text-stone-500">No slots yet — add one below.</p>
              ) : null}
              {rows.map((r, i) => (
                <div key={i} className="flex flex-wrap items-start gap-2">
                  <input
                    type="text"
                    placeholder="Aarti name (e.g. mangala)"
                    value={r.key}
                    onChange={(e) => updateRow(i, { key: e.target.value })}
                    className="min-w-[10rem] flex-1 rounded border border-stone-300 px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="HH:MM - HH:MM"
                    value={r.value}
                    onChange={(e) => updateRow(i, { value: e.target.value })}
                    className="min-w-[10rem] flex-1 rounded border border-stone-300 px-2 py-1 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="rounded border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
                  >
                    Remove
                  </button>
                  {validation[i] ? (
                    <p className="basis-full text-xs text-rose-600">{validation[i]}</p>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={addRow}
                className="mt-2 rounded border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                + Add row
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-stone-700">
                Closed on
                <input
                  type="text"
                  placeholder="e.g. Amavasya"
                  value={closedOn}
                  onChange={(e) => setClosedOn(e.target.value)}
                  className="mt-1 block w-full rounded border border-stone-300 px-2 py-1 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-stone-700">
                Special days
                <input
                  type="text"
                  placeholder="e.g. Extended hours on Ekadashi"
                  value={specialDays}
                  onChange={(e) => setSpecialDays(e.target.value)}
                  className="mt-1 block w-full rounded border border-stone-300 px-2 py-1 text-sm font-normal"
                />
              </label>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={saving || hasErrors}
                onClick={handleSave}
                className="rounded bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              {hasErrors ? (
                <span className="text-xs text-stone-500">Fix validation errors first.</span>
              ) : null}
              {toast ? <span className="text-xs font-semibold text-emerald-700">{toast}</span> : null}
              {error ? <span className="text-xs text-rose-600">{error}</span> : null}
            </div>
          </section>

          {history.length > 0 ? (
            <section className="mt-8 rounded-lg border border-stone-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-stone-900">Recent changes</h2>
              <ul className="mt-3 space-y-3 text-xs text-stone-700">
                {history.map((h) => (
                  <li key={h.id} className="border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
                    <p className="font-semibold">
                      {h.changed_by ?? "unknown"}{" "}
                      <span className="font-normal text-stone-500">
                        · {new Date(h.created_at).toLocaleString()}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
