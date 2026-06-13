/**
 * Bulk-reset stale EMAILED temple leads — R-Q1-CS-007.
 *
 * Paired with CS-005. Resets a rolling window of TEMPLE leads stuck in
 * status=EMAILED with zero reply for >30 days back to status=NEW +
 * contact_count=0 so the next outreach cycle re-targets them as fresh.
 *
 * Idempotent (skips leads with metadata.cs007_reset_at already set), dry-run
 * gated, and guards against collision with CS-005 in-flight send job.
 * Rollback-safe: prior status/contact_count/last_contacted_at snapshot is
 * stored in metadata.cs007_prior.
 *
 * Run:
 *   # dry-run (prints plan, NO writes)
 *   DATABASE_URL=postgres://... pnpm tsx apps/api/scripts/ops/cs007-reset-stale-temple-leads.ts --dry-run
 *
 *   # live
 *   DATABASE_URL=postgres://... pnpm tsx apps/api/scripts/ops/cs007-reset-stale-temple-leads.ts --limit=200
 *
 * Founder runs this. Aborts (exit 2) if CS-005 send job still has unsent
 * rows (else this would reset the same leads CS-005 is about to touch).
 *
 * Audit log: best-effort INSERT into ops_audit_log; if table absent, falls
 * back to JSONL written under docs/agent-reports/cs007-audit-<date>.jsonl
 * so the founder still has a per-reset record for rollback.
 */

import { writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';

export interface StaleLead {
  id: string;
  status: string;
  contactCount: number;
  lastContactedAt: string | null;
}

export interface RunSummary {
  scanned: number;
  reset: number;
  skipped: number;
}

function assertPositiveInt(name: string, n: number): void {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer (got ${n})`);
  }
}

export function selectStaleLeadsSql(limit = 200): string {
  assertPositiveInt('limit', limit);
  // Targets the actual Postgres table `leads` (Prisma @@map("leads")).
  // reply_count + cs007_reset_at live inside the jsonb metadata column.
  return `
    SELECT id, status, contact_count, last_contacted_at
      FROM leads
     WHERE role = 'TEMPLE'
       AND status = 'EMAILED'
       AND COALESCE((metadata->>'reply_count')::int, 0) = 0
       AND last_contacted_at < NOW() - INTERVAL '30 days'
       AND (metadata->>'cs007_reset_at') IS NULL
     LIMIT ${limit}
  `.trim();
}

export function cs005UnsentGuardSql(): string {
  // CS-005 marks rows it has resent via metadata.cs005_resent_at. If any
  // EMAILED row older than 30d still lacks that marker, CS-005 isn't done.
  return `
    SELECT COUNT(*)::int AS pending
      FROM leads
     WHERE status = 'EMAILED'
       AND (metadata->>'cs005_resent_at') IS NULL
       AND created_at < NOW() - INTERVAL '30 days'
       AND COALESCE((metadata->>'reply_count')::int, 0) = 0
  `.trim();
}

export function buildResetUpdate(
  lead: StaleLead,
  nowIso: string,
): { sql: string; params: Array<string | number> } {
  const snapshot = {
    cs007_reset_at: nowIso,
    cs007_prior: {
      status: lead.status,
      contact_count: lead.contactCount,
      last_contact_at: lead.lastContactedAt,
    },
  };
  // Parameter order: $1 = metadata jsonb merge, $2 = lead id.
  // Postgres jsonb || jsonb merges keys; existing metadata keys preserved
  // except where snapshot overrides.
  const sql = `
    UPDATE leads
       SET status = 'NEW',
           contact_count = 0,
           metadata = COALESCE(metadata, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
     WHERE id = $2
       AND (metadata->>'cs007_reset_at') IS NULL
  `.trim();
  return { sql, params: [JSON.stringify(snapshot), lead.id] };
}

export function buildAuditLogInsert(
  leadId: string,
  nowIso: string,
): { sql: string; params: Array<string> } {
  const sql = `
    INSERT INTO ops_audit_log (action, target_id, created_at, notes)
    VALUES ($1, $2, $3, $4)
  `.trim();
  return {
    sql,
    params: ['cs007_reset', leadId, nowIso, `R-Q1-CS-007 bulk reset @ ${nowIso}`],
  };
}

export interface CliArgs {
  dryRun: boolean;
  limit: number;
}

export function parseArgs(argv: string[]): CliArgs {
  let dryRun = false;
  let limit = 200;
  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      const raw = arg.slice('--limit='.length);
      const n = Number(raw);
      if (!Number.isInteger(n) || n <= 0) {
        throw new Error(`--limit must be a positive integer (got "${raw}")`);
      }
      if (n > 500) {
        throw new Error(`--limit cap is 500 (got ${n}). Tune scopeNote w/ founder before raising.`);
      }
      limit = n;
    }
  }
  return { dryRun, limit };
}

export function summarize(input: RunSummary): RunSummary {
  return { scanned: input.scanned, reset: input.reset, skipped: input.skipped };
}

interface PgClient {
  query: (sql: string, params?: Array<unknown>) => Promise<{ rows: Array<Record<string, unknown>> }>;
  end: () => Promise<void>;
}

async function loadPgClient(databaseUrl: string): Promise<PgClient> {
  const mod = await import('pg').catch(() => null);
  if (!mod) {
    throw new Error('pg module not available. Run `pnpm add -D -F @bhaktisetu/api pg` if missing.');
  }
  const { Client } = mod as unknown as { Client: new (opts: { connectionString: string }) => PgClient };
  const client = new Client({ connectionString: databaseUrl });
  // The `pg` Client has a connect() that must be called. We narrow type loosely.
  await (client as unknown as { connect: () => Promise<void> }).connect();
  return client;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('FATAL: DATABASE_URL env required.');
    process.exit(1);
  }

  const nowIso = new Date().toISOString();
  console.log(`[cs007] mode=${args.dryRun ? 'DRY-RUN' : 'LIVE'} limit=${args.limit} now=${nowIso}`);

  const client = await loadPgClient(databaseUrl);
  const auditFallbackLines: string[] = [];

  try {
    // Step 1: collision guard against CS-005.
    const guard = await client.query(cs005UnsentGuardSql());
    const pending = Number((guard.rows[0]?.pending as number | string) ?? 0);
    if (pending > 0) {
      console.error(
        `ABORT: CS-005 still has ${pending} unsent EMAILED rows >30d w/o cs005_resent_at marker. ` +
          `Wait until CS-005 send job completes, then re-run CS-007.`,
      );
      process.exit(2);
    }
    console.log('[cs007] CS-005 collision guard PASS (0 unsent rows).');

    // Step 2: select stale leads.
    const sel = await client.query(selectStaleLeadsSql(args.limit));
    const stale: StaleLead[] = sel.rows.map((r) => ({
      id: String(r.id),
      status: String(r.status),
      contactCount: Number(r.contact_count ?? 0),
      lastContactedAt: r.last_contacted_at ? String(r.last_contacted_at) : null,
    }));
    console.log(`[cs007] scanned ${stale.length} stale TEMPLE leads.`);

    if (args.dryRun) {
      console.log('[cs007] DRY-RUN — sample (first 5):');
      for (const lead of stale.slice(0, 5)) {
        console.log(`  - ${lead.id} status=${lead.status} contact_count=${lead.contactCount} last=${lead.lastContactedAt}`);
      }
      console.log(`[cs007] DRY-RUN — would reset ${stale.length} leads. No writes performed.`);
      return;
    }

    // Step 3: reset each w/ audit.
    let reset = 0;
    let skipped = 0;
    for (const lead of stale) {
      const { sql, params } = buildResetUpdate(lead, nowIso);
      const result = await client.query(sql, params);
      const updated = (result as unknown as { rowCount?: number }).rowCount ?? 0;
      if (updated > 0) {
        reset += 1;
        // Best-effort audit log INSERT. Falls back to JSONL on missing table.
        const audit = buildAuditLogInsert(lead.id, nowIso);
        try {
          await client.query(audit.sql, audit.params);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (/relation\s+"?ops_audit_log"?\s+does not exist/i.test(msg)) {
            auditFallbackLines.push(
              JSON.stringify({
                action: 'cs007_reset',
                target_id: lead.id,
                created_at: nowIso,
                notes: `R-Q1-CS-007 bulk reset @ ${nowIso}`,
              }),
            );
          } else {
            throw err;
          }
        }
      } else {
        skipped += 1;
      }
    }

    const summary = summarize({ scanned: stale.length, reset, skipped });
    console.log('--- CS-007 summary ---');
    console.log(`Scanned: ${summary.scanned}`);
    console.log(`Reset:   ${summary.reset}`);
    console.log(`Skipped: ${summary.skipped} (already had cs007_reset_at marker)`);

    if (auditFallbackLines.length > 0) {
      const today = nowIso.slice(0, 10);
      const outDir = join(process.cwd(), 'docs', 'agent-reports');
      mkdirSync(outDir, { recursive: true });
      const outPath = join(outDir, `cs007-audit-${today}.jsonl`);
      try {
        appendFileSync(outPath, auditFallbackLines.join('\n') + '\n');
      } catch {
        writeFileSync(outPath, auditFallbackLines.join('\n') + '\n');
      }
      console.log(
        `[cs007] ops_audit_log table missing — ${auditFallbackLines.length} audit entries written to ${outPath}`,
      );
    }

    console.log('Next: founder runs post-run SQL audit per runbook (docs/ops/cs-007-reset-stale-leads-runbook.md).');
  } finally {
    await client.end();
  }
}

if (typeof process !== 'undefined' && process.argv[1]?.endsWith('cs007-reset-stale-temple-leads.ts')) {
  main().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}

export const __testing = {
  selectStaleLeadsSql,
  cs005UnsentGuardSql,
  buildResetUpdate,
  buildAuditLogInsert,
  parseArgs,
  summarize,
};
