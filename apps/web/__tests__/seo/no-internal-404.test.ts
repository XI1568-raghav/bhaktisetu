// SIDE-FIX-SEO-404 regression guard.
//
// Closes a class of bugs where previously-promoted long-tail slugs (e.g.
// `om-jai-jagdish-hare-aarti`, `ganesh-chalisa`) silently 404'd because the
// /content/[slug] route was set `dynamicParams = false` with a 12-entry
// static-params allow-list.
//
// This test asserts:
//   1. /content/[slug] route DOES allow dynamic params (so unknown slugs serve
//      the graceful loading fallback instead of 404).
//   2. /darshan/[id] route DOES allow dynamic params (already true; locked
//      in here so a future refactor can't silently regress it).
//   3. The static-params allow-list on /content/[slug] explicitly includes
//      the most-frequently-broken slugs from the 2026-06-10 broken-link audit.
//
// The full data backfill (200+ word histories, 40-verse chalisas) is a content
// authoring task tracked in docs/cto/SIDE-FIX-SEO-404-handoff.md and
// completed asynchronously by the founder/editorial team; this test enforces
// only that the technical 404 is closed today.
import { describe, it, expect } from 'vitest';
import {
 dynamicParams as contentDynamicParams,
 generateStaticParams as contentParams,
} from '../../app/content/[slug]/page';
import { dynamicParams as darshanDynamicParams } from '../../app/darshan/[id]/page';

const PREVIOUSLY_BROKEN_CONTENT_SLUGS = [
 'om-jai-jagdish-hare-aarti',
 'aarti-kunj-bihari-ki',
 'jai-ganesh-deva-aarti',
 'shiv-chalisa',
 'ganesh-chalisa',
 'durga-chalisa',
];

describe('SEO: previously-404 slugs must resolve', () => {
 it('/content/[slug] allows dynamic params (no more hard 404 on unknown slugs)', () => {
   expect(contentDynamicParams).toBe(true);
 });

 it('/darshan/[id] allows dynamic params (no more hard 404 on unknown slugs)', () => {
   expect(darshanDynamicParams).toBe(true);
 });

 it.each(PREVIOUSLY_BROKEN_CONTENT_SLUGS)(
   '/content/%s is in the static-params allow-list',
   (slug) => {
     const params = contentParams() as ReadonlyArray<{ slug: string }>;
     const slugs = params.map((p) => p.slug);
     expect(slugs).toContain(slug);
   }
 );
});
