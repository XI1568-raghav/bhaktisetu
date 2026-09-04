import { prisma } from '../lib/prisma.js';
import { sendWhatsappTemplate, whatsapp } from '../lib/whatsapp.js';

/**
 * WhatsApp broadcast service. Pulls opted-in recipients (Waitlist with
 * whatsappOptIn=true, or confirmed PujaBooking holders) and fans them out
 * to Meta's Cloud API at <=50 msg/sec — the hard rate limit on a verified
 * tier 1 business number.
 *
 * Persistence:
 *   - WhatsAppDelivery (raw SQL — no Prisma model). Tracks every send
 *     attempt for audit + retry analysis.
 *   - WhatsAppOptOut (raw SQL). Phone numbers that replied STOP /
 *     अनसब्सक्राइब. Skipped on every future broadcast.
 *
 * Both tables are auto-created on first call (idempotent CREATE TABLE
 * IF NOT EXISTS) so this works without a Prisma migration. Schema can
 * be promoted to schema.prisma later without data loss.
 *
 * Env-gated: when WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN are
 * absent every send returns {skipped:true} but rows are still written
 * with status='SKIPPED' so dev/demo flows exercise the full pipeline.
 *
 * Compliance: never send to non-opted-in phones. Waitlist requires
 * whatsappOptIn=true. PujaBooking implicitly opts in via T&C — but
 * a row in WhatsAppOptOut overrides that.
 */

const RATE_LIMIT_PER_SECOND = 50;
const BATCH_SLEEP_MS = 1000;

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WhatsAppDelivery" (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone        TEXT NOT NULL,
        template     TEXT NOT NULL,
        language     TEXT NOT NULL DEFAULT 'en',
        audience     TEXT NOT NULL,
        status       TEXT NOT NULL,
        message_id   TEXT,
        error        TEXT,
        triggered_by TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "WhatsAppDelivery_phone_idx" ON "WhatsAppDelivery" (phone)'
    );
    await prisma.$executeRawUnsafe(
      'CREATE INDEX IF NOT EXISTS "WhatsAppDelivery_created_at_idx" ON "WhatsAppDelivery" (created_at DESC)'
    );
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WhatsAppOptOut" (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone      TEXT NOT NULL UNIQUE,
        reason     TEXT,
        source     TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  })().catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

async function loadOptOuts(): Promise<Set<string>> {
  await ensureSchema();
  const rows = await prisma.$queryRawUnsafe<Array<{ phone: string }>>(
    'SELECT phone FROM "WhatsAppOptOut"'
  );
  return new Set(rows.map((r) => normalisePhone(r.phone)));
}

async function recordDelivery(params: {
  phone: string;
  template: string;
  language: string;
  audience: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED' | 'OPTED_OUT';
  messageId?: string;
  error?: string;
  triggeredBy?: string;
}): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "WhatsAppDelivery"
        (phone, template, language, audience, status, message_id, error, triggered_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      params.phone,
      params.template,
      params.language,
      params.audience,
      params.status,
      params.messageId ?? null,
      params.error ?? null,
      params.triggeredBy ?? null
    );
  } catch {
    // delivery log is best-effort — never let logging failure surface.
  }
}

export async function recordOptOut(params: {
  phone: string;
  reason?: string;
  source?: string;
}): Promise<void> {
  await ensureSchema();
  const phone = normalisePhone(params.phone);
  if (!phone) return;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "WhatsAppOptOut" (phone, reason, source)
     VALUES ($1, $2, $3)
     ON CONFLICT (phone) DO NOTHING`,
    phone,
    params.reason ?? null,
    params.source ?? 'webhook'
  );
}

export async function isOptedOut(phone: string): Promise<boolean> {
  await ensureSchema();
  const norm = normalisePhone(phone);
  const rows = await prisma.$queryRawUnsafe<Array<{ phone: string }>>(
    'SELECT phone FROM "WhatsAppOptOut" WHERE phone = $1 LIMIT 1',
    norm
  );
  return rows.length > 0;
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

interface BroadcastInput {
  templateName: string;
  languageCode?: string;
  variables?: string[];
  triggeredBy?: string;
}

/** Booking states whose holder counts as implicitly opted in via T&C. */
const BOOKING_AUDIENCE_STATUSES = ['confirmed', 'video_uploaded', 'completed', 'delivered'] as const;

/**
 * SCAL-04 (2026-08-13): recipient scans are paged with a cursor.
 *
 * Both audience queries were unbounded `findMany` calls — every waitlist row,
 * and every PujaBooking that was ever confirmed joined to its user — resolved
 * into one array before a single message went out. The booking scan was also
 * per-BOOKING, so a devotee with 12 bookings appeared 12 times and was
 * de-duplicated in Node afterwards. On a 512 MB Render container the whole
 * audience had to fit in memory at once before the fan-out started.
 *
 * What paging actually bought, stated precisely (the previous wording here —
 * "peak memory at one page regardless of audience size" — was not true):
 *
 *   - BOUNDED: the per-QUERY transfer. One page of rows crosses the wire at a
 *     time instead of the whole audience, and the row WIDTH dropped from full
 *     rows to a single column. That is the bulk of the win.
 *   - STILL O(audience): resident memory. `loadWaitlistPhones` /
 *     `loadBookingHolderPhones` push every phone string into ONE array and
 *     return it, so `runBroadcast` still receives the complete recipient list —
 *     roughly 55 MB of V8 strings at 1M recipients. Paging never holds all the
 *     ROWS; it does hold all the PHONES.
 *
 * Making peak memory genuinely O(page) means streaming each page into the
 * fan-out instead of accumulating, which is a change to runBroadcast's contract,
 * not to these readers.
 *
 * Nobody is dropped either way: the cursor walks the whole set.
 */
const RECIPIENT_PAGE_SIZE = 1000;

async function pageByCursor<T extends { id: string }>(
  fetch: (cursor: string | undefined, take: number) => Promise<T[]>,
  onPage: (rows: T[]) => void,
): Promise<void> {
  let cursor: string | undefined;
  for (;;) {
    const rows = await fetch(cursor, RECIPIENT_PAGE_SIZE);
    if (rows.length === 0) return;
    onPage(rows);
    if (rows.length < RECIPIENT_PAGE_SIZE) return;
    cursor = rows[rows.length - 1]!.id;
  }
}

/** Opted-in waitlist phones, paged. */
async function loadWaitlistPhones(): Promise<string[]> {
  const phones: string[] = [];
  await pageByCursor<{ id: string; phone: string | null }>(
    (cursor, take) =>
      prisma.waitlist.findMany({
        where: {
          whatsappOptIn: true,
          status: { not: 'UNSUBSCRIBED' },
          phone: { not: null },
        },
        select: { id: true, phone: true },
        orderBy: { id: 'asc' },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
    (rows) => {
      for (const r of rows) if (r.phone) phones.push(r.phone);
    },
  );
  return phones;
}

/**
 * Phones of devotees holding a confirmed/completed booking, paged.
 *
 * Asked user-first rather than booking-first: one row per person instead of one
 * row per booking, so the transfer no longer scales with order volume.
 */
async function loadBookingHolderPhones(): Promise<string[]> {
  const phones: string[] = [];
  await pageByCursor<{ id: string; phone: string | null }>(
    (cursor, take) =>
      prisma.user.findMany({
        where: {
          phone: { not: null },
          bookings: { some: { status: { in: [...BOOKING_AUDIENCE_STATUSES] } } },
        },
        select: { id: true, phone: true },
        orderBy: { id: 'asc' },
        take,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      }),
    (rows) => {
      for (const r of rows) if (r.phone) phones.push(r.phone);
    },
  );
  return phones;
}

/**
 * Sends a template to every opted-in waitlist phone, respecting Meta's
 * 50/sec cap. The Waitlist row is treated as opted-in iff
 * `whatsappOptIn=true` AND status != 'UNSUBSCRIBED' AND phone is set.
 */
export async function broadcastToWaitlist(input: BroadcastInput): Promise<BroadcastResult> {
  await ensureSchema();
  const optOut = await loadOptOuts();
  return runBroadcast({
    audience: 'waitlist',
    phones: await loadWaitlistPhones(),
    optOut,
    input,
  });
}

/**
 * Sends to phones on confirmed/completed PujaBooking rows. Implicit opt-in
 * via booking T&C — opt-out table still wins.
 */
export async function broadcastToBookingHolders(
  input: BroadcastInput
): Promise<BroadcastResult> {
  await ensureSchema();
  const optOut = await loadOptOuts();
  return runBroadcast({
    audience: 'bookings',
    phones: await loadBookingHolderPhones(),
    optOut,
    input,
  });
}

/**
 * Sends to every distinct opted-in phone across waitlist + confirmed
 * bookings. Used for product-wide announcements (new feature drops).
 */
export async function broadcastToAll(input: BroadcastInput): Promise<BroadcastResult> {
  await ensureSchema();
  const optOut = await loadOptOuts();
  const [waitlist, bookingHolders] = await Promise.all([
    loadWaitlistPhones(),
    loadBookingHolderPhones(),
  ]);
  return runBroadcast({
    audience: 'all',
    phones: [...waitlist, ...bookingHolders],
    optOut,
    input,
  });
}

async function runBroadcast(params: {
  audience: string;
  phones: string[];
  optOut: Set<string>;
  input: BroadcastInput;
}): Promise<BroadcastResult> {
  const { audience, phones, optOut, input } = params;
  const language = input.languageCode ?? 'en';
  const unique = Array.from(new Set(phones.map(normalisePhone))).filter(
    (p) => p.length >= 10
  );

  let sent = 0;
  let skipped = 0;
  let optedOut = 0;
  let failed = 0;

  for (let i = 0; i < unique.length; i += RATE_LIMIT_PER_SECOND) {
    const batch = unique.slice(i, i + RATE_LIMIT_PER_SECOND);
    await Promise.all(
      batch.map(async (phone) => {
        if (optOut.has(phone)) {
          optedOut += 1;
          await recordDelivery({
            phone,
            template: input.templateName,
            language,
            audience,
            status: 'OPTED_OUT',
            triggeredBy: input.triggeredBy,
          });
          return;
        }
        const result = await sendWhatsappTemplate({
          to: phone,
          template: input.templateName,
          languageCode: language,
          variables: input.variables,
        });
        if (result.skipped) {
          skipped += 1;
          await recordDelivery({
            phone,
            template: input.templateName,
            language,
            audience,
            status: 'SKIPPED',
            triggeredBy: input.triggeredBy,
          });
          return;
        }
        if (result.ok) {
          sent += 1;
          await recordDelivery({
            phone,
            template: input.templateName,
            language,
            audience,
            status: 'SENT',
            messageId: result.messageId,
            triggeredBy: input.triggeredBy,
          });
        } else {
          failed += 1;
          await recordDelivery({
            phone,
            template: input.templateName,
            language,
            audience,
            status: 'FAILED',
            error: result.error,
            triggeredBy: input.triggeredBy,
          });
        }
      })
    );
    if (i + RATE_LIMIT_PER_SECOND < unique.length) {
      await new Promise((r) => setTimeout(r, BATCH_SLEEP_MS));
    }
  }

  return {
    audience,
    template: input.templateName,
    total: unique.length,
    sent,
    skipped,
    optedOut,
    failed,
    enabled: whatsapp.enabled,
  };
}

export async function recentDeliveries(limit = 50): Promise<
  Array<{
    id: string;
    phone: string;
    template: string;
    audience: string;
    status: string;
    created_at: Date;
  }>
> {
  await ensureSchema();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      phone: string;
      template: string;
      audience: string;
      status: string;
      created_at: Date;
    }>
  >(
    'SELECT id, phone, template, audience, status, created_at FROM "WhatsAppDelivery" ORDER BY created_at DESC LIMIT $1',
    Math.min(500, Math.max(1, limit))
  );
  return rows;
}

export const broadcastInternals = {
  ensureSchema,
  normalisePhone,
};
