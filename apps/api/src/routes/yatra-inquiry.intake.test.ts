import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sendEmail = vi.fn();
vi.mock('../lib/email.js', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

import Fastify from 'fastify';
import { yatraInquiryRoutes, __testing } from './yatra-inquiry.js';

// QA 2026-10-29: the inquiry POST sent the desk mail, then the buyer mail, one
// after the other (each a Resend round trip with no timeout), and a client-side
// retry after a timeout sent both again. The mails now go out side by side and
// a repeated clientRequestId is answered with the first reference.

const BODY = {
  yatraSlug: 'char-dham',
  yatraTitle: 'Char Dham Yatra',
  packageTier: 'standard' as const,
  startDate: '2027-02-10',
  travelersCount: 2,
  totalInr: 100000,
  buyer: { name: 'QA Buyer', email: 'qa@example.com', phone: '', country: 'India' },
};

function post(app: ReturnType<typeof Fastify>, body: unknown) {
  return app.inject({ method: 'POST', url: '/api/v1/yatra-inquiry/', payload: body as object });
}

describe('POST /yatra-inquiry (intake)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __testing.inquiryReplay.clear();
    sendEmail.mockResolvedValue({ ok: true });
  });

  async function makeApp() {
    const app = Fastify();
    await app.register(yatraInquiryRoutes, { prefix: '/api/v1/yatra-inquiry' });
    return app;
  }

  it('starts both emails before either has finished (concurrent, not sequential)', async () => {
    const app = await makeApp();
    let started = 0;
    let maxInFlight = 0;
    let inFlight = 0;
    sendEmail.mockImplementation(async () => {
      started += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 30));
      inFlight -= 1;
      return { ok: true };
    });
    const res = await post(app, BODY);
    expect(res.statusCode).toBe(200);
    expect(started).toBe(2);
    expect(maxInFlight).toBe(2);
    expect(res.json()).toMatchObject({ ok: true, waDelivery: 'skipped' });
    expect(res.json().referenceId).toMatch(/^YTR-\d{8}-[0-9A-F]{6}$/);
  });

  it('a failing mail never fails the request', async () => {
    const app = await makeApp();
    sendEmail.mockRejectedValue(new Error('resend down'));
    const res = await post(app, BODY);
    expect(res.statusCode).toBe(200);
  });

  it('answers a repeated clientRequestId with the first reference and sends nothing more', async () => {
    const app = await makeApp();
    const first = await post(app, { ...BODY, clientRequestId: 'req-abcdef-123456' });
    const second = await post(app, { ...BODY, clientRequestId: 'req-abcdef-123456' });
    expect(second.json().referenceId).toBe(first.json().referenceId);
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it('a different clientRequestId, or none, is a new inquiry', async () => {
    const app = await makeApp();
    await post(app, { ...BODY, clientRequestId: 'req-aaaaaaaa-1' });
    await post(app, { ...BODY, clientRequestId: 'req-bbbbbbbb-2' });
    await post(app, BODY);
    expect(sendEmail).toHaveBeenCalledTimes(6);
  });

  it('still rejects an invalid body with 400', async () => {
    const app = await makeApp();
    const res = await post(app, {});
    expect(res.statusCode).toBe(400);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
