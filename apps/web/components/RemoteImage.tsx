'use client';

import { useState } from 'react';

/**
 * CM-08 — a remote <img> that disappears instead of painting an empty box.
 *
 * Every catalogue image on this site is hotlinked from upload.wikimedia.org
 * (next.config.ts sets `images.unoptimized`, and TASKS #203/#204 still own the
 * self-host-vs-CDN decision). Wikimedia rate-limits a concurrent burst, and a
 * real page load IS a concurrent burst: measured 2026-08-19, 7 of the 10 puja
 * images returned 429 when their HEADs were fired in parallel, and all 10
 * returned 200 when re-run serially with 400 ms gaps.
 *
 * With no onError those cards paint as a blank 382x239 hole. Clearing `src`
 * removes the element's box entirely, so the wrapper's saffron gradient — which
 * every card already has behind the image — shows through and the card still
 * reads as a card. 119 onError handlers already exist elsewhere in the app; the
 * catalogue grid was simply not one of them.
 *
 * A client component because onError is an event handler and the pages that
 * render it (/pujas among them) are Server Components.
 */
export default function RemoteImage({
  src,
  srcSet,
  ...rest
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...rest}
      src={src}
      srcSet={srcSet}
      onError={() => setFailed(true)}
      alt={rest.alt ?? ''}
    />
  );
}
