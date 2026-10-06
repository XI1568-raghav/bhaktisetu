import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Production 2026-10-06: the astrology chat answered a Leo question with
 * "(Simha rāṣi, कर्क राशी)" — Cancer's name in Devanagari. It ran on the small
 * model tier (openai/gpt-oss-20b). Chart-grounded Jyotish answers need the
 * larger tier.
 */
const { generateText } = vi.hoisted(() => ({ generateText: vi.fn() }));
vi.mock('../integrations/claude.js', async (orig) => ({
  ...((await orig()) as Record<string, unknown>),
  generateText,
}));

import { astrologyService } from './astrology.service.js';
import { MODELS } from '../integrations/claude.js';

beforeEach(() => {
  vi.clearAllMocks();
  generateText.mockResolvedValue('Namaste');
});

describe('askAstrologer model tier', () => {
  it('uses the larger model, not the fast/cheap tier', async () => {
    await astrologyService.askAstrologer('Which gemstone suits a Leo?');
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(generateText.mock.calls[0]![0].model).toBe(MODELS.SONNET);
    expect(generateText.mock.calls[0]![0].model).not.toBe(MODELS.HAIKU);
  });

  it('tells the model to name signs correctly in both scripts', async () => {
    await astrologyService.askAstrologer('Which gemstone suits a Leo?');
    const sys = String(generateText.mock.calls[0]![0].systemPrompt);
    expect(sys).toMatch(/Simha/);
    expect(sys).toMatch(/सिंह/);
  });

  it('forbids inventing house placements when no chart is supplied', async () => {
    await astrologyService.askAstrologer('What does my Leo sign say about career?');
    const sys = String(generateText.mock.calls[0]![0].systemPrompt);
    expect(sys).toMatch(/never state house placements/);
  });

  it('bans house numbers entirely when no chart is supplied', async () => {
    await astrologyService.askAstrologer('What does my Leo sign say about career?');
    const sys = String(generateText.mock.calls[0]![0].systemPrompt);
    expect(sys).toMatch(/Do not use house numbers at all/);
  });
});
