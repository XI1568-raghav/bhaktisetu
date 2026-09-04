# Darshya — Client Demo Script

A 15-minute walkthrough that shows the strongest features and avoids known rough edges. Read this end-to-end once before the demo.

> **Correction 2026-09-02 (`OPS-10`).** This script was written before the 2026-07-08
> Render cutover and still sent you to a Cloudflare Pages URL. **Do not demo from
> `darshya.pages.dev`.** Cloudflare Pages stopped serving this product on 2026-07-08
> (`cf-kill-zombie.yml`); the Pages project was left in place only as a frozen
> rollback artefact, so anything still answering on `*.pages.dev` is a stale build,
> not the product. The live site is **`https://darshya.online`**, served by the Render
> Docker service `darshya-web` (`srv-d970l2ks728c738fc33g`, `region: oregon`,
> `render.yaml:52-60`). Cloudflare is DNS + edge proxy only. URLs and the Q&A answer
> below are corrected accordingly.

## URLs

- **Web (live)**: https://darshya.online — *corrected 2026-09-02 (`OPS-10`); this used to read "https://darshya.pages.dev (will be https://darshya.online once apex domain is added in Pages)". The apex is live and Pages is not the host.*
- **API**: https://api.darshya.online (used by the web; you don't show this)

## Demo accounts (all password: `demo123`)

| Email | Role | What it shows |
|---|---|---|
| devotee@demo.com | Devotee | Browse temples, book pujas, watch darshan, daily panchang |
| pandit@demo.com | Priest | Earnings, bookings, video proof workflow, payouts |
| temple@demo.com | Temple manager | Manage darshan streams, pujas, donations |
| admin@demo.com | Platform admin | User approvals, revenue dashboard, support tickets |
| store@demo.com | Store owner | Products, orders, reviews |
| astro@demo.com | Astrologer | Consultations, availability |
| wellness@demo.com | Yoga/meditation instructor | Sessions, students |
| gaushala@demo.com | Cow shelter manager | Donations, cows, volunteers |

---

## The 15-minute flow

### 0. (30 seconds) Open with the why

> "India's $58 billion devotional market is still mostly offline. Darshya is the unified app for live temple darshan, online puja booking with video proof, and spiritual content — all in one place. Eight roles live in the same platform: devotees, priests, temples, store owners, astrologers, wellness instructors, gaushalas, and admins."

### 1. (2 min) Devotee experience — the homepage flow

Open https://darshya.online in a fresh browser tab.

1. Show the homepage — saffron Darshya branding, shikhara logo
2. Click **Temples** in the nav → live data: 5 famous temples (Tirumala, Jagannath, Kashi Vishwanath, Somnath, Siddhivinayak)
3. Click **Tirumala Tirupati** → real description, daily timings, deities, live darshan toggle
4. Click **Pujas** → categories: archana, abhishekam, homas, samskaras
5. Click **Darshan** → list of streams (note: real streaming needs AWS IVS — not enabled, just metadata for now)
6. Click **Panchang** → today's tithi, nakshatra, auspicious timings

**Talking points**: "Every temple, puja, and stream you see is real data from our database. The whole catalog scales to 1000+ temples without code changes."

### 2. (3 min) Login + devotee dashboard

1. Click **Sign In** (top right)
2. Enter `devotee@demo.com` / `demo123` → Sign In
3. Land on the devotee dashboard
4. Show: bookings, recommendations, subscription status

**If you see a flash of "Page not found" before the dashboard loads** — that's the server-rendered initial HTML before the auth-aware client takes over. About 200ms. Real users won't notice. (We can fix the SSR fallback to show a spinner instead — quick post-demo cleanup.)

### 3. (3 min) Priest portal — show the priest economics

1. Sign out → sign in as `pandit@demo.com` / `demo123`
2. Land on **/priest** dashboard
3. Show:
   - Today's bookings queue
   - Earnings summary
   - Reviews from devotees
   - Payouts history
4. Click into a booking → show the **video proof upload requirement** (priest must upload puja video before payout)

**Talking points**: "Video proof is the trust layer. Devotees in NYC paying ₹5,000 for a puja in Varanasi need to *see* it actually happened. No video, no payout. This is how we beat the existing players who haven't solved trust."

### 4. (2 min) Temple portal — temple-side view

1. Sign out → `temple@demo.com` / `demo123`
2. Land on **/temple-portal**
3. Show:
   - Temple's puja offerings
   - Darshan streams managed
   - Donation summary

### 5. (2 min) Admin portal — platform health

1. Sign out → `admin@demo.com` / `demo123`
2. Land on **/admin**
3. Show:
   - User counts by role
   - **Approvals queue** (priests/astrologers waiting for verification)
   - Revenue charts
   - Support ticket inbox

### 6. (2 min) Mobile (optional — only if asked)

If client asks about mobile:

1. Open the **Expo Go** app on your phone (download from App Store/Play Store first)
2. Scan the QR code at https://expo.dev/@your-username/darshya (you need to publish to Expo first — `pnpm --filter @poojly/mobile dev` and scan the local QR)
3. Show: same login, same role-based dashboards, same data

**Honest line**: "The mobile app is feature-complete with the web. Expo Go for testing today. Production iOS/Android stores need ₹2,000 (Google) and ₹8,400/year (Apple) developer accounts — small line items when you green-light."

### 7. (1 min) Close with what's NOT in the demo

Don't hide these — surface them as "next sprint" items:

- **Real video streaming**: temple darshan shows metadata. Live IVS streaming costs ~₹15/min — turn on once we have ₹500 paying users.
- **Real payments**: booking flow stops at payment screen. Need Razorpay merchant account (KYC: 3-5 days).
- **Real OTP SMS**: signup uses email/password today. SMS OTP needs MSG91/Twilio (~₹0.20/SMS).

> "These are 1–2 day integrations once you give the go-ahead — the surfaces are wired, just need the providers."

---

## Things that will visibly fail in the demo (avoid these)

- **Don't click "Book this puja"** all the way through — stops at "Payment integration coming soon" alert.
- **Don't click "Watch live darshan"** on a stream — shows "Live streaming requires AWS IVS — view on web for now".
- **Don't try the SMS OTP signup tab** — goes through the motions but no real SMS lands.
- **First API call after 15 min idle** takes ~30s while Render free-tier wakes up. Refresh the homepage 30 seconds before the demo to warm it up.
- **A push deploys nothing at all** — both Render services are `autoDeploy: false` (`render.yaml:28` API, `:60` web), so pushing before a demo neither helps nor breaks anything; a deploy has to be dispatched by hand (`docs/runbooks/prod-rollback.md`). Still don't deploy right before a demo. *(Corrected 2026-09-02, `OPS-10`: this line used to say "Cloudflare Pages deploy takes ~3 min if you push code right before the demo.")*

---

## Pre-demo checklist (run 5 min before)

```bash
# Wake up the API
curl https://api.darshya.online/health

# Verify it returns {"status":"ok"}
# If not, refresh and wait 30s — Render is spinning up
```

Open these tabs in advance:
1. https://darshya.online (homepage)
2. https://darshya.online/auth/login (login page, ready to type)
3. Notepad / sticky note with all 8 demo emails

Have your phone unlocked with Expo Go installed if mobile comes up.

---

## Q&A cheat sheet

**Q: How does this scale?**
A: Postgres on Supabase, Fastify on Render, Next.js on Render (Docker, Next standalone), with Cloudflare in front for DNS + edge proxy. *(Corrected 2026-09-02, `OPS-10`: this answer used to say "Cloudflare Pages CDN globally", "autoscales on Pro", and "scaling to 1M is ~$200/mo". Pages has not hosted the web tier since 2026-07-08; both services are on the Render **free** plan, so nothing autoscales today; and the free tier's 750 instance-hours are **per account**, not per service — two always-on free services need ~1,488h, which is what suspended the account on 2026-08-17. The scaling headroom and the cost-to-1M-MAU figure are `[verify]`: neither is established anywhere in this repository. Do not quote them to a client.)*

**Q: Data source for temples?**
A: Curated by us today (5 seeded). Each new temple takes ~1 hour of editorial work. We have a partnership pipeline for the top 100 temples by footfall.

**Q: How are priests vetted?**
A: Aadhaar verification mandatory before payouts. Manual approval by admin. Reviews capped per booking (no astroturfing).

**Q: Commission structure?**
A: 20–40% on puja bookings, configured per temple. NRI users pay 9–10x domestic — that's where the unit economics shine.

**Q: How do you compete with ePuja, Dharmikapp, IndiaTemples?**
A: They're booking middlemen. We're a full platform with: live darshan, video proof, multi-role marketplace (priests + temples + stores), and a mobile-first build. The integrated experience is the moat.
