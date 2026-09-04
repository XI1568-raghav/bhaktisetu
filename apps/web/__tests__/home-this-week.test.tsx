import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ThisWeek, { upcomingFestivals } from '../components/home/ThisWeek';
import { FESTIVALS } from '../lib/festivals';

/**
 * ThisWeek is the homepage's dated surface. It has two rendering branches and
 * the one that matters most is the FAILURE branch, because it is the branch
 * production is in today: getCatalogueSlugs() returns an empty Set on any
 * non-2xx or thrown fetch, so with the API unreachable EVERY card degrades at
 * once. Against a local dev server with no API this is what actually renders.
 *
 * The failure mode this file exists to prevent is the one DF-02 caused: writing
 * pujasAvailable[0] into an href. The festival calendar is hand-written
 * editorial that names 87 puja slugs against a 10-row catalogue, so 84 of 87
 * "Book with verified pandit" CTAs 404'd — including the homepage's only
 * time-sensitive CTA, during Navratri.
 *
 * Rendering note: ThisWeek is an async Server Component, so it is awaited and
 * then handed to renderToStaticMarkup. The catalogue is injected rather than
 * fetched so neither branch depends on a network call.
 */

/** Await the async server component, then render it to static markup. */
async function render(props: Parameters<typeof ThisWeek>[0]): Promise<string> {
  const el = await ThisWeek(props);
  return el ? renderToStaticMarkup(el as React.ReactElement) : '';
}

/** A date guaranteed to sit just before a known festival, so the card set is
 *  deterministic regardless of when the suite runs. */
function dayBefore(iso: string): Date {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

const ONAM = FESTIVALS.find((f) => f.slug === 'onam')!;

describe('ThisWeek — the bookable branch', () => {
  it('links the resolved catalogue slug, not the calendar slug', async () => {
    // Onam's calendar entry names 'vamana-puja' and 'satyanarayan-puja'.
    // Neither is a catalogue slug: the live catalogue spells it
    // 'satyanarayan-katha', and PUJA_SLUG_ALIASES is what bridges them.
    // Linking pujasAvailable[0] verbatim would emit /pujas/vamana-puja — a
    // hard 404, because /pujas/[slug] sets dynamicParams = false.
    expect(ONAM.pujasAvailable).toContain('satyanarayan-puja');
    expect(ONAM.pujasAvailable).not.toContain('satyanarayan-katha');

    const html = await render({
      now: dayBefore(ONAM.date2026),
      catalogueSlugs: new Set(['satyanarayan-katha']),
    });

    expect(html).toContain('/pujas/satyanarayan-katha');
    expect(
      html,
      'the raw calendar slug reached an href — this is the DF-02 defect exactly',
    ).not.toContain('/pujas/satyanarayan-puja');
    expect(html).not.toContain('/pujas/vamana-puja');
  });

  it('marks a bookable card so coverage is measurable from the DOM', async () => {
    const html = await render({
      now: dayBefore(ONAM.date2026),
      catalogueSlugs: new Set(['satyanarayan-katha']),
    });
    expect(html).toContain('data-bookable="true"');
  });

  it('labels the CTA with the puja name, not the raw slug', async () => {
    // CM-10: the previous strip did `firstPuja.replace(/-/g, ' ')` and printed
    // "Book satyanarayan katha" on the homepage's only time-sensitive CTA.
    //
    // Deliberately case-SENSITIVE. The first version of this assertion carried
    // an /i flag, which also matched the correct "Book Satyanarayan Katha" and
    // reported a passing component as broken.
    const html = await render({
      now: dayBefore(ONAM.date2026),
      catalogueSlugs: new Set(['satyanarayan-katha']),
    });
    expect(html).toContain('Book Satyanarayan Katha');
    expect(html, 'the de-hyphenated raw slug reached the label').not.toMatch(
      /Book\s+satyanarayan[ -]katha/,
    );
  });
});

describe('ThisWeek — the degraded branch (production is in it today)', () => {
  it('an empty catalogue renders the guide, never a dead product link', async () => {
    const html = await render({
      now: dayBefore(ONAM.date2026),
      catalogueSlugs: new Set<string>(),
    });

    expect(html, 'the section vanished instead of degrading').toContain('This week');
    expect(
      html,
      'an unreachable API produced a /pujas/<slug> link, which would 404',
    ).not.toContain('/pujas/');
    expect(html).toContain('/festival/onam');
    expect(html).toContain('How to observe it');
  });

  it('every card is marked unbookable when the catalogue is empty', async () => {
    const html = await render({
      now: dayBefore(ONAM.date2026),
      catalogueSlugs: new Set<string>(),
    });
    expect(html).not.toContain('data-bookable="true"');
    expect((html.match(/data-bookable="false"/g) ?? []).length).toBeGreaterThan(0);
  });

  it('does not render a disabled control the devotee cannot act on', async () => {
    const html = await render({
      now: dayBefore(ONAM.date2026),
      catalogueSlugs: new Set<string>(),
    });
    // Match the ATTRIBUTE, not the substring. buttonClass's BUTTON_BASE carries
    // `disabled:opacity-50 disabled:pointer-events-none aria-disabled:opacity-50`
    // as Tailwind variant classes, so a bare toContain('disabled') matches every
    // correctly-rendered button on the page.
    expect(html, 'a card rendered a disabled button instead of a live link').not.toMatch(
      /<(?:button|a)\b[^>]*\sdisabled(?:=|[\s>])/,
    );
    expect(html).not.toMatch(/\saria-disabled="true"/);
  });
});

describe('ThisWeek — which dates it chooses', () => {
  it('shows at most three, soonest first', () => {
    const picked = upcomingFestivals(dayBefore(ONAM.date2026));
    expect(picked.length).toBeGreaterThan(0);
    expect(picked.length).toBeLessThanOrEqual(3);
    const dates = picked.map((f) => f.date2026);
    expect([...dates].sort()).toEqual(dates);
  });

  it('never shows a date that has already passed', () => {
    const now = dayBefore(ONAM.date2026);
    const todayIso = now.toISOString().slice(0, 10);
    for (const f of upcomingFestivals(now)) {
      expect(f.date2026 >= todayIso, `${f.slug} is in the past`).toBe(true);
    }
  });

  it('stays inside the horizon rather than advertising a date months out', () => {
    const now = dayBefore(ONAM.date2026);
    const todayIso = now.toISOString().slice(0, 10);
    for (const f of upcomingFestivals(now)) {
      const days = Math.round(
        (new Date(f.date2026).getTime() - new Date(todayIso).getTime()) / 86_400_000,
      );
      expect(days, `${f.slug} is ${days} days out`).toBeLessThanOrEqual(45);
    }
  });

  it('renders nothing at all rather than an empty shell past the calendar', async () => {
    // The calendar is a 2026 dataset. Past its end there is no honest content
    // for this section, and an empty bordered box reads as a broken page.
    const html = await render({ now: new Date('2027-06-01'), catalogueSlugs: new Set<string>() });
    expect(html).toBe('');
  });
});
