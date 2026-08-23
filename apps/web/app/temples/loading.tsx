/**
 * CM-15 (prod sweep 2026-08-12) — the route-segment loading state for
 * /temples.
 *
 * TD-01 gave page.tsx an in-page <Suspense fallback={<TemplesSkeleton />}>,
 * which covers the API round trip. It does not cover the segment itself: until
 * a route has a loading.tsx the App Router has no boundary to show while the
 * segment's RSC payload is in flight, so every in-app navigation into the
 * directory — the homepage's "Explore temples" link, the header nav, the
 * category strip — rendered nothing at all until the whole segment resolved.
 * On a cold API that is the blank screen the sweep measured, and users read
 * blank as broken.
 *
 * Structure only. No temple names, no imagery, nothing that could be mistaken
 * for real content if the fetch is slow or fails.
 */
export default function TemplesLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-[100dvh] bg-[color:var(--color-bg,#fbf7f1)]"
    >
      <span className="sr-only">Loading temples</span>

      <section className="bg-[#ede9e3] py-12 md:py-16">
        <div className="container-wide">
          <div className="h-9 w-72 max-w-full animate-pulse rounded bg-white/70" />
          <p className="prose-lead mt-3 max-w-2xl text-surface-500">Loading temples…</p>
          <div className="mt-8 h-[54px] max-w-2xl animate-pulse rounded-lg bg-white/70" />
        </div>
      </section>

      <div className="container-wide py-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-24 animate-pulse rounded-full bg-white/70" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="aspect-[16/10] animate-pulse bg-surface-100" />
              <div className="space-y-2 p-5">
                <div className="h-5 w-2/3 animate-pulse rounded bg-surface-100" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-surface-100" />
                <div className="h-4 w-full animate-pulse rounded bg-surface-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
