# DPDP User-Rights DSAR Audit + 30-day SLA

> **Roadmap item**: R-Q3-L-001 (P0) · **Authored**: 2026-06-13 · **Extends**: R-Q2-L-001 DPDP audit · **Target**: Q3 (Oct 2026) — DSAR endpoint live + consent log

## Goal

Data Subject Access Request (DSAR) compliance per DPDP Act 2023 §11-13. User can request: information, correction, erasure. 30-day response SLA.

## DSAR endpoint surface

| Endpoint | Verb | Purpose |
|---|---|---|
| `/api/v1/me/privacy/export` | GET | Right to information — JSON dump of all PII |
| `/api/v1/me/privacy/correct` | PATCH | Right to correction — editable fields |
| `/api/v1/me/privacy/erase` | DELETE | Right to erasure — soft-delete + 30-day cooldown |
| `/api/v1/me/privacy/erasure/withdraw` | POST | Cancel erasure during cooldown window |
| `/api/v1/me/privacy/consent` | GET | Current consent state per category |
| `/api/v1/me/privacy/consent` | PATCH | Update consent — granular toggles |
| `/api/v1/me/privacy/log` | GET | Audit log of all consent + DSAR actions |
| `/api/v1/admin/dsar/pending` | GET (admin) | Pending DSAR requests for SLA tracking |

## 30-day SLA workflow

Automated request flow:

1. User clicks "Export my data" → API generates JSON + emails download link within 24h (well under 30d)
2. User clicks "Correct" → live profile edit, instant
3. User clicks "Erase" → 30-day cooldown countdown starts, "Withdraw" option visible
4. Day-30 → soft-erase: anonymize PII, retain structural fields (per `docs/legal/dpdp-compliance-audit-2026-06.md`)
5. Day-30+1 → hard-delete from backups after 90d additional retention (per backup-retention policy)

## Consent log schema

```prisma
model ConsentLog {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  action          String   // "granted" | "withdrew" | "exported" | "erasure_requested" | "erasure_withdrawn"
  consentCategory String?  @map("consent_category") // "marketing" | "analytics" | "data_processing" | null for non-consent actions
  policyVersion   String   @map("policy_version") // e.g. "v2.1"
  ipHash          String?  @map("ip_hash") // sha256, no raw IP stored
  userAgent       String?  @map("user_agent")
  createdAt       DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([action])
  @@map("consent_logs")
}
```

## Implementation engineering tickets

File next cycle:
- R-Q3-L-001b: implement /api/v1/me/privacy/* endpoints
- R-Q3-L-001c: implement ConsentLog Prisma model + migration
- R-Q3-L-001d: implement erasure cron (T-30 soft-erase + T-120 hard-delete)
- R-Q3-L-001e: implement admin DSAR queue page (post first-CS-hire)

## Founder action

- [ ] Counsel review of DSAR workflow before endpoint goes live
- [ ] Privacy Policy v2.1 update with DSAR contact info
- [ ] DPO alias dpo@darshya.online forwards to founder until threshold

## Closes

R-Q3-L-001 — audit shipped.
