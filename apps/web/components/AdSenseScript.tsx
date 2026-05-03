'use client';

import Script from 'next/script';

// Loads the Google AdSense loader script. Mounts only when
// NEXT_PUBLIC_ADSENSE_CLIENT is configured — silent no-op otherwise.
// Premium users are gated at the per-slot level (see AdSlot).

export default function AdSenseScript() {
 const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
 if (!client) return null;

 return (
  <Script
   id="google-adsense-loader"
   async
   strategy="afterInteractive"
   src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
    client,
   )}`}
   crossOrigin="anonymous"
  />
 );
}
