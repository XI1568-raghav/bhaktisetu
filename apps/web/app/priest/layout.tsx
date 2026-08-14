'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  UserCircle,
  Flame,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Star,
  MessageSquare,
  Sparkles,
  BellRing,
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/auth-context';

const sidebarLinks = [
  { href: '/priest', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/priest/messages', label: 'Messages', icon: MessageSquare },
  // PJ-04: the dispatch engine's offers had no entry point in the portal.
  // Placed above Bookings because an offer is time-boxed and a booking is not.
  { href: '/priest/offers', label: 'Offers', icon: BellRing },
  { href: '/priest/bookings', label: 'Bookings', icon: Calendar },
  { href: '/priest/services', label: 'My Services', icon: Flame },
  { href: '/priest/reviews', label: 'Reviews', icon: Star },
  { href: '/priest/payouts', label: 'Payouts', icon: Wallet },
  { href: '/priest/subscription', label: 'Subscription', icon: Sparkles },
  { href: '/priest/profile', label: 'Profile', icon: UserCircle },
];

function PriestPortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/priest') return pathname === '/priest';
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-[100dvh] bg-surface-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: '#2a2520' }}
      >
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
          <div className="w-8 h-8 rounded-full bg-saffron-500/20 flex items-center justify-center">
            <Flame className="w-4 h-4 text-saffron-300" />
          </div>
          <div>
            <span className="text-white font-bold text-sm">Priest Portal</span>
            <p className="text-white/50 text-xs">Darshya</p>
          </div>
          <button
            className="lg:hidden ml-auto text-white/60"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-saffron-500/20 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-saffron-300" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {user?.fullName || 'Priest'}
              </p>
              <p className="text-xs text-white/40 truncate">{user?.phone || 'Pandit'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-saffron-500/20 text-saffron-300 border border-saffron-500/30'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-saffron-400' : 'text-white/40'}`} />
                {link.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto text-saffron-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            Back to Main Site
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors mt-1"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-surface-200 flex items-center px-4 lg:px-6 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 -ml-2 text-surface-500 hover:text-surface-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-2 lg:ml-0">
            {/* DU-05/DU-08: this was a second level-1 heading. Below lg BOTH it and the
                page's own h1 were visible, so /priest measured h1_in_dom=2 and
                its level sequence opened 1,1,3. It is chrome, not the page
                title - a labelled div carries the same information to AT
                without competing for the document heading. */}
            <div
              role="doc-subtitle"
              aria-label="Priest Portal"
              className="text-sm font-semibold text-surface-800 lg:hidden"
            >
              Priest Portal
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function PriestLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['priest']}>
      <PriestPortalLayout>{children}</PriestPortalLayout>
    </AuthGuard>
  );
}
