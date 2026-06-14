# R-Q1-M-004 — Social accounts created with bio + pinned

> **Roadmap item**: R-Q1-M-004 (P1) · Quarter Q1 · Status: founder-action-required
> **Authored**: 2026-06-14 · **Est**: 3 hr founder time

## Why this matters

4 brand-consistent social accounts (Twitter/X + LinkedIn + Instagram + YouTube) are the minimum public surface for: (a) build-in-public credibility w/ devs + investors, (b) NRI discovery via Instagram + YouTube short-form, (c) SEO link signal from LinkedIn company page, (d) founder voice on Twitter.

## KPI

- Metric: `social_accounts_active`
- Current: 0
- Target: 4
- Source: manual (founder confirms handle live + bio + pinned)

## Founder action steps (3 hr)

1. **Account creation** (~30 min):
   - Twitter/X: claim `@bhaktisetu` (verify against existing collisions first)
   - LinkedIn: create company page `/company/bhaktisetu`
   - Instagram: claim `@bhaktisetu` (business account, switch on later)
   - YouTube: create channel `@bhaktisetu` (Google account → YouTube Studio)

2. **Brand asset paste** (~45 min) — assets in `docs/marketing/social-accounts-setup-runbook.md`:
   - Logo 400x400 PNG (saffron + indigo)
   - Cover 1500x500 PNG (temple silhouette + tagline)
   - Founder photo 800x800

3. **Bio paste** (~30 min) — use exact strings from runbook table

4. **Pinned post per platform** (~75 min):
   - **Twitter**: build-in-public Day-1 tweet — see template below
   - **LinkedIn**: long-form founder intro post — see template below
   - **Instagram**: 4-slide "Why Bhaktisetu" carousel — see template below
   - **YouTube**: 60-sec demo video upload + pinned as channel trailer — see template below

5. **Cross-link verification** (~30 min):
   - All 4 socials link to https://bhaktisetu.com/about
   - bhaktisetu.com/about lists all 4 handles
   - LinkedIn ↔ Twitter cross-follow

## Pinned post templates

### Twitter/X pinned

```
Building Bhaktisetu — a devotional super-app for India + diaspora.

🛕 Verified temples only (zero scams)
📹 Video proof of every puja
🇮🇳 India ₹ + 🇺🇸 NRI $ dual lane
💰 80G receipts auto-issued
🪔 Built solo, $0 burn, in public

Follow for daily build updates.
```

(280 char ceiling. Drop one bullet if over.)

### LinkedIn pinned (long-form)

```
I'm building Bhaktisetu — a verified-temple devotional platform connecting 1B+ Hindus across India + diaspora.

The problem: NRIs in US/UK/CA send money to Indian temples [FOUNDER-VERIFY: source for any public $ figure] but have zero proof their puja actually happened. Existing apps (Sri Mandir, Utsav) have temple-discovery but no video proof + no 80G + no dispute resolution.

What we ship:
• Only verified temples (manual KYC, no aggregator marketplace)
• Mandatory video proof for every booking (priest payout gated on upload)
• Dual currency — INR for India, USD for NRI (9-10× pricing tier)
• Auto 80G receipts (tax-deductible donations)
• 24h cancellation window, transparent dispute flow

Built solo, $0 outside capital — VERIFY against any signed SAFE/convertible. Open about all numbers, mistakes, MRR.

If you're an NRI Hindu, a temple priest, or a dharma-curious dev — would love to connect.

Follow for weekly progress updates 🪔
```

### Instagram pinned (4-slide carousel)

```
Slide 1 — Hook
"Your puja, your proof. 🛕📹"
Saffron bg, ॐ glyph centered

Slide 2 — Problem
"NRI-to-India temple sends — zero proof their puja happened." [FOUNDER-VERIFY: source for any public $ figure before adding to slide]

Slide 3 — Solution
"Verified temples. Video proof. 80G receipts. INR + USD."

Slide 4 — CTA
"Book your first puja → bhaktisetu.com
Following for daily build-in-public 🪔"
```

### YouTube pinned (channel trailer, 60 sec)

```
0-5s   Hook — "I built a devotional app where every puja has video proof."
5-15s  Problem — split-screen: NRI in NYC + temple priest in Varanasi, no connection
15-30s Demo — actual booking flow, video proof upload, devotee receiving video
30-45s Why-now — diaspora growth, NRI giving, 80G tax savings
45-60s CTA — "Subscribe + book first puja at bhaktisetu.com 🪔"
```

## Verification checklist (post-creation)

- [ ] Twitter @bhaktisetu live + bio + pinned tweet + saffron logo
- [ ] LinkedIn /company/bhaktisetu live + bio + pinned post + cover
- [ ] Instagram @bhaktisetu live (business account) + bio + pinned carousel
- [ ] YouTube @bhaktisetu live + channel art + trailer pinned
- [ ] All 4 link to bhaktisetu.com/about
- [ ] bhaktisetu.com/about lists all 4 handles
- [ ] Update item frontmatter: `current: 4`, `status: shipped`, `shipped_at: <ISO>`, `verified_at: <ISO>`

## Related artifacts

- `docs/marketing/social-accounts-setup-runbook.md` — full asset spec + brand colors
- `docs/marketing/buffer-21-social-posts-schedule.md` — first 3 weeks of content
- `docs/marketing/founder-twitter-100-followers-spec.md` — Twitter growth playbook
- `docs/marketing/build-in-public-twitter-pack-v1.md` — recurring tweet templates
- `docs/marketing/youtube-channel-q2-spec.md` — YouTube content plan

## Tracking after launch

- Weekly: log follower count per platform in `docs/marketing/social-growth-tracker.md` (founder appends)
- First milestone trigger: 100 followers per platform → unblocks ad spend doc
- First content milestone: 7 posts per platform in week 1 (use Buffer schedule)

## Founder dependency

This item CANNOT be agent-shipped — handle claims + bio paste + photo upload require founder credentials on each platform. Agent ships the spec + handoff (this doc). Status stays `in_progress` until founder confirms all 4 live + KPI flips 0→4.

## Cross-platform availability check (per triage 2026-06-15)

Founder run `https://namechk.com/?q=bhaktisetu` before publishing handles to confirm `@bhaktisetu` is available across Twitter / Instagram / YouTube / LinkedIn / TikTok / GitHub. If any taken, fall back to `@bhaktisetu_app` or `@bhaktisetu.in` (consistent across all platforms, not mixed).
