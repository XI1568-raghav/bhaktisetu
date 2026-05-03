"use client";

import { useEffect, useState } from "react";

interface Draft {
  id: string;
  type: string;
  title: string;
  body: string;
  target: string;
  status: string;
  generatedAt: string;
  approvedAt: string | null;
  postedAt: string | null;
  postedUrl: string | null;
  rejectedReason: string | null;
}

const STATUS_TABS = ["DRAFT", "APPROVED", "POSTED", "REJECTED"] as const;

function targetUrlHint(d: Draft): string {
  if (d.type === "reddit") {
    const sub = d.target.startsWith("r/") ? d.target.slice(2) : d.target;
    return `https://www.reddit.com/${d.target.startsWith("r/") ? d.target : `r/${sub}`}/submit`;
  }
  if (d.type === "quora") {
    return `https://www.quora.com/topic/${encodeURIComponent(d.target.replace(/\s+/g, "-"))}`;
  }
  return "";
}

export default function ContentQueuePage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>("DRAFT");
  const [loading, setLoading] = useState(true);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [titleEdits, setTitleEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [autoPosting, setAutoPosting] = useState(false);
  const [autoPostStatus, setAutoPostStatus] = useState<{ reddit: boolean; quora: boolean } | null>(
    null,
  );
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load(s: (typeof STATUS_TABS)[number]) {
    setLoading(true);
    try {
      const res = await fetch(`/api/content-queue?status=${s}`, { cache: "no-store" });
      const json = (await res.json()) as { drafts?: Draft[] };
      setDrafts(json.drafts ?? []);
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(status);
  }, [status]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/content-queue/auto-post/status`, { cache: "no-store" });
        if (res.ok) setAutoPostStatus((await res.json()) as { reddit: boolean; quora: boolean });
      } catch {
        // best-effort
      }
    })();
  }, []);

  async function autoPostNow() {
    setAutoPosting(true);
    try {
      const res = await fetch(`/api/content-queue/auto-post`, { method: "POST" });
      const j = (await res.json()) as {
        posted?: number;
        attempted?: number;
        skipped?: number;
        failed?: number;
        reason?: string;
      };
      if (j.reason) flash(`Auto-post skipped: ${j.reason}`);
      else
        flash(
          `Auto-post: ${j.posted ?? 0} posted, ${j.skipped ?? 0} skipped, ${j.failed ?? 0} failed`,
        );
      void load(status);
    } catch (err) {
      flash(`Auto-post failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAutoPosting(false);
    }
  }

  async function approveAndCopy(d: Draft) {
    setBusy(d.id);
    const body = edits[d.id] ?? d.body;
    const title = titleEdits[d.id] ?? d.title;
    try {
      const res = await fetch(`/api/content-queue/${d.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "APPROVED", body, title }),
      });
      if (!res.ok) {
        flash(`Approve failed: ${res.status}`);
        return;
      }
      const clipboard = `${title}\n\n${body}`;
      try {
        await navigator.clipboard.writeText(clipboard);
        const url = targetUrlHint(d);
        flash(`Copied. Paste into ${d.target}${url ? ` (${url})` : ""}`);
      } catch {
        flash("Approved (clipboard blocked — copy manually)");
      }
      void load(status);
    } finally {
      setBusy(null);
    }
  }

  async function reject(d: Draft) {
    const reason = window.prompt("Reason for rejection?", "off-topic");
    if (reason === null) return;
    setBusy(d.id);
    try {
      const res = await fetch(`/api/content-queue/${d.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", rejectedReason: reason }),
      });
      if (!res.ok) flash(`Reject failed: ${res.status}`);
      else flash("Rejected");
      void load(status);
    } finally {
      setBusy(null);
    }
  }

  async function markPosted(d: Draft) {
    const url = window.prompt(`Posted URL on ${d.target}?`, "https://");
    if (!url) return;
    setBusy(d.id);
    try {
      const res = await fetch(`/api/content-queue/${d.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "POSTED", postedUrl: url }),
      });
      if (!res.ok) flash(`Mark posted failed: ${res.status}`);
      else flash("Marked POSTED");
      void load(status);
    } finally {
      setBusy(null);
    }
  }

  async function generateNow() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/content-queue/run`, { method: "POST" });
      const j = (await res.json()) as {
        redditOk?: number;
        quoraOk?: number;
        skipped?: boolean;
        reason?: string;
      };
      if (j.skipped) flash(`Skipped: ${j.reason ?? "?"}`);
      else flash(`Generated: ${j.redditOk ?? 0} Reddit, ${j.quoraOk ?? 0} Quora`);
      void load(status);
    } catch (err) {
      flash(`Generate failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 sm:text-3xl">Content queue</h1>
          <p className="mt-2 text-sm text-stone-600">
            Reddit and Quora draft posts generated daily. Review, edit, then approve and copy
            to clipboard. Manually paste into the target site, then mark POSTED with the URL.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {autoPostStatus && (
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                autoPostStatus.reddit
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-stone-100 text-stone-600"
              }`}
              title={
                autoPostStatus.reddit
                  ? "REDDIT_* env vars configured — auto-post enabled"
                  : "REDDIT_* env missing — auto-post disabled"
              }
            >
              Reddit auto: {autoPostStatus.reddit ? "on" : "off"}
            </span>
          )}
          <button
            onClick={autoPostNow}
            disabled={autoPosting || !autoPostStatus?.reddit}
            className="rounded border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-50"
            title={
              autoPostStatus?.reddit
                ? "Auto-post oldest APPROVED Reddit drafts (rate-limited per sub)"
                : "Set REDDIT_CLIENT_ID/SECRET/USERNAME/PASSWORD to enable"
            }
          >
            {autoPosting ? "Posting…" : "Auto-post now"}
          </button>
          <button
            onClick={generateNow}
            disabled={generating}
            className="rounded bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {generating ? "Generating…" : "Generate batch now"}
          </button>
        </div>
      </header>

      {toast && (
        <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {toast}
        </div>
      )}

      <div className="mb-4 flex gap-1 border-b border-stone-200">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              status === s
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-stone-600 hover:text-stone-900"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : drafts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-6 text-center text-sm text-stone-600">
          No {status.toLowerCase()} drafts.
        </div>
      ) : (
        <ul className="space-y-4">
          {drafts.map((d) => {
            const editedBody = edits[d.id] ?? d.body;
            const editedTitle = titleEdits[d.id] ?? d.title;
            return (
              <li key={d.id} className="rounded-lg border border-stone-200 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-baseline gap-3 text-xs text-stone-500">
                  <span className="rounded bg-stone-100 px-2 py-0.5 font-mono uppercase">
                    {d.type}
                  </span>
                  <span className="font-mono">{d.target}</span>
                  <span>{new Date(d.generatedAt).toLocaleString()}</span>
                  {d.postedUrl && (
                    <a
                      href={d.postedUrl}
                      className="text-orange-600 underline"
                      target="_blank"
                      rel="noopener"
                    >
                      posted
                    </a>
                  )}
                  {d.rejectedReason && (
                    <span className="text-rose-600">rejected: {d.rejectedReason}</span>
                  )}
                </div>
                {d.status === "DRAFT" ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) =>
                      setTitleEdits((prev) => ({ ...prev, [d.id]: e.target.value }))
                    }
                    className="mb-2 w-full rounded border border-stone-300 px-2 py-1 text-sm font-semibold text-stone-900"
                  />
                ) : (
                  <h3 className="mb-2 text-base font-semibold text-stone-900">{d.title}</h3>
                )}

                {d.status === "DRAFT" ? (
                  <textarea
                    value={editedBody}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [d.id]: e.target.value }))
                    }
                    rows={Math.min(20, Math.max(8, Math.ceil(editedBody.length / 80)))}
                    className="w-full rounded border border-stone-300 px-3 py-2 font-mono text-xs text-stone-800"
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-stone-700">
                    {d.body}
                  </pre>
                )}

                {d.status === "DRAFT" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => approveAndCopy(d)}
                      disabled={busy === d.id}
                      className="rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 disabled:opacity-50"
                    >
                      Approve & copy
                    </button>
                    <a
                      href={targetUrlHint(d)}
                      target="_blank"
                      rel="noopener"
                      className="rounded border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      Open {d.target}
                    </a>
                    <button
                      onClick={() => reject(d)}
                      disabled={busy === d.id}
                      className="rounded border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
                {d.status === "APPROVED" && (
                  <div className="mt-3">
                    <button
                      onClick={() => markPosted(d)}
                      disabled={busy === d.id}
                      className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Mark posted (with URL)
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
