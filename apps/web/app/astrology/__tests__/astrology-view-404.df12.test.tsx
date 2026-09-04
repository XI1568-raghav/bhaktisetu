/**
 * [DF-12] /astrology/view answers a REAL 404 for an id that names no astrologer.
 *
 * The sweep followed /astrology/view?id=zzz-not-a-real-astrologer-999 and got
 * HTTP 200 with a "not available" body — a soft 404. The route was entirely
 * `'use client'`, and a client component cannot set a status code: by the time
 * it runs the response headers are already on the wire. A crawler that follows
 * such a URL indexes it as real content.
 *
 * The same defect was closed for PF-10 by putting a server component in front
 * of the client wizard (app/pujas/home-puja/book/page.tsx). This applies that
 * precedent here:
 *
 *   no id           -> 307 to the live astrologer directory
 *   id, not a UUID  -> notFound(), with NO API call at all. The API already
 *                      404s every non-UUID id (apps/api/src/routes/astrology.ts,
 *                      the fall-through after the UUID_RE branch), so the round
 *                      trip can only produce the answer we already have.
 *   UUID            -> the client profile, unchanged. Its own 'missing' screen
 *                      stays the safety net for a UUID that is unapproved,
 *                      deleted, or goes stale after render.
 *
 * WHY notFound() IS ASSERTED BY MOCK, NOT BY DIGEST STRING: next/navigation's
 * error digest is an implementation detail across Next versions. Mocking the
 * module and asserting the call is the stable form and still proves the
 * component reached the 404 path rather than rendering a 200 body.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT:${to}`);
});

vi.mock('next/navigation', () => ({ notFound, redirect }));

// The client profile must never be imported for a bad id — stub it so a render
// attempt is observable rather than pulling the real (heavy, 'use client') tree.
const clientRendered = vi.fn();
vi.mock('../view/AstrologerProfileClient', () => ({
  default: () => {
    clientRendered();
    return null;
  },
  ProfileLoadingShell: () => null,
}));

const { default: AstrologerViewPage, isRenderableAstrologerId } = await import('../view/page');

beforeEach(() => {
  notFound.mockClear();
  redirect.mockClear();
  clientRendered.mockClear();
});

describe('[DF-12] /astrology/view gives an unknown id a real 404', () => {
  it('404s the exact id the sweep followed', async () => {
    await expect(
      AstrologerViewPage({
        searchParams: Promise.resolve({ id: 'zzz-not-a-real-astrologer-999' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
    expect(clientRendered, 'a 404 must not also render the profile').not.toHaveBeenCalled();
  });

  it('404s /astrology/view?id=astrologers (the directory path pasted as an id)', async () => {
    await expect(
      AstrologerViewPage({ searchParams: Promise.resolve({ id: 'astrologers' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it('404s a fixture id from the retired in-memory directory', async () => {
    await expect(
      AstrologerViewPage({ searchParams: Promise.resolve({ id: 'astro_001' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('redirects a bare /astrology/view to the live directory rather than 404ing it', async () => {
    await expect(AstrologerViewPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
      'NEXT_REDIRECT:/astrology/astrologers/live',
    );
    expect(notFound).not.toHaveBeenCalled();
  });

  it('renders the client profile for a real UUID — no 404, no redirect', async () => {
    const el = await AstrologerViewPage({
      searchParams: Promise.resolve({ id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301' }),
    });
    expect(notFound).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(el).toBeTruthy();
  });

  it('takes the FIRST value when ?id repeats, matching Next request parsing', async () => {
    await expect(
      AstrologerViewPage({
        searchParams: Promise.resolve({ id: ['nonsense', '3f2504e0-4f89-11d3-9a0c-0305e82c3301'] }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});

describe('[DF-12] the id gate matches the API, so the page cannot 404 something bookable', () => {
  it('accepts exactly what apps/api/src/routes/astrology.ts accepts', () => {
    // Mirrors UUID_RE in the API route. If these drift, the page starts 404ing
    // profiles the API would happily serve.
    expect(isRenderableAstrologerId('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe(true);
    expect(isRenderableAstrologerId('3F2504E0-4F89-11D3-9A0C-0305E82C3301')).toBe(true);
    expect(isRenderableAstrologerId('  3f2504e0-4f89-11d3-9a0c-0305e82c3301  ')).toBe(true);
    expect(isRenderableAstrologerId('zzz-not-a-real-astrologer-999')).toBe(false);
    expect(isRenderableAstrologerId('astrologers')).toBe(false);
    expect(isRenderableAstrologerId('astro_001')).toBe(false);
    expect(isRenderableAstrologerId('')).toBe(false);
    // Not a UUID: right shape, wrong alphabet.
    expect(isRenderableAstrologerId('zzzzzzzz-4f89-11d3-9a0c-0305e82c3301')).toBe(false);
  });
});
