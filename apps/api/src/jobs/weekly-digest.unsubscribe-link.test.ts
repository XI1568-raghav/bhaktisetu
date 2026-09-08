import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sendEmail = vi.fn();
vi.mock('../lib/email.js', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

vi.mock('../services/panchang.service.js', () => ({
  panchangService: { getToday: async () => ({ tithi: 'Purnima', festivals: [], specialInfo: null }) },
}));

import { runWeeklyDigest } from './weekly-digest.js';
import { resolveUnsubscribeIdentifier } from '../routes/digest.js';

/**
 * CT-CONSENT-1 — the link the digest actually mails must carry the signature
 * the route verifies.
 *
 * Testing the route's verifier alone would pass while the fan-out kept printing
 * `?u=<raw uuid>`: mint and verify live in two files, and the failure mode is
 * that they disagree. This runs the real fan-out, pulls the URL out of the sent
 * email, and feeds it back through the route's own verifier — the same round
 * trip a devotee makes.
 */

const USER_ID = '2b5bd615-1633-4c95-9b09-03efb2b9e429';

const USERS = [
  { id: USER_ID, email: 'asha@example.com', fullName: 'Asha Devi', gotra: null, rashi: null, preferredLanguage: 'en' },
];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = 'test-key';
  process.env.JWT_SECRET = 'digest-link-test-secret';

  prismaMock.user.findMany.mockResolvedValue(USERS as never);
  prismaMock.contentItem.findMany.mockResolvedValue([] as never);
  prismaMock.pujaType.findFirst.mockResolvedValue({
    name: 'Satyanarayan Puja',
    deity: 'Vishnu',
    slug: 'satyanarayan',
    basePrice: 1100,
  } as never);
  prismaMock.$queryRawUnsafe.mockImplementation(async () => []);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
  sendEmail.mockResolvedValue({ ok: true });
});

/** The `u` value from the unsubscribe link in the email that was sent. */
async function sentUnsubscribeParam(): Promise<string> {
  await runWeeklyDigest();
  const email = sendEmail.mock.calls.find((c) => c[0].to === 'asha@example.com')![0];
  const match = /\/account\/digest\/unsubscribe\?u=([^"\s<]+)/.exec(email.text as string);
  expect(match, 'the digest email must contain an unsubscribe link').toBeTruthy();
  return decodeURIComponent(match![1]!);
}

describe('CT-CONSENT-1 — the digest unsubscribe link is a signed capability', () => {
  it('does not print the bare user id as the whole identifier', async () => {
    const u = await sentUnsubscribeParam();
    expect(u).not.toBe(USER_ID);
  });

  it('carries a signature the route accepts, for that user and no other', async () => {
    const u = await sentUnsubscribeParam();

    const resolved = resolveUnsubscribeIdentifier(u);
    expect(resolved.ok).toBe(true);
    expect(resolved.ok && resolved.userId).toBe(USER_ID);
    expect(resolved.ok && resolved.signed).toBe(true);
  });

  it('mints a signature that does not transfer to another user id', async () => {
    const u = await sentUnsubscribeParam();
    const otherId = '9f1c4d02-77a8-4f31-8a52-6e0b1c9d3a44';
    const forged = `${otherId}.${u.split('.')[1]}`;

    expect(resolveUnsubscribeIdentifier(forged).ok).toBe(false);
  });

  it('survives the URL round trip — the token needs no characters that encode', async () => {
    await runWeeklyDigest();
    const email = sendEmail.mock.calls.find((c) => c[0].to === 'asha@example.com')![0];
    // base64url + uuid + '.' are all URL-safe; an encoded token in the HTML
    // would mean the mail client and the page disagree about the value.
    const raw = /\/account\/digest\/unsubscribe\?u=([^"\s<]+)/.exec(email.html as string)![1]!;
    expect(raw).toBe(encodeURIComponent(decodeURIComponent(raw)));
  });
});
