# Gurukul Marketplace + Admissions — Design

> Status: SHIPPED · Date: 2026-05-21

## Goal

A two-sided surface: devotees discover traditional Sanskrit/Veda gurukuls and apply to programs; gurukul owners register, list programs, and triage applications. DPDP Act 2023 minor-consent compliant.

## Scope

In: Public directory (search + filter), gurukul detail (programs list), DPDP-compliant application form with guardian conditional, owner registration, owner portal (gurukul list + applications inbox with status decisions).

Out (deferred): Payments, document upload, video interviews, multi-program comparison, accreditation badges, reviews.

## Architecture

- **Schema** (migrations `20260521010000_gurukuls`, `20260521020000_gurukul_applications`):
  - `gurukuls` — owner-managed entity (slug, address, contact, tradition, isResidential/Online/acceptsMinors, isVerified).
  - `gurukul_programs` — program offerings under a gurukul.
  - `gurukul_applications` — submission record (applicantType, student + guardian fields, statement, consent, status workflow: `submitted → forwarded → accepted | rejected`).
- **API** (`/api/v1/gurukuls`, `/api/v1/gurukul-applications`, `/api/v1/gurukul-portal/*`):
  - Public: `GET /gurukuls?q&residential&online&acceptsMinors`, `GET /gurukuls/:slug`.
  - Owner: `POST /gurukuls`, `GET /gurukuls/mine/list`.
  - Apply: `POST /gurukul-applications` (bearer-gated, zod-validated, DPDP refine).
  - Portal: `GET /gurukul-portal/applications`, `PATCH /gurukul-portal/applications/:id` (forward/accept/reject + optional decisionNote).
- **Web**: `/gurukuls`, `/gurukuls/[slug]`, `/gurukuls/apply/[programId]`, `/become-gurukul`, `/gurukul-portal`, `/gurukul-portal/applications`. All edge runtime.
- **Mobile**: `(devotee)/gurukuls.tsx`, `gurukul-detail.tsx`, `gurukul-apply.tsx` — parity with web, native components.

## DPDP minor compliance

`submitSchema` refine: `studentAgeYears < 18` → `applicantType` MUST be `parent` AND guardian name/relation/phone + consent required. Test coverage in `gurukul-applications.test.ts` (9/9 green).

## Error handling

- Application submit failure → readable error returned + mobile Alert.
- Owner gating: 401 on unauthed, 403 if user doesn't own the gurukul (PATCH on application).
- Schema validation: zod parse → 400 with issues.

## Activation

Feature flag: `NEXT_PUBLIC_GURUKUL_ENABLED=true` on CF Pages.

Migrations: `20260521010000` (3 tables, 17 columns, 3 FKs) + `20260521020000` (1 table, 16 columns, 2 FKs).

## Tests

- 9 unit tests on submit schema (adult/minor/guardian/UUID/Aadhaar/age range).
- Application + portal integration tests pass (in 493 green).
