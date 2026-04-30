'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
 LayoutDashboard,
 CalendarDays,
 Users,
 UserCircle,
 Leaf,
 Wallet,
 Sparkles,
 Menu,
 X,
 LogOut,
 ChevronRight,
 MessageSquare,
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/auth-context';

const sidebarLinks = [
 { href: '/wellness-portal', label: 'Dashboard', icon: LayoutDashboard },
 { href: '/wellness-portal/messages', label: 'Messages', icon: MessageSquare },
 { href: '/wellness-portal/sessions', label: 'Sessions', icon: CalendarDays },
 { href: '/wellness-portal/students', label: 'Students', icon: Users },
 { href: '/wellness-portal/earnings', label: 'Earnings', icon: Wallet },
 { href: '/wellness-portal/subscription', label: 'Subscription', icon: Sparkles },
 { href: '/wellness-portal/profile', label: 'Profile', icon: UserCircle },
];

function WellnessPortalLayout({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();
 const { user, signOut } = useAuth();
 const [sidebarOpen, setSidebarOpen] = useState(false);

 const isActive = (href: string) => {
 if (href === '/wellness-portal') return pathname === '/wellness-portal';
 return pathname.startsWith(href);
 };

 return (
 <div className="min-h-screen bg-surface-50 flex">
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
 <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
 <Leaf className="w-4 h-4 text-emerald-300" />
 </div>
 <div>
 <span className="text-white font-bold text-sm">Wellness Portal</span>
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
 <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
 <UserCircle className="w-6 h-6 text-emerald-300" />
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold text-white truncate">
 {user?.fullName || 'Instructor'}
 </p>
 <p className="text-xs text-white/40">Wellness Instructor</p>
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
 className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
 active
 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
 : 'text-white/60 hover:bg-white/5 hover:text-white/80'
 }`}
 >
 <Icon className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-white/40'}`} />
 {link.label}
 {active && <ChevronRight className="w-4 h-4 ml-auto text-emerald-400" />}
 </Link>
 );
 })}
 </nav>

 {/* Bottom */}
 <div className="px-3 py-4 border-t border-white/10">
 <Link
 href="/"
 className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/40 hover:bg-white/5 hover:text-white/60 transition-colors"
 >
 <ChevronRight className="w-5 h-5 rotate-180" />
 Back to Main Site
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
 <header className="h-16 bg-white border-b border-surface-200 flex items-center px-4 lg:px-6 sticky top-0 z-30">
 <button
 className="lg:hidden p-2 -ml-2 text-surface-500 hover:text-surface-600"
 onClick={() => setSidebarOpen(true)}
 >
 <Menu className="w-5 h-5" />
 </button>
 <div className="ml-2 lg:ml-0">
 <h1 className="text-sm font-semibold text-surface-800 lg:hidden">Wellness Portal</h1>
 </div>
 </header>

 <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
 {children}
 </main>
 </div>
 </div>
 );
}

export default function WellnessRootLayout({ children }: { children: React.ReactNode }) {
 return (
 <AuthGuard allowedRoles={['wellness_instructor']}>
 <WellnessPortalLayout>{children}</WellnessPortalLayout>
 </AuthGuard>
 );
}
