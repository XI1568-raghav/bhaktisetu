import Link from 'next/link';

/**
 * The sankalp thread — a scroll-linked rail down the left gutter.
 *
 * WHAT A DEVOTEE SEES. A thin saffron thread grows down the page as they scroll,
 * knotting at each section it passes. Hovering a knot names the section; clicking
 * one jumps there. It is the kalava — the thread tied around the wrist at the
 * start of a sankalp, knotted to hold the vow — which is the exact ritual this
 * product sells. That is the whole reason it is a thread and not a progress bar:
 * a progress bar is chrome from any website, a kalava is only from this one.
 *
 * WHY THIS AND NOT THE APPLE THING. The obvious ask is a pinned scroll sequence.
 * NN/g's scrolljacking work found most participants became at least mildly
 * disoriented, task-focused users disengaged, and it is worst on mobile and worst
 * when text must be read while moving — which describes this audience exactly
 * (older, mobile, often on a slow Indian network, and here to buy a ritual rather
 * than to be entertained). A frame-by-frame image sequence is disqualified on
 * payload alone: `images.unoptimized` is true, so there is no format negotiation
 * and no responsive srcset from the optimizer.
 *
 * This never touches scroll velocity. The page scrolls exactly as fast as the
 * reader pushes it; only a decorative rail responds.
 *
 * HOW IT IS DRIVEN. Pure CSS `animation-timeline: scroll(root block)` — no
 * IntersectionObserver, no rAF, no scroll listener, nothing on the main thread.
 * The fill animates `transform: scaleY()` and the knots animate `opacity` and
 * `transform`, which are the two compositor-only properties; animating height or
 * stroke-dashoffset here would forfeit the entire point and add paint on every
 * frame. Per-knot lighting comes from one shared timeline and a different
 * `animation-range` per knot, carried as the `--at` custom property below.
 *
 * SUPPORT AND FALLBACK. `animation-timeline` is Chrome/Edge 115+, Safari 26+,
 * Firefox 158+ desktop — ~87% globally, and higher on this audience (StatCounter
 * India mobile is ~88% Chrome). Everything is inside `@supports`, so a browser
 * without it renders the rail static and dim, which reads as a deliberate
 * margin rule rather than a broken feature. It is also `aria-hidden` and
 * `lg:`-only: it lives in the 144px gutter a 1440px viewport has spare, and
 * never appears where there is no gutter to spend.
 *
 * The knot links are the exception to aria-hidden — see the nav element below.
 */

export interface ThreadStop {
  /** Element id to jump to. Must exist on the page or the knot is a dead link. */
  id: string;
  /** Named on hover and to screen readers. */
  label: string;
  /**
   * Roughly how far down the page this section starts, 0-100. Drives
   * `animation-range`, so it only needs to be close — it decides when a knot
   * lights, not where anything is positioned.
   */
  at: number;
}

export default function SankalpThread({ stops }: { stops: ThreadStop[] }) {
  return (
    <div
      className="pointer-events-none fixed left-6 top-0 z-30 hidden h-screen w-10 lg:block xl:left-10"
      data-sankalp-thread
    >
      <div className="relative flex h-full items-center justify-center">
        {/* The unlit thread: always present, so the rail has a shape before any
            scrolling and in browsers with no scroll-timeline support. */}
        <div className="absolute inset-y-[18%] left-1/2 w-px -translate-x-1/2 bg-[var(--color-border)]" />

        {/* The lit thread. scaleY is driven by scroll progress. */}
        <div
          className="absolute inset-y-[18%] left-1/2 w-px -translate-x-1/2 origin-top"
          style={{ background: 'var(--color-primary)' }}
          data-sankalp-fill
        />

        <nav
          aria-label="Sections of this page"
          className="pointer-events-auto absolute inset-y-[18%] left-1/2 flex -translate-x-1/2 flex-col justify-between"
        >
          {stops.map((stop) => (
            <Link
              key={stop.id}
              href={`#${stop.id}`}
              className="group relative flex h-4 w-4 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400"
              data-sankalp-knot
              style={{ ['--at' as string]: `${stop.at}%` }}
            >
              <span className="sr-only">{stop.label}</span>
              <span
                aria-hidden="true"
                className="block h-1.5 w-1.5 rounded-full transition-transform duration-200 group-hover:scale-150"
                style={{ background: 'var(--color-primary)' }}
                data-sankalp-dot
              />
              {/* The label only exists on hover/focus, so the rail stays a rail. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-6 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                style={{
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {stop.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
