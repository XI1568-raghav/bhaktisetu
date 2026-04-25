# Darshya Database Setup

Postgres-backed via Prisma. `schema.prisma` uses `DATABASE_URL` (pooled) and
`DIRECT_URL` (unpooled, required for migrations against Supabase / Neon).

## Prerequisites

- Node 20+ and pnpm
- A Postgres database (Neon recommended, Supabase supported)
- `apps/api/.env` populated (do NOT commit)

---

## Option A: Neon (recommended — serverless Postgres, free tier)

```bash
# 1. Create a project at https://neon.tech, pick a region near your users,
#    and create a database named "poojly".
# 2. Neon dashboard → "Connection Details" → copy both connection strings:
#       - Pooled connection  → DATABASE_URL
#       - Direct connection  → DIRECT_URL
# 3. Add to apps/api/.env:
#       DATABASE_URL="postgresql://<user>:***REMOVED***@<host>-pooler.<region>.neon.tech/poojly?sslmode=require"
#       DIRECT_URL="postgresql://<user>:***REMOVED***@<host>.<region>.neon.tech/poojly?sslmode=require"

cd apps/api
npx prisma migrate deploy   # apply all migrations
npx prisma db seed          # run the idempotent seed
npx prisma studio           # browse data at http://localhost:5555
```

## Option B: Supabase (alternative — free tier, includes auth / storage)

```bash
# 1. Create a project at https://supabase.com
# 2. Project Settings → Database → "Connection string" tab:
#       - "Connection pooling" (PgBouncer, port 6543)  → DATABASE_URL
#       - "Direct connection" (port 5432)              → DIRECT_URL
# 3. Add to apps/api/.env:
#       DATABASE_URL="postgresql://postgres.<ref>:***REMOVED***@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
#       DIRECT_URL="postgresql://postgres.<ref>:***REMOVED***@aws-0-<region>.pooler.supabase.com:5432/postgres"

cd apps/api
npx prisma migrate deploy
npx prisma db seed
```

---

## First-time bootstrap (no migrations yet)

If `prisma/migrations/` is empty (fresh repo), create the initial migration
locally against `DIRECT_URL`:

```bash
cd apps/api
npx prisma migrate dev --name init
```

Commit the generated folder under `prisma/migrations/`. From then on,
downstream environments use `prisma migrate deploy`.

---

## Common commands

| Task                              | Command                                     |
|-----------------------------------|---------------------------------------------|
| Generate Prisma client            | `npx prisma generate`                       |
| Create + apply new migration      | `npx prisma migrate dev --name <change>`    |
| Apply migrations (prod)           | `npx prisma migrate deploy`                 |
| Seed database (idempotent)        | `npx prisma db seed`                        |
| Open GUI                          | `npx prisma studio`                         |
| Reset DB (DESTRUCTIVE)            | `npx prisma migrate reset`                  |
| One-shot setup                    | `bash scripts/db-setup.sh`                  |

---

## Seed contents (after `npx prisma db seed`)

- 5 temples: Kashi Vishwanath, Tirumala Tirupati, Siddhivinayak, Somnath, Jagannath Puri
- 10 puja types (Rudrabhishek, Ganesh Puja, Satyanarayan Katha, etc.)
- 5 puja offerings per temple (25 total, tradition-matched)
- 3 priests (approved + verified) with PanditProfile marketplace records
- 3 astrologers (Vedic / Tarot / Numerology)
- 5 wellness instructors (Yoga, Vipassana, Ayurveda, Sound, Breathwork)
- 3 gaushalas (Mathura, Pathmeda, Hinganghat)
- 8 demo users — one per `UserRole`:
  - devotee@demo.com, pandit@demo.com, store@demo.com, astrologer@demo.com,
    wellness@demo.com, gaushala@demo.com, temple@demo.com, admin@demo.com
- FREE marketplace subscription per provider demo user
- Aartis, chalisas, mantras content
- Daily panchang for a rolling window of dates
- Live darshan stream configs for stream-enabled temples

The seed is **idempotent** — every write uses `upsert` (or `findFirst` +
`create` where there's no unique key). Running it twice produces the same
final state; it will not duplicate data.

---

## Schema stats

- Provider: PostgreSQL
- 28 models, 17 enums
- Uses `directUrl` for migrations (required for Supabase / Neon pooled URLs)
- All IDs are UUIDs (`@default(uuid()) @db.Uuid`)
- All prices are `Decimal(10, 2)`
