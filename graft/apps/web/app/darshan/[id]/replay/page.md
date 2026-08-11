# apps\web\app\darshan\[id]\replay\page.tsx

Q1 scaffold page that replays the last 24 hours of auto-recorded aartis per temple from the IVS S3 bucket, deliberately rendering an honest "coming soon" panel instead of fabricated recordings when the bucket env is not wired.

- generateStaticParams · function · L10-L18 — Prebuilds replay pages at build time for the five launch-temple slugs so they are served statically while other temples render on demand.
- ReplaySegment · type · L24-L30 — Data shape for one recorded aarti segment, with hlsUrl nullable so the UI can distinguish playable recordings from still-processing ones.
- listLast24hSegments · function · L33-L50 — Fetches the temple's last-24h recording manifest from the IVS bucket, enforcing the env-or-noop rule that any missing config, bad response, or fetch failure yields an empty list rather than an error.
- generateMetadata · function · L52-L69 — Produces SEO and OpenGraph metadata for the replay page, including a canonical URL and a humanized temple name derived from the slug.
- DarshanReplayPage · function · L71-L179 — Renders the replay page with three honest states — unconfigured "coming soon", configured-but-empty, or the segment list — so users never see fake recordings.
