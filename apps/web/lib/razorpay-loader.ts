/**
 * The one Razorpay checkout.js loader.
 *
 * RES-04 (prod sweep 2026-08-12): the puja payment flows each built their own
 * loader as
 *
 *   new Promise((resolve) => { script.onload = …; document.body.appendChild(script) })
 *
 * with NO `script.onerror` and no timer. If checkout.razorpay.com never loads —
 * an ad-blocker, a corporate/ISP filter, a CDN blip — that promise never
 * settles. The `await` sits AFTER `POST /bookings/create-order` has already
 * succeeded, so a `pending_payment` PujaBooking and a live Razorpay order exist
 * server-side holding slot capacity while the Pay button stays disabled behind
 * a spinner that never stops. The user cannot pay, cannot retry, and gets no
 * reference number to quote to support.
 *
 * The correct message was already written at both call sites
 * ("Could not load Razorpay checkout. Please retry.") — it simply sat behind a
 * branch that could never be reached. Two guards make it reachable:
 *
 *   onerror  — the CDN answered, with a failure.
 *   timeout  — the CDN accepted the connection and said nothing, which fires
 *              no event at all and is the case `onerror` alone does not cover.
 *
 * Sibling flows already resolved a falsy value on error (components/DonationForm,
 * app/astrology/[id]/book, app/store/checkout), so this was an omission rather
 * than a design choice. It lives in lib/ so every flow shares one implementation
 * instead of a copy each — copies are how the two puja flows drifted apart from
 * their own siblings in the first place.
 */

export type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
};
export type RazorpayConstructor = new (options: Record<string, unknown>) => RazorpayInstance;
type RazorpayWindow = typeof window & { Razorpay?: RazorpayConstructor };

export const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * How long to wait for checkout.js before giving up.
 *
 * Deliberately shorter than an API timeout: the user has already pressed Pay
 * and is watching, and a slow-but-eventual script is far less useful than a
 * fast, honest "could not load — retry" they can act on.
 */
export const RAZORPAY_LOAD_TIMEOUT_MS = 10_000;

export function loadRazorpayCheckout(
  timeoutMs: number = RAZORPAY_LOAD_TIMEOUT_MS,
): Promise<RazorpayConstructor | undefined> {
  return new Promise((resolve) => {
    const w = window as RazorpayWindow;
    if (w.Razorpay) {
      resolve(w.Razorpay);
      return;
    }

    let settled = false;
    const finish = (value: RazorpayConstructor | undefined) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => finish(undefined), timeoutMs);

    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.onload = () => finish((window as RazorpayWindow).Razorpay);
    script.onerror = () => finish(undefined);
    document.body.appendChild(script);
  });
}
