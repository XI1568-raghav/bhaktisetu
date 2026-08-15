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
const BASELINE = 91;

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

/** The argument text of each `findMany(...)` call, paren-balanced. */
function findManyArgs(source: string): string[] {
  const spans: string[] = [];
  const needle = 'findMany(';
  let from = 0;
  for (;;) {
    const at = source.indexOf(needle, from);
    if (at === -1) return spans;
    let depth = 0;
    let i = at + needle.length - 1;
    for (; i < source.length; i++) {
      const ch = source[i];
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth === 0) break;
      }
    }
    spans.push(source.slice(at, i + 1));
    from = i + 1;
  }
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
      if (/\btake\s*[,:}]/.test(args) || /\bcursor\s*[,:}]/.test(args)) continue;
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

  it('keeps the broadcast recipient scans bounded', () => {
    // The audience scans are the ones that grow with the whole user base, so
    // this file specifically must stay at zero.
    const hits = unboundedSites().map((h) => h.file.split('\\').join('/'));
    expect(hits).not.toContain('services/whatsapp-broadcast.service.ts');
  });
});
