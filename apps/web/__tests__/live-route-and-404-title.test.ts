import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// TD-04 (prod sweep 2026-08-12): https://darshya.online/live returned 404.
// `/live` is the URL a devotee types and a partner links — every card on the
// site badges these streams "LIVE" — and `ls apps/web/app/live` answered "No
// such file or directory" while darshan/, temples/, festival/, panchang/ and
// calendar/ all existed. Worse, the 404 it served carried the HOMEPAGE title
// ("Darshya — India's Devotional Super App"), so search engines and WhatsApp
// previews rendered the dead end as a legitimate page and it got shared on.

const APP = path.join(__dirname, '..', 'app');

vi.mock('next/navigation', () => ({
  permanentRedirect: vi.fn((url: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;${url}` });
  }),
}));

describe('TD-04 — /live resolves instead of 404ing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('the route exists', () => {
    expect(fs.existsSync(path.join(APP, 'live', 'page.tsx'))).toBe(true);
  });

  it('sends the visitor to the live-darshan hub, permanently', async () => {
    const { permanentRedirect } = await import('next/navigation');
    const mod = await import('../app/live/page');
    expect(() => mod.default()).toThrow(/NEXT_REDIRECT/);
    expect(permanentRedirect).toHaveBeenCalledWith('/darshan');
  });

  it('/darshan — the destination — is a real route', () => {
    expect(fs.existsSync(path.join(APP, 'darshan', 'page.tsx'))).toBe(true);
  });
});

describe('TD-04 — the 404 page does not borrow the homepage title', () => {
  it('not-found declares its own title', async () => {
    const mod = await import('../app/not-found');
    const title = (mod as { metadata?: { title?: unknown } }).metadata?.title;
    expect(typeof title).toBe('string');
    expect(title).not.toMatch(/Devotional Super App/i);
    expect(String(title).length).toBeGreaterThan(0);
  });

  it('the declaration is real code, not a comment', () => {
    const src = fs
      .readFileSync(path.join(APP, 'not-found.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/export\s+const\s+metadata/);
  });

  it('the 404 is excluded from indexing', async () => {
    const mod = await import('../app/not-found');
    const robots = (mod as { metadata?: { robots?: { index?: boolean } } }).metadata?.robots;
    expect(robots?.index).toBe(false);
  });
});
