import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import Fastify from 'fastify';
import { subscriptionRoutes } from './subscriptions.js';

/** 2026-10-29: /plans reports per plan whether it can be charged, and never names an env var. */

const ENV = { ...process.env };
async function plans(role: string) {
  const app = Fastify();
  await app.register(subscriptionRoutes, { prefix: '/api/v1/subscriptions' });
  const res = await app.inject({ method: 'GET', url: `/api/v1/subscriptions/plans?role=${role}` });
  await app.close();
  return res.json() as { plans: Array<{ id: string; price: number; purchasable: boolean }> };
}

beforeEach(() => { process.env = { ...ENV }; });
afterEach(() => { process.env = { ...ENV }; });

describe('GET /subscriptions/plans purchasable flag', () => {
  it('production with real keys but no plan ids: free plans are purchasable, paid are not', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RAZORPAY_KEY_ID = 'rzp_live_x';
    for (const k of Object.keys(process.env)) if (k.startsWith('RAZORPAY_PLAN_')) delete process.env[k];
    const { plans: list } = await plans('PANDIT');
    expect(list.length).toBeGreaterThan(0);
    for (const p of list) expect(p.purchasable, p.id).toBe(p.price === 0);
    expect(JSON.stringify(list)).not.toMatch(/RAZORPAY|PLAN_/);
  });

  it('a plan whose env id is set becomes purchasable', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RAZORPAY_KEY_ID = 'rzp_live_x';
    process.env.RAZORPAY_PLAN_PANDIT_PRO = 'plan_abc123';
    const { plans: list } = await plans('PANDIT');
    expect(list.find((p) => p.id === 'plan-pandit-pro')?.purchasable).toBe(true);
    expect(list.find((p) => p.id === 'plan-pandit-basic')?.purchasable).toBe(false);
  });

  it('production with demo credentials sells nothing priced', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
    const { plans: list } = await plans('PANDIT');
    for (const p of list.filter((x) => x.price > 0)) expect(p.purchasable).toBe(false);
  });
});
