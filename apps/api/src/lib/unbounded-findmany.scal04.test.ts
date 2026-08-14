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
const BASELINE = 95;

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
    const source = readFileSync(file, 'utf8');
    for (const args of findManyArgs(source)) {
      if (/\btake\s*:/.test(args) || /\bcursor\s*:/.test(args)) continue;
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
