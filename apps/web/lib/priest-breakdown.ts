/**
 * The three money figures the API sends for a pandit's booking, closed so they
 * add up on screen. `priceAmount` is what the devotee paid (puja fee plus the
 * platform fee), `platformCommission` is Darshya's cut of the puja fee and
 * `priestPayout` is the pandit's share. The page used to print only those three,
 * and 502 - 90 is not 361: the platform fee sat between them unlabelled.
 *
 * The fee is what is left over, not a new number: it is derived so the displayed
 * lines can never disagree with the displayed total. Anything that would make it
 * negative or non-finite (missing columns, a payout larger than the price) is
 * reported as no fee line rather than a broken one.
 */
export interface PriestBreakdown {
  priceAmount: number;
  commission: number;
  payout: number;
  /** Whole rupees kept by Darshya on top of the commission; 0 means "show no line". */
  platformFee: number;
}

const num = (v: unknown): number => {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

export function priestBreakdown(b: { priceAmount: number; platformCommission: number; priestPayout: number }): PriestBreakdown {
  const priceAmount = num(b.priceAmount);
  const commission = num(b.platformCommission);
  const payout = num(b.priestPayout);
  const rest = priceAmount - commission - payout;
  // Under 50 paise is rounding noise between the three stored columns, not a fee.
  const platformFee = priceAmount > 0 && rest >= 0.5 ? Math.round(rest) : 0;
  return { priceAmount, commission, payout, platformFee };
}
