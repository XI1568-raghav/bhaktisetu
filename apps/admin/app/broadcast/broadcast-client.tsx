"use client";

import { useEffect, useState } from "react";

interface Template {
  name: string;
  label: string;
  description: string;
  variables: string[];
}

interface DeliveryRow {
  id: string;
  phone: string;
  template: string;
  audience: string;
  status: string;
  created_at: string;
}

interface BroadcastResult {
  audience: string;
  template: string;
  total: number;
  sent: number;
  skipped: number;
  optedOut: number;
  failed: number;
  enabled: boolean;
}

const SAFFRON = "#E16318";

export function BroadcastClient({ templates }: { templates: Template[] }) {
  const [audience, setAudience] = useState<"waitlist" | "bookings" | "all">("waitlist");
  const [templateName, setTemplateName] = useState(templates[0]?.name ?? "");
  const [languageCode, setLanguageCode] = useState("en");
  const [variables, setVariables] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);

  const tpl = templates.find((t) => t.name === templateName) ?? null;

  useEffect(() => {
    if (tpl) setVariables(tpl.variables.map(() => ""));
  }, [tpl]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/whatsapp/deliveries?limit=50", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { deliveries?: DeliveryRow[] };
        if (!cancelled) setDeliveries(json.deliveries ?? []);
      } catch {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [result]);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/whatsapp/broadcast", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audience,
          templateName,
          languageCode,
          variables: variables.filter((v) => v.length > 0),
        }),
      });
      const json = (await res.json()) as
        | { ok: true; result: BroadcastResult }
        | { ok?: false; error?: string; message?: string };
      if (!res.ok || !("ok" in json) || !json.ok) {
        const msg = "message" in json ? json.message : "error" in json ? json.error : "broadcast failed";
        setError(msg ?? "broadcast failed");
      } else {
        setResult(json.result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold text-stone-900">Compose</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-stone-700">Audience</span>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as typeof audience)}
              className="mt-1 block w-full rounded border border-stone-300 px-3 py-2 text-sm"
            >
              <option value="waitlist">Waitlist (opted-in)</option>
              <option value="bookings">Confirmed booking holders</option>
              <option value="all">All opted-in (waitlist + bookings)</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-stone-700">Template</span>
            <select
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="mt-1 block w-full rounded border border-stone-300 px-3 py-2 text-sm"
            >
              {templates.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-stone-700">Language code</span>
            <input
              type="text"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="mt-1 block w-full rounded border border-stone-300 px-3 py-2 text-sm font-mono"
              placeholder="en"
            />
          </label>
        </div>

        {tpl ? (
          <div className="mt-4 rounded bg-stone-50 p-3 text-sm text-stone-700">
            <p className="font-medium text-stone-900">Preview</p>
            <p className="mt-1">{tpl.description}</p>
          </div>
        ) : null}

        {tpl && tpl.variables.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-stone-700">Variables</p>
            {tpl.variables.map((v, idx) => (
              <label key={v} className="block text-xs">
                <span className="font-mono text-stone-500">{`{{${idx + 1}}} — ${v}`}</span>
                <input
                  type="text"
                  value={variables[idx] ?? ""}
                  onChange={(e) => {
                    const next = [...variables];
                    next[idx] = e.target.value;
                    setVariables(next);
                  }}
                  className="mt-1 block w-full rounded border border-stone-300 px-2 py-1 text-sm"
                />
              </label>
            ))}
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={submitting || !templateName}
            className="rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: SAFFRON }}
          >
            {submitting ? "Sending…" : "Send broadcast"}
          </button>
          {error ? <span className="text-sm text-rose-700">{error}</span> : null}
        </div>
      </section>

      {result ? (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-semibold">Broadcast complete</p>
          <p className="mt-1">
            audience={result.audience} template={result.template} total={result.total} sent={result.sent}{" "}
            skipped={result.skipped} optedOut={result.optedOut} failed={result.failed}{" "}
            enabled={String(result.enabled)}
          </p>
        </section>
      ) : null}

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold text-stone-900">Recent deliveries</h2>
        {deliveries.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">No deliveries logged yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-stone-50 text-left text-[11px] uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Template</th>
                  <th className="px-3 py-2">Audience</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.id} className="border-t border-stone-100">
                    <td className="px-3 py-2 font-mono text-stone-600">
                      {new Date(d.created_at).toISOString().slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="px-3 py-2 font-mono">{d.phone}</td>
                    <td className="px-3 py-2">{d.template}</td>
                    <td className="px-3 py-2">{d.audience}</td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-stone-100 px-2 py-0.5 font-medium">{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-stone-900">Confirm broadcast</h3>
            <p className="mt-2 text-sm text-stone-700">
              Send <span className="font-mono">{templateName}</span> to{" "}
              <span className="font-medium">{audience}</span>? This is irreversible.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded border border-stone-300 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="rounded px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: SAFFRON }}
              >
                Confirm send
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
