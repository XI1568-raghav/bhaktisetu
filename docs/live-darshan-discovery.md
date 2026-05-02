# Live Darshan YouTube Discovery

Auto-discovery cron that polls curated temple YouTube channels for live broadcasts and updates `live_darshan_streams.playback_url` in real time. Replaces hard-coded YouTube URLs that go stale within hours when a temple ends its daily broadcast.

## How it works

1. A curated list of temple YouTube channels lives in `apps/api/src/jobs/youtube-discovery.ts` (`TEMPLE_CHANNELS`). Each row maps a `temples.slug` to its canonical `UC…` YouTube channel ID.
2. Every master-cron tick, `tickYoutubeDiscovery()` calls `maybeRunYoutubeDiscovery()`. An in-process timestamp gate caps actual execution to once every 30 minutes (Render runs a single API instance, so module-level state is sufficient).
3. For each channel, the job calls `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=<id>&eventType=live&type=video&key=<YOUTUBE_API_KEY>`.
4. If a live video is found, the corresponding `live_darshan_streams` row is updated to `status=live`, `streamProvider=YOUTUBE`, `playbackUrl=https://www.youtube.com/watch?v=<id>`, `youtubeVideoId`, `youtubeChannelId`. If nothing live is returned, the row is flipped to `offline`.
5. Writes are idempotent — the job compares current DB state and only issues an `UPDATE` when something actually changed, so re-running back-to-back produces zero writes.

## API quota math

YouTube Data API v3 free tier: **10,000 units/day**.
`search.list` cost: **100 units per call**.

| Knob | Value |
|---|---|
| Channels polled | 5 |
| Tick cadence | 30 minutes |
| Ticks per day | 48 |
| Calls per day | 5 × 48 = **240** |
| Units per day | 240 × 100 = **24,000** |

24,000 units exceeds the 10,000 unit/day free quota by 2.4x. The 30-minute floor is the **lowest** safe cadence at 5 channels; in practice we expect ops to either:

- Reduce the channel list (3 channels × 48 polls × 100 = 14,400 still over; **2 channels = 9,600 fits**), or
- Apply for a YouTube API quota raise (Google grants 1M units/day routinely on request), or
- Stretch cadence to 60 minutes (5 × 24 × 100 = 12,000, still slightly over — 90 min = 8,000 fits).

The current code ships with 5 curated channels at 30-min cadence as the documented target. Ship-day ops MUST either trim the list or request quota — see `MIN_INTERVAL_MS` in `youtube-discovery.ts` to lengthen the gate.

## Adding a new channel

1. Find the temple's official YouTube channel.
2. Resolve the `@handle` to its canonical `UC…` channel ID (e.g. via https://commentpicker.com/youtube-channel-id.php or `youtube/v3/channels?forUsername=…`).
3. Confirm the temple already exists in `temples.slug` (see `apps/api/prisma/seed.ts`).
4. Append to `TEMPLE_CHANNELS` in `apps/api/src/jobs/youtube-discovery.ts`:
   ```ts
   { templeSlug: '<existing-slug>', channelId: 'UC…', templeName: '<display name>' },
   ```
5. Recompute quota (see table above). Update `MIN_INTERVAL_MS` if the new total exceeds the daily ceiling.

If the temple has no `live_darshan_streams` row yet, seed one — the job logs `no-stream-row` and skips cleanly otherwise.

## Manual trigger

For ad-hoc refresh between scheduled polls (e.g. a temple just went live):

```bash
curl "https://api.darshya.online/api/v1/admin/cron/youtube-discovery?token=$CRON_AUTH_TOKEN"
```

Returns `{ ok: true, result: { ranAt, channels: [...], liveCount, offlineCount, errorCount } }`. Bypasses the 30-min in-process gate, but every call still costs 100 units × N channels — use sparingly.

## Monitoring

- The route returns per-channel status: `live | offline | error | no-temple | no-stream-row`. `error` entries include the upstream YouTube error string. Capture in Sentry by checking `errorCount > 0` from the master-cron tick output.
- Quota exhaustion surfaces as `403 quotaExceeded` from YouTube — the per-channel `error` field will contain it. When seen, lengthen `MIN_INTERVAL_MS` or trim `TEMPLE_CHANNELS`.
- Stale-URL canary: pick one channel, `SELECT status, updated_at FROM live_darshan_streams WHERE temple_id IN (SELECT id FROM temples WHERE slug = '<slug>')`. If `updated_at` is older than 31 minutes during expected darshan hours, the cron isn't running.

## Graceful degradation

- `YOUTUBE_API_KEY` unset (or `demo-key`) → `discoverLiveStreams()` returns `{ skipped: true, reason: 'no api key' }` without DB writes.
- Temple slug missing → channel result `no-temple`, no DB write, run continues.
- No `live_darshan_streams` row → channel result `no-stream-row`, no DB write.
- YouTube 4xx/5xx for a single channel → that channel returns `error`, others continue.
- All exceptions inside `tickYoutubeDiscovery()` are caught and surfaced as `{ skipped: true, reason }` so the rest of the daily-ops tick is unaffected.
