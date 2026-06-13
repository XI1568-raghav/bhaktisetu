# Verification checklist — Varanasi temple onboarding

Eight mandatory gates. Every Varanasi temple partner MUST pass all 8 before status flips to `verified` and live darshan/booking surface enables.

## Gates

1. Trust registration certificate sighted (12A + 80G)
2. PAN of trust verified
3. Bank account in trust name (cancelled cheque)
4. Authorized signatory ID + photo
5. Temple physical visit OR verified video walk-through
6. Live-stream technical check (bandwidth ≥4 Mbps up, camera angle approved)
7. Pandit roster with 3+ named pujaris available for scheduled darshan slots
8. Signed MOU (revenue split + 80G receipt issuance flow)

## Per-gate evidence required

| Gate | Evidence stored at | Who collects | Who verifies |
|---|---|---|---|
| 1 | scanned PDF in Supabase storage `temple-partners/{temple_id}/12a-80g.pdf` | founder | finance ops |
| 2 | PAN scan + manual cross-check on income-tax portal | founder | finance ops |
| 3 | scanned cancelled cheque | founder | finance ops |
| 4 | Aadhaar + signed photo + role declaration | founder | founder |
| 5 | walk-through video (≤5 min) OR field visit photo set (≥6 photos) | founder OR field rep | founder |
| 6 | speedtest screenshot + sample 30-sec clip uploaded to test ingest endpoint | tech ops | tech ops |
| 7 | named pandit list with phone + photo + scheduled-availability matrix | temple admin | founder |
| 8 | counter-signed MOU PDF | founder + temple authorized signatory | legal |

## Decision rules

- Any gate `partial` → status stays `verifying` until full pass.
- Gate 6 failure → recommend Jio Fiber upgrade or schedule shoots during off-peak only.
- Gate 1 absent → temple cannot issue 80G; offer "darshan-only" surface without donation flow.
- Gate 8 MUST be paper-signed AND scanned; e-signature only acceptable if temple trust has bylaw authority for it.

## Escalation

- Gate disputes → founder + temple chairman call within 7 days of flag.
- Trust certificate ambiguity → consult external CA empaneled at `partner-ca@darshya.online`.
