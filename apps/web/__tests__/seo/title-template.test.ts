// [SEO-03] 1,043 production pages rendered the site name twice (prod sweep 2026-08-12).
//
//   .next/server/app/aarti/vishnu-aarti.html
//   <title>Vishnu Aarti (Jai Jagdish Hare Vishnu) Lyrics — Hindi + English +
//          Meaning — Darshya | Darshya</title>          (93 chars)
//
// app/layout.tsx declares `title.template = "%s | Darshya"`, and 61 route files
// ALSO hard-coded the brand at the end of their own title string. Next applies
// the template to every page-level title that is a plain string, so the brand
// landed twice. Google truncates at ~60 characters, so the ~11 wasted characters
// came straight out of the differentiating tail — "Meaning", "Benefits",
// "Vidhi" — on the 1,100 long-tail content pages that are the organic
// acquisition engine.
//
// The discrimination that makes this test worth having: `openGraph.title` and
// `twitter.title` are resolved with a SEPARATE template (see
// titleTemplates.openGraph in next/dist/lib/metadata/resolve-metadata.js), which
// is null here — so a brand suffix in those blocks is applied exactly once and
// is CORRECT. A naive grep for /Darshya['"]/ would "fix" 28 correct titles into
// brandless ones. So parse brace depth and check only the metadata-root title.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR = path.resolve(__dirname, '../../app');
const LAYOUT = path.join(APP_DIR, 'layout.tsx');

/** Brace depth before each char, with strings and comments masked out. */
function analyse(src: string) {
  const depth = new Array<number>(src.length).fill(0);
  const masked = src.split('');
  let d = 0;
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') {
        depth[i] = d;
        masked[i] = ' ';
        i++;
      }
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
        depth[i] = d;
        masked[i] = ' ';
        i++;
      }
      depth[i] = d;
      masked[i] = ' ';
      i++;
      depth[i] = d;
      masked[i] = ' ';
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      const q = c;
      depth[i] = d;
      i++;
      while (i < src.length) {
        if (src[i] === '\\') {
          depth[i] = d;
          masked[i] = ' ';
          depth[i + 1] = d;
          masked[i + 1] = ' ';
          i += 2;
          continue;
        }
        if (src[i] === q) break;
        depth[i] = d;
        masked[i] = ' ';
        i++;
      }
      depth[i] = d;
      i++;
      continue;
    }
    depth[i] = d;
    if (c === '{') d++;
    else if (c === '}') d--;
    i++;
  }
  return { depth, masked: masked.join('') };
}

/** The object key whose `{` opens the block containing `at`, or null at the
 *  root of a `= {` / `return {` object literal. */
function enclosingKey(src: string, masked: string, depth: number[], at: number): string | null {
  const target = depth[at] - 1;
  for (let j = at - 1; j >= 0; j--) {
    if (masked[j] === '{' && depth[j] === target) {
      const m = /([A-Za-z_$][\w$]*)\s*:\s*$/.exec(src.slice(Math.max(0, j - 60), j));
      return m ? m[1] : null;
    }
  }
  return null;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (e.name === 'page.tsx' || e.name === 'layout.tsx') acc.push(full);
  }
  return acc;
}

const FILES = walk(APP_DIR);
const rel = (f: string) => path.relative(APP_DIR, f).split(path.sep).join('/');

// `title: '…'` / `title: "…"` / `title: `…`` and `const title = '…'`.
const TITLE_PROP = /(^|[^\w$.])title\s*:\s*(['"`])((?:[^\\]|\\.)*?)\2/g;
const TITLE_CONST = /\bconst\s+title\s*=\s*(['"`])((?:[^\\]|\\.)*?)\1/g;

/**
 * A brand tail Next's template would duplicate. Three shapes, all seen in prod:
 *   "… Lyrics — Hindi + English + Meaning — Darshya"   separator + brand
 *   "List your temple on Darshya"                      brand ends the sentence
 *   "… — Darshya blog" / "… | Darshya Help"            brand + one trailing word
 *
 * Deliberately NOT flagged: the brand as the SUBJECT of the page — "About
 * Darshya · The story…", "Why Darshya — vs Sri Mandir…", "Darshya UK — Pujas…".
 * Those read correctly and stripping them would damage the copy; the defect is
 * a brand SUFFIX bolted onto a title the template is about to brand again.
 */
const BRAND_TAIL = /\bDarshya\s*$|[—|·–-]\s*Darshya\s+\S+\s*$/;

type Hit = { file: string; line: number; value: string; scope: string | null };

function collectHits(): { root: Hit[]; nested: Hit[] } {
  const root: Hit[] = [];
  const nested: Hit[] = [];
  for (const file of FILES) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes('Darshya')) continue;
    const { depth, masked } = analyse(src);

    TITLE_PROP.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = TITLE_PROP.exec(src))) {
      const value = m[3];
      if (!BRAND_TAIL.test(value)) continue;
      const at = m.index + m[1].length;
      const scope = enclosingKey(src, masked, depth, at);
      const hit: Hit = { file: rel(file), line: src.slice(0, at).split('\n').length, value, scope };
      if (scope === 'openGraph' || scope === 'twitter') nested.push(hit);
      else root.push(hit);
    }

    TITLE_CONST.lastIndex = 0;
    while ((m = TITLE_CONST.exec(src))) {
      const value = m[2];
      if (!BRAND_TAIL.test(value)) continue;
      root.push({ file: rel(file), line: src.slice(0, m.index).split('\n').length, value, scope: 'const title' });
    }
  }
  return { root, nested };
}

const { root, nested } = collectHits();

describe('[SEO-03] the site name is appended once, by the root template', () => {
  it('the root layout still declares the template that does the appending', () => {
    // If this is ever removed, every stripped title below silently loses its
    // brand entirely — the opposite failure, equally invisible.
    expect(fs.readFileSync(LAYOUT, 'utf8')).toMatch(/template\s*:\s*["'`]%s \| Darshya["'`]/);
  });

  it('no page/layout metadata title ends in the brand', () => {
    const offenders = root
      .filter((h) => BRAND_TAIL.test(h.value))
      .map((h) => `${h.file}:${h.line} [${h.scope ?? 'metadata root'}] ${JSON.stringify(h.value)}`);

    expect(
      offenders,
      `${offenders.length} titles get " | Darshya" appended on top of a brand they already ` +
        'carry, producing "… — Darshya | Darshya" and eating ~11 chars of a ~60-char SERP budget.',
    ).toEqual([]);
  });

  it('leaves openGraph/twitter titles alone — those are NOT templated and are correct', () => {
    // Asserted as a live count so a future "cleanup" that strips these shows up
    // here as a change rather than passing silently.
    expect(nested.length).toBeGreaterThan(0);
    for (const h of nested) {
      expect(['openGraph', 'twitter']).toContain(h.scope);
    }
  });
});
