# @poojly/medusa-store

MedusaJS headless commerce engine for Darshya. **Currently a stub** — frontend `/store` falls back to the static seed catalogue in `apps/web/lib/products.ts` when `MEDUSA_BACKEND_URL` is not set or the Storefront API is unreachable.

## Status: stub (2026-05-02)

What exists:
- `package.json` placeholder (no deps yet — keeps monorepo install slim)
- `medusa-config.js` template for Postgres + Redis + CORS
- `scripts/seed-dropship.mjs` seed catalogue (20 products, 5 categories)

What's missing (real bootstrap):
- Medusa core install (`npx create-medusa-app@latest --skip-db .`)
- Postgres migration on Supabase ref `hlkvfarvfblhzhhnhtbp`
- Razorpay payment plugin (`medusa-payment-razorpay`)
- Stripe payment plugin (NRI)
- Admin UI deploy

## Wire-up

When ready to flip Medusa on:

```bash
cd apps/medusa-store
npx create-medusa-app@latest --skip-db .
# fill medusa-config.js with prod values from .env
pnpm medusa db:migrate
node scripts/seed-dropship.mjs
pnpm dev
```

Then set in `apps/web/.env.local`:

```
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
```

The frontend client (`apps/web/lib/medusa.ts`) auto-detects and switches from seed fallback to live Storefront API.

## Commission model

See `docs/store-economics.md`. Range: 15–30% per category.
