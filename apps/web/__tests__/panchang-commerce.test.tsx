import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PanchangCommerce, { ritualIntents } from '../components/panchang/PanchangCommerce';
import { buttonClass } from '../components/ui/button-recipe';

/**
 * `/panchang` is the highest-intent dated surface in the product and, until
 * this module, it carried zero commercial CTAs across ~603 lines. Sri Mandir —
 * the dominant competitor — puts NO in-body commerce on evergreen chalisa and
 * aarti articles and three paid puja cards directly under their panchang
 * table. They monetise the dated surface. This file guards Darshya's version.
 *
 * The two things that can go wrong here are the two this suite is built around.
 *
 * 1. DF-02: writing an editorial slug straight into an href. `/pujas/[slug]`
 *    resolves its slug against the live catalogue and calls notFound() when it
 *    misses, so an unresolved slug is a hard 404 — that defect 404'd 84 of 87
 *    festival CTAs. Every negative assertion below is therefore PAIRED with a
 *    positive one: a component that renders no links at all would satisfy
 *    "emits no dead link" trivially and prove nothing.
 *
 * 2. The degraded branch. getCatalogueSlugs() fails closed (an empty Set on any
 *    non-2xx or thrown fetch) and production is down, so the empty-catalogue
 *    branch is the branch that actually renders today. It has to end somewhere
 *    real rather than at a disabled button or a dead product link.
 *
 * Rendering note: PanchangCommerce is an async Server Component, so it is
 * awaited and then handed to renderToStaticMarkup. The catalogue is injected
 * rather than fetched so no branch depends on a network call.
 */

/** The ten slugs `puja_types` actually holds (apps/api/prisma/seed.ts:649-793). */
const LIVE_CATALOGUE = new Set([
  'rudrabhishek',
  'ganesh-puja',
  'satyanarayan-katha',
  'maha-mrityunjay-jaap',
  'lakshmi-puja',
  'navgraha-shanti-puja',
  'sunderkand-path',
  'hanuman-chalisa-path',
  'ram-charit-manas-path',
  'pitru-dosh-nivaran-puja',
]);

/**
 * Local-constructor dates, deliberately. The component reads the weekday with
 * `getDay()`, which is local; building these from an ISO string would shift the
 * weekday under a negative UTC offset and make Monday's card appear on Sunday.
 */
const MONDAY = new Date(2026, 7, 24);
const TUESDAY = new Date(2026, 7, 25);
const SATURDAY = new Date(2026, 7, 29);
/** Sunday carries no weekday ritual, so it isolates the tithi mapping. */
const SUNDAY = new Date(2026, 7, 30);

async function render(props: Parameters<typeof PanchangCommerce>[0]): Promise<string> {
  const el = await PanchangCommerce(props);
  return el ? renderToStaticMarkup(el as React.ReactElement) : '';
}

/** Every `/pujas/<slug>` deep link the markup emits. */
function deepLinkSlugs(html: string): string[] {
  return [...html.matchAll(/href="\/pujas\/([^"]+)"/g)].map((m) => m[1]);
}

describe('PanchangCommerce — the module exists at all', () => {
  it('renders a labelled commerce section under the panchang data', async () => {
    const html = await render({
      tithi: 'Shukla Ekadashi',
      date: SUNDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html, 'the panchang page still sells nothing').toContain(
      'aria-label="Rituals for this tithi"',
    );
    expect(html).toContain('Rituals for this tithi');
  });

  it('reuses the shared CTA recipe rather than a hand-rolled button', async () => {
    // DU-03 measured 11 pixel heights and 4 radii for the primary CTA across
    // ten screens before buttonClass existed. A new surface must not add a 12th.
    const html = await render({
      tithi: 'Shukla Ekadashi',
      date: SUNDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html).toContain(buttonClass('primary', 'md', 'w-full'));
  });
});

describe('PanchangCommerce — the tithi decides the SKU', () => {
  it('Ekadashi asks for Satyanarayan Katha', async () => {
    const html = await render({
      tithi: 'Shukla Ekadashi',
      date: SUNDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html).toContain('/pujas/satyanarayan-katha');
    expect(html).toContain('Ekadashi');
    // The wrong SKUs for this tithi must not be advertised alongside it.
    expect(deepLinkSlugs(html)).not.toContain('pitru-dosh-nivaran-puja');
    expect(deepLinkSlugs(html)).not.toContain('ganesh-puja');
  });

  it('Amavasya asks for the Pitru Dosh Nivaran puja', async () => {
    const html = await render({
      tithi: 'Amavasya',
      date: SUNDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html).toContain('/pujas/pitru-dosh-nivaran-puja');
    expect(html).toContain('Amavasya');
    expect(deepLinkSlugs(html)).not.toContain('satyanarayan-katha');
  });

  it('Purnima asks for Satyanarayan Katha', async () => {
    const html = await render({
      tithi: 'Purnima',
      date: SUNDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html).toContain('/pujas/satyanarayan-katha');
    expect(html).toContain('Purnima');
  });

  it('Sankashti (Krishna Chaturthi) asks for Ganesh Puja', async () => {
    const html = await render({
      tithi: 'Krishna Chaturthi',
      date: SUNDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html).toContain('/pujas/ganesh-puja');
    expect(html).toContain('Sankashti');
  });

  it('Pradosh (Trayodashi) asks for Rudrabhishek', async () => {
    const html = await render({
      tithi: 'Krishna Trayodashi',
      date: SUNDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html).toContain('/pujas/rudrabhishek');
    expect(html).toContain('Pradosh');
  });

  it('the mapping is a pure function of tithi + weekday, testable without a catalogue', () => {
    // Four distinct tithis, four distinct SKUs, no rendering involved.
    expect(ritualIntents('Shukla Ekadashi', SUNDAY)[0]?.slug).toBe('satyanarayan-katha');
    expect(ritualIntents('Amavasya', SUNDAY)[0]?.slug).toBe('pitru-dosh-nivaran-puja');
    expect(ritualIntents('Purnima', SUNDAY)[0]?.slug).toBe('satyanarayan-katha');
    expect(ritualIntents('Krishna Chaturthi', SUNDAY)[0]?.slug).toBe('ganesh-puja');
    expect(ritualIntents('Krishna Trayodashi', SUNDAY)[0]?.slug).toBe('rudrabhishek');
  });
});

describe('PanchangCommerce — the weekday decides when the tithi is ordinary', () => {
  it('Somvar asks for Rudrabhishek', async () => {
    const html = await render({
      tithi: 'Shukla Saptami',
      date: MONDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html).toContain('/pujas/rudrabhishek');
    expect(html).toContain('Somvar');
  });

  it('Mangalvar asks for the Hanuman Chalisa path', async () => {
    const html = await render({
      tithi: 'Shukla Saptami',
      date: TUESDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html).toContain('/pujas/hanuman-chalisa-path');
  });

  it('Shanivar asks for the Sunderkand path', async () => {
    const html = await render({
      tithi: 'Shukla Saptami',
      date: SATURDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html).toContain('/pujas/sunderkand-path');
  });

  it('the tithi outranks the weekday when both point somewhere', () => {
    // Monday Ekadashi: the tithi is the rarer, higher-intent signal, so
    // Satyanarayan Katha leads and Rudrabhishek follows.
    const intents = ritualIntents('Shukla Ekadashi', MONDAY);
    expect(intents[0]?.slug).toBe('satyanarayan-katha');
    expect(intents.map((i) => i.slug)).toContain('rudrabhishek');
  });
});

describe('PanchangCommerce — DF-02: no unresolved slug ever reaches an href', () => {
  it('drops a ritual the catalogue does not sell, keeps the one it does', async () => {
    // Monday Ekadashi points at BOTH satyanarayan-katha and rudrabhishek. This
    // catalogue sells only the first. Rendering the intent list verbatim is the
    // DF-02 defect exactly: /pujas/rudrabhishek would 404.
    const html = await render({
      tithi: 'Shukla Ekadashi',
      date: MONDAY,
      catalogueSlugs: new Set(['satyanarayan-katha']),
    });
    expect(html).toContain('/pujas/satyanarayan-katha');
    expect(
      deepLinkSlugs(html),
      'a slug the catalogue does not sell reached an href — this is DF-02',
    ).not.toContain('rudrabhishek');
  });

  it('every emitted deep link is a slug the injected catalogue confirmed', async () => {
    const catalogue = new Set(['ganesh-puja']);
    const html = await render({
      tithi: 'Krishna Chaturthi',
      date: MONDAY,
      catalogueSlugs: catalogue,
    });
    const slugs = deepLinkSlugs(html);
    expect(slugs.length, 'nothing rendered, so this assertion proves nothing').toBeGreaterThan(0);
    for (const slug of slugs) {
      expect(catalogue.has(slug), `/pujas/${slug} is not in the catalogue`).toBe(true);
    }
  });

  it('marks bookable cards so catalogue coverage is measurable from the DOM', async () => {
    const html = await render({
      tithi: 'Shukla Ekadashi',
      date: SUNDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    expect(html).toContain('data-bookable="true"');
  });
});

describe('PanchangCommerce — the degraded branch (production is in it today)', () => {
  it('an empty catalogue renders the browse CTA, never a dead product link', async () => {
    const html = await render({
      tithi: 'Shukla Ekadashi',
      date: MONDAY,
      catalogueSlugs: new Set<string>(),
    });

    expect(html, 'the module vanished instead of degrading').toContain(
      'Rituals for this tithi',
    );
    expect(html).toContain('href="/pujas"');
    expect(
      deepLinkSlugs(html),
      'an unreachable catalogue produced a /pujas/<slug> link, which would 404',
    ).toHaveLength(0);
  });

  it('still names what the day asks for, so the degraded card reads as intentional', async () => {
    const html = await render({
      tithi: 'Amavasya',
      date: MONDAY,
      catalogueSlugs: new Set<string>(),
    });
    // The tithi is known even when the catalogue is not. Saying so is honest
    // and is what keeps the fallback from reading as an empty error state.
    expect(html).toContain('Amavasya');
    expect(html).toContain('data-bookable="false"');
  });

  it('does not render a disabled control the devotee cannot act on', async () => {
    const html = await render({
      tithi: 'Shukla Saptami',
      date: SUNDAY,
      catalogueSlugs: new Set<string>(),
    });
    // Match the ATTRIBUTE, not the substring: BUTTON_BASE carries
    // `disabled:opacity-50` / `aria-disabled:opacity-50` as Tailwind variants,
    // so a bare toContain('disabled') matches every correct button.
    expect(html).not.toMatch(/<(?:button|a)\b[^>]*\sdisabled(?:=|[\s>])/);
    expect(html).not.toMatch(/\saria-disabled="true"/);
    expect(html).toContain('href="/pujas"');
  });
});

describe('PanchangCommerce — anti-fabrication', () => {
  it('invents no counts, ratings, reviews, scarcity or countdown', async () => {
    const html = await render({
      tithi: 'Shukla Ekadashi',
      date: MONDAY,
      catalogueSlugs: LIVE_CATALOGUE,
    });
    // Paired positive. Every assertion below is a NEGATIVE one, and negatives
    // pass trivially against a component that renders nothing — the first run
    // of this file proved it, passing this one test against an inert stub.
    expect(html, 'the module did not render, so the negatives prove nothing').toContain(
      '/pujas/satyanarayan-katha',
    );
    expect(html).not.toMatch(/\d[\d,]*\s*(?:\+\s*)?(?:devotees?|people|bookings?|booked|reviews?)/i);
    expect(html).not.toMatch(/only\s+\d+\s+(?:left|slots?|seats?|spots?)/i);
    expect(html).not.toMatch(/\b\d(?:\.\d)?\s*(?:\/\s*5|stars?)\b/i);
    expect(html).not.toMatch(/hurry|limited time|selling fast|last chance/i);
  });

  it('prints the Rahu Kaal window only when the panchang actually supplied one', async () => {
    const real = await render({
      tithi: 'Shukla Ekadashi',
      date: MONDAY,
      catalogueSlugs: LIVE_CATALOGUE,
      rahuKaal: '07:30 - 09:00',
    });
    expect(real).toContain('07:30 - 09:00');

    // buildFallbackPanchang() sets rahuKaal to an em dash when the API is
    // unreachable. The copy has to lose its digits, not fall back to a literal.
    const degraded = await render({
      tithi: 'Shukla Ekadashi',
      date: MONDAY,
      catalogueSlugs: LIVE_CATALOGUE,
      rahuKaal: '—',
    });
    expect(degraded).not.toContain('Rahu Kaal');
  });
});
