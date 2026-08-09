# apps\api\scripts\leads\canada-pandit-prospector.mjs

- sleep · function · L80-L82 — function sleep(ms)
- rateLimit · function · L90-L92 — async function rateLimit({ sleepImpl = sleep, ms = RATE_LIMIT_MS } = {})
- checkRobotsAllowed · function · L94-L108 — async function checkRobotsAllowed(targetUrl, { fetchImpl = fetch } = {})
- dedupRows · function · L110-L120 — function dedupRows(rows)
- toCsv · function · L122-L132 — function toCsv(rows)
- esc · function · L124-L127 — esc = (v)
- main · function · L136-L191 — async function main()
