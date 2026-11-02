import { describe, it, expect, vi } from 'vitest';

const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT:${to}`);
});
vi.mock('next/navigation', () => ({ redirect }));

describe('/consultation index', () => {
  it('sends the bare path to the astrologer directory instead of a 404', async () => {
    const { default: Page } = await import('../app/consultation/page');
    expect(() => Page()).toThrow('NEXT_REDIRECT:/astrology');
    expect(redirect).toHaveBeenCalledWith('/astrology');
  });
});
