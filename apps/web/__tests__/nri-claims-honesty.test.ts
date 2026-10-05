import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (p: string) => readFileSync(path.join(__dirname, '..', p), 'utf8');

/**
 * NRI flow audit (2026-10-05). What the code does today:
 *  - every devotee, in every country, is charged the listed INR price
 *    (+ ₹51 platform fee, + flat ₹150 if prasad is added) through Razorpay;
 *  - there is no NRI multiplier, no USD price, no live-darshan add-on and no
 *    per-destination prasad fee;
 *  - the referral reward is credited to the REFERRER only, and nothing in the
 *    API can spend wallet credit.
 * Each assertion below pins a public sentence that used to say otherwise.
 */
describe('NRI public pages only claim what the product does', () => {
  it('/nri-pujas: no invented USD price ranges, no dead puja links, no unbacked add-ons', () => {
    const src = read('app/nri-pujas/page.tsx');
    expect(src).not.toMatch(/est:\s*'\$/);
    // these four slugs 404 — they are not in the puja catalogue
    for (const dead of [
      'lakshmi-puja-diwali',
      'shraadh-pitra-paksh',
      'birthday-janmadin-puja',
      'griha-pravesh',
    ]) {
      expect(src, dead).not.toContain(dead);
    }
    expect(src).not.toContain('NRI prices are priced separately');
    expect(src).not.toContain('₹500 / $8');
    expect(src).not.toContain('within 6 hours');
    expect(src).not.toContain('60+ countries');
    // the prices it does show come from the live catalogue
    expect(src).toContain('getPujaTypes');
  });

  it('/nri: no NRI surcharge row, no "daily cap" (the free limit is monthly)', () => {
    const src = read('app/nri/page.tsx');
    expect(src).not.toContain('NRI 9-10× rate');
    expect(src).not.toContain('5-message daily cap');
    expect(src).not.toContain('Saves $30-200');
  });

  it('/faqs: no 9-10× NRI price claim', () => {
    const src = read('lib/faqs.ts');
    expect(src).not.toContain('NRI pricing is roughly 9-10× domestic');
  });

  it('/why-darshya: no NRI multiplier or USD processing fee', () => {
    const src = read('app/why-darshya/page.tsx');
    expect(src).not.toContain('9-10× domestic');
    expect(src).not.toContain('listed price + fixed processing in USD');
  });

  it('/pitch: does not describe the product as already having NRI multiplier pricing', () => {
    const src = read('app/pitch/page.tsx');
    expect(src).not.toContain('INR + 9-10× NRI pricing native');
    expect(src).not.toContain('NRI pricing\n            9-10× domestic, configured per puja');
  });

  it('/shipping: prasad is a flat ₹150 add-on for every address, not "included" or "calculated"', () => {
    const src = read('app/shipping/page.tsx');
    expect(src).not.toContain('is included in the puja fee for domestic addresses');
    expect(src).not.toContain('NRI addresses incur');
    expect(src).not.toContain('is calculated by');
    expect(src).toContain('PRASAD_DELIVERY_FEE_INR');
  });

  it('/refer: the reward is the referrer\'s wallet credit; no promise to the friend or of spending it', () => {
    const src = read('app/refer/page.tsx');
    expect(src).not.toContain('they get ₹100 off too');
    expect(src).not.toContain('you both receive');
    expect(src).not.toContain('you both get');
    expect(src).not.toContain('we both get');
    expect(src).not.toContain('usable on any puja, darshan or store purchase');
  });
});
