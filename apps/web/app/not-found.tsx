export const dynamic = 'force-static';

import Link from 'next/link';

// Global 404 page. Also serves as the SSR fallback for client-only protected
// routes (e.g. /dashboard, /admin, /priest) on Cloudflare Pages — those use
// <AuthGuard> which only runs in the browser. To keep that ~200ms hydration
// flash from looking like a hard error, we present a soft branded loading
// state instead of a "404" message.

export default function NotFound() {
 return (
 <div
 className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center"
 style={{ background: 'var(--color-bg)' }}
 >
 <svg
 width="56"
 height="56"
 viewBox="0 0 48 48"
 fill="none"
 xmlns="http://www.w3.org/2000/svg"
 className="mb-6 animate-pulse"
 aria-hidden="true"
 >
 <path d="M24 4 L36 18 L36 40 L12 40 L12 18 Z" fill="#EA580C" opacity="0.08" />
 <path d="M24 4 L36 18 L36 40 L12 40 L12 18 Z" stroke="#EA580C" strokeWidth="2" strokeLinejoin="round" fill="none" />
 <path d="M18 40 L18 28 C18 24.5 20.7 22 24 22 C27.3 22 30 24.5 30 28 L30 40" stroke="#EA580C" strokeWidth="1.8" strokeLinejoin="round" fill="none" />
 <ellipse cx="24" cy="16" rx="3.2" ry="1.1" fill="#D4A438" />
 <path d="M21.5 16 C21.5 14.3 22.6 13 24 13 C25.4 13 26.5 14.3 26.5 16" fill="#D4A438" />
 <path d="M24 8 C24 8 26.2 11 26.2 12.4 C26.2 13.8 25.2 14.2 24 14.2 C22.8 14.2 21.8 13.8 21.8 12.4 C21.8 11 24 8 24 8 Z" fill="#F59E0B" />
 <path d="M24 10 C24 10 25.1 11.5 25.1 12.4 C25.1 13.1 24.6 13.3 24 13.3 C23.4 13.3 22.9 13.1 22.9 12.4 C22.9 11.5 24 10 24 10 Z" fill="#FDE68A" />
 </svg>

 <h1
 className="text-xl font-semibold mb-2"
 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
 >
 Loading…
 </h1>
 <p
 className="text-sm mb-8 max-w-sm"
 style={{ color: 'var(--color-text-muted)' }}
 >
 If this screen stays for more than a moment, the page may have moved
 or doesn&apos;t exist.
 </p>
 <Link
 href="/"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white btn-press"
 style={{ background: 'var(--color-primary)' }}
 >
 Back to Home
 </Link>
 </div>
 );
}
