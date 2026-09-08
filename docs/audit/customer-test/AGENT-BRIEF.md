# Customer-test agent brief

You are testing **live production** (`https://darshya.online` / `https://api.darshya.online/api/v1`)
as a real user, with real accounts. Read this whole file before your first request.

The repo owner has explicitly authorized this testing, including creating and cancelling
records under the test accounts below. This is the owner's own product.

## Credentials — read, never log in

Tokens for all 8 roles are cached at `docs/audit/customer-test/.token-cache.json`
(gitignored), keyed by email, each `{token, role, expiresAt}`.

```js
const c = JSON.parse(fs.readFileSync('docs/audit/customer-test/.token-cache.json','utf8'));
const token = c['ct+pandit@darshya.online'].token;   // Authorization: Bearer <token>
```

`/auth/*` is rate-limited to **10 requests per minute per key** (`apps/api/src/server.ts:233`).
Eight agents each logging in will lock everyone out. **Do not call `/auth/login`.**
If every token is expired, stop and report it — do not try to refresh.

Accounts: `ct+devotee@`, `ct+pandit@`, `ct+store@`, `ct+astro@`, `ct+wellness@`,
`ct+gaushala@`, `ct+temple@`, `ct+admin@` — all `@darshya.online`.

## HARD SAFETY RULES — a violation invalidates the run

1. **Production runs a LIVE Razorpay key.** Do NOT call any endpoint that creates a
   payment order — `/bookings/create-order`, `/donations/create-order`,
   `/subscriptions/*` checkout, `/consultation/*/create-order`, store checkout, or any
   web page action that opens the Razorpay modal. These charge real money. Verifying
   that such an endpoint EXISTS is fine; invoking it is not. If a journey requires it,
   record the step as `BLOCKED: live razorpay key` and move on.
2. **Never delete or mutate data you did not create.** No deleting temples, users,
   products, bookings, or content belonging to anyone else. Approving/rejecting other
   people's records in the admin queue is also off-limits.
3. Anything you do create must be identifiable: names/titles prefixed `QA-`, and
   cancelled or cleaned up when the journey ends.
4. **Never send outbound messages** to real people — no emails, WhatsApp, SMS, no
   contact-form submissions to real inboxes, no reviews on other people's listings.
5. Do not change account settings, roles, passwords, or any env/config.
6. Pace yourself: **at most 2 concurrent requests, ~400 ms apart**. The edge returns 429
   at higher concurrency. On a 429, back off exponentially — it is throttling, not a bug.

## Method

For every endpoint and page in your scope:

- **Happy path** with your role's token. Record status, and whether the body is real
  data or an empty/placeholder shape.
- **Unhappy paths**: no token (expect 401), another role's token (expect 403), a
  nonexistent id (expect 404, and **note it as a finding if it returns 200**), invalid
  input (bad uuid, negative number, past date, 10k-char string, emoji), and a
  double-submit of any safe mutation.
- **Empty state**: your accounts are fresh, so most lists are empty. A designed empty
  state is correct; a crash, a spinner that never resolves, or a raw `[]` rendered as
  content is a finding.
- For **pages** (not just APIs), fetch the HTML and check: HTTP status, whether the
  `<title>` is sane (an empty interpolation like `Temple — , ` is a finding), and
  whether the body contains real content vs. an error boundary.

Verify before you report. If something looks broken, re-check it once — a 5xx during a
deploy is transient, and 429 is your own traffic.

## Known — do not re-report these

- `/csr-match` 404s deliberately (`ENABLE_CSR_MATCH` compliance gate).
- Soft-404: `/temples/[slug]`, `/pujas/[slug]`, `/astrology/[id]` and 3 more return
  **200** for nonexistent slugs with a broken `<title>`. Already filed as CT-SEO-1.
- An approved pandit was not appearing in `/priests` (CT-SUPPLY-1) — fixed in PR #254,
  not yet deployed. `Priest.isVerified` stays false on prod until that ships.
- PostHog has no prod key, so analytics events no-op. Do not report missing analytics.
- Render free tier cold-starts; a first slow request is not a perf finding.
- `main` is currently red on 8 homepage/design-token tests. Not your scope.

## Output

Write **only** to your own file: `docs/audit/customer-test/agent-<yourname>.json`.
Never write to another agent's file, to `LEDGER*.json`, or to `FINDINGS.md`.

```json
{
  "agent": "<yourname>",
  "scope": "<what you covered>",
  "checked": [{ "target": "/priest/dashboard", "method": "GET", "role": "PANDIT", "status": 200, "note": "" }],
  "findings": [{
    "id": "<yourname>-1",
    "severity": "P0|P1|P2|P3",
    "kind": "AUTH_LEAK|CRASH|BROKEN_CTA|MONEY|DATA_LOSS|EMPTY_STATE|VALIDATION|COPY|SEO",
    "target": "/priest/bookings",
    "repro": ["GET /priest/bookings with ct+store token", "expected 403"],
    "observed": "200 with another pandit's bookings",
    "expected": "403",
    "evidence": "status + first 200 chars of body",
    "confidence": "confirmed|suspected"
  }],
  "blocked": [{ "target": "...", "reason": "live razorpay key" }]
}
```

Severity: **P0** = money moves wrongly, data is lost, or one role reads another's data.
**P1** = a core journey is broken for its own role. **P2** = wrong but recoverable.
**P3** = cosmetic.

Report honestly. "I checked 20 endpoints and everything worked" is a good result and far
more useful than an invented finding. Do not pad the list.
