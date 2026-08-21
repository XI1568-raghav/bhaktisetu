import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * TC-10, third pass — the OTHER false infrastructure claim in the privacy
 * policies, and an executable non-vacuity proof for the whole TC-10 guard set.
 *
 * WHY THIS FILE EXISTS.
 *
 * The first TC-10 remediation removed "row-level security" from /privacy and
 * shipped app/privacy/__tests__/privacy-claims-stay-true.test.ts as its proof.
 * Verification refused the claim, correctly: that file is a pure FORWARD
 * ratchet. It pins the REPLACEMENT sentence ("the database is never reachable
 * from your browser"), which was already true before the fix, so it passes
 * against the pre-fix page too and therefore proves nothing about the fix.
 * Measured, not asserted: restoring apps/web/app/privacy/page.tsx from commit
 * 47064e6d (the last revision carrying the RLS sentence) and running both
 * TC-10 files gives
 *
 *     __tests__/tc10-privacy-security-claims.test.ts        3 failed
 *     app/privacy/__tests__/privacy-claims-stay-true.test.ts 0 failed
 *
 * so the claim-text guard is the one with teeth and the ratchet is not.
 *
 * This file closes both halves of that:
 *
 *   1. NON-VACUITY IS EXECUTED, NOT NARRATED. Every detector below is a pure
 *      exported function, and every ban is exercised against the VERBATIM
 *      historical sentence it was written to catch (HISTORICAL_* constants).
 *      A future edit that neuters a detector turns those cases red, so the
 *      guard cannot quietly decay into one that matches nothing.
 *
 *   2. A SECOND FALSE INFRASTRUCTURE CLAIM, still live at the time of writing.
 *      /privacy/v2 section 5 said, verbatim:
 *
 *          "Primary data centres are in Mumbai, India (Supabase ap-south-1)."
 *
 *      Nothing in this repository supports that, and two tracked things
 *      contradict it:
 *
 *        - render.yaml pins BOTH services (`bhaktisetu` API and `darshya-web`)
 *          to `region: oregon`. Every application server is in the United
 *          States. Render does not offer an India region at all, so no Render
 *          deployment can put primary compute in India.
 *        - The recorded production DATABASE_URL host is
 *          `aws-1-ap-northeast-1.pooler.supabase.com` — AWS Tokyo, not Mumbai.
 *          It appears in three tracked audit artifacts:
 *          docs/audit/prod-sweep-raw-2026-08-12.md,
 *          docs/audit/agent-results-wave1.json and
 *          docs/audit/agent-results-partials.json. `ap-south-1` appears
 *          nowhere as a Supabase region; the only ap-south-1 in the tree is
 *          AWS_REGION for S3/IVS in .env.example, a different service.
 *
 *      A data-residency statement is not marketing copy. Under DPDP it is what
 *      an Indian data principal is told about where their data lives, and
 *      under GDPR/UK GDPR it is the predicate for whether a transfer mechanism
 *      is even required. Telling an Indian user their data is primarily in
 *      Mumbai when the servers are in Oregon and the database is in Tokyo is
 *      the same category of defect as the RLS sentence: a false representation
 *      about a control, not an overstatement about a benefit.
 *
 * WHAT THE POLICY MAY SAY INSTEAD. Only what the repository can back. The
 * compute region IS pinned, in render.yaml, so the policy may name it and this
 * file cross-checks the two. The database region is set in a deployment
 * environment variable, not in the repo, so the policy states the property
 * that holds regardless of which region is configured — the data is outside
 * India — rather than naming a region id that can rot silently the way
 * `ap-south-1` and `EU-region` both did.
 *
 * COMMENT HANDLING. Every scan strips comments first. A source-text guard that
 * forgets to is the most repeated defect class in this engagement: it trips on
 * the very comment that documents the ban. The stripper is exercised below
 * against that exact trap — a file whose ONLY occurrence of a banned phrase is
 * inside a JSX comment must pass — before any real assertion runs.
 */

const WEB_ROOT = path.resolve(__dirname, '..', '..', '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..');

const PRIVACY_V1 = path.join(WEB_ROOT, 'app', 'privacy', 'page.tsx');
const PRIVACY_V2 = path.join(WEB_ROOT, 'app', 'privacy', 'v2', 'page.tsx');
const RENDER_YAML = path.join(REPO_ROOT, 'render.yaml');

const POLICY_PAGES: Array<{ rel: string; file: string }> = [
  { rel: 'app/privacy/page.tsx', file: PRIVACY_V1 },
  { rel: 'app/privacy/v2/page.tsx', file: PRIVACY_V2 },
];

// ─── comment stripping ──────────────────────────────────────────────────────

const JSX_COMMENT = /\{\s*\/\*[\s\S]*?\*\/\s*\}/g;
const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;
const LINE_COMMENT = /(^|[^:])\/\/[^\n]*/g;

/**
 * Removes JSX comment expressions, block comments and line comments, leaving
 * string literals and JSX children intact — the policy text lives there and
 * has to stay visible to the scan. The `[^:]` guard keeps `https://` inside a
 * literal from being eaten as a line comment.
 */
export function stripComments(src: string): string {
  return src
    .replace(JSX_COMMENT, ' ')
    .replace(BLOCK_COMMENT, ' ')
    .replace(LINE_COMMENT, '$1');
}

// ─── the historical sentences, verbatim ─────────────────────────────────────

/** /privacy/v2 section 5, at commit 7ccdade1 and every commit before it. */
export const HISTORICAL_V2_RESIDENCY =
  'Primary data centres are in Mumbai, India (Supabase ap-south-1). Some ' +
  'processors operate in the US (Anthropic for AI Pandit, Resend for ' +
  'transactional email) or EU (Cloudflare edge POPs).';

/** /privacy section 5, at commit 47064e6d — removed by the first TC-10 pass. */
export const HISTORICAL_V1_DATA_SECURITY =
  'Database hosted on Supabase with row-level security policies.';

/** /privacy sub-processor entry, at commit 47064e6d — same pass removed it. */
export const HISTORICAL_V1_SUBPROCESSOR =
  'Stores account records, bookings, and content metadata in EU-region ' +
  'Postgres with row-level security policies.';

// ─── the bans ───────────────────────────────────────────────────────────────

export interface ClaimBan {
  label: string;
  re: RegExp;
  why: string;
}

export const BANNED_INFRA_CLAIMS: readonly ClaimBan[] = [
  {
    label: 'a specific cloud region id',
    // Any AWS-style region token. The repo pins no Supabase region, so a
    // region id in a privacy policy is an unverifiable claim by construction —
    // which is exactly how `ap-south-1` survived next to a Tokyo database.
    re: /\b(?:af|ap|ca|eu|il|me|sa|us)-(?:north|south|east|west|central|northeast|northwest|southeast|southwest)-[0-9]\b/i,
    why: 'no cloud region is pinned anywhere in this repository, so the policy cannot verify one',
  },
  {
    label: 'primary infrastructure located in India',
    re: /\b(?:primary|main)\b[^.<>{}]{0,60}(?:data\s*cent(?:re|er)s?|servers?|infrastructure)[^.<>{}]{0,80}\bIndia\b/i,
    why: 'render.yaml pins every service to a non-India region and Render offers no India region',
  },
  {
    label: 'a datacentre city',
    re: /(?:data\s*cent(?:re|er)s?|servers?|hosted|database)[^.<>{}]{0,80}\bMumbai\b/i,
    why: 'the recorded production database host is AWS Tokyo, not Mumbai',
  },
  {
    label: 'EU-region storage',
    re: /EU[-\s]region/i,
    why: 'contradicted the Mumbai claim on the sibling policy and neither was pinned',
  },
  {
    label: 'database row-level security',
    // Duplicated from __tests__/tc10-privacy-security-claims.test.ts on
    // purpose. That file lives in a different lane; if it is ever deleted or
    // relaxed, the false claim must still not be able to come back.
    re: /row[-\s]?level\s+security/i,
    why: 'zero of the 67 Prisma models carries an RLS policy across 36 migrations',
  },
  {
    label: 'the RLS acronym',
    re: /\bRLS\b/,
    why: 'same claim, abbreviated',
  },
];

/** Which bans a piece of policy source trips, comments already removed. */
export function bannedInfraClaims(src: string): string[] {
  const body = stripComments(src);
  return BANNED_INFRA_CLAIMS.filter((b) => b.re.test(body)).map((b) => b.label);
}

// ─── render.yaml cross-check ────────────────────────────────────────────────

/** The regions Render is actually deployed to, read from render.yaml. */
export function configuredRenderRegions(yaml: string): string[] {
  const out: string[] = [];
  const re = /^\s*region:\s*([A-Za-z0-9_-]+)\s*$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(yaml)) !== null) out.push(m[1]!.toLowerCase());
  return [...new Set(out)];
}

/** Every Render region, and the country a policy would have to name for it. */
export const RENDER_REGION_COUNTRY: Readonly<Record<string, string>> = {
  oregon: 'United States',
  ohio: 'United States',
  virginia: 'United States',
  frankfurt: 'Germany',
  singapore: 'Singapore',
};

/**
 * The countries a policy may name for application servers, given render.yaml.
 * Deliberately derived rather than hardcoded: move the service to Frankfurt
 * and the expected country changes with it, so the policy must follow.
 */
export function hostingCountries(yaml: string): string[] {
  return [
    ...new Set(
      configuredRenderRegions(yaml)
        .map((r) => RENDER_REGION_COUNTRY[r])
        .filter((c): c is string => typeof c === 'string'),
    ),
  ];
}

/**
 * Render region names a policy mentions but render.yaml does not configure.
 * This is the rot-detector for the one region the policy IS allowed to name.
 */
export function staleRegionNames(policySrc: string, yaml: string): string[] {
  const body = stripComments(policySrc);
  const configured = new Set(configuredRenderRegions(yaml));
  return Object.keys(RENDER_REGION_COUNTRY).filter(
    (region) => new RegExp('\\b' + region + '\\b', 'i').test(body) && !configured.has(region),
  );
}

// ─── stripper self-tests (run before anything that matters) ─────────────────

describe('TC-10 residency guard — the comment stripper actually strips', () => {
  it('a banned phrase that appears ONLY in a JSX comment does not trip the scan', () => {
    const src =
      '<p>{' +
      '/* TC-10: we removed "Primary data centres are in Mumbai, India (Supabase ap-south-1)" */' +
      '}Servers are in the United States.</p>';
    expect(bannedInfraClaims(src)).toEqual([]);
    expect(stripComments(src)).toContain('Servers are in the United States.');
  });

  it('a banned phrase in a block comment does not trip the scan', () => {
    const src = '/* history: this said row-level security and ap-south-1 */ const x = 1;';
    expect(bannedInfraClaims(src)).toEqual([]);
  });

  it('a banned phrase in a line comment does not trip the scan', () => {
    const src = '// never restore the EU-region wording\nconst y = 2;';
    expect(bannedInfraClaims(src)).toEqual([]);
  });

  it('does NOT strip a URL inside a string literal', () => {
    const src = 'const u = "https://darshya.online/privacy";';
    expect(stripComments(src)).toContain('https://darshya.online/privacy');
  });

  it('does NOT strip the visible policy text it exists to police', () => {
    expect(stripComments('<p>' + HISTORICAL_V2_RESIDENCY + '</p>')).toContain('Mumbai');
  });
});

// ─── non-vacuity: every ban catches the sentence it was written for ─────────

describe('TC-10 residency guard — every detector is proven against the real historical text', () => {
  it('flags the /privacy/v2 Mumbai / ap-south-1 sentence on three separate grounds', () => {
    const hits = bannedInfraClaims('<p>' + HISTORICAL_V2_RESIDENCY + '</p>');
    expect(hits).toContain('a specific cloud region id');
    expect(hits).toContain('primary infrastructure located in India');
    expect(hits).toContain('a datacentre city');
  });

  it('flags the /privacy Data Security RLS bullet', () => {
    const hits = bannedInfraClaims('<li>' + HISTORICAL_V1_DATA_SECURITY + '</li>');
    expect(hits).toContain('database row-level security');
  });

  it('flags the /privacy sub-processor EU-region sentence', () => {
    const hits = bannedInfraClaims('<li>' + HISTORICAL_V1_SUBPROCESSOR + '</li>');
    expect(hits).toContain('EU-region storage');
    expect(hits).toContain('database row-level security');
  });

  it('flags the abbreviated form the long ban would miss', () => {
    expect(bannedInfraClaims('<li>Tables are protected by RLS.</li>')).toEqual([
      'the RLS acronym',
    ]);
  });

  it('clears wording that is actually backed by the repository', () => {
    const ok =
      '<p>Your personal data is stored and processed outside India. Our application ' +
      'servers run in the United States (Render, Oregon region).</p>';
    expect(bannedInfraClaims(ok)).toEqual([]);
  });
});

describe('TC-10 residency guard — the render.yaml cross-check is proven too', () => {
  const FIXTURE_OREGON = 'services:\n  - name: api\n    region: oregon\n  - name: web\n    region: oregon\n';
  const FIXTURE_SINGAPORE = 'services:\n  - name: api\n    region: singapore\n';

  it('reads the configured regions out of render.yaml syntax', () => {
    expect(configuredRenderRegions(FIXTURE_OREGON)).toEqual(['oregon']);
    expect(configuredRenderRegions(FIXTURE_SINGAPORE)).toEqual(['singapore']);
  });

  it('derives the country the policy is allowed to name', () => {
    expect(hostingCountries(FIXTURE_OREGON)).toEqual(['United States']);
    expect(hostingCountries(FIXTURE_SINGAPORE)).toEqual(['Singapore']);
  });

  it('flags a policy that names a region the deployment no longer uses', () => {
    const policy = '<p>Our servers run in the Oregon region.</p>';
    expect(staleRegionNames(policy, FIXTURE_OREGON)).toEqual([]);
    expect(staleRegionNames(policy, FIXTURE_SINGAPORE)).toEqual(['oregon']);
  });

  it('does not flag a region named only inside a comment', () => {
    const policy = '<p>{' + '/* was frankfurt before the cutover */' + '}Oregon region.</p>';
    expect(staleRegionNames(policy, FIXTURE_OREGON)).toEqual([]);
  });
});

// ─── the live pages ─────────────────────────────────────────────────────────

describe('TC-10 — no privacy policy states infrastructure facts the repo contradicts', () => {
  for (const { rel, file } of POLICY_PAGES) {
    it(rel + ' makes no unverifiable or contradicted infrastructure claim', () => {
      const hits = bannedInfraClaims(readFileSync(file, 'utf8'));
      expect(
        hits,
        rel +
          ' asserts ' +
          JSON.stringify(hits) +
          '. Reasons these are banned: ' +
          BANNED_INFRA_CLAIMS.filter((b) => hits.includes(b.label))
            .map((b) => b.label + ' — ' + b.why)
            .join('; '),
      ).toEqual([]);
    });
  }
});

describe('TC-10 — the cross-border section says where the data actually is', () => {
  const yaml = readFileSync(RENDER_YAML, 'utf8');
  const v2 = stripComments(readFileSync(PRIVACY_V2, 'utf8'));

  it('render.yaml still pins every service to a region this guard understands', () => {
    // A scan that silently matches nothing proves nothing. If this drops to
    // zero the parser broke — fix the parser, do not relax the checks below.
    const regions = configuredRenderRegions(yaml);
    expect(regions.length).toBeGreaterThan(0);
    for (const r of regions) expect(RENDER_REGION_COUNTRY[r], 'unknown Render region ' + r).toBeDefined();
  });

  it('no Render service is deployed in India, so no policy may claim India-primary hosting', () => {
    expect(hostingCountries(yaml)).not.toContain('India');
  });

  it('/privacy/v2 tells an Indian data principal that their data leaves India', () => {
    // The section is titled "Cross-border data transfer". Deleting the false
    // sentence without replacing it would leave a reader to assume the
    // transfer does not happen, so silence is not an acceptable way to go
    // green here.
    expect(v2).toMatch(/(?:stored|processed|held)[^.<>{}]{0,60}outside India/i);
  });

  it('/privacy/v2 names the hosting country render.yaml actually configures', () => {
    for (const country of hostingCountries(yaml)) {
      expect(v2, '/privacy/v2 must name ' + country + ', the country render.yaml deploys to').toContain(
        country,
      );
    }
  });

  it('/privacy/v2 names no Render region the deployment has moved off', () => {
    expect(staleRegionNames(readFileSync(PRIVACY_V2, 'utf8'), yaml)).toEqual([]);
  });
});
