import { describe, it, expect } from 'vitest';
import Fastify from 'fastify';
import { isUuid, uuidParamGuard } from './uuid.js';

describe('isUuid', () => {
  it('accepts a uuid and rejects other shapes', () => {
    expect(isUuid('00000000-0000-4000-8000-000000000001')).toBe(true);
    for (const v of ['not-a-uuid', "1' OR 1=1--", '', 'A'.repeat(500), 12, null, undefined]) {
      expect(isUuid(v)).toBe(false);
    }
  });
});

describe('uuidParamGuard', () => {
  it('answers 404 for a malformed id and lets a real one through', async () => {
    const s = Fastify();
    s.get('/x/:id/:callId', { preHandler: [uuidParamGuard('id', 'callId')] }, async () => ({ ok: true }));
    await s.ready();
    const good = '00000000-0000-4000-8000-000000000001';
    expect((await s.inject({ url: `/x/${good}/${good}` })).statusCode).toBe(200);
    expect((await s.inject({ url: `/x/not-a-uuid/${good}` })).statusCode).toBe(404);
    expect((await s.inject({ url: `/x/${good}/1'%20OR%201=1--` })).statusCode).toBe(404);
  });
});
