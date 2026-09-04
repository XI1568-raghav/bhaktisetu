/**
 * CI-12 — the swayambhu count must be DERIVED, never asserted.
 *
 * The defect: /jyotirlinga stated that all twelve Jyotirlingas are swayambhu
 * (self-manifest) directly above its own badge grid, which marked nine. The
 * data was right and the prose was wrong, and the two sat on the same screen.
 *
 * Both /jyotirlinga and /discover now compute the figure with
 * `JYOTIRLINGAS.filter(j => j.swayambhu).length`, so the sentence cannot drift
 * from the badges again. This test exists because CI-12 is specifically a
 * finding about a retired claim RESURFACING: an earlier round of this audit
 * declared a similar claim fixed four times and then found a fifth live copy.
 * A guard is worth more than another manual sweep.
 *
 * On the second half of the finding, which is a correction rather than a fix:
 * CI-12 also says "/tirth says Mahakaleshwar is the only one". The actual
 * string in `lib/tirthas.ts` is
 *
 *     'Lord Mahakal (Shiva as Lord of Time/Death; the only south-facing Jyotirlinga)'
 *
 * That is a claim about ORIENTATION (dakshinamukhi), not about swayambhu
 * status, and it is correct. There is no contradiction to fix there, so nothing
 * was changed in tirthas.ts and this file asserts the true statement stays
 * intact rather than quietly "fixing" an accurate sentence.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { JYOTIRLINGAS } from '../lib/jyotirlingas';

const webRoot = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(webRoot, p), 'utf8');
/** Strip comments so a guard never matches the prose that explains the guard. */
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('CI-12 — jyotirlinga data', () => {
  it('has twelve entries, of which nine are swayambhu', () => {
    // If this ever legitimately changes, the pages follow automatically because
    // they derive; only this expectation needs updating, and deliberately.
    expect(JYOTIRLINGAS).toHaveLength(12);
    expect(JYOTIRLINGAS.filter((j) => j.swayambhu)).toHaveLength(9);
    expect(JYOTIRLINGAS.filter((j) => !j.swayambhu)).toHaveLength(3);
  });

  it('gives every entry an explicit boolean, so none defaults to swayambhu', () => {
    // An `undefined` here would read as false in a filter and silently shrink
    // the count rather than failing.
    for (const j of JYOTIRLINGAS) expect(typeof j.swayambhu).toBe('boolean');
  });
});

describe('CI-12 — the pages derive the figure instead of asserting it', () => {
  it.each(['app/jyotirlinga/page.tsx', 'app/discover/page.tsx'])(
    '%s computes the swayambhu count from JYOTIRLINGAS',
    (file) => {
      expect(code(file)).toMatch(/JYOTIRLINGAS\.filter\(\s*\(?\s*j\s*\)?\s*=>\s*j\.swayambhu\s*\)/);
    }
  );

  it('no page claims all twelve are swayambhu', () => {
    // The exact shape of the original defect: a count adjacent to the word.
    const offenders: string[] = [];
    for (const file of ['app/jyotirlinga/page.tsx', 'app/discover/page.tsx']) {
      const c = code(file);
      if (/\b(all\s+)?(12|twelve)\b[^.]{0,60}swayambhu/i.test(c)) offenders.push(file);
      if (/swayambhu[^.]{0,60}\ball\s+(12|twelve)\b/i.test(c)) offenders.push(file);
    }
    expect(offenders, `these assert a swayambhu count instead of deriving it: ${offenders.join(', ')}`).toEqual([]);
  });

  it('the comment-stripper leaves real code behind', () => {
    // Without this the assertions above could pass against an empty string —
    // the vacuous-test failure mode the verifiers refuted twice in this audit.
    const c = code('app/jyotirlinga/page.tsx');
    expect(c).toContain('JYOTIRLINGAS');
    expect(c.length).toBeGreaterThan(400);
  });
});

describe('CI-12 — the accurate /tirth claim is left alone', () => {
  it('keeps Mahakaleshwar described as the only SOUTH-FACING jyotirlinga', () => {
    // Correct as written. Recorded so a future sweep for the word "only" near
    // "Jyotirlinga" does not delete a true statement while chasing this finding.
    expect(read('lib/tirthas.ts')).toContain('the only south-facing Jyotirlinga');
  });
});
