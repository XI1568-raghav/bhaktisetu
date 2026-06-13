/**
 * SLA-breach outreach script — R-Q1-CS-003 v2.
 *
 * Reads /admin/ops/sla-overdue-bookings → applies strict filter (status =
 * `priest_assigned`, scheduledDate < now-7d, videoProofUrl == null) → groups
 * by priestId → emits CSV to docs/agent-reports/sla-breach-<YYYY-MM-DD>.csv.
 *
 * Observational only — no auto-sends, no production writes. Founder uses
 * the CSV + drafts doc (docs/agent-reports/2026-06-14-sla-breach-action.md)
 * to manually outreach via WhatsApp Business + Gmail.
 *
 * Run:
 *   ADMIN_OPS_TOKEN=<token> API_URL=https://api.darshya.online \
 *     pnpm tsx apps/api/scripts/ops/sla-breach-outreach.ts
 *
 * The /admin/ops/sla-overdue-bookings endpoint returns booking ids +
 * priestId + amount but NOT devotee name/phone/email or puja name. Those
 * columns are emitted as empty in the CSV — founder fills from admin panel
 * before sending. Endpoint enrichment deferred (don't auto-leak PII into
 * commit-able artifacts unless founder explicitly OKs).
 *
 * Always exits 0 (observational only) — even on fetch failure prints a
 * warning and emits a header-only CSV so the founder has *something*.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface BookingRow {
  id: string;
  bookingNumber: string;
  templeId: string;
  priestId: string | null;
  scheduledDate: string;
  scheduledTimeSlot: string;
  status: string;
  priceAmount: string | number;
  videoProofUrl?: string | null;
  // optional enrichment fields the endpoint may add later
  devoteeName?: string;
  devoteePhone?: string;
  devoteeEmail?: string;
  pujaName?: string;
  priestName?: string;
}

export interface SlaResponse {
  ok: boolean;
  count: number;
  bookings: BookingRow[];
  cutoff: string;
  generatedAt: string;
}

export interface CsvRow {
  bookingCode: string;
  devoteeName: string;
  devoteePhone: string;
  devoteeEmail: string;
  pujaName: string;
  scheduledDate: string;
  daysOverdue: number;
  amountInr: string;
  priestId: string;
  priestName: string;
  repeatBreachCount: number;
  suggestedAction: string;
}

export const CSV_HEADER =
  'bookingCode,devoteeName,devoteePhone,devoteeEmail,pujaName,scheduledDate,daysOverdue,amountInr,priestId,priestName,repeatBreachCount,suggestedAction';

const SEVEN_DAYS_MS = 7 * 24 * 3600_000;

export function csvField(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Spec filter: status === 'priest_assigned' AND scheduledDate < now-7d AND
 * videoProofUrl == null. The /admin/ops/sla-overdue-bookings endpoint already
 * applies a 24h cutoff + a broader status whitelist, so we narrow further
 * here to keep the founder action surface tight.
 */
export function filterBreaches(
  bookings: BookingRow[],
  now: Date = new Date(),
): BookingRow[] {
  const cutoff = now.getTime() - SEVEN_DAYS_MS;
  return bookings.filter((b) => {
    if (b.status !== 'priest_assigned') return false;
    if (b.videoProofUrl != null) return false;
    const sched = new Date(b.scheduledDate).getTime();
    if (Number.isNaN(sched)) return false;
    return sched < cutoff;
  });
}

/**
 * Group filtered bookings by priestId. Returns a Map keyed by priestId (or
 * the literal '' string for null-priest bookings) → array of bookings. Used
 * by `toCsv` to compute `repeatBreachCount` per row.
 */
export function groupByPriest(
  bookings: BookingRow[],
): Map<string, BookingRow[]> {
  const groups = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const key = b.priestId ?? '';
    const arr = groups.get(key);
    if (arr) arr.push(b);
    else groups.set(key, [b]);
  }
  return groups;
}

/**
 * Render filtered bookings as a deterministic CSV string. Sort by
 * bookingCode ASC so the same input always produces byte-identical output
 * (idempotent — safe to commit). Header is always emitted; on empty input
 * returns header-only CSV with trailing newline.
 */
export function toCsv(bookings: BookingRow[], now: Date = new Date()): string {
  const filtered = bookings; // caller passes already-filtered rows; group still needed
  const groups = groupByPriest(filtered);

  const rows: CsvRow[] = filtered.map((b) => {
    const sched = new Date(b.scheduledDate);
    const daysOverdue = Math.floor(
      (now.getTime() - sched.getTime()) / 86400000,
    );
    const priestKey = b.priestId ?? '';
    const repeatBreachCount = priestKey ? (groups.get(priestKey)?.length ?? 0) : 0;
    const suggestedAction =
      repeatBreachCount >= 2
        ? 'PRIEST-FLAG: refund + investigate priest (repeat-breach)'
        : daysOverdue >= 30
        ? 'IMMEDIATE-REFUND: full + 25% wallet credit (per Macro 1)'
        : daysOverdue >= 14
        ? 'REFUND-OR-RESCHEDULE: per Macro 1 options 1/2/3'
        : 'REFUND-OR-RESCHEDULE-7D: per Macro 11 puja_sla_breach options A/B';

    return {
      bookingCode: b.bookingNumber,
      devoteeName: b.devoteeName ?? '',
      devoteePhone: b.devoteePhone ?? '',
      devoteeEmail: b.devoteeEmail ?? '',
      pujaName: b.pujaName ?? '',
      scheduledDate: b.scheduledDate.slice(0, 10),
      daysOverdue,
      amountInr: String(b.priceAmount),
      priestId: b.priestId ?? '',
      priestName: b.priestName ?? '',
      repeatBreachCount,
      suggestedAction,
    };
  });

  // Deterministic sort: bookingCode ASC (per spec — idempotent CSV).
  rows.sort((a, b) => a.bookingCode.localeCompare(b.bookingCode));

  const dataLines = rows.map((r) =>
    [
      csvField(r.bookingCode),
      csvField(r.devoteeName),
      csvField(r.devoteePhone),
      csvField(r.devoteeEmail),
      csvField(r.pujaName),
      csvField(r.scheduledDate),
      csvField(r.daysOverdue),
      csvField(r.amountInr),
      csvField(r.priestId),
      csvField(r.priestName),
      csvField(r.repeatBreachCount),
      csvField(r.suggestedAction),
    ].join(','),
  );

  return [CSV_HEADER, ...dataLines].join('\n') + '\n';
}

export function summarize(
  bookings: BookingRow[],
  now: Date = new Date(),
): { count: number; totalAtRiskInr: number; priestsFlagged: string[] } {
  const groups = groupByPriest(bookings);
  const totalAtRiskInr = bookings.reduce(
    (sum, b) => sum + Number(b.priceAmount || 0),
    0,
  );
  const priestsFlagged: string[] = [];
  for (const [priestId, arr] of groups) {
    if (priestId && arr.length >= 2) priestsFlagged.push(priestId);
  }
  priestsFlagged.sort();
  // mark `now` consumed (kept in signature for future-proofing day window)
  void now;
  return { count: bookings.length, totalAtRiskInr, priestsFlagged };
}

// ---- Back-compat shim for prior session's tests / call sites ----
// Older tests imported `transformToCsvRows` + `renderCsv`. Keep them
// exported as thin wrappers over the new `filterBreaches` + `toCsv` so
// nothing breaks if anyone still references them.
export function transformToCsvRows(
  bookings: BookingRow[],
  now: Date = new Date(),
): CsvRow[] {
  // legacy behavior: no filter, no priestId sort (sort by bookingCode).
  const groups = groupByPriest(bookings);
  const rows: CsvRow[] = bookings.map((b) => {
    const sched = new Date(b.scheduledDate);
    const daysOverdue = Math.floor(
      (now.getTime() - sched.getTime()) / 86400000,
    );
    const priestKey = b.priestId ?? '';
    const repeatBreachCount = priestKey ? (groups.get(priestKey)?.length ?? 0) : 0;
    const suggestedAction =
      repeatBreachCount >= 2
        ? 'PRIEST-FLAG: refund + investigate priest (repeat-breach)'
        : daysOverdue >= 30
        ? 'IMMEDIATE-REFUND: full + 25% wallet credit (per Macro 1)'
        : daysOverdue >= 14
        ? 'REFUND-OR-RESCHEDULE: per Macro 1 options 1/2/3'
        : 'CHASE-PRIEST: T+24h escalate (per Macro 3)';
    return {
      bookingCode: b.bookingNumber,
      devoteeName: b.devoteeName ?? '',
      devoteePhone: b.devoteePhone ?? '',
      devoteeEmail: b.devoteeEmail ?? '',
      pujaName: b.pujaName ?? '',
      scheduledDate: b.scheduledDate.slice(0, 10),
      daysOverdue,
      amountInr: String(b.priceAmount),
      priestId: b.priestId ?? '',
      priestName: b.priestName ?? '',
      repeatBreachCount,
      suggestedAction,
    };
  });
  rows.sort((a, b) => {
    if (a.priestId !== b.priestId) return a.priestId.localeCompare(b.priestId);
    return a.bookingCode.localeCompare(b.bookingCode);
  });
  return rows;
}

export function renderCsv(rows: CsvRow[]): string {
  const dataLines = rows.map((r) =>
    [
      csvField(r.bookingCode),
      csvField(r.devoteeName),
      csvField(r.devoteePhone),
      csvField(r.devoteeEmail),
      csvField(r.pujaName),
      csvField(r.scheduledDate),
      csvField(r.daysOverdue),
      csvField(r.amountInr),
      csvField(r.priestId),
      csvField(r.priestName),
      csvField(r.repeatBreachCount),
      csvField(r.suggestedAction),
    ].join(','),
  );
  return [CSV_HEADER, ...dataLines].join('\n') + '\n';
}

async function main(): Promise<void> {
  const token = process.env.ADMIN_OPS_TOKEN;
  const apiUrl = process.env.API_URL || 'https://api.darshya.online';
  const today = new Date().toISOString().slice(0, 10);
  const outDir = join(process.cwd(), 'docs', 'agent-reports');
  const outPath = join(outDir, `sla-breach-${today}.csv`);
  mkdirSync(outDir, { recursive: true });

  if (!token) {
    console.error('FATAL: ADMIN_OPS_TOKEN env required.');
    process.exit(1);
  }

  const url = `${apiUrl}/api/v1/admin/ops/sla-overdue-bookings?token=${encodeURIComponent(token)}`;
  console.log(`[sla-breach-outreach] GET ${url.replace(token, '***')}`);

  let bookings: BookingRow[] = [];
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(
        `[sla-breach-outreach] WARN: API returned ${res.status} ${res.statusText} — emitting header-only CSV.`,
      );
    } else {
      const data = (await res.json()) as SlaResponse;
      if (!data.ok) {
        console.warn(
          '[sla-breach-outreach] WARN: API response ok=false — emitting header-only CSV.',
        );
      } else {
        bookings = Array.isArray(data.bookings) ? data.bookings : [];
      }
    }
  } catch (err) {
    console.warn(
      `[sla-breach-outreach] WARN: fetch failed (${(err as Error).message}) — emitting header-only CSV.`,
    );
  }

  const now = new Date();
  const filtered = filterBreaches(bookings, now);
  const csv = toCsv(filtered, now);
  writeFileSync(outPath, csv);

  const summary = summarize(filtered, now);
  console.log('--- SLA breach summary ---');
  console.log(`Bookings filtered (priest_assigned, >7d, no video): ${summary.count}`);
  console.log(`₹ at refund risk: ${summary.totalAtRiskInr}`);
  console.log(
    `Priests flagged (repeat-breach ≥2): ${summary.priestsFlagged.join(', ') || 'none'}`,
  );
  console.log(`CSV written: ${outPath}`);
  console.log(
    `Next: paste rows into docs/agent-reports/${today}-sla-breach-action.md per-booking draft section.`,
  );

  // Observational script — always exit 0 even on warnings.
  process.exit(0);
}

// Bare-execution guard (only run main when invoked directly, not when imported by tests).
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('sla-breach-outreach.ts')) {
  main().catch((err) => {
    console.error('FATAL:', err);
    // Per spec: observational only — exit 0 even on uncaught error path.
    process.exit(0);
  });
}

export const __testing = {
  csvField,
  filterBreaches,
  groupByPriest,
  toCsv,
  summarize,
  transformToCsvRows,
  renderCsv,
  CSV_HEADER,
};
