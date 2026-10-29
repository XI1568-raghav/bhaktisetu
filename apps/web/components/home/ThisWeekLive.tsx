'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../lib/api-config';
import { catalogueSlugsFromPayload } from '../../lib/puja-catalogue';
import { buildThisWeekCards, ThisWeekView, upcomingFestivals, type ThisWeekCard } from './ThisWeekView';

/**
 * "What is coming up", resolved in the browser.
 *
 * The homepage is prerendered once at build time and served as a static asset, so a
 * server-side `new Date()` would freeze "In 3 days" at the build's date. The festival
 * calendar is committed data and the bookable-puja set is a public API read, so the
 * cards are computed here from the visitor's own clock after mount. Until then (and if
 * the API cannot be read) the section reserves its height: with an unreachable catalogue
 * every card degrades to "How to observe it", the same rule the server form follows.
 */
export default function ThisWeekLive() {
  const [cards, setCards] = useState<ThisWeekCard[] | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    const now = new Date();
    if (upcomingFestivals(now).length === 0) {
      setCards([]);
      return () => ctrl.abort();
    }
    fetch(`${API_BASE_URL}/pujas/types?limit=100`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((payload) => {
        if (ctrl.signal.aborted) return;
        setCards(buildThisWeekCards(now, catalogueSlugsFromPayload(payload)));
      });
    return () => ctrl.abort();
  }, []);

  if (cards === null) return <div id="coming-up" aria-hidden="true" className="min-h-[18rem]" />;
  if (cards.length === 0) return null;
  return <ThisWeekView cards={cards} />;
}
