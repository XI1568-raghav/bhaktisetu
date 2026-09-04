/**
 * CI-05 — one booking exit for every encyclopedia detail route.
 *
 * MEASURED STATE BEFORE THIS MODULE (scan of every `app/**\/[param]/page.tsx`
 * at HEAD, comments stripped, counting hrefs into a transactional surface plus
 * the two non-/pujas exits the product genuinely uses — an affiliate click-out
 * and a dataset-held external operator URL): 87 dynamic detail routes,
 * **50 with no transactional exit at all**.
 *
 * 27 of those 50 are public encyclopedia routes carrying roughly 560
 * prerendered pages — `tirth` alone is 84 shrines, `muhurat` 75, `shlokas` 57,
 * `upanishads` 49. A reader arriving on any of them from search reached the end
 * of the page and had nowhere to go. The other 23 are admin, authed, redirect
 * shims, reader surfaces and client-component shells; they are enumerated with
 * reasons in EXCLUDED_DETAIL_ROUTES or are simply out of this module's scope.
 *
 * `/tirth/<slug>` was the worst of it and the reason this finding names it:
 * it printed a green pill reading "✓ Online booking available" and listed
 * "Primary pujas performed here" as plain <li> text. The promise was made in
 * so many words and nothing on the page could be clicked to keep it.
 *
 * WHY ONE MODULE AND NOT 29 CTA BLOCKS
 * Twenty-nine hand-written cards is the same maintenance defect the finding
 * describes, one level up: the next route added gets no CTA because nobody
 * remembers, and the copy drifts apart in the meantime. A route earns its exit
 * by adding one line to DETAIL_ROUTE_LANES below, and `detail-route-cta.ci05`
 * fails the build if a registered route stops rendering it.
 *
 * WHAT THIS MODULE REFUSES TO DO
 * COM-12 (lib/temple-booking.ts) established the rule that this product does
 * not advertise a booking promise with nothing behind it, and DF-02/CI-01
 * established how: a deep link is emitted ONLY after the live catalogue
 * confirms the slug, and an unreadable catalogue yields ZERO deep links rather
 * than optimistic ones. This module reuses that resolver rather than keeping a
 * second copy of the rule. When nothing resolves, the reader is sent to a
 * surface that always exists (`/pujas`, `/ask-pandit`, `/yatra-packages`) with
 * copy that does not claim the specific ritual is for sale.
 *
 * Editorial puja fields are display prose ("Mahamrityunjaya Jaap", "Rudrabhishek"),
 * not slugs, so they are slugified before resolution. Slugification cannot
 * invent a match: the result still has to be present in the live catalogue set
 * to become a link.
 */

import { createElement as h, type ReactElement } from 'react';
import Link from 'next/link';
import { buttonClass } from '../components/ui/button-recipe';
import { BROWSE_PUJAS_HREF, pujaLinkLabel, resolveContentPujas } from './puja-link';

/** Surfaces that exist unconditionally and are therefore safe fallbacks. */
export const ASK_PANDIT_HREF = '/ask-pandit';
export const YATRA_PACKAGES_HREF = '/yatra-packages';

/**
 * The four honest next steps an encyclopedia page can offer.
 *
 * Deliberately few. A per-subject lane would be a taxonomy nobody maintains;
 * what actually differs between "Kashi Vishwanath" and "Brihadaranyaka
 * Upanishad" is not the design of the card, it is whether the right next step
 * is a ritual, a question, a date, or a trip.
 */
export type DetailCtaLane = 'puja' | 'guidance' | 'muhurat' | 'yatra';

/**
 * Route prefix (the path under `app/`, without the dynamic segment) → lane.
 *
 * Registering a route here is what makes the guard test require a CTA on it.
 * Routes deliberately ABSENT are documented in EXCLUDED_DETAIL_ROUTES.
 */
export const DETAIL_ROUTE_LANES: Readonly<Record<string, DetailCtaLane>> = {
  // A puja is genuinely performed for, or at, this subject.
  tirth: 'puja',
  'sacred-rivers': 'puja',
  'sacred-mountains': 'puja',
  'sacred-trees': 'puja',
  samskaras: 'puja',
  'vedic-yajnas': 'puja',
  dashavatar: 'puja',
  'pancha-bhoota': 'puja',
  shlokas: 'puja',

  // The subject is a unit of time; the next step is an auspicious date.
  muhurat: 'muhurat',
  masa: 'muhurat',
  tithi: 'muhurat',
  'panchang/karana': 'muhurat',
  'panchang/yoga': 'muhurat',

  // Doctrine and scripture. Nothing here is a ritual you buy; the honest next
  // step is a question to a pandit.
  upanishads: 'guidance',
  puranas: 'guidance',
  vedas: 'guidance',
  ved: 'guidance',
  darshanas: 'guidance',
  'hindu-philosophies': 'guidance',
  sanatan: 'guidance',
  'hindu-symbols': 'guidance',
  chakras: 'guidance',
  'sapta-rishis': 'guidance',
  'bhakti-saint': 'guidance',
  navaratna: 'guidance',
  sanskrit: 'guidance',

  'yatra/destinations': 'yatra',
};

/**
 * Detail routes that are NOT in the registry, and why — so the next reader does
 * not "fix" one back in.
 *
 * A deliberate omission beats a thin CTA, which is why these are recorded
 * rather than quietly skipped.
 */
export const EXCLUDED_DETAIL_ROUTES: Readonly<Record<string, string>> = {
  yatra:
    'already exits: /yatra/[slug]/book exists and the page links it three times ' +
    '(hero, each package tier, footer). Flagged only because the first scan of ' +
    'this finding did not count /yatra/... as a transactional prefix.',
  'wellness/vipassana/centers':
    'already exits: renders the centre\'s own external bookingUrl. Vipassana courses ' +
    'are donation-run by Dhamma organisations and are not Darshya inventory; a /pujas ' +
    'CTA here would divert a reader away from the thing they came to book.',
  gurukuls:
    'the page is a shell around GurukulDetailClient; its conversion path is ' +
    'gurukuls/apply/[programId], which lives in the client component.',
  blog: 'editorial; CTAs are authored per post in the post body.',
  'help/articles': 'support content — a booking CTA on a refund article is hostile.',
  'content/books': 'a reader surface. The exit is the next chapter, not a checkout.',
  gita: 'scripture reader; same reasoning as content/books.',
  ramayana: 'scripture reader; same reasoning as content/books.',
  mahabharata: 'scripture reader; same reasoning as content/books.',
  'yoga-sutras': 'scripture reader; same reasoning as content/books.',
  calendar: 'a utility view, not a subject page.',
  'panchang/[city]': 'a utility view, not a subject page.',
};

interface LaneCopy {
  /** Heading used when the live catalogue confirmed at least one ritual. */
  bookableHeading: (subject: string) => string;
  bookableBlurb: (subject: string) => string;
  /** Heading and copy used when nothing specific resolved. */
  browseHeading: (subject: string) => string;
  browseBlurb: (subject: string) => string;
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
}

const LANE_COPY: Readonly<Record<DetailCtaLane, LaneCopy>> = {
  puja: {
    bookableHeading: (s) => `Book a puja connected to ${s}`,
    bookableBlurb: () =>
      'Each of these is live on Darshya right now, with a verified pandit and a confirmed price.',
    browseHeading: (s) => `Have a puja performed for ${s}`,
    browseBlurb: () =>
      'No ritual named on this page is bookable on Darshya yet. Browse the catalogue — every ' +
      'listing there has a verified pandit, a confirmed price and video proof of the ceremony.',
    primary: { label: 'Browse all pujas', href: BROWSE_PUJAS_HREF },
    secondary: { label: 'Ask a pandit first', href: ASK_PANDIT_HREF },
  },
  guidance: {
    bookableHeading: (s) => `Book a puja connected to ${s}`,
    bookableBlurb: () =>
      'Each of these is live on Darshya right now, with a verified pandit and a confirmed price.',
    browseHeading: (s) => `Ask a pandit about ${s}`,
    browseBlurb: () =>
      'This is a subject to study rather than a ritual to book. Put the question to a verified ' +
      'pandit, or browse the pujas that draw on it.',
    primary: { label: 'Ask a pandit', href: ASK_PANDIT_HREF },
    secondary: { label: 'Browse pujas', href: BROWSE_PUJAS_HREF },
  },
  muhurat: {
    bookableHeading: (s) => `Book a puja for ${s}`,
    bookableBlurb: () =>
      'Each of these is live on Darshya right now, with a verified pandit and a confirmed price.',
    browseHeading: (s) => `Plan something around ${s}`,
    browseBlurb: () =>
      'A pandit can confirm whether this window suits your ceremony and your birth chart before ' +
      'you commit to a date.',
    primary: { label: 'Ask a pandit about timing', href: ASK_PANDIT_HREF },
    secondary: { label: 'Browse pujas', href: BROWSE_PUJAS_HREF },
  },
  yatra: {
    bookableHeading: (s) => `Book a puja connected to ${s}`,
    bookableBlurb: () =>
      'Each of these is live on Darshya right now, with a verified pandit and a confirmed price.',
    browseHeading: (s) => `Travel to ${s}`,
    browseBlurb: () =>
      'Darshya runs guided yatra packages with darshan, stay and local pandits arranged. ' +
      'Browse what is currently open for booking.',
    primary: { label: 'See yatra packages', href: YATRA_PACKAGES_HREF },
    secondary: { label: 'Browse pujas', href: BROWSE_PUJAS_HREF },
  },
};

/**
 * Turn an editorial puja NAME into a candidate slug.
 *
 * Purely mechanical, and deliberately so: the output is not trusted, it is
 * looked up. Parenthetical and location qualifiers are kept, which means a
 * qualified ritual ("Rudrabhishek at Kashi") fails to match the plain
 * catalogue entry instead of silently upgrading onto it — the same rule
 * matchTempleOffering enforces on the temple funnel.
 */
export function pujaNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface DetailCtaInput {
  /** Path under `app/` without the dynamic segment, e.g. 'tirth', 'panchang/yoga'. */
  routePrefix: string;
  /** What the page is about, used verbatim in the heading. */
  subject: string;
  /** Editorial ritual names or slugs from this page's own dataset. Optional. */
  relatedPujas?: readonly string[];
  /** Live bookable slugs from getCatalogueSlugs(). Absent/empty ⇒ no deep links. */
  catalogue?: ReadonlySet<string>;
}

export type DetailCta =
  | { kind: 'bookable'; heading: string; blurb: string; pujaSlugs: string[] }
  | {
      kind: 'browse';
      heading: string;
      blurb: string;
      actions: ReadonlyArray<{ label: string; href: string }>;
    };

/**
 * Decide what this page's exit should be.
 *
 * Throws for an unregistered prefix rather than rendering nothing, so a typo
 * fails loudly in the build instead of silently restoring the dead end.
 */
export function resolveDetailCta(input: DetailCtaInput): DetailCta {
  const lane = DETAIL_ROUTE_LANES[input.routePrefix];
  if (!lane) {
    throw new Error(
      `detail-route-cta: '${input.routePrefix}' is not in DETAIL_ROUTE_LANES. ` +
        'Register it, or record why it has no booking exit in EXCLUDED_DETAIL_ROUTES.',
    );
  }
  const copy = LANE_COPY[lane];

  const catalogue = input.catalogue ?? new Set<string>();
  const candidates = (input.relatedPujas ?? []).map(pujaNameToSlug).filter(Boolean);
  const pujaSlugs = candidates.length > 0 ? resolveContentPujas(candidates, catalogue) : [];

  if (pujaSlugs.length > 0) {
    return {
      kind: 'bookable',
      heading: copy.bookableHeading(input.subject),
      blurb: copy.bookableBlurb(input.subject),
      pujaSlugs,
    };
  }

  return {
    kind: 'browse',
    heading: copy.browseHeading(input.subject),
    blurb: copy.browseBlurb(input.subject),
    actions: copy.secondary ? [copy.primary, copy.secondary] : [copy.primary],
  };
}

/**
 * Render the exit.
 *
 * Written with createElement rather than JSX because this module is a `.ts`
 * file; the markup is small enough that the cost is a few extra parentheses.
 */
export function renderDetailCta(cta: DetailCta): ReactElement {
  const heading = h(
    'h2',
    { className: 'text-xl font-bold text-surface-900' },
    cta.heading,
  );
  const blurb = h('p', { className: 'mt-2 text-sm text-surface-700' }, cta.blurb);

  if (cta.kind === 'bookable') {
    return h(
      'section',
      {
        'data-detail-cta': 'bookable',
        className: 'mb-8 rounded-2xl border border-surface-200 bg-white p-6',
      },
      heading,
      blurb,
      h(
        'div',
        { className: 'mt-4 grid gap-3 sm:grid-cols-2' },
        ...cta.pujaSlugs.map((slug) =>
          h(
            Link,
            {
              key: slug,
              href: `/pujas/${slug}`,
              className:
                'flex items-center justify-between gap-3 rounded-xl border border-surface-200 ' +
                'bg-white p-4 transition hover:border-saffron-300 hover:bg-saffron-50',
            },
            h(
              'span',
              { className: 'font-semibold capitalize text-surface-900' },
              pujaLinkLabel(slug),
            ),
            h('span', { 'aria-hidden': true, className: 'text-saffron-600' }, '→'),
          ),
        ),
      ),
    );
  }

  return h(
    'section',
    {
      'data-detail-cta': 'browse',
      className: 'mb-8 rounded-2xl border border-surface-200 bg-white p-6',
    },
    heading,
    blurb,
    h(
      'div',
      { className: 'mt-4 flex flex-wrap gap-3' },
      ...cta.actions.map((action, i) =>
        h(
          Link,
          {
            key: action.href,
            href: action.href,
            className: buttonClass(i === 0 ? 'primary' : 'secondary', 'md'),
          },
          action.label,
        ),
      ),
    ),
  );
}

/** Convenience wrapper: resolve and render in one call site. */
export function detailCta(input: DetailCtaInput): ReactElement {
  return renderDetailCta(resolveDetailCta(input));
}
