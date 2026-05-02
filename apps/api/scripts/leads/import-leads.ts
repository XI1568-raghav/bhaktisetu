/**
 * Lead importer.
 *
 * Wraps the manual `_real-contacts-2026-05-02.ts` and Apollo-enriched
 * `_apollo-contacts-<date>.ts` datasets behind a single entry point.
 *
 * Source selection:
 *   LEADS_SOURCE=manual (default)  → imports `_real-contacts-2026-05-02.ts`
 *   LEADS_SOURCE=apollo            → imports the most recent
 *                                    `_apollo-contacts-<YYYY-MM-DD>.ts` in
 *                                    this directory. Errors with a clear
 *                                    message if none exists.
 *   LEADS_SOURCE=both              → manual first, then apollo.
 *
 * Run:
 *   LEADS_SOURCE=apollo pnpm --filter @poojly/api tsx scripts/leads/import-leads.ts
 */
import { readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { LeadRole } from '@prisma/client';
import { upsertLead, prisma, type RawLead } from './_shared.js';

type Source = 'manual' | 'apollo' | 'both';

interface ManualLead {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  source: string;
  sourceUrl?: string;
  verifiedFrom?: string;
}

interface ApolloLeadShape {
  name: string;
  email: string;
  title: string | null;
  organization: string | null;
  location: string | null;
  source: string;
  sourceUrl: string;
  apolloIcp: string;
}

interface ManualBucket {
  role: LeadRole;
  rows: ManualLead[];
}

interface ApolloBucket {
  role: LeadRole;
  rows: ApolloLeadShape[];
}

function resolveSource(): Source {
  const v = (process.env.LEADS_SOURCE ?? 'manual').toLowerCase();
  if (v === 'apollo' || v === 'both') return v;
  return 'manual';
}

function findLatestApolloFile(dir: string): string | null {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return null;
  }
  const candidates = entries
    .filter((f) => /^_apollo-contacts-\d{4}-\d{2}-\d{2}\.ts$/.test(f))
    .map((f) => ({ f, mtime: statSync(join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return candidates[0] ? join(dir, candidates[0].f) : null;
}

function manualToRaw(r: ManualLead): RawLead {
  return {
    name: r.name,
    city: r.city ?? null,
    state: r.state ?? null,
    country: r.country ?? 'India',
    phone: r.phone ?? null,
    email: r.email ?? null,
    source: r.source,
    sourceUrl: r.sourceUrl ?? r.websiteUrl ?? null,
    metadata: {
      websiteUrl: r.websiteUrl,
      verifiedAt: '2026-05-02',
      verifiedFrom: r.verifiedFrom,
      sourceClass: 'web-scrape-public',
      researchPass: '2026-05-02-real-contacts',
    },
  };
}

function apolloToRaw(r: ApolloLeadShape): RawLead {
  return {
    name: r.name,
    city: null,
    state: null,
    country: 'India',
    phone: null, // email-only — never persist phones from Apollo
    email: r.email,
    source: r.source,
    sourceUrl: r.sourceUrl,
    metadata: {
      title: r.title,
      organization: r.organization,
      location: r.location,
      apolloIcp: r.apolloIcp,
      sourceClass: 'apollo-enrichment',
    },
  };
}

async function importManual(): Promise<{ inserted: number; skipped: number }> {
  const mod = (await import('./_real-contacts-2026-05-02.js')) as {
    ALL: ManualBucket[];
  };
  let inserted = 0;
  let skipped = 0;
  for (const { role, rows } of mod.ALL) {
    for (const r of rows) {
      const result = await upsertLead(prisma, role, manualToRaw(r));
      if (result === 'created') inserted++;
      else skipped++;
    }
    console.log(`[import-leads/manual] ${role}: total=${rows.length}`);
  }
  return { inserted, skipped };
}

async function importApollo(
  dir: string,
): Promise<{ inserted: number; skipped: number }> {
  const file = findLatestApolloFile(dir);
  if (!file) {
    console.warn(
      `[import-leads/apollo] no _apollo-contacts-*.ts file found in ${dir} — run \`pnpm --filter @poojly/api enrich-leads\` first`,
    );
    return { inserted: 0, skipped: 0 };
  }
  const mod = (await import(pathToFileURL(file).href)) as {
    ALL: ApolloBucket[];
  };
  let inserted = 0;
  let skipped = 0;
  for (const { role, rows } of mod.ALL) {
    for (const r of rows) {
      const result = await upsertLead(prisma, role, apolloToRaw(r));
      if (result === 'created') inserted++;
      else skipped++;
    }
    console.log(`[import-leads/apollo] ${role}: total=${rows.length}`);
  }
  return { inserted, skipped };
}

async function main(): Promise<void> {
  const source = resolveSource();
  const dir = dirname(fileURLToPath(import.meta.url));
  console.log(`[import-leads] source=${source}`);

  let inserted = 0;
  let skipped = 0;

  try {
    if (source === 'manual' || source === 'both') {
      const r = await importManual();
      inserted += r.inserted;
      skipped += r.skipped;
    }
    if (source === 'apollo' || source === 'both') {
      const r = await importApollo(dir);
      inserted += r.inserted;
      skipped += r.skipped;
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }

  console.log(
    `[import-leads] DONE source=${source} inserted=${inserted} skipped=${skipped}`,
  );
}

main().catch((err) => {
  console.error('[import-leads] fatal:', err);
  process.exit(1);
});
