# Content marketing — Reddit & Quora seed automation

> Layer O of the GTM plan. Free organic traffic via genuine value-add posts in
> r/hinduism, r/india, r/AskHinduism, and Quora "Hindu Rituals" / "Puja"
> topics. **Never auto-posts.** Every draft passes through human approval.

## Overview

```
Daily cron tick
   ├── tickContentSeed() (apps/api/src/jobs/content-seed.ts)
   │     ├── 2 × generateRedditPost (Groq llama-3.3-70b)
   │     └── 2 × generateQuoraAnswer
   │           └── INSERT INTO content_drafts (status='DRAFT', ...)
   │
   └── runDailyOps() emits contentSeed: { redditOk, quoraOk, ... }

Admin opens /content-queue (admin app, port 3001)
   ├── Reads DRAFT items
   ├── Edits inline (title + body)
   ├── "Approve & copy" → status=APPROVED, body in clipboard
   ├── Manually pastes into Reddit / Quora
   └── "Mark posted (with URL)" → status=POSTED
```

## Files

| File | Role |
| --- | --- |
| `apps/api/src/services/content-draft.service.ts` | Groq-backed draft generators + raw-SQL persistence (auto-creates `content_drafts` table on first call). |
| `apps/api/src/jobs/content-seed.ts` | Daily-gated tick. Picks 2 Reddit + 2 Quora topics from a 30-topic pool by day-of-year, generates, inserts as DRAFT. |
| `apps/api/src/jobs/master-cron.ts` | Wires `tickContentSeed()` into `runDailyOps()`. |
| `apps/api/src/routes/admin-content-queue.ts` | Admin REST endpoints (list / update / run / generate). |
| `apps/admin/app/content-queue/page.tsx` | Review queue UI. |
| `apps/api/prisma/schema.prisma` (`ContentDraft`) + `prisma/migrations/20260502_content_drafts/` | Schema + migration. |

## Env vars

- `GROQ_API_KEY` — required. Without it, generation no-ops cleanly (returns `{skipped: true}`).
- `ADMIN_API_BEARER` — admin app talks to API with this. Falls back to `demo-admin` in dev.

## Cadence

The cron tick is daily-gated in-process: `runContentSeed()` runs at most once per UTC day. The actual schedule depends on whatever external pinger hits `/api/v1/admin/cron/tick` (UptimeRobot / cron-job.org / GitHub Actions).

Recommended human review cadence: **once a day, ~15 min**. Approve at most:

- 2-3 Reddit posts per week (one per subreddit per week — Reddit's spam filters are unforgiving).
- 1-2 Quora answers per day (Quora is more permissive but quality > quantity).

## Tone guidelines

The generator's system prompt enforces these. Re-read whenever editing:

- First person, casual but respectful. **No corporate language.** No "Hi everyone! Let me share…"
- Cite scripture by reference (Bhagavad Gita 2:47, not "the Gita says somewhere").
- Sales pitch is **forbidden** in the body. The model is permitted **one** mention of `darshya.online` in the *last paragraph* — only if it adds genuine value (e.g. "you can watch live darshan from these temples free at darshya.online"). Strip it if it feels forced.
- No emojis. (`Pandit Ji` system prompt elsewhere also bans emojis — same rule.)
- Length: Reddit 200-400 words, Quora 300-600 words.

## Banned topics

The model is instructed to avoid these — strip if any leak through:

- Politics (Hindu vs. Muslim, BJP vs. Congress, anything election-adjacent).
- Conversion debates (Hindu→other, other→Hindu).
- Caste arguments (the second a post cites varna/jati hierarchy, reject).
- Sectarian disputes (Shaiva vs. Vaishnava, North vs. South).
- Anything that could be read as gendered prescription ("women shouldn't…").
- Medical, legal, or financial advice — redirect to professionals.

## Workflow

1. **Wait for the daily tick.** Check `/content-queue` (admin app) — DRAFT tab.
2. **Read the post end-to-end.** If anything triggers the banned-topics list, click **Reject** with a short reason.
3. **Edit inline** if the post is mostly good but needs trimming, factual correction, or removing a forced CTA.
4. **Approve & copy** — the body lands in your clipboard with a flash showing the target subreddit / topic.
5. **Open the target site** (button next to "Approve & copy" goes straight to `reddit.com/r/<sub>/submit` or the Quora topic page).
6. **Paste, post.**
7. Come back to the **APPROVED** tab → **Mark posted (with URL)** so the dashboard reflects what's live.

## Manual generation

`POST /api/v1/admin/content-queue/run` triggers another batch immediately (bypasses the daily gate). The "Generate batch now" button on the admin page calls this.

For ad-hoc one-off drafts (specific topic, specific subreddit), call `POST /api/v1/admin/content-queue/generate` with `{ type, topic, target }` — useful for festival-day content.

## 30-topic pool

Defined in `apps/api/src/services/content-draft.service.ts` as `TOPIC_POOL`. Edit there to rotate seasonal content. The cron picks 2 topics by day-of-year, so changes to the pool propagate automatically the next day.

## What success looks like

- 1 high-quality Reddit thread per week → 100-500 organic visitors over the next 30 days (Reddit's long tail).
- 5 Quora answers per week → 50-200 visitors per answer over 90 days.
- No bans, no flair removals, no shadowbans.

If a post gets removed, mark it **REJECTED** with the reason — that's a signal to tighten the prompt.
