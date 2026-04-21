'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  IndianRupee,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Shield,
  LifeBuoy,
} from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { Logo } from '../../components/Logo';

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/admin/support', label: 'Support Tickets', icon: LifeBuoy },
  { href: '/admin/revenue', label: 'Revenue', icon: IndianRupee },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
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
        className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 bg-[#2a2520] flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
          <Logo size={28} color="#D4A76A" />
          <div>
            <span className="text-white font-bold text-sm tracking-tight">
              Pooj<span className="text-[#D4A76A]">ly</span>
            </span>
            <p className="text-[#7a756e] text-xs">Admin Portal</p>
          </div>
          <button
            className="lg:hidden ml-auto text-white/60 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
                    ? 'bg-saffron-600/15 text-[#D4A76A]'
                    : 'text-[#b5b0a8] hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-[#D4A76A]' : 'text-[#7a756e]'}`} />
                {link.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto text-[#D4A76A]/60" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#7a756e] hover:bg-white/5 hover:text-white transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            Back to Site
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors mt-1"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center px-4 lg:px-6 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 -ml-2 text-surface-500 hover:text-surface-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-2 lg:ml-0 flex items-center gap-2">
            <Shield className="w-4 h-4 text-saffron-600 hidden sm:block" />
            <span className="text-sm font-medium text-surface-800 hidden sm:block">Admin Panel</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-surface-500 hidden sm:block">{user?.fullName || 'Admin'}</span>
            <div className="w-8 h-8 bg-saffron-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-saffron-700">
                {(user?.fullName || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
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

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || user?.role !== 'admin') {
      window.location.href = '/auth/login?redirect=/admin';
      return;
    }

    setChecked(true);
  }, [isLoading, isAuthenticated, user?.role]);

  if (isLoading || !checked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-saffron-200 border-t-saffron-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500 text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}
