# Zoho Mail Free — 5 mailbox setup for `darshya.online`

> Goal: stand up 5 real mailboxes at `@darshya.online` on Zoho's
> permanently-free tier (5 users × 5 GB × 25 MB attachments).
> Outcome: founders + support can send AND receive at `@darshya.online`
> without forwarding to Gmail.
>
> Sister doc: [`support-email-setup.md`](support-email-setup.md) covers
> the Cloudflare Email Routing alternative (forward-only, no mailbox).

## Why Zoho vs Cloudflare Email Routing

| | Cloudflare Email Routing | **Zoho Mail Free** |
|---|---|---|
| Cost | Free | Free (5 users cap) |
| Receive at `@darshya.online` | Yes | Yes |
| **Send from** `@darshya.online` | **No** (forward-only) | **Yes** |
| Real mailbox / IMAP / mobile app | No | Yes |
| Setup time | 5 min | 30 min (DNS + verify) |
| Best for | Catch-all → personal Gmail | Founder identity, replying as brand |

Pick Zoho if you want to reply from `raghav@darshya.online` and have it
arrive at the user looking like a real human (not a forward through
Gmail).

## The 5 mailboxes

| # | Address | Owner | Used for |
|---|---|---|---|
| 1 | `support@darshya.online` | shared / Raghav | All `mailto:` links, ticket alerts, replies |
| 2 | `raghav@darshya.online` | Raghav Sindhwani (founder) | Personal founder identity |
| 3 | `atishey@darshya.online` | Atishey Jain (co-founder) | Personal founder identity |
| 4 | `no-reply@darshya.online` | system | Resend FROM (already set in `apps/api/src/lib/email.ts`) — does NOT need a real mailbox if Resend handles all outbound; create only if you want to view bounces in Zoho |
| 5 | `hello@darshya.online` | shared | Press / partnerships / sales catch-all |

Slot 5 can also be used for `legal@`, `pr@`, or `careers@` later; trade
freely within the 5-user cap. To go beyond 5, Zoho's paid Mail Lite plan
is $1/user/month.

## Pre-flight: what blocks us today

Zoho's signup requires a phone OTP and a human captcha. **You must run
the signup yourself** — I cannot complete it from this session. Steps
1–3 below are yours; everything after is mechanical and the verifier
script at the end checks them.

## Setup

### 1. Sign up & add the domain

1. Go to <https://www.zoho.com/mail/zohomail-pricing.html> → **Forever
   Free Plan** → **Sign up**.
2. Use any address you control as the recovery email (e.g. your
   personal Gmail). Set the admin password somewhere safe — it cannot
   be recovered without it.
3. Add custom domain: `darshya.online` (region: **India** for lowest
   latency to Indian users — this picks `*.zoho.in` MX servers).

### 2. Verify domain ownership (TXT record at Cloudflare)

Zoho shows a `zoho-verification` TXT record. Add it at Cloudflare:

```
TXT  @  zoho-verification=zb12345678.zmverify.zoho.in
```

Wait 2 min, click **Verify** in the Zoho console.

### 3. Create the 5 users

In Zoho Admin Console → **Users** → **Add user**, create each mailbox
from the table above. Set strong passwords for each. Hand
`raghav@`/`atishey@` passwords to the respective humans through 1Password
or signal (not email).

### 4. Activate MX (this is the cutover — old inbound stops working)

If you currently have Cloudflare Email Routing or Hostinger MX records
on `darshya.online`, **REMOVE THEM FIRST**. Only one provider can be
authoritative for inbound mail.

Then add Zoho's records at Cloudflare:

```
MX   @                              10  mx.zoho.in
MX   @                              20  mx2.zoho.in
MX   @                              50  mx3.zoho.in
TXT  @                              v=spf1 include:zohomail.in include:resend.com ~all
TXT  zoho._domainkey                v=DKIM1; k=rsa; p=<long key from Zoho>
TXT  _dmarc                         v=DMARC1; p=quarantine; rua=mailto:support@darshya.online; pct=100; aspf=r; adkim=r
```

**SPF is the trap most teams miss.** We send outbound via Resend AND
need Zoho to be a valid sender. The `include:` list above combines both.
Don't make it `v=spf1 include:zohomail.in ~all` — that breaks Resend.

### 5. Verify

```bash
# MX should resolve to Zoho's servers
dig MX darshya.online +short
# Expected:
#   10 mx.zoho.in.
#   20 mx2.zoho.in.
#   50 mx3.zoho.in.

# SPF should include BOTH zoho and resend
dig TXT darshya.online +short | grep spf
# Expected:
#   "v=spf1 include:zohomail.in include:resend.com ~all"

# DKIM is up
dig TXT zoho._domainkey.darshya.online +short
# Expected: long "v=DKIM1; k=rsa; p=..." string

# DMARC live
dig TXT _dmarc.darshya.online +short
# Expected: "v=DMARC1; p=quarantine; ..."
```

End-to-end smoke:

```bash
# From your personal Gmail (not the Zoho mailbox), send to:
#   support@darshya.online
# Should land in Zoho webmail at https://mail.zoho.in within 60 s.

# Reverse: from Zoho webmail, reply to your personal Gmail.
# Header check at https://mxtoolbox.com/EmailHeaders.aspx:
#   - SPF: pass
#   - DKIM: pass (zoho._domainkey)
#   - DMARC: pass
```

### 6. Update app config (after MX is live)

Already shipped — no app change needed:

- `apps/api/src/lib/email.ts` already sends FROM `no-reply@darshya.online`
  with REPLY_TO `support@darshya.online`. Replies land in Zoho.
- `apps/api/src/routes/support.ts` sends ticket alerts to `support@darshya.online`
  (set via `SUPPORT_INBOX_EMAIL` env var; defaults to that address).

If you want a different inbox to receive ticket alerts, set
`SUPPORT_INBOX_EMAIL` in Render:

```
SUPPORT_INBOX_EMAIL=raghav@darshya.online
```

### 7. Mobile / desktop client

- **iOS / Android Mail app:** IMAP `imap.zoho.in:993` (SSL), SMTP
  `smtp.zoho.in:465` (SSL). Use the mailbox password from step 3.
- **Zoho Mail app** (recommended): just sign in with the full address.

## Coexistence with Resend (outbound)

Resend already owns DKIM at `resend._domainkey.darshya.online`. Adding
Zoho's `zoho._domainkey.darshya.online` is fine — DKIM keys are
selector-scoped and don't collide. SPF is the only file that needs to
list both. Don't delete Resend's DKIM record when wiring Zoho.

## Rollback

If Zoho doesn't work out, the 5-minute rollback is:

1. Cloudflare DNS → delete the 3 Zoho MX records.
2. Re-add Cloudflare Email Routing MX (or Hostinger's MX) per
   [`support-email-setup.md`](support-email-setup.md).
3. SPF back to `v=spf1 include:_spf.mx.cloudflare.net include:resend.com ~all`.

Inbound resumes at the new provider within 5 min of propagation. Old
Zoho mailbox contents stay accessible at <https://mail.zoho.in> until
you delete the Zoho org.

## What I cannot do from this session

- Sign up at Zoho (phone OTP + captcha).
- Create user passwords for `raghav@`, `atishey@`, etc.
- Click the verification link emailed to your recovery address.
- Reach into Cloudflare DNS to add records.

Once steps 1–4 are done by a human, the `dig` smoke commands above tell
us deterministically whether mail flow is healthy.
