'use client';

import { PLATFORM_FEE_INR, formatInr, pujaTotalInr } from '../../lib/puja-pricing';
import { formatUsd, nriPujaPriceInr, nriTotalInr, usdFromInr, usdPriceLine } from '../../lib/nri-pricing';
import { useDisplayCurrency } from './useDisplayCurrency';

/**
 * A puja price in the devotee's display currency.
 *
 *  part="main"  the headline price  (₹1,100  or  $32)
 *  part="note"  the fee / total line beneath it
 *
 * `domesticPuja` is the domestic INR puja price (temple override or base). The
 * USD figures are the NRI price: domesticPuja x 2.5 rounded to ₹10 (the same
 * INR amount the server charges), converted for display only.
 */
export function PujaPrice({
  domesticPuja,
  part,
  prefix = '',
}: {
  domesticPuja: number;
  part: 'main' | 'note';
  prefix?: string;
}) {
  const { currency } = useDisplayCurrency();
  const usd = currency === 'USD';

  if (part === 'main') {
    return (
      <>
        {prefix}
        {usd ? formatUsd(usdFromInr(nriPujaPriceInr(domesticPuja))) : `₹${formatInr(domesticPuja)}`}
      </>
    );
  }

  if (usd) {
    const total = nriTotalInr(domesticPuja, false);
    return (
      <>
        + ₹{formatInr(PLATFORM_FEE_INR)} platform fee · total {usdPriceLine(total)}
      </>
    );
  }
  return (
    <>
      + ₹{formatInr(PLATFORM_FEE_INR)} platform fee · ₹{formatInr(pujaTotalInr(domesticPuja, false))} total
    </>
  );
}
