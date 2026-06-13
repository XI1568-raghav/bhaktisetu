/**
 * Astrologer schema verification per R-Q1-S-007 spec.
 *
 * Asserts the AstrologerProfile table exposes the columns the lead-gen +
 * onboarding flow assumes. If any column is missing this script exits 1
 * after printing a gap report — a schema migration is NOT in scope of the
 * sales queue item (founder action required).
 *
 * Usage:
 *   pnpm tsx apps/api/scripts/verify/astrologer-schema-check.ts
 */

import { PrismaClient } from '@prisma/client';

interface ColumnRow {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

const REQUIRED_COLUMNS: { name: string; specCol: string }[] = [
  // spec col -> repo col (only repo col is asserted; spec col logged for traceability)
  { specCol: 'verified', name: 'approved' },
  { specCol: 'active', name: 'approved' },
  { specCol: 'kyc_status', name: 'kyc_status' },
  { specCol: 'sample_reading_url', name: 'sample_reading_url' },
  { specCol: 'price_per_minute_inr', name: 'price_per_minute' },
  { specCol: 'aadhaar_verified', name: 'aadhaar_verified' },
  { specCol: 'payout_blocked', name: 'payout_blocked' },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRawUnsafe<ColumnRow[]>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'astrologer_profiles'`,
    );

    if (rows.length === 0) {
      console.error('FAIL: astrologer_profiles table not found');
      process.exit(1);
    }

    const present = new Set(rows.map((r) => r.column_name));
    const missing = REQUIRED_COLUMNS.filter((c) => !present.has(c.name));

    console.log(`AstrologerProfile columns present: ${rows.map((r) => r.column_name).join(', ')}`);
    console.log('');

    if (missing.length > 0) {
      console.error('SCHEMA GAP — missing columns required by R-Q1-S-007 onboarding flow:');
      for (const m of missing) {
        console.error(`  - spec col '${m.specCol}' -> expected DB col '${m.name}' MISSING`);
      }
      console.error('');
      console.error('Action: see docs/sales/astrologer-schema-gap-2026-06-12.md');
      console.error('Sales queue item must NOT modify schema. Founder/eng must ship migration.');
      process.exit(1);
    }

    console.log('OK: all required columns present.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
