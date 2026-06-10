import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Helpers — fresh Fastify-shaped req/reply per case.
function makeReq(headers: Record<string, string | undefined> = {}, query: Record<string, string | undefined> = {}) {
  return {
    headers,
    query,
    log: { warn: vi.fn(), error: vi.fn() },
  } as any;
}

function makeReply() {
  const reply: any = {
    statusCode: 200,
    body: undefined,
    sent: false,
    code(c: number) { reply.statusCode = c; return reply; },
    send(b: unknown) { reply.body = b; reply.sent = true; return reply; },
  };
  return reply;
}

describe('cronAuth — bearer', () => {
  const realEnv = process.env.CRON_AUTH_TOKEN;
  const realLog = console.error;

  beforeEach(() => {
    process.env.CRON_AUTH_TOKEN = 'real-token-abcdef123456';
    console.error = vi.fn();
    vi.resetModules();
  });

  afterEach(() => {
    if (realEnv === undefined) delete process.env.CRON_AUTH_TOKEN;
    else process.env.CRON_AUTH_TOKEN = realEnv;
    console.error = realLog;
  });

  it('401s when Authorization header missing', async () => {
    const { requireCronBearer } = await import('./cron-auth.js');
    const req = makeReq();
    const reply = makeReply();
    await requireCronBearer(req, reply);
    expect(reply.statusCode).toBe(401);
    expect(reply.sent).toBe(true);
    expect(reply.body).toMatchObject({ error: 'cron_unauthorized' });
  });

  it('401s when bearer token mismatches env', async () => {
    const { requireCronBearer } = await import('./cron-auth.js');
    const req = makeReq({ authorization: 'Bearer wrong-token-abcdef123456' });
    const reply = makeReply();
    await requireCronBearer(req, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('401s with fail-loud console.error when CRON_AUTH_TOKEN env unset', async () => {
    delete process.env.CRON_AUTH_TOKEN;
    const { requireCronBearer } = await import('./cron-auth.js');
    const req = makeReq({ authorization: 'Bearer anything' });
    const reply = makeReply();
    await requireCronBearer(req, reply);
    expect(reply.statusCode).toBe(401);
    expect(reply.body).toMatchObject({ error: 'cron_auth_misconfigured' });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('CRON_AUTH_TOKEN'),
    );
  });

  it('passes (no send) when bearer token matches env', async () => {
    const { requireCronBearer } = await import('./cron-auth.js');
    const req = makeReq({ authorization: 'Bearer real-token-abcdef123456' });
    const reply = makeReply();
    await requireCronBearer(req, reply);
    expect(reply.sent).toBe(false);
    expect(reply.statusCode).toBe(200);
  });

  it('uses timing-safe compare — wrong token of same length still 401s', async () => {
    const { requireCronBearer } = await import('./cron-auth.js');
    const req = makeReq({ authorization: 'Bearer real-token-XXXXXXXXXXXX' });
    const reply = makeReply();
    await requireCronBearer(req, reply);
    expect(reply.statusCode).toBe(401);
  });
});

describe('cronAuth — query token (admin-cron compat)', () => {
  const realEnv = process.env.CRON_AUTH_TOKEN;

  beforeEach(() => {
    process.env.CRON_AUTH_TOKEN = 'real-token-abcdef123456';
    vi.resetModules();
  });

  afterEach(() => {
    if (realEnv === undefined) delete process.env.CRON_AUTH_TOKEN;
    else process.env.CRON_AUTH_TOKEN = realEnv;
  });

  it('401s when query.token missing', async () => {
    const { requireCronQueryToken } = await import('./cron-auth.js');
    const req = makeReq({}, {});
    const reply = makeReply();
    await requireCronQueryToken(req, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('401s when query.token mismatches', async () => {
    const { requireCronQueryToken } = await import('./cron-auth.js');
    const req = makeReq({}, { token: 'wrong-token-abcdef123456' });
    const reply = makeReply();
    await requireCronQueryToken(req, reply);
    expect(reply.statusCode).toBe(401);
  });

  it('passes when query.token matches env', async () => {
    const { requireCronQueryToken } = await import('./cron-auth.js');
    const req = makeReq({}, { token: 'real-token-abcdef123456' });
    const reply = makeReply();
    await requireCronQueryToken(req, reply);
    expect(reply.sent).toBe(false);
  });
});
