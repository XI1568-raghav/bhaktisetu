# Worldwide auth verification

## Summary

Darshya's auth is geo-neutral by construction. There is no IP allowlist, no
country-based rate limit, and no provider on the auth path that performs
default geo-blocking. Real-time visibility is provided by the
`auth.geo` log event — every response from `/api/v1/auth/*` is logged with
the Cloudflare-supplied country code, route, method, and status. To
answer "is auth working from country X?" pull the logs and filter on
`country == "X"`.

## Auth path

```
Browser  ─► Cloudflare (CF-IPCountry header set)  ─► Render (Fastify)
          │                                          │
          └─ Supabase Auth (SMS / email link)        └─ Postgres (Supabase pooler)
```

Each hop, by default, accepts traffic from any geography:

| Hop | Default geo policy | How to verify |
|---|---|---|
| Cloudflare proxy | All countries allowed | Cloudflare Dashboard → Security → WAF → no country rule |
| Render | All countries allowed | Render is geo-agnostic; no firewall by default |
| Supabase Auth (OTP via SMS) | Carrier-side; some countries unsupported by Twilio (the SMS provider Supabase uses by default) | Run a test OTP from a foreign phone; check Supabase Auth logs |
| Supabase Postgres | All allowed (Supabase pooler is global) | n/a |
| Resend (magic-link / receipts) | All countries; deliverability depends on recipient ISP | Resend dashboard → Logs |

## What can break per-country in practice

1. **Indian SMS DLT compliance**: outbound SMS to Indian numbers requires
   a DLT-registered template. Supabase's Twilio configuration handles
   this only if the project owner added the template. Symptom: OTP is
   accepted for `+91` in dev but never delivered. Mitigation: rely on
   email/magic-link as the primary path; SMS is a backup.
2. **Twilio carrier coverage**: a handful of countries (e.g. Cuba, North
   Korea, parts of Iran) are not deliverable. Symptom: send-otp succeeds
   (Supabase queued it) but the SMS never arrives. Mitigation: same as
   above — use magic-link.
3. **Resend free-tier sender reputation**: deliverability to corporate
   inboxes (Outlook 365 in particular) is occasionally degraded.
   Mitigation: monitor Resend Logs for bounces.
4. **Cloudflare Bot Fight Mode**: if a country sees a sudden spike of
   automated traffic, CF's bot-fight challenge can interpose. Symptom:
   users get a captcha instead of the login page. Mitigation: lives in
   CF Dashboard → Security → Bots; we leave it on standard, off-limits
   for `/api/v1/auth/*` if it ever fires.

## Verification procedure

To prove worldwide auth from this session without a VPN, follow:

1. Visit a country log report on Cloudflare:
   `Dashboard → Analytics → Traffic → Top Countries` — confirms requests
   are landing from the geographies you care about.
2. Pull Render API logs filtered on `auth.geo` and group by country —
   any `status >= 400` clusters are the actionable signal.
3. (Optional) From a different geography, run:
   ```
   curl -X POST https://api.darshya.online/api/v1/auth/send-otp \
     -H "Content-Type: application/json" \
     -d '{"phone":"+919876543210"}'
   ```
   The 200 + queued status proves the auth path is reachable; the user
   reports SMS receipt out-of-band.

## What we are NOT claiming

- We do not promise SMS delivery to every carrier in every country —
  that depends on Twilio + Supabase config + the local carrier.
- We do not promise email-delivery SLAs from Resend's free tier.
- We do not promise CF doesn't put up a challenge under attack — that's
  CF's job and is generally what we want.

The auth code is geo-neutral. The deliverability layer is whatever
Twilio + Resend do.
