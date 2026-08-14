import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * RES-04 — the puja wizard's own Razorpay loader.
 *
 * `lib/razorpay-loader.ts` was extracted for this finding and adopted by
 * `app/checkout/offering/page.tsx`. The wizard at `app/pujas/book/page.tsx`
 * still carried its own copy: `new Promise((resolve) => { script.onload = …;
 * document.body.appendChild(script); })` with no `onerror` and no timer. If
 * checkout.razorpay.com is blocked by an ad-blocker, a corporate filter or a
 * CDN blip, that promise never settles.
 *
 * The cost is not a slow page. `await loadRazorpay()` sits AFTER
 * `POST /bookings/create-order` has already succeeded, so a PujaBooking row and
 * a live Razorpay order both exist server-side, holding one of the five places
 * on that muhurat slot, while `paymentLoading` stays true and the Pay button is
 * disabled forever. The devotee cannot pay, cannot retry, and has no reference
 * number to give support. The correct message ("Could not load Razorpay
 * checkout. Please retry.") was already written in the branch below and could
 * never be reached.
 *
 * Source-level because the failure is a script tag that never fires an event —
 * a behaviour happy-dom cannot honestly reproduce. What is worth locking is
 * mechanical: this file must not define a second loader, and must use the one
 * that handles onerror and a timeout.
 */

const PAGE = join(__dirname, '..', 'app', 'pujas', 'book', 'page.tsx');

function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('RES-04 — the puja wizard uses the shared Razorpay loader', () => {
  const raw = readFileSync(PAGE, 'utf8');
  const src = code(raw);

  it('does not define its own loader', () => {
    expect(
      /const\s+loadRazorpay\s*[:=]/.test(src),
      'a local loader with no onerror and no timeout locks the Pay button after the order is minted',
    ).toBe(false);
  });

  it('imports loadRazorpayCheckout from lib/razorpay-loader', () => {
    expect(src).toMatch(/import\s*\{[^}]*loadRazorpayCheckout[^}]*\}\s*from\s*'[^']*razorpay-loader'/);
  });

  it('never appends the checkout script directly', () => {
    // The whole defect is a hand-rolled <script> injection. One loader, one
    // failure contract — a second copy is how these two flows diverged.
    expect(src).not.toMatch(/checkout\.razorpay\.com\/v1\/checkout\.js/);
  });

  it('still reaches the retry message when the loader gives up', () => {
    // The loader resolves `undefined` on error OR timeout; this branch is what
    // turns that into something the devotee can act on.
    expect(raw).toMatch(/Could not load Razorpay checkout/);
  });
});
