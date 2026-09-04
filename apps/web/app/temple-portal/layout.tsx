'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
 LayoutDashboard,
 Video,
 Flame,
 Heart,
 UserCircle,
 Wallet,
 Sparkles,
 Menu,
 X,
 LogOut,
 ChevronRight,
 MessageSquare,
 CalendarDays,
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/auth-context';

const sidebarLinks = [
 { href: '/temple-portal', label: 'Dashboard', icon: LayoutDashboard },
 { href: '/temple-portal/messages', label: 'Messages', icon: MessageSquare },
 { href: '/temple-portal/darshan', label: 'Live Darshan', icon: Video },
 { href: '/temple-portal/pujas', label: 'Pujas', icon: Flame },
 { href: '/temple-portal/bookings', label: 'Bookings', icon: CalendarDays },
 { href: '/temple-portal/donations', label: 'Donations', icon: Heart },
 { href: '/temple-portal/payouts', label: 'Payouts', icon: Wallet },
 { href: '/temple-portal/subscription', label: 'Subscription', icon: Sparkles },
];

function TemplePortalLayout({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();
 const { user } = useAuth();
 const [sidebarOpen, setSidebarOpen] = useState(false);

 const isActive = (href: string) => {
 if (href === '/temple-portal') return pathname === '/temple-portal';
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
 <div className="w-8 h-8 bg-saffron-500/20 rounded-full flex items-center justify-center">
 <Flame className="w-4 h-4 text-saffron-300" />
 </div>
 <div>
 <span className="text-white font-bold text-sm">Temple Portal</span>
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
 <div className="w-10 h-10 bg-saffron-500/20 rounded-full flex items-center justify-center">
 <UserCircle className="w-6 h-6 text-saffron-300" />
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold text-white truncate">
 {user?.fullName || 'Temple Manager'}
 </p>
 <p className="text-xs text-white/40">Temple Manager</p>
 </div>
 </div>
 </div>

 {/* Nav */}
 <nav className="flex-1 px-3 py-4 space-y-1">
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
 {/* AUTH-09 (2026-09-01): this was `onClick={signOut}`, a bare call that
     sends the DEFAULT scope — global. POST /auth/logout burns every
     refresh_token_jtis row the account holds, so pressing it on
     a temple's or a shop's shared desktop also ended the session on the
     operator's own phone, with nothing on screen saying so.

     /auth/logout runs the identical global sign-out and puts "this signs
     you out on all your devices" on screen while it happens. Same fix as
     components/NavAuthButton.tsx and app/dashboard/page.tsx. A user who
     wants the narrow scope has the choice on /profile -> Security. */}
 <Link
   href="/auth/logout"
   className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors mt-1"
 >
 <LogOut className="w-5 h-5" />
 Sign Out
 </Link>
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
 {/* DU-05: drawer chrome, not the page title. As an h1 it was a second
 level-1 heading below lg, competing with the page's own h1. */}
 <div role="doc-subtitle" aria-label="Temple Portal" className="text-sm font-semibold text-surface-800 lg:hidden">Temple Portal</div>
 </div>
 </header>

 <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
 {children}
 </main>
 </div>
 </div>
 );
}

export default function TempleRootLayout({ children }: { children: React.ReactNode }) {
 return (
 <AuthGuard allowedRoles={['temple_manager']}>
 <TemplePortalLayout>{children}</TemplePortalLayout>
 </AuthGuard>
 );
}
