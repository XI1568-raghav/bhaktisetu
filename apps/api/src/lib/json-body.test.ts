import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { registerTolerantJsonParser } from './json-body.js';

async function app() {
  const a = Fastify({ logger: false });
  registerTolerantJsonParser(a);
  a.post('/x', async (req) => ({ body: req.body ?? null }));
  return a;
}
const h = { 'content-type': 'application/json' };

describe('tolerant JSON body parser', () => {
  it('treats an empty application/json body as {}', async () => {
    const a = await app();
    const r = await a.inject({ method: 'POST', url: '/x', headers: h });
    expect(r.statusCode).toBe(200);
    expect(r.json().body).toEqual({});
    await a.close();
  });
  it('still parses a normal body', async () => {
    const a = await app();
    const r = await a.inject({ method: 'POST', url: '/x', headers: h, payload: '{"a":1}' });
    expect(r.json().body).toEqual({ a: 1 });
    await a.close();
  });
  it('still rejects malformed JSON with 400', async () => {
    const a = await app();
    const r = await a.inject({ method: 'POST', url: '/x', headers: h, payload: '{oops' });
    expect(r.statusCode).toBe(400);
    await a.close();
  });
});
