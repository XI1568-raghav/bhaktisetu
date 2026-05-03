'use client';

import { useEffect, useRef, useState } from 'react';
import { useIsPremium } from './useIsPremium';

// Minimal subset of AdSense globals we touch. Defining locally avoids a
// global.d.ts ambient declaration leaking into the rest of the app.
type AdsByGoogle = Array<Record<string, unknown>> & { loaded?: boolean };

declare global {
 interface Window {
  adsbygoogle?: AdsByGoogle;
 }
}

export type AdSlotFormat = 'horizontal' | 'vertical' | 'square' | 'in-feed';

interface AdSlotProps {
 // Env var suffix — e.g. 'DARSHAN_BANNER' reads NEXT_PUBLIC_ADSENSE_SLOT_DARSHAN_BANNER.
 slotId: string;
 format: AdSlotFormat;
 // Visible "Advertisement" caption (a11y + AdSense policy).
 label?: string;
 className?: string;
}

const FORMAT_STYLE: Record<AdSlotFormat, { display: string; minHeight: string }> = {
 horizontal: { display: 'block', minHeight: '90px' },
 vertical: { display: 'block', minHeight: '600px' },
 square: { display: 'block', minHeight: '250px' },
 'in-feed': { display: 'block', minHeight: '120px' },
};

const FORMAT_DATA_ATTR: Record<AdSlotFormat, string> = {
 horizontal: 'horizontal',
 vertical: 'vertical',
 square: 'rectangle',
 'in-feed': 'fluid',
};

export default function AdSlot({ slotId, format, label = 'Advertisement', className }: AdSlotProps) {
 const insRef = useRef<HTMLModElement | null>(null);
 const pushedRef = useRef(false);
 const isPremium = useIsPremium();
 // Ad quarantine: any ancestor with data-ad-quarantine="true" suppresses ads
 // on that subtree. Used for sensitive verticals (e.g. antim sanskar) where
 // showing ads next to the content would be disrespectful regardless of
 // AdSense policy compliance.
 const [quarantined, setQuarantined] = useState(false);

 const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
 // Slot id is read at build time via process.env so Next inlines public vars.
 // We look up by convention: NEXT_PUBLIC_ADSENSE_SLOT_<slotId>.
 const slotEnvKey = `NEXT_PUBLIC_ADSENSE_SLOT_${slotId}` as const;
 const slot = (process.env as Record<string, string | undefined>)[slotEnvKey];

 useEffect(() => {
  if (typeof document === 'undefined') return;
  const el = insRef.current?.closest('[data-ad-quarantine="true"]');
  if (el) setQuarantined(true);
 }, []);

 useEffect(() => {
  if (isPremium) return;
  if (quarantined) return;
  if (!client || !slot) return;
  if (pushedRef.current) return;
  if (typeof window === 'undefined') return;
  // adsbygoogle.push triggers the actual ad fetch + render once the loader
  // script has dropped onto the page (see AdSenseScript). Pushing before the
  // loader arrives is harmless: the array is replayed when adsbygoogle.js boots.
  try {
   window.adsbygoogle = window.adsbygoogle ?? [];
   window.adsbygoogle.push({});
   pushedRef.current = true;
  } catch {
   // Network/CSP failures must never crash a page render.
  }
 }, [isPremium, quarantined, client, slot]);

 if (isPremium) return null;
 if (quarantined) return null;
 if (!client || !slot) return null;

 const style = FORMAT_STYLE[format];
 const adFormat = FORMAT_DATA_ATTR[format];

 return (
  <div
   className={className ?? 'w-full my-6'}
   role="complementary"
   aria-label={label}
   data-ad-slot={slotId}
  >
   <p className="text-[10px] uppercase tracking-widest text-surface-400 mb-1">{label}</p>
   <ins
    ref={insRef}
    className="adsbygoogle"
    style={style}
    data-ad-client={client}
    data-ad-slot={slot}
    data-ad-format={adFormat}
    data-full-width-responsive="true"
   />
  </div>
 );
}
