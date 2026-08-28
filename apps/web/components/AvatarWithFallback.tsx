'use client';

import { useState, type ReactNode } from 'react';

/**
 * PF-04 — an avatar `<img>` that degrades to a fallback when the URL is dead.
 *
 * `images.darshya.online` has no DNS record, and `apps/api/prisma/seed.ts`
 * wrote two URLs on that host into `priests.avatar_url`. Five surfaces rendered
 * an avatar behind a FALSY-only guard:
 *
 *   {x.avatarUrl ? <img src={x.avatarUrl} /> : <initials />}
 *
 * A URL that is PRESENT and dead walks straight past that guard into the
 * browser's broken-image icon. On the public pandit directory, next to
 * "Vedic certified" and a five-figure price, that is the cheapest way a product
 * can look abandoned.
 *
 * `app/pujas/PanditAvatar.tsx` already solved this for the two pages the
 * original finding named, but it hard-codes an initials tile as its fallback.
 * Two of the five surfaces fall back to an icon (`UserCircle` on the priest
 * profile, `User` on the devotee profile) rather than to initials, so the
 * fallback is a prop here and each surface keeps its own presentation.
 *
 * The swap is ONE-WAY STATE, never a `src` reassignment: an onError that points
 * at another remote URL which itself fails is an infinite request loop.
 *
 * This does not fix the hostname, and a DNS record alone would not fix it
 * either — no origin in this project serves `/priests/*.jpg`, so a CNAME would
 * resolve and then 404. The honest owner action is to host the images (the
 * Supabase Storage bucket is already allowed in next.config.ts remotePatterns)
 * or to null the column. The code-level obligation is this fallback.
 *
 * Guarded by __tests__/pf04-dead-avatar-host-surfaces.test.ts.
 */
export function AvatarWithFallback({
  src,
  alt,
  className,
  width,
  height,
  fallback,
}: {
  /** Resolved image URL, or null/empty when there is no photo. */
  src?: string | null;
  /** Alt text — a person's name at every current call site. */
  alt: string;
  /** Tailwind box classes for the <img>, e.g. "w-12 h-12 rounded-full". */
  className: string;
  /** Intrinsic width, so the box does not reflow while loading. */
  width: number;
  /** Intrinsic height. */
  height: number;
  /** What to render when there is no usable image. Rendered as-is. */
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const usable = typeof src === 'string' && src.trim().length > 0 && !failed;

  if (!usable) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src as string}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      alt={alt}
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

export default AvatarWithFallback;
