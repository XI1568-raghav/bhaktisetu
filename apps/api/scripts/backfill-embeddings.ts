/**
 * One-shot backfill of pgvector embeddings for content_items, temples,
 * and puja_types. Idempotent — only fills rows where `embedding IS NULL`,
 * so safe to re-run.
 *
 * Run after:
 *   1. The pgvector migration has been applied to Supabase
 *      (apps/api/prisma/migrations/20260426_pgvector/migration.sql)
 *   2. COHERE_API_KEY is set in your local .env so this script can call
 *      Cohere from your machine.
 *
 * Usage:
 *   pnpm --filter @poojly/api exec tsx scripts/backfill-embeddings.ts
 *
 * Cohere caps the batch at 96 texts per request. We chunk to 64 for
 * safety + so a single bad row doesn't poison a whole batch.
 *
 * Cost: ~$0 — Cohere trial tier covers far more than our seeded corpus.
 * Time: ~30-60 seconds for the typical seeded dataset.
 */

// Load .env manually (no dotenv dep) — works on Node 22+ which has the
// --env-file flag, plus a hand-rolled fallback for older Node versions
// and tsx invocations that don't pass --env-file.
import { readFileSync } from 'node:fs';
import { resolve as resolvePath, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
for (const candidate of ['.env', '.env.local']) {
  const path = resolvePath(here, '..', candidate);
  try {
    const raw = readFileSync(path, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // file missing — fine, env vars may already be exported in shell
  }
}

import { prisma } from '../src/lib/prisma.js';
import { generateEmbeddingsBatch, toPgVector, embeddings } from '../src/lib/embeddings.js';

const BATCH = 64;

async function backfillTable(
  table: 'content_items' | 'temples' | 'puja_types',
  rows: Array<{ id: string; text: string }>,
): Promise<{ filled: number; skipped: number; failed: number }> {
  let filled = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const vecs = await generateEmbeddingsBatch(
      chunk.map((r) => r.text),
      'search_document',
    );
    const vecsReturned = vecs.filter((v) => v !== null).length;
    if (vecsReturned === 0) {
      console.error(`  ! Cohere returned 0/${chunk.length} embeddings for batch starting at row ${i}.`);
      console.error(`  ! Likely causes: invalid COHERE_API_KEY, rate limit, network. Run a debug call below.`);
    }
    for (let j = 0; j < chunk.length; j++) {
      const vec = vecs[j];
      if (!vec) {
        if (!chunk[j].text.trim()) skipped++;
        else failed++;
        continue;
      }
      const lit = toPgVector(vec);
      try {
        // id columns are uuid; Prisma sends $1 as text, so cast explicitly.
        await prisma.$executeRawUnsafe(
          `update ${table} set embedding = '${lit}'::vector where id = $1::uuid`,
          chunk[j].id,
        );
        filled++;
      } catch (err) {
        failed++;
        console.error(`  ! DB update failed for ${table}/${chunk[j].id}:`, (err as Error).message);
      }
    }
    process.stdout.write(`  ${table}: ${Math.min(i + BATCH, rows.length)} / ${rows.length}\r`);
  }
  process.stdout.write('\n');
  return { filled, skipped, failed };
}

async function main() {
  if (!embeddings.enabled) {
    console.error('COHERE_API_KEY is not set. Add it to apps/api/.env and re-run.');
    process.exit(1);
  }

  // Sanity-check Cohere with one direct call so we surface the real error
  // (auth/rate-limit/network) instead of a silent count of failures.
  console.log('Pinging Cohere…');
  const probe = await fetch('https://api.cohere.com/v1/embed', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'embed-multilingual-v3.0',
      texts: ['hello'],
      input_type: 'search_document',
      embedding_types: ['float'],
    }),
  });
  const probeBody = await probe.text();
  if (!probe.ok) {
    console.error(`Cohere probe failed: HTTP ${probe.status}`);
    console.error(`Response: ${probeBody.slice(0, 500)}`);
    console.error('\nFix the issue above and re-run. Common fixes:');
    console.error('  - 401: COHERE_API_KEY is invalid → re-copy from cohere.com dashboard');
    console.error('  - 404 model: model name changed → check cohere docs');
    console.error('  - 429: rate-limited → wait 60s and re-run');
    process.exit(1);
  }
  console.log('Cohere OK. Proceeding with backfill…\n');

  // ── content_items ─────────────────────────────────────────────────
  // Cast to any for the embedding column since Prisma client doesn't
  // know about it (raw migration, not in schema.prisma yet).
  const contentRows = await prisma.$queryRawUnsafe<
    Array<{ id: string; title: string; body: string | null; deity: string | null }>
  >(
    `select id, title, body, deity from content_items where embedding is null`,
  );
  console.log(`content_items: ${contentRows.length} rows pending`);
  const cRes = await backfillTable(
    'content_items',
    contentRows.map((r) => ({
      id: r.id,
      text: [r.title, r.deity ?? '', (r.body ?? '').slice(0, 1500)].filter(Boolean).join('. '),
    })),
  );
  console.log(`  → filled=${cRes.filled} skipped=${cRes.skipped} failed=${cRes.failed}`);

  // ── temples ───────────────────────────────────────────────────────
  const templeRows = await prisma.$queryRawUnsafe<
    Array<{ id: string; name: string; description: string | null; deity_primary: string | null; city: string | null }>
  >(
    `select id, name, description, deity_primary, city from temples where embedding is null`,
  );
  console.log(`temples: ${templeRows.length} rows pending`);
  const tRes = await backfillTable(
    'temples',
    templeRows.map((r) => ({
      id: r.id,
      text: [r.name, r.deity_primary ?? '', r.city ?? '', (r.description ?? '').slice(0, 1500)]
        .filter(Boolean)
        .join('. '),
    })),
  );
  console.log(`  → filled=${tRes.filled} skipped=${tRes.skipped} failed=${tRes.failed}`);

  // ── puja_types ────────────────────────────────────────────────────
  const pujaRows = await prisma.$queryRawUnsafe<
    Array<{ id: string; name: string; description: string }>
  >(
    `select id, name, description from puja_types where embedding is null`,
  );
  console.log(`puja_types: ${pujaRows.length} rows pending`);
  const pRes = await backfillTable(
    'puja_types',
    pujaRows.map((r) => ({
      id: r.id,
      text: [r.name, r.description.slice(0, 1500)].join('. '),
    })),
  );
  console.log(`  → filled=${pRes.filled} skipped=${pRes.skipped} failed=${pRes.failed}`);

  await prisma.$disconnect();
  console.log('\nDone.');
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
