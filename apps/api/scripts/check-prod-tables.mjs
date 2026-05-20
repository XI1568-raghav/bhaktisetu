import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
const envText = readFileSync('.env.production', 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const prisma = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

const tables = [
  'cows', 'cow_health_records', 'volunteers',
  'priest_puja_offerings', 'store_products',
];
const cols = [
  ['users', 'blocked'],
  ['users', 'blocked_reason'],
  ['users', 'blocked_at'],
  ['astrologer_profiles', 'availability'],
  ['temple_puja_offerings', 'nri_price'],
  ['temple_puja_offerings', 'assigned_priest_id'],
  ['live_darshan_streams', 'title'],
  ['live_darshan_streams', 'description'],
  ['live_darshan_streams', 'camera_location'],
  ['puja_bookings', 'priest_puja_offering_id'],
  ['reviews', 'product_id'],
  ['donations', 'temple_id'],
  ['priest_puja_offerings', 'max_bookings_per_slot'],
  ['priest_puja_offerings', 'available_slots'],
];

const tableRows = await prisma.$queryRawUnsafe(
  `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])`,
  tables,
);
console.log('TABLES PRESENT:');
const presentTables = new Set(tableRows.map(r => r.table_name));
for (const t of tables) console.log(`  ${presentTables.has(t) ? 'OK ' : 'MISS'}  ${t}`);

console.log('\nCOLUMNS PRESENT:');
for (const [tbl, col] of cols) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    tbl, col,
  );
  console.log(`  ${rows.length ? 'OK ' : 'MISS'}  ${tbl}.${col}`);
}

// donations.gaushala_id NOT NULL?
const gnull = await prisma.$queryRawUnsafe(
  `SELECT is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='donations' AND column_name='gaushala_id'`,
);
console.log(`\ndonations.gaushala_id nullable: ${gnull[0]?.is_nullable ?? 'col-missing'}`);

// FK presence
const fks = await prisma.$queryRawUnsafe(`
  SELECT conname FROM pg_constraint WHERE contype='f' AND conname = ANY($1::text[])
`, [
  'puja_bookings_priest_puja_offering_id_fkey',
  'reviews_product_id_fkey',
  'donations_temple_id_fkey',
  'priest_puja_offerings_priest_id_fkey',
  'store_products_store_profile_id_fkey',
  'temple_puja_offerings_assigned_priest_id_fkey',
]);
console.log('\nFKs PRESENT:');
const fkSet = new Set(fks.map(r => r.conname));
for (const n of ['puja_bookings_priest_puja_offering_id_fkey','reviews_product_id_fkey','donations_temple_id_fkey','priest_puja_offerings_priest_id_fkey','store_products_store_profile_id_fkey','temple_puja_offerings_assigned_priest_id_fkey']) {
  console.log(`  ${fkSet.has(n) ? 'OK ' : 'MISS'}  ${n}`);
}

// row counts
console.log('\nROW COUNTS:');
for (const t of ['users','temples','priests','priest_puja_offerings','temple_puja_offerings','store_products','puja_bookings','donations','cows','volunteers']) {
  const r = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${t}"`);
  console.log(`  ${String(r[0].n).padStart(6)}  ${t}`);
}

await prisma.$disconnect();
