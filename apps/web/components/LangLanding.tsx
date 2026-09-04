import Link from 'next/link';

import { localeHref, normalizeLocale } from '../lib/i18n/locales';
import { buttonClass } from '../components/ui/button-recipe';
import { H1 } from '../components/ui/heading-recipe';

// Shared shell for /hi /ta /te /bn /mr landing pages. Each lang file passes
// pre-translated strings; this component renders the layout.
//
// Audit I-02 / I18N-01 (2026-08-12): these pages still link to the canonical
// English routes rather than fake /lang/* subpaths (which 404 — verified: all
// of /hi/pujas, /ta/pujas, /te/pujas, /bn/pujas, /mr/pujas return 404). What
// changed is that the links now CARRY the visitor's locale, so following one no
// longer silently resets them to English. The middleware turns the `?lang=`
// into the durable `poojly_language` cookie and strips it back off the URL, so
// no duplicate locale URLs get indexed.
//
// The destination is still mostly English copy — that is a content gap, not a
// routing one. `TranslationCoverageNotice` is what tells the visitor so.
//
// WHY prefetch={false} ON EVERY LINK HERE: the `?lang=` only becomes a durable
// choice when the middleware sees the request. next/link prefetches in-viewport
// links, and on Next 15 a prefetched static route is reused from the client
// Router Cache for `staleTimes.static` (5 minutes by default) — so the click
// could be served from memory, skip the middleware entirely, and leave the
// visitor back in English exactly as before the fix. Middleware also (rightly)
// refuses to write the cookie on a prefetch, since scrolling past a link is not
// choosing a language, which makes the real navigation load-bearing. These are
// eight links on five landing pages; correctness of the language choice is worth
// more than their prefetch warmth.

export interface LangLandingProps {
  langCode: string; // 'ta', 'te', 'bn', 'mr'
  langTag: string;  // 'ta_IN', 'te_IN', 'bn_IN', 'mr_IN'
  pillText: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaBookLabel: string;
  ctaDarshanLabel: string;
  featureSectionLabel?: string;
  features: { title: string; body: string; href: string }[];
  nriHeading: string;
  nriBody: string;
  nriCta: string;
  englishLink: string;
  footerNote: string;
  englishLinkFooter: string;
}

export function LangLanding(props: LangLandingProps) {
  // The landing knows its own locale statically — no cookie read, so these
  // pages stay prerendered.
  const locale = normalizeLocale(props.langCode);
  const href = (to: string) => localeHref(to, locale);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10" lang={props.langCode}>
      <div className="text-right mb-4 text-sm">
        {/* Explicit ?lang=en so "back to English" actually CLEARS the stored
            locale — otherwise the cookie would silently pull them back in. */}
        <Link href="/?lang=en" className="text-saffron-700 hover:underline" prefetch={false}>{props.englishLink}</Link>
      </div>

      <header className="text-center mb-12">
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          🕉️ {props.pillText}
        </div>
        <h1 className={`${H1.marketing} mb-4`}>
          {props.heroTitle}
        </h1>
        <p className="prose-lead text-surface-700 leading-relaxed max-w-2xl mx-auto">
          {props.heroSubtitle}
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link
            href={href('/pujas')}
            className={buttonClass('primary', 'md')}
            prefetch={false}
          >
            {props.ctaBookLabel}
          </Link>
          <Link
            href={href('/darshan')}
            className="px-6 py-3 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
            prefetch={false}
          >
            {props.ctaDarshanLabel}
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {props.features.map((f) => (
          <Link
            key={f.href}
            href={href(f.href)}
            className="block rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:shadow-sm transition"
            prefetch={false}
          >
            <h2 className="text-lg font-semibold text-surface-900 mb-2">{f.title}</h2>
            <p className="text-sm text-surface-700 leading-relaxed">{f.body}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-2">{props.nriHeading}</h2>
        <p className="text-surface-700 prose-body mb-4 max-w-xl mx-auto">{props.nriBody}</p>
        <Link
          href={href('/nri')}
          className={buttonClass('primary', 'md')}
          prefetch={false}
        >
          {props.nriCta}
        </Link>
      </section>

      <footer className="border-t border-surface-200 pt-6 text-center text-sm text-surface-600">
        <p>{props.footerNote}</p>
        <Link href="/?lang=en" className="text-saffron-700 hover:underline mt-2 inline-block" prefetch={false}>
          {props.englishLinkFooter}
        </Link>
      </footer>
    </main>
  );
}
