'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home as HomeIcon,
  Video,
  Flame,
  BookOpen,
  User,
} from 'lucide-react';

type Tab = {
  href: string;
  label: string;
  icon: typeof HomeIcon;
  /** Mark as primary action — slightly larger + saffron fill. */
  primary?: boolean;
  /** Active when pathname starts with one of these prefixes. */
  prefixes: string[];
};

const TABS: Tab[] = [
  { href: '/', label: 'Home', icon: HomeIcon, prefixes: ['/'] },
  { href: '/darshan', label: 'Darshan', icon: Video, prefixes: ['/darshan'] },
  { href: '/pujas', label: 'Book', icon: Flame, primary: true, prefixes: ['/pujas', '/checkout', '/booking'] },
  { href: '/discover', label: 'Library', icon: BookOpen, prefixes: ['/discover', '/ved', '/upanishads', '/puranas', '/bhakti-saint', '/deity', '/festival', '/calendar', '/aarti', '/chalisa', '/chants', '/mantra', '/shlokas', '/sankalp', '/bhagavad-gita', '/ramayana', '/mahabharata', '/sanskrit', '/hindu-philosophies', '/hindu-symbols', '/devi/mahavidyas', '/devi/navadurga', '/dashavatar', '/sapta-rishis', '/aditya', '/chakras', '/vedic-yajnas', '/sacred-rivers', '/sacred-trees', '/sacred-mountains', '/rudraksha', '/tithi', '/nakshatra', '/ekadashi', '/vrat', '/muhurat'] },
  { href: '/profile', label: 'Profile', icon: User, prefixes: ['/profile', '/dashboard', '/bookings', '/auth'] },
];

function isActive(pathname: string, prefixes: string[], href: string): boolean {
  if (href === '/') return pathname === '/';
  return prefixes.some((p) => p !== '/' && (pathname === p || pathname.startsWith(`${p}/`)));
}

/**
 * Fixed 5-tab bottom bar for mobile (md:hidden).
 * - Home / Darshan / Book (primary, saffron, centered) / Library / Profile
 * - Active tab = saffron icon + label
 * - Safe-area aware via env(safe-area-inset-bottom)
 * - Hidden on auth flow pages where it competes with form CTAs.
 */
export function MobileBottomTabs() {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/auth/') || pathname.startsWith('/checkout/')) return null;

  return (
    <nav
      aria-label="Bottom tab navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-surface-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5 items-stretch h-14">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(pathname, tab.prefixes, tab.href);
          if (tab.primary) {
            return (
              <li key={tab.href} className="flex items-start justify-center -mt-4">
                <Link
                  href={tab.href}
                  aria-label={tab.label}
                  className="flex flex-col items-center gap-0.5"
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-full bg-saffron-600 text-white shadow-lg shadow-saffron-600/30 ring-4 ring-white">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="text-[10px] font-semibold text-saffron-700">
                    {tab.label}
                  </span>
                </Link>
              </li>
            );
          }
          return (
            <li key={tab.href} className="flex items-center justify-center">
              <Link
                href={tab.href}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 w-full h-full ${
                  active ? 'text-saffron-700' : 'text-surface-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-saffron-700' : 'text-surface-500'}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default MobileBottomTabs;
