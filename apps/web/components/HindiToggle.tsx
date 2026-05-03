'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';

/**
 * Quick EN ↔ HI language toggle (TD14).
 *
 * Strategy:
 * 1. Click Globe icon → flip cookie `darshya_lang` between 'en' and 'hi'.
 * 2. Reload page so server can pick up cookie + render localized strings.
 * 3. next-intl middleware handles `/hi/*` routes when full conversion lands;
 *    until then this toggle just flips the cookie + drives client-side string
 *    swaps via `useLang()` hook on pages that opt in.
 *
 * Devanagari font (Noto Sans Devanagari) already loaded via apps/web/app/layout.tsx.
 * Toggle preserves URL path; only adjusts /hi prefix when locale-aware page exists.
 */

const COOKIE_NAME = 'darshya_lang';
const SUPPORTED = ['en', 'hi'] as const;
type Lang = typeof SUPPORTED[number];

function readLang(): Lang {
  if (typeof document === 'undefined') return 'en';
  const m = document.cookie.match(/(?:^|;\s*)darshya_lang=([a-z]{2})/);
  const v = m?.[1];
  return v === 'hi' ? 'hi' : 'en';
}

function writeLang(lang: Lang) {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE_NAME}=${lang}; max-age=${oneYear}; path=/; samesite=lax`;
}

export default function HindiToggle({ compact = false }: { compact?: boolean }) {
  const [lang, setLang] = useState<Lang>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLang(readLang());
    setMounted(true);
  }, []);

  function toggle() {
    const next: Lang = lang === 'hi' ? 'en' : 'hi';
    writeLang(next);
    setLang(next);
    // Hard reload so SSR + middleware respect cookie. Preserves URL path.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      // If full /hi route exists for this path, prefer that.
      // Else just reload current page.
      window.location.href = url.toString();
    }
  }

  if (!mounted) {
    // Avoid hydration mismatch — render the EN default until client picks up cookie.
    return (
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border border-[var(--color-border)] hover:border-saffron-300 hover:text-saffron-700 transition-colors"
        aria-label="Switch language"
      >
        <Globe className="w-3.5 h-3.5" />
        {!compact && 'EN'}
      </button>
    );
  }

  const label = lang === 'hi' ? 'हिं' : 'EN';
  const next = lang === 'hi' ? 'EN' : 'हिंदी';
  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${next}`}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border border-[var(--color-border)] hover:border-saffron-300 hover:text-saffron-700 transition-colors"
      aria-label={`Switch to ${next}`}
      style={{ fontFamily: lang === 'hi' ? 'var(--font-devanagari, var(--font-display))' : undefined }}
    >
      <Globe className="w-3.5 h-3.5" />
      {!compact && label}
    </button>
  );
}
