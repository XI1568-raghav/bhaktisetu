/**
 * Rupees for a screen that shows money the devotee will actually receive or
 * keep. `Math.round` on each figure separately turned a ₹376.50 refund and a
 * ₹125.50 retained amount into ₹377 and ₹126, which add up to ₹503 on a ₹502
 * booking. Paise are printed only when there are some, so whole amounts stay
 * clean (`₹502`) and half-rupee amounts stay exact (`₹376.50`).
 */
export function formatInrExact(amount: number): string {
  const paise = Math.round(amount * 100);
  const whole = paise % 100 === 0;
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}
