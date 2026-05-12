/**
 * Centralized "is this Razorpay credential good enough for prod?" check.
 *
 * Background: payment.service.ts already crashes at boot when running in
 * production with the demo placeholder. Other Razorpay-touching modules
 * (donations route, subscription service) used to silently fall through
 * to a demo path that issues `order_demo_*` ids, signs nothing, and tells
 * the user "payment successful" while no money moved. In production this
 * looks identical to a real success — confused devotees, no ledger row,
 * no donee 80G receipt.
 *
 * Rule: every callsite that branches on demo-mode MUST first call
 * `assertNotProductionDemo` before continuing. ALLOW_DEMO_PAYMENTS=true
 * remains the documented staging escape hatch.
 */

export function isRazorpayDemoMode(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  return !keyId || keyId === 'rzp_test_demo';
}

export function assertNotProductionDemo(callsite: string): void {
  if (
    isRazorpayDemoMode() &&
    process.env.NODE_ENV === 'production' &&
    process.env.ALLOW_DEMO_PAYMENTS !== 'true'
  ) {
    throw new Error(
      `[${callsite}] RAZORPAY_KEY_ID missing or set to demo placeholder in production. ` +
        'Set real Razorpay credentials or ALLOW_DEMO_PAYMENTS=true (staging only).',
    );
  }
}
