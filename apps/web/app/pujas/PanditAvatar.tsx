'use client';

import { useState } from 'react';

/**
 * PF-04 (prod sweep 2026-08-12, P2) — pandit headshots rendered as broken-image
 * icons on the wedding and home-puja pages.
 *
 * The URLs are real rows: `priests.avatar_url` holds
 * `https://images.darshya.online/priests/<name>.jpg` for the two seeded wedding
 * pandits, and that hostname has no DNS record — the browser reported
 * net::ERR_NAME_NOT_RESOLVED and `naturalWidth === 0`. Both call sites already
 * had an initials tile, but it was gated on `avatarUrl` being FALSY, so a URL
 * that is present and dead skipped it entirely.
 *
 * Sitting next to "Vedic certified" and "1,500+ weddings" on a page asking for
 * ₹25,000–₹51,000, a broken image is the single cheapest way to look abandoned.
 * A dead URL now renders the same initials tile a missing one does.
 *
 * The swap is one-way state, not a src reassignment: an onError that points at
 * another remote URL which itself fails is an infinite request loop.
 *
 * This does NOT fix the hostname. Either images.darshya.online gets a DNS
 * record and the assets behind it, or `priests.avatar_url` is repointed at
 * self-hosted /public paths — both are outside the web app.
 */
export function PanditAvatar({
  src,
  name,
  className,
  size = 64,
}: {
  /** Resolved image URL, or null/empty when the profile has no photo. */
  src?: string | null;
  /** Display name — the initials source and the alt text. */
  name: string;
  /** Tailwind box classes, e.g. "w-16 h-16 rounded-xl". */
  className: string;
  /** Intrinsic pixel size, so the box does not reflow while loading. */
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const usable = typeof src === 'string' && src.trim().length > 0 && !failed;

  if (!usable) {
    return (
      <div
        className={`${className} bg-saffron-100 flex items-center justify-center text-saffron-700 font-bold flex-shrink-0`}
        aria-hidden="true"
      >
        {panditInitials(name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src as string}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      alt={name}
      onError={() => setFailed(true)}
      className={`${className} object-cover flex-shrink-0`}
    />
  );
}

/** First + last initial, upper-cased. "P" when the name yields nothing. */
export function panditInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : '';
  return (first + last).toUpperCase() || 'P';
}

export default PanditAvatar;
