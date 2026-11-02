import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CORS preflight caching', () => {
  it('server.ts registers cors with maxAge so browsers cache the preflight', () => {
    const src = readFileSync(join(__dirname, '..', 'server.ts'), 'utf8');
    const block = src.slice(src.indexOf('server.register(cors, {'));
    expect(block.slice(0, block.indexOf('});'))).toMatch(/maxAge:\s*7200/);
  });

  it('@fastify/cors turns maxAge into Access-Control-Max-Age on the preflight response', async () => {
    const app = Fastify();
    await app.register(cors, { origin: ['https://darshya.online'], credentials: true, maxAge: 7200 });
    app.get('/x', async () => ({ ok: true }));
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/x',
      headers: {
        origin: 'https://darshya.online',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-max-age']).toBe('7200');
    await app.close();
  });
});
