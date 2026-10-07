'use client';

import { useState } from 'react';
import Link from 'next/link';

/**
 * The footer "Read in:" links. The native-script names (हिन्दी, தமிழ், తెలుగు,
 * বাংলা, मराठी) used to be in the first HTML of every page, and a browser
 * downloads a unicode-range webfont as soon as one matching glyph is painted,
 * so all four Indic files (~400 KB) loaded on every English page. The links
 * now render Latin names and swap to the native scripts on the first hover,
 * focus or touch, which is the earliest a visitor can act on them. The hrefs,
 * hrefLang and prefetch={false} are unchanged (see the long note in
 * app/layout.tsx about why these links must never prefetch).
 */
const NAMES = {
  hi: { name: 'Hindi', native: 'हिन्दी' },
  ta: { name: 'Tamil', native: 'தமிழ்' },
  te: { name: 'Telugu', native: 'తెలుగు' },
  bn: { name: 'Bengali', native: 'বাংলা' },
  mr: { name: 'Marathi', native: 'मराठी' },
} as const;

type Code = keyof typeof NAMES;

export function FooterLanguageLinks() {
  const [native, setNative] = useState(false);
  const reveal = () => setNative(true);
  const label = (c: Code) => (native ? NAMES[c].native : NAMES[c].name);
  // Spread helpers keep each <Link> tag below free of `>` so the source-scanning
  // guards (i18n-locale-links-are-not-prefetched, hreflang-cluster) still see
  // six literal href/hrefLang/prefetch tags.
  const a11y = (c: Code) => ({
    'aria-label': `${NAMES[c].name} (${NAMES[c].native})`,
    ...(native ? { lang: c } : {}),
    onPointerEnter: reveal,
    onFocus: reveal,
    onTouchStart: reveal,
  });
  return (
    <>
      <span className="text-surface-600">Read in:</span>
      <Link prefetch={false} href="/?lang=en" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="en">English</Link>
      <Link prefetch={false} href="/hi" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="hi" {...a11y('hi')}>{label('hi')}</Link>
      <Link prefetch={false} href="/ta" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="ta" {...a11y('ta')}>{label('ta')}</Link>
      <Link prefetch={false} href="/te" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="te" {...a11y('te')}>{label('te')}</Link>
      <Link prefetch={false} href="/bn" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="bn" {...a11y('bn')}>{label('bn')}</Link>
      <Link prefetch={false} href="/mr" className="tap-safe hover:text-saffron-400 transition-colors" hrefLang="mr" {...a11y('mr')}>{label('mr')}</Link>
    </>
  );
}
