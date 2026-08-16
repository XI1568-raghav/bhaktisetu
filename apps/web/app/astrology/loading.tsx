/**
 * CM-15 (prod sweep 2026-08-12) — the route-segment loading state for
 * /astrology.
 *
 * The sweep measured both /temples and /astrology rendering
 * `<Suspense fallback={<div className="min-h-[100dvh]" />}>` — one empty
 * viewport-tall div, no skeleton, no spinner, no text.
 *
 * This closes the segment boundary: every in-app navigation into /astrology
 * (the homepage category strip's Astrology card, the "Kundli" quick action,
 * the header nav) now lands on a shimmer grid shaped like the 17-tool page
 * instead of on nothing.
 *
 * NOT closed here, and deliberately not claimed: the in-page boundary at
 * app/astrology/page.tsx:171 is still the empty div. AstrologyClient reads
 * useSearchParams, so that boundary is what renders in the PRERENDERED HTML —
 * a loading.tsx cannot substitute for it. app/astrology/page.tsx is outside
 * this lane; the one-line change there is to swap the fallback for this
 * component.
 */
export default function AstrologyLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-[100dvh] bg-[color:var(--color-bg,#fbf7f1)]"
    >
      <span className="sr-only">Loading astrology tools</span>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="h-4 w-48 animate-pulse rounded bg-surface-100" />
        <div className="mt-3 h-9 w-80 max-w-full animate-pulse rounded bg-surface-100" />
        <p className="mt-3 text-sm text-surface-500">Loading Vedic tools…</p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
            >
              <div className="h-5 w-2/3 animate-pulse rounded bg-surface-100" />
              <div className="mt-3 h-4 w-full animate-pulse rounded bg-surface-100" />
              <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-surface-100" />
              <div className="mt-5 h-9 w-36 animate-pulse rounded-lg bg-surface-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
