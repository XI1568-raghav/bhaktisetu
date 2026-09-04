# R-Q3-CS-002 — Multilingual self-serve help center (handoff)

**Status**: scaffold shipped, content authoring deferred to content sub-agent cycle.
**Spec**: `docs/roadmap/items/Q3/cs/002-multilingual-self-serve-help-center-en-hi-ta-te-bn.md`
**Target**: 50 articles × 6 languages (en / hi / ta / te / bn / mr) = **300 articles**.
**Est hours**: 40 (engineering scaffold shipped in <20 min; remaining ≈ 35h content authoring).

> **Correction 2026-09-02 (`OPS-10`).** Two claims below were wrong.
>
> **1 — Payments topics.** The "Payments & Refunds" row of the topic table used to read
> *"Razorpay vs Stripe · UPI / cards / NRI methods · Refund timelines · Failed
> transactions · Dual currency · GST invoice · Foreign exchange · Disputes"*. **Stripe
> was removed from the codebase on 2026-08-11** (`apps/api/src/lib/env.ts:45-46`,
> `services/payment.service.ts:2506-2517`). Razorpay is the only live rail and it
> settles INR only — `apps/api/src/routes/bookings.ts:2283` is an unconditional
> `const currency = 'INR'`, and the `'USD'` enum member at `:933` is, per its own
> comment, an analytics hint that "never changes the amount and never changes the
> gateway currency". No replacement international processor has been chosen. So
> "Razorpay vs Stripe" is now "Razorpay payment methods", and "Dual currency" and
> "Foreign exchange" are marked `[verify]`: there is no second currency to compare and
> no FX spread to explain. These are not internal notes — this table is the
> commissioning brief for **public, SEO-indexed help articles in six languages**, and
> an article titled "Razorpay vs Stripe" would tell a devotee, in writing and on our
> own domain, that they can pay by a rail we deleted. The slot count stays at 8 so the
> `12 + 8 + 8 + 8 + 8 + 6 = 50` arithmetic and the 300-article total still hold.
>
> **2 — Edge runtime.** Item 3 of "What shipped" used to claim the article reader runs
> on *"Edge runtime, revalidate 86400"*. It does not, and did not: the shipped file
> `apps/web/app/help/articles/[lang]/[slug]/page.tsx:15-21` carries an explicit
> *"no `runtime = 'edge'` here"* comment and notes that edge runtime is "removed
> app-wide". `revalidate = 86400` is real; the edge half is struck. The web tier has
> been the Render Docker service `darshya-web` since the 2026-07-08 cutover, with
> Cloudflare as DNS and edge proxy only, so the edge-runtime constraint this line came
> from no longer applies to anything.

## What shipped in this PR

1. **`apps/web/lib/help-articles.ts`** — typed registry of help articles.
 - `HelpArticle` interface: `slug`, `lang`, `category`, `title`, `summary` (30-80 words for rich-snippet eligibility), `body` (markdown), `updatedAt`.
 - 6 categories: puja-bookings / live-darshan / store-orders / payments-refunds / account-profile / general.
 - 6 languages declared: `en`, `hi`, `ta`, `te`, `bn`, `mr` (each with native script label).
 - Selectors: `getHelpArticle`, `getHelpArticlesByLang`, `getHelpArticlesByCategory`, `getHelpArticleCount`.
2. **6 seed articles** — "How do I book a puja?" translated into all 6 languages. Validates the schema across Latin, Devanagari, Tamil, Telugu, Bengali, and Marathi scripts.
3. **`apps/web/app/help/articles/[lang]/[slug]/page.tsx`** — dynamic article reader.
 - Node runtime (default), revalidate 86400.
 - `generateStaticParams` fans out all `(lang, slug)` pairs.
 - Per-article Article + BreadcrumbList JSON-LD.
 - `alternates.languages` populated when translations exist — proper hreflang for SEO.
 - "Read in another language" footer pill row links to every translation.
 - Minimal MD renderer (no external dep): h1/h2 + ul/ol + bold + links + paragraphs.
4. **Static SEO surface live now**: 6 article URLs indexable (one per language). All cross-linked.

## What's still missing (founder-action-required)

### 1. Author remaining 294 articles

The 50-article corpus per language should cover the highest-volume support tickets. Recommended topic split:

| Category | Article count | Topics (English titles) |
|---|---:|---|
| Puja Bookings | 12 | How to book a puja · Rescheduling · Cancellation policy · Video proof · Sankalp form · Prasad delivery · Gift puja for NRIs · Booking ID format · 80G receipt · Pandit selection · Multiple intents · Bulk bookings |
| Live Darshan | 8 | How to watch · Temple timings · Stream buffering · Recording access · Mobile playback · Multi-camera angles · Audio language · Time-zone conversion |
| Store & Orders | 8 | Order tracking · Delivery times · Authenticity guarantee · Returns · Damaged items · International shipping · COD availability · Cancellation |
| Payments & Refunds | 8 | Razorpay payment methods · UPI / cards / NRI methods · Refund timelines · Failed transactions · Dual currency [verify — Stripe was removed; the NRI rail is undecided] · GST invoice · Foreign exchange [verify — no FX conversion is applied; the gateway currency is an unconditional INR] · Disputes |
| Account & Profile | 8 | Sign-up · Login issues · Password reset · Email change · Delete account · Devotee vs pandit accounts · Aadhaar verification · Profile privacy |
| General | 6 | About Darshya · Contact · Mobile app · Languages · Accessibility · Press kit |

**Total: 50 × 6 langs = 300.**

### 2. Author workflow

For each new article:
1. Append a `HelpArticle` entry to `HELP_ARTICLES` in `apps/web/lib/help-articles.ts`.
2. Keep `slug` identical across all 6 language translations so alternates wire correctly.
3. Summary: **30-80 words** (Google rich-snippet sweet spot).
4. Body: markdown — `## headings`, `1. ordered`, `- unordered`, `**bold**`, `[links](/url)`.

### 3. Translation sourcing

Per CLAUDE.md: solo founder + $0 budget. Three viable paths:

| Path | Cost | Quality | Speed |
|---|---|---|---|
| **A.** Hand-author EN, machine-translate via Claude API (existing `@anthropic-ai/sdk` integration) | $0 (free tier) | Good with translator persona prompt + glossary | Fast (~10 min/article × 50 = 8h) |
| **B.** Hand-author EN, hire community translators via supply onboarding agents | $0-low | Best (native cultural nuance) | Slow (depends on volunteer turnaround) |
| **C.** Hand-author EN, defer non-EN until U12+ activation | $0 | EN-only at first | Fastest to ship 50 EN articles (~5h) |

**Recommended: A** — script `scripts/content/translate-help-articles.mjs` calls Claude with: source EN article + glossary of devotional/payment terms + target language. Output appended to `HELP_ARTICLES`. Validator checks all 6 langs present per slug.

### 4. Index page surfacing

Current `/help/page.tsx` is static and lists categories only. Once article count grows past ~20, regenerate it to consume `HELP_ARTICLES`:

```ts
import { HELP_ARTICLES, HELP_LANGS } from "../../lib/help-articles";
// then group by category, render with article counts per language
```

Also add the per-language landing pages: `/help/en`, `/help/hi`, `/help/ta`, etc. — each lists that language's full article set grouped by category.

### 5. Sitemap fan-out

In `apps/web/app/sitemap.ts`:

```ts
import { HELP_ARTICLES } from "../lib/help-articles";
// ...
...HELP_ARTICLES.map((a) => ({
 url: `https://darshya.online/help/articles/${a.lang}/${a.slug}`,
 lastModified: new Date(a.updatedAt),
 changeFrequency: "monthly" as const,
 priority: 0.7,
})),
```

### 6. KPI wiring

The roadmap KPI is `help_articles_published`. After full ship, wire it in `_manual-kpis.yml`:

```yaml
last_updated: "2026-MM-DD"
values:
 help_articles_published: 300
```

The KPI scraper at `scripts/agents/roadmap/_kpi-supabase.mjs` can also read article count directly from the registry by importing `getHelpArticleCount` — no manual upkeep needed.

## Validation

```bash
pnpm -C apps/web tsc --noEmit
pnpm -C apps/web next build
curl -s -o /dev/null -w "%{http_code}" https://darshya.online/help/articles/en/how-to-book-a-puja  # expect 200 post-deploy
curl -s -o /dev/null -w "%{http_code}" https://darshya.online/help/articles/hi/how-to-book-a-puja  # expect 200
```

## Why this PR is marked `founder-action-required`

The roadmap spec was bulk-imported with `TBD-populate-before-orchestrator-go-live` placeholders. Founder needs to:
1. Approve the 50-topic split above (or revise).
2. Pick translation path A / B / C.
3. Author the EN source corpus or assign to content sub-agent.

Scaffold lands now; content backfills incrementally without further engineering work.
