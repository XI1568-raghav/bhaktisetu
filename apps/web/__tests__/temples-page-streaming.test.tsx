import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';

/**
 * TD-01 (2026-08-12, P1) — /temples measured 37.5s to settle on prod, the
 * slowest page on the site and the top of the puja/donation funnel.
 *
 * The half of that number the repo owns: TemplesPage `await`ed getTemples() in
 * the page component body, and the route has no loading.tsx. With nothing
 * suspended above the fetch, Next cannot flush a single byte — not the <head>,
 * not the header, not the hero — until the API answers or serverFetch's 4s
 * AbortController fires. Both Render services are free tier and spin down, so a
 * cold API means a genuinely blank screen for the whole budget.
 *
 * These tests hold the shell independent of the API:
 *   1. TemplesPage must return without waiting on getTemples.
 *   2. What it returns while waiting must be a visible skeleton, not a blank
 *      spacer div — and must not contain invented temple content.
 *
 * The other half of the 37.5s (Render free-tier cold start on the web service
 * itself) is infrastructure and cannot be closed from here.
 */

const neverSettles = vi.fn(() => new Promise<never>(() => {}));

vi.mock('../lib/api', () => ({
  getTemples: (...args: unknown[]) => neverSettles(...(args as [])),
}));

import TemplesPage from '../app/temples/page';

const BLOCKED = Symbol('blocked-on-api');

function raceAgainstTimeout(value: unknown, ms: number): Promise<unknown> {
  return Promise.race([
    Promise.resolve(value),
    new Promise((resolve) => setTimeout(() => resolve(BLOCKED), ms)),
  ]);
}

describe('TD-01 /temples renders its shell without blocking on the API', () => {
  beforeEach(() => {
    neverSettles.mockClear();
  });

  it('returns markup even when the temples API never answers', async () => {
    const result = await raceAgainstTimeout(TemplesPage(), 500);
    expect(result).not.toBe(BLOCKED);
  });

  it('shows a real loading skeleton while the temple data is in flight', async () => {
    const result = (await raceAgainstTimeout(TemplesPage(), 500)) as ReactElement<{
      fallback?: ReactElement;
    }>;
    expect(result).not.toBe(BLOCKED);

    const fallback = result.props?.fallback;
    expect(fallback, 'page must suspend behind a fallback').toBeTruthy();

    render(fallback as ReactElement);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status.textContent ?? '').toMatch(/temple/i);
    // The skeleton must be structure only. A fabricated temple name here would
    // be indistinguishable from real content while the fetch is still open.
    expect(status.querySelectorAll('img')).toHaveLength(0);
  });
});
