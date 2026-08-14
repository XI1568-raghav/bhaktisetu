/**
 * PAR-01 — client-side gate on paid subscription purchases.
 *
 * THE DEFECT. `POST /api/v1/subscriptions/subscribe` creates an ACTIVE
 * ₹5,000/yr ENTERPRISE subscription and a COMPLETED ₹5,000 Transaction with no
 * Razorpay order, no payment and no mandate
 * (apps/api/src/services/subscription.service.ts:284-307). The Upgrade screen
 * then read a missing `shortUrl` as "the plan was granted server-side" and told
 * the user "Upgrade complete — your Premium benefits are now active." Free
 * Premium for anyone who taps the button, and ₹5,000 of phantom revenue in the
 * admin ledger each time.
 *
 * WHY THE APP CANNOT SIMPLY "USE THE OTHER ENDPOINT". The mandate rail,
 * `POST /api/v1/subscriptions/create`, maps a Darshya plan to a Razorpay plan
 * via `mapToRazorpayPlanId` (subscription.service.ts:637-649). That map has no
 * entry for `nri_premium_yearly`, so `rzpPlanId` is '' and `isDemo` is true for
 * this plan even with a live Razorpay key — and the demo branch calls
 * `this.subscribe(...)`, i.e. the same free grant (subscription.service.ts:446).
 * There is therefore no server path today that charges for this plan.
 *
 * WHAT THE APP DOES INSTEAD. It refuses to initiate the purchase and says so.
 * The gate opens only when the server reports a real, non-placeholder Razorpay
 * key (`GET /api/v1/payments/config`). It defaults CLOSED — unknown config, a
 * failed request, or the `rzp_test_demo` placeholder all block. Closing the
 * remaining hole (a live key + a mapped plan id that still grants without
 * payment) requires the server fix: PENDING subscription, real mandate, and
 * activation only from the verified webhook.
 */

export interface PaymentConfig {
  keyId: string | null;
  isDemo?: boolean;
}

export type UpgradeGateReason =
  | 'ok'
  | 'already-premium'
  | 'payment-config-unknown'
  | 'payments-not-configured';

export interface UpgradeGate {
  canPurchase: boolean;
  reason: UpgradeGateReason;
  message: string | null;
}

/**
 * Shown in place of the buy button. It must never imply anything was purchased
 * or activated — that claim is the whole of PAR-01.
 */
export const UPGRADE_BLOCKED_MESSAGE =
  'Premium checkout is not available in the app yet. Nothing has been charged and no plan has been activated. ' +
  'We will enable it here as soon as the payment gateway is live for this plan.';

export const UPGRADE_CONFIG_UNKNOWN_MESSAGE =
  'Could not confirm the payment gateway. Pull down to retry — no charge has been made.';

/** The placeholder key the API falls back to when Razorpay is unconfigured. */
const DEMO_KEY_PLACEHOLDER = 'rzp_test_demo';

export function isLivePaymentRail(config: PaymentConfig | undefined | null): boolean {
  if (!config) return false;
  if (config.isDemo === true) return false;
  const key = typeof config.keyId === 'string' ? config.keyId.trim() : '';
  if (key === '' || key === DEMO_KEY_PLACEHOLDER) return false;
  return true;
}

export function evaluateUpgradeGate(args: {
  paymentConfig: PaymentConfig | undefined | null;
  configError?: unknown;
  isPremium: boolean;
}): UpgradeGate {
  if (args.isPremium) {
    return { canPurchase: false, reason: 'already-premium', message: null };
  }
  if (args.configError || args.paymentConfig == null) {
    return {
      canPurchase: false,
      reason: 'payment-config-unknown',
      message: UPGRADE_CONFIG_UNKNOWN_MESSAGE,
    };
  }
  if (!isLivePaymentRail(args.paymentConfig)) {
    return {
      canPurchase: false,
      reason: 'payments-not-configured',
      message: UPGRADE_BLOCKED_MESSAGE,
    };
  }
  return { canPurchase: true, reason: 'ok', message: null };
}

/**
 * A checkout response only counts as started if the server handed back a real
 * hosted payment URL. `skipped: true` is the API telling us it took the demo
 * branch and granted the plan without charging — that is a failure, not a sale.
 */
export function extractCheckoutUrl(response: unknown): string | null {
  if (typeof response !== 'object' || response === null) return null;
  const sub = (response as { subscription?: unknown }).subscription;
  if (typeof sub !== 'object' || sub === null) return null;
  const s = sub as { shortUrl?: unknown; url?: unknown; skipped?: unknown };
  if (s.skipped === true) return null;
  const url = typeof s.shortUrl === 'string' ? s.shortUrl : typeof s.url === 'string' ? s.url : null;
  return url && /^https?:\/\//i.test(url) ? url : null;
}
