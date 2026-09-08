import { notFound, redirect } from 'next/navigation';
import AstrologerProfileClient from './AstrologerProfileClient';
import {
  ASTROLOGER_DIRECTORY,
  firstParam,
  isRenderableAstrologerId,
} from './astrologer-id';

/**
 * DF-12 (prod sweep 2026-08-12) — /astrology/view answered HTTP 200 for an id
 * that names no astrologer.
 *
 * The whole route was a `'use client'` component. A client component cannot set
 * a status code: by the time it runs, the response is already on the wire. So
 * `?id=zzz-not-a-real-astrologer-999` rendered the correct "This astrologer
 * profile is not available" body under a 200 — a soft 404, which a crawler
 * indexes as real content and a monitor reads as a healthy page.
 *
 * The project already had the answer and had not applied it here: PF-10 was
 * closed by putting a server component in front of the client wizard
 * (app/pujas/home-puja/book/page.tsx). Same shape:
 *
 *   no id           -> 307 to the live directory. A bare /astrology/view is a
 *                      navigation mistake, not a missing resource.
 *   id, not a UUID  -> notFound(), a real 404, with NO API call. The API
 *                      (apps/api/src/routes/astrology.ts) 404s every non-UUID
 *                      id at the fall-through after its UUID_RE branch, so the
 *                      round trip could only return the answer we already have.
 *                      This is exactly the reported input, and the fixture ids
 *                      AW-02 retired (`astro_001`) go the same way.
 *   UUID            -> render the client profile unchanged.
 *
 * DELIBERATELY NOT DONE HERE: a server-side fetch for a UUID. It would turn an
 * API outage into a permanent 404 on a real astrologer's page — strictly worse
 * than the soft-404 this fixes. A UUID that is unapproved, deleted, or goes
 * stale after render stays covered by the client's own 'missing' screen, which
 * is why that branch and ProfileLoadingShell's escape anchors are kept.
 *
 * NOT ADDRESSED (and not addressable from a route): the sweep's literal
 * instance also recorded ZERO requests to api.darshya.online, i.e. the client
 * bundle never executed at all. That is an HTML-cache-lifetime vs chunk-hash
 * problem, not a routing one; the SSR shell's two anchors are all this file can
 * offer it.
 */

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AstrologerViewPage({ searchParams }: Props) {
  const id = firstParam((await searchParams).id);

  if (!id) redirect(ASTROLOGER_DIRECTORY);
  if (!isRenderableAstrologerId(id)) notFound();

  return <AstrologerProfileClient />;
}
