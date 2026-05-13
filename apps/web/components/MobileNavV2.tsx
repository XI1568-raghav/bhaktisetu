'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Menu,
  X,
  Search,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  CATEGORY_TREE,
  type CategoryKey,
} from '../lib/category-tree';
import { useAuth } from '../lib/auth-context';

const ACCOUNT_LINKS_AUTHED = [
  { href: '/dashboard', label: 'My Dashboard' },
  { href: '/bookings', label: 'My Bookings' },
  { href: '/profile', label: 'Profile' },
];

const ACCOUNT_LINKS_GUEST = [
  { href: '/auth/login', label: 'Sign In' },
  { href: '/bookings', label: 'My Bookings' },
];

const HELP_LINKS = [
  { href: '/support', label: 'Support' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

/**
 * Mobile-only nav. Hamburger -> full-screen sheet with:
 *  - sticky header (logo + close + search input)
 *  - 5 category accordions (single-open, default = worship)
 *  - account section (auth-aware)
 *  - help section
 *  - sticky bottom Ask Pandit CTA
 *
 * Body scroll-lock + Escape-to-close mirrors MobileNav.tsx.
 * Renders the sheet via portal at document.body to escape the
 * fixed header's stacking context.
 */
export function MobileNavV2() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeKey, setActiveKey] = useState<CategoryKey>('worship');
  const [search, setSearch] = useState('');
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  const close = () => setOpen(false);

  const accountLinks = isAuthenticated
    ? ACCOUNT_LINKS_AUTHED
    : ACCOUNT_LINKS_GUEST;

  const onSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    close();
    // Best-effort: route to a search-style URL the existing site can handle.
    // /content?q= is the most reliable existing target; GlobalSearch handles
    // its own client-side query elsewhere.
    window.location.href = `/content?q=${encodeURIComponent(q)}`;
  };

  const sheet =
    mounted && (
      <>
        {open && (
          <div
            className="md:hidden fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
        )}
        <aside
          className={`md:hidden fixed inset-0 z-[101] bg-[#faf9f6] flex flex-col transition-transform duration-200 ease-out ${
            open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
          aria-hidden={!open}
          aria-label="Mobile navigation"
        >
          {/* Sticky top: logo + close + search */}
          <div className="sticky top-0 z-10 bg-[#faf9f6] border-b border-surface-200/60">
            <div className="flex items-center justify-between px-4 h-14">
              <Link
                href="/"
                onClick={close}
                className="text-[15px] font-semibold text-surface-800 tracking-tight"
              >
                Darsh<span className="text-saffron-600">ya</span>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={close}
                className="p-2 text-surface-500 hover:text-surface-800 hover:bg-surface-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onSearchSubmit} className="px-4 pb-3">
              <label htmlFor="mobile-nav-search" className="sr-only">
                Search Darshya
              </label>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400"
                  aria-hidden="true"
                />
                <input
                  id="mobile-nav-search"
                  type="search"
                  inputMode="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search temples, pujas, content…"
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron-300 focus:border-saffron-300"
                />
              </div>
            </form>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-28">
            {/* Category accordions */}
            <nav aria-label="Categories" className="space-y-1">
              {CATEGORY_TREE.map((category) => {
                const isOpenAcc = activeKey === category.key;
                const panelId = `mobile-acc-${category.key}`;
                return (
                  <div
                    key={category.key}
                    className="border-b border-surface-100 last:border-b-0"
                  >
                    <button
                      type="button"
                      aria-expanded={isOpenAcc}
                      aria-controls={panelId}
                      onClick={() => setActiveKey(category.key)}
                      className="w-full flex items-center justify-between gap-2 px-2 py-3 text-left min-h-[44px] rounded-md hover:bg-surface-100 transition-colors"
                    >
                      <span className="flex flex-col">
                        <span className="text-[15px] font-semibold text-surface-800">
                          {category.label}
                        </span>
                        <span className="text-xs text-surface-500">
                          {category.tagline}
                        </span>
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-surface-400 shrink-0 transition-transform ${
                          isOpenAcc ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                    {isOpenAcc && (
                      <ul
                        id={panelId}
                        className="pl-2 pb-3 space-y-0.5"
                      >
                        {category.items.map((item) => (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={close}
                              className="flex items-center justify-between gap-2 px-3 py-3 text-sm text-surface-700 hover:bg-saffron-50/60 rounded-lg min-h-[44px]"
                            >
                              <span className="flex items-center gap-2.5">
                                {item.icon && (
                                  <span aria-hidden="true" className="text-base leading-none">
                                    {item.icon}
                                  </span>
                                )}
                                <span className="font-medium">{item.label}</span>
                              </span>
                              <ChevronRight
                                className="w-4 h-4 text-surface-300 shrink-0"
                                aria-hidden="true"
                              />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Account */}
            <div className="mt-6">
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-surface-400">
                Account
              </p>
              <div className="space-y-0.5">
                {accountLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className="flex items-center justify-between gap-2 px-3 py-3 text-sm font-medium text-surface-700 hover:bg-surface-100 rounded-lg min-h-[44px]"
                  >
                    {link.label}
                    <ChevronRight
                      className="w-4 h-4 text-surface-300"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </div>

            {/* Help */}
            <div className="mt-6">
              <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-surface-400">
                Help
              </p>
              <div className="space-y-0.5">
                {HELP_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={close}
                    className="flex items-center justify-between gap-2 px-3 py-3 text-sm font-medium text-surface-700 hover:bg-surface-100 rounded-lg min-h-[44px]"
                  >
                    {link.label}
                    <ChevronRight
                      className="w-4 h-4 text-surface-300"
                      aria-hidden="true"
                    />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky bottom CTA */}
          <div className="sticky bottom-0 z-10 px-4 py-3 bg-[#faf9f6] border-t border-surface-200/60">
            <Link
              href="/ask-pandit"
              onClick={close}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-semibold text-white bg-saffron-600 hover:bg-saffron-700 rounded-lg transition-colors btn-press"
            >
              <Sparkles className="w-4 h-4" />
              Ask Pandit
            </Link>
          </div>
        </aside>
      </>
    );

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="md:hidden p-2 text-surface-500 hover:text-surface-800 hover:bg-surface-100 rounded-md transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {sheet && createPortal(sheet, document.body)}
    </>
  );
}

export default MobileNavV2;
