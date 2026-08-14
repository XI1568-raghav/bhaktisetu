/**
 * PAR-01 — the mobile Upgrade screen must never grant a paid subscription.
 *
 * Reproduction of the defect (verified 2026-08-12 against the live API):
 *   POST /api/v1/subscriptions/subscribe {planId:'nri_premium_yearly',role:'DEVOTEE'}
 *     -> 200 {"subscription":{"plan":"ENTERPRISE","amount":5000,"status":"ACTIVE",...}}
 *   GET  /api/v1/subscriptions/is-premium -> {"isPremium":true}
 *   GET  /api/v1/admin/dashboard -> recentTransactions[0]
 *        = {"type":"SUBSCRIPTION","amount":5000,"status":"COMPLETED"}
 *   ...with no Razorpay order, no payment and no mandate anywhere in the flow
 *   (apps/api/src/services/subscription.service.ts:284-307 writes ACTIVE +
 *   COMPLETED unconditionally).
 *
 * The server fix (PENDING subscription + mandate + webhook activation) lives in
 * apps/api, which this change does not own. What the app CAN guarantee is that
 * it never initiates a grant it cannot pay for, and never tells the user an
 * upgrade succeeded when no money moved. That is what these tests pin.
 */
import { describe, it, expect } from 'vitest';
import fixtures from './fixtures/live-api-2026-08-12.json';
import {
  evaluateUpgradeGate,
  UPGRADE_BLOCKED_MESSAGE,
} from '../subscription-gate';

describe('PAR-01 — paid upgrade gate', () => {
  it('blocks the upgrade while the server reports a demo payment rail', () => {
    // GET /api/v1/payments/config on the live stack right now.
    expect(fixtures.paymentsConfig.body).toEqual({ keyId: null, isDemo: true });
    const gate = evaluateUpgradeGate({
      paymentConfig: fixtures.paymentsConfig.body,
      isPremium: false,
    });
    expect(gate.canPurchase).toBe(false);
    expect(gate.reason).toBe('payments-not-configured');
    expect(gate.message).toBe(UPGRADE_BLOCKED_MESSAGE);
  });

  it('blocks while the payment config has not loaded — never optimistically', () => {
    const gate = evaluateUpgradeGate({ paymentConfig: undefined, isPremium: false });
    expect(gate.canPurchase).toBe(false);
    expect(gate.reason).toBe('payment-config-unknown');
  });

  it('blocks when the config request failed', () => {
    const gate = evaluateUpgradeGate({
      paymentConfig: undefined,
      configError: new Error('Network request failed'),
      isPremium: false,
    });
    expect(gate.canPurchase).toBe(false);
    expect(gate.reason).toBe('payment-config-unknown');
  });

  it('reports an already-premium account without offering a purchase', () => {
    const gate = evaluateUpgradeGate({
      paymentConfig: { keyId: 'rzp_live_xxx', isDemo: false },
      isPremium: true,
    });
    expect(gate.canPurchase).toBe(false);
    expect(gate.reason).toBe('already-premium');
  });

  it('only allows a purchase when a live (non-demo) key is configured', () => {
    const gate = evaluateUpgradeGate({
      paymentConfig: { keyId: 'rzp_live_xxx', isDemo: false },
      isPremium: false,
    });
    expect(gate.canPurchase).toBe(true);
    expect(gate.reason).toBe('ok');
  });

  it('treats the rzp_test_demo placeholder as no payment rail', () => {
    const gate = evaluateUpgradeGate({
      paymentConfig: { keyId: 'rzp_test_demo', isDemo: false },
      isPremium: false,
    });
    expect(gate.canPurchase).toBe(false);
    expect(gate.reason).toBe('payments-not-configured');
  });

  it('the blocked message states plainly that nothing was charged or activated', () => {
    expect(UPGRADE_BLOCKED_MESSAGE).toMatch(/not available/i);
    expect(UPGRADE_BLOCKED_MESSAGE).toMatch(/charged/i);
    // It must NOT be the old lie.
    expect(UPGRADE_BLOCKED_MESSAGE).not.toMatch(/upgrade complete/i);
    expect(UPGRADE_BLOCKED_MESSAGE).not.toMatch(/benefits are now active/i);
  });
});
