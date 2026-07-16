import Link from 'next/link';

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
        className="mb-2 text-xl font-semibold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
      >
        Page not found
      </h1>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        The page you&rsquo;re looking for may have moved or doesn&rsquo;t exist on Darshya.
      </p>

      <Link
        href="/"
        className="btn-press mt-8 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
        style={{ background: 'var(--color-primary)' }}
      >
        Back to Home
      </Link>
    </div>
  );
}
