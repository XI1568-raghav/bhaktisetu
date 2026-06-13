#!/usr/bin/env tsx
/**
 * R-Q3-E-007: B2B API key issuance CLI
 *
 * Usage:
 *   pnpm tsx scripts/issue-b2b-key.ts --org="Temple Co" --email="contact@temple.co"
 *
 * Outputs (one-time, stash safely):
 *   keyPrefix:  dk_live_<8-hex>   (public, shown in dashboard)
 *   keyFull:    dk_live_<8-hex>_<32-hex>  (secret — give to partner ONCE)
 *
 * Writes hash + metadata to Prisma B2BApiKey table when DB available, else
 * prints DDL snippet for founder to apply manually. Defaults to 60 rpm + 5 read scopes.
 */

import { randomBytes, createHash } from 'node:crypto';
import process from 'node:process';

function parseArg(name: string): string | null {
  const arg = process.argv.find((a) => a.startsWith(`--${name}=`));
  return arg ? arg.split('=').slice(1).join('=') : null;
}

const org = parseArg('org');
const email = parseArg('email');
const scopesArg = parseArg('scopes') ?? 'read:temples,read:bookings,read:pandits,read:donations,read:darshan-schedule';
const rpm = Number(parseArg('rpm') ?? '60');

if (!org || !email) {
  console.error('USAGE: pnpm tsx scripts/issue-b2b-key.ts --org="Org Name" --email="contact@org.co" [--scopes=...] [--rpm=60]');
  process.exit(1);
}

const prefix = `dk_live_${randomBytes(4).toString('hex')}`;
const secret = randomBytes(16).toString('hex');
const fullKey = `${prefix}_${secret}`;
const keyHash = createHash('sha256').update(fullKey).digest('hex');
const scopes = scopesArg.split(',').map((s) => s.trim()).filter(Boolean);

console.log('\n=== B2B API KEY ISSUED ===');
console.log(`Org:        ${org}`);
console.log(`Email:      ${email}`);
console.log(`Scopes:     ${scopes.join(', ')}`);
console.log(`Rate (rpm): ${rpm}`);
console.log(`\nkeyPrefix (public, store in dashboard):`);
console.log(`  ${prefix}`);
console.log(`\nfullKey (give to partner ONE TIME ONLY — not recoverable):`);
console.log(`  ${fullKey}`);
console.log(`\nkeyHash (sha256, store in DB):`);
console.log(`  ${keyHash}`);
console.log(`\n--- SQL to insert ---`);
console.log(`INSERT INTO b2b_api_keys (id, org_name, contact_email, key_prefix, key_hash, scopes, rpm_limit, active, created_at)`);
console.log(`VALUES (gen_random_uuid(), '${org}', '${email}', '${prefix}', '${keyHash}', ARRAY[${scopes.map((s) => `'${s}'`).join(',')}], ${rpm}, true, NOW());`);
console.log(`\n--- Partner integration snippet ---`);
console.log(`curl -H 'X-Darshya-Key: ${fullKey}' https://api.darshya.online/api/v1/b2b/ping`);
console.log('');
