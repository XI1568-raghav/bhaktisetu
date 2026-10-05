/**
 * [PERF-03] THE BRAND FACES ARE SELF-HOSTED, AND THE STACK BEHIND THEM IS
 * MEASURED RATHER THAN ASSUMED.
 *
 * ── WHAT WAS ACTUALLY WRONG AT HEAD, RE-MEASURED 2026-08-28 ───────────────
 *
 * The finding's headline number is STALE and this file says so with evidence.
 * PERF-03 recorded "5,545 of 5,604 measured glyphs paint in Arial while 201.9
 * KB of unused Google woff2 still downloads". Both halves had already been
 * fixed by the 2026-08-12 sweep before this pass started:
 *
 *   - Arial: `--font-body` / `--font-display` (app/globals.css) name
 *     `var(--font-noto-sans)` immediately after the brand face, and Noto Sans
 *     IS downloaded by app/layout.tsx. Nothing has fallen through to Arial
 *     since that landed.
 *   - "201.9 KB unused": `.next/server/next-font-manifest.json` at HEAD lists
 *     TWO preloaded faces for the root layout, 84,008 B combined (48,152 +
 *     35,856), and both of them paint. The unused-bytes half is closed.
 *
 * What was genuinely still broken is the thing the finding's TITLE says: there
 * was not one `@font-face` in the app and `apps/web/public/fonts` did not
 * exist, so all 105 `var(--font-display)` and 142 `font-display` call sites,
 * and every one of the four `H1` archetypes in components/ui/heading-recipe.ts,
 * painted in the fallback. That is what this file now locks down.
 *
 * ── WHERE THE woff2 FILES CAME FROM (no download, no new licence) ─────────
 *
 * The five cuts were ALREADY vendored in this repository and git-tracked since
 * 2026-07-15, at apps/remotion-pitch/public/fonts/ — the pitch reel bundles
 * them so headless Chromium renders the real brand face
 * (apps/remotion-pitch/src/components/FontStyle.tsx). They are copied, byte for
 * byte, into apps/web/public/fonts. No font was fetched from the network, and
 * the licensing decision for these exact files was made by the repo owner when
 * they were committed.
 *
 * ── THE MEASUREMENT THAT DECIDES THE FALLBACK (read this before "optimising")
 *
 * Satoshi's cmap is decoded below, from the shipped woff2, and it does NOT
 * contain U+20B9, the rupee sign. There are 651 literal ₹ in 137 files under
 * app/, components/ and lib/, plus every runtime-formatted price on a
 * marketplace that quotes nothing else. So `var(--font-noto-sans)` sitting
 * behind 'Satoshi' is not decoration and Noto Sans MUST stay preloaded: it is
 * the face that draws the currency symbol of every price, at first paint.
 *
 * The obvious next "win" — `preload: false` on Noto Sans now that Satoshi
 * leads the stack — would therefore make every price on the site paint its ₹
 * one round trip late, after its own digits. The test named
 * `Noto Sans stays preloaded` exists to fail that change, and it decodes the
 * cmap rather than trusting this comment, so the reason cannot go stale.
 *
 * ── WEIGHTS: WHY Satoshi-Medium IS DECLARED `500 600` ─────────────────────
 *
 * Fontshare ships Satoshi as static cuts at 300/400/500/700/900 — there is no
 * 600 — and the three vendored here are 400/500/700. Measured utility usage
 * across app/ + components/ + lib/:
 *
 *     font-semibold (600)  2,499      font-bold   (700)    890
 *     font-medium   (500)  1,420      font-normal (400)     65
 *
 * 600 is the site's most-used weight by a wide margin. Under default CSS font
 * matching a desired weight above 500 searches upward first, so 600 would
 * resolve to 700 and `font-semibold` would become pixel-identical to
 * `font-bold` at 3,389 call sites — the site's own two emphasis levels
 * collapsed into one, and the whole product visibly heavier. Declaring
 * Satoshi-Medium over the range `500 600` instead merges 600 with the rarer
 * `font-medium` and keeps the semibold/bold contrast that carries every CTA
 * and heading. Asserted below so the range is not "tidied" back to `500`.
 *
 * Cabinet Grotesk is deliberately NOT given that range: it is the display face,
 * its only two vendored cuts are 400 and 700, and all four H1 archetypes are
 * `font-semibold` — 600 → 700 is the right answer for a display heading.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const WEB_DIR = path.resolve(__dirname, '..');
const GLOBALS = path.join(WEB_DIR, 'app/globals.css');
const LAYOUT = path.join(WEB_DIR, 'app/layout.tsx');
const PUBLIC_DIR = path.join(WEB_DIR, 'public');

/** CSS has only block comments. globals.css's prose names 'Satoshi',
 *  'Cabinet Grotesk' and the phrase "@font-face" dozens of times, so a scan
 *  that did not strip comments would pass on the documentation alone. */
function stripCssComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Same hazard in layout.tsx, where a long JSX comment discusses the preload
 *  tags this file asserts on. */
function stripTsComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const globalsSrc = stripCssComments(fs.readFileSync(GLOBALS, 'utf8'));
const layoutSrc = stripTsComments(fs.readFileSync(LAYOUT, 'utf8'));

// ── @font-face parsing ─────────────────────────────────────────────────────

type Face = {
  family: string;
  weight: string;
  style: string;
  display: string;
  urls: string[];
  block: string;
};

const faces: Face[] = Array.from(globalsSrc.matchAll(/@font-face\s*\{([^}]*)\}/g)).map((m) => {
  const block = m[1];
  const decl = (name: string) => {
    const d = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i').exec(block);
    return d ? d[1].trim() : '';
  };
  return {
    family: decl('font-family').replace(/^['"]|['"]$/g, ''),
    weight: decl('font-weight'),
    style: decl('font-style'),
    display: decl('font-display'),
    urls: Array.from(block.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)).map((u) => u[1]),
    block,
  };
});

/** The declared value of a custom property at the TOP LEVEL of a rule — not a
 *  nested one. `html[lang="hi"]` re-declares --font-body and --font-display to
 *  the Devanagari stack; reading that copy instead of the base one would test
 *  the wrong thing entirely. Both base declarations are the FIRST occurrence
 *  in the file (@theme, then :root), and the html[lang] override comes later. */
function stackFor(name: string): string {
  const m = new RegExp(`^\\s*${name}\\s*:\\s*([^;]+);`, 'm').exec(globalsSrc);
  if (!m) throw new Error(`${name} is not declared in globals.css`);
  return m[1].trim();
}

/** The literal family name a stack leads with, e.g. `'Satoshi'` -> Satoshi. */
function leadFamily(name: string): string | null {
  const m = /^['"]([^'"]+)['"]/.exec(stackFor(name));
  return m ? m[1] : null;
}

// ── a minimal woff2 reader, enough to reach the cmap ───────────────────────
// woff2 stores every table in one brotli stream, concatenated in table-
// directory order with no padding. cmap is never transformed, so its slice is
// [sum of preceding lengths, +origLength).

const WOFF2_KNOWN_TAGS = [
  'cmap','head','hhea','hmtx','maxp','name','OS/2','post','cvt ','fpgm','glyf','loca','prep',
  'CFF ','VORG','EBDT','EBLC','gasp','hdmx','kern','LTSH','PCLT','VDMX','vhea','vmtx','BASE',
  'GDEF','GPOS','GSUB','EBSC','JSTF','MATH','CBDT','CBLC','COLR','CPAL','SVG ','sbix','acnt',
  'avar','bdat','bloc','bsln','cvar','fdsc','feat','fmtx','fvar','gvar','hsty','just','lcar',
  'mort','morx','opbd','prop','trak','Zapf','Silf','Glat','Gloc','Feat','Sill',
];

function readBase128(b: Buffer, p: number): [number, number] {
  let v = 0;
  for (let i = 0; i < 5; i++) {
    const byte = b[p++];
    v = ((v << 7) | (byte & 0x7f)) >>> 0;
    if ((byte & 0x80) === 0) return [v, p];
  }
  throw new Error('malformed UIntBase128');
}

/** Sorted, inclusive [start,end] codepoint ranges the font can actually draw. */
function cmapRanges(file: string): Array<[number, number]> {
  const b = fs.readFileSync(file);
  if (b.toString('latin1', 0, 4) !== 'wOF2') throw new Error(`${file} is not a woff2`);
  const numTables = b.readUInt16BE(12);
  const totalCompressed = b.readUInt32BE(20);

  let p = 48;
  const dir: Array<{ tag: string; len: number }> = [];
  for (let i = 0; i < numTables; i++) {
    const flags = b[p++];
    const idx = flags & 0x3f;
    const xformVersion = (flags >> 6) & 0x03;
    let tag: string;
    if (idx === 63) {
      tag = b.toString('latin1', p, p + 4);
      p += 4;
    } else {
      tag = WOFF2_KNOWN_TAGS[idx];
    }
    let origLength: number;
    [origLength, p] = readBase128(b, p);
    // glyf/loca invert the convention: version 0 means transformed there and
    // null-transform everywhere else.
    const transformed = tag === 'glyf' || tag === 'loca' ? xformVersion === 0 : xformVersion !== 0;
    let len = origLength;
    if (transformed) {
      let t: number;
      [t, p] = readBase128(b, p);
      len = t;
    }
    dir.push({ tag, len });
  }

  const stream = zlib.brotliDecompressSync(b.subarray(p, p + totalCompressed));
  let off = 0;
  let cmap: Buffer | null = null;
  for (const e of dir) {
    if (e.tag === 'cmap') {
      cmap = stream.subarray(off, off + e.len);
      break;
    }
    off += e.len;
  }
  if (!cmap) throw new Error(`${file} has no cmap table`);

  let best: { o: number; fmt: number; score: number } | null = null;
  const n = cmap.readUInt16BE(2);
  for (let i = 0; i < n; i++) {
    const rec = 4 + i * 8;
    const plat = cmap.readUInt16BE(rec);
    const enc = cmap.readUInt16BE(rec + 2);
    const o = cmap.readUInt32BE(rec + 4);
    if (!(plat === 0 || (plat === 3 && (enc === 1 || enc === 10)))) continue;
    const fmt = cmap.readUInt16BE(o);
    const score = fmt === 12 ? 2 : fmt === 4 ? 1 : 0;
    if (score && (!best || score > best.score)) best = { o, fmt, score };
  }
  if (!best) throw new Error(`${file} has no usable Unicode cmap subtable`);

  const ranges: Array<[number, number]> = [];
  if (best.fmt === 4) {
    const t = best.o;
    const segX2 = cmap.readUInt16BE(t + 6);
    const endBase = t + 14;
    const startBase = endBase + segX2 + 2;
    const deltaBase = startBase + segX2;
    const rangeOffBase = deltaBase + segX2;
    for (let i = 0; i < segX2 / 2; i++) {
      const end = cmap.readUInt16BE(endBase + i * 2);
      const start = cmap.readUInt16BE(startBase + i * 2);
      if (start > end || start === 0xffff) continue;
      const ro = cmap.readUInt16BE(rangeOffBase + i * 2);
      const delta = cmap.readInt16BE(deltaBase + i * 2);
      let runStart: number | null = null;
      for (let c = start; c <= end; c++) {
        let gid: number;
        if (ro === 0) {
          gid = (c + delta) & 0xffff;
        } else {
          const gi = rangeOffBase + i * 2 + ro + (c - start) * 2;
          gid = gi + 1 < cmap.length ? cmap.readUInt16BE(gi) : 0;
        }
        // gid 0 is .notdef — the segment claims the code but cannot draw it.
        if (gid !== 0) {
          if (runStart === null) runStart = c;
        } else if (runStart !== null) {
          ranges.push([runStart, c - 1]);
          runStart = null;
        }
      }
      if (runStart !== null) ranges.push([runStart, end]);
    }
  } else {
    const t = best.o;
    const groups = cmap.readUInt32BE(t + 12);
    for (let i = 0; i < groups; i++) {
      const g = t + 16 + i * 12;
      ranges.push([cmap.readUInt32BE(g), cmap.readUInt32BE(g + 4)]);
    }
  }
  return ranges;
}

const coversCp = (ranges: Array<[number, number]>, cp: number) =>
  ranges.some(([a, z]) => cp >= a && cp <= z);

// ── the assertions ─────────────────────────────────────────────────────────

describe('[PERF-03] the brand faces named at the head of every stack are self-hosted', () => {
  it('the scan is not vacuous — both stacks still lead with a literal family', () => {
    expect(leadFamily('--font-body'), '--font-body no longer leads with a family name').toBeTruthy();
    expect(
      leadFamily('--font-display'),
      '--font-display no longer leads with a family name',
    ).toBeTruthy();
  });

  it('every family a stack leads with has at least one @font-face behind it', () => {
    const declared = new Set(faces.map((f) => f.family));
    const orphans = ['--font-body', '--font-display']
      .map((v) => ({ v, fam: leadFamily(v) }))
      .filter((x) => x.fam && !declared.has(x.fam))
      .map((x) => `${x.v} leads with '${x.fam}' — no @font-face declares it`);
    expect(
      orphans,
      'A family name at the head of a stack with no @font-face behind it is ' +
        'invisible: every glyph silently paints in the next entry, which is how ' +
        'PERF-03 went unnoticed for weeks. Declare it or take it out of the stack.',
    ).toEqual([]);
  });

  it('every @font-face src resolves to a real woff2 file on disk', () => {
    expect(faces.length, 'no @font-face rules found at all').toBeGreaterThan(0);
    const broken: string[] = [];
    for (const f of faces) {
      // CWV-01: '<face> Fallback' is a local() metric-override face, not a download.
      if (/ Fallback$/.test(f.family)) continue;
      expect(f.urls.length, `@font-face for '${f.family}' declares no src url`).toBeGreaterThan(0);
      for (const u of f.urls) {
        if (!u.startsWith('/')) {
          broken.push(`${f.family} ${f.weight}: '${u}' is not a root-relative path`);
          continue;
        }
        const abs = path.join(PUBLIC_DIR, u);
        if (!fs.existsSync(abs)) {
          broken.push(`${f.family} ${f.weight}: public${u} does not exist`);
          continue;
        }
        const b = fs.readFileSync(abs);
        if (b.toString('latin1', 0, 4) !== 'wOF2') {
          broken.push(`${f.family} ${f.weight}: public${u} is not a woff2`);
        } else if (b.readUInt32BE(8) !== b.length) {
          // The woff2 header carries the total file length; a truncated or
          // text-mangled binary fails here rather than at first paint.
          broken.push(
            `${f.family} ${f.weight}: public${u} header says ${b.readUInt32BE(8)} B, file is ${b.length} B`,
          );
        }
      }
    }
    expect(broken, 'a font-face pointing at nothing is worse than no font-face').toEqual([]);
  });

  it('no @font-face reaches a third-party origin', () => {
    const remote = faces
      .flatMap((f) => f.urls.map((u) => `${f.family}: ${u}`))
      .filter((s) => /https?:\/\/|\/\//.test(s.split(': ')[1] ?? ''));
    expect(
      remote,
      'api.fontshare.com answering 200 with a 162-byte comment is the whole of ' +
        'PERF-03. A self-hosted face must not depend on anyone else being up.',
    ).toEqual([]);
  });

  it('every face swaps rather than blocking paint', () => {
    const blocking = faces
      .filter((f) => f.display !== 'swap')
      .map((f) => `${f.family} ${f.weight}: font-display: ${f.display || '(unset)'}`);
    expect(
      blocking,
      'font-display defaults to `auto`, which most browsers treat as `block` — ' +
        'up to 3 s of invisible text on the LCP element.',
    ).toEqual([]);
  });
});

describe('[PERF-03] the vendored cuts cover the weights the site actually writes', () => {
  const weightsOf = (family: string) =>
    faces.filter((f) => f.family === family).map((f) => f.weight);

  /** CSS font matching for a desired weight, restricted to what is declared. */
  function resolves(family: string, desired: number): boolean {
    return weightsOf(family).some((w) => {
      const parts = w.split(/\s+/).map(Number).filter((n) => !Number.isNaN(n));
      if (parts.length === 0) return false;
      const lo = parts[0];
      const hi = parts.length > 1 ? parts[1] : parts[0];
      return desired >= lo && desired <= hi;
    });
  }

  it('Satoshi ships the three vendored cuts', () => {
    expect(weightsOf('Satoshi').length, "no @font-face declares 'Satoshi'").toBe(3);
  });

  it('Cabinet Grotesk ships the two vendored cuts', () => {
    expect(weightsOf('Cabinet Grotesk').length, "no @font-face declares 'Cabinet Grotesk'").toBe(2);
  });

  it('font-semibold (600) — the site\'s most-used weight — has a real face on the body stack', () => {
    // 2,499 call sites. Without an @font-face whose range contains 600, CSS
    // matching searches upward and Satoshi Bold answers, making font-semibold
    // and font-bold identical at 3,389 call sites. See the header.
    expect(
      resolves('Satoshi', 600),
      "Satoshi-Medium must be declared `font-weight: 500 600`. Fontshare ships no " +
        '600 cut, and letting 600 fall to 700 collapses the site\'s own semibold/' +
        'bold contrast across 3,389 call sites.',
    ).toBe(true);
  });

  for (const w of [400, 500, 700]) {
    it(`Satoshi resolves weight ${w} to a declared face`, () => {
      expect(resolves('Satoshi', w)).toBe(true);
    });
  }

  for (const w of [400, 700]) {
    it(`Cabinet Grotesk resolves weight ${w} to a declared face`, () => {
      expect(resolves('Cabinet Grotesk', w)).toBe(true);
    });
  }
});

describe('[PERF-03] the two first-paint cuts are preloaded, and nothing else is', () => {
  const fontPreloads = layoutSrc
    .split(/(?=<link\b)/)
    .filter((tag) => /rel\s*=\s*["']preload["']/.test(tag) && /as\s*=\s*["']font["']/.test(tag))
    .map((tag) => ({
      href: (/href\s*=\s*["']([^"']+)["']/.exec(tag) ?? [])[1] ?? '',
      hasCrossOrigin: /crossOrigin/.test(tag),
      type: (/type\s*=\s*["']([^"']+)["']/.exec(tag) ?? [])[1] ?? '',
    }));

  it('preloads exactly the body Regular and the display Bold', () => {
    expect(
      fontPreloads.map((p) => p.href).sort(),
      'Body copy renders in Satoshi Regular and every H1 archetype in ' +
        'components/ui/heading-recipe.ts is font-semibold on the display face, ' +
        'which resolves to Cabinet Grotesk Bold. Those two paint the first ' +
        'viewport on every route; the other three cuts must stay on-demand, ' +
        'because a preload fires on all ~1,785 routes whether or not they use it.',
    ).toEqual(['/fonts/CabinetGrotesk-Bold.woff2', '/fonts/Satoshi-Regular.woff2']);
  });

  it('each font preload carries crossOrigin and the woff2 type', () => {
    const bad = fontPreloads
      .filter((p) => !p.hasCrossOrigin || p.type !== 'font/woff2')
      .map((p) => `${p.href} crossOrigin=${p.hasCrossOrigin} type=${p.type || '(unset)'}`);
    expect(
      bad,
      'Font requests are always CORS-mode, same-origin included. A preload ' +
        'without crossOrigin is not matched by the real request and the file is ' +
        'downloaded TWICE.',
    ).toEqual([]);
  });

  it('every preloaded href exists in public/', () => {
    const missing = fontPreloads
      .map((p) => p.href)
      .filter((h) => !fs.existsSync(path.join(PUBLIC_DIR, h)));
    expect(missing, 'a preload for a 404 is a wasted request in the critical path').toEqual([]);
  });
});

describe('[PERF-03] the fallback behind Satoshi is load-bearing, and measured', () => {
  const satoshi = path.join(PUBLIC_DIR, 'fonts/Satoshi-Regular.woff2');

  it("Satoshi genuinely cannot draw ₹ — this is read from the shipped font, not assumed", () => {
    const ranges = cmapRanges(satoshi);
    // Sanity: the decode produced a real character set before anything is
    // concluded from an absence.
    expect(coversCp(ranges, 0x41), 'cmap decode failed — Satoshi has no "A"').toBe(true);
    expect(coversCp(ranges, 0x20ac), 'cmap decode failed — Satoshi has no €').toBe(true);
    expect(
      coversCp(ranges, 0x20b9),
      'Satoshi HAS gained the rupee sign. If a cut with U+20B9 was vendored, ' +
        'this whole describe block can be reconsidered — but re-read it first: ' +
        'the Noto Sans preload below is justified by this absence.',
    ).toBe(false);
  });

  it('--font-body names a downloaded family immediately behind Satoshi', () => {
    const stack = stackFor('--font-body');
    expect(
      /^'Satoshi',\s*var\(--font-noto-sans\)/.test(stack),
      `--font-body = ${stack}. With 651 literal ₹ in 137 files, the entry ` +
        'directly behind Satoshi is what draws the currency symbol of every ' +
        'price on the site. It has to be a real webfont, not system-ui.',
    ).toBe(true);
  });

  it('Noto Sans stays preloaded, because it draws every ₹ on the site', () => {
    // Match the `const notoSans = localFont({...})` call only — the `\s*=`
    // anchor cannot match `notoSansDevanagari`, which is preload:false on purpose.
    const call = /\bconst notoSans\s*=\s*localFont\(\{([\s\S]*?)\n\}\)/.exec(layoutSrc);
    expect(call, 'the notoSans localFont() loader call moved or was renamed').toBeTruthy();
    expect(
      /preload\s*:\s*false/.test(call![1]),
      'Demoting Noto Sans to on-demand looks free now that Satoshi leads the ' +
        'stack — it is not. Satoshi has no U+20B9 (asserted above), so every ' +
        'price would paint its ₹ a round trip after its own digits.',
    ).toBe(false);
  });
});
