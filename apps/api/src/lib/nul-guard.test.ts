import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerNulByteGuard } from './nul-guard.js';

async function app() {
  const s = Fastify();
  registerNulByteGuard(s);
  s.get('/x/:id', async () => ({ ok: true }));
  s.post('/y', async () => ({ ok: true }));
  await s.ready();
  return s;
}

describe('NUL byte guard', () => {
  it('rejects %00 in the path and query', async () => {
    const s = await app();
    expect((await s.inject({ method: 'GET', url: '/x/%00' })).statusCode).toBe(400);
    expect((await s.inject({ method: 'GET', url: '/x/a?q=%00' })).statusCode).toBe(400);
  });
  it('rejects a NUL nested in a JSON body', async () => {
    const s = await app();
    const r = await s.inject({ method: 'POST', url: '/y', payload: { a: [{ b: 'x\u0000y' }] } });
    expect(r.statusCode).toBe(400);
  });
  it('lets ordinary requests through', async () => {
    const s = await app();
    expect((await s.inject({ method: 'GET', url: '/x/abc' })).statusCode).toBe(200);
    expect((await s.inject({ method: 'POST', url: '/y', payload: { a: 'é' } })).statusCode).toBe(200);
  });
});
