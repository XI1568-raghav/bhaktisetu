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
const BASELINE = 101;

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
