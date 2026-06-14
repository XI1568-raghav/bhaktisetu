# R-Q1-P-007 — Live Darshan Replay (Last 24h) — Handoff

> **Roadmap item**: R-Q1-P-007 (P3, Q1, est 12h) · **Status**: scaffold shipped, awaiting founder ops wiring
> **Predecessor spec**: `docs/product/live-darshan-replay-spec.md`
> **Successor**: R-Q2-E-002 (permanent archive + CDN + Schema.org VideoObject)

## What shipped this batch

- `/darshan/[id]/replay` route scaffold at `apps/web/app/darshan/[id]/replay/page.tsx`
- 5 prerendered temple slugs (Kashi Vishwanath, Siddhivinayak, Tirupati, ISKCON Vrindavan, Golden Temple)
- Env-or-noop pattern via `IVS_REPLAY_BUCKET_BASE`:
  - Unset → renders honest "Replay coming soon" amber panel (no fabricated recordings)
  - Set → fetches `${base}/${templeId}/last24h.json` manifest (300s revalidate)
  - Empty manifest → renders "No recordings yet" panel
  - Populated → renders cards w/ deep-link HLS Watch button
- Back-link to live darshan page
- SEO metadata + canonical alternates per slug
- Footer pointer to R-Q2-E-002 upgrade path

## Why scaffold-only (not full pipeline)

KPI per roadmap item is `replay_24h_active` (count, target 1). Hitting that requires:

1. **IVS recording enabled** on 5 temple channels — `aws ivs update-recording-configuration` requires AWS account credentials and per-temple channel ARNs that the founder owns.
2. **S3 recording bucket** with public-read on segment HLS playlists (or signed URL flow).
3. **Per-temple `last24h.json` manifest writer** — a tiny scheduled job that lists S3 objects in the last 24h window and emits the manifest the page consumes.
4. **CDN fronting** (optional Q1, mandatory Q2).

None of those are agent-shippable — they are AWS console / founder credential operations.

## Founder action required (sequenced)

1. **AWS IVS recording configuration**
   - For each of the 5 temple IVS channels, run:
     ```
     aws ivs create-recording-configuration \
       --name darshya-aarti-replay-24h \
       --destination-configuration s3={bucketName=darshya-darshan-replay}
     aws ivs update-channel --arn <channel-arn> --recording-configuration-arn <rc-arn>
     ```
   - Confirm via `aws ivs get-channel --arn <channel-arn>` that `recordingConfigurationArn` is set.

2. **S3 lifecycle**
   - `darshya-darshan-replay` bucket: lifecycle rule `expire after 1 day` on prefix `ivs/`.
   - Q2 (R-Q2-E-002) changes this to multi-tier IA + Glacier per the 5y retention plan.

3. **Manifest writer (tiny job)**
   - Lambda (or scheduled GH Action — fits free-tier) runs every 15min per temple, lists S3 objects in `ivs/<channel-id>/events/<last24h>/`, emits:
     ```json
     {
       "segments": [
         {
           "id": "evt-2026-06-14T04-30-00Z",
           "recordedAt": "2026-06-14T04:30:00Z",
           "label": "Mangala Aarti",
           "durationMin": 32,
           "hlsUrl": "https://recordings.darshya.online/ivs/.../master.m3u8"
         }
       ]
     }
     ```
   - Writes to `s3://darshya-darshan-replay/manifest/<temple-id>/last24h.json` (public-read).
   - Label classification: derive from `recordedAt` IST hour against the temple's aarti schedule in `apps/web/lib/aarti-schedules.ts`.

4. **CloudFront / Cloudflare R2 fronting**
   - Origin: S3 bucket. Custom domain: `recordings.darshya.online`.
   - HLS segments must allow CORS for the web origin.

5. **Set CF Pages env**
   - `IVS_REPLAY_BUCKET_BASE = https://recordings.darshya.online/manifest`
   - Redeploy `apps/web` (one CF Pages build).

6. **Flip KPI**
   - Visit `/darshan/kashi-vishwanath-varanasi/replay` after first aarti completes — at least one segment card should render with a working HLS Watch link.
   - On success, set `kpi.current: 1` + `status: shipped` + `shipped_at` on the roadmap item.

## What gets unblocked when KPI flips

- R-Q2-E-002 (permanent archive + CDN) can pick up the same manifest shape and extend retention.
- Schema.org `VideoObject` JSON-LD becomes meaningful (currently no recordings to schema).
- Daily-return retention lever — Sri Mandir-grade replay coverage.

## Why status stays `in_progress`

Per ship discipline: KPI requires founder ops action (AWS IVS + S3 + DNS + env). Agent shipped the consumer-side scaffold so the moment founder finishes the ops wiring, the page lights up. Status flips to `shipped` only after the manifest is live and at least one real recording renders.

## Files changed this batch

- `apps/web/app/darshan/[id]/replay/page.tsx` (new — 122 lines)
- `docs/product/R-Q1-P-007-handoff.md` (this file)

## Tests

Scaffold is server-only and behind env-or-noop guard. No unit-test surface — manual smoke via curl post-deploy:

```
curl -sI https://darshya.online/darshan/kashi-vishwanath-varanasi/replay | grep '^HTTP'
# expect: HTTP/2 200
```

## Related

- `docs/product/live-darshan-replay-spec.md` — original spec
- `apps/web/lib/aarti-schedules.ts` — IST aarti times used for label classification
- `R-Q2-E-002` — Q2 follow-on (permanent archive + CDN)
