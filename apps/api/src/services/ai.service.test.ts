import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { generateTextMock, streamChatMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
  streamChatMock: vi.fn(),
}));
vi.mock('../integrations/claude.js', () => ({
  generateText: generateTextMock,
  streamChat: streamChatMock,
  MODELS: { SONNET: 'llama-3.3-70b', HAIKU: 'llama-3.1-8b' },
  DEMO_MODE: false,
}));

import { AiService } from './ai.service.js';

let service: AiService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new AiService();
  process.env.DATABASE_URL = 'postgres://test';
  streamChatMock.mockResolvedValue('mock-stream');
});

describe('AiService.chat — synthetic users', () => {
  it('demo-* user skips DB and returns synthetic conv id', async () => {
    const out = await service.chat({ userId: 'demo-devotee', message: 'Tell me about Krishna' });
    expect(out.conversationId).toMatch(/^conv-/);
    expect(prismaMock.aiConversation.create).not.toHaveBeenCalled();
  });

  it('anon-* user skips DB', async () => {
    const out = await service.chat({ userId: 'anon-xyz', message: 'Hi' });
    expect(out.conversationId).toMatch(/^conv-/);
    expect(prismaMock.aiConversation.create).not.toHaveBeenCalled();
  });

  it('saveConversation no-ops for synthetic users', async () => {
    const out = await service.chat({ userId: 'demo-devotee', message: 'Hi' });
    await out.saveConversation('response');
    expect(prismaMock.aiConversation.update).not.toHaveBeenCalled();
  });

  it('returns citations array from RAG verses', async () => {
    const out = await service.chat({ userId: 'demo-devotee', message: 'krishna gita' });
    expect(Array.isArray(out.citations)).toBe(true);
  });
});

describe('AiService.chat — real users with DB', () => {
  it('creates a new conversation when no conversationId given', async () => {
    prismaMock.aiConversation.create.mockResolvedValue({
      id: 'conv-new',
      title: 'Test Title',
    });

    const out = await service.chat({ userId: 'real-uuid-1', message: 'about dharma' });

    expect(out.conversationId).toBe('conv-new');
    expect(prismaMock.aiConversation.create).toHaveBeenCalled();
  });

  it('throws when conversationId given but not found', async () => {
    prismaMock.aiConversation.findFirst.mockResolvedValue(null);

    await expect(
      service.chat({ userId: 'real-uuid-1', conversationId: 'conv-missing', message: 'hi' })
    ).rejects.toThrow(/Conversation not found/);
  });

  it('saveConversation appends user+assistant messages on real user', async () => {
    prismaMock.aiConversation.findFirst.mockResolvedValue({
      id: 'conv-1',
      messages: [{ role: 'user', content: 'old' }],
      title: 'X',
    });
    prismaMock.aiConversation.update.mockResolvedValue({});

    const out = await service.chat({
      userId: 'real-uuid-1',
      conversationId: 'conv-1',
      message: 'new question',
    });

    await out.saveConversation('mock answer');

    const updCall = prismaMock.aiConversation.update.mock.calls[0]![0]!;
    expect(updCall.where).toEqual({ id: 'conv-1' });
    expect(updCall.data.messages).toHaveLength(3);
    expect(updCall.data.messages[1].content).toBe('new question');
    expect(updCall.data.messages[2].content).toBe('mock answer');
  });
});

describe('AiService.recommendPujas', () => {
  it('returns recommendation + Groq explanation when generateText succeeds', async () => {
    generateTextMock.mockResolvedValue('Personalized blessing text.');

    const out = await service.recommendPujas({ lifeEvent: 'marriage', rashi: 'leo' });

    expect(out.explanation).toBe('Personalized blessing text.');
    expect(generateTextMock).toHaveBeenCalled();
    expect(out.availablePujas.length).toBeGreaterThan(0);
  });

  it('falls back to deterministic explanation when generateText errors', async () => {
    generateTextMock.mockRejectedValue(new Error('groq down'));

    const out = await service.recommendPujas({ lifeEvent: 'health' });

    expect(out.explanation).toMatch(/Based on your spiritual profile/);
  });
});

describe('AiService.listConversations', () => {
  it('returns empty list for demo user without DB hit', async () => {
    const out = await service.listConversations('demo-devotee');
    expect(out.conversations).toEqual([]);
    expect(out.total).toBe(0);
    expect(prismaMock.aiConversation.findMany).not.toHaveBeenCalled();
  });

  it('paginates real-user query: page 2 limit 5 → skip 5', async () => {
    prismaMock.aiConversation.findMany.mockResolvedValue([{ id: 'c1' }]);
    prismaMock.aiConversation.count.mockResolvedValue(1);

    await service.listConversations('real-uuid-1', 2, 5);

    const call = prismaMock.aiConversation.findMany.mock.calls[0]![0]!;
    expect(call.skip).toBe(5);
    expect(call.take).toBe(5);
    expect(call.orderBy).toEqual({ updatedAt: 'desc' });
  });
});

describe('AiService.getConversation', () => {
  it('returns null for demo users', async () => {
    expect(await service.getConversation('any', 'demo-devotee')).toBeNull();
  });

  it('returns null when not found in DB', async () => {
    prismaMock.aiConversation.findFirst.mockResolvedValue(null);
    expect(await service.getConversation('c1', 'real-uuid-1')).toBeNull();
  });

  it('returns shaped conversation when found', async () => {
    prismaMock.aiConversation.findFirst.mockResolvedValue({
      id: 'c1',
      title: 'Topic',
      messages: [{ role: 'user', content: 'hi' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const out = await service.getConversation('c1', 'real-uuid-1');
    expect(out!.id).toBe('c1');
    expect(out!.title).toBe('Topic');
  });
});

describe('AiService.deleteConversation', () => {
  it('returns false for demo users', async () => {
    expect(await service.deleteConversation('any', 'demo-devotee')).toBe(false);
  });

  it('returns false when conversation not owned by user', async () => {
    prismaMock.aiConversation.findFirst.mockResolvedValue(null);
    expect(await service.deleteConversation('c1', 'real-uuid-1')).toBe(false);
    expect(prismaMock.aiConversation.delete).not.toHaveBeenCalled();
  });

  it('deletes and returns true on owned conversation', async () => {
    prismaMock.aiConversation.findFirst.mockResolvedValue({ id: 'c1' });
    prismaMock.aiConversation.delete.mockResolvedValue({});

    const out = await service.deleteConversation('c1', 'real-uuid-1');

    expect(out).toBe(true);
    expect(prismaMock.aiConversation.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});
