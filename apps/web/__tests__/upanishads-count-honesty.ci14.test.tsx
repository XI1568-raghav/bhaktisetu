import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UPANISHADS, PRINCIPAL_UPANISHAD_SLUGS, isPrincipalUpanishad } from '../lib/upanishads';
import UpanishadsIndexPage, { metadata } from '../app/upanishads/page';
import UpanishadDetailPage from '../app/upanishads/[slug]/page';

// CI-14 — /upanishads was titled "The 10 Principal Upanishads
// (Dashopanishads)", described as a "Complete guide to the 10 principal
// Upanishads", headed दशोपनिषद् / "The 10 Principal Upanishads" and
// eyebrowed "10 principal" — above a grid of forty-eight, most of which are
// Muktika-canon minor Upanishads that Shankara wrote no bhashya on.

describe('CI-14 — /upanishads is titled for what it ships', () => {
  it('ships far more than ten', () => {
    expect(UPANISHADS.length).toBeGreaterThan(10);
    expect(new Set(UPANISHADS.map((u) => u.slug)).size).toBe(UPANISHADS.length);
  });

  it('names exactly ten principal Upanishads, all of them present', () => {
    expect(PRINCIPAL_UPANISHAD_SLUGS).toHaveLength(10);
    const slugs = new Set(UPANISHADS.map((u) => u.slug));
    for (const s of PRINCIPAL_UPANISHAD_SLUGS) {
      expect(slugs.has(s), s).toBe(true);
    }
    expect(isPrincipalUpanishad('isha-upanishad')).toBe(true);
    expect(isPrincipalUpanishad('paingala-upanishad')).toBe(false);
  });

  it('the title and description no longer promise a guide to ten', () => {
    expect(String(metadata.title)).not.toMatch(/The 10 Principal Upanishads/);
    expect(String(metadata.description)).not.toMatch(/guide to the 10 principal Upanishads/i);
    expect(String(metadata.title)).toContain(String(UPANISHADS.length));
  });

  it('the visible heading counts the grid it sits above', () => {
    render(<UpanishadsIndexPage />);
    const text = document.body.textContent ?? '';
    expect(text).not.toContain('The 10 Principal Upanishads');
    // The eyebrow has to lead with the real size before it says "10 principal".
    expect(text).toContain(`${UPANISHADS.length} texts · ${PRINCIPAL_UPANISHAD_SLUGS.length} principal`);
    expect(text).toContain(String(UPANISHADS.length));
    // The ten are still called out — they are a real category, just not the
    // whole catalogue.
    expect(text).toMatch(/10 principal/i);
  });

  it('every Upanishad in the catalogue is reachable from the index', () => {
    render(<UpanishadsIndexPage />);
    const hrefs = new Set(
      screen.getAllByRole('link').map((a) => a.getAttribute('href') ?? ''),
    );
    for (const u of UPANISHADS) {
      expect(hrefs, `${u.slug} is orphaned`).toContain(`/upanishads/${u.slug}`);
    }
    expect(hrefs.size).toBeGreaterThanOrEqual(UPANISHADS.length);
  });

  it('the JSON-LD list length equals the catalogue', () => {
    const { container } = render(<UpanishadsIndexPage />);
    const ld = container.querySelector('script[type="application/ld+json"]')!;
    const [list] = JSON.parse(ld.innerHTML) as { numberOfItems: number }[];
    expect(list!.numberOfItems).toBe(UPANISHADS.length);
  });

  it('the detail page footer counts the full list it renders', async () => {
    render(await UpanishadDetailPage({ params: Promise.resolve({ slug: 'katha-upanishad' }) }));
    const text = document.body.textContent ?? '';
    expect(text).not.toContain('All 10 Upanishads');
    expect(text).not.toContain('All 10 principal Upanishads');
    expect(text).toContain(`All ${UPANISHADS.length} Upanishads`);
  });
});