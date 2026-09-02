"use client";

import { useMemo, useState } from "react";
import { H1 } from "../../components/ui/heading-recipe";

const SAFFRON = "#E16318";

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function DonationsExportPage() {
  const today = useMemo(() => new Date(), []);
  const ninetyDaysAgo = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 90);
    return d;
  }, [today]);

  const [from, setFrom] = useState(isoDate(ninetyDaysAgo));
  const [to, setTo] = useState(isoDate(today));
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDownload() {
    setError(null);
    setDownloading(true);
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const res = await fetch(`/api/donations-export?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text.slice(0, 200)}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `darshya-donations-${from}-to-${to}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDownloading(false);
    }
  }

  const rangeInvalid = !!from && !!to && from > to;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className={H1.portal}>
          {/* TC-01: this read "80G donations export". Darshya holds no Section
              80G registration (apps/web/lib/company.ts HAS_80G_VERIFIED false,
              eightyGNumber and pan null) and no route writes the donee columns
              apps/api/src/lib/pdf-receipt.ts is80GEligible() requires, so not
              one row in this CSV is an 80G instrument. An operator who filed
              this export as 80G paperwork would be filing proof-of-payment
              records under a section they do not qualify for. */}
          Donations export
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Download a CSV of paid donations for your finance team. Columns:
          receipt_number, donor_name, donor_pan, donor_email, donee_name, amountInr,
          donation_date, gaushala_id. Each export is recorded in the audit log.
        </p>
      </header>

      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">From</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-stone-500">To</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </label>
        </div>

        {rangeInvalid ? (
          <p className="mt-3 text-xs text-rose-700">From date must be on or before To date.</p>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading || rangeInvalid}
            className="rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: SAFFRON }}
          >
            {downloading ? "Preparing CSV…" : "Download CSV"}
          </button>
          <p className="text-xs text-stone-500">
            Default range is the past 90 days when both dates are blank.
          </p>
        </div>

        {error ? (
          <div className="mt-4 rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
