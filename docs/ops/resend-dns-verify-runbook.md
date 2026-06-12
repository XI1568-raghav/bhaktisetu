# Resend DNS Verify Runbook — DKIM + SPF + DMARC for darshya.online

> **Roadmap items**: R-Q1-IT-004 (P0) + gates U12 (rotate leaked Resend API key) + unblocks R-Q1-CS-005 (re-send 230 stale leads) · **Authored**: 2026-06-12 · **Time required**: ~45 min · **Owner**: founder
>
> **Goal**: get darshya.online verified in Resend dashboard via DKIM + SPF + DMARC DNS records. Without these, Bhaktisetu emails land in spam folders (which is why 230 leads got 0 replies — possibly all greylisted by Gmail).

## Prerequisites

```markdown
- [ ] Resend account active (https://resend.com)
- [ ] DNS access to darshya.online registrar
- [ ] Old Resend API key flagged as leaked (per U12 in docs/activation-gates.md)
- [ ] No active Resend sends in flight (pause CS-005 + any cron sends until DNS green)
```

## Step 1 — Add domain to Resend (5 min)

1. Open https://resend.com/domains → click "Add Domain" → enter `darshya.online`.
2. Resend shows DNS records to add. Save the table view — record exact strings.

Expected DNS records (Resend-generated, examples — REAL values differ per account):

| Type | Name | Value | Purpose | TTL |
|---|---|---|---|---|
| TXT | `darshya.online` | `v=spf1 include:_spf.resend.com -all` | SPF — authorize Resend to send | 3600 |
| TXT | `resend._domainkey.darshya.online` | `p=MIGfMA0GCSqGSIb3DQEBA...` (long key) | DKIM — cryptographic signature | 3600 |
| MX | `send.darshya.online` (subdomain) | `feedback-smtp.us-east-1.amazonses.com` (priority 10) | Bounce + return-path handling | 3600 |
| TXT | `send.darshya.online` | `v=spf1 include:amazonses.com ~all` | SPF for bounce subdomain | 3600 |

**Note**: Resend uses Amazon SES under the hood, hence the `amazonses.com` references.

## Step 2 — Add SPF record (5 min)

Open DNS provider (Cloudflare / GoDaddy / Namecheap / Route 53 / etc).

If darshya.online ALREADY has an SPF record (likely — Google Workspace email, etc), MERGE — don't add a second TXT record (multiple SPF records fail validation).

**Merge pattern**:

```
# Original (example, Google Workspace):
v=spf1 include:_spf.google.com ~all

# After merging Resend:
v=spf1 include:_spf.google.com include:_spf.resend.com ~all
```

**KEY RULES**:
- ONE TXT record per domain starting with `v=spf1`
- All `include:` directives joined w/ spaces
- End w/ `~all` (soft-fail — recommended) OR `-all` (hard-fail — strict, may bounce edge cases)
- Recommend `~all` for v1 (allows softer rejection during ramp; switch to `-all` after 30 days clean)

Verify:

```bash
dig +short TXT darshya.online | grep spf
# Expected single line:
# "v=spf1 include:_spf.google.com include:_spf.resend.com ~all"
```

## Step 3 — Add DKIM record (5 min)

Add new TXT record:

| Field | Value |
|---|---|
| Type | TXT |
| Name | `resend._domainkey` (registrar prepends domain → `resend._domainkey.darshya.online`) |
| Value | (paste exact value from Resend dashboard — `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQ...` ~200 chars) |
| TTL | 3600 (1 hour) |

**Watch out**: some DNS providers (Cloudflare) require the value WITHOUT enclosing quotes; others (GoDaddy classic) require quotes. Paste both ways if first fails.

Verify:

```bash
dig +short TXT resend._domainkey.darshya.online
# Expected: the full p= value as single string
```

## Step 4 — Add MX record for bounce handling (5 min)

Add new MX record:

| Field | Value |
|---|---|
| Type | MX |
| Name | `send` (registrar prepends → `send.darshya.online`) |
| Value | `feedback-smtp.us-east-1.amazonses.com` |
| Priority | 10 |
| TTL | 3600 |

**WHY a subdomain MX**: keeps your main domain MX (Google Workspace) untouched. Bounces flow only to `send.darshya.online` → forwarded to AWS SES feedback loop → Resend dashboard.

Verify:

```bash
dig +short MX send.darshya.online
# Expected: 10 feedback-smtp.us-east-1.amazonses.com.
```

## Step 5 — Add SPF for bounce subdomain (3 min)

Add new TXT record:

| Field | Value |
|---|---|
| Type | TXT |
| Name | `send` |
| Value | `v=spf1 include:amazonses.com ~all` |
| TTL | 3600 |

Verify:

```bash
dig +short TXT send.darshya.online | grep spf
# Expected: "v=spf1 include:amazonses.com ~all"
```

## Step 6 — Add DMARC record (5 min)

DMARC = policy layer telling receivers what to do when SPF + DKIM fail (reject / quarantine / monitor).

For v1 (recommend "monitor mode" — `p=none` — for first 30 days, then escalate to `quarantine` → `reject`):

| Field | Value |
|---|---|
| Type | TXT |
| Name | `_dmarc` |
| Value | `v=DMARC1; p=none; rua=mailto:dmarc-reports@darshya.online; ruf=mailto:dmarc-fails@darshya.online; sp=none; pct=100; adkim=r; aspf=r` |
| TTL | 3600 |

**Notes**:
- `p=none` → DMARC report only, no enforcement (safe for v1)
- After 30 days of clean reports → upgrade to `p=quarantine; pct=10` (10% of failing mail to spam)
- After 60 days → `p=quarantine; pct=100`
- After 90 days → `p=reject; pct=100` (hard reject of failing mail)
- `rua=mailto:` → aggregate reports inbox (set up an alias)
- `ruf=mailto:` → forensic reports inbox (high-volume; consider dmarc-analyzer.com or similar third-party DMARC processor)

Verify:

```bash
dig +short TXT _dmarc.darshya.online
# Expected: full DMARC value
```

## Step 7 — Resend dashboard verify (3 min)

1. Return to Resend dashboard → Domains → darshya.online → click "Verify".
2. Resend checks all DNS records.
3. **All 4 records green** → status flips to "Verified".

If any record shows ✗ → wait 5-15 min for DNS propagation OR re-check exact value match.

Common issues:
- DKIM `p=` value got truncated (some registrars cap at 255 chars per TXT row — use split-string syntax or contact registrar)
- SPF has 2 records (consolidate)
- MX name prepended wrong (registrar quirk)

## Step 8 — Test send + Gmail deliverability check (5 min)

```bash
# Replace YOUR_API_KEY with new (post-rotation) Resend API key
export RESEND_API_KEY="re_xxx_yyy"

curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "Bhaktisetu <noreply@darshya.online>",
    "to": "your_personal_gmail@gmail.com",
    "subject": "Resend DNS verify test — '$(date +%Y-%m-%d)'",
    "html": "<p>If you receive this in INBOX (not Spam), DKIM+SPF+DMARC are working.</p>"
  }'

# Expected: { "id": "..." } returned within 2 seconds
# Wait 30 seconds, check Gmail inbox + spam folder
```

**Gmail deliverability check**:
1. Open the test email in Gmail.
2. Click 3-dot menu → "Show original".
3. Scroll to "SPF / DKIM / DMARC" section near top.
4. ALL 3 should show "PASS".

If any FAIL → debug per Step 7 common issues.

## Step 9 — Rotate API key (U12 — leaked key cleanup) (5 min)

1. Resend dashboard → API Keys → list keys.
2. **REVOKE** any keys created before today that you don't have control over (leaked one).
3. **CREATE** new key w/ name `prod-2026-06` + permission level "Full Access" (or "Sending only" if narrower scope sufficient).
4. **STORE** new key in:
   - Render API env: `RESEND_API_KEY=re_new_xxx`
   - GH Actions secrets: `RESEND_API_KEY=re_new_xxx`
   - `apps/api/.env.local`: `RESEND_API_KEY=re_new_xxx`
5. **RESTART** Render API service so it picks up the new key.
6. **VERIFY** prod still sends (test booking confirmation email or similar).
7. **DELETE** old leaked key from Resend dashboard (final irreversible step — only after restart confirmed working).

## Step 10 — Document + monitor (3 min)

Save credentials reference at `docs/legal/dns-records.md` (founder-only):

```
darshya.online Resend DNS verified: YYYY-MM-DD
Records added: SPF (merged) + DKIM (resend._domainkey) + MX (send subdomain) + SPF (send subdomain) + DMARC (_dmarc, p=none v1)
Resend API key created: prod-2026-06 (yymmdd-suffix)
Resend API key revoked: (old leaked key prefix re_xxx... — DO NOT log full key)
DMARC monitoring inbox: dmarc-reports@darshya.online (set up alias)
```

Set monthly review reminder to:
- Check DMARC aggregate reports for deliverability trend
- Escalate DMARC policy (`p=none` → `quarantine` → `reject`) on schedule above
- Re-test Gmail deliverability

## Pass criteria

- [ ] All 5 DNS records added (SPF main + DKIM + MX send + SPF send + DMARC)
- [ ] `dig +short TXT darshya.online` shows merged SPF w/ Resend
- [ ] `dig +short TXT resend._domainkey.darshya.online` returns DKIM value
- [ ] `dig +short MX send.darshya.online` returns Amazon SES MX
- [ ] `dig +short TXT _dmarc.darshya.online` returns DMARC value
- [ ] Resend dashboard shows "Verified" status
- [ ] Test send lands in Gmail INBOX (NOT spam folder)
- [ ] Gmail "Show original" shows SPF/DKIM/DMARC all PASS
- [ ] New Resend API key created + pasted to Render + GH Actions + .env
- [ ] Old leaked API key revoked
- [ ] Prod Resend test send confirms new key works
- [ ] DMARC monitoring inbox + monthly review reminder set

## What this unblocks

- **R-Q1-CS-005**: re-send 230 stale EMAILED templates (would've gone to spam without DNS — wait until VERIFIED before sending)
- **U12**: leaked Resend API key cleanup
- **All future Bhaktisetu transactional emails**: booking confirmations, refund notifications, donation receipts, 80G PDFs, monthly impact reports, festival reminders
- **R-Q4-P-002 adopt-a-temple monthly impact PDFs**: rely on Resend deliverability
- **R-Q1-CS-001 macros**: many escalation flows trigger email

## Failure modes + debugging

| Failure | Cause | Fix |
|---|---|---|
| Resend "Verify" still shows ✗ after 30 min | DNS propagation slow OR value mismatch | Wait 1h max OR check exact string match via dig |
| DKIM value got truncated in DNS record | Registrar 255-char limit per TXT | Use multi-string TXT syntax (`"part1" "part2"`) OR contact registrar |
| Test send arrives in Spam folder | SPF or DKIM failing | Check Gmail "Show original" → which auth failed → fix DNS record |
| MX bounce subdomain not detected | Wrong "Name" field (e.g. typed full `send.darshya.online` instead of just `send`) | Re-add w/ name field as `send` only |
| 2 SPF records exist | New record added without merging | Delete one, MERGE includes into single record |
| DMARC "no policy" warning | Forgot to add `_dmarc` TXT | Add Step 6 |

## Out of scope

- BIMI (Brand Indicators for Message Identification) — logos in inbox preview. Requires DMARC `p=quarantine` or `p=reject` first. Defer to v2.
- Subdomain-specific DKIM/SPF (e.g. `api.darshya.online` separate signing key) — only relevant if API sends separately from main domain. Defer until use case emerges.
- DKIM key rotation (annual best practice) — set calendar reminder for 2027-06-12.
- Webhook for Resend bounce events → DB write-back. Separate ticket post-CS-005.

## Closes

R-Q1-IT-004 — runbook shipped. Status flips to `shipped` after founder completes 12 pass-criteria checkboxes.
