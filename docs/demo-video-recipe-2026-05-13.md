# Demo video recipe — Darshya golden path MP4

> Produces a single ~90-120 sec MP4 walkthrough of the live product. Used for KYC reviewers (Razorpay, Stripe), WhatsApp Meta business verification, Reddit organic posts, and investor cold outreach. Auto-runs against prod (`darshya.online`) by default — point at `localhost:3000` for dev runs.

## Why this exists

KYC reviewers and Meta business-verify reject "screenshots only" submissions. Razorpay specifically flags accounts that submit a deck instead of a working product. Investors skim — a 90-sec MP4 lands harder than a Loom link they have to click. This recipe gives you a single repeatable command that always produces the same artifact, so the video can be regenerated whenever the UI changes.

## What it produces

- `docs/demo-video/darshya-demo-YYYYMMDD.mp4` — H.264 1920×1080, silent AAC track for upload-portal compatibility, faststart-optimized for browser preview
- `docs/demo-video/darshya-demo-YYYYMMDD-poster.jpg` — keyframe at t=8s for Twitter/LinkedIn embed cards
- `apps/web/demo-keyframes/*.png` — 16 PNG snapshots if you need stills for other contexts

## Coverage (single browser session, no auth)

| # | Step | Why it matters to reviewer |
|---|---|---|
| 1-2 | Home hero + scroll | Real product, not a landing-page-only scam site |
| 3-4 | Temple browse → temple detail | Actual data, schema.org JSON-LD visible |
| 5-7 | Pujas list → puja detail → booking form | Booking funnel exists end-to-end |
| 8 | Live darshan page | IVS streaming infra wired |
| 9-10 | Astrology + AI Pandit chat | AI integration demonstrable |
| 11 | Gau Seva (80G donations) | Compliance-grade donation flow |
| 12-14 | NRI Premium landing (hero / comparison / FAQ) | Stripe/USD checkout target — primary KYC justification |
| 15 | Upgrade tiers | Subscription pricing transparency |
| 16 | Home tail | Clean fade-out frame |

## One-time setup

```bash
# 1. ffmpeg
choco install ffmpeg                       # Windows (admin PS)
# or download static build: https://www.gyan.dev/ffmpeg/builds/
brew install ffmpeg                        # macOS
sudo apt-get install -y ffmpeg             # Debian/Ubuntu

# 2. Playwright Chromium binary (one-time, ~150MB)
cd E:/NewClaude/bhaktisetu
pnpm --filter @poojly/web exec playwright install chromium
```

## Build the video

```bash
# Default — captures prod (darshya.online)
cd E:/NewClaude/bhaktisetu
bash scripts/build-demo-video.sh

# Against local dev server (after `pnpm dev`)
DEMO_BASE_URL=http://localhost:3000 bash scripts/build-demo-video.sh
```

Run-time: ~3-4 min total (90-120s capture + ~30s transcode + 1s poster).

## Distribution checklist

After build:

1. **Razorpay KYC** — Dashboard → Account Settings → Activation → "Product/Service Details" → upload MP4 as proof
2. **Stripe NRI KYC** — Stripe Dashboard → Activate Account → "Tell us about your business" → "How does your business work?" → upload MP4
3. **WhatsApp Meta business verify** — Meta Business Suite → Settings → Business Info → "Add documents" → upload MP4 + poster JPG
4. **Reddit organic** — Upload MP4 directly to v.redd.it (don't use YouTube link — Reddit deboost). Subreddits: r/india, r/IndianStreetBets (NRI angle), r/Hinduism, r/IndiansAbroad
5. **Investor cold email** — Embed poster JPG inline + Google Drive MP4 link. Subject line: "Built a live devotional super-app on $0/mo — 90sec demo"
6. **Twitter/LinkedIn** — Native upload (10 MB max for Twitter; LinkedIn allows up to 5 GB). Use poster as thumbnail.

## When to regenerate

Regenerate after any of:
- Hero copy or above-the-fold UI change on home, /nri, /upgrade
- New top-level page added that should appear in the funnel
- Pricing tier change on /upgrade or /nri
- Brand color change (Tailwind tokens)

Stale demo video is worse than no demo video — reviewers cross-reference current site against video and reject mismatches.

## Troubleshooting

**`pnpm: not found`** — Install pnpm: `npm install -g pnpm`

**Playwright timeout on `/temples` click** — Live site is on free Render tier and may cold-start. Re-run; second run is warm.

**MP4 too large for upload portal** — Add `-crf 28` (was 22) to `ffmpeg` line in `scripts/build-demo-video.sh` to drop ~40% file size at modest quality cost. Or trim duration in the spec by removing steps 8/11 (less critical for KYC).

**Video has no audio when uploaded** — Intentional. Spec injects silent stereo AAC because some upload portals (LinkedIn, Stripe) reject pure-video files. If you want narration, use Loom on top of the MP4 instead.

**`Error: locator.click: Target closed` on /pujas page** — Catalogue may be empty in dev. Run against prod instead (`DEMO_BASE_URL=https://darshya.online`, the default).

## Related

- `apps/web/e2e/capture-pitch.spec.ts` — 12 separate keyframe captures for `/pitch` interactive deck (different purpose, don't conflate)
- `docs/cf-pages-env-wiring-2026-05-13.md` — observability runbook
- `docs/security-rotation-2026-05-13.md` — credential rotation runbook
