import Link from 'next/link';

// Shared shell for /hi /ta /te /bn /mr landing pages. Each lang file passes
// pre-translated strings; this component renders the layout. Routes that
// haven't been translated link back to canonical English instead of fake
// /lang/* subpaths.

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
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10" lang={props.langCode}>
      <div className="text-right mb-4 text-sm">
        <Link href="/" className="text-saffron-700 hover:underline">{props.englishLink}</Link>
      </div>

      <header className="text-center mb-12">
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          🕉️ {props.pillText}
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-4 leading-tight">
          {props.heroTitle}
        </h1>
        <p className="text-surface-700 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          {props.heroSubtitle}
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link
            href="/pujas"
            className="px-6 py-3 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            {props.ctaBookLabel}
          </Link>
          <Link
            href="/darshan"
            className="px-6 py-3 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            {props.ctaDarshanLabel}
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {props.features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="block rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:shadow-sm transition"
          >
            <h2 className="text-lg font-semibold text-surface-900 mb-2">{f.title}</h2>
            <p className="text-sm text-surface-700 leading-relaxed">{f.body}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-2">{props.nriHeading}</h2>
        <p className="text-surface-700 text-sm mb-4 max-w-xl mx-auto">{props.nriBody}</p>
        <Link
          href="/nri"
          className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
        >
          {props.nriCta}
        </Link>
      </section>

      <footer className="border-t border-surface-200 pt-6 text-center text-sm text-surface-600">
        <p>{props.footerNote}</p>
        <Link href="/" className="text-saffron-700 hover:underline mt-2 inline-block">
          {props.englishLinkFooter}
        </Link>
      </footer>
    </main>
  );
}
