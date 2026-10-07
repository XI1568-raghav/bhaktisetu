'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Menu,
  X,
  Search,
  Sparkles,
  MessageCircleQuestion,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  CATEGORY_TREE,
  type CategoryKey,
} from '../lib/category-tree';
import { useAuth } from '../lib/auth-context';
import { buttonClass } from '../components/ui/button-recipe';

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

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
 *
 * The sheet is a real modal dialog (A11Y-04): while it is open the rest of the
 * document is `inert`, focus is moved to the Close button, Tab is trapped, and
 * closing restores focus to the hamburger. While it is CLOSED the sheet itself
 * is `inert` — it stays mounted and merely translated off-screen, so without
 * that its ~22 links remained tab stops inside an `aria-hidden` subtree.
 */
export function MobileNavV2() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeKey, setActiveKey] = useState<CategoryKey>('worship');
  const [search, setSearch] = useState('');
  const { isAuthenticated } = useAuth();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);
  const portalRootRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

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

  // Everything outside the sheet is inert while the sheet is open, so the
  // background controls behind the opaque overlay hold no tab stops and are
  // not announced. Declared before the focus effect so focus lands last.
  useEffect(() => {
    if (!open) return;
    const root = portalRootRef.current;
    const marked: HTMLElement[] = [];
    for (const el of Array.from(document.body.children)) {
      if (!(el instanceof HTMLElement) || el === root) continue;
      if (el.hasAttribute('inert')) continue;
      el.setAttribute('inert', '');
      marked.push(el);
    }
    return () => {
      for (const el of marked) el.removeAttribute('inert');
    };
  }, [open]);

  // Move focus into the sheet on open; restore it to the hamburger on close.
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      closeButtonRef.current?.focus();
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  const close = () => setOpen(false);

  // Tab trap. `inert` already keeps the background out of the tab order in
  // supporting browsers; this makes the cycle explicit and wraps at the ends.
  const onSheetKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'Tab') return;
    const root = asideRef.current;
    if (!root) return;
    const items = Array.from(
      root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const inside = !!active && root.contains(active);
    // `items.length` is guarded above, but noUncheckedIndexedAccess still widens
    // an index read to `| undefined`, so these stay optional-chained.
    if (e.shiftKey && (!inside || active === first)) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && (!inside || active === last)) {
      e.preventDefault();
      first?.focus();
    }
  }, []);

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
      <div ref={portalRootRef}>
        {open && (
          <div
            className="lg:hidden fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />
        )}
        <aside
          ref={asideRef}
          className={`lg:hidden fixed inset-0 z-[101] bg-[#faf9f6] flex flex-col transition-transform duration-200 ease-out ${
            open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
          role="dialog"
          aria-modal="true"
          aria-hidden={!open}
          inert={!open}
          aria-label="Mobile navigation"
          onKeyDown={onSheetKeyDown}
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
                ref={closeButtonRef}
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
                      // A11Y-14: the panel below is only rendered while this
                      // accordion is the open one, so pointing aria-controls
                      // at its id unconditionally left four dangling IDREFs on
                      // every page of the site.
                      aria-controls={isOpenAcc ? panelId : undefined}
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
                              <span className="font-medium">{item.label}</span>
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
              <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-widest text-surface-400">
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
              <p className="px-2 mb-2 text-xs font-semibold uppercase tracking-widest text-surface-400">
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
              prefetch={false}
              onClick={close}
              className={buttonClass('primary', 'md', 'w-full btn-press')}
            >
              <MessageCircleQuestion className="w-4 h-4" />
              Ask Pandit
            </Link>
          </div>
        </aside>
      </div>
    );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        // HN-12: measured 36x36 at 390px wide. The hamburger is the entry to
        // the whole taxonomy on a phone and was the smallest target in the bar.
        className="lg:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-surface-500 hover:text-surface-800 hover:bg-surface-100 rounded-md transition-colors"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {sheet && createPortal(sheet, document.body)}
    </>
  );
}

export default MobileNavV2;
