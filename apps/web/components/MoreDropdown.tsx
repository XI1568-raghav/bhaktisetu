'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  Mountain,
  Calendar,
  Heart,
  Moon,
  Leaf,
} from 'lucide-react';

const moreLinks = [
  { href: '/yatra', label: 'Yatra', icon: Mountain },
  { href: '/panchang', label: 'Panchang', icon: Calendar },
  { href: '/gaushala', label: 'Gau Seva', icon: Heart },
  { href: '/donations', label: 'Donate', icon: Heart },
  { href: '/astrology', label: 'Astrology', icon: Moon },
  { href: '/wellness', label: 'Wellness', icon: Leaf },
];

/**
 * Desktop "More" dropdown with state-based open/close so it works on
 * touch devices (where :hover doesn't fire). Closes on outside click,
 * Escape, or after navigation.
 */
export function MoreDropdown() {
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
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-surface-500 hover:text-surface-800 hover:bg-surface-100 rounded-md transition-colors whitespace-nowrap"
      >
        More
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 mt-1.5 w-48 bg-white rounded-lg border border-surface-200/60 shadow-lg shadow-surface-900/5 py-1.5 z-50"
        >
          {moreLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-50 transition-colors"
              >
                <Icon className="w-4 h-4 text-surface-400" />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
