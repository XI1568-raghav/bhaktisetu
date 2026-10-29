import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: vi.fn(async () => undefined) }));

import { openConsultationThread } from './astrologer.service.js';

const PROFILE_ID = '71e54617-6963-418e-845f-920f4350505b';
const ASTRO_USER = 'ba87a424-e9d2-44f1-92a9-996441b31131';
const DEVOTEE = '2b5bd615-1633-4c95-9b09-03efb2b9e429';
const CID = '5523ab80-6591-43f0-9205-59ac341035b0';

const params = {
  astrologerRef: PROFILE_ID,
  devoteeUserId: DEVOTEE,
  astrologerName: 'Acharya V',
  minutes: 15,
  reference: 'AC-20261029-ABCDEF',
  consultationId: CID,
};

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.astrologerProfile.findFirst.mockResolvedValue({ userId: ASTRO_USER, displayName: 'Acharya V' } as never);
  prismaMock.user.findUnique.mockResolvedValue({ phone: null } as never);
  prismaMock.chatConversation.findFirst.mockResolvedValue(null as never);
  prismaMock.chatConversation.create.mockResolvedValue({ id: 'conv-1' } as never);
  prismaMock.chatMessage.create.mockResolvedValue({} as never);
  prismaMock.chatConversation.update.mockResolvedValue({} as never);
});

describe('openConsultationThread — a paid consultation gets a Messages thread', () => {
  it('creates an astrology conversation between the devotee and the astrologer USER, linked to the consultation', async () => {
    await openConsultationThread(params);
    const arg = prismaMock.chatConversation.create.mock.calls[0]![0] as { data: Record<string, unknown> };
    expect(arg.data).toMatchObject({ devoteeId: DEVOTEE, providerId: ASTRO_USER, kind: 'astrology', linkedBookingId: CID });
    const msg = prismaMock.chatMessage.create.mock.calls[0]![0] as { data: { body: string; kind: string } };
    expect(msg.data.kind).toBe('system');
    expect(msg.data.body).toContain('AC-20261029-ABCDEF');
  });

  it('is idempotent: an existing open thread is reused (verify-payment and the webhook backstop both call it)', async () => {
    prismaMock.chatConversation.findFirst.mockResolvedValue({ id: 'conv-existing' } as never);
    await openConsultationThread(params);
    expect(prismaMock.chatConversation.create).not.toHaveBeenCalled();
  });

  it('never opens a thread between an account and itself', async () => {
    await openConsultationThread({ ...params, devoteeUserId: ASTRO_USER });
    expect(prismaMock.chatConversation.create).not.toHaveBeenCalled();
  });

  it('does nothing for an astrologer that cannot be resolved, and never throws', async () => {
    prismaMock.astrologerProfile.findFirst.mockResolvedValue(null as never);
    await expect(openConsultationThread(params)).resolves.toBeUndefined();
    expect(prismaMock.chatConversation.create).not.toHaveBeenCalled();
  });

  it('swallows a database failure (the payment confirmation must not fail because chat did)', async () => {
    prismaMock.chatConversation.create.mockRejectedValue(new Error('db down'));
    await expect(openConsultationThread(params)).resolves.toBeUndefined();
  });
});
