/**
 * CM-15 (second pass) — the route-segment loading state for /pujas.
 *
 * The finding names /temples and /astrology because those are the two the sweep
 * sampled. /pujas had the same hole and the worst version of it: page.tsx is an
 * async server component that awaits the catalogue AND `getTranslations`, has no
 * in-page <Suspense> at all, and had no loading.tsx — so unlike /temples (which
 * at least had TD-01's TemplesSkeleton behind an in-page boundary) it had no
 * boundary of any kind. Every in-app navigation into the catalogue — the "Book
 * a puja" CTAs, the header nav, the homepage category strip, the /search
 * zero-result "Browse all pujas" button this same wave added — rendered nothing
 * until the whole segment resolved.
 *
 * That is the blank screen standing directly in front of the money, and users
 * read blank as broken.
 *
 * Shaped like page.tsx (hero band, search field, facet chips, card grid) so the
 * layout does not jump when the real content lands. Structure only: no puja
 * names, no prices, no imagery. A skeleton that guesses at content is worse
 * than one that admits it is waiting.
 */
export default function PujasLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="min-h-[100dvh] bg-surface-50"
    >
      <span className="sr-only">Loading pujas</span>

      <section className="bg-[#ede9e3] py-12 md:py-16">
        <div className="container-wide">
          <div className="h-9 w-80 max-w-full animate-pulse rounded bg-white/70" />
          <p className="prose-lead mt-3 max-w-2xl text-surface-500">Loading pujas…</p>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-9 w-40 animate-pulse rounded-full bg-white/70" />
            ))}
          </div>

          {/* Search field */}
          <div className="mt-8 h-[54px] max-w-2xl animate-pulse rounded-lg bg-white/70" />
        </div>
      </section>

      <div className="container-wide py-8">
        {/* Facet chips */}
        <div className="mb-6 flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-8 w-28 animate-pulse rounded-full bg-white" />
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
                <div className="h-4 w-1/3 animate-pulse rounded bg-surface-100" />
                <div className="h-4 w-full animate-pulse rounded bg-surface-100" />
                <div className="mt-4 flex items-center justify-between">
                  <div className="h-6 w-24 animate-pulse rounded bg-surface-100" />
                  <div className="h-9 w-28 animate-pulse rounded-lg bg-surface-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
