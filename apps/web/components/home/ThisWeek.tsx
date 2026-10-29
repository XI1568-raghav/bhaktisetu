import { getCatalogueSlugs } from '../../lib/puja-catalogue';
import { buildThisWeekCards, ThisWeekView, upcomingFestivals } from './ThisWeekView';

export { upcomingFestivals };

interface Props {
  /** Injected in tests; fetched from the live catalogue in the page tree. */
  catalogueSlugs?: ReadonlySet<string>;
  /** Injected in tests so the card set is deterministic. */
  now?: Date;
}

/**
 * Server-rendered form (used by tests and by any page that renders per request). The
 * homepage is prerendered once at build time, so it uses ThisWeekLive instead, which
 * computes the same cards in the browser from the visitor's own clock.
 */
export default async function ThisWeek({ catalogueSlugs, now }: Props = {}) {
  const at = now ?? new Date();
  if (upcomingFestivals(at).length === 0) return null;
  const catalogue = catalogueSlugs ?? (await getCatalogueSlugs());
  return <ThisWeekView cards={buildThisWeekCards(at, catalogue)} />;
}
