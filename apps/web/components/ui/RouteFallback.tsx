/**
 * CM-15 — the minimum a Suspense fallback may be.
 *
 * A `<div className="min-h-[100dvh]" />` is not a loading state; it is one
 * blank viewport. On any route whose client subtree reads useSearchParams and
 * that Next can prerender, React bails out of that subtree at build time and
 * bakes the fallback straight into the static HTML — so a cold or crawler visit
 * gets the blank screen, and a route-segment loading.tsx (which only covers
 * client-side navigation into the segment) cannot substitute for it.
 *
 * Routes with a bespoke skeleton should use that instead. This is for the
 * routes that have none, so "some shimmer plus an accessible label" is strictly
 * better than nothing and costs one import.
 */
export default function RouteFallback({
  label = 'Loading…',
  className = 'min-h-[100dvh]',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={`${className} px-4 py-10 sm:px-6`}>
      <span className="sr-only">{label}</span>
      <div className="mx-auto w-full max-w-3xl space-y-4" aria-hidden="true">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-200" />
        <div className="h-4 w-full animate-pulse rounded bg-surface-200" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-surface-200" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-surface-200" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-surface-200" />
        <div className="h-24 w-full animate-pulse rounded-xl bg-surface-200" />
      </div>
    </div>
  );
}
