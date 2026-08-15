'use client';

/**
 * The one recovery screen, as a component.
 *
 * DU-13 (prod sweep 2026-08-12) measured the /pujas/[slug] boundary as the
 * only screen of the ten rendering in the OS system face, with a radius that
 * appears on no other button in the product, colours inlined as literals and
 * no page title at all. Its five siblings were byte-for-byte the same file.
 *
 * Everything below is a token or a shared recipe:
 *   title   -> H1.catalogue, so this is a real page title on the display face
 *   buttons -> buttonClass(), one height / one radius / one AA-passing fill
 *   colour  -> surface-* utilities, never a literal hex
 *
 * app/global-error.tsx is deliberately NOT built on this. It replaces the root
 * layout, so the stylesheet this component depends on is never loaded there
 * and its inline styles are the only thing that can paint.
 */

import { H1 } from './heading-recipe';
import { buttonClass } from './button-recipe';

export type ErrorStateProps = {
  /** The page title. Rendered as the h1 — every recovery screen gets one. */
  title: string;
  /** One sentence of plain explanation under the title. */
  description: string;
  /** Next.js passes this on `error.digest`; shown so support can correlate. */
  digest?: string | undefined;
  /** Re-render the failed segment. Next.js `reset`. */
  onRetry: () => void;
  /** Where "back" goes when the retry does not help. */
  backHref: string;
  backLabel: string;
  /** Tall for a whole page, shorter for a nested segment. */
  minHeightClass?: string;
};

export default function ErrorState({
  title,
  description,
  digest,
  onRetry,
  backHref,
  backLabel,
  minHeightClass = 'min-h-[50vh]',
}: ErrorStateProps) {
  return (
    <div
      className={`${minHeightClass} mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-6 py-16 text-center`}
    >
      <h1 className={H1.catalogue}>{title}</h1>

      <p className="text-surface-500 mt-3 max-w-md text-base leading-relaxed">{description}</p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={onRetry} className={buttonClass('primary', 'md')}>
          Try again
        </button>
        {/* A plain anchor, not next/link: the segment that just threw is still
            mounted, so a hard navigation is the reliable way out of it. */}
        <a href={backHref} className={buttonClass('secondary', 'md')}>
          {backLabel}
        </a>
      </div>

      {digest ? (
        <p className="text-surface-500 mt-6 font-mono text-xs">Error: {digest}</p>
      ) : null}
    </div>
  );
}
