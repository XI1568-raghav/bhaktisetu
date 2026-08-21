import { describe, it, expect } from 'vitest';
import { AARTIS } from '../lib/aartis';
import { CHALISAS } from '../lib/chalisas';
import { CHANTS } from '../lib/chants';
import { DEITIES } from '../lib/deities';
import { FESTIVALS } from '../lib/festivals';
import { MUHURATS } from '../lib/muhurats';
import { SHLOKAS } from '../lib/shlokas';
import { TIRTHAS } from '../lib/tirthas';
import { UPANISHADS } from '../lib/upanishads';
import { VRATS } from '../lib/vrats';
import { CIRCUITS } from '../lib/pilgrimage-circuits';
import { JYOTIRLINGAS } from '../lib/jyotirlingas';

// CI-09 — internal roadmap ticket IDs and the retired brand name "Bhaktisetu"
// were rendering inside published encyclopedia prose. A reader on
// /tirth/dwarka was told "Char Dham pilgrimage tour packages (per R-Q2-P-003
// Bhaktisetu yatra packages) routinely include Dwarka", and
// /pilgrimage/panch-vinayak-mumbai cited "per R-Q3-SA-005 Ganesh Chaturthi
// 2026 campaign". Neither string means anything to a devotee, and the brand
// has been Darshya since the rename.
//
// This walks the RUNTIME arrays, not the source text. That is deliberate and
// load-bearing: a source-text scanner has to strip comments first or it flags
// the `// CI-09` header of the very file it is guarding, and it cannot tell a
// rendered string from a dead one. Runtime values are exactly what ships.

/** Internal roadmap ticket ids: R-Q<quarter>-<CATEGORY>-<nnn>. */
const ROADMAP_ID = /\bR-Q\d-[A-Z]{1,3}-\d{3}\b/;
const RETIRED_BRAND = /bhaktisetu/i;

/** Every string reachable from a record, including inside arrays. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) strings(v, out);
  return out;
}

function offenders(rows: readonly unknown[], re: RegExp): string[] {
  const hits: string[] = [];
  for (const row of rows) {
    const slug = (row as { slug?: string }).slug ?? '<no slug>';
    for (const s of strings(row)) {
      const m = s.match(re);
      if (m) hits.push(`${slug}: …${s.slice(Math.max(0, s.indexOf(m[0]) - 40), s.indexOf(m[0]) + 60)}…`);
    }
  }
  return hits;
}

/**
 * Datasets in files this lane owns. These must stay at zero — a new leak here
 * is a test failure.
 */
const OWNED: Record<string, readonly unknown[]> = {
  FESTIVALS,
  TIRTHAS,
  UPANISHADS,
  JYOTIRLINGAS,
  CIRCUITS,
};

/**
 * Datasets in files this lane may not edit, pinned at the counts measured on
 * 2026-08-21. A NEW leak fails immediately; whoever cleans one has to lower
 * the number here, which is how the ratchet closes. Every one should end at 0.
 */
const RATCHET: Record<string, { rows: readonly unknown[]; brand: number; ticket: number }> = {
  AARTIS: { rows: AARTIS, brand: 0, ticket: 0 },
  CHALISAS: { rows: CHALISAS, brand: 0, ticket: 0 },
  CHANTS: { rows: CHANTS, brand: 0, ticket: 0 },
  DEITIES: { rows: DEITIES, brand: 0, ticket: 0 },
  MUHURATS: { rows: MUHURATS, brand: 36, ticket: 7 },
  SHLOKAS: { rows: SHLOKAS, brand: 0, ticket: 0 },
  VRATS: { rows: VRATS, brand: 0, ticket: 0 },
};

describe('CI-09 — no internal ticket id or retired brand reaches a reader', () => {
  for (const [name, rows] of Object.entries(OWNED)) {
    it(`${name} publishes no roadmap ticket id`, () => {
      expect(offenders(rows, ROADMAP_ID)).toEqual([]);
    });

    it(`${name} publishes no "Bhaktisetu"`, () => {
      expect(offenders(rows, RETIRED_BRAND)).toEqual([]);
    });
  }

  for (const [name, { rows, brand, ticket }] of Object.entries(RATCHET)) {
    it(`${name} leaks no more than its ${ticket} known ticket ids and ${brand} brand mentions`, () => {
      const t = offenders(rows, ROADMAP_ID);
      const b = offenders(rows, RETIRED_BRAND);
      expect(t.length, `${name} ticket ids:\n${t.join('\n')}`).toBeLessThanOrEqual(ticket);
      expect(b.length, `${name} brand mentions:\n${b.join('\n')}`).toBeLessThanOrEqual(brand);
      if (t.length < ticket || b.length < brand) {
        throw new Error(
          `${name} is now at ${t.length} ticket ids / ${b.length} brand mentions ` +
            `(was ${ticket} / ${brand}). Lower the RATCHET entry in this file so it cannot regress.`,
        );
      }
    });
  }
});
