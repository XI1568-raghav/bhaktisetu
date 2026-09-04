/**
 * PM-01 (P0) — the residue the /pricing filter never covered.
 *
 * The previous wave measured the claim on /pricing, added
 * `dropCommissionDiscountClaims()` there, and recorded that "no live
 * commission-reduction copy" remained. That conclusion was drawn from a grep
 * scoped to app/pricing, app/upgrade, app/store and lib/subscription-api, and
 * it was wrong. MEASURED BEFORE (this branch, 2026-08-28):
 *
 *  1. `components/SubscriptionPanel.tsx` renders `plan.features` from
 *     GET /subscriptions/plans VERBATIM (`plan.features?.map(...)`), with no
 *     filter of any kind. It is mounted on /priest/subscription,
 *     /astrologer-portal/subscription, /store/subscription,
 *     /wellness-portal/subscription and /temple-portal/subscription. So the
 *     bullets "15% lower commission" (Rs 2,999/mo), "10% lower commission"
 *     (Rs 1,999/mo), "Lower commission" (Rs 1,499/mo) and "Lowest commission"
 *     (Rs 3,999/mo) each rendered next to their price and a Subscribe button.
 *
 *  2. The same component's DEFAULT description read "Choose a marketplace plan
 *     to unlock listings, lower commission, and premium tooling."
 *
 *  3. Three portal pages passed their own description prop saying the same
 *     thing — app/priest/subscription, app/astrologer-portal/subscription and
 *     app/wellness-portal/subscription.
 *
 * (1) is fixed at the source: the bullets are gone from
 * apps/api/src/services/subscription.service.ts, pinned by
 * apps/api/src/services/subscription.service.pm01.test.ts. This file pins the
 * web half — the copy the pages write themselves, which no API change can
 * reach — plus the dead ladder that would republish the claim the moment
 * anyone mounted it.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { fullName: 'Test Pandit', email: 'pandit@demo.com', phone: '9999999999' },
  }),
}));

import { SubscriptionPanel } from '../components/SubscriptionPanel';
import { normalizePlan } from '../lib/subscription-api';
import * as pricing from '../lib/pricing';

const WEB_ROOT = path.resolve(__dirname, '..');

/**
 * Comment-stripped source. The scans below look for the CLAIM, and this file's
 * own fix comments quote it verbatim ("lower commission" appears three times in
 * the header of subscription.service.ts). A stripper that missed them would
 * flag the correction as the violation — that mistake has been made eight times
 * in this engagement.
 */
function stripComments(src: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  let escaped = false;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

describe('PM-01 — the comment stripper the scans depend on', () => {
  it('drops a comment that QUOTES the forbidden phrase', () => {
    const src = '// this used to say "lower commission"\nconst ok = 1;';
    expect(stripComments(src)).not.toMatch(/lower commission/i);
  });

  it('keeps the phrase when it is real code', () => {
    expect(stripComments('const s = "lower commission";')).toMatch(/lower commission/i);
  });

  it('does not eat a // inside a string', () => {
    expect(stripComments('const u = "https://darshya.online";')).toContain('https://darshya.online');
  });
});

// ── the rendered surface ─────────────────────────────────────────────────────

const PLAN = {
  id: 'plan-store-pro',
  name: 'Store Pro',
  plan: 'PRO',
  roles: ['STORE_OWNER'],
  price: 3999,
  currency: 'INR',
  interval: 'month',
  features: ['Unlimited listings', 'Featured placement', 'Dedicated account manager'],
  popular: false,
};

function json(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function stubFetch(planRow: Record<string, unknown>) {
  const f = vi.fn(async (url: unknown) => {
    if (String(url).includes('/subscriptions/plans')) return json({ plans: [planRow] });
    return json({ subscription: null });
  });
  vi.stubGlobal('fetch', f);
  return f;
}

describe('PM-01 — SubscriptionPanel publishes no commission claim of its own', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('the default description does not promise a lower commission', async () => {
    stubFetch(PLAN);
    render(<SubscriptionPanel role="store_owner" />);
    await waitFor(() => expect(screen.getByText('Store Pro')).toBeTruthy());
    expect(document.body.textContent ?? '').not.toMatch(/commission/i);
  });

  it('renders the real bullets the API now sends, unfiltered and truthful', async () => {
    stubFetch(PLAN);
    render(<SubscriptionPanel role="store_owner" />);
    await waitFor(() => expect(screen.getByText('Unlimited listings')).toBeTruthy());
    expect(screen.getByText('Featured placement')).toBeTruthy();
    expect(screen.getByText('Dedicated account manager')).toBeTruthy();
  });

  /**
   * The panel used to render `{plan.commissionOverride}% commission` on a field
   * GET /subscriptions/plans has never sent. It was unreachable, so it printed
   * nothing — but it is the render site a future payload would light up, and
   * the rate it would print is a rate nothing charges.
   */
  it('has no commissionOverride render site left to light up', async () => {
    stubFetch({ ...PLAN, commissionOverride: 8 });
    render(<SubscriptionPanel role="store_owner" />);
    await waitFor(() => expect(screen.getByText('Store Pro')).toBeTruthy());
    expect(document.body.textContent ?? '').not.toMatch(/8%/);
    expect(document.body.textContent ?? '').not.toMatch(/commission/i);
  });

  it('normalizePlan does not carry commissionOverride through, even when sent', () => {
    const plan = normalizePlan({ ...PLAN, commissionOverride: 8 });
    expect(plan).not.toBeNull();
    expect(Object.keys(plan!)).not.toContain('commissionOverride');
  });
});

// ── the copy each page writes itself ─────────────────────────────────────────

describe('PM-01 — no subscription surface promises a commission discount', () => {
  const SWEPT = [
    'components/SubscriptionPanel.tsx',
    'app/priest/subscription/page.tsx',
    'app/astrologer-portal/subscription/page.tsx',
    'app/wellness-portal/subscription/page.tsx',
    'app/temple-portal/subscription/page.tsx',
    'app/settings/subscription/page.tsx',
  ];

  it('scans files that actually exist', () => {
    for (const rel of SWEPT) {
      expect(existsSync(path.join(WEB_ROOT, rel)), rel).toBe(true);
    }
  });

  it('none of them writes a commission claim into its copy', () => {
    const offenders: string[] = [];
    for (const rel of SWEPT) {
      const code = stripComments(readFileSync(path.join(WEB_ROOT, rel), 'utf8'));
      if (/commission/i.test(code)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });
});

// ── the dead ladder ──────────────────────────────────────────────────────────

/**
 * lib/pricing.ts kept a four-column tier ladder (pandit 30/20/15/10, astrologer
 * 35/25/18/12, …) plus a `commissionOverride` per plan tier and matching
 * "30% platform commission" feature bullets, all documented as "NOT PUBLISHED,
 * and deliberately not deleted" pending an owner decision. Its only renderer
 * was components/CommissionBanner.tsx, which carried a DO-NOT-MOUNT header and
 * zero importers.
 *
 * Keeping an unpublished falsehood one import away from a provider dashboard is
 * not a smaller risk than publishing it — it is the same risk on a delay. The
 * ladder and the banner are gone. If a tier discount is ever implemented in
 * apps/api/src/lib/commission-math.ts, it comes back sourced from that.
 */
describe('PM-01 — the unimplemented tier ladder is gone from lib/pricing', () => {
  it('exposes no getCommissionRate helper', () => {
    expect('getCommissionRate' in pricing).toBe(false);
  });

  it('no COMMISSION_RATES row carries a per-tier rates ladder', () => {
    for (const row of pricing.COMMISSION_RATES) {
      expect(row, `${row.role}`).not.toHaveProperty('rates');
    }
  });

  it('still publishes the one rate that IS charged', () => {
    expect(pricing.chargedCommissionRate('pandit')).toBe(20);
    expect(pricing.chargedCommissionRate('temple')).toBeNull();
  });

  it('no PLAN tier carries commissionOverride or a commission bullet', () => {
    for (const plan of pricing.PLANS) {
      expect(plan, plan.id).not.toHaveProperty('commissionOverride');
      for (const f of plan.features) {
        expect(f.text, `${plan.id} bullet`).not.toMatch(/commission/i);
      }
    }
  });

  it('CommissionBanner, the only renderer the ladder ever had, is deleted', () => {
    expect(existsSync(path.join(WEB_ROOT, 'components/CommissionBanner.tsx'))).toBe(false);
  });
});
