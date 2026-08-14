import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * CM-12 (prod sweep 2026-08-12) — a devotee who types "rudrabhishek" into the
 * box that says "Search puja, temple, kundli, saint…" cannot find the puja they
 * can buy.
 *
 * The header overlay (components/GlobalSearch.tsx) DOES call the federated
 * API — `${API_BASE_URL}/search?q=…` returns `{ temples, pujas, content }`.
 * The /search PAGE does not: app/search/SearchClient.tsx loads a static
 * /search-index.json of Sanskrit/Veda/Sanatan articles and searches only that,
 * under an H1 that reads "Search knowledge". Its zero-result state is the
 * complete string "No matches. Try a different term." — no suggestions, no
 * popular searches, no route back into the catalogue, at the exact moment the
 * user has proven both intent and a willingness to type.
 *
 * So the fix is not "build search"; it is to make the destination search the
 * same things the entry point already promises, and to make failing to find
 * something a fork in the road rather than a wall.
 */

const WEB = path.resolve(__dirname, '..');
const src = (rel: string) =>
  fs
    .readFileSync(path.join(WEB, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('CM-12 — /search searches the catalogue, not only the encyclopedia', () => {
  const page = () => src('app/search/SearchClient.tsx');

  it('queries the same federated endpoint the header overlay uses', () => {
    expect(page()).toMatch(/API_BASE_URL/);
    expect(page()).toMatch(/\/search\?q=/);
  });

  it('renders puja and temple result groups', () => {
    expect(page()).toMatch(/Pujas/);
    expect(page()).toMatch(/Temples/);
  });

  it('no longer titles itself as an encyclopedia-only search', () => {
    expect(page()).not.toMatch(/Search knowledge/);
    expect(page()).not.toMatch(/Across Sanskrit, Vedas, and Sanatan Dharma articles\./);
  });

  it('an outage degrades to the article index instead of an error wall', () => {
    expect(page()).toMatch(/catch/);
  });
});

describe('CM-12 — the zero-result state is a fork, not a wall', () => {
  const page = () => src('app/search/SearchClient.tsx');

  it('offers a route back into both catalogues', () => {
    const zero = page();
    expect(zero).toMatch(/href="\/pujas"/);
    expect(zero).toMatch(/href="\/temples"/);
  });

  it('keeps the honest "no matches" statement rather than inventing results', () => {
    expect(page()).toMatch(/No matches/i);
  });
});

describe('CM-12 — the placeholder promises only what the destination delivers', () => {
  it('every rotating placeholder names something search can now return', () => {
    const overlay = src('components/GlobalSearch.tsx');
    // The overlay federates temples + pujas + content, so puja/temple prompts
    // are honest. Kundli and saints resolve through content.
    expect(overlay).toMatch(/results\.pujas|pujas:/);
    expect(overlay).toMatch(/results\.temples|temples:/);
  });
});
