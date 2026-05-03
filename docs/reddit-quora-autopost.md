# Reddit / Quora auto-posting (Layer AO)

> Layer O generated drafts. Layer AO graduates **APPROVED** Reddit drafts to
> live posts via Reddit's free OAuth API. Quora has no public posting API — its
> drafts remain paste-only.

## What runs where

| Stage | Code | Trigger |
|---|---|---|
| Generate drafts (status=DRAFT) | `apps/api/src/jobs/content-seed.ts` | Daily, via master-cron |
| Admin review/approve | `apps/admin/app/content-queue/page.tsx` | Manual |
| Reddit auto-post (status=APPROVED → POSTED) | `apps/api/src/jobs/content-auto-post.ts` | Every master-cron tick (cron-job.org runs every 6h) |
| Quora paste | "Approve & copy" button → admin pastes manually | Manual |

## Reddit setup

Reddit's free **script-type** OAuth lets a single account post programmatically.
Create a `script` app at https://www.reddit.com/prefs/apps with redirect
`http://localhost` (unused for script apps). Set these env vars on the API
server:

| Var | Notes |
|---|---|
| `REDDIT_CLIENT_ID` | The 14-char string under the app name |
| `REDDIT_CLIENT_SECRET` | Click "edit" on the app to reveal |
| `REDDIT_USERNAME` | The Reddit username posting (must own the app) |
| `REDDIT_PASSWORD` | Account password. **Disable 2FA on this account** — script apps don't support TOTP. |
| `REDDIT_USER_AGENT` | Optional. Defaults to `darshya-content-bot/1.0 by /u/<username>`. Reddit ToS requires a unique UA. |

Any missing var → `submitRedditPost()` returns `{skipped:true, reason:'reddit env not configured'}`.
The cron tick logs and continues.

## Account hygiene (avoid shadowban)

Reddit moderation is automated and aggressive. Before enabling auto-post:

- **Account age**: minimum 30 days, ideally 90+. New accounts auto-posting are
  flagged within hours.
- **Comment karma**: 100+ before posting. Subreddits like r/hinduism filter
  low-karma submissions. Build karma by commenting genuinely first.
- **Verified email**: required for most subs.
- **Previous activity**: post history should show real engagement, not just
  drops. The Layer O drafts are written like a human; that won't matter if the
  posting account looks botlike.
- **One account, one persona**: don't run the same account from a residential
  IP and a Render IP simultaneously — Reddit cross-references device
  fingerprints.

## Subreddit allowlist

Hardcoded in `apps/api/src/jobs/content-auto-post.ts:REDDIT_AUTOPOST_ALLOWLIST`.
**Anything not in this set is silently skipped**, regardless of what generation
produced. Adjust by code change + review only.

| Subreddit | Why safe | Notes |
|---|---|---|
| r/hinduism | Devotional, on-topic | Read rules; some require flair |
| r/india | Broad audience for festivals/culture | Avoid politics threads |
| r/IndiaSpeaks | Engaged on culture/dharma | Slightly stricter rules |
| r/AskHinduism | Question-format works well | Don't post "how-to" guides — answer Qs |
| r/bhajan | Music/devotional content | Niche but high signal |
| r/IndianBhajans | Same niche, parallel community | |

**Never auto-post to**: NSFW subs, politics-only subs (r/politics, r/IndiaInvestments
political threads), conversion debate subs, regional subs without explicit dharma
focus. The allowlist enforces this — if generation targets one of those, the
auto-poster skips.

## Rate limits (in-process)

| Limit | Value | Where enforced |
|---|---|---|
| Posts per cron tick | 2 | `MAX_POSTS_PER_TICK` |
| Posts per subreddit per 24h | 1 | `PER_SUBREDDIT_COOLDOWN_HOURS = 24`, queries `posted_at` |
| Identical title per sub | 0 | normalised title compared against last 50 POSTED rows |

Reddit's own ToS rate limit (60 req/min/account) is well under what we hit.

## Quora gap

**Quora has no public posting API.** They explicitly closed the partner program
in 2018. Options considered:

- **Headless scraping** (Playwright login + DOM submit): violates Quora ToS
  section 4 and triggers Cloudflare bot detection within a session or two.
  Rejected.
- **Manual paste**: `/admin/content-queue` "Approve & copy" button copies the
  draft to clipboard and opens the relevant Quora topic page. Reviewer pastes,
  then clicks "Mark posted" with the URL.

Quora drafts therefore stay in **APPROVED** until manually marked POSTED. The
auto-post cron ignores them (`type = 'reddit'` filter in `loadCandidates`).

## Cron wiring

`tickContentAutoPost()` is called from `runDailyOps()` in
`apps/api/src/jobs/master-cron.ts`. Render free tier has no cron, so daily-ops
fires from cron-job.org every 6h hitting
`POST /api/v1/admin/jobs/daily-ops`. Each call → at most 2 Reddit posts → next
call 6h later → next 24h-cooldown candidate eligible.

## Manual triggers (admin)

- **Auto-post now** button on `/admin/content-queue` → `POST /api/v1/admin/content-queue/auto-post`
- **Generate batch now** → `POST /api/v1/admin/content-queue/run`
- The "Reddit auto: on/off" badge reflects whether `REDDIT_*` env is set on the
  API server.

## Testing

`apps/api/src/jobs/content-auto-post.test.ts` covers:

- subreddit name normalisation (`r/Hinduism` → `hinduism`)
- title normalisation (whitespace, casing)
- flair footer extraction from generated bodies
- allowlist contents (positive and negative cases)

Live posting is **not** covered by unit tests — it would hit the real Reddit
API. Manual verification: set `REDDIT_*` env on a staging Reddit account, click
**Auto-post now**, confirm post appears in the target sub, confirm DB row has
`status='POSTED'` + `posted_url` populated.

## Failure modes + recovery

| Symptom | Cause | Recovery |
|---|---|---|
| `{skipped:true, reason:'reddit env not configured'}` | Missing env var | Set `REDDIT_*` and redeploy |
| `reason: 'token fetch failed'` | Wrong password / 2FA enabled / app type ≠ script | Disable 2FA, re-create script app |
| `reason: 'reddit: SUBREDDIT_NOEXIST...'` | Sub deleted or name typo | Update allowlist + generation target |
| `reason: 'reddit: RATELIMIT...'` | Account hit per-sub or per-account ceiling | Wait, audit account age/karma |
| Posted body still contains `[suggested flair: X]` | `stripFlairFooter` regex regression | Fix regex, redeploy |
