import { readFileSync, existsSync } from 'node:fs';

// Mirrors the proven pattern in apps/api/scripts/check-prod-tables.mjs:
// read .env.production, populate process.env, then read DIRECT_URL back out.
// The exported env var always wins over the file (so a container/CI can inject
// without writing a file). Throws if DIRECT_URL is nowhere — failing loud beats
// silently pointing at the wrong (or pooled) DB.
export interface DarshyaEnv {
  DIRECT_URL: string;
}

export function loadEnv(envPath = '../../apps/api/.env.production'): DarshyaEnv {
  // 1. Already-exported wins.
  if (process.env.DIRECT_URL) {
    return { DIRECT_URL: process.env.DIRECT_URL };
  }
  // 2. Parse the file (same regex as check-prod-tables.mjs).
  if (existsSync(envPath)) {
    const text = readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && m[1] !== undefined && m[2] !== undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  }
  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error(
      'darshya-mcp: DIRECT_URL is not set. Export it or put it in apps/api/.env.production. ' +
        'It must be the Supabase DIRECT (non-pooled) connection string.',
    );
  }
  return { DIRECT_URL: url };
}
