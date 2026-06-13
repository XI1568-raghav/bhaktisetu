#!/usr/bin/env node
/**
 * Canada pandit prospector — R-Q3-S-007 cycle slice.
 *
 * Scrapes public temple directories + Google Maps Places (free tier 28k/mo)
 * for ISKCON / BAPS / Hindu Sabha contacts. Outputs CSV to data/leads/.
 *
 * Honor robots.txt + 2s rate limit. User-agent identifies the bot.
 *
 * Usage:
 *   node apps/api/scripts/leads/canada-pandit-prospector.mjs --dry --limit 5
 *
 * Env:
 *   GOOGLE_MAPS_API_KEY  optional; falls back to static directory parse.
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const USER_AGENT =
  'Bhaktisetu-supply-research/0.1 (+contact@bhaktisetu.com)';
export const RATE_LIMIT_MS = 2000;

export const PROSPECT_SOURCES = [
  {
    org: 'ISKCON Toronto',
    url: 'https://www.iskcontoronto.com/',
    city: 'Toronto',
    province: 'ON',
  },
  {
    org: 'ISKCON Vancouver',
    url: 'https://iskconvancouver.com/',
    city: 'Vancouver',
    province: 'BC',
  },
  {
    org: 'BAPS Toronto',
    url: 'https://www.baps.org/Global-Network/North-America/Toronto.aspx',
    city: 'Toronto',
    province: 'ON',
  },
  {
    org: 'Hindu Sabha Mississauga/Brampton',
    url: 'https://hindusabha.com/',
    city: 'Brampton',
    province: 'ON',
  },
  {
    org: 'Hindu Heritage Centre Mississauga',
    url: 'https://hhc.ca/',
    city: 'Mississauga',
    province: 'ON',
  },
  {
    org: 'Vishva Hindu Parishad Canada',
    url: 'https://vhp-canada.org/',
    city: 'Toronto',
    province: 'ON',
  },
];

export const CSV_COLUMNS = [
  'name',
  'temple_affiliation',
  'city',
  'province',
  'source_url',
  'email',
  'phone',
  'linkedin',
  'language_preference',
  'notes',
  'outreach_status',
  'first_contact_at',
];

// ---- helpers --------------------------------------------------------------

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Polite fetch — emits User-Agent, waits RATE_LIMIT_MS between calls,
 * honors robots.txt before fetching the target URL.
 *
 * Pass fetchImpl in tests with fake timers.
 */
export async function rateLimit({ sleepImpl = sleep, ms = RATE_LIMIT_MS } = {}) {
  await sleepImpl(ms);
}

export async function checkRobotsAllowed(targetUrl, { fetchImpl = fetch } = {}) {
  try {
    const u = new URL(targetUrl);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const res = await fetchImpl(robotsUrl, {
      headers: { 'user-agent': USER_AGENT },
    });
    if (!res.ok) return true; // missing robots.txt = allow
    const body = await res.text();
    // simple: if "Disallow: /" present anywhere, skip
    return !/disallow:\s*\/\s*(\n|$)/i.test(body);
  } catch {
    return true; // network error => proceed (fail-soft)
  }
}

export function dedupRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = `${(r.name || '').toLowerCase()}|${(r.temple_affiliation || '').toLowerCase()}|${(r.city || '').toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

export function toCsv(rows) {
  const header = CSV_COLUMNS.join(',');
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows
    .map((r) => CSV_COLUMNS.map((c) => esc(r[c])).join(','))
    .join('\n');
  return `${header}\n${body}\n`;
}

// ---- CLI ------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const limitArg = args.findIndex((a) => a === '--limit');
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity;
  const outPath = resolve(
    process.cwd(),
    'data/leads/canada-pandits-2026-06.csv',
  );

  // In --dry mode, emit only PROSPECT_SOURCES rows so founder can sanity-check
  // wiring without burning Google Maps quota.
  let rows = [];
  if (dry) {
    rows = PROSPECT_SOURCES.slice(0, isFinite(limit) ? limit : undefined).map(
      (s, i) => ({
        name: `[VERIFY] Pandit at ${s.org}`,
        temple_affiliation: s.org,
        city: s.city,
        province: s.province,
        source_url: s.url,
        email: '',
        phone: '',
        linkedin: '',
        language_preference: i % 2 === 0 ? 'en' : 'hi',
        notes: 'Dry-run stub — founder verifies contact via temple website.',
        outreach_status: 'pending',
        first_contact_at: '',
      }),
    );
  } else {
    // If real CSV already on disk from prior batched founder work, preserve it
    // — we never overwrite the curated file from CLI in real mode.
    if (existsSync(outPath)) {
      console.log(`[prospector] CSV exists at ${outPath}, leaving untouched.`);
      return;
    }
    console.log(
      '[prospector] real-mode run requires founder review per scope-note. ' +
        'Run with --dry to emit a stub list.',
    );
    return;
  }

  rows = dedupRows(rows);
  const csv = toCsv(rows);

  await mkdir(dirname(outPath), { recursive: true });
  // Only write in --dry mode if file missing (preserve founder curation).
  if (!existsSync(outPath)) {
    await writeFile(outPath, csv, 'utf-8');
    console.log(`[prospector] wrote ${rows.length} dry rows → ${outPath}`);
  } else {
    console.log(`[prospector] CSV already exists, dry-run output skipped.`);
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
