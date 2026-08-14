'use client';

import { useState } from 'react';
import { Share2, Check } from 'lucide-react';

/**
 * CM-18 (prod sweep 2026-08-12) — the Share control on the puja price card
 * carried hover styling and no click handler. /pujas/<slug> is a server
 * component; a grep for `onClick` across all 639 lines returned nothing, so
 * both Share and Save were painted-on affordances.
 *
 * Share is the higher-leverage of the two in a WhatsApp-first audience, and it
 * needs no backend — so it is now real. The Save button is gone rather than
 * faked: apps/api has no wishlist endpoint and the schema has no wishlist
 * table, so a "Saved" toast would be a lie told to a signed-in user.
 *
 * The status line only ever appears after a rail actually succeeded. If the
 * browser has neither `navigator.share` nor a clipboard (an http:// origin, an
 * old in-app webview), nothing is claimed — silence beats a false confirmation.
 */

interface Props {
  pujaName: string;
  slug: string;
}

type Status = 'idle' | 'copied' | 'unavailable';

export default function PujaShareButton({ pujaName, slug }: Props) {
  const [status, setStatus] = useState<Status>('idle');

  async function handleShare() {
    const path = `/pujas/${slug}`;
    const url =
      typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}${path}`
        : `https://darshya.online${path}`;

    const nav = typeof navigator === 'undefined' ? undefined : navigator;

    if (nav && typeof nav.share === 'function') {
      try {
        await nav.share({ title: pujaName, text: `Book ${pujaName} on Darshya`, url });
        setStatus('idle');
        return;
      } catch {
        // User dismissed the sheet, or the browser refused. Fall through to the
        // clipboard rather than reporting a share that did not happen.
      }
    }

    if (nav?.clipboard && typeof nav.clipboard.writeText === 'function') {
      try {
        await nav.clipboard.writeText(url);
        setStatus('copied');
        return;
      } catch {
        setStatus('unavailable');
        return;
      }
    }

    setStatus('unavailable');
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleShare}
        className="flex min-h-[44px] items-center gap-1.5 px-3 text-sm text-white/80 transition-colors hover:text-white"
      >
        {status === 'copied' ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Share2 className="h-4 w-4" aria-hidden="true" />
        )}
        Share
      </button>
      {status === 'copied' && (
        <span role="status" className="text-xs text-white/80">
          Link copied
        </span>
      )}
      {status === 'unavailable' && (
        <span role="status" className="text-xs text-white/80">
          Copy the address bar to share
        </span>
      )}
    </div>
  );
}
