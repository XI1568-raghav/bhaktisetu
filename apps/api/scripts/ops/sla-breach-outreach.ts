/**
 * SLA-breach outreach script — R-Q1-CS-003.
 *
 * Reads /admin/ops/sla-overdue-bookings → emits CSV to
 * docs/agent-reports/sla-breach-<YYYY-MM-DD>.csv.
 *
 * Observational only — no auto-sends, no production writes. Founder uses
 * the CSV + drafts doc (docs/agent-reports/2026-06-12-sla-breach-action.md)
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
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

interface BookingRow {
  id: string;
  bookingNumber: string;
  templeId: string;
  priestId: string | null;
  scheduledDate: string;
  scheduledTimeSlot: string;
  status: string;
  priceAmount: string | number;
}

interface SlaResponse {
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

export function csvField(v: string | number | null | undefined): string {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Pure transform: API response → sorted CSV rows.
 *
 * Sort: priestId ASC (groups same priest together for batch action),
 * then bookingCode ASC. Deterministic order = idempotent CSV.
 */
export function transformToCsvRows(
  bookings: BookingRow[],
  now: Date = new Date(),
): CsvRow[] {
  // Step 1: count breaches per priest (for repeatBreachCount column).
  const priestBreachCount = new Map<string, number>();
  for (const b of bookings) {
    if (!b.priestId) continue;
    priestBreachCount.set(b.priestId, (priestBreachCount.get(b.priestId) || 0) + 1);
  }

  // Step 2: build rows with derived fields.
  const rows: CsvRow[] = bookings.map((b) => {
    const sched = new Date(b.scheduledDate);
    const daysOverdue = Math.floor((now.getTime() - sched.getTime()) / 86400000);
    const repeatBreachCount = b.priestId ? priestBreachCount.get(b.priestId) || 0 : 0;
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
      devoteeName: '', // enrich manually from admin panel
      devoteePhone: '',
      devoteeEmail: '',
      pujaName: '',
      scheduledDate: b.scheduledDate.slice(0, 10),
      daysOverdue,
      amountInr: String(b.priceAmount),
      priestId: b.priestId || '',
      priestName: '', // enrich manually
      repeatBreachCount,
      suggestedAction,
    };
  });

  // Step 3: deterministic sort.
  rows.sort((a, b) => {
    if (a.priestId !== b.priestId) return a.priestId.localeCompare(b.priestId);
    return a.bookingCode.localeCompare(b.bookingCode);
  });

  return rows;
}

export function renderCsv(rows: CsvRow[]): string {
  const headerLine = CSV_HEADER;
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
  return [headerLine, ...dataLines].join('\n') + '\n';
}

export function summarize(rows: CsvRow[]): { count: number; totalAtRiskInr: number; priestsFlagged: string[] } {
  const totalAtRiskInr = rows.reduce((sum, r) => sum + Number(r.amountInr || 0), 0);
  const priestsFlaggedSet = new Set<string>();
  for (const r of rows) {
    if (r.repeatBreachCount >= 2 && r.priestId) priestsFlaggedSet.add(r.priestId);
  }
  return {
    count: rows.length,
    totalAtRiskInr,
    priestsFlagged: Array.from(priestsFlaggedSet).sort(),
  };
}

async function main(): Promise<void> {
  const token = process.env.ADMIN_OPS_TOKEN;
  const apiUrl = process.env.API_URL || 'https://api.darshya.online';
  if (!token) {
    console.error('FATAL: ADMIN_OPS_TOKEN env required.');
    process.exit(1);
  }

  const url = `${apiUrl}/api/v1/admin/ops/sla-overdue-bookings?token=${encodeURIComponent(token)}`;
  console.log(`[sla-breach-outreach] GET ${url.replace(token, '***')}`);

  const res = await fetch(url);
  if (!res.ok) {
    console.error(`FATAL: API returned ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = (await res.json()) as SlaResponse;
  if (!data.ok) {
    console.error('FATAL: API response not ok:', data);
    process.exit(1);
  }

  const rows = transformToCsvRows(data.bookings, new Date());
  const csv = renderCsv(rows);

  const today = new Date().toISOString().slice(0, 10);
  const outDir = join(process.cwd(), 'docs', 'agent-reports');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `sla-breach-${today}.csv`);
  writeFileSync(outPath, csv);

  const summary = summarize(rows);
  console.log('--- SLA breach summary ---');
  console.log(`Bookings overdue: ${summary.count}`);
  console.log(`₹ at refund risk: ${summary.totalAtRiskInr}`);
  console.log(`Priests flagged (repeat-breach ≥2): ${summary.priestsFlagged.join(', ') || 'none'}`);
  console.log(`CSV written: ${outPath}`);
  console.log('Next: paste rows into docs/agent-reports/2026-06-12-sla-breach-action.md per-booking draft section.');
}

// Bare execution guard (only run main when invoked directly, not when imported by tests)
if (typeof process !== 'undefined' && process.argv[1]?.endsWith('sla-breach-outreach.ts')) {
  main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}

export const __testing = { csvField, transformToCsvRows, renderCsv, summarize, CSV_HEADER };
