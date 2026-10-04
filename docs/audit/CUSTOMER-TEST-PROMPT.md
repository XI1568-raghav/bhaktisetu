# Darshya — Full-Surface Customer Test (multi-agent prompt)

Paste the block below into a **fresh** Claude Code session (`/clear` first) at `E:\NewClaude\bhaktisetu`.

---

## MISSION

Act as a fleet of real paying customers and real working providers on Darshya. Exercise **every route, every role, every CTA, every flow, happy and unhappy**, click by click, in a real browser — and prove coverage against a generated inventory, not against your memory.

Target: **391 app routes** (302 public/content, 89 gated), **8 `UserRole`s**, **10 portal areas**. Zero routes may end the run in state `UNVISITED`.

## HARD RULES — violating any of these invalidates the run

1. **Ledger before agents.** Nothing is "covered" until it has a row in `docs/audit/customer-test/LEDGER.json` with an evidence path. An agent's summary is not evidence.
2. **Evidence or it didn't happen.** Every route row needs: screenshot path, console-error count, failed-network-request count, final HTTP status. Every finding needs a reproduction (URL + exact click sequence + observed vs expected).
3. **Never claim green from a summary field.** Re-read the artifact. If an agent says "all 40 routes pass," open two of its screenshots at random and confirm.
4. **Disjoint ownership.** Two agents never touch the same route range or the same ledger shard. Each agent writes only its own shard file; the main thread merges.
5. **Blocked is not done.** If a flow is blocked (no test account, gateway off, feature-flagged), record status `BLOCKED` with the reason. Do not silently skip and do not mark it pass.
6. **English only**, in reports and comments.

## PHASE 0 — Inventory + ledger (main thread, no agents, do this first)

Generate the route inventory deterministically:

```
cd apps/web && find app -name "page.tsx" | sed 's|^app||; s|/page.tsx$||; s|^$|/|' | grep -v "^/api" | sed 's|([^)]*)/||g' | sort -u > ../../docs/audit/customer-test/routes.txt
```

Then:

- Resolve all **98 dynamic routes** (`[slug]`, `[id]`) to at least 2 real values each by querying the DB or the public listing pages — one that exists, one that does not (the 404 path). A dynamic route tested only with a valid slug is half-tested.
- Seed `LEDGER.json`: one row per (route x role-that-can-reach-it), status `UNVISITED`.
- **Decide the target environment and write it in the ledger header.** Prod web may be serving a stale build. Compare a known-recent commit's UI against local `HEAD` before you trust prod as "what customers see." If they diverge, test **both** and file divergences as class `STALE_PROD`.
- Write `docs/audit/customer-test/RESUME.md` — the file a future compacted session reads to continue. Update it after every wave.

## PHASE 1 — Fan out (parallel agents, disjoint shards)

Dispatch in waves. Each agent gets: its route shard, its role persona, the per-page checklist, the finding schema, and explicit owner authorization to test and to write files under its own shard path.

| Wave | Agents | Scope |
|---|---|---|
| A | 6 | Public surface, 302 routes split ~50 each — anonymous devotee |
| B | 8 | One per `UserRole`: DEVOTEE, PANDIT, STORE_OWNER, ASTROLOGER, WELLNESS_INSTRUCTOR, GAUSHALA_MANAGER, TEMPLE_MANAGER, ADMIN — their portal plus everything they can reach |
| C | 4 | Cross-role money paths end to end: book → pay → confirm → complete → commission → payout → refund → reversal. One agent per variant (INR domestic, NRI pricing, subscription, donation) |
| D | 3 | Auth state machine, session expiry, role-escalation attempts (a DEVOTEE hitting `/admin/*`, `/priest/*`, another provider's `/temple-portal/*` — every one must 403 or redirect, never render) |

**Per-agent budget:** write to the shard file every ~15 routes so a crash loses at most 15 routes of work.

## PER-PAGE CHECKLIST — run identically on every route

1. **Renders.** No blank page, no skeleton-forever. Screenshot at 1280 **and** 375.
2. **Console.** Zero errors. Record any hydration warning.
3. **Network.** No 4xx/5xx on any XHR. Record every failed request with URL and status.
4. **Every CTA.** Enumerate every `<a>`, `<button>`, and `role=button` on the page. **Click each one.** Record whether it navigates, opens a modal, or no-ops. A CTA that does nothing is a P1 finding.
5. **Every form.** Submit empty (validation must fire), submit invalid (bad email, past date, negative quantity, 10k-char text, emoji, SQL-ish string), submit valid. Then **double-submit** the valid case — duplicate records are a money bug.
6. **Empty state.** Force it (fresh account, filter to nothing) and confirm it is a designed state, not a crash or a bare `[]`.
7. **Auth boundary.** Log out mid-page and refresh: gated pages must redirect to login and return you to the same page after login, not to `/`.
8. **Back / refresh.** Browser-back after a mutation, and hard-refresh mid-flow. State must not corrupt or double-charge.
9. **Deep link.** Open the route cold in a new tab. Pages that only work when navigated to are broken.
10. **Slow net.** Throttle. Confirm skeletons exist and buttons disable while in flight.

## UNHAPPY-PATH CATALOGUE — each attempted at least once per role

Expired or invalid session · 401 vs 403 vs 404 correctness · payment declined · payment abandoned (close the modal) · payment succeeded but callback lost (refresh before redirect) · refund and its commission reversal · double-booking the same slot · booking a past date · cancelling after the cutoff · provider rejecting a booking · unverified provider trying to accept · KYC-incomplete payout request · zero-balance payout request · subscription expiry mid-session · wrong-type or oversized file upload · offline then back online · two tabs mutating the same record · language switch mid-flow · 375px viewport on every gated page.

## FINDING SCHEMA — one JSON object per finding, appended to the agent's shard

```json
{
  "id": "CT-<role>-<n>",
  "route": "/priest/bookings",
  "role": "PANDIT",
  "severity": "P0|P1|P2|P3",
  "class": "BROKEN_CTA|CRASH|AUTH_LEAK|MONEY|DATA_LOSS|EMPTY_STATE|A11Y|PERF|COPY|STALE_PROD",
  "repro": ["1. login as qa+pandit@...", "2. click Accept", "3. ..."],
  "observed": "...",
  "expected": "...",
  "evidence": ["docs/audit/customer-test/shots/....png"],
  "confidence": "confirmed|suspected"
}
```

P0 = money moves wrongly, data is lost, or a role sees another role's data. Escalate P0s to the main thread immediately, do not batch them to the end.

## PHASE 2 — Adversarial verification (mandatory)

Every finding marked `confirmed` is re-tested by a **different** agent that did not find it, with the brief: *"prove this is NOT a bug."* Findings that survive keep `confirmed`; the rest are demoted or dropped. Prior audits on this repo produced a meaningful false-positive rate without this step.

## PHASE 3 — Synthesis

Produce `docs/audit/customer-test/REPORT.md`:

- Coverage table: routes visited / total, per role, stating plainly the count still `UNVISITED` or `BLOCKED`.
- Findings ranked P0 to P3, deduped across agents.
- A "worst 10 moments as a customer" narrative section — the actual experience, not just defect IDs.
- An explicit list of what was **not** tested, and why.

## KNOWN TRAPS — do not spend budget rediscovering these

- **Prod web may be stale.** Verify before attributing a bug to current code.
- **PostHog has no prod key**, so `capture()` no-ops and A/B tests all serve control. Do not assert on analytics events in prod and do not report "experiment working."
- **Render free tier sleeps.** First request can take ~50s. That is not a perf finding — warm both services before timing anything.
- **Local dev must run `next dev --turbopack`.** Plain webpack dev serves stale chunks and produces fake hydration mismatches.
- **`.defer-paint` hides element heights** from `getBoundingClientRect`. Measure after paint.
- **`canada-pandit-prospector.test.ts` fails on clean main.** Pre-existing, not a regression.
- Money math is `Decimal(10,2)` with a uniform **20/80** take rate. Assert exact paise, never floats.

## GUARDRAILS — real testing, no real damage

- Use dedicated accounts only, all `qa+<role>@...`. Never sign in as a real user.
- **Razorpay test mode and test cards only.** No live card, no real money movement, no live-key transactions. If only live mode is reachable, mark payment flows `BLOCKED` and say so — do not improvise.
- No destructive writes to real prod data: never delete temples, users, or bookings you did not create. Prefix everything you create with `QA-` and clean up at the end.
- Outbound messaging (email, WhatsApp, SMS) must be disabled or pointed at QA recipients before running provider flows. Do not send to real devotees or temples.
- If a step needs a credential, a password, or a live payment instrument, stop and ask the owner. Never enter one yourself.

## DONE means

Every ledger row is `PASS`, `FAIL`, or `BLOCKED` with a reason — **zero `UNVISITED`** — every P0 has been adversarially verified, `REPORT.md` exists, and `RESUME.md` reflects final state. Report the real numbers, including the ones that look bad.
