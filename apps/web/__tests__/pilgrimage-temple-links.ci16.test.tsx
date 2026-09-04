import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  permanentRedirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

import { CIRCUITS, CIRCUIT_ALIASES, circuitSlugs } from '../lib/pilgrimage-circuits';
import { getTempleDetail } from '../lib/temple-details';
import { canonicalTempleSlug } from '../lib/temple-slug';
import { permanentRedirect } from 'next/navigation';

import CircuitDetail, { generateStaticParams } from '../app/pilgrimage/[slug]/page';

// CI-16 — app/pilgrimage/[slug]/page.tsx rendered `<Link href={`/temples/${s.templeSlug}`}>`
// for EVERY stop that carried a templeSlug, with no check that the catalogue
// actually publishes that temple. Five of the sixteen distinct slugs named no
// curated entry, so five stop names were blue, underlined, and led to a 404:
//
//   ayodhya-ram-mandir, dwarka, dwarka-jagat-mandir,
//   mathura-krishna-janmabhoomi, vrindavan-banke-bihari
//
// This is a GENERATOR-level assertion, not a data-level one: the fix gates the
// link on the temple actually resolving, so it cannot rot back open when the
// temple catalogue changes underneath the circuit data.

/** Every templeSlug the circuit data references, deduplicated. */
const REFERENCED = [
  ...new Set(CIRCUITS.flatMap((c) => c.stops.map((s) => s.templeSlug).filter(Boolean))),
] as string[];

const resolves = (slug: string) => getTempleDetail(canonicalTempleSlug(slug)) !== null;

describe('CI-16 — a circuit stop is only a link when the temple page exists', () => {
  it('the circuit data really does reference temples the catalogue lacks', () => {
    // Premise guard. If this ever goes to zero the generator fix is untested,
    // so tighten the fixture below rather than deleting this file.
    const dangling = REFERENCED.filter((s) => !resolves(s));
    expect(REFERENCED.length).toBeGreaterThan(10);
    expect(dangling.length).toBeGreaterThan(0);
  });

  it('no circuit page links a stop to a temple URL that 404s', async () => {
    for (const c of CIRCUITS) {
      const { unmount } = render(
        await CircuitDetail({ params: Promise.resolve({ slug: c.slug }) }),
      );
      const hrefs = screen
        .getAllByRole('link')
        .map((a) => a.getAttribute('href') ?? '')
        .filter((h) => h.startsWith('/temples/'));
      for (const href of hrefs) {
        const slug = href.slice('/temples/'.length);
        expect(resolves(slug), `${c.slug} links /temples/${slug}, which has no page`).toBe(true);
      }
      unmount();
    }
  });

  it('a stop whose temple has no page still renders its name as plain text', async () => {
    // krishna-leela-yatra carries mathura-krishna-janmabhoomi and
    // vrindavan-banke-bihari, neither of which the catalogue publishes.
    const c = CIRCUITS.find((x) => x.slug === 'krishna-leela-yatra')!;
    const dangling = c.stops.filter((s) => s.templeSlug && !resolves(s.templeSlug));
    expect(dangling.length).toBeGreaterThan(0);

    render(await CircuitDetail({ params: Promise.resolve({ slug: c.slug }) }));
    for (const stop of dangling) {
      // The stop is still on the page…
      expect(screen.getByText(stop.name)).toBeTruthy();
      // …but it is not a link.
      expect(screen.queryByRole('link', { name: stop.name })).toBeNull();
    }
  });

  it('a stop whose temple IS published keeps its link', async () => {
    const c = CIRCUITS.find((x) => x.slug === 'char-dham')!;
    render(await CircuitDetail({ params: Promise.resolve({ slug: c.slug }) }));
    const kedarnath = screen.getByRole('link', { name: 'Kedarnath' });
    expect(kedarnath.getAttribute('href')).toBe('/temples/kedarnath');
  });
});

// CI-10 — the two merged circuits kept their URLs. A retired slug must 308
// onto the survivor, not 404, and must still be in the prerender set.
describe('CI-10 — a merged circuit URL redirects instead of 404ing', () => {
  it('generateStaticParams prerenders the retired slugs too', async () => {
    const params = await generateStaticParams();
    const slugs = params.map((p) => p.slug);
    for (const retired of Object.keys(CIRCUIT_ALIASES)) {
      expect(slugs, `${retired} would 404`).toContain(retired);
    }
    // ...but circuitSlugs() itself stays canonical-only, because app/sitemap.ts
    // builds the /pilgrimage section from it and a sitemap must not advertise
    // a redirect.
    for (const retired of Object.keys(CIRCUIT_ALIASES)) {
      expect(circuitSlugs()).not.toContain(retired);
    }
  });

  it('the route 308s a retired slug onto the survivor', async () => {
    const redirect = vi.mocked(permanentRedirect);
    redirect.mockClear();
    await CircuitDetail({ params: Promise.resolve({ slug: 'ashta-vinayak-maharashtra' }) });
    expect(redirect).toHaveBeenCalledWith('/pilgrimage/ashta-vinayak');

    redirect.mockClear();
    await CircuitDetail({ params: Promise.resolve({ slug: 'dwadasha-aditya-circuit' }) });
    expect(redirect).toHaveBeenCalledWith('/pilgrimage/dwadasha-aditya');
  });

  it('a live slug is never redirected', async () => {
    const redirect = vi.mocked(permanentRedirect);
    redirect.mockClear();
    await CircuitDetail({ params: Promise.resolve({ slug: 'ashta-vinayak' }) });
    expect(redirect).not.toHaveBeenCalled();
  });
});
