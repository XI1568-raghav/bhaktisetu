# Pandit Onboarding Tracker Spec

> Referenced by: `docs/legal/R-Q2-L-002-handoff.md`
> Authored: 2026-06-15 · Roadmap: R-Q2-L-002

## Purpose

Track per-pandit contract lifecycle: invited → KYC submitted → contract sent → signed → activated. Surface KPI `priest_contracts_signed` count to roadmap engine.

## Lifecycle states

```
invited
  ↓
kyc_pending          ← pandit invited; awaiting KYC artifacts
  ↓
kyc_under_review     ← Aadhaar/PAN/bank uploaded; ops reviewing
  ↓
contract_sent        ← DocuSign envelope sent
  ↓
contract_signed      ← Pandit countersigned; awaiting Bhaktisetu sig
  ↓
contract_executed    ← Both signed; activated on platform
  ↓ (any time)
suspended  |  terminated  |  void
```

## DB schema (Prisma)

```prisma
model PanditContract {
  id                String   @id @default(cuid())
  panditUserId      String   @unique
  pandit            User     @relation(fields: [panditUserId], references: [id])
  status            PanditContractStatus @default(invited)
  templateVersion   String   @default("v1.0")
  scheduleAVersion  String   @default("v1.0")
  tier              PanditTier @default(new)
  docusignEnvelope  String?  // DocuSign envelope ID once sent
  signedAt          DateTime?
  executedAt        DateTime?
  voidAt            DateTime?
  voidReason        String?
  kycAadhaarMasked  String?  // last 4 digits only
  kycPanMasked      String?  // ABCDE****F format
  kycBankLast4      String?
  referenceVideos   String[] // S3/R2 URLs
  notes             String?  @db.Text
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([status])
  @@index([executedAt])
}

enum PanditContractStatus {
  invited
  kyc_pending
  kyc_under_review
  contract_sent
  contract_signed
  contract_executed
  suspended
  terminated
  void
}

enum PanditTier {
  new       // 0-6mo or <25 completed pujas
  standard  // 6mo-3yr or 25-499 pujas
  senior    // 3yr+ or 500+ pujas
}
```

## Admin endpoints (TBD)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/admin/contracts` | Paginated list w/ status/tier filters |
| `POST` | `/api/v1/admin/contracts` | Create row when pandit accepts invite |
| `PATCH` | `/api/v1/admin/contracts/:id/status` | Manual status transition by ops |
| `POST` | `/api/v1/admin/contracts/webhook/docusign` | DocuSign webhook → flip status |
| `GET` | `/api/v1/admin/contracts/kpi` | Count of `contract_executed` rows for roadmap engine |

## Admin UI (TBD)

`/admin/contracts` — table view:

| Pandit | Status | Tier | DocuSign | Signed | Executed | Actions |
|---|---|---|---|---|---|---|
| Acharya Ramesh | contract_signed | standard | bf2-a3e | 2026-06-10 | — | Counter-sign · View KYC · Notes |
| Pandit Suresh | kyc_under_review | new | — | — | — | Review KYC · Send contract · Reject |

Bulk actions: send contract to N pandits, export CSV (ops use only — never email externally).

## KPI surfacing

Roadmap engine queries:

```sql
SELECT COUNT(*) AS priest_contracts_signed
FROM pandit_contracts
WHERE status = 'contract_executed'
  AND void_at IS NULL;
```

Wire into `scripts/agents/roadmap/_kpi-supabase.mjs` once table ships.

## Pandit-side UI (TBD)

`/priest/contract-status` — shows:
- Current status badge
- "Sign contract" button if state = `contract_sent` (deep-link to DocuSign)
- Template + Schedule A read-only view (always accessible)
- Payout history table (separate page `/priest/payouts`)
- Termination button (30-day notice per template §7.1)

## DocuSign integration outline

1. Founder ops triggers send → backend calls DocuSign Create Envelope API w/ template ID + pandit prefill (name, PAN, address from KYC)
2. DocuSign sends envelope to pandit email + WhatsApp link
3. Pandit signs → DocuSign webhook → `/api/v1/admin/contracts/webhook/docusign`
4. Webhook validates HMAC, locates row by envelope ID, flips status to `contract_signed`, stores `signedAt`
5. Founder counter-signs in DocuSign UI → second webhook → status to `contract_executed`, `executedAt` set
6. Activation cron: any pandit with `contract_executed` AND no User.canTakeBookings flag → flip flag true

## Security

- DocuSign webhook HMAC validated with shared secret (DOCUSIGN_WEBHOOK_SECRET env)
- Aadhaar storage: only last 4 digits in DB; full image in encrypted S3 bucket w/ KMS-managed key
- PAN storage: masked format only (ABCDE****F) in DB; full PAN in encrypted bucket
- KYC artifacts retention: 7 years post-termination (Income Tax Act compliance)
- Pandit can request KYC deletion under DPDP §13 — engineering must support erasure with retention exception logged

## Founder action

- [ ] DocuSign developer account + template upload + envelope ID captured in env
- [ ] DocuSign webhook secret generated + stored as Render env `DOCUSIGN_WEBHOOK_SECRET`
- [ ] Approve schema migration before applying to prod (touches User relation)
- [ ] Internal ops training on KYC review checklist (Aadhaar masking, PAN format, bank verification via penny drop)

## Closes

Tracker spec line of R-Q2-L-002. Schema + endpoints pending engineering build-out in next sprint.
