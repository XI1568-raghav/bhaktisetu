'use client';

import { useState } from 'react';
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
  Wallet,
  Sparkles,
  Target,
  Send,
  ListChecks,
  Star,
  Bot,
  Banknote,
  RotateCcw,
  BadgeCheck,
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/auth-context';

const sidebarLinks = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/approvals', label: 'Approvals', icon: ClipboardCheck },
  { href: '/admin/leads', label: 'Leads', icon: Target },
  { href: '/admin/outreach', label: 'Outreach', icon: Send },
  { href: '/admin/waitlist', label: 'Waitlist', icon: ListChecks },
  { href: '/admin/support', label: 'Support Tickets', icon: LifeBuoy },
  { href: '/admin/ratings', label: 'Ratings', icon: Star },
  { href: '/admin/commissions', label: 'Commissions', icon: Wallet },
  // AO-03: the payout, refund and KYC rails were all live on the API with no
  // way to reach them from the sidebar. A screen nobody can navigate to is the
  // same defect as a screen that 404s.
  { href: '/admin/payouts', label: 'Payouts', icon: Banknote },
  { href: '/admin/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/admin/kyc', label: 'Provider KYC', icon: BadgeCheck },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: Sparkles },
  { href: '/admin/revenue', label: 'Revenue', icon: IndianRupee },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/metrics', label: 'Metrics', icon: BarChart3 },
  { href: '/admin/agents', label: 'Agents', icon: Bot },
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
            <Shield className="w-4 h-4 text-saffron-300" />
          </div>
          <div>
            <span className="text-white font-bold text-sm tracking-tight">
              Darsh<span className="text-saffron-400">ya</span>
            </span>
            <p className="text-white/50 text-xs">Admin Portal</p>
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
            <div className="w-10 h-10 rounded-full bg-saffron-500/20 flex items-center justify-center text-saffron-300 font-bold text-sm">
              {(user?.fullName || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.fullName || 'Admin'}</p>
              <p className="text-xs text-white/40">Platform Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="darshya-admin-scroll flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
        <style dangerouslySetInnerHTML={{ __html: `
          .darshya-admin-scroll::-webkit-scrollbar { width: 6px; }
          .darshya-admin-scroll::-webkit-scrollbar-track { background: transparent; }
          .darshya-admin-scroll::-webkit-scrollbar-thumb { background: rgba(184,115,51,0.4); border-radius: 3px; }
          .darshya-admin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(184,115,51,0.65); }
          .darshya-admin-scroll { scrollbar-width: thin; scrollbar-color: rgba(184,115,51,0.4) transparent; }
        ` }} />

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors"
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

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-surface-200 flex items-center px-4 lg:px-6 sticky top-0 z-30">
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

        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AuthGuard>
  );
}
