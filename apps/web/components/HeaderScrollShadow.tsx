'use client';

import { useEffect, useState } from 'react';

/**
 * Apple-style scroll shadow on header. Mounts client-side, adds 'scrolled'
 * class to <header> when window.scrollY > 8px. CSS rules then fade in border
 * + saturation per Josh Comeau backdrop-filter recipe.
 *
 * Why a separate client component: layout.tsx is a server component and can't
 * use useState/useEffect. Mount this as a sibling, manipulate <header> via DOM.
 */
export default function HeaderScrollShadow(): null {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const header = document.querySelector('header[data-scroll-shadow]');
    if (!header) return;
    const onScroll = (): void => {
      const next = window.scrollY > 8;
      if (next !== scrolled) setScrolled(next);
      if (next) header.classList.add('is-scrolled');
      else header.classList.remove('is-scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrolled]);

  return null;
}
