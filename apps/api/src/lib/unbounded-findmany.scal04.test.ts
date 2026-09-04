import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * SCAL-04 ratchet — no NEW unbounded `findMany`.
 *
 * The sweep counted 205 findMany call sites in apps/api/src, 111 with neither
 * `take:` nor `cursor:`. The worst of them shipped 15–33 MB per request into a
 * 512 MB Render container. Most of the remainder are legitimately bounded by
 * their where clause (a single user's addresses, one booking's offers) and
 * rewriting all 111 blind would be churn, not safety.
 *
 * So this is a ratchet, not a ban: the count may fall, never rise. A new
 * unbounded scan fails here with the file that introduced it, and anyone who
 * genuinely needs one lowers nothing and explains it in review.
 *
 * Lower BASELINE whenever you remove one — that is the point of the ratchet.
 */

const SRC = join(import.meta.dirname, '..');

/**
 * Measured 2026-08-13 after the SCAL-04 fixes. Only ever goes down.
 *
 * Across the six files this finding named, the same scanner counted 46 at HEAD
 * and 32 after: payout 8→6, admin-metrics 7→1, whatsapp-broadcast 4→0,
 * store-admin 7→6, aarti-notify 4→3.
 */
/**
 * 94 → 91 on 2026-08-15, and NOT because three reads were bounded. The detector
 * was over-reporting and two fixes below made it honest: `take` written as an
 * ES6 shorthand (`skip, take`) now counts as bounded, and comments are stripped
 * before scanning. Both had been inflating the number, so the baseline drops to
 * the true count to keep the ratchet tight — leaving it at 94 would bank three
 * findMany calls of free slack for the next author.
 *
 * Genuine movement in the same window, verified by running the corrected
 * detector against 55c3acfe and HEAD: admin.service.ts 11 → 10 (one bounded),
 * consultation.ts 1 → 2 (one added — an identity hydration keyed
 * `in: userIds` off an already-paginated page, bounded by construction like the
 * commission/temple reads justified above). Net zero. The five "new" unbounded
 * reads in routes/admin.ts that first tripped this ratchet were all paginated
 * list endpoints using shorthand `take` — false positives, every one.
 */
/**
 * 89 → 86 on 2026-08-19. Net −3, but the movement is FOUR fixes and one newly
 * VISIBLE read, so the arithmetic is spelled out rather than asserted:
 *
 *   −1  routes/priests-public.ts — GET /api/v1/priests. Registered at
 *       server.ts:413 with NO preHandler, so it was the only unbounded scan an
 *       ANONYMOUS caller could trigger, over the widest rows left (bio,
 *       languages[], specializations[]). Now skip/take with a paired count().
 *   −1  routes/store-admin.ts — GET /products read one merchant's entire
 *       catalogue with no select and no take. Now an explicit column list plus
 *       skip/take.
 *   −1  services/payout.service.ts — runWeeklySettlement's
 *       findMany({ distinct: ['providerId'] }). Prisma applies `distinct` in
 *       the CLIENT, so Postgres returned every pending commission row to
 *       produce one row per provider. Now groupBy, the same shape already
 *       retired at admin-metrics.ts:99.
 *   −1  routes/darshan.ts — the /live temple scan, now capped.
 *   +1  routes/darshan.ts became VISIBLE at all. See topLevelProps: the
 *       detector used to test the whole argument text for `take`, so the nested
 *       `darshanStream: { take: 1 }` marked the unbounded PARENT temple scan
 *       bounded. It had been invisible to this ratchet for its entire life.
 *
 * So the honest reading is: three reads bounded, one blind spot closed, and the
 * read that blind spot was hiding bounded in the same commit. The count is
 * MEASURED, not assumed — re-derive it by temporarily setting BASELINE to 0 and
 * reading the failure message.
 */
/**
 * 86 → 86 on 2026-08-20. NET ZERO, and the zero is the finding.
 *
 * A pass over the admin/leads lane went looking for the worst remaining reads
 * BY MEASURED PAYLOAD rather than by call-site count, and came back with three
 * repairs, none of which removes a call site. Recording it because a pass that
 * moves nothing looks identical to a pass that never happened:
 *
 *   ±0  routes/admin-gurukuls.ts — GET /admin/gurukuls. Still no `take`, and
 *       still deliberately so (the moderation screen renders the complete list;
 *       see the refusal below). It used `include`, and `include` without
 *       `select` returns EVERY scalar on the model — 20 declared, 12 returned
 *       by the handler's own `.map()`. Among the 8 discarded was `description`,
 *       a required uncapped String and the only column on Gurukul whose width
 *       is not bounded by a short identifier: every gurukul's directory prose,
 *       on a whole-table scan, for a screen that renders none of it. Columns
 *       pinned; the response is byte-identical and the test asserts the body as
 *       well as the column list.
 *   ±0  services/admin.service.ts getUsers — the role hydration keyed
 *       `userId: { in: page }`. Bounded by the page (clampLimit caps at 100) so
 *       it was never a ratchet entry, but it fetched whole assignment rows to
 *       build a map out of two columns. A user may hold all eight roles, so up
 *       to 800 rows of id + isPrimary + createdAt per view of the first screen
 *       an operator opens. Bounded is not the same as free.
 *   ±0  routes/admin-leads.ts — and this one is not a payload fix at all.
 *       THE 2026-08-14 ENTRY BELOW SHIPPED A COLUMN THAT DOES NOT EXIST. The
 *       leaderboard `groupBy` asked for a referrer-EMAIL field; `model Waitlist`
 *       has never had one (a referral is stored as `referredByCode`, the
 *       referrer's `referralCode`). Prisma rejects an unknown `by` entry, the
 *       rejection propagated out of the enclosing `Promise.all`, and the
 *       handler's catch answered its all-zero object — so total, confirmed,
 *       invited, converted, the 30-day series AND the leaderboard were zero.
 *       The whole endpoint, not just the typo. The SCAL-04 fix recorded below
 *       as a win had in fact taken /admin/waitlist/stats off the air.
 *
 *       Three things had to fail at once for it to survive: `waitlistModel()`
 *       is hand-typed `(args: unknown) => Promise<any[]>` so tsc never saw the
 *       name; the route's own test mocked `groupBy` and branched on the SAME
 *       wrong field, so it asserted the fiction back to itself; and a dead
 *       endpoint and an empty waitlist return identical JSON. Now grouped on
 *       `referredByCode` with a `take: 20`-bounded code→email hydration, and
 *       `admin-leads.waitlist-schema.scal04.test.ts` checks every field name in
 *       those calls against prisma/schema.prisma — the only oracle available
 *       with no database to query, and one a mock cannot agree with.
 *
 * THE DETECTOR WAS PROBED AGAIN AND CAME BACK HONEST. Given that six of this
 * sweep's guards have now matched their own documentation, `stripComments` was
 * diffed against a string/template/regex-aware stripper across all of
 * apps/api/src: both report 86, with no per-file disagreement. So no `findMany`
 * is currently hiding inside a string literal that the naive `/* … *\/` pass
 * mistakes for a comment, and nothing here needs rewriting. Recorded as a
 * NEGATIVE result so the next author does not spend the same hour on it.
 *
 * STILL REFUSED, unchanged and re-verified on 2026-08-20:
 *   · `admin.service.getUsers`' role filter remains the one read that scales
 *     with the whole USER BASE. `UserRoleAssignment` still has no `@relation`
 *     to `User` (schema.prisma) and `User` no back-reference, so
 *     `where: { roleAssignments: { some: { role } } }` is still rejected
 *     outright. Worse than the read: the resolved id list goes BACK to Postgres
 *     as an `IN (...)` in both the page query and the count, so a 200k-holder
 *     role costs roughly two 7 MB statements outbound on top of the rows
 *     inbound. The fix is a schema change plus a migration adding the foreign
 *     key, and no migration in prisma/migrations even mentions
 *     `user_role_assignments` — the table predates the tracked history, so
 *     whether the FK already exists in prod cannot be established from this
 *     repo. Since migrations auto-apply on API boot, guessing wrong turns a
 *     billing outage into a boot failure. Out of this lane, and deliberately
 *     not attempted blind.
 *   · `/admin/temple-timings` and `/admin/gurukuls` return whole tables to
 *     admin pages that expect the complete list. Unchanged: a page size without
 *     the paired UI change truncates an operator's view with no indication.
 */
/**
 * 86 → 84 on 2026-08-20. −2, and the arithmetic is one file each:
 *
 *   −1  routes/admin-lead-conversion.ts — GET /admin/leads/conversion/timeline.
 *   −1  routes/admin-leads.ts           — GET /admin/outreach/stats.
 *
 * Both read `outreach_logs` whole for their window with no take and no cursor,
 * and reduced it to at most 120 (respectively 30) tuples of small integers in a
 * JS loop. This is the table this file has twice called the fastest-growing one
 * the product has — a row per MESSAGE per lead, never deleted, so its row count
 * is a multiple of the lead table's — and the timeline's window is sized by the
 * CALLER (`?days`, capped at 120), so the read grew with campaign volume AND
 * with a query parameter. Measured payload, from the columns each selected
 * (status enum + 1–3 timestamps + template_key ≈ 60 B/row for the timeline,
 * ≈ 30 B/row for the stats endpoint): at 200k logs in a 30-day window that is
 * ~12 MB and ~6 MB per hit into a 512 MB container. After: ≤ 121 and ≤ 31
 * grouped rows, ~4 kB and ~1 kB, independent of table size.
 *
 * THE TWO-TIME REFUSAL RECORDED ABOVE IS ANSWERED, NOT IGNORED. It stood on one
 * real risk: Prisma cannot express `date_trunc`, both handlers answer zeros on
 * ANY error, so a raw statement Postgres rejects turns a slow dashboard into a
 * silently empty one — exactly what an unknown `groupBy` field did to
 * /admin/waitlist/stats for six days. Three things retire that risk:
 *
 *   1. The identifiers are ESTABLISHED, not assumed. `OutreachLog` carries
 *      `@map` on every column AND migration 20260503_perf_indexes creates an
 *      index `ON "outreach_logs" ("lead_id", "channel", "sent_at" DESC)` — the
 *      snake_case names are DDL in this repo. No DateTime in the schema uses
 *      `@db.Timestamptz`, so `sent_at` is a plain `timestamp(3)` holding UTC
 *      and `date_trunc('day', …)` reproduces the old `toISOString().slice(0,10)`
 *      key exactly rather than approximately.
 *   2. The shape is copied verbatim from a statement already in production:
 *      `admin-metrics.ts loadFunnelDaily`, including the
 *      `count(*) FILTER (WHERE …)::int` form.
 *   3. `routes/admin-lead-conversion.timeline-sql.scal04.test.ts` re-derives
 *      OutreachLog's table and column names from prisma/schema.prisma on every
 *      run and fails on any quoted identifier in either file that is not one of
 *      them — the one oracle a mock cannot agree with. It also pins the bucket
 *      arithmetic against a stated ledger, including the containment rule that
 *      a row outside the seeded days reaches neither its bucket nor the totals.
 *      That guard's own first draft matched ZERO templates, because the call
 *      sites are written `$queryRaw<DayRow[]>\`` and the pattern expected the
 *      backtick to follow the method name; it passed green over SQL it had
 *      never read until an explicit "at least one block" assertion caught it.
 *      Recorded because that is the seventh time in this sweep a source-text
 *      guard has agreed with itself instead of with the code.
 *
 * Both handlers now also return `degraded`, so a rejected query and a genuinely
 * quiet month stop being the same JSON. That is the actual repair to the class
 * of failure the refusal was protecting against, and it is why the refusal
 * could be lifted rather than merely overruled.
 *
 * STILL REFUSED here, and the reason is now narrower than the blanket one it
 * replaces: `routes/admin-leads.ts` `/waitlist/stats` day series
 * (`waitlist.findMany({ where: { createdAt: { gte: since } }, select: {
 * createdAt } })`). `Waitlist.createdAt` has NO `@map`, so the column is the
 * quoted camelCase `"createdAt"` — knowable, but NOT confirmable: no migration
 * in prisma/migrations mentions `waitlist` at all, so unlike `outreach_logs`
 * there is no DDL in this repo to check the name against, and the table
 * predates the tracked history. It is also the SMALLEST of the three: one
 * 8-byte column over a fixed 30-day window. Worst risk, least payload — left
 * alone deliberately, not overlooked.
 */
/**
 * 84 → 84 on 2026-08-21. NET ZERO ON PURPOSE, and the zero is the report.
 *
 * THE STANDING REFUSAL IS ANSWERED IN PART. `admin.service.getUsers`' role
 * filter — recorded three times above as the one read in this API that scales
 * with the whole USER BASE — no longer runs on a request that filters by role.
 * `?role=PANDIT` is now served by
 *
 *   SELECT u."id" FROM "users" u
 *   JOIN "user_role_assignments" ra ON ra."user_id" = u."id"
 *   WHERE ra."role"::text = $1 ... ORDER BY u."created_at" DESC LIMIT $n OFFSET $m
 *
 * plus the matching `count(*)::int`, and a page hydration bounded by
 * construction (`take: ids.length`, where the ids ARE the page). Measured
 * payload for the shape that was there: the holder resolution returned one
 * uuid per holder and then sent that list BACK to Postgres in TWO statements,
 * so at 200k DEVOTEE holders it was ~7 MB inbound and ~7 MB outbound twice —
 * roughly 21 MB of wire per dashboard hit, against a 512 MB container. After:
 * `limit` uuids in (≤ 100 × 36 B ≈ 3.6 kB), one integer for the count, nothing
 * outbound but the role string. Independent of how many people hold the role.
 *
 * THE REFUSAL'S REASON WAS REAL AND IS NOT BEING WAVED AWAY. It said the fix
 * needs a `@relation` on `UserRoleAssignment` plus a migration adding the
 * foreign key, and that migrations auto-apply on API boot so guessing wrong
 * turns a slow screen into a boot failure. All of that still holds — which is
 * exactly why this is a JOIN and not a relation: a JOIN needs no schema change
 * and no migration. What the refusal did not consider is that the identifiers
 * were never actually unknown. Every name the statement quotes is one the
 * Prisma client ALREADY emits against this database through the very
 * `userRoleAssignment.findMany` being replaced, so if `@@map` or `@map` were
 * wrong that call would already be failing in production. `"users"` is
 * additionally DDL here. The one identifier that genuinely cannot be derived —
 * the Postgres enum type name — is avoided by `ra."role"::text = $1`, the shape
 * routes/admin-metrics.ts already runs in production as
 * `"status"::text = 'captured'`.
 *
 * NO `DISTINCT` IS NEEDED and its absence is not an oversight:
 * `@@unique([userId, role])` (schema.prisma:887) means a fixed role matches at
 * most one assignment row per user, so the JOIN cannot duplicate a user and
 * `count(*)` IS the holder count. The `distinct: ['userId']` it replaces was
 * applied in the Prisma CLIENT anyway — it never removed a row Postgres sent.
 *
 * SO WHY IS THE COUNT UNCHANGED. Because production is suspended (Render
 * billing, 2026-08-17) and no statement in this repo can be executed against a
 * database right now. Shipping an unverifiable statement as the ONLY path
 * would put the operator's main screen one wrong identifier away from a 500, on
 * a scale problem that arrives at 200k users in a product that has not yet
 * taken payment. So the previous id-resolution path is retained as a fallback
 * behind a logged catch, and THAT is the `findMany` this ratchet still counts.
 * It is not a swallowing catch: the fallback returns the SAME rows and the SAME
 * total, only slowly, and `services/admin.service.role-filter-sql.scal04.test.ts`
 * pins that equivalence along with the identifier derivation — every table and
 * column in both statements is re-derived from prisma/schema.prisma on each
 * run, so a `@map` rename fails the test rather than production.
 *
 * TO TAKE THIS TO 83, the next agent needs ONE observation, not more code:
 * with any running API, `GET /api/v1/admin/users?role=PANDIT` as an admin, and
 * check the API log for `role JOIN unavailable`. If that line is absent the
 * JOIN executed; delete the fallback branch in `loadRoleFilteredPage`
 * (everything after `if (fast) { ... }`), delete the two fallback tests in the
 * guard file, and lower BASELINE to 83. If the line is present, the log
 * carries the Postgres error and names the wrong identifier.
 *
 * STILL REFUSED, unchanged: `/admin/temple-timings` and `/admin/gurukuls`
 * return whole tables to admin pages that expect the complete list, and the
 * `/waitlist/stats` day series (see the 2026-08-20 note — smallest payload,
 * least confirmable column name).
 */
/**
 * 84 → 83 on 2026-08-28. −1, and it is THE one the four notes above kept
 * refusing: `admin.service.getUsers`' role filter, recorded here four separate
 * times as the only read in this API that scales with the whole USER BASE.
 *
 *   −1  services/admin.service.ts — the `userRoleAssignment.findMany({ where:
 *       { role } })` holder scan, which since 2026-08-21 had survived as the
 *       fallback under the raw-SQL JOIN. Both it and the JOIN are DELETED. The
 *       endpoint is now one Prisma predicate on the same `where` object the
 *       count already used:
 *
 *         where.roleAssignments = { some: { role } }
 *
 * WHAT ACTUALLY CHANGED, SINCE THE NOTE ABOVE PRESCRIBED SOMETHING ELSE. The
 * 2026-08-21 entry said taking this to 83 needed ONE OBSERVATION, not more
 * code: hit `GET /api/v1/admin/users?role=PANDIT` against any running API and
 * check the log for `role JOIN unavailable`. That route is still shut — Render
 * billing, and the local seeded stack is down — so the observation could not be
 * made. It is also no longer required, and that is the point: the observation
 * existed only to prove that hand-written identifiers were correct. A Prisma
 * relation predicate has no hand-written identifiers. There is nothing left to
 * observe, so the fallback is not "bypassed pending verification", it is gone.
 *
 * THE REFUSAL'S REASON WAS REAL AND IS RETIRED, NOT OVERRULED. It stood on one
 * thing: `where: { roleAssignments: { some: { role } } }` needs a `@relation`
 * on `UserRoleAssignment`, a relation needs a foreign key, migrations
 * auto-apply on API boot (`prisma migrate deploy && node dist/server.js`), NO
 * migration in prisma/migrations mentions `user_role_assignments` — the table
 * predates the tracked history — and production is suspended, so whether the
 * key already exists and whether orphan rows exist are both unknowable. Every
 * clause of that is still true. What retires it is that
 * `ADD CONSTRAINT ... NOT VALID` does not read a single existing row: Postgres
 * skips the verification scan and enforces the key on new and updated rows
 * only. Unknown data cannot abort a statement that never looks at it. The
 * migration (20260828100000_scal04_user_role_assignment_fk) additionally skips
 * on a `pg_constraint` hit and wraps the ALTER in `EXCEPTION WHEN OTHERS`, so
 * it commits either way, and `VALIDATE CONSTRAINT` — the half that DOES scan,
 * and the half that CAN fail — is deliberately left as a manual follow-up for
 * whoever next has a live database.
 *
 * AND IF THE CONSTRAINT NEVER LANDS, THE QUERY IS UNAFFECTED. Prisma builds the
 * join from schema.prisma, never from the database's constraint catalogue. So
 * the worst case of this migration is the behaviour the product has had since
 * launch, with the scale fix already in effect.
 *
 * MEASURED PAYLOAD for the shape that is gone, from the columns it selected:
 * the holder scan returned one 36-byte uuid per holder and then sent that list
 * BACK to Postgres in two statements, so a 200k-holder role cost ~7 MB inbound
 * plus ~7 MB outbound twice — roughly 21 MB of wire per dashboard hit into a
 * 512 MB container. After: `limit` rows (≤ 100) and one integer, with the role
 * string as the only thing outbound. Independent of how many people hold it.
 *
 * `services/admin.service.role-filter-sql.scal04.test.ts` IS DELETED, not left
 * passing. Its entire subject — two `$queryRaw` statements and the id fallback
 * beneath them — no longer exists, and its central job (re-deriving every
 * quoted table and column from prisma/schema.prisma) is meaningless once there
 * is no quoted identifier in the file. Every guarantee it held that still means
 * something moved to `services/admin.service.role-relation.scal04.test.ts`:
 * page bounded and offset, total from a COUNT and never from the page length,
 * page and count constrained by the SAME predicate, unknown role never reaching
 * the database, and no read of the assignment table except the page-bounded
 * roles hydration. That file additionally pins the schema declaration and the
 * five properties that make the migration un-failable.
 *
 * STILL REFUSED, unchanged: `/admin/temple-timings` and `/admin/gurukuls`
 * return whole tables to admin pages that expect the complete list, and the
 * `/waitlist/stats` day series (see the 2026-08-20 note — smallest payload,
 * least confirmable column name).
 */
const BASELINE = 83;

// −2 on 2026-08-16 — routes/admin-lead-conversion.ts, GET /admin/leads/conversion.
//
//   One request read TWO entire tables. The lead funnel pulled every row of
//   `leads` (id, role, status, convertedUserId) and every row of
//   `outreach_logs` (leadId, openedAt, clickedAt, openCount, clickCount,
//   status) — no where, no take, no cursor on either — and reduced both to 35
//   integers with JavaScript Sets and for-loops.
//
//   These were the two fastest-growing reads left in this API, and one of them
//   is the largest table the product has: `outreach_logs` gains a row per
//   MESSAGE per lead, so its row count is a multiple of the lead table's, and a
//   lead row is never deleted. The pair is a strict superset of the waitlist
//   scan justified below — same shape, bigger tables, and both on one dashboard
//   hit into a 512 MB container.
//
//   Now five grouped reads: one row per (role, status) for the funnel, and one
//   row per role each for emailed / opened / clicked through
//   `where: { outreachLogs: { some: … } }`. `Lead.outreachLogs` IS a declared
//   relation in prisma/schema.prisma, so the `some` filter pushes the lead↔log
//   join into Postgres — which is exactly what the three JS Sets were doing by
//   hand. Zero lead rows and zero log rows now cross the wire.
//
//   `converted` deliberately costs two reads, not one. The rule it must
//   reproduce is `status = CONVERTED` **OR** `convertedUserId IS NOT NULL`, and
//   a single group over status silently drops every lead linked to a real
//   account but never re-stamped — under-reporting the one number the funnel
//   exists to show, which is SCAL-09's lying-number defect wearing a new hat.
//   The second read asks for that residue with `status: { not: 'CONVERTED' }`
//   so nothing is double-counted, and
//   `routes/admin-lead-conversion.scal04.test.ts` pins the full arithmetic
//   (totals AND per-role) against a stated ledger so the endpoint cannot be
//   satisfied by returning less.
//
//   NOT touched in the same pass, and why — the residue in this file and its
//   neighbours needs work outside this lane, not more of the same:
//     · the `/conversion/timeline` read and `admin-leads` `/outreach/stats`
//       bucket by DAY across three different timestamp columns. Prisma cannot
//       express `date_trunc`, so the honest fix is raw SQL — and raw SQL here
//       sits behind a swallowing try/catch that answers an all-zero timeline on
//       any error. Shipping a query nobody could execute against Postgres first
//       would have converted a slow dashboard into a silently empty one.
//     · `/admin/temple-timings` and `/admin/gurukuls` return whole tables, but
//       both are consumed by apps/admin pages that expect the complete list.
//       Adding a page size without the paired UI change truncates an operator's
//       view with no indication — the same trade this ratchet already refused
//       once on the approvals screen.
//     · `admin.service.getUsers`' role filter is still the read that scales with
//       the USER BASE (see the accepted-risk note below). Its documented end
//       state needs a `@relation` on UserRoleAssignment, which is a schema
//       change; verified again on 2026-08-16 that the model still has none.

// −1 on 2026-08-15 — services/admin.service.getRevenue, the ACTIVE
// subscription scan.
//
//   Every ACTIVE `MarketplaceSubscription` row was read with no take, no
//   cursor and no select, then reduced to one scalar and bucketed by
//   (plan, role) in a JS Map. Of the reads left in this file it is the one that
//   grows fastest with SUCCESS rather than with traffic: there is one ACTIVE
//   row per paying customer and it never leaves the set while they pay, so the
//   founder's own revenue dashboard gets heavier every time the business works.
//
//   Now `groupBy({ by: ['plan','role'], _count, _sum: { amount } })` — one row
//   per bucket, bounded by the product catalogue instead of the customer count.
//   Postgres SUM over `numeric` is exact so the reported figures are identical;
//   `admin.service.subscription-revenue.scal04.test.ts` states the ledger once
//   and asserts the total and the per-plan breakdown against it.
//
//   ⚠ THE COMMENT EXPLAINING THE FIX ORIGINALLY QUOTED THE REMOVED CALL, and
//   this scanner counted the quote — the number stayed at 95 and the removal
//   was invisible. That is the same trap the header warns about, running the
//   other way. Reworded to describe the call instead of spelling it.

// −6 on 2026-08-14 (third pass) — services/admin.service.getPendingApprovals.
//
//   Six reads, one per provider role, each `{ where: { approved: false } }` with
//   no take, no orderBy and no select, concatenated and returned whole. Of every
//   list in this API it is the one most certain to grow without bound: an
//   unreviewed signup never leaves it, so the read scales with the operator's
//   own backlog rather than with traffic, and each row is a full profile.
//
//   Now `take: PENDING_APPROVAL_PAGE` (100) + `orderBy: { createdAt: 'asc' }`
//   per queue, with the true backlog size counted in SQL by six `count()` calls
//   so the page can be bounded WITHOUT the total quietly becoming the page
//   length — that swap is SCAL-09's defect, and re-committing it on the
//   approvals screen would have traded a memory bug for a lying number.
//   Ordering changed newest-first → oldest-first at the same time: on any real
//   backlog the newest-first sort buried the longest-waiting provider under
//   every day's fresh signups.
//
//   The take/orderBy are written out at each of the six call sites rather than
//   hoisted into a shared options object. Hoisting made this scanner read them
//   as unbounded (it matches argument TEXT) — the number would not have moved,
//   and a genuinely unbounded read added there later would have been invisible.

// NET ZERO on 2026-08-14 (second pass) — one removal paid for one addition, so
// BASELINE is unchanged at 101. Both are recorded because an unexplained
// movement in either direction is what this file exists to prevent.
//
//   REMOVED  routes/admin-leads.ts, GET /admin/waitlist/stats: read the WHOLE
//   waitlist table (status + referredByEmail + email, no where/take/cursor) to
//   compute six scalars and a top-20 referrer list in a JS loop. Now two
//   `groupBy` reads — one row per status, and a `take: 20` ordered slice for the
//   leaderboard. Same numbers, bounded by construction.
//
//   ADDED  services/ledger-reversal.service.ts (DI-02, second half): the partial
//   refund unwind now also scales PENDING `PriestPayout` sidecar rows, because a
//   temple-path booking never mints a Commission and that rail was the only one
//   it had. Bounded by the where clause to a SINGLE booking — realistically one
//   row — exactly like the commission/temple reads justified below, and a `take`
//   here would silently leave a row fully payable on money already handed back.
//
// A NOTE ON THIS SCANNER: it is textual and paren-matched, so a `findMany(`
// written inside a COMMENT counts too. Several entries in the current 101 are
// prose describing a call that was already removed. Do not "fix" that by
// rewording comments — that lowers the number without lowering the risk.
//
// +1 on 2026-08-14 — two legitimately-bounded additions arrived while one
// unbounded call elsewhere was removed, so the net is +1.
//
//   routes/consultation.ts (AW-02, commissionMissing): reads the Commission
//   rows for `paidIds`, which is derived from `rows` — an ALREADY-PAGINATED
//   page of the admin consultation list. A `take` would cap the lookup below
//   the page size and silently flag genuinely-credited bookings as
//   "nobody can be paid for this", which is the opposite of the finding.
//
//   services/admin.service.ts:158 (AO-07, role filter): resolves a role to its
//   holder ids so the page and the count agree. It replaced a `.filter()` over
//   an already-paginated slice, which made `total` wrong. A `take` here would
//   silently truncate the filter itself.
//   ⚠ RESIDUAL SCALE RISK, deliberately accepted for now: at 200k users the
//   DEVOTEE role would return ~200k uuids into an `IN (...)`, which Postgres
//   will not enjoy. The correct end state is a Prisma relation filter
//   (`where: { roleAssignments: { some: { role } } }`) so the database does the
//   join. Tracked as follow-up; today's row counts make it a non-issue.
//
// +2 on 2026-08-13 (DI-02, services/ledger-reversal.service.ts): the partial
// refund unwind reads one booking's PENDING commissions and one booking's
// pending temple payouts before scaling each row down. Both are bounded by the
// where clause to a SINGLE booking — realistically one row each — and a `take`
// here would be actively dangerous: any row past the limit would silently keep
// its full earning on money the platform has already handed back. This is the
// "legitimately bounded by their where clause" case the header describes.

/**
 * Comments are not call sites. The needle is a bare `findMany(`, so prose that
 * merely MENTIONS a query counted as one — on 2026-08-15 the ratchet was held
 * one over baseline by `payout.service.ts:163`, a comment describing a
 * `findMany({ select: { amount } })` that the same commit had DELETED. The
 * detector was reporting the fix as the defect.
 *
 * This is the fourth guard in this sweep to match its own documentation (a
 * localStorage ban tripped on the comment explaining the ban; a 5xx
 * `error.message` scan flagged six legitimate 4xx echoes; a CTA-contrast test
 * matched a comment naming the CTA). Any scanner that reads source as text
 * strips comments first.
 *
 * Line comments and block comments only — string literals containing `//` are
 * left alone, since a query is never written inside one here.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

function tsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__mocks__' || entry === 'node_modules') continue;
      out.push(...tsFiles(full));
      continue;
    }
    if (!entry.endsWith('.ts') || entry.endsWith('.test.ts') || entry.endsWith('.d.ts')) continue;
    out.push(full);
  }
  return out;
}

/**
 * The argument text of each `findMany(...)` call, paren-balanced.
 *
 * DEFECT FIXED 2026-08-19: the scan was `source.indexOf('findMany(')`, so
 * `findMany (` — a single space before the paren — was ENTIRELY INVISIBLE to
 * this ratchet. Verified by probe: a file containing
 * `p.user.findMany ({ where: {...} })` left the total unchanged. Prettier does
 * not produce that spacing, which is exactly why nobody noticed; a hand-edited
 * or differently-formatted file could add an unbounded scan the guard could not
 * see. `\s*` now spans it.
 */
function findManyArgs(source: string): string[] {
  const spans: string[] = [];
  const call = /\bfindMany\s*\(/g;
  for (;;) {
    const m = call.exec(source);
    if (!m) return spans;
    const openParen = m.index + m[0].length - 1;
    let depth = 0;
    let i = openParen;
    for (; i < source.length; i++) {
      const ch = source[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    spans.push(source.slice(m.index, i + 1));
    call.lastIndex = i + 1;
  }
}

/**
 * Only the DEPTH-1 properties of the argument object literal.
 *
 * DEFECT FIXED 2026-08-19: the bounded-check regex ran over the WHOLE argument
 * text, so a `take` on a NESTED RELATION marked the PARENT read bounded.
 * routes/darshan.ts was the live instance —
 * `temple.findMany({ select: { ..., darshanStream: { orderBy, take: 1 } }, where })`
 * — counted as bounded because of the nested `take: 1`, while the temple scan
 * itself had no bound at all. Catalogue-sized today, but any future unbounded
 * read that happens to include a relation with a `take` was invisible here.
 *
 * Walk the argument tracking bracket depth and keep only the characters sitting
 * directly inside the outer object literal. A `}` sentinel is appended so a
 * trailing ES6-shorthand `take` (the last property, with no following
 * delimiter) still matches `\btake\s*[,:}]`.
 */
function topLevelProps(span: string): string {
  const open = span.indexOf('(');
  if (open === -1) return '';
  const inner = span.slice(open + 1, span.length - 1);
  let depth = 0;
  let out = '';
  for (const ch of inner) {
    if (ch === '{' || ch === '[' || ch === '(') {
      depth++;
      if (depth === 1) continue;
    } else if (ch === '}' || ch === ']' || ch === ')') {
      depth--;
      if (depth === 0) continue;
    }
    if (depth === 1) out += ch;
  }
  return out + '}';
}

function unboundedSites(): Array<{ file: string; snippet: string }> {
  const hits: Array<{ file: string; snippet: string }> = [];
  for (const file of tsFiles(SRC)) {
    const source = stripComments(readFileSync(file, 'utf8'));
    for (const args of findManyArgs(source)) {
      // `take: 20` and the ES6 shorthand `take,` are equally bounded. Matching
      // only the colon form reported five paginated admin list endpoints as
      // unbounded on 2026-08-15 — they pass `skip, take` through from the
      // validated query, which is the shape we WANT, so a detector that fails
      // them pushes authors toward the verbose form to appease the ratchet.
      // `\btake\s*[,:}]` covers both; `[,}]` also catches `take` as the last
      // property before the closing brace.
      // Depth-1 ONLY. A `take` on a nested relation bounds that relation, not
      // the parent scan — see topLevelProps.
      const top = topLevelProps(args);
      if (/\btake\s*[,:}]/.test(top) || /\bcursor\s*[,:}]/.test(top)) continue;
      hits.push({ file: relative(SRC, file), snippet: args.slice(0, 90).replace(/\s+/g, ' ') });
    }
  }
  return hits;
}

describe('SCAL-04 ratchet — unbounded findMany', () => {
  it('does not grow', () => {
    const hits = unboundedSites();
    const byFile = hits.reduce<Record<string, number>>((acc, h) => {
      acc[h.file] = (acc[h.file] ?? 0) + 1;
      return acc;
    }, {});
    expect(
      hits.length,
      `Unbounded findMany calls rose to ${hits.length} (baseline ${BASELINE}).\n` +
        `Add take/cursor to the new one, or justify it in review.\n` +
        JSON.stringify(byFile, null, 2),
    ).toBeLessThanOrEqual(BASELINE);
  });

  // ── the detector's own defects, pinned ──
  //
  // Both of these FAIL against the pre-2026-08-19 detector, which is the only
  // way to know a guard that scans source text actually sees what it claims to.

  it('does not accept a nested-relation take as bounding the parent scan', () => {
    const src = `
      const rows = await prisma.temple.findMany({
        where: { liveDarshanEnabled: true },
        select: { id: true, darshanStream: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
    `;
    const args = findManyArgs(stripComments(src));
    expect(args).toHaveLength(1);
    const top = topLevelProps(args[0]!);
    // The nested `take: 1` must NOT appear among the top-level properties.
    expect(/\btake\s*[,:}]/.test(top)).toBe(false);
  });

  it('still accepts a real top-level take, including the ES6 shorthand last', () => {
    const withColon = `prisma.user.findMany({ where: { a: 1 }, take: 20 })`;
    const shorthandLast = `prisma.user.findMany({ where: { a: 1 }, skip, take })`;
    for (const src of [withColon, shorthandLast]) {
      const args = findManyArgs(src);
      expect(/\btake\s*[,:}]/.test(topLevelProps(args[0]!))).toBe(true);
    }
  });

  it('sees findMany written with a space before the paren', () => {
    // `source.indexOf('findMany(')` missed this entirely, so an unbounded read
    // written this way was invisible to the ratchet.
    const src = `const rows = await p.user.findMany ({ where: { blocked: false } });`;
    const args = findManyArgs(src);
    expect(args).toHaveLength(1);
    expect(/\btake\s*[,:}]/.test(topLevelProps(args[0]!))).toBe(false);
  });

  it('keeps the broadcast recipient scans bounded', () => {
    // The audience scans are the ones that grow with the whole user base, so
    // this file specifically must stay at zero.
    const hits = unboundedSites().map((h) => h.file.split('\\').join('/'));
    expect(hits).not.toContain('services/whatsapp-broadcast.service.ts');
  });
});
