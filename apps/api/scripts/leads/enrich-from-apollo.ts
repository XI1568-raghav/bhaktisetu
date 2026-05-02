/**
 * Apollo.io lead enrichment.
 *
 * Replaces / augments the manual `_real-contacts-2026-05-02.ts` dataset with
 * up to 500 ICP-matched contacts (5 ICPs × up to 100 each, deduped by email).
 *
 * Free tier = 60 credits/month. Each surfaced person ≈ 1 credit. With
 * `per_page: 10` and 5 queries we burn ≤ 50 credits/run. Tune via
 * APOLLO_PER_PAGE / APOLLO_PAGES env vars (defaults 10 / 1).
 *
 * Run:
 *   pnpm --filter @poojly/api enrich-leads
 *
 * If APOLLO_API_KEY is missing, prints a notice and exits 0 — never errors.
 *
 * Output: apps/api/scripts/leads/_apollo-contacts-<YYYY-MM-DD>.ts with the
 * same shape as `_real-contacts-2026-05-02.ts` (TEMPLES / PRIESTS /
 * ASTROLOGERS / WELLNESS / GAUSHALAS named exports + `ALL`). Email-only —
 * phone numbers from Apollo are deliberately dropped (compliance).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

// _shared.ts already auto-loads .env into process.env on import. Replicate
// the small bootstrap here so we don't depend on prisma during enrichment
// (the script runs even without DATABASE_URL).
try {
  const envPath = resolve(process.cwd(), '.env');
  const raw = readFileSync(envPath, 'utf-8');
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // ok in CI / when .env absent
}

import {
  searchPeople,
  type ApolloPerson,
  type ApolloPersonQuery,
} from '../../src/services/apollo.service.js';

type Role =
  | 'TEMPLE'
  | 'PRIEST'
  | 'ASTROLOGER'
  | 'WELLNESS_INSTRUCTOR'
  | 'GAUSHALA';

interface ICP {
  varName: 'TEMPLES' | 'PRIESTS' | 'ASTROLOGERS' | 'WELLNESS' | 'GAUSHALAS';
  role: Role;
  query: ApolloPersonQuery;
}

const PER_PAGE = Math.max(
  1,
  Math.min(100, Number(process.env.APOLLO_PER_PAGE ?? 10)),
);
const PAGES = Math.max(1, Math.min(10, Number(process.env.APOLLO_PAGES ?? 1)));
const MAX_PER_ICP = Math.max(
  1,
  Math.min(500, Number(process.env.APOLLO_MAX_PER_ICP ?? 100)),
);

const ICPS: ICP[] = [
  {
    varName: 'TEMPLES',
    role: 'TEMPLE',
    query: {
      q_organization_keyword_tags: ['temple', 'mandir'],
      person_titles: ['administrator', 'manager', 'trustee'],
      person_locations: ['India'],
    },
  },
  {
    varName: 'GAUSHALAS',
    role: 'GAUSHALA',
    query: {
      q_organization_keyword_tags: ['gaushala'],
      person_titles: ['administrator', 'manager', 'trustee'],
      person_locations: ['India'],
    },
  },
  {
    varName: 'ASTROLOGERS',
    role: 'ASTROLOGER',
    query: {
      q_organization_keyword_tags: ['astrologer'],
      person_titles: ['administrator', 'manager', 'trustee'],
      person_locations: ['India'],
    },
  },
  {
    varName: 'WELLNESS',
    role: 'WELLNESS_INSTRUCTOR',
    query: {
      q_organization_keyword_tags: ['wellness'],
      person_titles: ['administrator', 'manager', 'trustee'],
      person_locations: ['India'],
    },
  },
  {
    varName: 'PRIESTS',
    role: 'PRIEST',
    query: {
      q_organization_keyword_tags: ['priest', 'pandit'],
      person_titles: ['administrator', 'manager', 'trustee'],
      person_locations: ['India'],
    },
  },
];

interface ApolloLeadRow {
  name: string;
  email: string;
  title: string | null;
  organization: string | null;
  location: string | null;
  source: string;
  sourceUrl: string;
  apolloIcp: string;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dedupeByEmail(rows: ApolloLeadRow[]): ApolloLeadRow[] {
  const seen = new Set<string>();
  const out: ApolloLeadRow[] = [];
  for (const r of rows) {
    const key = r.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

async function fetchIcp(icp: ICP): Promise<ApolloLeadRow[]> {
  const collected: ApolloPerson[] = [];
  for (let page = 1; page <= PAGES; page++) {
    if (collected.length >= MAX_PER_ICP) break;
    const batch = await searchPeople({
      ...icp.query,
      per_page: PER_PAGE,
      page,
    });
    if (!batch.length) break;
    collected.push(...batch);
  }
  const trimmed = collected.slice(0, MAX_PER_ICP);
  const rows: ApolloLeadRow[] = [];
  for (const p of trimmed) {
    if (!p.email) continue; // email-only persistence
    rows.push({
      name: p.name,
      email: p.email,
      title: p.title,
      organization: p.organization,
      location: p.location,
      source: 'apollo.io',
      sourceUrl: 'https://app.apollo.io/',
      apolloIcp: icp.varName.toLowerCase(),
    });
  }
  return rows;
}

function tsLiteral(v: string | null): string {
  if (v === null) return 'null';
  return JSON.stringify(v);
}

function renderRows(rows: ApolloLeadRow[]): string {
  if (!rows.length) return '[]';
  const lines: string[] = ['['];
  for (const r of rows) {
    lines.push('  {');
    lines.push(`    name: ${JSON.stringify(r.name)},`);
    lines.push(`    email: ${JSON.stringify(r.email)},`);
    lines.push(`    title: ${tsLiteral(r.title)},`);
    lines.push(`    organization: ${tsLiteral(r.organization)},`);
    lines.push(`    location: ${tsLiteral(r.location)},`);
    lines.push(`    source: ${JSON.stringify(r.source)},`);
    lines.push(`    sourceUrl: ${JSON.stringify(r.sourceUrl)},`);
    lines.push(`    apolloIcp: ${JSON.stringify(r.apolloIcp)},`);
    lines.push('  },');
  }
  lines.push(']');
  return lines.join('\n');
}

function renderFile(
  date: string,
  buckets: Record<ICP['varName'], ApolloLeadRow[]>,
): string {
  const header = `// Auto-generated ${date} via Apollo.io. DO NOT EDIT.\n`;
  const docs = `/**\n * Apollo.io enriched contacts (${date}).\n *\n * Generated by \`pnpm --filter @poojly/api enrich-leads\`. Email-only —\n * phone numbers are deliberately dropped (compliance / Apollo TOS). Re-run\n * the enrichment script to refresh; do not hand-edit.\n */\n`;
  const iface = `export interface ApolloLead {\n  name: string;\n  email: string;\n  title: string | null;\n  organization: string | null;\n  location: string | null;\n  source: string;\n  sourceUrl: string;\n  apolloIcp: string;\n}\n\nexport type LeadRoleName =\n  | 'TEMPLE'\n  | 'PRIEST'\n  | 'ASTROLOGER'\n  | 'WELLNESS_INSTRUCTOR'\n  | 'GAUSHALA';\n`;

  const exports = (Object.entries(buckets) as Array<
    [ICP['varName'], ApolloLeadRow[]]
  >)
    .map(([k, rows]) => `export const ${k}: ApolloLead[] = ${renderRows(rows)};\n`)
    .join('\n');

  const all = `export const ALL: Array<{ role: LeadRoleName; rows: ApolloLead[] }> = [\n  { role: 'TEMPLE', rows: TEMPLES },\n  { role: 'PRIEST', rows: PRIESTS },\n  { role: 'ASTROLOGER', rows: ASTROLOGERS },\n  { role: 'WELLNESS_INSTRUCTOR', rows: WELLNESS },\n  { role: 'GAUSHALA', rows: GAUSHALAS },\n];\n\nexport const GENERATED_AT = ${JSON.stringify(date)};\n`;

  return [header, docs, iface, exports, all].join('\n');
}

async function main(): Promise<void> {
  if (!process.env.APOLLO_API_KEY) {
    console.log('[apollo-enrich] APOLLO_API_KEY not set — skipping');
    process.exit(0);
  }

  const date = todayIso();
  console.log(
    `[apollo-enrich] starting — ${ICPS.length} ICPs, per_page=${PER_PAGE}, pages=${PAGES}, max/icp=${MAX_PER_ICP}`,
  );

  const buckets: Record<ICP['varName'], ApolloLeadRow[]> = {
    TEMPLES: [],
    PRIESTS: [],
    ASTROLOGERS: [],
    WELLNESS: [],
    GAUSHALAS: [],
  };

  let totalRaw = 0;
  let totalKept = 0;
  for (const icp of ICPS) {
    const rows = await fetchIcp(icp);
    totalRaw += rows.length;
    const deduped = dedupeByEmail(rows);
    buckets[icp.varName] = deduped;
    totalKept += deduped.length;
    console.log(
      `[apollo-enrich] ${icp.varName}: fetched=${rows.length} kept=${deduped.length}`,
    );
  }

  // Cross-bucket dedupe by email — same person could be returned for two ICPs.
  const seen = new Set<string>();
  for (const k of Object.keys(buckets) as ICP['varName'][]) {
    const filtered: ApolloLeadRow[] = [];
    for (const r of buckets[k]) {
      const key = r.email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      filtered.push(r);
    }
    buckets[k] = filtered;
  }

  const __filename = fileURLToPath(import.meta.url);
  const outDir = dirname(__filename);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, `_apollo-contacts-${date}.ts`);
  writeFileSync(outPath, renderFile(date, buckets), 'utf-8');

  const finalTotal = Object.values(buckets).reduce(
    (a, b) => a + b.length,
    0,
  );
  console.log(
    `[apollo-enrich] DONE — wrote ${outPath} (raw=${totalRaw} kept=${totalKept} unique=${finalTotal})`,
  );
}

main().catch((err) => {
  console.error('[apollo-enrich] fatal:', err);
  // graceful exit — never fail the surrounding pipeline.
  process.exit(0);
});
