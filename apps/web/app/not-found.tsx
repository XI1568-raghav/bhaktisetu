import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center" style={{ background: 'var(--color-bg)' }}>
      <p className="text-6xl font-semibold mb-4" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)' }}>404</p>
      <h1 className="text-xl font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
        Page not found
      </h1>
      <p className="text-sm mb-8 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
        The page you are looking for does not exist or has been moved.
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
