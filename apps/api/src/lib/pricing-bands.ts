/**
 * pricing-bands.ts — competitor-anchored at-home puja price bands
 * (booking revamp 2026-08-04).
 *
 * Source: scraped competitor data from the 2026-08-04 market scan
 * (99Pandit, SmartPuja, PujaPurohit, Harivara, Vedic Tatva, Gopuja, Sri Mandir).
 * Every band below cites its anchor. These are the reference prices the
 * at-home (PriestPujaOffering) catalog should be seeded from, and the bands
 * the tier premium logic multiplies.
 *
 * Pricing model decisions (founder-approved 2026-08-04):
 *  - T1 instant: SURGE-CAPPED same-price (≤2x on auspicious-muhurat days),
 *    NOT a flat instant fee. Anchors: India govt 2x ride-hailing surge cap;
 *    AstroTalk proves Indians pay premiums for instant spiritual service.
 *  - Take rate: 20% platform / 80% pandit (matches/beats Sri Mandir's 20-25%
 *    to win supply; was 30%). See booking.service DEFAULT_PRIEST_SHARE.
 *  - Samagri: BUNDLE into headline price (SmartPuja & 99Pandit both do) +
 *    offer PREMIUM samagri as an itemized add-on (captures the segment that
 *    wants to upgrade — best of both, per research).
 */

export interface PujaPriceBand {
  /** Slug of the puja (matches PriestPujaOffering / catalog). */
  slug: string;
  displayName: string;
  /** Budget tier (T1 instant pool / T4 standard). Entry price point. */
  budgetInr: number;
  /** Mid tier (T2 1-hour, standard quality). */
  midInr: number;
  /** Premium tier (T3 senior, 15+ yr pandit, more ritual scope). */
  premiumInr: number;
  /** Competitor anchor for the budget/mid points. */
  anchor: string;
}

/**
 * Reference bands (metro, all-inclusive of dakshina + travel + base samagri).
 * City multiplier: Delhi runs ~15-35% below Bangalore (SmartPuja data) — apply
 * CITY_MULTIPLIER for non-default cities.
 */
export const PUJA_PRICE_BANDS: PujaPriceBand[] = [
  {
    slug: 'satyanarayan-puja',
    displayName: 'Satyanarayan Puja',
    budgetInr: 3100,
    midInr: 5100,
    premiumInr: 7500,
    anchor: '99Pandit ₹3,100–6,500; SmartPuja ₹5,100/25k/41k',
  },
  {
    slug: 'griha-pravesh',
    displayName: 'Griha Pravesh Puja',
    budgetInr: 6500,
    midInr: 11000,
    premiumInr: 21000,
    anchor: 'PujaPurohit ₹6,633/8,305; SmartPuja ₹10k–41k; 99Pandit ₹5,100–25k',
  },
  {
    slug: 'rudrabhishek',
    displayName: 'Rudrabhishek Puja',
    budgetInr: 4500,
    midInr: 5100,
    premiumInr: 12000,
    anchor: 'SmartPuja ₹5,100–25k; 99Pandit ₹5,100–11k; Vedic Tatva ₹4,550',
  },
  {
    slug: 'navagraha-shanti',
    displayName: 'Navagraha Shanti Puja',
    budgetInr: 5500,
    midInr: 10000,
    premiumInr: 15000,
    anchor: '99Pandit from ₹5,500; SmartPuja ₹10k–25k',
  },
  {
    slug: 'vastu-shanti',
    displayName: 'Vastu Shanti Puja',
    budgetInr: 2100,
    midInr: 11000,
    premiumInr: 15000,
    anchor: '99Pandit ₹2,100–7,100; SmartPuja ₹11k/15k',
  },
  {
    slug: 'engagement-sagai',
    displayName: 'Engagement (Sagai) Puja',
    budgetInr: 5100,
    midInr: 8100,
    premiumInr: 11000,
    anchor: '99Pandit ₹5,100–11,000',
  },
  {
    slug: 'vivah-marriage',
    displayName: 'Marriage (Vivah) Puja',
    budgetInr: 11000,
    midInr: 28000,
    premiumInr: 41000,
    anchor: '99Pandit ₹11k–25k; SmartPuja ₹28k/41k',
  },
  {
    slug: 'ganesh-puja',
    displayName: 'Ganesh Puja',
    budgetInr: 2500,
    midInr: 3250,
    premiumInr: 5100,
    anchor: 'Vedic Tatva ₹3,250; Gopuja Ganesh Chaturthi ₹2,499',
  },
  {
    slug: 'mundan-sanskar',
    displayName: 'Mundan Sanskar',
    budgetInr: 4500,
    midInr: 5100,
    premiumInr: 7500,
    anchor: 'SmartPuja ₹5,100',
  },
  {
    slug: 'namkaran',
    displayName: 'Namkaran (Naming) Puja',
    budgetInr: 2999,
    midInr: 5100,
    premiumInr: 7500,
    anchor: 'SmartPuja ₹5,100/7,500/18,000; Gopuja ₹2,999',
  },
  {
    slug: 'vehicle-puja',
    displayName: 'Vehicle Puja',
    budgetInr: 1500,
    midInr: 2100,
    premiumInr: 3100,
    anchor: 'SmartPuja ₹1,500/2,100; 99Pandit ₹3,100–7,100',
  },
];

/** Per-city price multiplier vs the default (Bangalore/metro) band. */
export const CITY_MULTIPLIER: Record<string, number> = {
  bangalore: 1.0,
  bengaluru: 1.0,
  mumbai: 1.05,
  hyderabad: 0.95,
  chennai: 0.95,
  pune: 0.95,
  delhi: 0.8, // SmartPuja: Delhi Satyanarayan ₹4,100 vs Bangalore ₹5,100 (~20-35% lower)
  'delhi-ncr': 0.8,
  kolkata: 0.85,
  default: 0.9, // tier-2/3 cities default slightly below metro
};

/** T1 instant surge cap (India govt ride-hailing cap anchor). */
export const INSTANT_SURGE_CAP = 2.0;

/**
 * Resolve the display price for a puja at a given tier + city.
 * tier: 'budget' | 'mid' | 'premium' maps to T1/T4, T2, T3 respectively.
 * isMuhuratPeak: apply surge (capped) on auspicious-muhurat days for instant.
 */
export function resolvePujaPrice(opts: {
  slug: string;
  tier?: 'budget' | 'mid' | 'premium';
  city?: string;
  isMuhuratPeak?: boolean;
  surgeMultiplier?: number; // pre-cap surge (e.g. 1.6); clamped to INSTANT_SURGE_CAP
}): { priceInr: number; baseInr: number; surgeApplied: number } | null {
  const band = PUJA_PRICE_BANDS.find((b) => b.slug === opts.slug);
  if (!band) return null;
  const tier = opts.tier ?? 'budget';
  const baseInr =
    tier === 'premium' ? band.premiumInr : tier === 'mid' ? band.midInr : band.budgetInr;
  const cityKey = (opts.city ?? 'default').toLowerCase();
  const cityMult = CITY_MULTIPLIER[cityKey] ?? CITY_MULTIPLIER.default!;
  let price = baseInr * cityMult;
  let surgeApplied = 1;
  if (opts.isMuhuratPeak) {
    surgeApplied = Math.min(opts.surgeMultiplier ?? INSTANT_SURGE_CAP, INSTANT_SURGE_CAP);
    price *= surgeApplied;
  }
  return { priceInr: Math.round(price), baseInr, surgeApplied };
}
