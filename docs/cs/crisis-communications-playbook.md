<!-- TC-08 (P1, trust audit): the "verified pandit" adjective was removed from the
copy below. Nothing in the codebase promotes a Priest to verified: the only
production writer of Priest.verificationStatus is apps/api/src/routes/priest.ts,
which writes 'pending'; isVerified: true appears only in apps/api/prisma/seed.ts
and apps/api/scripts/seed-demo-users.ts. There is no credential upload, no
reference workflow, no probation review and no per-pandit trust score column, and
Priest.aadhaarVerified is read as a PAYOUT gate (apps/api/src/routes/providers.ts),
not as a published credential. This is markdown a human copies into a real
message, so there is nothing to gate it on: restore the wording by hand the day
apps/api/src/lib/pandit-vetting.ts HAS_PANDIT_VETTING is true. -->

# Crisis Communications Playbook

> Founder + CS contractor reference for handling crisis events. Pre-defined scripts + escalation paths.

## Crisis tiers

### Tier 0 — Existential (publicly visible)
- Site fully down >2 hours
- Data breach affecting >100 users
- Major payment processing failure during festival
- Founder/leadership public scandal
- Regulatory action (DPDP Board investigation)

### Tier 1 — Severe operational
- Pandit fraud/embezzlement discovered
- Multiple booking failures during peak (Diwali/Navratri)
- NRI customer chargeback wave
- Press article negative (unverified claims)
- Security vulnerability disclosed by researcher

### Tier 2 — Customer-facing operational
- Single high-profile customer complaint going viral
- Pandit no-show pattern (3+ in single day)
- Refund processing delay >10 days
- Email/WhatsApp delivery outage

### Tier 3 — Internal but visible
- Founder Twitter mistake/controversy
- Vendor outage (Razorpay/Resend)
- Influencer partnership backfire
- Customer accidentally exposed sensitive data

## Response framework (any tier)

1. **Acknowledge within 30 minutes**: Don't go silent. Visible activity = trust.
2. **Investigate within 4 hours**: Get the actual facts before public statements.
3. **Communicate within 24 hours**: Honest, specific, actionable.
4. **Resolve within 7-14 days**: Concrete action + customer compensation if applicable.
5. **Post-mortem published 30 days**: Public learning + commitment to prevent.

## Tier 0 scripts

### Site fully down >2 hours

> **OPS-10 correction (2026-09-02).** The sign-off of this template used to
> point the public at `status.bhaktisetu.com`. **That host does not serve
> anything.** Measured 2026-09-02: DNS resolves to two parked AWS addresses
> (`76.223.54.146`, `13.248.169.48` — the same pair `bhaktisetu.com` returns),
> and both `http://` and `https://` **time out after 20s** (`curl` exit 28,
> HTTP code `000`). Broadcasting it during a Tier-0 outage sends every worried
> devotee to a hanging tab and turns "we are on it" into a second visible
> failure — in the one message where credibility is the whole product.
>
> `https://darshya.online/status` **does** exist and returned **200** in the
> same measurement, but it is not yet a status page you can point a crowd at:
> `NEXT_PUBLIC_UPTIME_STATUS_URL` is unset (it is not in `render.yaml`'s
> `envVars:` block), so the route renders its fallback — the banner *"Status
> temporarily unavailable. Live data will appear once the UptimeRobot public
> status page is configured"* and all four monitors reading **Unknown / —**.
> A page that says "Unknown" for every service during an outage is worse than
> no link.
>
> So the template below cites **no status URL at all** and directs people to
> the channel the update is actually being posted on. Restore a status link
> only after `/status` is verified showing live monitor rows; do not
> re-introduce `status.bhaktisetu.com`.

```
[Twitter + LinkedIn + Email]

⚠️ Bhaktisetu is experiencing extended downtime.

Status: API + web both unreachable since [TIME].
Cause: Investigating [Render outage / DB issue / unknown].
ETA: Engineers working on restoration. Expected by [TIME+2hr].
Customer impact: 
  - All bookings paused — no charges processing
  - Existing video proofs unaffected (already in CDN)
  - Pandits notified, customer-facing impact limited

We will post hourly updates here until resolved.

🙏
Sunil Kumar, Founder
+91-XXXXX-XXXXX (founder direct)
Updates on this thread — we are not linking a status page because we do not
have a working one. Reply here and we will answer.
```

### Data breach affecting >100 users

```
[Email + In-app + Press release within 72 hours per DPDP]

URGENT: Data Security Incident at Bhaktisetu Foundation

Date: [DATE]
Reporting officer: Sunil Kumar, Founder & CEO

We detected unauthorized access to [scope] on [DATE]. We are notifying you because your data may have been affected.

What happened:
[Specific factual description]

What we are doing:
1. Immediately patched the vulnerability
2. Reset all affected user passwords
3. Engaged independent security firm for full audit
4. Filed report with Data Protection Board of India
5. Notifying all affected users individually

What you should do:
1. Reset your Bhaktisetu password immediately
2. Check your booking history for any unauthorized activity
3. Contact us at security@bhaktisetu.com if you notice anomalies

What was NOT exposed:
- Payment card details (tokenized by Razorpay, the only payment processor; Stripe removed 2026-08-11 — do not name it in a public notice)
- Sanskrit + Hindi text content
- Other user data not in [specific scope]

We deeply apologize for this incident. Bhaktisetu Foundation takes user trust seriously and we have failed in this responsibility.

🙏
Sunil Kumar
Founder & Grievance Officer
+91-XXXXX-XXXXX
```

### Founder public scandal/accusation

```
[Twitter + LinkedIn + Press]

I have read [specific article/post/accusation].

I want to address this directly and personally:

[Specific factual response — what's true, what's contextual, what's false]

I take this seriously and:
1. Have requested independent review by [3rd party]
2. Will respond to any specific concern via direct contact
3. Bhaktisetu Foundation operations continue uninterrupted

For Bhaktisetu customers + community: nothing changes operationally. Your bookings + video proofs continue as normal.

For media + investors: I am available for direct discussion at +91-XXXXX-XXXXX or founder@bhaktisetu.com.

🙏
Sunil Kumar
```

## Tier 1 scripts

### Multiple booking failures during Diwali peak

```
[Email + In-app banner]

⚠️ Holi/Diwali Peak Demand — Booking Capacity Update

We're experiencing higher-than-expected booking volume during the festival peak. Result: 5-10% of bookings are encountering payment processing delays.

If you experienced this:
- Your booking is HELD (not failed). Pandit is reserved.
- Payment processing will complete within 4-6 hours.
- You will receive confirmation email when processed.
- If by 24 hours no confirmation: full refund automatic + we'll re-book personally.

If you want to verify your booking status:
- Email founder@bhaktisetu.com with booking ID
- WhatsApp +91-XXXXX-XXXXX

We are scaling capacity in real-time. Apologies for the festival inconvenience.

🙏
Sunil
```

### Pandit fraud discovered

```
[Internal to affected customers ONLY first]

Dear [customer name],

I'm Sunil Kumar, founder of Bhaktisetu. I'm writing personally about your recent booking with Pandit [X].

We discovered that Pandit [X] [specific issue — e.g., did not actually perform the puja / falsified video proof / charged unauthorized fees]. We've terminated this pandit from our network as of [DATE].

For you specifically:
1. Full refund: ₹[amount] returning to your card within 5 business days
2. Re-booking at no cost with another pandit
3. Founder personal apology call within 24 hours

We are publishing a public statement Monday about this incident + the corrective measures we're implementing. You will not be identified by name in any public communications.

Bhaktisetu Foundation is built on trust. We failed you in this case. We commit to:
- More rigorous pandit verification (extending Aadhaar + reference videos to spot checks)
- Random video proof verification (currently 100% reactive, moving to 10% proactive sample)
- Customer feedback loops on every booking

🙏
Sunil Kumar
Founder & CEO, Bhaktisetu Foundation
+91-XXXXX-XXXXX direct
```

## Tier 2 scripts

### Single customer complaint going viral on Twitter

```
[Twitter reply within 30 min]

Hi @[handle], Sunil from Bhaktisetu here.

This is unacceptable. I'm DMing you now to investigate immediately. I'll personally call you within 4 hours.

🙏
[Reply publicly to your tweet for transparency once investigated]

[Then privately reach out, investigate, resolve, return publicly w/]
"Update for community: [customer name] and I have resolved this. [Specific action taken]. We've also updated our [process/policy] to prevent similar issues. Thank you @[handle] for raising this publicly — it forced us to improve. 🙏"
```

### Refund processing delay >10 days

```
[Email + WhatsApp]

Dear [customer name],

Your refund (₹[amount], ref: [ID]) is delayed beyond our 5-7 business day commitment.

Status:
- Refund initiated: [DATE]
- Razorpay confirmation: [DATE]
- Bank settlement: PENDING
- Expected: [NEW DATE]

What we're doing:
- Escalated to Razorpay tier-2 support
- Daily follow-up by our finance team
- If not resolved by [DATE+3], founder will personally call Razorpay + you

What you can do:
- Reply with bank account screenshot showing pending refund (helps Razorpay investigation)
- WhatsApp +91-XXXXX-XXXXX for direct founder contact

We deeply apologize for this delay. As compensation for the inconvenience, ₹500 credit has been added to your Bhaktisetu wallet (no expiry).

🙏
Sunil
```

## Tier 3 scripts

### Founder Twitter mistake

```
[Tweet within 30 min of recognising the mistake]

I posted [X] earlier today. On reflection, that was [specific reason it was wrong/inappropriate/incomplete].

I'm deleting the original tweet and replacing with this acknowledgement.

[Specific correction or fuller context]

Thank you to those who pointed out the issue. I learn fast + adjust.

🙏
```

## Decision matrix (who responds, when)

| Crisis Tier | Initial Response | Public Comms | Press Release | Customer Outreach |
|---|---|---|---|---|
| Tier 0 | Founder within 30 min | <2 hours | Within 24 hr | Within 4 hr |
| Tier 1 | Founder OR CS contractor within 1 hour | <4 hours | Within 48 hr | Within 6 hr |
| Tier 2 | CS contractor within 4 hours | <24 hours | Optional | Within 24 hr |
| Tier 3 | Founder personal handling | <30 min for own social, <2 hr for general | Not required | Direct customer DM if applicable |

## Lessons-learned + prevention

After every Tier 0/1 crisis:
- 30-day post-mortem published publicly at /transparency
- Process changes documented in /docs/cs/operational-sops.md
- Annual review of all crises + prevention measures

## Founder rules

1. **Acknowledge fast** (within 30 min for Tier 0/1)
2. **Be honest** (don't spin, don't deny)
3. **Take responsibility** (no blame-shifting)
4. **Show concrete action** (specific dates + numbers)
5. **Follow up** (close the loop publicly)

## Pre-positioned assets

> **OPS-10 correction (2026-09-02).** "Pre-positioned" is a promise that the
> asset is ready before the crisis starts. The status-page entry was not: see
> the measurement in the Tier-0 section above. It is restated below as an
> outstanding item so nobody plans a Tier-0 response around it.

- **Status page — NOT AVAILABLE.** `status.bhaktisetu.com` does not serve
  anything (parked DNS, both schemes time out — measured 2026-09-02).
  `https://darshya.online/status` returns 200 but renders "Status temporarily
  unavailable" with every monitor `Unknown`, because
  `NEXT_PUBLIC_UPTIME_STATUS_URL` is unset. **To make this a real asset:** create
  the UptimeRobot public status page, then add `NEXT_PUBLIC_UPTIME_STATUS_URL`
  to the `envVars:` block of the `darshya-web` service in `render.yaml` — it is
  a `NEXT_PUBLIC_*` variable, so it is baked at **build** time and a runtime-only
  dashboard entry will not reach the client — and redeploy. Until a responder
  has loaded `/status` and seen live monitor rows, do not link it in any
  customer-facing crisis message.
- Press release templates for top 5 crisis scenarios
- Direct WhatsApp + email + phone for founder always-on
- CS contractor trained on Tier 1-3 response (Tier 0 escalates to founder)
- Insurance: cyber liability insurance for data breach scenarios (₹50K/yr premium)
