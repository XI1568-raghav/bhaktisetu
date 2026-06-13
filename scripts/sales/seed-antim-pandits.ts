/**
 * Spec: R-Q4-S-007
 *
 * Load `seeds/antim-pandits-prospects.csv` into Supabase table `antim_sanskar_pandits`
 * with `verification_status='pending'`.
 *
 * STUB: Awaits founder-action.
 * BLOCKING:
 *   1. `supabase/migrations/*_antim_sanskar_pandits.sql` not yet applied (table missing in prod).
 *      Migration directory `supabase/migrations/` does not exist in repo. Founder must:
 *      - choose schema-management path (supabase CLI vs prisma db execute vs psql direct)
 *      - apply table DDL per spec (columns listed in queue spec section "tdd first").
 *   2. `signal-context/kpi-collectors.yaml` does not exist in repo. Founder must either:
 *      - bootstrap signal-context dir + collector registry, or
 *      - inline the SQL query into the existing roadmap KPI snapshot tooling
 *        (`docs/roadmap/_kpi-cache.json` + `scripts/agents/roadmap/_kpi-supabase.mjs`).
 *   3. `DATABASE_URL` env var (Supabase direct) must be set in shell environment.
 *
 * Once unblocked, this script will:
 *   - parse CSV via csv-parse/sync
 *   - upsert rows on `phone` unique key (skip when phone blank — those are founder-collect-onsite)
 *   - set verification_status='pending'
 *   - log inserted/skipped count
 *
 * Run:
 *   pnpm tsx scripts/sales/seed-antim-pandits.ts
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CSV_PATH = resolve(process.cwd(), 'seeds/antim-pandits-prospects.csv');

async function main() {
  const csv = readFileSync(CSV_PATH, 'utf8');
  const lines = csv.trim().split('\n');
  const header = lines[0].split(',');
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',');
    return Object.fromEntries(header.map((h, i) => [h, cells[i] ?? '']));
  });

  console.log(`[seed-antim-pandits] loaded ${rows.length} rows from ${CSV_PATH}`);

  if (!process.env.DATABASE_URL) {
    console.error('[seed-antim-pandits] DATABASE_URL not set — exiting (founder-action-required).');
    console.error('[seed-antim-pandits] See script docblock for blocking dependencies.');
    process.exit(0);
  }

  // Founder TODO once schema applied:
  //   const { Pool } = await import('pg');
  //   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  //   for (const row of rows) {
  //     if (!row.phone_or_referral_source || row.notes?.includes('founder-collect-onsite')) {
  //       skipped++; continue;
  //     }
  //     await pool.query(
  //       `INSERT INTO antim_sanskar_pandits (full_name, primary_ghat, phone, source, verification_status)
  //        VALUES ($1, $2, $3, $4, 'pending')
  //        ON CONFLICT (phone) DO NOTHING`,
  //       [row.full_name, row.primary_ghat, row.phone_or_referral_source, row.lead_origin]
  //     );
  //     inserted++;
  //   }
  console.warn('[seed-antim-pandits] schema not applied yet — stub exit.');
}

main().catch((err) => {
  console.error('[seed-antim-pandits] failed:', err);
  process.exit(1);
});
