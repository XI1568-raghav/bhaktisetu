/**
 * [SEO-03 / SEO-09] A segment layout that carries a title must not swallow the
 * brand template on the way past.
 *
 * FOUND WHILE FIXING SEO-09, BY BUILDING. Writing `title: 'Your Organisations'`
 * on app/org/layout.tsx does two things, and only the first is obvious:
 *
 *   1. /org gets the title, resolved through the ROOT template → correct:
 *      "Your Organisations | Darshya".
 *   2. the resolved `title` for that segment becomes
 *      `{ absolute: '…', template: null }`, and every route BELOW it inherits
 *      that null. /org/members then shipped "<title>Organisation Members" with
 *      no brand at all, and /yatra/char-dham shipped "Char Dham Yatra — 11
 *      days" — a page nobody edited, silently de-branded by a metadata export
 *      three directories above it.
 *
 * (Mechanism: next/dist/lib/metadata/resolvers/resolve-title.js — a string
 * title resolves to `{absolute, template: null}`; only `title.template` sets a
 * template for descendants. resolve-metadata.js then reads the NEAREST
 * ancestor template, which is now the null one.)
 *
 * Neither tsc nor title-template.test.ts catches it: the emitted titles are
 * well-formed and none of them ends in the brand, which is the only thing that
 * file asserts. The evidence was `.next/server/app/yatra/char-dham.html`.
 *
 * THE RULE. Any layout that declares a title AND has a route beneath it must
 * declare that title as `{ default, template: TITLE_TEMPLATE }`. A leaf layout
 * — one with no descendant page — has nothing to pass on and may keep the
 * plain string.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR = path.resolve(__dirname, '../../app');
const ROOT_LAYOUT = path.join(APP_DIR, 'layout.tsx');

/** Prose in this repo quotes `title:` and `template:` verbatim. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function collect(dir: string, filename: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'api') continue;
      collect(full, filename, acc);
    } else if (entry.name === filename) {
      acc.push(full);
    }
  }
  return acc;
}

const rel = (f: string) => path.relative(APP_DIR, f).split(path.sep).join('/');

const LAYOUTS = collect(APP_DIR, 'layout.tsx').filter(
  (f) => path.resolve(f) !== path.resolve(ROOT_LAYOUT),
);
const PAGES = collect(APP_DIR, 'page.tsx');

/** A page strictly below this layout's own segment. */
function hasDescendantRoute(layout: string): boolean {
  const seg = path.dirname(path.resolve(layout));
  return PAGES.some((p) => {
    const dir = path.dirname(path.resolve(p));
    return dir !== seg && dir.startsWith(seg + path.sep);
  });
}

/** `title:` at metadata-root level — openGraph/twitter titles are separate. */
const ROOT_TITLE_STRING = /(^|[^\w$.])title\s*:\s*(['"`])/;
const TITLE_OBJECT = /(^|[^\w$.])title\s*:\s*\{/;
const USES_SHARED_TEMPLATE = /template\s*:\s*TITLE_TEMPLATE\b/;

type Row = { file: string; src: string };

const TITLED_LAYOUTS: Row[] = LAYOUTS.map((f) => ({ file: rel(f), src: stripComments(fs.readFileSync(f, 'utf8')) }))
  .filter((r) => ROOT_TITLE_STRING.test(r.src) || TITLE_OBJECT.test(r.src));

const PASS_THROUGH: Row[] = LAYOUTS.filter(hasDescendantRoute)
  .map((f) => ({ file: rel(f), src: stripComments(fs.readFileSync(f, 'utf8')) }))
  .filter((r) => ROOT_TITLE_STRING.test(r.src) || TITLE_OBJECT.test(r.src));

describe('[SEO-03] a titled segment layout does not null the brand template for its children', () => {
  it('the guard is looking at real files', () => {
    // A path or a regex regression that matched nothing would make the
    // assertion below unfailable.
    expect(LAYOUTS.length).toBeGreaterThan(20);
    expect(TITLED_LAYOUTS.length).toBeGreaterThan(10);
    expect(PASS_THROUGH.length).toBeGreaterThan(0);
  });

  it('the root template that everything else inherits still exists', () => {
    expect(stripComments(fs.readFileSync(ROOT_LAYOUT, 'utf8'))).toMatch(USES_SHARED_TEMPLATE);
  });

  it('every layout with a route beneath it re-declares template: TITLE_TEMPLATE', () => {
    const offenders = PASS_THROUGH.filter((r) => !USES_SHARED_TEMPLATE.test(r.src)).map(
      (r) => r.file,
    );

    expect(
      offenders,
      `${offenders.length} segment layout(s) declare a title but no template, which resolves ` +
        'to `template: null` and strips " | Darshya" from every page below them — pages nobody ' +
        'edited. Write `title: { default: …, template: TITLE_TEMPLATE }` and import the constant ' +
        'from lib/seo/title-template.\n' +
        offenders.join('\n'),
    ).toEqual([]);
  });

  it('a layout that re-declares the template imports it rather than retyping the literal', () => {
    // SEO-03's other half: one definition of the format string. Retyping it
    // here is how app/auth/layout.tsx drifted the first time.
    const offenders = TITLED_LAYOUTS.filter((r) => USES_SHARED_TEMPLATE.test(r.src))
      .filter((r) => !/from ['"][^'"]*seo\/title-template['"]/.test(r.src))
      .map((r) => r.file);
    expect(offenders).toEqual([]);
  });
});
