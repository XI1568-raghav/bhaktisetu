import { prisma } from './prisma.js';

/**
 * notification-log.ts — the durable record that a notification was attempted.
 *
 * NOTIF-14: before this there was NO record that any notification was ever
 * attempted, anywhere. Seven candidate read endpoints 404'd, there is no
 * Notification model in schema.prisma, and every send path was fire-and-forget
 * with the result discarded — `notifyDevotee`/`notifyPriest` wrapped each leg in
 * `.catch(() => undefined)` and `sendEmail`'s `{ok:false}` was ignored at almost
 * every call site. So:
 *   - a devotee who missed a push had no way to see it later (no bell, no history);
 *   - support could not answer "did the confirmation go out?" for any booking;
 *   - nothing could be retried, because nothing knew a send had failed.
 * Combined with NOTIF-03 (all four channels unconfigured) the system was silent
 * AND unable to prove it was silent.
 *
 * ONE ROW PER EVENT, with a column per channel. That shape serves all three
 * consumers at once: the devotee's in-app centre renders one item per event, an
 * operator reads one row to answer "was she told, and on what?", and a retry job
 * has a single row to key off.
 *
 * WHAT IT MUST NEVER DO
 *
 * `sent` means the transport accepted the message. `skipped` means the channel
 * is unconfigured (see ChannelOutcome in booking-notify.service.ts). Those must
 * stay distinct here too — folding them together is precisely what made a
 * comms layer with zero configured channels read green.
 *
 * WHY THE TABLE IS CREATED HERE AND NOT BY A MIGRATION: see the same note in
 * notification-run-log.ts. Render's start command bypasses `prisma migrate
 * deploy`, so idempotent `CREATE TABLE IF NOT EXISTS` DDL is already this
 * repo's way of making a table reliably exist (lib/ensure-schema.ts). Every
 * failure here degrades to a structured log line — the write path is
 * best-effort by contract and must never break a booking.
 *
 * `user_id`/`booking_id` are TEXT, deliberately: this table has no joins, and a
 * uuid column bound as text is exactly the 42804 that made NOTIF-02 report
 * success while writing nothing.
 */

const CREATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS "notification_log" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    TEXT,
  "audience"   TEXT NOT NULL DEFAULT 'devotee',
  "event"      TEXT NOT NULL,
  "booking_id" TEXT,
  "title"      TEXT NOT NULL DEFAULT '',
  "body"       TEXT NOT NULL DEFAULT '',
  "url"        TEXT,
  "push"       TEXT NOT NULL DEFAULT 'no-target',
  "whatsapp"   TEXT NOT NULL DEFAULT 'no-target',
  "email"      TEXT NOT NULL DEFAULT 'no-target',
  "delivered"  BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
)`;

const CREATE_INDEX_SQL = `CREATE INDEX IF NOT EXISTS "notification_log_user_created_idx"
  ON "notification_log" ("user_id", "created_at" DESC)`;

let tableReady: Promise<boolean> | null = null;

async function ensureTable(): Promise<boolean> {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(CREATE_TABLE_SQL);
      await prisma.$executeRawUnsafe(CREATE_INDEX_SQL);
      return true;
    })().catch((err: unknown) => {
      console.warn(
        '[notification-log] table unavailable; notifications will only be logged to stdout:',
        err instanceof Error ? err.message : String(err),
      );
      return false;
    });
  }
  return tableReady;
}

export interface NotificationRecord {
  userId?: string | null;
  /** Who this was aimed at — the devotee or the pandit. */
  audience: 'devotee' | 'priest';
  event: string;
  bookingId?: string | null;
  title: string;
  body: string;
  url?: string | null;
  push: string;
  whatsapp: string;
  email: string;
  delivered: boolean;
}

/**
 * Persist one attempted notification. Never throws.
 *
 * Returns true when a row was written, false when it degraded to logging only —
 * the caller must not treat the return value as "the devotee was notified".
 */
export async function recordNotification(rec: NotificationRecord): Promise<boolean> {
  if (!(await ensureTable())) return false;
  try {
    const rows = await prisma.$executeRawUnsafe(
      `INSERT INTO "notification_log"
         ("user_id","audience","event","booking_id","title","body","url","push","whatsapp","email","delivered")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      rec.userId ?? null,
      rec.audience,
      rec.event,
      rec.bookingId ?? null,
      rec.title,
      rec.body,
      rec.url ?? null,
      rec.push,
      rec.whatsapp,
      rec.email,
      rec.delivered,
    );
    return rows > 0;
  } catch (err) {
    console.warn(
      '[notification-log] insert failed:',
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

export interface NotificationListItem {
  id: string;
  event: string;
  bookingId: string | null;
  title: string;
  body: string;
  url: string | null;
  channels: { push: string; whatsapp: string; email: string };
  delivered: boolean;
  createdAt: string;
}

interface RawRow {
  id: string;
  event: string;
  booking_id: string | null;
  title: string;
  body: string;
  url: string | null;
  push: string;
  whatsapp: string;
  email: string;
  delivered: boolean;
  created_at: Date;
}

/**
 * The devotee's own notification history, newest first.
 *
 * Returns an EMPTY list when there is nothing — never a placeholder, never a
 * fixture. An empty inbox is the honest answer for an account that has not been
 * notified yet, and (today) for a product whose four channels are unconfigured.
 *
 * `available:false` means the log table itself could not be read, which is a
 * different fact from "you have no notifications" and must not be rendered as
 * one.
 */
export async function listNotifications(
  userId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<{ items: NotificationListItem[]; available: boolean }> {
  if (!(await ensureTable())) return { items: [], available: false };
  const limit = Math.min(Math.max(opts.limit ?? 30, 1), 100);
  try {
    const rows = await prisma.$queryRawUnsafe<RawRow[]>(
      `SELECT "id","event","booking_id","title","body","url","push","whatsapp","email","delivered","created_at"
         FROM "notification_log"
        WHERE "user_id" = $1
          AND ($2::timestamptz IS NULL OR "created_at" < $2::timestamptz)
        ORDER BY "created_at" DESC
        LIMIT ${limit}`,
      userId,
      opts.before ?? null,
    );
    return {
      items: rows.map((r) => ({
        id: r.id,
        event: r.event,
        bookingId: r.booking_id,
        title: r.title,
        body: r.body,
        url: r.url,
        channels: { push: r.push, whatsapp: r.whatsapp, email: r.email },
        delivered: r.delivered,
        createdAt: new Date(r.created_at).toISOString(),
      })),
      available: true,
    };
  } catch (err) {
    console.warn(
      '[notification-log] read failed:',
      err instanceof Error ? err.message : String(err),
    );
    return { items: [], available: false };
  }
}

/** Test seam — drops the memoised DDL promise. */
export function __resetNotificationLogForTests(): void {
  tableReady = null;
}
