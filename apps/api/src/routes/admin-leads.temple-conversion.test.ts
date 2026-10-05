import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true }));
vi.mock('../lib/email.js', () => ({ sendEmail }));

import Fastify from 'fastify';
import { adminLeadsRoutes } from './admin-leads.js';

/**
 * Temple-manager onboarding test (2026-10-05): lead -> CONVERTED.
 *
 * Reproduced against a local stack. A temple trust applies on /list-temple with
 * a contact person ("Ramesh Sharma") and a temple ("Shri Sheetla Mata Mandir").
 * `leads-self-onboard` stores the person in `lead.name` and the temple and deity
 * only in `lead.metadata`. Conversion then built the profile from `lead.name`:
 *
 *   temple_profiles.temple_name = "Ramesh Sharma"
 *
 * so the portal could never match the profile to any Temple, and the deity the
 * applicant typed was dropped. Same shape for gaushala leads.
 *
 * The same handler also called approveProviderProfile and ignored its answer.
 * The quality gate (name, description, address) refuses a profile this thin, so
 * the profile stayed approved=false while the email said "Your application ...
 * has been approved ... Your Darshya portal is ready."
 */

const LEAD_ID = 'lead-temple-1';
const LEAD_EMAIL = 'trust@example.com';
const NEW_USER_ID = 'user-temple-1';

const DEMO_ADMIN = {
  id: 'user-demo-admin-1',
  email: 'admin@demo.com',
  phone: null,
  fullName: 'Demo Admin',
  subscriptionTier: 'bhakti_pass',
  blocked: false,
};

function makeApp() {
  const app = Fastify();
  void app.register(adminLeadsRoutes, { prefix: '/api/v1/admin' });
  return app;
}

function seedLead(over: Record<string, unknown> = {}) {
  prismaMock.lead.findUnique.mockResolvedValue({
    id: LEAD_ID,
    role: 'TEMPLE',
    name: 'Ramesh Sharma',
    email: LEAD_EMAIL,
    phone: '9811111111',
    city: 'Gurugram',
    state: 'Haryana',
    country: 'India',
    source: 'self_onboard_temple',
    metadata: { templeName: 'Shri Sheetla Mata Mandir', deity: 'Sheetla Mata' },
    convertedUserId: null,
    status: 'NEW',
    notes: '',
    ...over,
  });
  prismaMock.lead.update.mockResolvedValue({ id: LEAD_ID, status: 'CONVERTED' });
}

function convert() {
  return makeApp().inject({
    method: 'PATCH',
    url: `/api/v1/admin/leads/${LEAD_ID}/status`,
    headers: { authorization: 'Bearer demo-admin' },
    payload: { status: 'CONVERTED', sendEmail: true },
  });
}

function emailHtml(): string {
  const call = sendEmail.mock.calls.at(-1)?.[0] as { html?: string } | undefined;
  return call?.html ?? '';
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.WEB_BASE_URL = 'https://darshya.online';
  prismaMock.user.findUnique.mockImplementation(async (args: any) =>
    args.where.email === 'admin@demo.com' ? DEMO_ADMIN : null,
  );
  prismaMock.user.findFirst.mockResolvedValue(null);
  prismaMock.user.create.mockResolvedValue({ id: NEW_USER_ID, email: LEAD_EMAIL });
  prismaMock.userRoleAssignment.upsert.mockResolvedValue({});
  prismaMock.templeProfile.upsert.mockResolvedValue({ id: 'tp-1', userId: NEW_USER_ID });
  prismaMock.templeProfile.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.gaushalaProfile.upsert.mockResolvedValue({ id: 'gp-1', userId: NEW_USER_ID });
  prismaMock.gaushalaProfile.updateMany.mockResolvedValue({ count: 1 });
});

describe('lead conversion builds the temple profile from the temple, not the contact person', () => {
  it('uses the temple name and deity the applicant typed', async () => {
    seedLead();
    thinProfile();
    const res = await convert();
    expect(res.statusCode).toBe(200);
    const arg = prismaMock.templeProfile.upsert.mock.calls[0]?.[0] as any;
    expect(arg.create.templeName).toBe('Shri Sheetla Mata Mandir');
    expect(arg.create.deity).toBe('Sheetla Mata');
    expect(arg.create.templeName).not.toBe('Ramesh Sharma');
  });

  it('falls back to the lead name when the lead carries no temple name', async () => {
    seedLead({ metadata: null, name: 'Shri Ram Mandir Trust' });
    thinProfile();
    await convert();
    const arg = prismaMock.templeProfile.upsert.mock.calls[0]?.[0] as any;
    expect(arg.create.templeName).toBe('Shri Ram Mandir Trust');
  });

  it('uses the gaushala name and cow count for a gaushala lead', async () => {
    seedLead({
      role: 'GAUSHALA',
      metadata: { gaushalaName: 'Gau Seva Sadan', cowCount: 40 },
    });
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue({ gaushalaName: 'Gau Seva Sadan', description: null, address: null } as any);
    await convert();
    const arg = prismaMock.gaushalaProfile.upsert.mock.calls[0]?.[0] as any;
    expect(arg.create.gaushalaName).toBe('Gau Seva Sadan');
    expect(arg.create.totalCows).toBe(40);
  });
});

function thinProfile() {
  // What the quality gate reads: a name but no description and no address.
  prismaMock.templeProfile.findUnique.mockResolvedValue({
    templeName: 'Shri Sheetla Mata Mandir',
    description: null,
    address: null,
  } as any);
}

describe('the approval email does not claim an approval that did not happen', () => {
  it('a profile that fails the quality gate is not called approved or ready', async () => {
    seedLead();
    thinProfile();
    const res = await convert();
    const body = res.json();
    expect(body.profileApproved).toBe(false);
    expect(prismaMock.templeProfile.updateMany).not.toHaveBeenCalled();
    const html = emailHtml();
    expect(html).not.toMatch(/has been approved/i);
    expect(html).not.toMatch(/portal is ready/i);
    // It tells the applicant the real next step, with a way in.
    expect(html).toMatch(/description/i);
    expect(html).toMatch(/\/auth\/verify\?token=/);
  });

  it('a complete profile is approved and the email says so', async () => {
    seedLead();
    prismaMock.templeProfile.findUnique.mockResolvedValue({
      templeName: 'Shri Sheetla Mata Mandir',
      description: 'A neighbourhood temple of Sheetla Mata in Gurugram',
      address: 'Sector 12, Gurugram',
    } as any);
    const res = await convert();
    expect(res.json().profileApproved).toBe(true);
    expect(emailHtml()).toMatch(/has been approved/i);
  });
});
