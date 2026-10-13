import { describe, it, expect, vi, afterEach } from 'vitest';
import { subscribeToFreePlan } from '../lib/subscription-api';

/** The API's /subscriptions/subscribe requires { planId, role }; the web sent only planId, so every free-plan claim was a 400. */
describe('subscribeToFreePlan', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends the API role alongside the plan id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ subscription: { id: 's1', status: 'ACTIVE' } }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await subscribeToFreePlan('tok', 'plan_free', 'priest');
    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string);
    expect(body.planId).toBe('plan_free');
    expect(body.role).toBe('PANDIT');
  });
});
