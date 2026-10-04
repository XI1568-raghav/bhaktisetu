/**
 * LOCAL-ONLY seed: one demo seller with two listed products, so the store
 * buy-flow can be walked end to end on a developer's machine.
 *
 *   cd apps/api && pnpm seed:store-demo
 *
 * NOT RUN as part of the COM-01 change. No database was written.
 *
 * ─── WHAT THIS IS NOT ────────────────────────────────────────────────────────
 *
 * This is NOT a seed of the 24 hand-written rows in
 * `src/services/store.service.ts` (`prod_001` … `prod_024`), and it must never
 * become one.
 *
 * That was the obvious-looking fix for COM-01: mint uuids for the fixtures,
 * insert them as `store_products`, and `POST /store/orders` stops answering
 * `400 Unknown product: prod_015`. It is the wrong fix, and against prod it
 * would be fraud rather than a bug. Verified read-only on 2026-09-08
 * (`scripts/check-store-catalogue.mjs`, prod DIRECT_URL):
 *
 *     store_products : 0
 *     store_profiles : 0
 *     store_orders   : 0
 *
 * There is no seller, no stock record, no packing, no courier and no returns
 * address behind any of those 24 items — they are marketing copy over Wikimedia
 * Commons photographs, with SKUs (`BS-PE-001`) that exist in no inventory
 * system. Seeding them would make checkout SUCCEED and take a devotee's money
 * for a brass thali nobody owns and nobody can ship. A checkout that fails
 * loudly is a bug; a checkout that succeeds for goods that do not exist is a
 * consumer-protection matter. The catalogue marks them browse-only instead, and
 * says why, at the control the shopper would otherwise have pressed.
 *
 * ─── WHAT THIS IS ────────────────────────────────────────────────────────────
 *
 * The buy-flow itself is real and needs to be exercisable: a `StoreProfile`
 * owner, `StoreProduct` rows whose ids ARE the uuids the order route resolves,
 * stock that decrements inside the order transaction, and a row in
 * `store_orders`. This seeds exactly that, on a LOCAL database, with names that
 * cannot be mistaken for a real merchant.
 *
 * The `preseed:store-demo` npm hook runs `scripts/guard-db-target.ts` first, and
 * the belt-and-braces check below repeats it in-process — AW-09/AUTH-09 record
 * that `apps/api/.env` has historically carried the PRODUCTION connection
 * string, so "it defaulted to dev" is not an assumption a row-inserting script
 * gets to make. Unlike the shared guard, this one honours no `--prod` escape.
 */

import { PrismaClient } from '@prisma/client';
import { classifyDbTarget, databaseUrlFromEnvFile } from '../scripts/guard-db-target.js';

const DEMO_OWNER_EMAIL = 'demo-seller@localhost.invalid';
const DEMO_STORE_NAME = 'Demo Seller (local fixture — not a real merchant)';

/**
 * Fails CLOSED: `classifyDbTarget` treats anything unparseable or absent as
 * remote, which is the right default for a script that inserts inventory.
 */
function assertLocalOnly(): void {
  const url = process.env.DATABASE_URL ?? databaseUrlFromEnvFile('.env');
  const { host, local } = classifyDbTarget(url);
  if (!local) {
    console.error(
      `REFUSED: DATABASE_URL points at "${host || '(unset/unparseable)'}", not a local database.`,
    );
    console.error(
      'This script inserts seller inventory. Seeding a shared or production database with\n' +
        'demo stock would put unshippable goods in front of real shoppers — the exact defect\n' +
        'COM-01 exists to prevent. Point DATABASE_URL at localhost and run it again.',
    );
    process.exit(1);
  }
  console.log(`Target: ${host} (local) — proceeding.`);
}

/**
 * Prices are integer rupees as `Decimal(10,2)` STRINGS, never JS floats:
 * `StoreProduct.price` is `Decimal(10,2)` and the order route recomputes the
 * charge from it through `lib/store-pricing.ts`. A number literal here is how a
 * ₹1,299.00 product becomes ₹1298.9999999999998 on someone's invoice.
 *
 * One row sits under the ₹499 free-delivery threshold and one above it, so both
 * branches of `computeDeliveryFeeInr` are walkable by hand.
 */
const DEMO_PRODUCTS = [
  {
    name: 'Demo — Cotton Puja Wicks (200 pack)',
    description: 'Local test fixture listed by the demo seller. Never for sale on production.',
    price: '120.00',
    category: 'Puja Essentials',
    stock: 25,
    sku: 'DEMO-LOCAL-001',
  },
  {
    name: 'Demo — Brass Diya Pair',
    description: 'Local test fixture listed by the demo seller. Never for sale on production.',
    price: '699.00',
    category: 'Puja Essentials',
    stock: 8,
    sku: 'DEMO-LOCAL-002',
  },
];

async function main(): Promise<void> {
  assertLocalOnly();
  const prisma = new PrismaClient();
  try {
    const owner = await prisma.user.findUnique({ where: { email: DEMO_OWNER_EMAIL } });
    if (!owner) {
      console.error(
        `No user with email ${DEMO_OWNER_EMAIL}. A StoreProfile needs an owner —\n` +
          'create that account first (scripts/seed-demo-users.ts) and re-run.',
      );
      process.exit(1);
      return;
    }

    const profile = await prisma.storeProfile.upsert({
      where: { userId: owner.id },
      update: { storeName: DEMO_STORE_NAME, approved: true },
      create: {
        userId: owner.id,
        storeName: DEMO_STORE_NAME,
        city: 'Localhost',
        state: 'Dev',
        categories: ['Puja Essentials'],
        approved: true,
      },
    });
    console.log(`StoreProfile ${profile.id} (${profile.storeName})`);

    for (const p of DEMO_PRODUCTS) {
      // Keyed on sku within this profile so re-running is idempotent rather
      // than piling up duplicate listings.
      const existing = await prisma.storeProduct.findFirst({
        where: { storeProfileId: profile.id, sku: p.sku },
        select: { id: true },
      });
      const row = existing
        ? await prisma.storeProduct.update({ where: { id: existing.id }, data: { ...p } })
        : await prisma.storeProduct.create({
            data: { ...p, storeProfileId: profile.id, isActive: true },
          });
      // The id printed here is exactly what a client sends as items[].productId.
      console.log(`  StoreProduct ${row.id}  ${row.name}  INR ${row.price}  stock ${row.stock}`);
    }

    console.log(
      '\nDone. These ids are uuids, so GET /store/products serves them with\n' +
        '`buyable: true` and POST /store/orders resolves them. The 24 catalogue\n' +
        'fixtures stay browse-only — see the header of this file for why.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
