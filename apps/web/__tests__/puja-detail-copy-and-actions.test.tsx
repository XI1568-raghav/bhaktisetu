import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * CM-10 and CM-18 (prod sweep 2026-08-12), the /pujas/<slug> half.
 *
 * CM-10: the hero rendered `puja.description` with no clamp. Those descriptions
 * average 1,144 characters of scripture citation — roughly 900px of prose on a
 * 390px phone between the H1 and the price. The category chip beside it printed
 * the raw column value: "special_occasion", underscore and all, on a consumer
 * storefront at the moment the buyer is deciding whether to trust these people
 * with money.
 *
 * CM-18: the Save and Share controls on the price card carried hover styling
 * and no click handler — grep for `onClick` across the whole 639-line file
 * returned nothing, because it is a server component. Two controls that signal
 * interactivity and do nothing.
 *
 * Share is now real (navigator.share, clipboard fallback). Save is REMOVED
 * rather than faked: there is no wishlist endpoint in apps/api and no
 * wishlist table, so any "saved" state would be a lie told to a signed-in user.
 * A missing feature costs less trust than a broken one.
 */

const WEB = path.resolve(__dirname, '..');
const src = (rel: string) => fs.readFileSync(path.join(WEB, rel), 'utf8');

afterEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
});

describe('CM-10 — puja category is a label, never the database value', () => {
  it('maps the enum values the catalogue actually stores', async () => {
    const { pujaCategoryLabel } = await import('../lib/puja-labels');
    expect(pujaCategoryLabel('special_occasion')).toBe('Special occasions');
    expect(pujaCategoryLabel('planetary')).toBe('Planetary remedies');
    expect(pujaCategoryLabel('ancestral')).toBe('Ancestral rites');
  });

  it('never returns a raw snake_case token for an unmapped value', async () => {
    const { pujaCategoryLabel } = await import('../lib/puja-labels');
    expect(pujaCategoryLabel('some_new_category')).toBe('Some New Category');
    expect(pujaCategoryLabel('some_new_category')).not.toMatch(/_/);
  });

  it('is honest about an empty category rather than printing nothing-shaped text', async () => {
    const { pujaCategoryLabel } = await import('../lib/puja-labels');
    expect(pujaCategoryLabel('')).toBe('');
    expect(pujaCategoryLabel(undefined)).toBe('');
  });

  it('the detail page renders the label, not puja.category', () => {
    const page = src('app/pujas/[slug]/page.tsx');
    expect(page).toMatch(/pujaCategoryLabel\(puja\.category\)/);
    expect(page).not.toMatch(/\{puja\.category\}/);
  });

  it('the detail hero clamps the description instead of dumping 1,144 chars', () => {
    const page = src('app/pujas/[slug]/page.tsx');
    const hero = page.slice(page.indexOf('{/* Hero Section */}'), page.indexOf('About This Puja'));
    const at = hero.indexOf('{puja.description}');
    expect(at).toBeGreaterThan(-1);
    // The <p> that wraps it must carry a clamp.
    const openTag = hero.slice(hero.lastIndexOf('<p', at), at);
    expect(openTag).toMatch(/line-clamp-\d/);
  });

  it('the full text still lives in the About section below', () => {
    const page = src('app/pujas/[slug]/page.tsx');
    const about = page.slice(page.indexOf('About This Puja'));
    expect(about).toMatch(/puja\.longDescription \|\| puja\.description/);
  });
});

describe('CM-18 — the price-card actions do something or are not there', () => {
  it('the detail page has no handler-less button left in the price card', () => {
    const page = src('app/pujas/[slug]/page.tsx');
    expect(page).not.toMatch(/>\s*Save\s*</);
    expect(page).toMatch(/PujaShareButton/);
  });

  it('shares through the Web Share API when the browser has one', async () => {
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { ...globalThis.navigator, share });
    const { default: PujaShareButton } = await import('../components/puja/PujaShareButton');
    render(<PujaShareButton pujaName="Rudrabhishek" slug="rudrabhishek" />);
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(share.mock.calls[0][0]).toMatchObject({
      url: expect.stringContaining('/pujas/rudrabhishek'),
    });
  });

  it('falls back to the clipboard and says so', async () => {
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const { default: PujaShareButton } = await import('../components/puja/PujaShareButton');
    render(<PujaShareButton pujaName="Rudrabhishek" slug="rudrabhishek" />);
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/link copied/i)).toBeInTheDocument();
  });

  it('never claims success when neither rail exists', async () => {
    vi.stubGlobal('navigator', {});
    const { default: PujaShareButton } = await import('../components/puja/PujaShareButton');
    render(<PujaShareButton pujaName="Rudrabhishek" slug="rudrabhishek" />);
    fireEvent.click(screen.getByRole('button', { name: /share/i }));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText(/link copied/i)).toBeNull();
  });
});
