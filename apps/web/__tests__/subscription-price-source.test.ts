/**
 * PM-02b (prod sweep 2026-08-12) — advertised price MUST equal charged price.
 *
 * Measured on the running stack, 2026-08-13:
 *   ADVERTISED  /pricing (hardcoded apps/web/lib/pricing.ts PLANS)
 *               Free ₹0 · Basic ₹499 · Pro ₹1,499 · Enterprise ₹4,999 — one
 *               universal ladder, role-agnostic.
 *   CHARGED     GET /api/v1/subscriptions/plans → 16 role-scoped plans
 *               Pandit    ₹0 / ₹999   / ₹2,999
 *               Astrologer₹0 / ₹799   / ₹1,999
 *               Store     ₹0 / ₹1,499 / ₹3,999
 *               Wellness  ₹0 / ₹699
 *               Temple    ₹0 /        / ₹4,999
 *               Devotee   ₹99/day · ₹499/mo · ₹5,000/yr
 *               Worst gap: Store Basic ₹1,499 charged vs ₹499 advertised = 3.0x.
 *
 * The API table is authoritative: subscription.service.ts bills Razorpay from
 * `plan.price` and writes `marketplaceSubscription.amount = plan.price`. So
 * these tests pin the web to that table and forbid the local ladder from ever
 * carrying a rupee amount again.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  PLANS,
  fetchSubscriptionPlans,
  plansFromPayload,
  groupPlansByRole,
  planCheckoutPath,
} from '../lib/pricing';
import { listPlans, normalizePlan } from '../lib/subscription-api';

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Verbatim subset of the live GET /api/v1/subscriptions/plans body. */
const LIVE_PLANS = [
  { id: 'plan-pandit-free', name: 'Pandit Starter', plan: 'FREE', roles: ['PANDIT'], price: 0, currency: 'INR', interval: 'forever', features: ['5 bookings/month'], popular: false },
  { id: 'plan-pandit-basic', name: 'Pandit Basic', plan: 'BASIC', roles: ['PANDIT'], price: 999, currency: 'INR', interval: 'month', features: ['Unlimited bookings'], popular: true },
  { id: 'plan-store-basic', name: 'Store Basic', plan: 'BASIC', roles: ['STORE_OWNER'], price: 1499, currency: 'INR', interval: 'month', features: [], popular: true },
  { id: 'plan-temple-pro', name: 'Temple Pro', plan: 'PRO', roles: ['TEMPLE_MANAGER', 'GAUSHALA_MANAGER'], price: 4999, currency: 'INR', interval: 'month', features: [], popular: false },
];

function okJson(body: unknown) {
  // lib/subscription-api reads res.text(); lib/pricing reads res.json().
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
}

describe('lib/pricing — the local ladder carries no money', () => {
  it('no PLANS entry exposes a price field', () => {
    for (const plan of PLANS) {
      expect(plan).not.toHaveProperty('price');
      expect(plan).not.toHaveProperty('priceMonthly');
      expect(plan).not.toHaveProperty('amount');
    }
  });

  it('the module source contains none of the fabricated rupee amounts', () => {
    // Guard against the ladder being reintroduced under another name.
    const serialized = JSON.stringify(PLANS);
    for (const fiction of ['499', '1499', '4999']) {
      expect(serialized).not.toContain(fiction);
    }
  });
});

describe('plansFromPayload — reads the API money table verbatim', () => {
  it('keeps the exact rupee amount the API sent', () => {
    const parsed = plansFromPayload({ plans: LIVE_PLANS });
    expect(parsed.map((p) => [p.id, p.price])).toEqual([
      ['plan-pandit-free', 0],
      ['plan-pandit-basic', 999],
      ['plan-store-basic', 1499],
      ['plan-temple-pro', 4999],
    ]);
  });

  it('drops any plan whose price is not a finite non-negative number', () => {
    const parsed = plansFromPayload({
      plans: [
        { id: 'a', name: 'A', roles: ['PANDIT'], price: '999' },
        { id: 'b', name: 'B', roles: ['PANDIT'], price: -1 },
        { id: 'c', name: 'C', roles: ['PANDIT'] },
        { id: 'd', name: 'D', roles: ['PANDIT'], price: 999 },
      ],
    });
    expect(parsed.map((p) => p.id)).toEqual(['d']);
  });

  it('returns [] for garbage', () => {
    for (const p of [null, undefined, {}, [], 'x', { plans: 'x' }]) {
      expect(plansFromPayload(p)).toEqual([]);
    }
  });
});

describe('fetchSubscriptionPlans — fails closed, never invents a price', () => {
  it('returns [] when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));
    await expect(fetchSubscriptionPlans()).resolves.toEqual([]);
  });

  it('returns [] on a non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));
    await expect(fetchSubscriptionPlans()).resolves.toEqual([]);
  });

  it('returns the live prices on success', async () => {
    vi.stubGlobal('fetch', okJson({ plans: LIVE_PLANS }));
    const plans = await fetchSubscriptionPlans();
    expect(plans.find((p) => p.id === 'plan-store-basic')?.price).toBe(1499);
  });
});

describe('groupPlansByRole — one card group per role that actually has plans', () => {
  it('groups by API role enum and lists a plan under every role it belongs to', () => {
    const groups = groupPlansByRole(plansFromPayload({ plans: LIVE_PLANS }));
    const byRole = Object.fromEntries(groups.map((g) => [g.role, g.plans.map((p) => p.id)]));
    expect(byRole.PANDIT).toEqual(['plan-pandit-free', 'plan-pandit-basic']);
    expect(byRole.STORE_OWNER).toEqual(['plan-store-basic']);
    expect(byRole.TEMPLE_MANAGER).toEqual(['plan-temple-pro']);
    expect(byRole.GAUSHALA_MANAGER).toEqual(['plan-temple-pro']);
    // No role invented out of thin air.
    expect(Object.keys(byRole).sort()).toEqual(
      ['GAUSHALA_MANAGER', 'PANDIT', 'STORE_OWNER', 'TEMPLE_MANAGER'].sort(),
    );
  });

  it('returns [] when there are no plans (API down) rather than a fallback ladder', () => {
    expect(groupPlansByRole([])).toEqual([]);
  });
});

describe('planCheckoutPath — the CTA lands where that price is actually sold', () => {
  it('routes each role to its real subscription surface', () => {
    expect(planCheckoutPath('PANDIT')).toBe('/priest/subscription');
    expect(planCheckoutPath('ASTROLOGER')).toBe('/astrologer-portal/subscription');
    expect(planCheckoutPath('WELLNESS_INSTRUCTOR')).toBe('/wellness-portal/subscription');
    expect(planCheckoutPath('TEMPLE_MANAGER')).toBe('/temple-portal/subscription');
    expect(planCheckoutPath('GAUSHALA_MANAGER')).toBe('/temple-portal/subscription');
  });

  it('never points at /settings/subscription (the fabricated billing mock)', () => {
    const roles = ['PANDIT', 'ASTROLOGER', 'STORE_OWNER', 'WELLNESS_INSTRUCTOR', 'TEMPLE_MANAGER', 'GAUSHALA_MANAGER', 'DEVOTEE', 'WHATEVER'];
    for (const r of roles) {
      expect(planCheckoutPath(r)).not.toBe('/settings/subscription');
    }
  });
});

describe('subscription-api — the checkout panel shows the charged number', () => {
  it('normalizePlan maps the API `price` onto `priceMonthly` (was undefined → rendered "Free" while Razorpay billed ₹999)', () => {
    const plan = normalizePlan(LIVE_PLANS[1]);
    expect(plan?.priceMonthly).toBe(999);
    expect(plan?.id).toBe('plan-pandit-basic');
  });

  it('normalizePlan drops a plan with no usable price rather than defaulting it to 0/Free', () => {
    expect(normalizePlan({ id: 'x', name: 'X', roles: ['PANDIT'] })).toBeNull();
    expect(normalizePlan({ id: 'x', name: 'X', roles: ['PANDIT'], price: 'nine' })).toBeNull();
  });

  it('leaves commission and listing caps UNDEFINED when the API omits them', () => {
    // The API sends neither. Defaulting printed "0% commission" against a real
    // 20% platform take, and "Unlimited listings" on a 5-bookings/month plan.
    const plan = normalizePlan(LIVE_PLANS[0]);
    expect(plan?.commissionOverride).toBeUndefined();
    expect(plan?.maxListings).toBeUndefined();
  });

  it('listPlans translates the web role name to the API enum (role=priest returned 0 plans live)', async () => {
    const f = okJson({ plans: LIVE_PLANS.filter((p) => p.roles.includes('PANDIT')) });
    vi.stubGlobal('fetch', f);
    const plans = await listPlans('priest');
    const url = String((f.mock.calls[0] as unknown[])[0]);
    expect(url).toContain('role=PANDIT');
    expect(url).not.toContain('role=priest');
    expect(plans.map((p) => p.priceMonthly)).toEqual([0, 999]);
  });

  it('listPlans maps every web provider role onto a non-empty API enum', async () => {
    const f = okJson({ plans: [] });
    vi.stubGlobal('fetch', f);
    const expected: Record<string, string> = {
      priest: 'PANDIT',
      astrologer: 'ASTROLOGER',
      wellness_instructor: 'WELLNESS_INSTRUCTOR',
      temple_manager: 'TEMPLE_MANAGER',
      store_owner: 'STORE_OWNER',
      gaushala_manager: 'GAUSHALA_MANAGER',
    };
    for (const [webRole, apiRole] of Object.entries(expected)) {
      f.mockClear();
      await listPlans(webRole);
      expect(String((f.mock.calls[0] as unknown[])[0])).toContain(`role=${apiRole}`);
    }
  });
});
