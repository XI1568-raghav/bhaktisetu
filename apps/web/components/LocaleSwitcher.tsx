'use client';

import { useState, useRef, useEffect, useTransition } from 'react';
import { useLocale } from 'next-intl';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { usePathname, useRouter } from '../i18n/navigation';
import { locales, localeLabels, type Locale } from '../i18n/config';

// Layer AF — globe-icon dropdown that switches the active locale.
// Mounted in the header. Routes via next-intl's locale-aware navigation
// so we preserve the current path (e.g. switching on `/temples` lands you on
// `/hi/temples`).
export function LocaleSwitcher() {
  const active = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function pick(next: Locale) {
    setIsOpen(false);
    if (next === active) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  const current = localeLabels[active];

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
        className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-surface-600 hover:bg-surface-100 hover:text-surface-800 transition-colors"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{current.native}</span>
        <ChevronDown
          className={`h-3 w-3 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-1 w-44 origin-top-right rounded-xl border border-surface-100 bg-white py-1 shadow-lg ring-1 ring-black/5"
        >
          {locales.map((code) => {
            const label = localeLabels[code];
            const selected = code === active;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(code)}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm transition-colors ${
                  selected
                    ? 'bg-saffron-50 text-saffron-700 font-semibold'
                    : 'text-surface-700 hover:bg-surface-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{label.native}</span>
                  {!selected && (
                    <span className="text-xs text-surface-400">({label.english})</span>
                  )}
                </span>
                {selected && <Check className="h-4 w-4 text-saffron-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LocaleSwitcher;
