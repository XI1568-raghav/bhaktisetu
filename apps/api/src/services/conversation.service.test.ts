import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { notifyUserMock } = vi.hoisted(() => ({ notifyUserMock: vi.fn() }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: notifyUserMock }));

import { ensureConversationForBooking } from './conversation.service.js';

beforeEach(() => {
  vi.clearAllMocks();
  notifyUserMock.mockResolvedValue(undefined);
});

describe('ensureConversationForBooking', () => {
  const baseOpts = {
    bookingId: 'bk-1',
    devoteeId: 'devotee-1',
    providerId: 'priest-1',
    kind: 'puja_booking' as const,
    systemMessage: 'Your priest is ready.',
  };

  it('returns existing open conversation when found (idempotent)', async () => {
    prismaMock.chatConversation.findFirst.mockResolvedValue({ id: 'conv-existing' });

    const out = await ensureConversationForBooking(baseOpts);

    expect((out as any).id).toBe('conv-existing');
    expect(prismaMock.chatConversation.create).not.toHaveBeenCalled();
    expect(prismaMock.chatMessage.create).not.toHaveBeenCalled();
    expect(notifyUserMock).not.toHaveBeenCalled();
  });

  it('creates conversation + system message + bumps lastMessageAt + notifies devotee', async () => {
    prismaMock.chatConversation.findFirst.mockResolvedValue(null);
    prismaMock.chatConversation.create.mockResolvedValue({ id: 'conv-new' });
    prismaMock.chatMessage.create.mockResolvedValue({});
    prismaMock.chatConversation.update.mockResolvedValue({});

    const out = await ensureConversationForBooking(baseOpts);

    expect((out as any).id).toBe('conv-new');

    expect(prismaMock.chatConversation.create).toHaveBeenCalledWith({
      data: {
        devoteeId: 'devotee-1',
        providerId: 'priest-1',
        kind: 'puja_booking',
        linkedBookingId: 'bk-1',
      },
    });

    const msgCall = prismaMock.chatMessage.create.mock.calls[0][0];
    expect(msgCall.data.conversationId).toBe('conv-new');
    expect(msgCall.data.senderId).toBe('priest-1');
    expect(msgCall.data.kind).toBe('system');
    expect(msgCall.data.body).toBe('Your priest is ready.');
    expect(msgCall.data.metadata).toEqual({ bookingId: 'bk-1' });

    const updCall = prismaMock.chatConversation.update.mock.calls[0][0];
    expect(updCall.where).toEqual({ id: 'conv-new' });
    expect(updCall.data.devoteeUnread).toEqual({ increment: 1 });
    expect(updCall.data.lastMessageAt).toBeInstanceOf(Date);

    expect(notifyUserMock).toHaveBeenCalledWith('devotee-1', expect.objectContaining({
      title: 'Your provider is ready',
      body: 'Your priest is ready.',
      url: '/messages/conv-new',
    }));
  });

  it('still returns conversation when notifyUser rejects', async () => {
    prismaMock.chatConversation.findFirst.mockResolvedValue(null);
    prismaMock.chatConversation.create.mockResolvedValue({ id: 'conv-2' });
    prismaMock.chatMessage.create.mockResolvedValue({});
    prismaMock.chatConversation.update.mockResolvedValue({});
    notifyUserMock.mockRejectedValue(new Error('FCM down'));

    const out = await ensureConversationForBooking(baseOpts);
    expect((out as any).id).toBe('conv-2');
  });

  it('passes through kind variants (astrology, wellness, store_order, temple, gaushala)', async () => {
    prismaMock.chatConversation.findFirst.mockResolvedValue(null);
    prismaMock.chatConversation.create.mockImplementation(async ({ data }: any) => ({ id: `c-${data.kind}` }));
    prismaMock.chatMessage.create.mockResolvedValue({});
    prismaMock.chatConversation.update.mockResolvedValue({});

    for (const kind of ['astrology', 'wellness', 'store_order', 'temple', 'gaushala'] as const) {
      const out = await ensureConversationForBooking({ ...baseOpts, kind });
      expect((out as any).id).toBe(`c-${kind}`);
    }
    expect(prismaMock.chatConversation.create).toHaveBeenCalledTimes(5);
  });
});
