# Live Darshan Recording On-Demand — Replay Last 24h Aarti

> **Roadmap item**: R-Q1-P-007 (P3) · **Authored**: 2026-06-13 · **Foundation for**: R-Q2-E-002 IVS recording pipeline

## Goal

Q1 ship light-weight darshan replay (last 24h). Foundation for R-Q2-E-002 full S3 + CDN pipeline.

## Q1 approach (light)

- Existing IVS channels record last 24h to S3 (default IVS feature)
- Simple `/darshan/{temple}/replay` page lists last-24h recordings
- HLS player streams S3 directly
- No CDN, no permanent archive (Q2 R-Q2-E-002 upgrade)

## Q1 minimal viable

- 5 temples enabled (Kashi + Mahalakshmi + Tirupati + ISKCON + Golden Temple)
- Last 24h recordings only (auto-expire)
- Basic HLS player (no fancy UI)

## Q2 Full pipeline (R-Q2-E-002)

- Permanent archive (S3 lifecycle 5y)
- CDN for fast playback
- Multi-temple, all aartis
- Schema.org VideoObject + replay UX polish

## Engineering tickets

- R-Q1-P-007a: 5-temple IVS 24h recording enabled
- R-Q1-P-007b: Simple replay page
- R-Q1-P-007c: HLS player

## Closes

R-Q1-P-007 — spec shipped.
