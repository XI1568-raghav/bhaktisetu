# apps\web\app\darshan\[id]\page.tsx

Temple live-darshan detail page module that resolves a URL slug to a real stream (API or static fallback library) and deliberately renders an honest "Coming soon" panel for unknown slugs instead of 404-ing or silently substituting another temple's content.

- generateStaticParams · function · L7-L21 — Preregisters known temple slugs for prerendering, including browse-page-linked temples with no live stream yet, so those URLs resolve to a 200 "Coming soon" page rather than a 404 on Cloudflare.
- formatTime12h · function · L53-L59 — Converts 24-hour aarti schedule times into 12-hour AM/PM display format for the schedule UI.
- classifySlot · function · L61-L65 — Labels each aarti slot as live, completed, or upcoming by comparing the current IST minute against the slot's start and duration window.
- ytEmbed · function · L72-L74 — Builds the YouTube live_stream embed URL for a temple's official channel ID.
- resolveLivePlaybackUrl · function · L108-L128 — Probes a temple channel's public YouTube RSS feed to prefer a currently-live broadcast (detected by live-ish title keywords) or fall back to the latest VOD, avoiding a broken embed when nothing is streaming.
- getStreamById · function · L372-L392 — Resolves a stream by either stream id or temple slug from the live/scheduled APIs, degrading to the static fallback library when the API is down, and returning null for genuinely unknown slugs so the page can show the honest "Coming soon" panel.
- humanizeSlug · function · L394-L399 — Turns a URL slug into a title-cased temple name for display on the "Coming soon" panel and metadata.
- getRelatedStreams · function · L401-L410 — Fetches up to four other currently-live streams to recommend, returning an empty list if the API is unavailable.
- generateMetadata · function · L414-L449 — Emits SEO/OpenGraph metadata for a known temple stream, or a noindex "Coming Soon" metadata variant for unknown slugs so placeholder pages stay out of search results.
- DarshanDetailPage · function · L453-L942 — Renders the darshan detail page, short-circuiting unknown slugs to a "Coming soon" panel with links to currently-streaming temples instead of misattributing another temple's stream.
