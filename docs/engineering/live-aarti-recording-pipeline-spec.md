# Live Aarti Recording Pipeline — IVS Rec → S3 → CDN Replay

> **Roadmap item**: R-Q2-E-002 (P0) · **Authored**: 2026-06-13

## Goal

Capture live aarti streams via AWS IVS recording, store in S3, serve via CloudFront CDN for replay. Targets recorded library of 50+ aartis Q2.

## Architecture

```
Temple IVS live channel → IVS recording config
  → S3 bucket: s3://bhaktisetu-aarti-recordings/
  → HLS playlist (.m3u8) + segments (.ts)
  → CloudFront CDN distribution
  → /aarti/recorded/{slug}/{date} replay page
```

## IVS recording config

```typescript
// scripts/setup-ivs-recording.ts
import { IvsClient, CreateRecordingConfigurationCommand } from '@aws-sdk/client-ivs'

const ivs = new IvsClient({ region: 'ap-south-1' })

await ivs.send(new CreateRecordingConfigurationCommand({
  name: 'bhaktisetu-aarti-recording',
  destinationConfiguration: {
    s3: { bucketName: 'bhaktisetu-aarti-recordings' }
  },
  thumbnailConfiguration: {
    recordingMode: 'INTERVAL',
    targetIntervalSeconds: 60,
  },
  recordingReconnectWindowSeconds: 60,
}))
```

Attach to each temple IVS channel via `UpdateChannel` w/ `recordingConfigurationArn`.

## S3 lifecycle

- Standard tier first 30 days (active replay)
- Glacier Instant Retrieval 30-90 days (rare replay)
- Glacier Deep Archive 90+ days (annual archive)
- Auto-delete after 5 years (cost control)

## CDN serve

CloudFront distribution:
- Origin: S3 bucket
- Cache: 7-day TTL on .m3u8 + .ts files
- Custom domain: cdn-aarti.bhaktisetu.com
- HTTPS-only

## Replay UI

`apps/web/app/aarti/recorded/[slug]/[date]/page.tsx`:

- HLS player (HLS.js for non-Safari)
- Title: "{slug} aarti — {date} {time IST}"
- Schema.org VideoObject JSON-LD
- Share buttons (WhatsApp + download for offline)

## Indexing

- Daily cron: scan S3 → DB row per new recording (temple_id + date + duration + thumbnail)
- /aarti/recorded index page lists all recordings sorted by date desc
- /aarti/recorded/{slug} per-temple page

## Cost

- IVS recording: $0.01/min (free tier 5hr/mo)
- S3 storage: $0.023/GB/mo (Standard) → drop to $0.004 (Glacier)
- CloudFront: $0.085/GB out (India edge)
- Est Q2 cost: ₹500/mo at 50 aartis (~150GB)

## Engineering tickets

- R-Q2-E-002a: IVS recording config + S3 setup
- R-Q2-E-002b: CloudFront distribution
- R-Q2-E-002c: Replay player + UI
- R-Q2-E-002d: Daily indexing cron

## Closes

R-Q2-E-002 — spec shipped.
