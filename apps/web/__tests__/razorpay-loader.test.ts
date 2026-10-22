import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loadRazorpayCheckout,
  RAZORPAY_LOAD_TIMEOUT_MS,
  RAZORPAY_SCRIPT_SRC,
} from '../lib/razorpay-loader';

/**
 * RES-04 (prod sweep 2026-08-12, P1).
 *
 * Both puja payment flows built the Razorpay loader as
 * `new Promise((resolve) => { script.onload = …; document.body.appendChild(script) })`
 * with NO `script.onerror` and no timer. If checkout.razorpay.com never loads —
 * ad-blocker, corporate/ISP filter, CDN blip — that promise NEVER SETTLES.
 *
 * The `await loadRazorpay()` sits AFTER `POST /bookings/create-order` has
 * already succeeded, so a pending_payment PujaBooking row and a live Razorpay
 * order already exist server-side holding slot capacity, while `paymentLoading`
 * stays true and the Pay button is permanently disabled behind a spinner. The
 * user cannot pay, cannot retry, and gets no reference. The correct message
 * ("Could not load Razorpay checkout. Please retry.") was already written — it
 * just sat behind a branch the code could never reach.
 *
 * NOTE ON THE APPEND SPY. happy-dom fires `error` SYNCHRONOUSLY when a script
 * with an external src is appended (it cannot fetch it). Without the spy the
 * timeout test below would resolve via that error and pass while proving
 * nothing about the timer — the exact shape of vacuous test this repo has
 * shipped before. The spy keeps the script detached so the ONLY thing that can
 * settle the promise is the guard under test.
 */

const realRazorpay = (window as { Razorpay?: unknown }).Razorpay;

afterEach(() => {
  document.querySelectorAll('script[src*="razorpay"]').forEach((s) => s.remove());
  if (realRazorpay === undefined) delete (window as { Razorpay?: unknown }).Razorpay;
  else (window as { Razorpay?: unknown }).Razorpay = realRazorpay;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function makeCtor() {
  return function Razorpay() {} as unknown as new (o: Record<string, unknown>) => {
    open: () => void;
    on: (e: string, h: (r: { error?: { description?: string } }) => void) => void;
  };
}

/** Keeps the appended <script> detached and hands it back for driving events. */
function captureScript() {
  const spy = vi
    .spyOn(document.body, 'appendChild')
    .mockImplementation((node: Node) => node as never);
  return () => spy.mock.calls[0]![0] as unknown as HTMLScriptElement;
}

describe('loadRazorpayCheckout', () => {
  it('resolves undefined when the script fails to load, instead of hanging forever', async () => {
    const script = captureScript();
    const pending = loadRazorpayCheckout();
    script().onerror!(new Event('error'));
    await expect(pending).resolves.toBeUndefined();
  });

  it('resolves undefined when the script neither loads nor errors within the budget', async () => {
    vi.useFakeTimers();
    const script = captureScript();
    const pending = loadRazorpayCheckout();
    // A CDN that accepts the connection and says nothing fires NO event at all
    // — the case `onerror` alone does not cover.
    expect(script().src).toBe(RAZORPAY_SCRIPT_SRC);
    vi.advanceTimersByTime(RAZORPAY_LOAD_TIMEOUT_MS + 1);
    await expect(pending).resolves.toBeUndefined();
  });

  it('resolves the constructor once the script loads', async () => {
    const ctor = makeCtor();
    const script = captureScript();
    const pending = loadRazorpayCheckout();
    (window as { Razorpay?: unknown }).Razorpay = ctor;
    script().onload!(new Event('load'));
    await expect(pending).resolves.toBe(ctor);
  });

  it('reuses an already-loaded Razorpay without appending a second script', async () => {
    const ctor = makeCtor();
    (window as { Razorpay?: unknown }).Razorpay = ctor;
    const script = captureScript();
    await expect(loadRazorpayCheckout()).resolves.toBe(ctor);
    expect(script).toThrow(); // no call recorded — nothing was appended
  });
});

describe('preloadRazorpayCheckout / in-flight dedupe', () => {
  it('shares one script tag between a preload and the later Pay press', async () => {
    delete (window as { Razorpay?: unknown }).Razorpay;
    const appended: HTMLScriptElement[] = [];
    vi.spyOn(document.body, 'appendChild').mockImplementation(((el: HTMLScriptElement) => {
      appended.push(el);
      return el;
    }) as never);
    const { preloadRazorpayCheckout } = await import('../lib/razorpay-loader');
    preloadRazorpayCheckout();
    const pending = loadRazorpayCheckout();
    expect(appended).toHaveLength(1);
    (window as { Razorpay?: unknown }).Razorpay = function Fake() {};
    appended[0]!.onload?.(new Event('load'));
    await expect(pending).resolves.toBeTypeOf('function');
  });
});
