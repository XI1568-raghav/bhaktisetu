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
} from 'lucide-react';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/auth-context';
import { Logo } from '../../components/Logo';

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
 { href: '/admin/subscriptions', label: 'Subscriptions', icon: Sparkles },
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
 className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 bg-[#faf9f6] border-r border-surface-200 flex flex-col transition-transform duration-200 ${
 sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
 }`}
 >
 {/* Brand header */}
 <div className="h-16 flex items-center gap-3 px-5 border-b border-surface-200">
 <Logo size={28} color="#E16318" />
 <div>
 <span className="text-surface-900 font-bold text-sm tracking-tight">
 Darsh<span className="text-saffron-600">ya</span>
 </span>
 <p className="text-surface-500 text-xs">Admin Portal</p>
 </div>
 <button
 className="lg:hidden ml-auto text-surface-500 hover:text-surface-800"
 onClick={() => setSidebarOpen(false)}
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Navigation */}
 <nav className="darshya-admin-scroll flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
 ? 'bg-saffron-50 text-saffron-700 ring-1 ring-saffron-200'
 : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
 }`}
 >
 <Icon className={`w-5 h-5 ${active ? 'text-saffron-600' : 'text-surface-400'}`} />
 {link.label}
 {active && <ChevronRight className="w-4 h-4 ml-auto text-saffron-600/60" />}
 </Link>
 );
 })}
 </nav>
 <style dangerouslySetInnerHTML={{ __html: `
 .darshya-admin-scroll::-webkit-scrollbar { width: 6px; }
 .darshya-admin-scroll::-webkit-scrollbar-track { background: transparent; }
 .darshya-admin-scroll::-webkit-scrollbar-thumb { background: rgba(225,99,24,0.35); border-radius: 3px; }
 .darshya-admin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(225,99,24,0.6); }
 .darshya-admin-scroll { scrollbar-width: thin; scrollbar-color: rgba(225,99,24,0.35) transparent; }
 ` }} />

 {/* Bottom actions */}
 <div className="px-3 py-4 border-t border-surface-200">
 <Link
 href="/"
 className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-surface-600 hover:bg-surface-100 hover:text-surface-900 transition-colors"
 >
 <ChevronRight className="w-5 h-5 rotate-180" />
 Back to Site
 </Link>
 <button
 onClick={signOut}
 className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-1"
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
 return (
 <AuthGuard allowedRoles={['admin']}>
 <AdminLayoutInner>{children}</AdminLayoutInner>
 </AuthGuard>
 );
}
