/**
 * [DU-10] One reading size for prose, and the call-site backlog only shrinks.
 *
 * The token half of DU-10 shipped and is guarded elsewhere: every `--text-*`
 * step now declares an explicit `--text-*--line-height`, so prose has ONE
 * leading ratio (__tests__/design-tokens.test.ts asserts it). What was never
 * touched, and never guarded, is the mechanism that actually produces the
 * symptom the finding named — the size class each <p> picks for itself.
 *
 * Census at the time this file was written, over <p> elements carrying a
 * max-w-* reading measure under app/ (the measure is a decent proxy for "this
 * is prose, not a caption"):
 *
 *     text-xs 7 · text-sm 70 · text-base 59 · text-lg 44 · text-xl 3 · none 47
 *
 * Six reading sizes for one role: 12.1px to 17.3px at a 390px viewport, a 46%
 * spread. The finding's stated expectation is "one body reading size (16px+)
 * with one line-height ratio, used for all prose" — half met.
 *
 * WHAT THIS GUARDS, AND WHAT IT DELIBERATELY DOES NOT. Sweeping all 114
 * off-size paragraphs is not safe to do blind: text-sm on a timestamp or a
 * helper caption is correct, and the finding explicitly allows "small sizes
 * reserved for metadata". So this is a RATCHET on the off-size count plus a
 * hard assertion on the specific lead paragraphs the prod sweep sampled, which
 * are unambiguous prose.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');
const relOf = (f: string) => path.relative(WEB, f).split(path.sep).join('/');

function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e === '__tests__') continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(p)) out.push(p);
  }
  return out;
}

/** `<p className="… max-w-… …">` — a paragraph with a reading measure. */
const PROSE_P = /<p\s[^>]*className="([^"]*\bmax-w-[a-z0-9]+[^"]*)"/g;

const OFF_SIZE: string[] = [];
for (const f of walk(path.join(WEB, 'app'))) {
  const src = code(f);
  for (const m of src.matchAll(PROSE_P)) {
    const cls = m[1]!;
    // .prose-body IS the one size, so a paragraph carrying it is compliant even
    // if it also carries a smaller class for a responsive step.
    if (/\bprose-body\b/.test(cls)) continue;
    if (/\btext-(lg|xl)\b/.test(cls)) {
      OFF_SIZE.push(`${relOf(f)} :: ${cls.replace(/\s+/g, ' ').slice(0, 80)}`);
    }
  }
}

describe('[DU-10] prose paragraphs converge on one reading size', () => {
  it('the census finds real paragraphs (this guard measures something)', () => {
    let total = 0;
    for (const f of walk(path.join(WEB, 'app'))) {
      total += [...code(f).matchAll(PROSE_P)].length;
    }
    expect(total, 'no <p> with a reading measure found — the regex broke').toBeGreaterThan(150);
  });

  it('.prose-body is declared and resolves to the base step', () => {
    const css = readFileSync(path.join(WEB, 'app/globals.css'), 'utf8');
    const rule = /\.prose-body\s*\{([^}]*)\}/.exec(css)?.[1];
    expect(rule, '.prose-body missing from globals.css').toBeTruthy();
    expect(rule!, 'must use the base step, not a hard-coded px value').toMatch(
      /font-size:\s*var\(--text-base\)/,
    );
    expect(rule!).toMatch(/line-height:\s*var\(--leading-relaxed\)/);
  });

  it('the lead paragraphs the sweep sampled are on the one size', () => {
    // Unambiguous prose: the sentence directly under the h1 on each catalogue.
    const LEADS: Array<[string, RegExp]> = [
      ['app/temples/page.tsx', /Loading temples/],
      ['app/store/page.tsx', /prose-body/],
      ['app/pujas/page.tsx', /prose-body/],
      ['app/priest/page.tsx', /dashboard overview for today/],
    ];
    for (const [rel] of LEADS) {
      const src = code(path.join(WEB, rel));
      const offenders = [...src.matchAll(PROSE_P)]
        .map((m) => m[1]!)
        .filter((cls) => /\btext-lg\b/.test(cls) && !/\bprose-body\b/.test(cls));
      expect(
        offenders,
        `${rel} still leads with text-lg. Body copy on a catalogue page is the same ` +
          'role on every catalogue page; use .prose-body.',
      ).toEqual([]);
    }
    // ...and the priest dashboard's 70+ character body copy is no longer text-xs.
    expect(
      code(path.join(WEB, 'app/priest/page.tsx')),
      'the on-duty explanation is body copy, not metadata — it was text-xs (12.1px)',
    ).toMatch(/prose-body[^"]*"\s*>\s*\{onDuty/);
  });

  it('no NEW oversized prose paragraph is added', () => {
    /*
     * RATCHET. 44 text-lg + 3 text-xl prose paragraphs were measured before
     * this pass; the four catalogue leads are fixed, leaving the rest. Lower
     * this after each sweep. text-sm/text-xs are deliberately NOT ratcheted
     * here: many are legitimate metadata captions and a blind ceiling would
     * push someone to enlarge a timestamp to make CI green.
     */
    const BASELINE = 44;
    expect(
      OFF_SIZE.length,
      `${OFF_SIZE.length} prose paragraphs read larger than the one body size ` +
        `(ceiling ${BASELINE}). Use .prose-body.\n` + OFF_SIZE.slice(0, 30).join('\n'),
    ).toBeLessThanOrEqual(BASELINE);
  });
});
