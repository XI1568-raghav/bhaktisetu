import Link from 'next/link';
import type { Metadata } from 'next';

// TD-04 (prod sweep 2026-08-12): this page inherited the root layout's default
// and every 404 on the site was served titled "Darshya — India's Devotional
// Super App". A link preview or a SERP snippet therefore presented a dead end
// as a legitimate page, so broken URLs kept getting shared and crawled. The
// root layout's template appends the brand, so the segment supplies only the
// leading phrase. noindex because a 404 must never be a search result.
export const metadata: Metadata = {
  title: 'Page not found',
  description: 'This Darshya page has moved or no longer exists.',
  robots: { index: false, follow: true },
};

// Global 404 page. Render the "Page not found" copy immediately — the previous
// 2.8s CSS loading animation was SEO-hostile (crawlers saw "Loading…" first)
// and a11y-hostile (no reduced-motion guard). AuthGuard handles protected
// routes client-side; this page only fires on real 404s.

export default function NotFound() {
  return (
    <div
      className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center"
      style={{ background: 'var(--color-bg)' }}
    >
      <svg
        width="56"
        height="56"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-6"
        aria-hidden="true"
      >
        <path d="M24 4 L36 18 L36 40 L12 40 L12 18 Z" fill="#EA580C" opacity="0.08" />
        <path
          d="M24 4 L36 18 L36 40 L12 40 L12 18 Z"
          stroke="#EA580C"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M18 40 L18 28 C18 24.5 20.7 22 24 22 C27.3 22 30 24.5 30 28 L30 40"
          stroke="#EA580C"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="none"
        />
        <ellipse cx="24" cy="16" rx="3.2" ry="1.1" fill="#D4A438" />
        <path d="M21.5 16 C21.5 14.3 22.6 13 24 13 C25.4 13 26.5 14.3 26.5 16" fill="#D4A438" />
        <path
          d="M24 8 C24 8 26.2 11 26.2 12.4 C26.2 13.8 25.2 14.2 24 14.2 C22.8 14.2 21.8 13.8 21.8 12.4 C21.8 11 24 8 24 8 Z"
          fill="#F59E0B"
        />
        <path
          d="M24 10 C24 10 25.1 11.5 25.1 12.4 C25.1 13.1 24.6 13.3 24 13.3 C23.4 13.3 22.9 13.1 22.9 12.4 C22.9 11.5 24 10 24 10 Z"
          fill="#FDE68A"
        />
      </svg>

      <h1
        className="heading-display mb-2 text-xl font-semibold"
        style={{ color: 'var(--color-text)' }}
      >
        Page not found
      </h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        The page you&rsquo;re looking for may have moved or doesn&rsquo;t exist on Darshya.
      </p>

      {/* CM-17 (prod sweep 2026-08-12): this page used to be a single "Back to
          Home" link. WhatsApp forwards, old bookmarks and stale search results
          are a primary acquisition channel for this audience — the intent that
          lands here is already qualified, and dumping it at an 8,222px
          homepage throws it away. A search box plus the two catalogue hubs and
          a handful of real destinations recycles traffic already paid for.
          Every slug below is in the live catalogue (Postgres puja_types /
          temples, 2026-08-13); nothing here links a puja the platform does not
          sell. */}
      <form
        action="/search"
        method="get"
        role="search"
        className="mt-8 flex w-full max-w-md items-center gap-2"
      >
        <label htmlFor="notfound-q" className="sr-only">
          Search Darshya
        </label>
        <input
          id="notfound-q"
          name="q"
          type="search"
          placeholder="Search a puja, temple or article"
          className="min-h-[44px] flex-1 rounded-lg border px-3 text-sm"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        />
        <button
          type="submit"
          className="btn-press bg-saffron-600 hover:bg-saffron-700 min-h-[44px] rounded-lg px-4 text-sm font-medium text-white"
        >
          Search
        </button>
      </form>

      <div className="mt-8 w-full max-w-md text-left">
        <p
          className="mb-2 text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Popular pujas
        </p>
        <ul className="flex flex-wrap gap-2">
          {[
            { slug: 'rudrabhishek', name: 'Rudrabhishek' },
            { slug: 'satyanarayan-katha', name: 'Satyanarayan Katha' },
            { slug: 'ganesh-puja', name: 'Ganesh Puja' },
            { slug: 'lakshmi-puja', name: 'Lakshmi Puja' },
          ].map((p) => (
            <li key={p.slug}>
              <Link
                href={`/pujas/${p.slug}`}
                className="inline-flex min-h-[44px] items-center rounded-full border px-3 text-sm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>

        <p
          className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Popular temples
        </p>
        <ul className="flex flex-wrap gap-2">
          {[
            { slug: 'kashi-vishwanath', name: 'Kashi Vishwanath' },
            { slug: 'somnath', name: 'Somnath' },
            { slug: 'siddhivinayak', name: 'Siddhivinayak' },
          ].map((t) => (
            <li key={t.slug}>
              <Link
                href={`/temples/${t.slug}`}
                className="inline-flex min-h-[44px] items-center rounded-full border px-3 text-sm"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
              >
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/pujas"
          className="btn-press bg-saffron-600 hover:bg-saffron-700 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-5 text-sm font-medium text-white"
        >
          Browse all pujas
        </Link>
        <Link
          href="/temples"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border px-5 text-sm font-medium"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          Browse temples
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center px-2 text-sm underline"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
