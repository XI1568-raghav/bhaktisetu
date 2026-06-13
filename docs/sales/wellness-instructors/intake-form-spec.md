# Wellness Instructor Intake Form Spec (R-Q1-S-010)

Form lives at `/onboarding/wellness-instructor` (future). Form output maps 1:1 into the future `wellness_instructors` table.

## Fields (12 — matches schema target)

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | string (uuid) | system-generated | Server-side on create |
| `name` | string (≤120) | yes | Full legal name as on credential certificate |
| `discipline` | enum | yes | One of: `hatha_yoga`, `ashtanga_yoga`, `iyengar_yoga`, `vinyasa_yoga`, `ayurveda_practitioner`, `ayurveda_panchakarma`, `yoga_therapy`, `pranayama_meditation` |
| `credentials_doc_url` | string (url) | yes | Upload destination = S3-compatible private bucket; URL is signed-read link |
| `years_experience` | integer | yes | Min 2 per vetting Gate 2 |
| `languages_csv` | string | yes | ISO-639-1 codes, semicolon-separated (`en;hi;ta`) |
| `instagram_handle` | string (≤60) | optional | Without `@` prefix |
| `sample_class_url` | string (url) | yes | YouTube/Drive link reviewed in Gate 3 |
| `hourly_rate_inr` | integer | yes | Instructor sets; platform fee 0% Q1; min ₹500, max ₹25000 |
| `availability_json` | string (json) | yes | `{ timezone: "Asia/Kolkata", slots: [{ day: "mon", start: "06:00", end: "08:00" }, ...] }` |
| `mou_signed_at` | timestamp | system | Set when instructor e-signs MOU PDF |
| `status` | enum | system | One of: `pending_review`, `vetting`, `approved`, `live`, `suspended`, `rejected` |

## Additional non-table inputs

- `phone` — collected post-DM; CRM column `phone: TBD-on-response` until then.
- `background_check_declaration_signed_at` — boolean + timestamp, Gate 4 evidence.
- `notes_internal` — founder freeform text field, not exposed to instructor.

## Validation rules

- `credentials_doc_url` must be HTTPS and end in `.pdf` or `.jpg`/`.png`.
- `sample_class_url` must be host = `youtube.com`, `youtu.be`, or `drive.google.com`.
- `availability_json` validated with zod against a strict slot schema before save.
- `discipline` must match enum (matches test enforcement).

## Flow

1. Founder approves lead in CRM → triggers intake-form invite email.
2. Instructor fills form (≤15 min).
3. Server stores draft row with `status: pending_review`.
4. Founder runs Gates 1-6 (vetting-rubric.md).
5. On all-pass → `status: approved` → MOU sent for e-signature.
6. On MOU signed → `status: live` → profile published on `/wellness/instructors/[slug]`.
