import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the storage layer so the route is exercised without R2/Supabase creds,
// and so we can assert the key/contentType that gets presigned.
vi.mock('../lib/r2.js', () => ({
  r2: { enabled: true },
  publicUrlFor: (k: string) => `https://cdn.test/${k}`,
  presignR2Upload: vi.fn(async (params: { key: string; contentType: string }) => ({
    uploadUrl: `https://r2.test/${params.key}`,
    publicUrl: `https://cdn.test/${params.key}`,
    backend: 'r2' as const,
  })),
}));

// Mock the auth middleware so an unauthenticated request is rejected (401)
// and an authenticated one gets a stamped currentUser — no DB needed.
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any, reply: any) => {
    if (!request.headers.authorization) {
      reply.code(401).send({ error: 'Missing or invalid Authorization header' });
      return;
    }
    request.currentUser = { id: 'user-uuid-1', roles: ['DEVOTEE'] };
  },
}));

import Fastify from 'fastify';
import { mediaRoutes } from './media.js';
import { presignR2Upload } from '../lib/r2.js';

async function buildApp() {
  const app = Fastify({ logger: false });
  await app.register(
    async (instance) => {
      await mediaRoutes(instance);
    },
    { prefix: '/api/v1/media' },
  );
  return app;
}

async function inject(body: unknown, auth = true) {
  const app = await buildApp();
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/media/upload-url',
    payload: body as Record<string, unknown>,
    headers: auth
      ? { authorization: 'Bearer test', 'content-type': 'application/json' }
      : { 'content-type': 'application/json' },
  });
  await app.close();
  return res;
}

describe('media upload-url — content-type allowlist + kind sanitization (P1-5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an unsupported contentType (octet-stream no longer allowed)', async () => {
    const res = await inject({ kind: 'profile-photo', contentType: 'application/octet-stream' });
    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toMatch(/Unsupported contentType/);
    expect(presignR2Upload).not.toHaveBeenCalled();
  });

  it('rejects a kind that is not in the enum', async () => {
    const res = await inject({ kind: '../evil', contentType: 'image/png' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/Unsupported kind/);
    expect(presignR2Upload).not.toHaveBeenCalled();
  });

  it('presigns a valid image upload; the R2 key uses the sanitized kind prefix and never contains `..`', async () => {
    const res = await inject({ kind: 'profile-photo', contentType: 'image/png' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.maxSizeMb).toBe(10);
    expect(presignR2Upload).toHaveBeenCalledTimes(1);
    const calls = (
      presignR2Upload as unknown as {
        mock: { calls: Array<Array<{ key: string; contentType: string }>> };
      }
    ).mock.calls;
    const call = calls[0]?.[0];
    expect(call?.contentType).toBe('image/png');
    expect(call?.key.startsWith('profile-photo/')).toBe(true);
    expect(call?.key.includes('..')).toBe(false);
  });

  it('video proof is not mintable here (private, booking-bound route only)', async () => {
    const res = await inject({ kind: 'puja-proof', contentType: 'video/mp4' });
    expect(res.statusCode).toBe(400);
  });

  it('advertises the shared video limit (50 MB default, VIDEO_MAX_MB override)', async () => {
    const res = await inject({ kind: 'audio', contentType: 'video/mp4' });
    expect(res.json().maxSizeMb).toBe(50);
    process.env.VIDEO_MAX_MB = '120';
    try {
      expect((await inject({ kind: 'audio', contentType: 'video/webm' })).json().maxSizeMb).toBe(120);
    } finally {
      delete process.env.VIDEO_MAX_MB;
    }
  });

  it('derives a safe extension even when the client sends a malicious ext', async () => {
    const res = await inject({
      kind: 'temple-image',
      contentType: 'image/jpeg',
      ext: 'jsp/../../etc',
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    // key extension must be sanitized to alphanumeric only
    expect(body.key.match(/\.([a-z0-9]+)$/)?.[1]).toMatch(/^[a-z0-9]+$/);
    expect(body.key.includes('..')).toBe(false);
    expect(body.key.includes('/')).toBe(false || body.key.split('/').length === 3); // kind/user/file only
  });

  it('ignores a client-supplied ext entirely — the type policy decides the extension', async () => {
    const res = await inject({ kind: 'profile-photo', contentType: 'image/png', ext: 'html' });
    expect(res.statusCode).toBe(200);
    expect(res.json().key.endsWith('.png')).toBe(true);
  });

  it('401 when unauthenticated (preHandler blocks)', async () => {
    const res = await inject({ kind: 'profile-photo', contentType: 'image/png' }, false);
    expect(res.statusCode).toBe(401);
    expect(presignR2Upload).not.toHaveBeenCalled();
  });
});

describe('media upload-url — private identity documents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('presigns a kyc-document upload privately and returns no public url', async () => {
    const res = await inject({ kind: 'kyc-document', contentType: 'application/pdf' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.publicUrl).toBeNull();
    expect(body.key).toMatch(/^kyc-document\/user-uuid-1\//);
    expect(vi.mocked(presignR2Upload).mock.calls[0]![0]).toMatchObject({ private: true });
  });

  it('rejects video for a kyc-document', async () => {
    const res = await inject({ kind: 'kyc-document', contentType: 'video/mp4' });
    expect(res.statusCode).toBe(400);
  });

  it('keeps profile photos on the public path', async () => {
    const res = await inject({ kind: 'profile-photo', contentType: 'image/png' });
    expect(res.statusCode).toBe(200);
    expect(res.json().publicUrl).toContain('https://cdn.test/');
    expect(vi.mocked(presignR2Upload).mock.calls[0]![0]).toMatchObject({ private: false });
  });
});
