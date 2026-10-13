import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
const prismaMock = vi.hoisted(() => ({ lead: { upsert: vi.fn() } }));
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
const sendEmail = vi.hoisted(() => vi.fn(async () => ({ ok: true })));
vi.mock('../lib/email.js', async (orig) => ({ ...(await orig<typeof import('../lib/email.js')>()), sendEmail }));

import { leadsSelfOnboardRoutes } from './leads-self-onboard.js';

// QA 2026-10-13: the endpoint is public and mails the applicant at any address,
// so an unescaped name was a phishing relay: attacker-controlled HTML (a link)
// delivered from Darshya's own sender domain. Measured against a stub mailer.
describe('POST /self-onboard escapes applicant text in outgoing mail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.lead.upsert.mockResolvedValue({ id: 'lead-1' });
    process.env.ADMIN_EMAILS = 'admin@example.com';
  });

  it('neutralises HTML in fullName for both the applicant and the admin mail', async () => {
    const app = Fastify({ logger: false });
    await app.register(leadsSelfOnboardRoutes);
    const evil = 'X <a href="https://evil.example/pay">verify your account</a>';
    const res = await app.inject({
      method: 'POST',
      url: '/self-onboard',
      payload: {
        role: 'PRIEST', fullName: evil, email: 'victim@example.com', phone: '9999999999',
        city: 'Pune', state: 'MH', yearsExperience: 3, specialties: '<img src=x onerror=alert(1)>',
      },
    });
    expect(res.statusCode).toBe(201);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    for (const call of sendEmail.mock.calls as unknown as Array<[{ html: string }]>) {
      expect(call[0].html).not.toContain('<a href="https://evil.example');
      expect(call[0].html).not.toContain('<img src=x');
    }
    expect((sendEmail.mock.calls[0] as unknown as [{ html: string }])[0].html).toContain('&lt;a href=&quot;https://evil.example/pay&quot;&gt;');
    await app.close();
  });
});
