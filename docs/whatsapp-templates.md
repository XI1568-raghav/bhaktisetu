# WhatsApp Cloud API templates

Darshya broadcasts (waitlist re-engagement, daily aarti reminders, booking
notifications) all run through Meta's WhatsApp Cloud API on a verified
business number. Meta requires every proactive message to use a
**pre-approved template** — free-form text only works inside the 24-hour
conversation window after the user messaged us first.

## Required templates

Apply for these in **WhatsApp Manager → Account tools → Message templates**.
Category column maps to Meta's `MARKETING` / `UTILITY` / `AUTHENTICATION`.

| Template name | Category | Variables | Body |
|---|---|---|---|
| `daily_aarti_reminder` | UTILITY | `{{1}}` deity, `{{2}}` time, `{{3}}` darshan slug | `🙏 Today's {{1}} aarti at {{2}} in 1 hour. Watch live: darshya.online/darshan/{{3}}` |
| `new_puja_listed` | MARKETING | `{{1}}` puja type, `{{2}}` temple, `{{3}}` price (INR), `{{4}}` puja slug | `New {{1}} puja available at {{2}} from ₹{{3}}. Book: darshya.online/pujas/{{4}}` |
| `booking_reminder_24h` | UTILITY | `{{1}}` puja, `{{2}}` temple, `{{3}}` time, `{{4}}` BS-booking-ref | `Your {{1}} puja at {{2}} is tomorrow at {{3}}. Confirmation: darshya.online/bookings/{{4}}` |
| `booking_video_proof_ready` | UTILITY | `{{1}}` puja, `{{2}}` BS-booking-ref | `Video proof of your {{1}} puja is ready: darshya.online/bookings/{{2}}/video` |
| `welcome_devotee` | UTILITY | `{{1}}` devotee first name | `🪔 Welcome to Darshya, {{1}}! Browse temples, book pujas, watch live darshan. darshya.online` |

UTILITY templates send freely to opted-in users. MARKETING templates count
against Meta's daily marketing-message quota.

## Application steps (Meta Business Manager)

1. Log in to <https://business.facebook.com/>.
2. Pick the **Darshya** business portfolio. If it doesn't exist yet, create
   it and verify the business (registration certificate + utility bill).
3. **WhatsApp Manager** → **Phone numbers** → add a number, verify via
   OTP. Set a display name ("Darshya"), pick UTILITY as the category.
4. **Account tools** → **Message templates** → **Create template**.
5. For each template above:
   - Pick the matching category.
   - Pick **English** as the primary language. Add **Hindi (`hi`)** as
     a translation — Meta approves them as separate template versions.
   - Paste the body exactly as shown. The numbered placeholders
     (`{{1}}`, `{{2}}`, ...) must match the variable order in the table.
   - Add a **footer** like `Reply STOP to unsubscribe.` for MARKETING.
   - Submit. Meta usually approves UTILITY templates in < 1 hour;
     MARKETING can take up to 24 hours.
6. Once approved, the template name (e.g. `daily_aarti_reminder`) is
   what `apps/api/src/services/whatsapp-broadcast.service.ts` passes to
   the Cloud API.

## Required env vars

Set these on Render (API service):

| Var | Where to find it |
|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Manager → Phone numbers → API setup |
| `WHATSAPP_ACCESS_TOKEN` | System user token from Meta Business → System users |
| `WHATSAPP_API_VERSION` | optional; defaults to `v21.0` |
| `WHATSAPP_WEBHOOK_TOKEN` | any random string; paste the same value into Meta dashboard |
| `WHATSAPP_APP_SECRET` | Meta App → Settings → Basic → App secret |
| `WHATSAPP_OTP_TEMPLATE` | optional; defaults to `otp_login` |

When all are absent the broadcast service still works — every send is
logged with `status='SKIPPED'` so dev / demo flows exercise the pipeline
without a verified business account.

## Webhook setup

In **Meta App → WhatsApp → Configuration → Webhook**:

- Callback URL: `https://api.darshya.online/api/v1/whatsapp/webhook`
- Verify token: same value as `WHATSAPP_WEBHOOK_TOKEN`
- Subscribe to `messages` field.

Inbound `STOP` / `अनसब्सक्राइब` replies are persisted in the
`WhatsAppOptOut` table (auto-created on first call). Future broadcasts
skip those phones automatically.

## Compliance

- Never send to non-opted-in numbers. Waitlist requires
  `whatsappOptIn=true`. Bookings opt-in implicitly via T&C — opt-out
  table still wins.
- 50 messages / second rate limit (tier 1 verified business). The
  broadcast service batches in groups of 50 with 1s sleep.
- Honour STOP within 24 hours; the webhook persists opt-outs in
  real-time.
- Keep audit log: every send recorded in `WhatsAppDelivery` with
  status, message id, and triggering admin user id.
