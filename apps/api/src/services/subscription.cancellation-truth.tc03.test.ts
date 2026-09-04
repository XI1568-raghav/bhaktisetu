import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { subscriptionService, SubscriptionService } = await import('./subscription.service.js');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SERVICE_SRC = fs.readFileSync(path.join(HERE, 'subscription.service.ts'), 'utf8');

/**
 * TC-03 (P0, trust) — what `POST /subscriptions/cancel` tells the devotee.
 *
 * The web copy for NRI Premium was corrected in an earlier wave, but the
 * server kept publishing the same untrue sentence in its own response body:
 *
 *   cancel()                      -> "Subscription cancelled. Access continues
 *                                     until end of current billing period."
 *   cancelRazorpaySubscription()  -> "Auto-renewal cancelled. Access continues
 *                                     until end of current billing cycle."
 *
 * Both are false for the same reason, and the reason is in this very file:
 * `cancel()` does one write — `status: 'CANCELLED'` — and `isPremium()`
 * requires `status: 'ACTIVE'`, as does `getActivePlan()` in lib/ai-usage.ts.
 * `MarketplaceSubscription` has no `cancelAtPeriodEnd` column and no job that
 * restores anything, so access ends at the moment of cancellation.
 *
 * Each test below fails against the previous strings: the first two assert the
 * returned message, the third ties the wording to the ACTIVE filter that makes
 * it necessary, so the sentence cannot drift back without the column that
 * would make it true.
 */
describe('TC-03 — the cancel response tells the truth about access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cancel() answers that access ends now, and never that it continues', async () => {
    (prismaMock.marketplaceSubscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      status: 'ACTIVE',
    } as never);
    (prismaMock.marketplaceSubscription.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      {} as never,
    );

    const result = await subscriptionService.cancel('user-1');

    expect(result.cancelled).toBe(true);
    expect(result.message).not.toMatch(/continues until/i);
    expect(result.message).toMatch(/Access ends now/i);
    expect(result.message).toMatch(/No refund is issued automatically/i);
    expect(result.message).toMatch(/support@darshya\.online/);

    // And the write really is the immediate one the message now describes.
    const updateCalls = (prismaMock.marketplaceSubscription.update as ReturnType<typeof vi.fn>).mock
      .calls as Array<[{ data: { status: string } }]>;
    expect(updateCalls.length).toBe(1);
    const updateArgs = updateCalls[0]![0];
    expect(updateArgs.data.status).toBe('CANCELLED');
    expect(updateArgs.data).not.toHaveProperty('cancelAtPeriodEnd');
  });

  it('cancelRazorpaySubscription() separates "not charged again" from "still has access"', async () => {
    (prismaMock.transaction.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: 't1',
        metadata: { razorpaySubscriptionId: 'sub_demo_1', kind: 'razorpay_subscription_create' },
      },
    ] as never);
    (prismaMock.marketplaceSubscription.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      status: 'ACTIVE',
    } as never);
    (prismaMock.marketplaceSubscription.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      {} as never,
    );

    const result = await subscriptionService.cancelRazorpaySubscription('user-1');

    expect(result.cancelled).toBe(true);
    expect(result.message).toMatch(/will not be charged again/i);
    expect(result.message).toMatch(/Access ends now/i);
    expect(result.message).not.toMatch(/Access continues until/i);
  });

  it('the notice may not promise period-end access while the entitlement filters on ACTIVE', () => {
    // The two facts that make the old sentence false, read from the source so
    // that adding a real grace period is what unblocks re-wording it.
    const code = SERVICE_SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).toMatch(/isPremium[\s\S]{0,300}status: 'ACTIVE'/);
    expect(code).not.toMatch(/cancelAtPeriodEnd/);

    expect(SubscriptionService.CANCELLATION_NOTICE).not.toMatch(
      /continues until|until (the )?end of/i,
    );
    expect(SubscriptionService.CANCELLATION_NOTICE).toMatch(/ends now/i);

    // No message literal anywhere in the service may claim continued access.
    const literals = [...SERVICE_SRC.matchAll(/message:\s*'([^']*)'/g)].map((m) => m[1]);
    expect(literals.length).toBeGreaterThan(2);
    for (const literal of literals) {
      expect(literal, `message literal still promises continued access: ${literal}`).not.toMatch(
        /access continues/i,
      );
    }
  });
});
