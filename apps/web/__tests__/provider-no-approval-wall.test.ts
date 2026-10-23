import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Provider approval was removed (API: REQUIRE_PROVIDER_APPROVAL, default off): a
 * pandit, store owner, astrologer, wellness instructor, gaushala or temple manager
 * is live and can use the portal as soon as they register or submit. No
 * provider-facing screen may tell them to wait for an admin, and no public screen
 * may claim a review that does not happen.
 *
 * Out of scope on purpose: /admin/* (the optional review/suspend queue still
 * exists), refund wording ("pending admin approval" on a refund is a real step),
 * and payout KYC ("KYC under review" is the Aadhaar/bank check that gates payouts).
 */
const WEB = path.resolve(__dirname, '..');
const SKIP = new Set(['node_modules', '.next', '.turbo', 'coverage', '__tests__', 'e2e', 'admin']);

function files(): string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP.has(e.name)) walk(path.join(dir, e.name));
      } else if (/\.(tsx?)$/.test(e.name) && !e.name.includes('.test.')) out.push(path.join(dir, e.name));
    }
  })(path.join(WEB, 'app'));
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP.has(e.name)) walk(path.join(dir, e.name));
      } else if (/\.(tsx?)$/.test(e.name) && !e.name.includes('.test.')) out.push(path.join(dir, e.name));
    }
  })(path.join(WEB, 'components'));
  return out;
}

const strip = (s: string) =>
  s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const WALL: Array<[string, RegExp]> = [
  ['pending-approval banner', /Pending Approval|pending approval(?! by an admin to refund)/i],
  ['awaiting approval', /awaiting approval/i],
  ['"Submit for Approval" button', /Submit(ted)? for Approval/i],
  ['providers must be approved first', /Provider accounts require approval|admin can review and approve/i],
  ['pandit waits for an admin', /waiting for approval|once an admin approves|Profile Under Review/i],
  ['a review that does not happen', /reviewer approves|reviewed before (going live|being listed)|reviewed and approved before|Each profile is reviewed|A reviewed profile builds trust/i],
];

describe('no provider-facing approval wall, no claimed review', () => {
  const src = files().map((abs) => ({ rel: path.relative(WEB, abs).split(path.sep).join('/'), code: strip(fs.readFileSync(abs, 'utf8')) }));

  it('scans a real file set', () => {
    expect(src.length).toBeGreaterThan(200);
  });

  // lib/store-order-cancel.ts is outside app/ and components/ by construction (refund wording).
  for (const [label, re] of WALL) {
    it(`no screen shows: ${label}`, () => {
      const hits = src.filter((f) => re.test(f.code)).map((f) => f.rel);
      expect(hits).toEqual([]);
    });
  }

  it('the signup success state no longer says the profile is under review', () => {
    const f = src.find((x) => x.rel === 'app/auth/signup/page.tsx')!;
    expect(f.code).toMatch(/Your account is active/);
    expect(f.code).not.toMatch(/pending_approval/);
  });

  it('a payout-detail nudge stays honest: earnings still need payout details', () => {
    const f = src.find((x) => x.rel === 'app/onboarding/view/page.tsx')!;
    expect(f.code).toMatch(/payout details to receive earnings/);
  });
});
