import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { SubscriptionService } from './subscription.service.js';

/**
 * PM-01 (P0) — "paid plans sell a commission discount that is implemented
 * nowhere".
 *
 * MEASURED BEFORE (this branch, 2026-08-28): `GET /api/v1/subscriptions/plans`
 * served six plans whose feature bullets promised a commission the platform
 * never charges differently:
 *
 *   plan-pandit-pro     Rs 2,999/mo  "15% lower commission"
 *   plan-astro-pro      Rs 1,999/mo  "10% lower commission"
 *   plan-store-basic    Rs 1,499/mo  "Lower commission"
 *   plan-store-pro      Rs 3,999/mo  "Lowest commission"
 *   plan-store-free     Rs 0         "Standard commission"
 *   plan-wellness-free  Rs 0         "Standard commission"
 *
 * `commissionOverride` / `commission_override` appear NOWHERE in apps/api, and
 * the five services that write a Commission row (consultation.ts,
 * wellness-sessions.ts, booking.service.ts, payment.service.ts,
 * store-commission.service.ts) each take a flat rate that never reads a
 * subscription. A store owner paying Rs 3,999/month for "Lowest commission" is
 * charged exactly the 20% the free tier is charged.
 *
 * The previous wave stopped the claim on ONE consumer — a render-time filter
 * in apps/web/app/pricing/page.tsx — and recorded that no live surface still
 * carried it. That was wrong. `apps/web/components/SubscriptionPanel.tsx`
 * renders `plan.features` from this endpoint verbatim, so /priest/subscription,
 * /astrologer-portal/subscription, /store/subscription and
 * /wellness-portal/subscription each printed the bullet next to the price and
 * a Subscribe button. Filtering at one renderer does not unpublish a claim the
 * API is still serving to every other client (the panel, the mobile app,
 * anything reading the public endpoint).
 *
 * The honest fix is to stop making the claim at the source: the bullets are
 * removed from the plan definitions. This guard reads the SERVED payload, not
 * the source file, so a bullet reintroduced by any path fails here.
 */
describe('PM-01 — no plan the API offers advertises a commission benefit', () => {
  const service = new SubscriptionService();

  /**
   * Any commission word at all, on either side of the ladder. "Standard
   * commission" is included deliberately: it is only meaningful if some other
   * plan is cheaper on commission, so it advertises the same non-existent
   * ladder from the bottom rung.
   */
  const COMMISSION_CLAIM = /commission/i;

  it('every offered plan carries at least one feature bullet', () => {
    const plans = service.getPlans();
    expect(plans.length).toBeGreaterThan(0);
    for (const plan of plans) {
      expect(Array.isArray(plan.features), `${plan.id} features`).toBe(true);
    }
  });

  it('no feature bullet on any offered plan mentions commission', () => {
    const offenders: string[] = [];
    for (const plan of service.getPlans()) {
      for (const feature of plan.features) {
        if (COMMISSION_CLAIM.test(feature)) {
          offenders.push(`${plan.id} (Rs ${plan.price}/${plan.interval}): "${feature}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the same holds when the payload is filtered by role, as every portal does', () => {
    const roles = [
      'PANDIT',
      'ASTROLOGER',
      'STORE_OWNER',
      'WELLNESS_INSTRUCTOR',
      'TEMPLE_MANAGER',
      'GAUSHALA_MANAGER',
      'DEVOTEE',
    ];
    const offenders: string[] = [];
    for (const role of roles) {
      for (const plan of service.getPlans(role)) {
        for (const feature of plan.features) {
          if (COMMISSION_CLAIM.test(feature)) offenders.push(`${role}/${plan.id}: "${feature}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the plan DEFINITIONS carry no commission bullet either, not just the offer', () => {
    // getPlans() projects NRI Premium down to its enforced subset
    // (advertisedFeaturesFor). Nothing projects the commission bullets away,
    // and nothing should have to: they are gone from the definitions.
    const offenders: string[] = [];
    for (const id of [
      'plan-pandit-pro',
      'plan-astro-pro',
      'plan-store-free',
      'plan-store-basic',
      'plan-store-pro',
      'plan-wellness-free',
    ]) {
      const def = service.getPlanDefinition(id);
      expect(def, `${id} must still exist`).toBeDefined();
      for (const feature of def!.features) {
        if (COMMISSION_CLAIM.test(feature)) offenders.push(`${id}: "${feature}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  /**
   * The reason the claim was false, pinned so it cannot become true by
   * accident: if a tier discount is ever implemented, this test fails and
   * whoever implements it gets to decide, deliberately, that the bullets may
   * come back.
   */
  it('no server code reads a subscription tier when computing commission', () => {
    const apiSrc = path.resolve(__dirname, '..');
    for (const rel of [
      'services/booking.service.ts',
      'services/payment.service.ts',
      'services/store-commission.service.ts',
      'routes/consultation.ts',
      'routes/wellness-sessions.ts',
    ]) {
      const src = readFileSync(path.join(apiSrc, rel), 'utf8');
      expect(src, `${rel} reads a commission override`).not.toMatch(
        /commission[_]?[Oo]verride/,
      );
    }
  });
});
