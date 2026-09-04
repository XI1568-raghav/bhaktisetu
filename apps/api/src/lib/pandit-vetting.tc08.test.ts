import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';

/**
 * TC-08 (P1, trust) — the pandit vetting process, measured on `apps/api`.
 *
 * `apps/web` has five guards for this finding
 * (`pandit-vetting-claim.tc08.test.tsx`, `tc08-vedic-certified-badge.test.ts`,
 * `puja-temples-copy-honesty.tc08.test.tsx`,
 * `trust-copy-lane.tc01-tc13.test.tsx`, `tc01-jsonld-vetting-claim.test.ts`).
 * Every one of them walks `apps/web`, so the API — which answers the same
 * question to the same devotee, through the support bot, the AI Pandit, the
 * B2B OpenAPI document and the recruitment mailer — was outside the
 * denominator and still published the claim.
 *
 * Measured on production on 2026-09-01, before this file existed:
 *
 *   $ curl -s -X POST https://api.darshya.online/api/v1/support/chat \
 *       -H 'Content-Type: application/json' \
 *       -d '{"message":"how do I become pandit"}'
 *   {"message":"We onboard verified priests and astrologers. Share your
 *    credentials at /priest-onboarding — typical verification takes 3–5 days
 *    (ID, training, test readings).", ...}   # HTTP 200
 *
 *   $ ... -d '{"message":"what is poojly"}'
 *   {"message":"... All Aadhaar-verified priests, all secure payments.", ...}
 *
 *   $ curl -s 'https://api.darshya.online/api/v1/priests?limit=100' \
 *       | python -c "import sys,json;print(len(json.load(sys.stdin)['priests']))"
 *   3
 *
 * Three priests, all seed rows, and a published three-part vetting process
 * with a 3–5 day turnaround that no code performs or measures. See
 * `lib/pandit-vetting.ts` for the writer analysis. Every case below fails
 * against the tree as it stood before this change.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(HERE, '../..');
const API_SRC = path.join(API_ROOT, 'src');
const REPO_ROOT = path.resolve(API_ROOT, '../..');

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.turbo',
  'migrations',
  '__tests__',
]);
const EXTS = ['.ts', '.js', '.mjs', '.json', '.html', '.txt'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (EXTS.some((e) => entry.name.endsWith(e))) {
      if (entry.name.includes('.test.')) continue;
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** Comments explaining a removal must not read as the claim. */
function code(abs: string): string {
  return fs
    .readFileSync(abs, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * The vetting steps the product published and does not perform, in the shapes
 * the API actually shipped.
 */
/**
 * Files allowed to contain a fiction string in live code, each because the
 * string is the `HAS_PANDIT_VETTING === true` branch of the gate itself — the
 * copy that returns the day the pipeline exists. Anything else is a
 * regression: a new API surface has published the claim ungated.
 */
const ALLOWED: Record<string, string> = {
  'src/lib/pandit-vetting.ts':
    'the gate — it holds both branches, so it must contain the sentence it suppresses',
  'src/services/outreach.service.ts':
    'the template variable table — the fiction is the true-branch of panditsPhraseEn',
  'scripts/leads/_real-pandits-bengaluru-2026-05-02.ts':
    'lead research data describing what a PROSPECT advertises about himself, not a Darshya claim',
};

const VETTING_FICTIONS: Array<[string, RegExp]> = [
  ['verified pandits/priests', /verified (pandits?|priests?)/i],
  ['certified pandits/priests', /certified (pandits?|priests?)/i],
  ['Vedic certified badge', /vedic[-\s]certified/i],
  ['published credential-verification step', /vedic credential verification/i],
  ['published probation step', /30[-\s]day (video )?probation/i],
  ['published per-pandit trust score', /trust score on every pandit/i],
  ['a verification turnaround nothing measures', /verification takes \d+[–-]\d+ days/i],
  ['ID + training + test readings', /\(ID, training, test readings\)/i],
  ['Aadhaar-verified priests as a population claim', /All Aadhaar-verified priests/i],
];

describe('TC-08 — the premise: nothing promotes a Priest to verified', () => {
  const sources = walk(API_SRC).filter((f) => f.endsWith('.ts'));

  it('found a real file set to scan', () => {
    // Guards every negative below against a silently empty walk.
    expect(sources.length).toBeGreaterThan(200);
  });

  it('no route writes isVerified:true or verificationStatus:approved on a Priest', () => {
    const writers = sources
      .filter((abs) => abs.includes(`${path.sep}routes${path.sep}`) || abs.includes(`${path.sep}services${path.sep}`))
      .filter((abs) => {
        const s = fs.readFileSync(abs, 'utf8');
        // A `data:` payload assigning the flag, as opposed to a `where:` filter.
        return /data:\s*\{[^}]*\b(isVerified:\s*true|verificationStatus:\s*'approved')/s.test(s);
      })
      .map((abs) => path.relative(API_ROOT, abs).split(path.sep).join('/'))
      // routes/admin.ts and routes/admin-gurukuls.ts write Temple/Gurukul
      // isVerified, which is a different model with a real admin workflow.
      .filter((rel) => !/admin(-gurukuls)?\.ts$/.test(rel));
    expect(writers).toEqual([]);
  });

  it('the one production writer of verificationStatus writes pending, not approved', () => {
    const src = fs.readFileSync(path.join(API_SRC, 'routes/priest.ts'), 'utf8');
    expect(src).toMatch(/verificationStatus:\s*'pending'/);
    expect(src).not.toMatch(/verificationStatus:\s*'approved'/);
  });

  it('the public directory filters on exactly the column only seeds write', () => {
    const src = fs.readFileSync(path.join(API_SRC, 'routes/priests-public.ts'), 'utf8');
    expect(src).toMatch(/isVerified:\s*true/);
    const seed = fs.readFileSync(path.join(API_ROOT, 'prisma/seed.ts'), 'utf8');
    expect(seed).toMatch(/isVerified:\s*true/);
    expect(seed).toMatch(/verificationStatus:\s*'approved'/);
  });
});

describe('TC-08 — no apps/api surface publishes a vetting step that does not run', () => {
  const files = walk(API_ROOT);

  it('walks html and txt too, not just ts', () => {
    const rel = files.map((f) => path.relative(API_ROOT, f).split(path.sep).join('/'));
    // 297 files today; the guard is that the walk is not silently empty or
    // silently ts-only.
    expect(rel.length).toBeGreaterThan(250);
    expect(rel).toContain('src/templates/outreach/priest_first_touch.en.html');
    expect(rel).toContain('src/templates/outreach/priest_first_touch.hi.html');
    expect(rel).toContain('src/routes/support.ts');
    expect(rel).toContain('src/integrations/claude.ts');
    expect(rel).toContain('src/routes/b2b.ts');
  });

  for (const [label, pattern] of VETTING_FICTIONS) {
    it(`no file publishes: ${label}`, () => {
      const offenders = files
        .filter((abs) => pattern.test(code(abs)))
        .map((abs) => path.relative(API_ROOT, abs).split(path.sep).join('/'))
        .filter((rel) => !(rel in ALLOWED));
      expect(offenders).toEqual([]);
    });
  }

  it('the exception list is itself justified, not a dumping ground', () => {
    expect(Object.keys(ALLOWED).length).toBeLessThanOrEqual(4);
    for (const [rel, why] of Object.entries(ALLOWED)) {
      expect(fs.existsSync(path.join(API_ROOT, rel)), `${rel} missing`).toBe(true);
      expect(why.length).toBeGreaterThan(30);
    }
    // The two gate files are allowed only because the fiction sits in a
    // conditional. If either ever states it unconditionally, this fails.
    for (const rel of ['src/lib/pandit-vetting.ts', 'src/services/outreach.service.ts']) {
      const src = code(path.join(API_ROOT, rel));
      const hits = [...src.matchAll(/verified (pandits?|priests?)/gi)];
      expect(hits.length, `${rel} has no gated occurrence`).toBeGreaterThan(0);
      for (const hit of hits) {
        // The ternary may wrap, so look back over the enclosing statement
        // rather than the single line.
        const before = src.slice(Math.max(0, hit.index! - 240), hit.index!);
        expect(
          /HAS_PANDIT_VETTING[\s\S]{0,200}$/.test(before),
          `${rel}: "${hit[0]}" is not behind HAS_PANDIT_VETTING`,
        ).toBe(true);
      }
    }
  });

  it('the comment-stripper removes comments only', () => {
    // A live string still matches after stripping...
    expect(code(path.join(API_SRC, 'lib/pandit-vetting.ts'))).toMatch(
      /typical verification takes/i,
    );
    // ...while a comment quoting the same words does not, which is what lets
    // every docblock in this change explain the removal without tripping it.
    const commented = '/* typical verification takes 3–5 days */\n// typical verification takes';
    const stripped = commented
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(/typical verification takes/i.test(stripped)).toBe(false);
  });
});

describe('TC-08 — the support bot answers honestly on the live route', () => {
  async function ask(message: string): Promise<Record<string, unknown>> {
    const { supportRoutes } = await import('../routes/support.js');
    const app = Fastify();
    await app.register(supportRoutes, { prefix: '/support' });
    const res = await app.inject({
      method: 'POST',
      url: '/support/chat',
      payload: { message },
    });
    await app.close();
    expect(res.statusCode).toBe(200);
    return res.json() as Record<string, unknown>;
  }

  it('"how do I become pandit" no longer publishes a 3–5 day vetting process', async () => {
    const body = await ask('how do I become pandit');
    const answer = String(body.message ?? '');
    // Guards against an empty/escalated answer making the negatives vacuous.
    expect(answer.length).toBeGreaterThan(120);
    expect(body.source).toBe('keyword');
    expect(answer).not.toMatch(/verification takes 3[–-]5 days/i);
    expect(answer).not.toMatch(/\(ID, training, test readings\)/i);
    expect(answer).not.toMatch(/verified priests/i);
    // It still routes them to the form, and it says what IS in place.
    expect(answer).toContain('/priest-onboarding');
    expect(answer).toMatch(/Aadhaar-based KYC/);
    expect(answer).toMatch(/video proof/);
  });

  it('"what is poojly" no longer claims every priest is Aadhaar-verified', async () => {
    const body = await ask('what is poojly');
    const answer = String(body.message ?? '');
    expect(answer.length).toBeGreaterThan(150);
    expect(answer).not.toMatch(/All Aadhaar-verified priests/i);
    expect(answer).toMatch(/devotional super-app/);
    expect(answer).toMatch(/payout gate rather than a public credential check/);
  });
});

describe('TC-08 — the AI Pandit answers name no vetting step', () => {
  it('none of the canned Darshya call-outs sells a verified priest', async () => {
    const mod = (await import('../integrations/claude.js')) as Record<string, unknown>;
    // The answers live in a module-level table; assert on the compiled source
    // as well as on the module, so a template literal that failed to
    // interpolate would still be caught.
    const src = code(path.join(API_SRC, 'integrations/claude.ts'));
    expect(src.length).toBeGreaterThan(5000);
    expect(src).not.toMatch(/verified priests?/i);
    expect(src).toMatch(/verifiedNoun\('priests'\)/);
    expect(typeof mod).toBe('object');
  });
});

describe('TC-08 — the recruitment mailer names no vetting step', () => {
  it('the priest first-touch email (en) recruits on what is real', async () => {
    const { renderEmailTemplate } = await import('../services/outreach.service.js');
    const html = renderEmailTemplate('priest_first_touch.en.html', {
      leadId: 'lead_9',
      name: 'Sharma',
      city: 'Ujjain',
      personalizedOpener: 'x',
    });
    expect(html.length).toBeGreaterThan(700);
    expect(html).not.toMatch(/verified pandits?/i);
    expect(html).not.toMatch(/\{\{\w+\}\}/);
    expect(html).toMatch(/pandits perform online pujas/);
  });

  it('the priest first-touch email (hi) recruits on what is real', async () => {
    const { renderEmailTemplate } = await import('../services/outreach.service.js');
    const html = renderEmailTemplate('priest_first_touch.hi.html', {
      leadId: 'lead_9',
      name: 'Sharma',
      city: 'Ujjain',
      personalizedOpener: 'x',
    });
    expect(html.length).toBeGreaterThan(700);
    expect(html).not.toMatch(/verified पंडित/);
    expect(html).not.toMatch(/\{\{\w+\}\}/);
  });
});

describe('TC-08 — the mobile mirror cannot drift from this one', () => {
  it('apps/mobile/lib/pandit-vetting.ts carries the same flag', async () => {
    const gate = await import('./pandit-vetting.js');
    const mobile = fs.readFileSync(
      path.join(REPO_ROOT, 'apps/mobile/lib/pandit-vetting.ts'),
      'utf8',
    );
    const match = /export const HAS_PANDIT_VETTING = (true|false);/.exec(mobile);
    expect(match, 'HAS_PANDIT_VETTING not found in the mobile mirror').not.toBeNull();
    expect(gate.HAS_PANDIT_VETTING).toBe(match![1] === 'true');
  });
});

describe('TC-08 — it is a gate, not a deletion', () => {
  afterEach(() => {
    vi.doUnmock('./pandit-vetting.js');
    vi.doUnmock('../lib/pandit-vetting.js');
    vi.resetModules();
  });

  async function withVetting(): Promise<void> {
    const actual = await vi.importActual<typeof import('./pandit-vetting.js')>(
      './pandit-vetting.js',
    );
    const patched = {
      ...actual,
      HAS_PANDIT_VETTING: true,
      VERIFIED_ADJ: 'verified ',
      verifiedNoun: (noun: string) => `verified ${noun}`,
      PANDIT_ONBOARDING_ANSWER:
        'We onboard verified priests and astrologers. Share your credentials at ' +
        '/priest-onboarding — typical verification takes 3–5 days (ID, training, test readings).',
      PLATFORM_SUMMARY_TRUST_CLAUSE: 'All Aadhaar-verified priests, all secure payments.',
    };
    vi.doMock('./pandit-vetting.js', () => patched);
    vi.doMock('../lib/pandit-vetting.js', () => patched);
    vi.resetModules();
  }

  it('the support answers come back word for word', async () => {
    await withVetting();
    const { supportRoutes } = await import('../routes/support.js');
    const app = Fastify();
    await app.register(supportRoutes, { prefix: '/support' });
    const become = await app.inject({
      method: 'POST',
      url: '/support/chat',
      payload: { message: 'how do I become pandit' },
    });
    expect(String(become.json().message)).toMatch(/verification takes 3[–-]5 days/);
    const about = await app.inject({
      method: 'POST',
      url: '/support/chat',
      payload: { message: 'what is poojly' },
    });
    expect(String(about.json().message)).toMatch(/All Aadhaar-verified priests/);
    await app.close();
  });

  it('the recruitment mailer gets its adjective back', async () => {
    await withVetting();
    const { renderEmailTemplate } = await import('../services/outreach.service.js');
    const html = renderEmailTemplate('priest_first_touch.en.html', {
      leadId: 'lead_9',
      name: 'Sharma',
      city: 'Ujjain',
      personalizedOpener: 'x',
    });
    expect(html).toMatch(/verified pandits perform online pujas/);
  });
});
