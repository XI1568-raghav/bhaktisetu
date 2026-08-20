import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CIRCUITS, getCircuit } from '../lib/pilgrimage-circuits';
import PilgrimageIndex, { metadata } from '../app/pilgrimage/page';

// CI-10 — /pilgrimage announced "The 8 canonical Hindu pilgrimage circuits" in
// its <title>, its meta description, its OG description and its own intro
// paragraph, directly above a grid of nineteen cards. Two of those cards were
// the SAME URL (/pilgrimage/sapta-puri) advertised at two prices — ₹48,000 and
// ₹35,000 — with two different stop lists behind them.

const DISTINCT = new Set(CIRCUITS.map((c) => c.slug));

describe('CI-10 — /pilgrimage counts what it actually ships', () => {
  it('the source really does carry a duplicate circuit', () => {
    // Premise guard for the render-level dedupe below.
    expect(DISTINCT.size).toBeLessThan(CIRCUITS.length);
  });

  it('never claims a number of circuits it does not have', () => {
    render(<PilgrimageIndex />);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/\b8 canonical\b/);
    expect(String(metadata.title)).not.toMatch(/\b8\b/);
    expect(String(metadata.description)).not.toMatch(/\b8 canonical\b/);
    expect(String(metadata.openGraph?.description)).not.toMatch(/\b8 canonical\b/);
  });

  it('states the count the grid actually renders', () => {
    render(<PilgrimageIndex />);
    const hrefs = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.startsWith('/pilgrimage/'));
    expect(hrefs).toHaveLength(DISTINCT.size);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(document.body.textContent).toContain(String(DISTINCT.size));
  });

  it('one URL is advertised at one price', () => {
    render(<PilgrimageIndex />);
    const cards = screen
      .getAllByRole('link')
      .filter((a) => (a.getAttribute('href') ?? '').startsWith('/pilgrimage/'));
    const byHref = new Map<string, string>();
    for (const card of cards) {
      const href = card.getAttribute('href')!;
      expect(byHref.has(href), `${href} rendered twice`).toBe(false);
      byHref.set(href, card.textContent ?? '');
    }
    const saptaPuri = byHref.get('/pilgrimage/sapta-puri') ?? '';
    // Exactly one "from ₹NNk" chip, not two contradicting each other...
    expect(saptaPuri.match(/from ₹/g) ?? []).toHaveLength(1);
    // ...and the price on the card is the price the detail page will charge.
    // getCircuit is a .find(), so the FIRST sapta-puri record is the live one.
    const live = getCircuit('sapta-puri')!;
    expect(saptaPuri).toContain(`from ₹${(live.startingFromInr / 1000).toFixed(0)}k`);
  });

  it('the JSON-LD item list matches the visible grid', () => {
    const { container } = render(<PilgrimageIndex />);
    const ld = container.querySelector('script[type="application/ld+json"]')!;
    const parsed = JSON.parse(ld.innerHTML) as { itemListElement: { url: string }[] };
    const urls = parsed.itemListElement.map((i) => i.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toHaveLength(DISTINCT.size);
  });
});
