'use client';

import { useEffect, useState } from 'react';
import { Heart, Share2 } from 'lucide-react';

const FAVORITES_KEY = 'poojly_favorite_temples';

function readFavorites(): string[] {
 if (typeof window === 'undefined') return [];
 try {
  const raw = window.localStorage.getItem(FAVORITES_KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : [];
 } catch {
  return [];
 }
}

function writeFavorites(slugs: string[]) {
 try {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(slugs));
 } catch {
  /* quota or disabled — silently no-op */
 }
}

export default function TempleHeartShareButtons({
 slug,
 templeName,
}: {
 slug: string;
 templeName: string;
}) {
 const [favorited, setFavorited] = useState(false);
 const [toast, setToast] = useState<string | null>(null);

 useEffect(() => {
  setFavorited(readFavorites().includes(slug));
 }, [slug]);

 useEffect(() => {
  if (!toast) return;
  const t = setTimeout(() => setToast(null), 3000);
  return () => clearTimeout(t);
 }, [toast]);

 function toggleFavorite() {
  const current = readFavorites();
  const next = current.includes(slug)
   ? current.filter((s) => s !== slug)
   : [...current, slug];
  writeFavorites(next);
  const isFav = next.includes(slug);
  setFavorited(isFav);
  setToast(isFav ? 'Saved to favourites' : 'Removed from favourites');
 }

 async function share() {
  const shareUrl =
   typeof window !== 'undefined' ? window.location.href : `https://darshya.online/temples/${slug}`;
  const data = {
   title: templeName,
   text: `Darshan of ${templeName} on Darshya`,
   url: shareUrl,
  };
  try {
   if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    await navigator.share(data);
    return;
   }
  } catch {
   // user cancelled or share failed — fall through to clipboard
  }
  try {
   await navigator.clipboard.writeText(shareUrl);
   setToast('Link copied to clipboard');
  } catch {
   setToast('Could not copy link');
  }
 }

 return (
  <>
   <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
    <button
     type="button"
     onClick={toggleFavorite}
     aria-pressed={favorited}
     aria-label={favorited ? 'Remove from favourites' : 'Save to favourites'}
     className="rounded-lg bg-white/20 p-2.5 backdrop-blur-md transition-colors hover:bg-white/30"
    >
     <Heart
      className={`h-5 w-5 text-white ${favorited ? 'fill-white' : ''}`}
     />
    </button>
    <button
     type="button"
     onClick={share}
     aria-label="Share temple"
     className="rounded-lg bg-white/20 p-2.5 backdrop-blur-md transition-colors hover:bg-white/30"
    >
     <Share2 className="h-5 w-5 text-white" />
    </button>
   </div>

   {toast && (
    <div
     role="status"
     aria-live="polite"
     className="pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90vw] rounded-full bg-surface-800/95 px-4 py-2 text-sm font-medium text-white shadow-warm-md"
    >
     {toast}
    </div>
   )}
  </>
 );
}
