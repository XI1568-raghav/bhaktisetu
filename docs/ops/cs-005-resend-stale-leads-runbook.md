# Re-send 230 Stale EMAILED Leads — Ops Runbook

> **Roadmap item**: R-Q1-CS-005 (P0) · **Depends on**: R-Q1-IT-004 (Resend DNS verify must be GREEN first) · **Authored**: 2026-06-12 · **Time required**: ~2 hr (1 hr query + segment + draft, 1 hr send + log) · **Owner**: founder
>
> **Goal**: re-send to ~230 leads in `EMAILED` status w/ zero replies. Hypothesis: original sends landed in spam due to missing DKIM/SPF/DMARC. Post-DNS-verify, re-send w/ improved deliverability + warm-followup copy.

## Pre-flight gate

```markdown
- [ ] R-Q1-IT-004 Resend DNS verify is GREEN (per docs/ops/resend-dns-verify-runbook.md pass criteria)
- [ ] Test send to founder's Gmail lands in INBOX (NOT spam) per IT-004 Step 8
- [ ] DMARC reports inbox checked clean for 7 days (means previous SPF/DKIM faults not still in flight)
- [ ] If ANY box unchecked → STOP. Re-sending pre-DNS = damages domain reputation further.
```

## Step 1 — Query 230 candidate leads (15 min)

```sql
-- Connect to DIRECT_URL (NOT pooled, for accuracy)
\c bhaktisetu_prod

-- Count baseline
SELECT COUNT(*)
FROM leads
WHERE status = 'EMAILED'
  AND last_contacted_at < NOW() - INTERVAL '30 days'
  AND contact_count >= 1
  AND email IS NOT NULL
  AND email != '';
-- Expected: ~230 rows (verify before send)

-- Segment by role for per-role messaging
SELECT role, COUNT(*) AS count, ROUND(AVG(contact_count), 1) AS avg_contacts
FROM leads
WHERE status = 'EMAILED'
  AND last_contacted_at < NOW() - INTERVAL '30 days'
  AND contact_count >= 1
  AND email IS NOT NULL
GROUP BY role
ORDER BY count DESC;
-- Expected: pandit (~100), temple (~80), gaushala (~20), astrologer (~30) — verify actual distribution

-- Segment by source for per-channel messaging (different cold-source = different warm-followup)
SELECT source, COUNT(*) AS count
FROM leads
WHERE status = 'EMAILED'
  AND last_contacted_at < NOW() - INTERVAL '30 days'
  AND contact_count >= 1
  AND email IS NOT NULL
GROUP BY source
ORDER BY count DESC;
-- Expected: justdial, indiamart, google_maps, manual, ... varies
```

## Step 2 — Export to working CSV (10 min)

```bash
# Export full candidate list w/ context fields
psql $DATABASE_URL -c "
\copy (
  SELECT
    id, role, name, city, state, email, phone, source,
    contact_count, last_contacted_at,
    metadata::text AS metadata_json,
    notes
  FROM leads
  WHERE status = 'EMAILED'
    AND last_contacted_at < NOW() - INTERVAL '30 days'
    AND contact_count >= 1
    AND email IS NOT NULL
    AND email != ''
  ORDER BY last_contacted_at ASC
) TO STDOUT WITH (FORMAT CSV, HEADER true)
" > data/sales/cs005-resend-candidates-2026-06-12.csv

wc -l data/sales/cs005-resend-candidates-2026-06-12.csv
# Expected: ~231 lines (230 + 1 header)
```

## Step 3 — Generate per-role warm-followup templates (30 min)

Compose 4 templates (one per role). Each template references:
- Lead's `name` + `city` (personalization)
- Subtle acknowledgment of prior contact ("we wrote to you N weeks ago...")
- NEW concrete update (Bhaktisetu progress since last contact)
- Soft re-ask

**Template A — pandit**

```
Subject: Bhaktisetu Foundation — {city} pandit network update + ek aur ask

Pranam {name} ji,

Maine aapko {weeks_ago} weeks pehle Bhaktisetu Foundation
(https://darshya.online) ke baare mein email bheja tha — verified-pandit
platform jo NRI devotees ke saath India temples + pandit ji ko connect
karta hai.

Possible hai woh email aap tak nahi pahuncha — humare DNS setup ka ek
issue tha. Aaj theek hai.

Update humari taraf se (last {weeks_ago} weeks):
- 30 verified pandit prospects across Bengaluru shortlisted
- First 5 pilot pandits onboarded in BLR
- NRI USD consultations going live w/ Stripe rails
- 70-80% commission to pandit, no upfront fee

Agar aap interested hain ek 15-min call ke liye —
calendar: {founder Calendly URL}

Agar pehle hi koi reply kar chuke hain ya not-interested — bas yahin
reply kar dein "unsubscribe" likh ke, main hata dunga aur dobara contact
nahi karunga.

Pranam,
{founder name}
Bhaktisetu Foundation
```

**Template B — temple TP/trustee**

```
Subject: Bhaktisetu — {temple/city} listing pilot, 60-80% commission, no upfront fee

Pranam {name} ji,

Bhaktisetu Foundation se {founder name}. Aapko {weeks_ago} weeks pehle
email bheji thi. Possible hai spam folder mein chali gayi — humara DNS
setup theek hua hai aaj.

Updated context:
- Bhaktisetu Foundation: active 80G + CSR-1 in India
- 30 Bengaluru temples in pipeline; 5 pilots will be live by Q2-end
- Devotees pay via Razorpay/Stripe; temple ko 60-80% commission
- Video proof mandatory per puja; founder personally onboards first 5 temples

Agar {temple name} ko pilot karna chahein — 15-min exploratory call?
calendar: {founder Calendly URL}

Nahi interested → "remove" likh dein reply mein, main hata dunga.

Pranam,
{founder name}
Bhaktisetu Foundation
```

**Template C — gaushala manager**

Use `docs/sales/gaushala-prospects-2026-06.md` Hindi-first template, w/ added preamble:

```
Pranam {name} ji,

Bhaktisetu Foundation se {weeks_ago} weeks pehle email bheji thi. Spam
ya delivery issue ho sakta tha — humara DNS theek hua hai aaj.

Re-sending humari original ask: Bhaktisetu pe gauseva recurring-donation
platform launch ho raha hai. {gaushala name} ko list karna chahte hain.

[rest of original gaushala template per gaushala-prospects-2026-06.md]
```

**Template D — astrologer**

Use `docs/sales/astrologer-prospects-2026-06.md` template w/ preamble:

```
Namaste {name} ji,

Maine {weeks_ago} weeks pehle email bheji thi. DNS issue tha humare
side, theek hua aaj — re-sending.

[rest of original astrologer template per astrologer-prospects-2026-06.md]
```

## Step 4 — Idempotency guard (10 min)

CRITICAL: prevent double-send if script crashes mid-run. Use Lead `metadata.cs005_resent_at` timestamp as idempotency marker:

```sql
-- Add metadata flag query (will be set by send script)
-- Lead.metadata.cs005_resent_at = ISO timestamp when re-sent

-- Pre-send check: skip any lead w/ metadata.cs005_resent_at already set
SELECT COUNT(*) FROM leads
WHERE status = 'EMAILED'
  AND (metadata->>'cs005_resent_at') IS NULL
  -- ... rest of original WHERE clauses
```

Script writes `metadata.cs005_resent_at = now()` + bumps `contact_count` + sets `last_contacted_at = now()` AFTER successful Resend API 200 response.

## Step 5 — Batch send script (recipe)

Recommend writing as `apps/api/scripts/ops/cs005-resend-stale-leads.ts` — similar pattern to existing `apps/api/scripts/ops/sla-breach-outreach.ts` shipped 2026-06-12.

Script structure:

```typescript
// apps/api/scripts/ops/cs005-resend-stale-leads.ts
// Skeleton — DO NOT auto-run. Founder triggers manually w/ explicit flag.

import { prisma } from '../../src/lib/prisma.js';
import { Resend } from 'resend';

const RESEND = new Resend(process.env.RESEND_API_KEY!);
const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 10; // Resend free tier: 100 emails/day. 10 batches × 23/batch = ~230.
const BATCH_DELAY_MS = 60_000; // 1 min between batches

async function fetchCandidates() {
  return prisma.lead.findMany({
    where: {
      status: 'EMAILED',
      lastContactedAt: { lt: new Date(Date.now() - 30 * 24 * 3600_000) },
      contactCount: { gte: 1 },
      email: { not: null },
      AND: [
        { metadata: { path: ['cs005_resent_at'], equals: null } },
      ],
    },
    orderBy: { lastContactedAt: 'asc' },
    take: 250, // safety cap above 230 expected
  });
}

function templateFor(lead: { role: string; name: string; city: string | null }) {
  const weeksAgo = '6';  // placeholder — compute from lastContactedAt
  if (lead.role === 'PANDIT') return /* template A */;
  if (lead.role === 'TEMPLE_MANAGER') return /* template B */;
  if (lead.role === 'GAUSHALA_MANAGER') return /* template C */;
  if (lead.role === 'ASTROLOGER') return /* template D */;
  return null; // unknown role — skip
}

async function main() {
  const candidates = await fetchCandidates();
  console.log(`Found ${candidates.length} candidate leads.`);

  if (DRY_RUN) {
    console.log('DRY RUN — no sends.');
    for (const lead of candidates.slice(0, 5)) {
      const tmpl = templateFor(lead);
      console.log(`Would send to ${lead.email} (${lead.role}, ${lead.name}, ${lead.city})`);
    }
    return;
  }

  let sent = 0;
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE);
    for (const lead of batch) {
      const tmpl = templateFor(lead);
      if (!tmpl) { console.warn(`Skip ${lead.id} — no template for role ${lead.role}`); continue; }

      try {
        await RESEND.emails.send({
          from: 'Bhaktisetu <founder@darshya.online>',
          to: lead.email!,
          subject: tmpl.subject,
          html: tmpl.html,
        });
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            contactCount: { increment: 1 },
            lastContactedAt: new Date(),
            metadata: { ...(lead.metadata as object), cs005_resent_at: new Date().toISOString() },
          },
        });
        sent++;
        console.log(`✓ sent to ${lead.email}`);
      } catch (err) {
        console.error(`✗ failed for ${lead.email}:`, err);
      }
    }
    console.log(`Batch done. Waiting ${BATCH_DELAY_MS / 1000}s before next batch (Resend rate limit).`);
    if (i + BATCH_SIZE < candidates.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }
  console.log(`Total sent: ${sent}/${candidates.length}`);
}

main().catch(console.error);
```

## Step 6 — Dry run (10 min)

```bash
pnpm tsx apps/api/scripts/ops/cs005-resend-stale-leads.ts --dry-run
```

Verify output: 230 candidates listed, first 5 sample shows correct template selection. If sample copy reads wrong → fix templates before live send.

## Step 7 — Live send (~40 min wall, batched)

```bash
# Backup leads table snapshot before live send (revert if any disaster)
pg_dump --table=leads $DATABASE_URL > /tmp/leads-backup-2026-06-12.sql

# Live send
pnpm tsx apps/api/scripts/ops/cs005-resend-stale-leads.ts 2>&1 | tee /tmp/cs005-send-log-2026-06-12.txt
```

Watch the log live. If you see consecutive failures (>3), CTRL+C — investigate before continuing.

Resend free tier: 100 emails/day. 230 emails will hit cap at email 100 of day 1 → resume next day for emails 101-230. Schedule accordingly: send 100 today, 100 tomorrow, 30 day-after.

OR upgrade Resend to paid tier ($20/mo for 50K emails/mo) → finish all 230 in single sitting. **Free-tier discipline per CLAUDE.md says NO upgrade unless cap genuinely breached**. 3-day spread is fine.

## Step 8 — Post-send reply triage (ongoing 14 days)

```sql
-- Check reply rate
SELECT
  COUNT(*) FILTER (WHERE (metadata->>'cs005_resent_at') IS NOT NULL) AS resent,
  COUNT(*) FILTER (WHERE status = 'REPLIED' AND (metadata->>'cs005_resent_at')::timestamp > NOW() - INTERVAL '14 days') AS replied,
  COUNT(*) FILTER (WHERE status = 'CONVERTED' AND (metadata->>'cs005_resent_at')::timestamp > NOW() - INTERVAL '14 days') AS converted,
  COUNT(*) FILTER (WHERE status = 'BOUNCED' AND (metadata->>'cs005_resent_at')::timestamp > NOW() - INTERVAL '14 days') AS bounced,
  COUNT(*) FILTER (WHERE status = 'UNSUBSCRIBED' AND (metadata->>'cs005_resent_at')::timestamp > NOW() - INTERVAL '14 days') AS unsubscribed
FROM leads
WHERE (metadata->>'cs005_resent_at') IS NOT NULL;
```

Target reply rate: 5-8% (industry benchmark for warm-followup post-deliverability fix).

If reply rate <2% by day 14 → DNS verify probably didn't actually fix the issue. Re-test deliverability per IT-004 Step 8. May need additional sender-reputation warming (4-week incremental volume ramp).

## Pass criteria

- [ ] IT-004 DNS verify GREEN (pre-flight)
- [ ] Step 1: SQL count returns expected ~230
- [ ] Step 2: CSV exported to data/sales/cs005-resend-candidates-2026-06-12.csv
- [ ] Step 3: 4 templates drafted + role-personalised + warm-followup framing + unsubscribe instruction
- [ ] Step 4: Idempotency guard verified (metadata.cs005_resent_at gate)
- [ ] Step 5: Send script authored at apps/api/scripts/ops/cs005-resend-stale-leads.ts (similar pattern to sla-breach-outreach.ts)
- [ ] Step 6: Dry run shows 230 candidates + first 5 sample copy correct
- [ ] Step 7: Live send completes 230/230 across 3 days (free tier) OR 1 sitting (paid tier)
- [ ] Step 8: Reply triage SQL run on day 14 + reply rate logged + handoff updated

## What this unblocks

- **Cleaner leads table**: stale EMAILED rows that should be REPLIED/CONVERTED/BOUNCED/UNSUBSCRIBED get re-categorized
- **R-Q1-CS-007** (next item): bulk-reset 200 stale EMAILED → NEW for re-attempt rolling window. CS-005 + CS-007 are pair.
- **Real reply-rate data point** for Bhaktisetu pre-MVP outreach effectiveness — informs M-014 (personalized outreach v2) prioritization

## Failure modes + debugging

| Failure | Cause | Fix |
|---|---|---|
| Send fails w/ "DKIM signature failed" | DNS not actually verified | Re-run IT-004 Step 7 + Gmail "Show original" test |
| Resend returns 429 rate limit | Free tier exceeded | Wait 24h OR upgrade to paid; document in handoff |
| 50%+ bounces in first 50 sends | Lead emails stale / invalid | Pause, run NeverBounce/MailTester verification on remaining 180 first |
| Hard CAN-SPAM-style complaint emails to founder@ | Unsubscribe link missing OR text language too commercial | Pause, add explicit unsubscribe instruction (Macro 10 escalation), re-template |
| Founder Gmail flagged for spam by Google after 100 sends | Domain reputation hit | Pause 14 days, allow domain reputation to recover, then ramp slower |

## Out of scope

- Bulk lead deletion / GDPR-style erasure (separate ticket if EU lead found)
- A/B test of template variants (defer to M-014 — personalized outreach v2)
- WhatsApp re-send fallback (requires U7 — WhatsApp Business; defer)
- LinkedIn-DM re-touch (manual founder-action, not scriptable v1)

## Closes

R-Q1-CS-005 — runbook + script template shipped. Status flips to `shipped` after founder completes 8 pass-criteria + 230/230 sends logged + day-14 reply triage.
