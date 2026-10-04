/**
 * READ-ONLY prod verifier for the store catalogue.
 *
 * Answers the only question that decides whether the 24 hand-written
 * fixtures in services/store.service.ts may be presented as buyable:
 * does a single real, sellable `store_products` row exist?
 *
 * Runs no writes. Loads DIRECT_URL from apps/api/.env.production the same
 * way scripts/check-prod-tables.mjs does.
 *
 *   cd apps/api && node scripts/check-store-catalogue.mjs
 */
import { PrismaClient } from '@prisma/client';
import { resolveDbTargetOrExit } from './lib/resolve-db-target.mjs';

// OPS-14 (F456) — see check-prod-tables.mjs. The connection string comes from
// the named env FILE, not from the process env that the hoisted
// `@prisma/client` import above populated from apps/api/.env.
const { url } = resolveDbTargetOrExit({
  argv: process.argv.slice(2).includes('--env-file')
    ? process.argv.slice(2)
    : ['--env-file', '.env.production', ...process.argv.slice(2)],
});

const prisma = new PrismaClient({ datasourceUrl: url });
const q = (sql) => prisma.$queryRawUnsafe(sql);
const count = async (label, sql) => {
  try {
    console.log(`${label.padEnd(28)}: ${(await q(sql))[0].n}`);
  } catch (err) {
    console.log(`${label.padEnd(28)}: ERR ${err.meta?.message ?? err.message}`);
  }
};

const hasDeletedAt = (await q(
  `SELECT COUNT(*)::int AS n FROM information_schema.columns
   WHERE table_schema='public' AND table_name='store_products' AND column_name='deleted_at'`,
))[0].n > 0;
console.log(`store_products.deleted_at    : ${hasDeletedAt ? 'present' : 'MISSING (migration not applied to prod)'}`);

await count('store_products total', `SELECT COUNT(*)::int AS n FROM store_products`);
await count('store_products active', `SELECT COUNT(*)::int AS n FROM store_products WHERE is_active = true`);
await count(
  'store_products buyable',
  `SELECT COUNT(*)::int AS n FROM store_products WHERE is_active = true AND stock > 0${hasDeletedAt ? ' AND deleted_at IS NULL' : ''}`,
);
await count('store_profiles total', `SELECT COUNT(*)::int AS n FROM store_profiles`);
await count('store_profiles approved', `SELECT COUNT(*)::int AS n FROM store_profiles WHERE approved = true`);
await count('store_orders total', `SELECT COUNT(*)::int AS n FROM store_orders`);

console.log('\nsample store_products (max 10):');
console.table(await q(`SELECT id, name, price, stock, is_active FROM store_products ORDER BY created_at DESC LIMIT 10`));
console.log('\nstore_profiles (max 10):');
console.table(await q(`SELECT id, store_name, approved, total_products FROM store_profiles LIMIT 10`));

await prisma.$disconnect();
