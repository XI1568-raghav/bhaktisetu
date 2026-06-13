# R-Q3-E-007: B2B Temple SaaS API v1 — MVP slice handoff

> Founder-action-required: 3 decisions + Prisma migration before live partner pilot.

## What shipped in this batch

| Item | Status | Path |
|---|---|---|
| API-key auth middleware (`X-Darshya-Key`) | ✅ env-or-noop | `apps/api/src/routes/b2b.ts` |
| Per-key rate limit (60 rpm default, isolated buckets) | ✅ in-memory | `apps/api/src/routes/b2b.ts` |
| 5 read endpoints (temples / bookings / pandits / donations / darshan-schedule) | ✅ stub responses | same |
| PII masking helpers (sha256 email prefix + last4 phone) | ✅ tested | same |
| Scope gate per endpoint (`read:temples` etc) | ✅ wired | same |
| OpenAPI 3.0 spec (`GET /openapi.json`) | ✅ hand-rolled | same |
| Schema/handler vitest (sha256, masking, rate, key resolve, query) | ✅ green | `apps/api/src/routes/b2b.test.ts` |
| Issue-key CLI | ✅ | `scripts/issue-b2b-key.ts` |
| Server registration `/api/v1/b2b` | ✅ | `apps/api/src/server.ts` |

## What's NOT in this batch (founder-action-required)

### 1. Prisma B2BApiKey model + migration

The route uses a **DEV-key env fallback** (`B2B_DEV_KEY=...`) so the endpoints work during partner pilot probes without DB schema. For prod partner onboarding, add:

```prisma
model B2BApiKey {
  id           String    @id @default(cuid())
  orgName      String    @map("org_name")
  contactEmail String    @map("contact_email")
  keyPrefix    String    @unique @map("key_prefix")
  keyHash      String    @unique @map("key_hash")  // sha256 of full key
  scopes       String[]
  rpmLimit     Int       @default(60) @map("rpm_limit")
  active       Boolean   @default(true)
  lastUsedAt   DateTime? @map("last_used_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  revokedAt    DateTime? @map("revoked_at")

  @@index([keyPrefix])
  @@index([active])
  @@map("b2b_api_keys")
}
```

Run `pnpm prisma migrate dev --name b2b_api_keys` then unstub `lookupDbKey()` in `b2b.ts` to `prisma.b2BApiKey.findUnique({ where: { keyHash: sha256(_key) } })`.

### 2. Wire 5 endpoints to real services

Each route currently returns `{ data: [], _stub: '...' }`. Phase 1 work:

| Endpoint | Wire to |
|---|---|
| GET /temples | `templeService.findAll({ isVerified: true, limit, cursor })` |
| GET /bookings | `bookingService.list({ since })` → apply `maskEmail/maskPhone` per row |
| GET /pandits | `priestsPublicService.list({ verified: true })` + availability summary |
| GET /donations | `donationService.aggregate({ templeId })` — gate donor PII on `read:donor-pii` scope |
| GET /darshan-schedule | `darshanScheduleService.list({ since })` |

### 3. Founder-action items (verbatim from spec)

- [ ] **API key issuance policy**: bootstrap first 5 B2B partners via `pnpm tsx scripts/issue-b2b-key.ts --org="<name>" --email="<contact>"`. Founder runs manually + emails key to partner.
- [ ] **Pricing decision**: free-tier rate limit (60 rpm spec'd). Confirm or adjust. Document on getting-started page.
- [ ] **Legal**: B2B Terms of Service URL. Link from `/openapi.json` info block + docs page even if stub.

### 4. Deferred to next cycle (per "16h of 48h" scope discipline)

- 10 write endpoints (POST/PATCH/DELETE on bookings, donations, pandits, etc)
- @fastify/swagger replacing the hand-rolled OpenAPI block
- Admin UI for key issuance (vs the CLI)
- Webhook delivery for partner-side event subscriptions
- Per-partner usage dashboard (`lastUsedAt` already captured, just needs UI)

## How to test locally

```bash
# 1. Set dev key in env
export B2B_DEV_KEY=dk_dev_local_test_abc123

# 2. Start API
pnpm --filter @darshya/api dev

# 3. Probe
curl -H "X-Darshya-Key: dk_dev_local_test_abc123" http://localhost:3001/api/v1/b2b/ping
# Expect: {"ok":true,"org":"DEV_PARTNER","scopes":[...]}

# 4. Probe without key
curl http://localhost:3001/api/v1/b2b/ping
# Expect: 401 {"error":"missing_api_key","message":"Set x-darshya-key header."}

# 5. OpenAPI
curl http://localhost:3001/api/v1/b2b/openapi.json
```

## Tests

```bash
pnpm --filter @darshya/api vitest run src/routes/b2b.test.ts
```

Covers: sha256 stability, email masking (case-insensitive 16-char), phone masking (last4 + short redact), per-key rate (allow→deny→Retry-After), key bucket isolation, dev-key resolution, query schema (limit defaults/bounds/coercion, ISO datetime).

## KPI impact

| KPI | Before | After | Notes |
|---|---|---|---|
| `b2b_api_endpoints_live` | 0 | 6 (ping + 5 reads) | Target 15 — remaining 9 = write endpoints in next cycle |
| Partner pilot unblockers | 3 | 0 (post-founder-action) | API ready, schema + ToS pending |

Closes: Q-20260610T1617-R-Q3-E-007 (MVP slice; full 15-endpoint target deferred to next cycle per scope-discipline section in queue spec).
