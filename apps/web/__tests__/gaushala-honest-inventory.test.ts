/**
 * DF-08 / DF-05 (prod sweep 2026-08-12) — the gau-seva page's honesty contract.
 *
 * DF-08 filed two halves.
 *
 *  1. "the real cows 404 while the mock demo cows work" — four /gaushala/<uuid>
 *     links 404'd because app/gaushala/[id]/page.tsx sets `dynamicParams = false`
 *     with generateStaticParams over the cow_00X ids. That half is CLOSED by a
 *     different lane (COM-07): components/ApprovedProvidersStrip.tsx:33 now
 *     routes every real gaushala profile to /gaushala/profile/<id>, a route that
 *     fetches the real row and calls notFound() honestly. No real-UUID link
 *     remains on this page — asserted below so it cannot come back.
 *
 *  2. "remove the cow_00X mock entries so only real adoptable cows are shown" —
 *     this CANNOT be done as written. There is no real adoptable-cow inventory:
 *     the API's GET /gaushala/cows is served from the in-memory
 *     gaushalaService fixture, prisma.cow rows are gaushala-owner-scoped and
 *     auth-gated, and GET /gaushala/:id deliberately returns `cows: []` rather
 *     than grafting fixtures onto a real gaushala. Deleting the eight demo cows
 *     leaves the page with ZERO inventory and no adoption CTA at all.
 *
 * What CAN be fixed, and is what the finding's customer_impact was actually
 * about, is the page presenting fiction as a track record. Alongside the demo
 * cows it published four invented achievement figures — "5,000+ Cows
 * Protected", "₹2Cr+ Donated by Devotees", "100+ Partner Gaushalas", "25,000+
 * Happy Adopters" — on a platform with zero completed adoptions. That is the
 * same class DF-05 filed for the homepage ("200+ temples" against 20), and
 * unlike the inventory it costs nothing to tell the truth about.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = readFileSync(path.resolve(__dirname, '../app/gaushala/page.tsx'), 'utf8');

/** Comments quote the removed strings to explain them; only rendered copy counts. */
const copy = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

describe('DF-05/DF-08 — /gaushala publishes no invented achievement figures', () => {
  it('does not claim thousands of cows protected', () => {
    expect(copy).not.toMatch(/5,000\+/);
    expect(copy).not.toMatch(/Cows Protected/i);
  });

  it('does not claim tens of thousands of adopters', () => {
    expect(copy).not.toMatch(/25,000\+/);
    expect(copy).not.toMatch(/Happy Adopters/i);
  });

  it('does not claim a hundred partner gaushalas or crores donated', () => {
    expect(copy).not.toMatch(/100\+/);
    expect(copy).not.toMatch(/2Cr\+/);
  });
});

describe('DF-08 — the demo cows are labelled as demo, not as real inventory', () => {
  it('says plainly that the listed cows are sample listings', () => {
    // The eight cow_00X entries stay — removing them empties the page — but a
    // devotee must not read a fixture as an animal they can actually adopt.
    expect(copy).toMatch(/sample listing|demo listing|illustrative/i);
  });

  it('still offers a real way to give, so the page is not a dead end', () => {
    // /donations is the live rail the adoption CTAs were wired into (#230).
    expect(src).toMatch(/\/donations/);
  });
});

describe('DF-08 — no link on /gaushala points at a cow-detail route that 404s', () => {
  it('links no bare UUID at /gaushala/<id>', () => {
    // /gaushala/[id] is a static route over the cow_00X ids
    // (dynamicParams = false), so a UUID there is a guaranteed 404. Real
    // gaushala profiles belong at /gaushala/profile/<id>.
    const uuidLink = /\/gaushala\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    expect(src).not.toMatch(uuidLink);
  });

  it('routes real provider profiles through /gaushala/profile/', () => {
    const strip = readFileSync(
      path.resolve(__dirname, '../components/ApprovedProvidersStrip.tsx'),
      'utf8',
    );
    expect(strip).toMatch(/gaushala:\s*\(id\)\s*=>\s*`\/gaushala\/profile\/\$\{id\}`/);
  });
});
