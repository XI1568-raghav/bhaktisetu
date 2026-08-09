# scripts\agents\uptime-pinger.mjs

- ping · function · L30-L44 — Fetches one target with a 10-second hard timeout and records its HTTP status and round-trip latency, treating network failures as status 0.
- classify · function · L46-L52 — Maps a probe result to an availability bucket: network failure or 5xx is DOWN, 4xx is ERROR, latency over 3s is SLOW, otherwise OK.
- main · function · L54-L108 — Serially probes all targets with a polite 200ms gap, buckets results by severity, and renders a markdown report highlighting surfaces needing action.
