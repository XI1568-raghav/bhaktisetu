# Owner Actions — the things only you can do

**Written 2026-08-19.** Checked against local `HEAD = e1e16159` and against live production
(`https://darshya.online`, `https://api.darshya.online`). The local tree is ahead of what is
deployed. I could **not** confirm the running production commit, because every production URL
currently returns HTTP 503 — see item 3.

Read this once, top to bottom. It is ordered by *how much damage it does if you ignore it*, not
by how scary the label sounds.

---

## What changed about this list

Fifty findings were sitting on your desk marked "owner-gated". That label was wrong far more
often than it was right.

| Verdict | Count | Meaning |
|---|---|---|
| Genuinely needs you and nothing else | **2** | No code can do it |
| Split — you do a small part, code does the rest | **23** | Usually one decision or one dashboard click |
| Actually code, no owner involved | **14** | Off your desk entirely |
| No longer true — already fixed | **11** | Off your desk entirely |

**25 of 50 came off your plate completely.** They were labelled owner-gated because the agent
that looked at them could not edit that folder, not because you were needed. Section 4 lists
them so you can see what someone else now owns.

Of the 25 that remain, most are a single decision or a five-minute click. The honest total is
about **10 hours of your time and one ₹2,000–₹5,000 accountant's bill** to clear everything —
and only about **2 hours of that is genuinely urgent**.

---

## 1. Do these first

### 1. Rotate your live keys — they are sitting in a committed file (S-12)

**This is the most damaging item in the entire audit and it is free to fix.**

I verified today that `docs/chat-archive/` contains **14 files that are committed to git**, and
those files contain strings matching your live Razorpay key format, Supabase secret-key format,
Resend key format, Groq key format, and full PostgreSQL connection strings. I did not print any
values and you should not either. The repo is private, which is the only reason this is not
already a disaster.

Your `apps/api/.env` is correctly ignored by git — that part is fine. The leak is the chat
archive.

**Do these in this order. Razorpay first, because it moves money.**

1. Go to `dashboard.razorpay.com` → **Account & Settings** → **API Keys** → **Regenerate Live Key**.
   Copy the new Key ID and Secret. The Secret is shown once. Regenerating kills the old key
   instantly — and since the site is already down, this is the perfect moment.
2. Go to `dashboard.render.com` → service **bhaktisetu** → **Environment** tab. Edit
   `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, paste the new values, **Save Changes**.
3. Go to `supabase.com/dashboard` → the Darshya project → **Project Settings** → **Database** →
   **Reset database password**. Copy the new password.
4. Back in Render → bhaktisetu → Environment: edit **both** `DATABASE_URL` and `DIRECT_URL`.
   In each, replace only the password — the text between the first colon after the username and
   the `@` sign. Change both, then **Save Changes once**. The API will not start with a wrong
   password, so do not save between the two edits.
5. Supabase service key: same project → **Project Settings** → **API Keys** → **Create new secret
   key** → copy → paste into Render as `SUPABASE_SERVICE_ROLE_KEY` → Save → wait for the deploy to
   go green → *then* return to Supabase and **Revoke** the old key. (If that page instead shows one
   very long token under "Legacy API keys", use **Rotate** there — that version signs everyone out.)
6. `resend.com/api-keys` — revoke anything you do not recognise, create a new key named
   `darshya-prod-2026-08-19` with **Sending access** only, paste into Render as `RESEND_API_KEY`.
7. `console.groq.com` → API Keys → delete, create new, paste into Render as `GROQ_API_KEY`.
8. `dashboard.cohere.com` → API keys → revoke, create new, paste as `COHERE_API_KEY`.
9. **Keep the GitHub repo private.** `github.com/XI1568-raghav/bhaktisetu` → Settings → General →
   Danger Zone. That button must keep saying "Change visibility" until an engineer confirms the
   chat archive is purged from git history.

**Time:** 40 minutes. **Cost:** ₹0.
**If you only have ten minutes:** do steps 1–4 only. Razorpay and the database password are the
ones that move money and read customer data. Groq and Cohere are free AI keys whose worst case is
a burned quota.
**What unblocks:** AW-09 below becomes meaningful. Also, you can never open-source this repo
until this is done.

**Code side (not yours):** delete the `docs/chat-archive/` files, add that folder to `.gitignore`,
add a pre-commit scan so a transcript carrying a live key can never be committed again. A git
history rewrite is optional while the repo stays private and **mandatory** before it ever goes public.

---

### 2. Stop your laptop pointing at the live database (AW-09) — 30 seconds

`apps/api/.env` currently says `NODE_ENV=production` and points `DATABASE_URL` at your **live
Supabase database in Tokyo**. Your local development database config lives in a different file
(`.env.local`) that Prisma does not read.

The failure mode: one `npx prisma migrate reset` typed inside `apps/api` — the standard remedy
when local migrations drift, and an entirely reasonable thing for a contractor or an AI agent to
run — **drops and recreates every table in your live customer database.** Bookings, payments,
commissions, donation receipts. On the Supabase free tier there is no point-in-time restore.

**The 30-second version, do it right now:**

Rename the file `apps/api/.env` to `apps/api/.env.prod-backup`. That is it. Prisma then finds no
`.env`, the running production app is unaffected (it reads its config from Render, not from your
laptop), and there is simply no path from this checkout to your live data.

**The tidy version, 5 minutes, whenever you feel like it:** open `apps/api/.env` in Notepad,
change `NODE_ENV=production` to `development`, copy the `DATABASE_URL` line out of `.env.local`
over both the `DATABASE_URL` and `DIRECT_URL` lines, and delete the `SUPABASE_SERVICE_ROLE_KEY`,
`JWT_SECRET`, `GROQ_API_KEY` and `COHERE_API_KEY` lines entirely. Those belong only in Render.

*(Why you and not an agent: this machine's credential policy blocks automated writes to that exact
file. It is genuinely a Notepad edit.)*

**Time:** 30 seconds. **Cost:** ₹0.
**What unblocks:** safe local schema work. Two migrations are already written-but-unapplied in the
repo partly because nobody wants to touch migrations while this hazard exists.

---

### 3. Your site is not slow. It is off. (TD-01 / SCAL-10)

I checked five URLs today. All five returned HTTP 503 with the header `x-render-routing: suspend`
and the body "This service has been suspended": the homepage, `/auth/login`, the API health
endpoint, and both Render origins directly. This is not a cold start and it is not transient.

**Nothing else in this audit can be verified, and no fix already merged can reach a user, until
this is resolved.**

1. Go to `dashboard.render.com`. Look at the top of the page for a red or yellow banner —
   Render states the reason there. It is normally one of: free instance hours exhausted for the
   month, a failed payment method, or an account flagged for review. **Write down what it says.**
2. Click into the service. If there is a **Resume Service** button, the suspension is manual and
   one click brings it back. If it says "Free instance hours used: 750/750", you have hit the cap.
3. Click **Billing** in the sidebar and note your cycle reset date. That is the day the site comes
   back on its own if you change nothing.
4. If it is a payment or account problem, click **Contact support** on that page and paste the
   reason text. **Do not create a second Render account to get around it** — that usually makes it worse.

**Then pick one of three paths:**

| Path | Cost | Effort | Result |
|---|---|---|---|
| Wait for the hour cycle to reset | ₹0 | none | Site returns next month, then dies again next month |
| **Move the website to Vercel, keep the API on Render (recommended)** | **₹0** | ~1 hour | Both stay free, neither hits a cap, website never sleeps |
| Move both to Render Starter | ~$14/mo (₹1,200) | 5 min | Everything just works, no migration |

**To do the recommended move:** `vercel.com` → sign in with GitHub → **Add New → Project** →
import the bhaktisetu repo → set **Root Directory** to `apps/web` → **Deploy**. Then copy every
`NEXT_PUBLIC_` variable from Render's darshya-web Environment tab into Vercel's Settings →
Environment Variables, and redeploy. When the Vercel URL works, go to Cloudflare → darshya.online
→ DNS and point the root and `www` records where Vercel's Settings → Domains screen tells you to.
After a day of traffic, delete the darshya-web service on Render so it stops burning free hours.

**Afterwards, free and important:** create a free account at `uptimerobot.com` and add two HTTP
monitors at 5-minute intervals — one for `https://darshya.online/` and one for
`https://api.darshya.online/health`. This keeps the free container awake (so a first visitor does
not wait 20–35 seconds) *and* it means you find out about the next outage before an audit does.
This one was found by an agent, not by monitoring.

**Time:** 15 minutes to diagnose, ~1 hour if you migrate. **Cost:** ₹0 on the recommended path.
**What unblocks:** literally everything else that needs a live site — RESP-01, SEC-01, PERF-03,
PF-04, NOTIF-03, DF-03, CM-13, HN-11, LC-14, TD-09.

---

### 4. Your email is not off. It is on, and failing every single send. (NOTIF-03)

**This section said the opposite until 2026-09-04, and the opposite was wrong.** It told you
`RESEND_API_KEY` was unset in production. It is set. Email is enabled and has been failing 100% of
sends. Measured against live production:

```
GET https://api.darshya.online/health/channels
"email":{"day":"2026-09-03","attempted":48,"sent":0,"failed":48,"rateLimited":0,"cap":100,"enabled":true}
```

48 attempted, 0 sent, 48 failed. `rateLimited: 0` rules out the free-tier quota — Resend is
rejecting the sends outright. These counters reset when the API restarts, so 48 is a floor, not a
day's total. Nobody has received a password reset, a magic link, a booking confirmation or a
receipt. If you have been told sign-in "spins forever", this is very likely the cause: the mail was
never going to arrive.

**The likely reason — one wrong environment variable, not a missing account.** The code sends from
the apex domain:

```
FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Darshya <no-reply@darshya.online>'
```

But public DNS says the apex is not your Resend sender:

| Record | Value | What it means |
|---|---|---|
| `darshya.online` SPF | `include:_spf.mail.hostinger.com` | Hostinger mailbox hosting. No `amazonses`. |
| `send.darshya.online` SPF | `include:amazonses.com` | Resend's verified subdomain (Resend runs on SES) |
| `send.darshya.online` MX | `feedback-smtp.*.amazonses.com` | SES bounce handling — the real sending identity |

So the verified sender looks like `send.darshya.online`, while the app sends as
`no-reply@darshya.online`. Resend rejects an unverified from-domain outright, which produces
exactly this signature: everything failed, nothing rate-limited.

**Step 1 — Confirm (2 minutes).** resend.com → **Domains**. Note which of `darshya.online` and
`send.darshya.online` shows **Verified**. Then → **Logs**, open any of today's failures and read
the reason. That tells you definitively; the table above is inference from DNS, not proof.

**Step 2 — Fix (2 minutes, ₹0).** If `send.darshya.online` is the verified one, in
dashboard.render.com → the API service → Environment, add:

`RESEND_FROM_EMAIL` = `Darshya <no-reply@send.darshya.online>`

Save, then redeploy the API. If instead the apex is the verified domain, the problem is elsewhere
and the Resend log from Step 1 will name it.

**Step 3 — Verify you actually fixed it.** Trigger one password reset, then re-read the counters.
`sent` must increase. **The status endpoint now requires authentication** (it used to be public,
which told any anonymous visitor which of your integrations were dark and how much of the daily
mail allowance was left):

```bash
curl -H "x-ops-token: $CRON_AUTH_TOKEN" https://api.darshya.online/health/channels
```

`CRON_AUTH_TOKEN` is already set on Render. Signing in as an admin and calling it also works.

**Already done — browser push.** `webPush` reports configured in production. The VAPID keys are set.
Nothing to do.

**Still off — WhatsApp and phone push.** Both report unconfigured, and neither is urgent.

**Step 4, optional — phone push (free, 15 min).** `console.firebase.google.com` → Add Project →
gear icon → Project Settings → Service Accounts → **Generate New Private Key**. Open the downloaded
`.json` and copy three values into Render: `project_id` → `FCM_PROJECT_ID`, `client_email` →
`FCM_CLIENT_EMAIL`, `private_key` → `FCM_PRIVATE_KEY`.

**Step 5 — WhatsApp: do not do this yet.** It needs a Business Solution Provider account, which
needs a registered legal entity, and every message template needs individual Meta approval.
₹2,000–6,000/month minimum plus weeks of approvals. It chains to your legal work in item 7.
**Meanwhile, delete any copy on the site promising WhatsApp delivery** — shipping "we'll WhatsApp
you" while the channel is off is the same class of defect as the 80G receipt.

*Note: I cannot read your Resend dashboard or handle API keys — that is off-limits to me by rule,
not by ability. Steps 1 and 2 are yours.*

**Time:** 5 minutes if the diagnosis above is right. **Cost:** ₹0 (Resend free = 100/day, 3,000/month).
**What unblocks:** password reset, magic-link sign-in, every booking and refund notification, the
80G receipts, and NOTIF-15's aarti reminders. This is the highest-value 5 minutes on this list.

---

### 5. Paste one Supabase secret into Render (SCAL-05) — 5 minutes, ₹0

The code for offline JWT verification is written, tested, and **already deployed**. It is doing
nothing because one environment variable is missing. Setting it removes a round trip to Tokyo from
**every single authenticated request** on your site.

1. `supabase.com/dashboard` → Darshya project → **Project Settings** → **API** (may be labelled
   **JWT Keys** on newer dashboards).
2. **Read what the page shows you.** If there is a box labelled **JWT Secret** with one long random
   string — copy it, go to step 3. If instead it talks about "JWT Signing Keys" and shows an ECC or
   RSA key with a JWKS URL — **stop** and tell an engineer: the code only understands the older
   shared-secret style and the newer style needs about 60 lines of change. Your API keys are already
   the new short format, so this outcome is genuinely possible.
3. dashboard.render.com → bhaktisetu → Environment → Add Environment Variable. Key:
   `SUPABASE_JWT_SECRET`. Value: paste. **Save Changes.**
4. Nothing will look different. Logged-in pages just get faster. If anything seems wrong, delete
   that one variable and behaviour reverts exactly to today's.

**Time:** 5 minutes. **Cost:** ₹0.
**If you do nothing:** every authenticated page keeps paying 100–300ms to Tokyo that no amount of
query tuning can recover, and a bad minute at Supabase Auth becomes a total outage for every
logged-in user simultaneously — the middleware returns HTTP 500 rather than degrading.

---

### 6. Name your grievance officer (LEG-11) — 10 minutes, ₹0

Three of your public policy pages currently admit, in writing, that no grievance officer has been
appointed. That is a free, pre-proven compliance finding attached to every consumer complaint
anyone ever makes against you. The code is already built to fix itself the moment you supply four
facts — all three pages read from one file, so they cannot disagree.

1. **Decide who it is. For a solo founder the answer is you.** There is no rule requiring a separate
   employee.
2. Write down four things: (a) your full legal name as on your PAN card, (b) the words
   "Grievance Officer & Nodal Contact", (c) a phone number you will actually answer in business
   hours — your existing mobile is fine, (d) the email complaints should go to.
3. *Optional, free, 3 minutes:* make a real complaints mailbox. `dash.cloudflare.com` → sign in →
   click **darshya.online** → **Email** → **Email Routing** → add a rule forwarding
   `grievance@darshya.online` to your personal Gmail.
4. Send those four items to an engineer with: *"set `COMPANY.grievance.HAS_NAMED_OFFICER_VERIFIED`
   to true and fill officerName, officerDesignation, officerPhone in `apps/web/lib/company.ts`."*

**If you will not publish a personal mobile number:** publish name + designation + email only and
leave the phone field empty. The code already hides the phone line when it is blank, and
name+designation+email covers most of the requirement. **Do not publish a fake name or "The
Grievance Team"** — an unattributed alias is exactly the defect being flagged.

**Time:** 10 minutes. **Cost:** ₹0. There is no version of this that costs money.

---

### 7. Publish who you legally are, then get one accountant's opinion (LEG-10 + PM-09)

This is the one place where a real professional is worth real money — but **most of it is free and
you can do it this week.** Take it as a ladder and stop where your budget stops.

**Rung 1 — free, today, 5 minutes.** As a sole proprietor you are legally allowed to trade under a
brand name, and publishing your own name and address satisfies the Consumer Protection
(E-Commerce) Rules. Send your engineer this exact sentence to publish:

> "Darshya is a sole proprietorship of **{Your Full Name As On PAN}**, **{your full postal address
> including PIN code}**."

No registration, no company, no money. **This is the part everyone assumes needs a company and
does not.**

**Rung 2 — free, 15 minutes.** Get a Udyam registration at `udyamregistration.gov.in` → "For New
Entrepreneurs who are not Registered yet as MSME" → Aadhaar number and name → OTP → PAN. It issues
a number instantly. It is genuinely free; any site charging you is a reseller. It gives you a
government-issued business identity you can publish and it is required for most seller onboarding later.

**Rung 3 — the one worth paying for. ₹1,500–₹5,000, one hour.** Find a practising Chartered
Accountant in Gurugram **who has done work for an online marketplace** — a CA who has never handled
e-commerce will get this wrong. Take exactly these four questions, in these words:

1. "When my platform takes a commission from a pandit, am I an aggregator taxed only on my
   commission, or am I the supplier of the puja service and taxed on the full price the devotee pays?"
2. "Section 24(ix) says an e-commerce operator must register for GST regardless of turnover, and
   Section 52 says I must collect 1% TCS — does that apply to me from my first rupee, or only after
   I cross the ₹20 lakh services threshold?"
3. "When I pay a pandit, do I deduct TDS under 194-O at 0.1% or 194J at 10%?"
4. "What must I do before I take my first payment, versus what can wait?"

**Write the answers down in the CA's own words and email them to yourself.** Then give them to an
engineer. Only then can prices carry a tax line.

**Do not skip Rung 3 by assuming the ₹20 lakh threshold protects you.** For an e-commerce operator
required to collect TCS, it does not apply. This is precisely why it needs a professional and not a
web search — and getting it wrong accrues interest and penalties silently while you scale.

**Rung 4 — only if the CA says you need it.** GST registration is free to file at `reg.gst.gov.in`
(Form REG-01; you need PAN, Aadhaar, a bank statement, and address proof). Budget ₹500–1,500/month
afterwards for someone to file the monthly returns.

**Rung 5 — incorporation. Not now.** ₹8,000–15,000 plus annual filings. Do this when you have
co-founders or investors asking, not before.

**Free things you can do today regardless:** do not describe any current price as permanent, and
never publish a GST number you do not hold.

**One important warning:** a note in your codebase currently reads "Section 8, never Pvt. Ltd." —
steering everyone who reads it toward a non-profit registration. **A Section 8 company cannot
distribute profits, so it is incompatible with taking a 20% commission as your own revenue.** If
Darshya is a for-profit marketplace, that note is wrong and must be changed. Decide this before
anyone acts on it.

**Code side (not yours, and free):** one page of your PDF paperwork is currently headed
**"DARSHYA TAX INVOICE"** while you hold no GSTIN. I confirmed this is still true at
`apps/api/src/lib/pdf-invoice.ts:195`. Changing it to "RECEIPT" is a one-line edit that two prior
agents identified and both declined as out of scope. **Ask for it explicitly.** It is honest today,
because no GST is collected, and it removes a standalone exposure.

**Time:** 20 min free rungs + 2–3 hours including finding a CA. **Cost:** ₹0 + ₹1,500–₹5,000 once.
**What unblocks:** see the chain in section 2 — this is the longest one.

---

### 8. Get 80G certificates from your gaushalas — do not try to get your own (COM-02 / LEG-02)

*(LEG-02 and COM-02 are the same defect logged twice. Do this once and both close.)*

**Understand the constraint first, because it changes the whole plan: you cannot get an 80G
certificate as an individual or a sole proprietor.** Section 80G(5) certificates go only to trusts,
registered societies and Section 8 companies. Nothing you file changes that.

**The preferred path is free, and it is also the more correct structure.** Stop trying to be the
donee. Most established gaushalas and large temples **already hold their own 80G certificate.**

1. Ask two or three of the gaushalas and temples you are onboarding to send you a photo of their
   80G certificate and their PAN card.
2. Read two things off the certificate: the registration number and the validity dates. Give those
   to your engineer to store against that organisation. The receipt then names **them** as the
   donee, carries **their** number, and is a genuinely valid 80G document you never had to register for.
3. **Ask each one a follow-up question that decides whether the donor's deduction survives:**
   *"Do you file Form 10BD every year?"* Since AY 2022-23, a donor's 80G deduction is only allowed
   if the donee files Form 10BD and issues Form 10BE. A valid certificate without the 10BD filing
   still gets your donor disallowed. **If a donee does not file 10BD, do not advertise 80G for them.**
4. Tell your engineer explicitly: **"do NOT set `HAS_80G_VERIFIED` to true until a certificate PDF
   is in hand."** Email the number and PAN rather than reading them out.

**The good news:** the catastrophic half is already fixed and live. Your receipts no longer claim
80G eligibility unless both a registration number and a PAN are present — they print "OFFICIAL
DONATION RECEIPT — proof of donation, not a tax exemption certificate" instead. **No invalid tax
document is being emitted.**

**The remaining problem is smaller but real:** I confirmed today that `apps/web/app/gaushala/page.tsx`
still shows a stats tile reading **"80G — Tax-deductible receipt on eligible donations"** with no
gating, while its sibling tiles on the same page *are* gated. A donor reads that, donates expecting a
deduction, and receives a PDF explicitly saying it is not valid for one. That is a bait-and-switch on
your donation page. It is a one-line code fix — ask for it this week.

**Time:** 30 minutes of WhatsApp messages. **Cost:** ₹0.
**Do not take the slow path** (Section 8 incorporation → Form 10A → 12A + provisional 80G →
₹8,000–15,000, 2–5 months, and a permanent annual Form 10BD/10BE obligation) unless you have decided
Darshya is a non-profit. Re-read the warning in item 7.

---

### 9. Sign the price book (PM-07 / PM-09-catalogue) — 30 minutes, ₹0

Your product currently cannot transact the business your own GTM plan describes. There is no
concept of a tier, a variant, or an add-on anywhere in the data model — one flat price per puja
and a yes/no "samagri included" flag. Griha Pravesh, one of your two planned launch SKUs, does not
exist in the catalogue at all. Satyanarayan Katha sells at **₹1,501 against a planned ₹4,199** —
roughly a third — in a category where price *is* the trust proxy.

Nobody will build the tier ladder until you confirm the prices, and that confirmation is sitting
in a file waiting for your initials.

1. Open `E:\NewClaude\deliverables\launch-catalog-2sku-pricing.md` in any text editor or Word.
2. Read the price table. Pay particular attention to Satyanarayan: **₹1,501 live vs ₹4,199 planned.**
   Decide which is right.
3. Scroll to the last line: *"Founder sign-off line: prices above are final for launch when you
   initial here: ______ date: ______"*. Change anything you disagree with, then type your initials
   and today's date over the blanks. Save.
4. Tell an engineer: **"the price book is signed, build the tiers."** That one sentence unblocks
   the whole build.

Nothing here costs money and nothing here is legal. It is you confirming what you want to charge.

**One thing an engineer should fix before you even sign:** you currently promise included samagri on
the ₹451 and ₹751 SKUs, where the kit alone costs ₹480–650. That flag is a promise your unit
economics cannot keep, and it inverts margin on your cheapest products.

**Cheap interim that gets you selling tomorrow without any of this:** keep the flat catalogue, add
Griha Pravesh as **one** flat SKU at ₹6,999 with samagri included, and sell add-ons manually over
WhatsApp. No schema change, no code, and it tests demand before you build the ladder.

---

### 10. Three truth decisions, one sitting (PM-01, PM-05, PM-08) — 15 minutes total

Your pricing page and plan catalogue make three promises the code does not keep. Each needs one
sentence from you.

**(a) Does subscribing reduce commission? (PM-01)** Your pricing page says plans let you *"subscribe
to reduce it and unlock premium tools"* and lists *"lower commissions"* as a benefit. No code
anywhere delivers this — the tier ladder exists in a file but is read by nothing.
**Recommended answer: No.** Tell an engineer to delete those two sentences. Your plans still sell
tools, listings and placement, which are real. Building the real thing is a multi-day change to
money math. *If you leave it:* you are publicly promising a commission reduction that does not
exist — a chargeable misrepresentation under the Consumer Protection Act 2019, aimed squarely at
the supply-side audience you most need to trust you.

**(b) Keep NRI Premium? (PM-05)** The ₹5,000/year "NRI Premium" plan advertises six benefits. Three
do not exist: "No ads anywhere on Darshya", "No NRI surcharge on bookings", and — worst — **"Free
80G receipt PDF for any donation"**, which you cannot legally issue. A fourth, "Weekly 1:1 call with
priest", has no scheduling path I could find.
**Recommended answer: unpublish the plan.** You have no NRI traffic today, so you lose nothing, and
you can relaunch it when it is real. If you keep it, strip it to Priority Booking and Unlimited AI
Astro Chat and delete the rest. **Never let an 80G claim appear anywhere until you hold a
certificate** — that is a tax claim, not marketing.

**(c) Ratify your take rate. (PM-08)** Say this out loud and write it down: **"Darshya takes 20%
from every provider role, published, permanent."** The code already does exactly this everywhere.
You are only ratifying it so that `PROJECT_CONTEXT.md` — the file every future agent reads as
authoritative — stops saying rates up to 40% are acceptable and 15–18% is the target.
**Do not pick a number below 20%** unless you have modelled it: 15–18% gives away roughly a quarter
of your gross margin for a difference no provider can verify at signup. And **never raise it later** —
raising a take rate on existing suppliers is the one move this category does not forgive.

---

### 11. Pick three blog posts (HN-11 / LC-14) — 45 minutes, ₹0

Every page footer on your site links to `/blog`. The published-posts array is literally empty, and
the page's own metadata says "Updated daily." Meanwhile there are **30 finished drafts** sitting in
`docs/agent-reports/blog-drafts`, 28 of them already marked `ready-for-founder-review`.

1. Open that folder on your machine.
2. Read three. Pick whichever three you would be comfortable having your name on.
3. Tell the engineer the three filenames. That is the whole job — you never touch code or GitHub.

**The zero-owner-time alternative:** tell an engineer to drop the footer link and delete the
"Updated daily" claim while the blog is empty. The blog then simply does not exist to visitors,
which is strictly more honest than a heading with nothing under it, and publishing can wait
indefinitely. **If you never want a blog, delete the route and the 30 drafts outright** — that is a
legitimate answer.

---

### 12. Ask your astrologers to raise their own prices (PM-10) — 15 minutes, pure upside

You have three astrologers pricing themselves freely, and they have priced themselves far too low.
Your most experienced (22 years) charges **₹25/min**.

Message the two most experienced and ask: *"Would you like to raise your per-minute rate? You keep
80% either way."* Suggest ₹60–90/min for 15+ years verified, ₹30–45 mid, ₹15–25 junior.

**Lead with this comparison, it is your whole recruiting argument:** at ₹75/min your senior
astrologer nets ₹60/min after your 20%. At AstroTalk, after their ~50% cut, the same astrologer
nets about ₹37/min.

**They change the number themselves in their own profile. You touch nothing.** Do not raise anyone's
rate unilaterally — it is their price, and doing so is how you lose the three suppliers you have.

*This is upside, not a defect.* Nothing breaks if you skip it; you just earn 2–3× less on your
stickiest, zero-fulfilment-cost revenue line. A 30-minute consult currently bills ₹750, of which you
keep ₹150; at senior-band pricing it bills ₹1,800–2,700.

---

### 13. Decide what the store is (COM-01) — 15 minutes

**One decision, and it is a genuine business one:** do you want Darshya to be the *seller* of 24
physical items — brass thalis, rudraksha malas, ghee, books — meaning you buy stock, pack, ship,
handle returns and charge GST on goods? Or is the store purely a **marketplace** where onboarded
sellers list their own inventory and you take a cut?

You cannot ship a brass thali you do not own, and no code can decide this. Write the answer in one
sentence and hand it over.

**If marketplace-only (the cheaper answer, and what your code is already built for):** say *"take
the 24 demo products off the storefront."* Nothing else is needed from you.

**If first-party:** you need a supplier per SKU, a shipping arrangement, and GST registration for
goods. That is a separate project. **Do not start it before the puja business earns anything.**

**Why this matters right now:** those 24 products use IDs like `prod_001` that the ordering API does
not recognise. A devotee browses a polished storefront, adds a ₹1,299 thali, **types in their full
delivery address**, taps Place Order — and gets "Unknown product: prod_001". Every product, every
time. That user does not come back for the puja business either.

---

### 14. Lower-priority, genuinely optional

| Item | What you do | Time | Verdict |
|---|---|---|---|
| **SCAL-11** Email caps | Supabase → Authentication → Emails → SMTP Settings → turn on Custom SMTP with `smtp.resend.com`, port 465, username `resend`, password = your Resend key. Lifts Supabase's 2-emails-per-hour signup ceiling. | 20 min, ₹0 | **Do it** when email is on |
| **SCAL-02** Move API to Singapore | Render regions can't be changed in place — create a new free service in Singapore, copy ~12 env vars, repoint the Cloudflare `api` CNAME | 45 min, ₹0 | Worth it eventually; the code-side fix captures most of the win for free |
| **DU-06** Brand font | `fontshare.com/fonts/cabinet-grotesk` → Download Family → hand the zip over. **It is free for commercial use — the "licence it" wording was wrong.** Or just reply "Outfit", "Bricolage" or "Sora" and an agent self-hosts a free Google font instead. | 5 min, ₹0 | Nice-to-have |
| **CM-13** Homepage video | Only if you already have a real recording of a completed puja *with the devotee's permission*. With zero completed bookings you probably do not. | 5 min, ₹0 | **Say no.** Do not commission one. |
| **COM-12** Temple bookability | 15 temple pages honestly say "coming soon" because you have no pandit there. Fixing it means recruiting pandits, not writing code. Pick by demand — Vaishno Devi and Badrinath before, say, Lingaraj. | GTM effort | Real work, but it is your existing GTM plan |
| **COM-18** Store photo credits | Your 24 product photos come from Wikimedia Commons under CC-BY-SA, which requires crediting the photographer. Either add a credits line, or take the COM-01 recommendation and remove the demo products — which makes this disappear. | 30 min | Only if you keep the demo store |
| **TD-09** Self-host temple photos | Supabase Storage bucket | — | **Skip.** Trades free Wikimedia bandwidth for a metered free quota you need elsewhere. Just add the credits. |

---

## 2. Chains — do these in an order that does not waste effort

**Chain A — the unblocker. Do this before anything else you want to verify.**

```
Render un-suspended  →  prod is live  →  every already-merged fix reaches users
                                      →  11 findings become verifiable at all
```
`RESP-01`, `SEC-01`, `PERF-03`, `PF-04`, `NOTIF-03`, `DF-03`, `CM-13`, `HN-11`, `LC-14`, `TD-09`,
`COM-11` are all currently unverifiable. **This is the single highest-leverage action in the audit,
and it is item 3 above.**

**Chain B — the long legal one. Each step genuinely requires the one before it.**

```
Publish name + address (free, 5 min)
   └─→ Udyam registration (free, 15 min)
         └─→ CA answers "am I an e-commerce operator?" (₹1,500–5,000)
               └─→ GST registration, IF the CA says yes
                     ├─→ Prices can carry a real tax line, margin model becomes accurate
                     ├─→ B2B / temple-chain contracts become signable (they ask for a GSTIN)
                     ├─→ Razorpay Route + RazorpayX for split settlements
                     │      └─→ automated provider payouts at scale
                     └─→ WhatsApp Business API via a BSP
                            └─→ WhatsApp notifications + gift-puja delivery
```
**Do not start at the bottom.** WhatsApp templates cannot be approved without an entity, and an
entity choice you make before the CA conversation may be the wrong one.

**Chain C — the 80G fork. Take the left branch.**

```
                    ┌─ Ask gaushalas for THEIR 80G cert + PAN  (₹0, 30 min)  ← TAKE THIS
Want 80G receipts? ─┤     └─→ engineer stores it → receipts are valid → donations line works
                    └─ Register Darshya as the donee  (₹8,000–15,000, 2–5 months)
                          └─→ requires Section 8, which forbids taking a 20% cut  ← CONFLICTS with your business
```

**Chain D — email.** The key is already in Render and VAPID is already set; neither is the
blocker. Every send is being REJECTED (48/48 on 2026-09-03), almost certainly because the app
sends from `no-reply@darshya.online` while the verified Resend domain looks like
`send.darshya.online`. See item 4.
```
RESEND_FROM_EMAIL in Render  →  sends stop being rejected  →  password reset + magic link work
                             →  booking + refund receipts send
                             →  Supabase Custom SMTP (SCAL-11) becomes worth setting
```

**Chain E — pricing.**
```
Sign the price book (one signature)  →  PM-07 tier build  →  PM-09 catalogue  →  bundle economics
                                                            →  paid acquisition becomes safe to spend on
```
**Do not spend on acquisition before this lands.** You would be driving traffic to a catalogue that
cannot charge for what it promises.

---

## 3. Not actually yours — 25 items that came off your plate

These were labelled owner-gated. They are not. **You do nothing for any of them.** They belong to
whoever next opens the code. Ask for them by ID.

**Already fixed — verified, nothing to do (11)**

| ID | Was | Now |
|---|---|---|
| PM-03 | Priest commission stuck at 70% | Schema default is 0.80 at HEAD *and* in the prod commit; corrective migration exists |
| PM-10 (₹) | Astrologer rates missing currency symbol | All four surfaces render ₹ |
| PERF-03 | Fonts dead, 201 KB downloaded for nothing | Dead webfont link removed; the "must license these fonts" claim was also wrong |
| PF-04 | Pandits could not mark a booking delivered | Real UI shipped; needs only a deploy |
| COM-18 | 5.7 MB product images | Thumbnail rewrite live on both sides |
| COM-11 | Seller shelf did not exist | Built; correctly empty until a seller lists |
| RESP-01 | Cookie banner covered the sign-in button | Fixed and in the prod commit — **but re-check on a phone the hour the site returns; it has only ever been proved in source** |
| DF-03 | Fabricated astrologers and reviews next to a paid CTA | Removed both sides |
| I18N-04 | Five disagreeing language lists | Collapsed to one file with a test pinning it |
| I-08 | No locale handling in middleware | Full locale resolution shipped |
| RES-09 | Raw API errors shown to users | Friendly errors on seven surfaces now |

**Code work, no owner input (14)**

| ID | What someone needs to do |
|---|---|
| **PAR-14** | **Your wedding muhurat form 401s for every signed-out visitor — and your own auto-reply emails send prospects to it.** One-line fix: drop the auth requirement, add rate limiting. **Highest-value item in this table.** |
| **LEG-07** | Cancel dialogs say "Your payment will be returned" when refunds are tiered (100/75/50/25%). **Every cancellation misstates the refund.** Fix: show the real number from the existing quote endpoint. |
| **PF-19** | Pandit sidebar links to the *legacy* payouts ledger, not the one holding their money. One-line href change. |
| LEG-17 | 24 products show permanent struck-through "MRPs" that were never real selling prices — named in the CCPA dark-pattern guidelines. Delete them. |
| SEC-01 | Every security header is missing in production. The correct config exists in a file Render never reads; move it into `next.config.ts`. |
| PM-01/PM-05 | The copy deletions from item 10, once you decide |
| DI-06 / DI-07 | Missing unique index + missing index on the commission ledger. One migration, bundled. |
| DI-08 | Two admin screens both say "commissions" but mean opposite things (₹1,142 vs ₹6,580). Relabel. |
| SCAL-09 | Admin user search will crawl at scale. One index migration. |
| NOTIF-15 | A bell says "Reminder set for Sandhya Aarti" and nothing is ever sent. **Minimum honest fix: change the label to "Saved on this device."** |
| RES-13 | Users on patchy mobile hit a dead offline page with no auto-recovery. ~35 lines. |
| LC-11 | Admin "blocked/active" filter is silently ignored by the server. ~8 lines. |

**Two duplicates worth merging:** LEG-02 is the same defect as COM-02, and PF-16 is the same as
PM-03. Two open P0s that are one defect distorts every priority count in the audit.

---

## 4. Cheaper alternatives, and where to just remove the claim

You have a ₹0 budget. For each expensive-looking item, here is the honest cheaper path.

| Item | Proper fix | Cheaper path | If you do nothing |
|---|---|---|---|
| Site is down | Render Starter, $14/mo | **Move web to Vercel Hobby, ₹0** — or accept a monthly outage | Site stays down; Google drops your ~1,100 content pages from the index after sustained 503s, destroying the entire organic acquisition plan |
| 80G receipts | Section 8 company, ₹8-15k, 2-5 months | **Use your gaushalas' existing certificates, ₹0** | Donors expect a deduction, get a PDF saying they cannot claim one |
| GST | Register + monthly filings | **Ask a CA once, ₹1,500-5,000, then decide** | Liability may be accruing right now with interest, and you cannot retroactively charge customers for it |
| Email volume | Resend Pro, $20/mo | **Free tier = 100/day ≈ 50 signups/day.** Switching provider barely helps (Brevo 300/day, MailerSend 3,000/mo) | Devotee #34 on launch day gets no receipt |
| API latency | Move Render to Singapore, 45 min of your time | **₹0, 10 min of agent time: batch the 25 serial database calls into ~5.** The serial stacking is what turns a 95ms penalty into 2.4s | Every provider dashboard has a 0.5-2.5s floor before any real work happens |
| Brand font | Buy a typeface | **Cabinet Grotesk is free**, or use any free Google font | Headings and body share one face; pages read flat |
| Temple photos | Self-host on Supabase Storage | **Keep hotlinking Wikimedia (free), just add credits** | Weak CC-BY-SA attribution; a deleted file blanks a tile |

**Where "remove the feature or the claim" is the right answer** — not a compromise, the actual
correct call for a pre-revenue founder:

- **The commission-reduction promise (PM-01).** Delete two sentences. Building it is days of money-math work for a benefit nobody has bought yet.
- **NRI Premium (PM-05).** Unpublish it. Three of six benefits do not exist, including an illegal 80G promise, on your highest-value SKU aimed at your highest-value cohort.
- **The 24 demo store products (COM-01).** Take them off the storefront. They cannot be bought, and removing them also closes COM-18 and most of LEG-17.
- **Fake struck-through prices (LEG-17).** Delete them. A frozen "-32%" on every item for months buys nothing when nobody ever paid the higher number.
- **The blog (HN-11 / LC-14).** If you will not publish, delete the route and the footer link rather than keeping an empty room with "Updated daily" in its metadata.
- **The aarti reminder bell (NOTIF-15).** Either wire it or relabel it "Saved on this device." Silence is not a lie; a false promise is.
- **WhatsApp copy (NOTIF-03).** Delete any promise of WhatsApp delivery until an entity exists.
- **The homepage proof video (CM-13).** Build the "what you receive" strip from screenshots already in the repo. **Faking a proof video with stock footage would be far worse than having none.**

---

## 5. Cost summary

**Money**

| | Amount |
|---|---|
| One CA consultation (answers both the GST *and* the entity question) | **₹2,000–₹5,000, once** |
| Everything else marked urgent | **₹0** |
| *Optional:* Render Starter, only if you refuse the free Vercel move | $14/mo (~₹1,200) |
| *Optional:* Resend Pro, only past ~50 signups/day | $20/mo (~₹1,700) |
| *Later, only if the CA says so:* GST return filing | ₹500–1,500/mo |
| *Not now:* incorporation | ₹8,000–15,000 |

**Bottom line: ₹2,000–₹5,000 clears every genuinely urgent item on this list.** One accountant's
bill. Nothing else on the critical path costs a rupee.

**Your time**

| Block | Hours |
|---|---|
| Security + getting the site back up (items 1–5) | **~2.5 hrs** |
| Legal and tax (items 6–8, incl. finding a CA) | ~3.5 hrs |
| Pricing and product decisions (items 9–10, 13) | ~1 hr |
| Content and supply (items 11–12) | ~1 hr |
| Optional polish (item 14) | ~1.5 hrs |
| **Total** | **~10 hours** |

**If you have one hour this week,** do items 1, 2 and 3: rotate the live keys, rename that `.env`
file, and find out why Render suspended you. Those three cover every risk that is either
irreversible or actively costing you customers right now. Everything else can wait a fortnight.

**If you have one more hour after that,** do items 5 and 6 — pasting one Supabase secret into Render
and naming yourself grievance officer. Ten minutes each, ₹0 each, and between them they speed up
every logged-in page and remove the easiest compliance finding anyone could ever make against you.
