import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { prismaMock } from './__mocks__/prisma.js';

vi.mock('./prisma.js', () => ({ prisma: prismaMock }));

// A fake Resend (verifies OUR integration, not the vendor): modes ok | 500 | 429 | hang.
let mode: 'ok' | '500' | '429' | 'hang' = 'ok';
const received: Array<{ key: string | undefined; body: any }> = [];
let server: http.Server;
let outbox: typeof import('./email-outbox.js');

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (mode === 'hang') return;
      const send = (code: number, o: unknown) => {
        res.writeHead(code, { 'content-type': 'application/json' });
        res.end(JSON.stringify(o));
      };
      if (mode === '500') return send(500, { name: 'application_error', message: 'boom', statusCode: 500 });
      if (mode === '429') return send(429, { name: 'rate_limit_exceeded', message: 'Too many requests', statusCode: 429 });
      received.push({ key: req.headers['idempotency-key'] as string | undefined, body: JSON.parse(Buffer.concat(chunks).toString() || '{}') });
      send(200, { id: `em_${received.length}` });
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  process.env.RESEND_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  process.env.RESEND_API_KEY = 're_test_fake';
  process.env.EMAIL_INLINE_TIMEOUT_MS = '400';
  vi.resetModules();
  outbox = await import('./email-outbox.js');
});
afterAll(() => {
  server.closeAllConnections?.();
  server.close();
});

const MAIL = { to: 'd@example.test', subject: 'Receipt', html: '<p>hi</p>', text: 'hi' };
const SPEC = { kind: 'donation_receipt' as const, refId: 'don_1' };
const insertCalls = () =>
  prismaMock.$executeRawUnsafe.mock.calls.filter((c: any[]) => /INSERT INTO email_outbox/.test(String(c[0])));

beforeEach(() => {
  vi.clearAllMocks();
  mode = 'ok';
  received.length = 0;
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
});

describe('deliverOrQueue (inline attempt)', () => {
  it('delivers inline and records nothing when Resend is up', async () => {
    const r = await outbox.deliverOrQueue(MAIL, SPEC);
    expect(r).toEqual({ sent: true, queued: false });
    expect(received).toHaveLength(1);
    expect(received[0]!.key).toBe(outbox.dedupeKeyFor(SPEC, MAIL));
    expect(insertCalls()).toHaveLength(0);
  });

  it.each(['500', '429', 'hang'] as const)('Resend %s: does not throw, records one outbox row', async (m) => {
    mode = m;
    const r = await outbox.deliverOrQueue(MAIL, SPEC);
    expect(r.sent).toBe(false);
    expect(r.queued).toBe(true);
    const ins = insertCalls();
    expect(ins).toHaveLength(1);
    expect(String(ins[0]![0])).toMatch(/ON CONFLICT \(dedupe_key\) DO NOTHING/);
    expect(ins[0]!.slice(1, 6)).toEqual([outbox.dedupeKeyFor(SPEC, MAIL), 'donation_receipt', 'don_1', 'd@example.test', 'Receipt']);
  });

  it('Resend unreachable (connection refused) is also queued', async () => {
    const port = (server.address() as AddressInfo).port;
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
    try {
      const r = await outbox.deliverOrQueue(MAIL, SPEC);
      expect(r.sent).toBe(false);
      expect(r.queued).toBe(true);
    } finally {
      await new Promise<void>((r) => server.listen(port, '127.0.0.1', r));
    }
  });

  it('a missing outbox table is created lazily and the insert retried; a dead DB still does not throw', async () => {
    mode = '500';
    prismaMock.$executeRawUnsafe.mockImplementationOnce(async () => { throw new Error('relation "email_outbox" does not exist'); });
    const r = await outbox.deliverOrQueue(MAIL, SPEC);
    expect(r.queued).toBe(true);
    const sqls = prismaMock.$executeRawUnsafe.mock.calls.map((c: any[]) => String(c[0]));
    expect(sqls.some((q) => /CREATE TABLE IF NOT EXISTS "email_outbox"/.test(q))).toBe(true);

    outbox.__resetEmailOutboxForTests();
    prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('db down'));
    const r2 = await outbox.deliverOrQueue(MAIL, SPEC);
    expect(r2.queued).toBe(false);
    expect(r2.sent).toBe(false);
  });
});

describe('processEmailOutbox (retry job)', () => {
  const row = { id: 'r1', dedupe_key: 'k1', kind: 'donation_receipt', ref_id: 'don_1', to_email: MAIL.to, subject: MAIL.subject, attempts: 1 };
  const builder = async () => async () => ({ ...MAIL });
  const updates = () => prismaMock.$executeRawUnsafe.mock.calls.map((c: any[]) => String(c[0]));

  it('recovery: sends with the SAME idempotency key and marks the row sent', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([row]);
    const r = await outbox.processEmailOutbox({ builder });
    expect(r.sent).toBe(1);
    expect(received).toHaveLength(1);
    expect(received[0]!.key).toBe('k1');
    expect(updates().some((q) => /status = 'sent'/.test(q))).toBe(true);
  });

  it('a lost claim (another run won it) sends nothing', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([row]);
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);
    const r = await outbox.processEmailOutbox({ builder });
    expect(received).toHaveLength(0);
    expect(r.sent).toBe(0);
  });

  it.each(['500', '429'] as const)('still %s: row goes back to pending with backoff', async (m) => {
    mode = m;
    prismaMock.$queryRawUnsafe.mockResolvedValue([row]);
    const r = await outbox.processEmailOutbox({ builder });
    expect(r.retried).toBe(1);
    const q = updates().find((x) => /status = 'pending', last_error/.test(x));
    expect(q).toBeTruthy();
    const call = prismaMock.$executeRawUnsafe.mock.calls.find((c: any[]) => /status = 'pending', last_error/.test(String(c[0])))!;
    expect(call[3]).toBe(String(outbox.backoffMinutes(2)));
  });

  it('after MAX_ATTEMPTS the row is marked dead', async () => {
    mode = '500';
    prismaMock.$queryRawUnsafe.mockResolvedValue([{ ...row, attempts: outbox.MAX_ATTEMPTS - 1 }]);
    const r = await outbox.processEmailOutbox({ builder });
    expect(r.dead).toBe(1);
    expect(updates().some((q) => /status = 'dead'/.test(q))).toBe(true);
  });

  it('a record that no longer exists is marked dead without sending', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([row]);
    const r = await outbox.processEmailOutbox({ builder: async () => async () => null });
    expect(r.dead).toBe(1);
    expect(received).toHaveLength(0);
  });

  it('table absent: skipped, not an error', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('relation does not exist'));
    const r = await outbox.processEmailOutbox({ builder });
    expect(r.skipped).toBe(true);
  });

  it('backoff grows and is capped', () => {
    expect(outbox.backoffMinutes(1)).toBeLessThan(outbox.backoffMinutes(3));
    expect(outbox.backoffMinutes(99)).toBe(720);
  });
});
