/**
 * The published wedding-package catalogue — ONE copy, for the whole app.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The API has no wedding-package endpoint. `POST /api/v1/weddings/inquiry`
 * (apps/api/src/routes/weddings.ts:59) takes `package: z.enum(['basic',
 * 'premium','royal'])` and nothing else — no name, no price, no inclusions. So
 * the tier catalogue is published marketing copy, and the only question is
 * whether the app and the website publish the SAME copy.
 *
 * They did not. `app/(devotee)/weddings.tsx` carried a hand-typed tier row
 * reading `₹25k / ₹2L+ / ₹10L+` against the website's
 * `₹15,000 / ₹50,000 / ₹2,00,000`
 * (apps/web/app/weddings/packages/page.tsx, and the same three figures again in
 * the JSON-LD `offers` on apps/web/app/weddings/page.tsx and in the
 * `<select>` labels on apps/web/app/weddings/inquiry/page.tsx). Every tier was
 * wrong, and the Royal tier was wrong by 5x — a devotee who chose "Royal
 * ₹10L+" in the app and then opened the site saw a different product at a
 * fifth of the price, with the inquiry already sent.
 *
 * Nothing here is derived. These are the figures the website publishes, copied
 * once, in whole rupees so `formatInr` renders them the same way every money
 * figure in this app is rendered. `lib/__tests__/wedding-packages.parity.test.ts`
 * reads apps/web/app/weddings/packages/page.tsx and fails if the two ever
 * disagree again — the same drift guard the API's yatra tier prices already
 * carry (apps/api/src/lib/yatra-pricing.ts).
 *
 * To change a price: change the WEBSITE, then this file. Never only this file.
 */

export type WeddingPackageTier = 'basic' | 'premium' | 'royal';

export interface WeddingPackage {
  tier: WeddingPackageTier;
  name: string;
  /** Whole rupees. Rendered with `formatInr`; never multiplied or discounted. */
  priceInr: number;
  tagline: string;
  features: string[];
  popular?: boolean;
}

export const WEDDING_PACKAGES: readonly WeddingPackage[] = [
  {
    tier: 'basic',
    name: 'Basic',
    priceInr: 15000,
    tagline: 'Pandit-only at your venue.',
    features: [
      'Verified Vedic pandit',
      'Sankalp + saat phere',
      'Hindi or Sanskrit recitation',
      'Travel within 25 km of major cities',
      '2-hour ceremony',
    ],
  },
  {
    tier: 'premium',
    name: 'Premium',
    priceInr: 50000,
    tagline: 'Pandit + samagri + muhurat consultation.',
    popular: true,
    features: [
      'Everything in Basic',
      'Free kundli matching (Ashtakoota / Guna milan)',
      'Personalised muhurat consultation',
      'Full samagri kit shipped (mandap, kalash, havan)',
      'Pre-wedding briefing call',
      'Photographer co-ordination',
    ],
  },
  {
    tier: 'royal',
    name: 'Royal',
    priceInr: 200000,
    tagline: 'Full 4-day Vedic ceremony.',
    features: [
      'Everything in Premium',
      'Tilak ceremony (Day 1)',
      'Haldi + Mehendi (Day 2)',
      'Vivah sanskar with full mandap (Day 3)',
      'Grihapravesh + Satyanarayan puja (Day 4)',
      'Dedicated wedding concierge',
      'NRI co-ordination',
      'On-call Vedic scholar',
    ],
  },
] as const;

/** The tier a `?package=` route param names, or null when it names none. */
export function readPackageTier(value: unknown): WeddingPackageTier | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const match = WEDDING_PACKAGES.find((p) => p.tier === raw);
  return match ? match.tier : null;
}

export function weddingPackage(tier: WeddingPackageTier): WeddingPackage {
  const found = WEDDING_PACKAGES.find((p) => p.tier === tier);
  // Unreachable while `tier` is the union — but a non-null assertion here
  // would be the one place this module could hand back `undefined` to a
  // price field, so it is spelled out.
  if (!found) throw new Error(`Unknown wedding package tier: ${tier}`);
  return found;
}
