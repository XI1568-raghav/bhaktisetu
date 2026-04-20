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
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/auth-context';

const sidebarLinks = [
  { href: '/priest', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/priest/bookings', label: 'Bookings', icon: Calendar },
  { href: '/priest/services', label: 'My Services', icon: Flame },
  { href: '/priest/reviews', label: 'Reviews', icon: Star },
  { href: '/priest/payouts', label: 'Payouts', icon: Wallet },
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
    <div className="min-h-screen bg-surface-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 bg-white border-r border-surface-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-100 bg-gradient-to-r from-saffron-600 to-saffron-500">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-sm">Priest Portal</span>
            <p className="text-saffron-100 text-xs">Poojly</p>
          </div>
          <button
            className="lg:hidden ml-auto text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Priest info */}
        <div className="px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-saffron-100 rounded-full flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-saffron-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-surface-800 truncate">
                {user?.fullName || 'Priest'}
              </p>
              <p className="text-xs text-surface-500 truncate">{user?.phone}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-saffron-50 text-saffron-700 border border-saffron-200'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-saffron-600' : 'text-surface-400'}`} />
                {link.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto text-saffron-400" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-surface-100">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-500 hover:bg-surface-50 hover:text-surface-600 transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            Back to Main Site
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors mt-1"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-surface-200 flex items-center px-4 lg:px-6 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 -ml-2 text-surface-500 hover:text-surface-600"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-2 lg:ml-0">
            <h1 className="text-sm font-semibold text-surface-800 lg:hidden">Priest Portal</h1>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function PriestLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <PriestPortalLayout>{children}</PriestPortalLayout>
    </AuthGuard>
  );
}
