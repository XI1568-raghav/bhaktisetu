# Intake form spec — temple_partners table

Fields the eventual Supabase `temple_partners` table needs. No migration created here — this doc is the spec founder/engineering reference when migration ships.

## Field table

| field | type | required | notes |
|---|---|---|---|
| id | uuid | yes | primary key, default gen_random_uuid() |
| name | text | yes | display name, e.g. "Sankat Mochan Hanuman Mandir" |
| trust_name | text | yes | legal trust name from 12A cert |
| city | text | yes | start "Varanasi" hardcoded for this batch |
| state | text | yes | "Uttar Pradesh" default |
| deity | text | yes | primary deity slug ("shiva", "hanuman", "durga"...) |
| pan | text | yes | trust PAN, 10 chars, format AAAAA0000A |
| 80g_cert_number | text | no | optional until verified |
| 80g_expiry | date | no | optional until verified |
| 12a_cert_number | text | no | optional until verified |
| bank_account_last4 | text | yes | last 4 digits only (PII minimization) |
| bank_ifsc | text | yes | full IFSC code |
| primary_contact_name | text | yes | person who signed MOU |
| primary_contact_phone | text | yes | E.164 format |
| primary_contact_email | text | no | optional |
| mou_signed_at | timestamptz | no | null until gate 8 passes |
| mou_pdf_url | text | no | Supabase storage url |
| live_stream_url | text | no | HLS or RTMP ingest URL |
| status | text | yes | enum: lead, contacted, meeting_set, docs_received, verifying, verified, live, dropped |
| verified_at | timestamptz | no | when status flipped to `verified` |
| live_at | timestamptz | no | when status flipped to `live` |
| commission_pct | numeric | yes | platform commission per business rule #3 (20-40) |
| created_at | timestamptz | yes | default now() |
| updated_at | timestamptz | yes | trigger updated on row change |

## Indexes

- `(status)` for ops dashboard pipeline view
- `(city, status)` for geo-scoped funnel
- `(verified_at desc) where status = 'live'` for ordered live list

## RLS policies (Supabase)

- `SELECT` open to anon for rows where `status = 'live'` only
- `SELECT/INSERT/UPDATE` to authenticated `admin` or `temple_manager` (own row)
- service_role bypass for KPI scrapers
