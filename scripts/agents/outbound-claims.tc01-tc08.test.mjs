import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs, { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  claimStrings,
  HAS_80G,
  HAS_PANDIT_VETTING,
  NO_80G_DISCLOSURE,
} from './_claims.mjs';

/**
 * TC-01 (P0) and TC-08 (P1) — the surfaces outside every previous denominator.
 *
 * Six guards were written for these two findings across five waves. Every one
 * of them walks exactly one app directory:
 *
 *   apps/web/__tests__/tc01-80g-repo-wide-gate.test.tsx   WEB_ROOT, EXTS = .ts .tsx .json
 *   apps/api/src/lib/api-80g-repo-wide-gate.tc01.test.ts  API_ROOT
 *   apps/mobile/lib/__tests__/eighty-g-and-nri-premium.tc01-tc03.test.ts
 *   apps/web/__tests__/pandit-vetting-claim.tc08.test.tsx WEB_ROOT
 *   apps/api/src/lib/pandit-vetting.tc08.test.ts          API_ROOT
 *   apps/mobile/lib/__tests__/pandit-vetting.tc08.test.ts MOBILE
 *
 * So `scripts/`, `apps/remotion-pitch/`, `apps/admin/`, `apps/web/public/` and
 * `apps/web/scripts/` were never in any denominator, and neither were the
 * extensions `.mjs`, `.sh`, `.vtt`, `.md` or `.png`. What was still live there
 * when this file was written, measured rather than inferred:
 *
 *   1. `/og/default.png` — the og:image on ~647 route files — carried a pill
 *      reading "80G Receipts". Fetched from production 2026-09-01:
 *        curl -s -o prod.png https://darshya.online/og/default.png   -> 200, 62645 B
 *        md5  prod.png == md5 apps/web/public/og/default.png
 *             5aa9a58985cd948b8c3b4480192bbd2c
 *      i.e. the committed raster was byte-for-byte the live one. (That half is
 *      pinned by apps/web/__tests__/tc01-og-card-80g.test.ts, which lives in
 *      the web workspace so it can share that project's runner.)
 *
 *   2. Twelve generators under `scripts/agents/` asserted an 80G deduction, a
 *      "verified pandit", or both — in copy that is SENT, not merely stored:
 *      `onboarding-drip.mjs` and `dormant-reactivation.mjs` both post to
 *      https://api.resend.com/emails when RESEND_API_KEY is set.
 *
 *   3. The pitch reel's caption track still read "An 80G receipt to your PAN."
 *      and "Tax-deductible giving." after an earlier wave had corrected those
 *      exact two sentences in the voice-over script the captions transcribe.
 *
 *   4. Five `scripts/sales/**` markdown templates a human copies into a real
 *      message, one of which told a Bengaluru temple trust that "Bhaktisetu
 *      handles donee 80G registration + PAN compliance".
 *
 * Why both claims are false, in code rather than in policy:
 *   - `apps/web/lib/company.ts` `donationLegal.HAS_80G_VERIFIED` is false with
 *     `pan` and `eightyGNumber` null; `apps/api/src/lib/pdf-receipt.ts`
 *     `is80GEligible()` requires BOTH a donee 80G number AND a donee PAN, read
 *     from `gaushala_profiles.regn_80g` / `.pan`, SELECTed in one place and
 *     written by no route in the repository.
 *   - Nothing promotes a `Priest` to verified: `apps/api/src/routes/priest.ts`
 *     writes `'pending'`, and `isVerified: true` appears only in two seeds.
 *
 * Every case below fails against the tree as it stood before this change.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const R = (...p) => path.join(REPO_ROOT, ...p);
const read = (rel) => fs.readFileSync(R(rel), 'utf8');

// --------------------------------------------------------------- the walker

/**
 * Exactly the roots the six existing guards cannot reach. `apps/web` and
 * `apps/api` and `apps/mobile` are deliberately absent: they are covered, and
 * duplicating them here would hide this walk's real denominator behind theirs.
 */
const ROOTS = [
  'scripts',
  'apps/remotion-pitch',
  'apps/admin',
  'apps/web/public',
  'apps/web/scripts',
];

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.next',
  '.turbo',
  'coverage',
  'out',
  'build',
  '__tests__',
  'test-results',
  'playwright-report',
  // 286 roadmap item files: a planning backlog, not published copy.
  'roadmap',
]);

/** Every extension that can carry a sentence a human will read. */
const EXTS = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.html', '.txt', '.vtt', '.sh', '.md'];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(path.join(dir, e.name), out);
    } else if (EXTS.some((x) => e.name.endsWith(x))) {
      if (e.name.includes('.test.') || e.name.includes('.spec.')) continue;
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

const rel = (abs) => path.relative(REPO_ROOT, abs).split(path.sep).join('/');

/**
 * Comments explaining WHY a claim was removed must quote the claim, so a raw
 * scan would match its own documentation and pass while the copy still shipped.
 * That failure mode has already cost this engagement several retracted claims.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/^[ \t]*#(?!#).*$/gm, ''); // shell / yaml comments
}

/** Case-sensitive on the G: `weight: '80g'` is 80 grams of prasad. */
const EIGHTY_G = /80\s?G/;

const VETTING_CLAIM =
  /verified (pandit|priest|astrolog)|certified pandit|vedic certified|30-day probation|two temple references|per-pandit trust score/i;

/**
 * Files that name one of the claims in live text with no import of a gate, each
 * for a reason that is not "we promise it". Anything outside this map is a
 * regression: a new outbound surface has published the claim ungated.
 */
const ALLOWED_UNGATED = {
  'scripts/agents/seo-audit.mjs':
    'a keyword being tracked in search results ("gaushala donation 80G"), not a claim we make',
  'scripts/og-default.build.json':
    'the OG build manifest — its `has80G` field records the gate state, it does not assert it',
  'apps/remotion-pitch/src/DarshyaPitch.tsx':
    'two trailing // shot annotations naming the beat; the drawn copy is gated in src/claims.ts',
  'apps/web/scripts/pitch-vo-script.txt':
    'the voice-over script itself — the caption tracks are asserted equal to it below',
  'apps/remotion-pitch/public/pitch/audio/vo.vtt':
    'the caption track — asserted below to be a faithful transcript of that same script',
};

function ungatedFiles() {
  const out = [];
  for (const root of ROOTS) {
    for (const abs of walk(R(root))) {
      const raw = fs.readFileSync(abs, 'utf8');
      const live = stripComments(raw);
      if (!EIGHTY_G.test(live) && !VETTING_CLAIM.test(live)) continue;
      const gated =
        /from ['"][^'"]*_claims\.mjs['"]/.test(raw) ||
        /from ['"][^'"]*\/claims['"]/.test(raw) ||
        raw.includes('HAS_80G_VERIFIED');
      if (!gated) out.push(rel(abs));
    }
  }
  return out.sort();
}

describe('TC-01/TC-08 — the walk actually reaches what the other six guards cannot', () => {
  const walked = ROOTS.flatMap((r) => walk(R(r))).map(rel);

  it('collects a real denominator, not an empty one', () => {
    // A walk that returned nothing would make every negative below vacuous.
    expect(walked.length).toBeGreaterThan(150);
  });

  it('includes the five extensions and roots no previous denominator covered', () => {
    for (const f of [
      'scripts/build-og-default.mjs',
      'scripts/agents/onboarding-drip.mjs',
      'scripts/sales/outreach/temple-bengaluru-v1.md',
      'apps/web/scripts/stitch-pitch-video.sh',
      'apps/remotion-pitch/public/pitch/audio/vo.vtt',
      'apps/admin/app/donations-export/page.tsx',
    ]) {
      expect(walked, `${f} missing from the walk`).toContain(f);
    }
  });

  it('leaves only the justified exceptions ungated', () => {
    // Computed, not hardcoded: another lane REMOVING a claim from an
    // allow-listed file must not fail this. Adding a new ungated one still does.
    const stillNamed = Object.keys(ALLOWED_UNGATED).filter((f) => {
      if (!fs.existsSync(R(f))) return false;
      const live = stripComments(fs.readFileSync(R(f), 'utf8'));
      return EIGHTY_G.test(live) || VETTING_CLAIM.test(live);
    });
    expect(ungatedFiles()).toEqual(stillNamed.sort());
  });

  it('the exception list is justified, not a dumping ground', () => {
    expect(Object.keys(ALLOWED_UNGATED).length).toBeLessThanOrEqual(6);
    for (const [f, why] of Object.entries(ALLOWED_UNGATED)) {
      expect(fs.existsSync(R(f)), `${f} missing`).toBe(true);
      expect(why.length).toBeGreaterThan(25);
    }
  });
});

describe('TC-01/TC-08 — the gate cannot drift from the owner flags', () => {
  it('reads HAS_80G out of apps/web/lib/company.ts rather than mirroring it', () => {
    const m = /HAS_80G_VERIFIED:\s*(true|false)/.exec(read('apps/web/lib/company.ts'));
    expect(m?.[1], 'HAS_80G_VERIFIED not found in company.ts').toBeDefined();
    expect(HAS_80G).toBe(m[1] === 'true');
    expect(read('apps/web/lib/company.ts')).toMatch(/eightyGNumber:\s*null/);
  });

  it('reads HAS_PANDIT_VETTING out of apps/api/src/lib/pandit-vetting.ts', () => {
    const m = /HAS_PANDIT_VETTING\s*=\s*(true|false)/.exec(
      read('apps/api/src/lib/pandit-vetting.ts'),
    );
    expect(m?.[1], 'HAS_PANDIT_VETTING not found').toBeDefined();
    expect(HAS_PANDIT_VETTING).toBe(m[1] === 'true');
  });

  it('the disclosure is byte-identical to the one apps/api stamps', () => {
    const api = read('apps/api/src/lib/eighty-g.ts');
    // Reconstruct the concatenated literal from the API gate and compare.
    const parts = /NO_80G_DISCLOSURE =\s*([\s\S]*?);\n/.exec(api)?.[1] ?? '';
    const joined = [...parts.matchAll(/'([^']*)'/g)].map((x) => x[1]).join('');
    expect(joined.length).toBeGreaterThan(120);
    expect(NO_80G_DISCLOSURE).toBe(joined);
  });
});

describe('TC-01/TC-08 — it is a gate, not a deletion', () => {
  const off = claimStrings({ has80G: false, hasPanditVetting: false });
  const on = claimStrings({ has80G: true, hasPanditVetting: true });

  it('promises nothing while the registrations are missing', () => {
    for (const [k, v] of Object.entries(off)) {
      if (typeof v !== 'string') continue;
      // A denial has to name 80G in order to deny it; a promise must not.
      const isDenial = /not a tax-exemption certificate|no Section 80G registration|no verification badge/i.test(v);
      if (isDenial) continue;
      expect(EIGHTY_G.test(v), `${k} still promises 80G: ${v}`).toBe(false);
      expect(VETTING_CLAIM.test(v), `${k} still claims vetting: ${v}`).toBe(false);
    }
    expect(off.withEightyG('an 80G receipt')).toBe('');
    expect(off.verifiedNoun('pandits')).toBe('pandits');
    expect(off.RECEIPT_NOUN).toBe('donation receipt');
  });

  it('returns every sentence unchanged the day both flags flip', () => {
    expect(on.withEightyG('an 80G receipt')).toBe('an 80G receipt');
    expect(on.verifiedNoun('pandits')).toBe('verified pandits');
    expect(on.RECEIPT_NOUN).toBe('80G receipt');
    expect(on.RECEIPT_NOUN_TITLE).toBe('80G Receipt');
    expect(on.DONATION_RECEIPT_LINE).toMatch(/80G certificate/);
    expect(on.PANDIT_TRUST_LINE).toMatch(/two temple references/);
    expect(on.PANDIT_TRUST_SHORT).toBe('Verified pandits');
    expect(on.SUPPLY_BADGE_LINE).toMatch(/Verified pandits rank above/);
  });

  it('the two states actually differ, so neither branch is dead', () => {
    const differing = Object.keys(off).filter(
      (k) => typeof off[k] === 'string' && off[k] !== on[k],
    );
    expect(differing.length).toBeGreaterThanOrEqual(7);
  });
});

describe('TC-01 — the pitch reel caption track transcribes the voice-over script', () => {
  const SCRIPT = 'apps/web/scripts/pitch-vo-script.txt';
  /** The tracked copy — the one Remotion actually bundles via staticFile(). */
  const SHIPPED_VTT = 'apps/remotion-pitch/public/pitch/audio/vo.vtt';
  /**
   * `apps/web/scripts/build/` is gitignored (.gitignore:62), so its copy is a
   * local render artefact that a fresh clone will not have. It was also stale,
   * so it is corrected and checked HERE ONLY IF PRESENT — asserting on it
   * unconditionally would make this suite fail on any machine that has never
   * run stitch-pitch-video.sh.
   */
  const LOCAL_VTT = 'apps/web/scripts/build/vo.vtt';
  const VTTS = [SHIPPED_VTT, ...(existsSync(R(LOCAL_VTT)) ? [LOCAL_VTT] : [])];

  function cueText(vtt) {
    return vtt
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && l !== 'WEBVTT' && !/^\d+$/.test(l) && !l.includes('-->'))
      .join(' ');
  }

  it('the script no longer promises a deduction', () => {
    const s = read(SCRIPT);
    expect(s.length).toBeGreaterThan(400);
    expect(s).not.toMatch(EIGHTY_G);
    expect(s).not.toMatch(/tax[- ]deductible/i);
  });

  for (const v of VTTS) {
    it(`${v} is a faithful transcript, so a script fix cannot leave a stale caption`, () => {
      const cues = cueText(read(v));
      expect(cues.length).toBeGreaterThan(400);
      expect(cues).toBe(read(SCRIPT).trim());
      expect(cues).not.toMatch(EIGHTY_G);
      expect(cues).not.toMatch(/tax[- ]deductible/i);
    });
  }

  it('the local render artefact, when present, matches the tracked copy', () => {
    if (!existsSync(R(LOCAL_VTT))) return; // never rendered on this machine
    expect(read(LOCAL_VTT)).toBe(read(SHIPPED_VTT));
  });
});

describe('TC-01 — the burned-in reel captions are read from the owner flag', () => {
  const sh = read('apps/web/scripts/stitch-pitch-video.sh');

  it('no make_clip call hard-codes an 80G caption', () => {
    const calls = sh.match(/^make_clip .*$/gm) ?? [];
    expect(calls.length).toBeGreaterThan(8);
    for (const c of calls) expect(EIGHTY_G.test(c), c).toBe(false);
  });

  it('it derives the caption from company.ts and refuses if the flag is missing', () => {
    expect(sh).toMatch(/COMPANY_TS="apps\/web\/lib\/company\.ts"/);
    expect(sh).toMatch(/HAS_80G_VERIFIED:\[\[:space:\]\]\*true/);
    expect(sh).toMatch(/HAS_80G_VERIFIED:\[\[:space:\]\]\*false/);
    expect(sh).toMatch(/refusing to burn a tax claim into video/);
  });
});

describe('TC-01/TC-08 — the support macros a human pastes into a real message', () => {
  /**
   * `docs/cs/**` is CS copy: refund macros in four languages, the day-1/7/30
   * onboarding mail, the crisis playbook, the WhatsApp blast scripts. An
   * earlier wave corrected the 80G half of `macros-v1.md` and the two
   * `cs005-warm-followup-*` templates and left everything else, including
   * "100+ Aadhaar-verified pandits across 7 Indian cities. Each with 5+ years
   * experience and 2 reference video proofs" in the welcome email — which is
   * TC-08's published vetting process, verbatim, plus a headcount.
   *
   * Measured against production on 2026-09-01:
   *   $ curl -s 'https://api.darshya.online/api/v1/priests?limit=100' \
   *       | python -c "import sys,json;print(len(json.load(sys.stdin)['priests']))"
   *   3
   * Three, all seeded: `apps/api/src/routes/priests-public.ts` filters on
   * `isVerified`, which is written only in two seed files.
   *
   * Scanned for PROMISE phrasings rather than a bare /80G/, because several of
   * these files must name 80G in order to deny it and a denial must not be
   * indistinguishable from a promise.
   */
  const CS = R('docs/cs');
  const EIGHTY_G_PROMISE =
    /automatic 80G|80G receipts\b|80G tax receipt|80G certificate|active 80G|80G[-\s]eligible|tax[-\s]deductible|80G donations?\b|get 80G/i;

  function csFiles(dir = CS, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) csFiles(path.join(dir, e.name), out);
      else if (e.name.endsWith('.md')) out.push(path.join(dir, e.name));
    }
    return out;
  }

  const files = csFiles();

  it('there is CS copy to check', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it('no macro promises a deduction', () => {
    const offenders = files.filter((f) =>
      EIGHTY_G_PROMISE.test(stripComments(fs.readFileSync(f, 'utf8'))),
    );
    expect(offenders.map(rel)).toEqual([]);
  });

  it('no macro claims a vetting step that does not run', () => {
    const offenders = files.filter((f) =>
      VETTING_CLAIM.test(stripComments(fs.readFileSync(f, 'utf8'))),
    );
    expect(offenders.map(rel)).toEqual([]);
  });

  it('the welcome mail still describes the two steps that DO run', () => {
    const mail = read('docs/cs/onboarding-email-sequence-day-1-7-30.md');
    expect(mail).toMatch(/mandatory video proof/i);
    expect(mail).toMatch(/Aadhaar-based KYC is on file/i);
    expect(mail).toMatch(/not a tax-exemption/i);
    // ...and no longer the headcount it could not support.
    expect(mail).not.toMatch(/100\+ Aadhaar-verified pandits/);
  });
});

describe('TC-01/TC-08 — the drafts already sitting in the publish queue', () => {
  const DIR = R('docs/agent-reports/blog-drafts');
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.md')) : [];

  it('there are drafts to check', () => {
    // 28 deity-cluster drafts plus the content-publisher backlog.
    expect(files.length).toBeGreaterThan(25);
  });

  it('none of them promises a deduction or a vetting step', () => {
    const offenders = [];
    for (const f of files) {
      const body = fs.readFileSync(path.join(DIR, f), 'utf8');
      // Strip the honest denial before scanning, since it has to name 80G.
      const scan = body
        .replace(/Every donation gets a numbered receipt[\s\S]*?80G deduction\./g, ' ')
        .replace(/\*\*Q: Do I get an 80G receipt for any donation portion\?\*\*/g, ' ');
      if (EIGHTY_G.test(scan) || VETTING_CLAIM.test(scan)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});

describe('TC-01/TC-08 — the bytes the fleet actually emits', () => {
  // Runs the real generators into a throwaway cwd and reads their output, so a
  // `${verifiedNoun(...)}` that landed inside a single-quoted literal — which
  // would ship as the literal text `${verifiedNoun('pandits')}` — is caught.
  // Every network call in these agents is wrapped in try/catch, so this is
  // offline-safe; all four finish in under 5s.
  const AGENTS = [
    'scripts/agents/social-queue.mjs',
    'scripts/agents/onboarding-drip.mjs',
    'scripts/agents/social-content-multiplexer.mjs',
    'scripts/agents/founder-tweet-draft.mjs',
  ];
  let tmp;
  let emitted = '';

  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tc01-fleet-'));
    fs.mkdirSync(path.join(tmp, 'docs/agent-reports'), { recursive: true });
    for (const a of AGENTS) {
      execFileSync(process.execPath, [R(a)], { cwd: tmp, stdio: 'ignore', timeout: 60_000 });
    }
    const dir = path.join(tmp, 'docs/agent-reports');
    emitted = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
      .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
      .join('\n');
  }, 120_000);

  afterAll(() => {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('the four agents produced real copy', () => {
    expect(emitted.length).toBeGreaterThan(8000);
    expect(emitted).toMatch(/darshya\.online/);
  });

  it('no template interpolation shipped as literal text', () => {
    expect(emitted).not.toMatch(/\$\{/);
  });

  it('nothing sent promises an 80G deduction', () => {
    const scan = emitted
      // The honest disclosure and the DONEE's own 12A/80G upload step both have
      // to name 80G; neither is a promise about Darshya's registration.
      .replace(/Every donation gets a numbered receipt[\s\S]*?80G deduction\./g, ' ')
      .replace(/Verify 12A \+ 80G registration \(if applicable\)/g, ' ')
      .replace(/Upload 12A\/80G certificates/g, ' ');
    expect(scan).not.toMatch(EIGHTY_G);
  });

  it('nothing sent claims a vetting step that does not run', () => {
    expect(emitted).not.toMatch(VETTING_CLAIM);
  });

  it('the donation drip still carries the disclosure rather than dropping the subject', () => {
    expect(emitted).toContain(NO_80G_DISCLOSURE);
  });
});
