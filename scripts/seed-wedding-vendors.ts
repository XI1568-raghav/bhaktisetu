/**
 * R-Q4-S-009 — Wedding vendor network seed loader
 *
 * Reads seeds/wedding-vendors-prospects.csv → inserts pending rows into
 * the wedding_vendors table (Supabase). All rows seeded as pending; founder
 * runs verification rubric and flips status field per row.
 *
 * Usage:
 *   pnpm tsx scripts/seed-wedding-vendors.ts
 *
 * Requires env: DATABASE_URL (or SUPABASE_DIRECT_URL).
 * No-op gracefully when env is unset (logs and exits 0).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Row = {
  business_name: string;
  vendor_type: 'photographer' | 'caterer' | 'decorator';
  service_city: string;
  instagram_handle: string;
  notes_for_outreach: string;
};

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const headers = lines[0]!.split(',');
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(',');
    if (cols.length < headers.length) continue;
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (cols[idx] ?? '').trim();
    });
    if (!row.business_name || !row.vendor_type) continue;
    rows.push(row as unknown as Row);
  }
  return rows;
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? process.env.SUPABASE_DIRECT_URL;
  if (!url) {
    console.warn('[seed-wedding-vendors] DATABASE_URL not set — dry run only.');
    const csv = readFileSync(resolve(__dirname, '..', 'seeds', 'wedding-vendors-prospects.csv'), 'utf-8');
    const rows = parseCsv(csv);
    const counts = rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.vendor_type] = (acc[r.vendor_type] ?? 0) + 1;
      return acc;
    }, {});
    console.log(`[seed-wedding-vendors] parsed ${rows.length} rows`, counts);
    return;
  }

  // Lazy import; pg is dev dep.
  const { Client } = await import('pg');
  const client = new Client({ connectionString: url });
  await client.connect();

  const csv = readFileSync(resolve(__dirname, '..', 'seeds', 'wedding-vendors-prospects.csv'), 'utf-8');
  const rows = parseCsv(csv);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const existing = await client.query<{ id: string }>(
      'select id from wedding_vendors where business_name = $1 and vendor_type = $2 limit 1',
      [row.business_name, row.vendor_type]
    );
    if ((existing.rowCount ?? 0) > 0) {
      skipped++;
      continue;
    }
    await client.query(
      `insert into wedding_vendors
        (business_name, vendor_type, service_city, instagram_handle, notes_for_outreach, verification_status)
       values ($1, $2, $3, $4, $5, 'pending')`,
      [
        row.business_name,
        row.vendor_type,
        row.service_city || null,
        row.instagram_handle || null,
        row.notes_for_outreach || null,
      ]
    );
    inserted++;
  }

  await client.end();
  console.log(`[seed-wedding-vendors] inserted=${inserted} skipped=${skipped} total=${rows.length}`);
}

main().catch((err) => {
  console.error('[seed-wedding-vendors] failed:', err);
  process.exit(1);
});
