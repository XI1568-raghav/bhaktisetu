import { prisma } from './prisma.js';

// Boot-time defensive schema check. Render's start command bypasses our
// `pnpm start` wrapper that runs `prisma migrate deploy`, which means
// pending migrations never apply in prod. Until the dashboard start
// command is fixed (see docs/activation-gates.md), we replay the
// non-idempotent migrations that broke prod via IF NOT EXISTS DDL on
// every boot. All statements here are safe to run repeatedly — they
// no-op once the schema matches.
//
// Scope: hot-path tables and columns hit by auth + admin + logged-in
// devotee routes. Migrations from 2026-05-02 onward were already
// authored with IF NOT EXISTS; the two exceptions are user_blocked
// (2026-05-11) and reading_progress (2026-05-14).

const STATEMENTS: string[] = [
  // users.blocked + companions — auth.ts hot path
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked" BOOLEAN NOT NULL DEFAULT false`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_reason" TEXT`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "blocked_at" TIMESTAMP(3)`,
  `CREATE INDEX IF NOT EXISTS "users_blocked_idx" ON "users" ("blocked") WHERE "blocked" = true`,

  // reading_progress — /api/v1/me/reading-progress
  `CREATE TABLE IF NOT EXISTS "reading_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "book_slug" TEXT NOT NULL,
    "chapter_slug" TEXT NOT NULL,
    "chapter_number" INTEGER NOT NULL,
    "scroll_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_verse" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "reading_progress_user_id_book_slug_key" ON "reading_progress" ("user_id", "book_slug")`,
  `CREATE INDEX IF NOT EXISTS "reading_progress_user_id_idx" ON "reading_progress" ("user_id")`,
];

export async function ensureSchemaInvariants(
  log: { info: (msg: string) => void; error: (obj: unknown, msg?: string) => void },
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    log.info('ensureSchemaInvariants: DATABASE_URL unset, skipping');
    return;
  }
  let applied = 0;
  for (const sql of STATEMENTS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      applied += 1;
    } catch (err) {
      // Don't fail boot on schema fix-up — log and continue. The underlying
      // route will surface the real problem if the column genuinely needed
      // creating and this DDL failed.
      log.error(
        { err: err instanceof Error ? err.message : String(err), sql: sql.slice(0, 80) },
        'ensureSchemaInvariants: statement failed',
      );
    }
  }
  log.info(`ensureSchemaInvariants: ${applied}/${STATEMENTS.length} statements ran cleanly`);
}
