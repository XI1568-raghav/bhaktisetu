import { notFound, redirect } from 'next/navigation';
import BookHomePujaClient from './BookHomePujaClient';
import { firstParam, resolveBookRoute } from './resolve-book-route';

/**
 * PF-10 (prod sweep 2026-08-12, P3) — /pujas/home-puja/book answered HTTP 200
 * with a "Puja not found" body.
 *
 * The whole route was a `'use client'` component, so the only thing it could do
 * with an unrecognised `?slug=` was render a dead end at 200. A client
 * component cannot set a status code: by the time it runs, the response is
 * already on the wire. Search engines index that page as real content, and the
 * route is about to matter — PF-01 rewired the ceremony CTAs to point here, so
 * it will start receiving traffic with no slug at all.
 *
 * The gate therefore has to run on the server, ahead of the wizard:
 *
 *   - no slug        → 307 to the ceremony catalogue. A bare /book is a
 *     navigation mistake, not a missing resource; sending it somewhere useful
 *     beats a 404 whose only link goes to the same place.
 *   - unknown slug   → notFound(), a real 404 with the app's not-found page.
 *   - known slug     → the wizard, unchanged.
 *
 * The client wizard keeps its own `!category` branch as a safety net, but no
 * route reaches it any more.
 */

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookHomePujaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const outcome = resolveBookRoute(firstParam(sp.slug));

  if (outcome.kind === 'redirect') redirect(outcome.to);
  if (outcome.kind === 'not-found') notFound();

  return <BookHomePujaClient />;
}
