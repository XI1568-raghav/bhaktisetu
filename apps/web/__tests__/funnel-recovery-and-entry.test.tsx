import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * CM-07, CM-09, CM-13, CM-14, CM-17 (prod sweep 2026-08-12) — the funnel's
 * entry points and its dead ends.
 *
 * CM-17  the 404 is one "Back to Home" link. WhatsApp forwards and stale
 *        search results are a primary acquisition channel for this audience,
 *        and every one of them lands here with qualified intent and is thrown
 *        away at an 8,222px homepage.
 * CM-13  the hero runs two equally-weighted CTAs ("Explore Temples" and
 *        "Book a Puja"), and the page never answers "how do I know the puja
 *        actually happened?" — "video proof" is asserted four times and shown
 *        zero times, "How it works" appears 0 times in 6,966 characters.
 * CM-14  15 of 20 temples have zero offerings (Postgres: `SELECT count(*) FROM
 *        temples t WHERE NOT EXISTS (SELECT 1 FROM temple_puja_offerings o
 *        WHERE o.temple_id = t.id)` = 15), yet "Explore Temples" was the
 *        default hero primary.
 * CM-09  the product card's only clickable region is an 89x34px bare <a>, and
 *        it says "Book Now" while landing on an article.
 * CM-07  /gift is the NRI conversion page and carries no price anywhere — a
 *        regex for a currency amount over its full text returned zero matches.
 */

const WEB = path.resolve(__dirname, '..');
const raw = (rel: string) => fs.readFileSync(path.join(WEB, rel), 'utf8');
const src = (rel: string) =>
  raw(rel)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('CM-17 — the 404 recycles intent instead of discarding it', () => {
  const page = () => src('app/not-found.tsx');

  it('offers a search affordance', () => {
    expect(page()).toMatch(/action="\/search"|href="\/search/);
  });

  it('offers popular pujas and temples, not just Back to Home', () => {
    expect(page()).toMatch(/\/pujas\//);
    expect(page()).toMatch(/\/temples\//);
  });

  it('links the two catalogue hubs', () => {
    expect(page()).toMatch(/href="\/pujas"/);
    expect(page()).toMatch(/href="\/temples"/);
  });
});

describe('CM-13 / CM-14 — one hero primary, and it is the one that can take money', () => {
  it('the hero CTA component no longer defaults to Explore Temples', () => {
    const cta = src('components/HomeHeroCta.tsx');
    expect(cta).not.toMatch(/CONTROL: Variant = \{ label: 'Explore Temples'/);
    expect(cta).toMatch(/\/pujas/);
  });

  it('the homepage carries a how-it-works section', () => {
    const home = src('app/page.tsx');
    expect(home).toMatch(/HowItWorks/);
  });

  it('how-it-works names the proof mechanism and the cancellation window', () => {
    const hiw = src('components/home/HowItWorks.tsx');
    expect(hiw).toMatch(/video/i);
    expect(hiw).toMatch(/cancel/i);
  });

  it('the secondary hero action is a text link, not a second filled button', () => {
    const home = src('app/page.tsx');
    const hero = home.slice(home.indexOf('<HomeHeroCta'), home.indexOf('<HomeHeroCta') + 900);
    expect(hero).toMatch(/data-hero-secondary/);
  });
});

describe('CM-09 — the whole product card is the target', () => {
  const page = () => src('app/pujas/(index)/page.tsx');

  it('wraps the card in a next/link rather than a bare anchor on the button', () => {
    expect(page()).toMatch(/href=\{`\/pujas\/\$\{puja\.slug\}`\}/);
    expect(page()).not.toMatch(/<a\s+href=\{`\/pujas\/\$\{puja\.slug\}`\}/);
  });

  it('the card control does not promise booking and deliver an article', () => {
    expect(page()).not.toMatch(/>\s*Book Now\s*</);
  });

  it('the card control clears the 44px tap-target floor', () => {
    expect(page()).toMatch(/min-h-\[44px\]/);
  });

  it('the card prints a category label, not the raw column value', () => {
    expect(page()).toMatch(/pujaCategoryLabel\(puja\.category\)/);
    expect(page()).not.toMatch(/\{puja\.category\}/);
  });
});

describe('CM-07 — /gift shows what things cost', () => {
  const page = () => src('app/gift/page.tsx');

  it('reads the live catalogue instead of listing pujas from memory', () => {
    expect(page()).toMatch(/getPujaTypes/);
  });

  it('renders an indicative price per puja', () => {
    expect(page()).toMatch(/from ₹|from &#8377;/i);
  });

  it('offers the self-serve rail, not only the 4-hour queue', () => {
    expect(page()).toMatch(/\/pujas\/\$\{|\/book/);
  });

  it('no longer advertises a 40+ catalogue against a catalogue of ten', () => {
    expect(page()).not.toMatch(/40\+/);
  });

  it('states the timezone the 4-hour SLA is measured in', () => {
    expect(page()).toMatch(/IST/);
  });
});
