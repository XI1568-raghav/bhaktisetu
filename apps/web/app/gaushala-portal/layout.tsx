'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
 LayoutDashboard,
 Heart,
 Users,
 UserCircle,
 Menu,
 X,
 LogOut,
 ChevronRight,
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/auth-context';

const sidebarLinks = [
 { href: '/gaushala-portal', icon: LayoutDashboard, label: 'Overview' },
 { href: '/gaushala-portal/donations', icon: Heart, label: 'Donations' },
 { href: '/gaushala-portal/cows', icon: () => <span className="text-base leading-none"></span>, label: 'Cows' },
 { href: '/gaushala-portal/volunteers', icon: Users, label: 'Volunteers' },
 { href: '/gaushala-portal/profile', icon: UserCircle, label: 'Profile' },
];

function GaushalaSidebar({ sidebarOpen, setSidebarOpen }: { sidebarOpen: boolean; setSidebarOpen: (v: boolean) => void }) {
 const pathname = usePathname();
 const { user, signOut } = useAuth();

 const isActive = (href: string) =>
 href === '/gaushala-portal' ? pathname === '/gaushala-portal' : pathname.startsWith(href);

 return (
 <aside
 className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 bg-amber-900 text-amber-50 flex flex-col transition-transform duration-200 ${
 sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
 }`}
 >
 {/* Brand */}
 <div className="h-16 flex items-center gap-3 px-5 border-b border-amber-800">
 <div className="w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center text-lg leading-none">

 </div>
 <div>
 <span className="text-white font-bold text-sm">Gaushala Portal</span>
 <p className="text-amber-300 text-xs">Darshya</p>
 </div>
 <button className="lg:hidden ml-auto text-amber-300" onClick={() => setSidebarOpen(false)}>
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* User info */}
 <div className="px-5 py-4 border-b border-amber-800">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 bg-amber-700 rounded-full flex items-center justify-center text-white font-bold text-sm">
 {(user?.fullName || 'G').charAt(0).toUpperCase()}
 </div>
 <div className="min-w-0 flex-1">
 <p className="text-sm font-semibold text-white truncate">{user?.fullName || 'Gaushala Manager'}</p>
 <p className="text-xs text-amber-300">Gaushala Manager</p>
 </div>
 </div>
 </div>

 {/* Nav */}
 <nav className="flex-1 px-3 py-4 space-y-1">
 {sidebarLinks.map(({ href, icon: Icon, label }) => {
 const active = isActive(href);
 return (
 <Link
 key={href}
 href={href}
 onClick={() => setSidebarOpen(false)}
 className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
 active
 ? 'bg-amber-700 text-white border border-amber-600'
 : 'text-amber-200 hover:bg-amber-800 hover:text-white'
 }`}
 >
 <Icon className="w-5 h-5 flex-shrink-0" />
 {label}
 {active && <ChevronRight className="w-4 h-4 ml-auto text-amber-300" />}
 </Link>
 );
 })}
 </nav>

 {/* Bottom */}
 <div className="px-3 py-4 border-t border-amber-800">
 <Link
 href="/"
 className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-300 hover:bg-amber-800 hover:text-white transition-colors"
 >
 <ChevronRight className="w-5 h-5 rotate-180" />
 Back to Main Site
 </Link>
 <button
 onClick={signOut}
 className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/30 transition-colors mt-1"
 >
 <LogOut className="w-5 h-5" />
 Sign Out
 </button>
 </div>
 </aside>
 );
}

function GaushalPortalShell({ children }: { children: React.ReactNode }) {
 const [sidebarOpen, setSidebarOpen] = useState(false);

 return (
 <div className="min-h-screen bg-amber-50 flex">
 {sidebarOpen && (
 <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
 )}
 <GaushalaSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
 <div className="flex-1 flex flex-col min-w-0">
 <header className="h-14 bg-white border-b border-amber-100 flex items-center px-4 lg:px-6 sticky top-0 z-30">
 <button className="lg:hidden p-2 -ml-2 text-amber-700" onClick={() => setSidebarOpen(true)}>
 <Menu className="w-5 h-5" />
 </button>
 </header>
 <main className="flex-1 overflow-y-auto">{children}</main>
 </div>
 </div>
 );
}

export default function GaushalPortalLayout({ children }: { children: React.ReactNode }) {
 return (
 <AuthGuard allowedRoles={['gaushala_manager']}>
 <GaushalPortalShell>{children}</GaushalPortalShell>
 </AuthGuard>
 );
}
