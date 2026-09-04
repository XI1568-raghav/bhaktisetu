'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { buttonClass } from '../components/ui/button-recipe';
import {
  Menu,
  X,
  Home,
  Video,
  Flame,
  Music,
  ShoppingBag,
  Mountain,
  Calendar,
  Heart,
  Moon,
  Leaf,
  Sparkles,
  MessageCircleQuestion,
  ChevronRight,
} from 'lucide-react';

const primaryLinks = [
  { href: '/temples', label: 'Temples', icon: Home },
  { href: '/darshan', label: 'Darshan', icon: Video },
  { href: '/pujas', label: 'Pujas', icon: Flame },
  { href: '/content', label: 'Content', icon: Music },
  { href: '/store', label: 'Store', icon: ShoppingBag },
];

const moreLinks = [
  { href: '/yatra', label: 'Yatra', icon: Mountain },
  { href: '/panchang', label: 'Panchang', icon: Calendar },
  { href: '/gaushala', label: 'Gau Seva', icon: Heart },
  { href: '/donations', label: 'Donate', icon: Heart },
  { href: '/astrology', label: 'Astrology', icon: Moon },
  { href: '/wellness', label: 'Wellness', icon: Leaf },
];

const accountLinks = [
  { href: '/dashboard', label: 'My Dashboard' },
  { href: '/bookings', label: 'My Bookings' },
  { href: '/profile', label: 'Profile' },
  { href: '/store/cart', label: 'Cart' },
  { href: '/auth/login', label: 'Sign In' },
];

const supportLinks = [
  { href: '/support', label: 'Support' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/credits', label: 'Image Credits' },
];

/**
 * Mobile-only navigation drawer. Slides in from the right and contains
 * every link in the desktop nav (primary + More dropdown + account + support),
 * plus the highlighted "Ask Pandit" CTA at the top.
 *
 * Triggered by a Menu button rendered alongside; the button is hidden at md+
 * because the desktop nav covers it.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open]);

  // Render the drawer + backdrop as a portal at document.body root.
  // Without this, the drawer is a child of <header> which has z-50 and a
  // backdrop-blur — that creates a stacking context the drawer can't
  // escape, so it renders BEHIND main content on some browsers.
  const drawer =
    mounted && (
      <>
        {/* Backdrop — z-[100] to clear the LiveChatWidget FAB (z-[60]),
            any in-page sticky elements, and the fixed header (z-50). */}
        {open && (
          <div
            className="md:hidden fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <aside
          className={`md:hidden fixed top-0 right-0 bottom-0 w-[86%] max-w-[360px] z-[101] bg-[#faf9f6] shadow-2xl transition-transform duration-200 ease-out flex flex-col ${
            open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
          }`}
          aria-hidden={!open}
        >
        <div className="flex items-center justify-between px-4 h-14 border-b border-surface-200/60 shrink-0">
          <span className="text-[15px] font-semibold text-surface-800 tracking-tight">
            Menu
          </span>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="p-2 text-surface-500 hover:text-surface-800 hover:bg-surface-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-6">
          {/* Highlighted CTA */}
          <Link
            href="/ask-pandit"
            onClick={() => setOpen(false)}
            className={buttonClass('primary', 'md', 'w-full btn-press')}
          >
            <MessageCircleQuestion className="w-4 h-4" />
            Ask Pandit
          </Link>

          {/* Primary */}
          <NavSection label="Explore">
            {primaryLinks.map((link) => (
              <DrawerLink
                key={link.href}
                href={link.href}
                label={link.label}
                Icon={link.icon}
                onClose={() => setOpen(false)}
              />
            ))}
          </NavSection>

          {/* More */}
          <NavSection label="More">
            {moreLinks.map((link) => (
              <DrawerLink
                key={link.href}
                href={link.href}
                label={link.label}
                Icon={link.icon}
                onClose={() => setOpen(false)}
              />
            ))}
          </NavSection>

          {/* Account */}
          <NavSection label="Account">
            {accountLinks.map((link) => (
              <DrawerLink
                key={link.href}
                href={link.href}
                label={link.label}
                onClose={() => setOpen(false)}
              />
            ))}
          </NavSection>

          {/* Support */}
          <NavSection label="Help">
            {supportLinks.map((link) => (
              <DrawerLink
                key={link.href}
                href={link.href}
                label={link.label}
                onClose={() => setOpen(false)}
              />
            ))}
          </NavSection>
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
      {drawer && createPortal(drawer, document.body)}
    </>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-1 mb-2 text-xs font-semibold uppercase tracking-widest text-surface-400">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function DrawerLink({
  href,
  label,
  Icon,
  onClose,
}: {
  href: string;
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
  onClose: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className="flex items-center justify-between gap-2.5 px-3 py-3 text-sm font-medium text-surface-700 hover:bg-surface-100 rounded-lg transition-colors min-h-[44px]"
    >
      <span className="flex items-center gap-2.5">
        {Icon && <Icon className="w-4 h-4 text-surface-400" />}
        {label}
      </span>
      <ChevronRight className="w-4 h-4 text-surface-300" />
    </Link>
  );
}
