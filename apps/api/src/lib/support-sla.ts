/**
 * R-Q4-CS-001 — 24h response SLA across UK + US + AU + IN timezones.
 *
 * Pure helpers that compute first-response latency for support tickets and
 * roll up the response_sla_24h_pct KPI per timezone bucket.
 *
 * Data shape (intentionally flat — easy to feed from either Prisma rows or
 * test fixtures):
 *
 *   ticket: { createdAt: Date, firstAdminReplyAt: Date | null }
 *
 * First-response latency = firstAdminReplyAt - createdAt (ms). If
 * firstAdminReplyAt is null AND the ticket is older than 24h, the ticket
 * counts as a BREACH. Tickets younger than 24h with no reply are PENDING
 * (excluded from the % calc so the metric stays stable as new tickets
 * arrive).
 */

export const SLA_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * IANA timezones we cover globally. Order chosen so the API response always
 * surfaces the four target regions even when one has zero tickets.
 */
export const SLA_TIMEZONES = [
  { code: 'IN', label: 'India',         tz: 'Asia/Kolkata' },
  { code: 'UK', label: 'United Kingdom', tz: 'Europe/London' },
  { code: 'US', label: 'United States',  tz: 'America/New_York' },
  { code: 'AU', label: 'Australia',      tz: 'Australia/Sydney' },
] as const;

export type SlaTimezoneCode = (typeof SLA_TIMEZONES)[number]['code'];

export interface SlaTicketInput {
  createdAt: Date;
  firstAdminReplyAt: Date | null;
}

export interface SlaBucketResult {
  code: SlaTimezoneCode;
  label: string;
  tz: string;
  total: number;
  met: number;
  breached: number;
  pending: number;
  responseSla24hPct: number; // 0..100, two-decimal precision
}

export interface SlaSummary {
  generatedAt: string;
  windowHours: number;
  global: Omit<SlaBucketResult, 'code' | 'label' | 'tz'>;
  buckets: SlaBucketResult[];
}

/**
 * Bucket a ticket into one of the 4 covered timezones based on its createdAt
 * wall-clock hour in each tz. We use the tz where the ticket was created in
 * BUSINESS HOURS (08-20 local) — that's the region whose CS shift owned it.
 *
 * Tickets that arrive outside business hours in every tz fall back to IN
 * (default ops region). This is intentional — the global agent fleet
 * operates out of India, and after-hours tickets are still on IN's clock
 * until handoff lands.
 */
export function bucketByOwningTimezone(createdAt: Date): SlaTimezoneCode {
  for (const { code, tz } of SLA_TIMEZONES) {
    const hour = hourInTz(createdAt, tz);
    if (hour >= 8 && hour < 20) return code;
  }
  return 'IN';
}

/**
 * Return the wall-clock hour (0-23) of a UTC instant rendered in the given
 * IANA timezone. Implemented via Intl.DateTimeFormat to stay dependency-free
 * (Node 20+ ships the full ICU dataset).
 */
export function hourInTz(d: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    hour12: false,
  });
  // formatToParts returns 0-23 in 'en-US' hour12:false. Some Node builds
  // emit "24" for midnight — normalize to 0.
  const hourPart = fmt.formatToParts(d).find((p) => p.type === 'hour');
  const raw = hourPart ? parseInt(hourPart.value, 10) : 0;
  return raw === 24 ? 0 : raw;
}

/**
 * Classify one ticket as met | breached | pending vs the 24h SLA.
 *  - met:      first admin reply landed within SLA_WINDOW_MS of createdAt
 *  - breached: no reply AND createdAt is older than 24h, OR reply landed late
 *  - pending:  no reply yet AND createdAt is younger than 24h
 */
export function classifyTicket(
  ticket: SlaTicketInput,
  now: Date = new Date(),
): 'met' | 'breached' | 'pending' {
  const created = ticket.createdAt.getTime();
  if (ticket.firstAdminReplyAt) {
    const replyDelta = ticket.firstAdminReplyAt.getTime() - created;
    return replyDelta <= SLA_WINDOW_MS ? 'met' : 'breached';
  }
  const age = now.getTime() - created;
  return age > SLA_WINDOW_MS ? 'breached' : 'pending';
}

/**
 * Roll up an array of tickets into per-timezone and global SLA buckets.
 * Pending tickets are excluded from the percentage denominator so the KPI
 * tracks resolved-or-breached SLA only.
 */
export function summarizeSla(
  tickets: SlaTicketInput[],
  now: Date = new Date(),
): SlaSummary {
  const byBucket = new Map<SlaTimezoneCode, { met: number; breached: number; pending: number; total: number }>();
  for (const { code } of SLA_TIMEZONES) {
    byBucket.set(code, { met: 0, breached: 0, pending: 0, total: 0 });
  }

  let gMet = 0;
  let gBreached = 0;
  let gPending = 0;

  for (const t of tickets) {
    const bucket = bucketByOwningTimezone(t.createdAt);
    const verdict = classifyTicket(t, now);
    const slot = byBucket.get(bucket)!;
    slot.total += 1;
    slot[verdict] += 1;
    if (verdict === 'met') gMet += 1;
    else if (verdict === 'breached') gBreached += 1;
    else gPending += 1;
  }

  const buckets: SlaBucketResult[] = SLA_TIMEZONES.map(({ code, label, tz }) => {
    const slot = byBucket.get(code)!;
    return {
      code,
      label,
      tz,
      total: slot.total,
      met: slot.met,
      breached: slot.breached,
      pending: slot.pending,
      responseSla24hPct: pct(slot.met, slot.met + slot.breached),
    };
  });

  const gTotal = gMet + gBreached + gPending;
  return {
    generatedAt: now.toISOString(),
    windowHours: 24,
    global: {
      total: gTotal,
      met: gMet,
      breached: gBreached,
      pending: gPending,
      responseSla24hPct: pct(gMet, gMet + gBreached),
    },
    buckets,
  };
}

function pct(met: number, denom: number): number {
  if (denom === 0) return 100; // vacuously meeting SLA when nothing to measure
  return Math.round((met / denom) * 10000) / 100;
}
