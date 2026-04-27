# `support@darshya.online` activation runbook

> Goal: make `support@darshya.online` accept incoming mail end-to-end.
> Outcome: anything users send via the Contact page `mailto:` link or
> the `mailto:support@...` references in code reaches a real inbox.

## Recommended path: Cloudflare Email Routing (free)

Cloudflare Email Routing is the cheapest, lowest-friction option:

- Free for any number of forward addresses on a domain that uses
  Cloudflare DNS.
- Forwards `support@darshya.online` to whatever inbox you actually
  read (Gmail, Zoho, etc.) without you having to host a mailbox.
- Sets MX + SPF in one click; we don't need to write the records by
  hand.

### Step-by-step (5 minutes)

1. Go to **Cloudflare dashboard → darshya.online → Email → Email Routing**.
2. Click **Get started**. Cloudflare will offer to add the required DNS
   records (MX × 3 + SPF TXT). Click **Add records and enable**.
3. Under **Custom addresses**, click **Create address**:
   - Custom address: `support`
   - Action: **Send to an email**
   - Destination: your real inbox (e.g. `you@gmail.com`)
4. Cloudflare emails the destination a verification link. Click it.
5. Done. Send a test mail to `support@darshya.online` from another
   account; it should land in the destination inbox within 30 s.

### Records Cloudflare adds (for reference)

```
MX  darshya.online  10 route1.mx.cloudflare.net
MX  darshya.online  16 route2.mx.cloudflare.net
MX  darshya.online  29 route3.mx.cloudflare.net
TXT darshya.online  "v=spf1 include:_spf.mx.cloudflare.net ~all"
```

If you already have MX records pointing somewhere else (e.g. Resend, a
prior provider), Cloudflare's wizard will detect the conflict and ask
you to remove them first. Do that — incoming mail can only land at one
provider.

## Outbound mail (separate concern)

We already use **Resend** for outbound. That's unrelated to inbound
routing. Resend just needs the domain verified for *sending*; the SPF
record above already includes Cloudflare's relay, and you'll add a
separate DKIM record from Resend's dashboard. As long as both SPF
includes coexist (`include:_spf.mx.cloudflare.net include:resend.com`),
both work.

## Alternative: Zoho Mail Free

If you want a real mailbox at `support@darshya.online` (not just a
forward), Zoho Mail Free gives you 5 mailboxes / 5 GB / 25 MB
attachments at $0. Setup is similar but adds DKIM:

```
MX  darshya.online  10 mx.zoho.in
MX  darshya.online  20 mx2.zoho.in
MX  darshya.online  50 mx3.zoho.in
TXT darshya.online  "v=spf1 include:zohomail.in ~all"
TXT zoho._domainkey.darshya.online  "v=DKIM1; k=rsa; p=<key from Zoho>"
```

Choose Zoho if you want to *send from* `support@darshya.online` — that
needs a real mailbox; routing alone doesn't give it.

## Verify it worked

After the records propagate (typically 1–5 minutes on Cloudflare):

```bash
# Check MX presence
dig MX darshya.online +short

# Check SPF includes Cloudflare's relay
dig TXT darshya.online +short | grep -i spf

# End-to-end smoke: send from an account you don't own (your phone Gmail)
# to support@darshya.online. Watch the destination inbox.
```

There is also a node script at `apps/api/scripts/verify-mail-dns.ts`
that runs the lookups and prints green/red per check — see below.

## Background on what was already shipped

- `apps/web/lib/company.ts` already exposes `supportEmail` =
  `support@darshya.online`. All `mailto:` references on Contact /
  Privacy / Terms / Refunds / Support pick this up.
- `apps/api/src/lib/email.ts` (Resend) is configured to send *from*
  `support@darshya.online` — it will only deliver once Resend's
  domain-verification DKIM is added; that's a separate dashboard step
  which is independent of inbound routing above.

## What I cannot do from this session

DNS records live at the registrar (or, in your case, at Cloudflare since
they're authoritative). This is one of the few changes only the domain
owner can make. Once the records are in, the verifier script confirms
you're done.
