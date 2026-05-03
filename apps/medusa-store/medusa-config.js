/**
 * MedusaJS configuration stub for Darshya dropship store.
 *
 * Real bootstrap (when ready):
 *   npx create-medusa-app@latest --skip-db .
 *   pnpm dev   # http://localhost:9000
 *
 * Until then, the /store frontend uses an env-gated fallback to the static
 * seed catalogue in apps/web/lib/products.ts. See apps/web/lib/medusa.ts.
 *
 * Env vars consumed once Medusa is running:
 *   MEDUSA_BACKEND_URL      Public Storefront API base   (default http://localhost:9000)
 *   MEDUSA_PUBLISHABLE_KEY  x-publishable-api-key header (per-channel scope)
 *   MEDUSA_DATABASE_URL     Postgres URL (Supabase ref hlkvfarvfblhzhhnhtbp)
 *   MEDUSA_REDIS_URL        Upstash Redis URL
 */
module.exports = {
  projectConfig: {
    redis_url: process.env.MEDUSA_REDIS_URL,
    database_url: process.env.MEDUSA_DATABASE_URL,
    database_type: 'postgres',
    store_cors: process.env.STORE_CORS || 'http://localhost:3000,https://darshya.online',
    admin_cors: process.env.ADMIN_CORS || 'http://localhost:3001,https://admin.darshya.online',
    jwt_secret: process.env.JWT_SECRET || 'darshya-dev-jwt',
    cookie_secret: process.env.COOKIE_SECRET || 'darshya-dev-cookie',
  },
  plugins: [],
};
