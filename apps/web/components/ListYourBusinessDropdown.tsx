'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Briefcase, ChevronDown } from 'lucide-react';

const businessLinks = [
  { href: '/list-temple', label: 'List your temple' },
  { href: '/become-priest', label: 'Become a pandit' },
  { href: '/become-astrologer', label: 'Become an astrologer' },
  { href: '/become-wellness', label: 'Teach yoga & meditation' },
  { href: '/list-gaushala', label: 'List your gaushala' },
];

export function ListYourBusinessDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        /*
         * HN-06: the header reveals this from lg (1024px) now, where the full
         * phrase does not fit next to the five category triggers. The short
         * form is what a laptop sees; aria-label keeps the announced name
         * identical at every width so the control does not rename itself
         * across breakpoints for a screen-reader user.
         */
        aria-label="List your business"
        title="List your business"
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-surface-500 hover:text-surface-800 hover:bg-surface-100 rounded-md transition-colors whitespace-nowrap"
      >
        <Briefcase className="w-3.5 h-3.5" />
        {/* Both label variants are REQUIRED, not decorative: HN-06 is the
            finding that a laptop had no discoverable route to listing, and
            __tests__/hn06-list-business-breakpoint.test.tsx pins the short form
            below 2xl and the full form at 2xl.
            An earlier pass here made this icon-only to reclaim ~105px for the
            category row. That fixed the geometry by giving up the very thing
            HN-06 asked for. The space is taken from GlobalSearch instead — its
            240px field now appears at 2xl rather than xl — because a search
            field collapsing to an icon loses nothing a devotee needs, while an
            unlabelled briefcase does. */}
        <span className="inline 2xl:hidden">For partners</span>
        <span className="hidden 2xl:inline">List your business</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full right-0 mt-1.5 w-60 bg-white rounded-lg border border-surface-200/60 shadow-lg shadow-surface-900/5 py-1.5 z-50"
        >
          {businessLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-50 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
