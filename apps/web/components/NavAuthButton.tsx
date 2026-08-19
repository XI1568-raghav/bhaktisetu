'use client';

import { User, LogOut, LayoutDashboard, Settings, BookOpen, ShieldCheck, ShoppingBag, Store, Moon, MessageSquare, Compass } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth, getRoleLabel, getRoleDashboardPath } from '../lib/auth-context';
import { buttonClass } from './ui/button-recipe';

export default function NavAuthButton() {
 const { user, isAuthenticated, isLoading, signOut } = useAuth();
 const [menuOpen, setMenuOpen] = useState(false);
 const menuRef = useRef<HTMLDivElement>(null);

 // Close menu when clicking outside
 useEffect(() => {
 function handleClick(e: MouseEvent) {
 if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
 setMenuOpen(false);
 }
 }
 document.addEventListener('mousedown', handleClick);
 return () => document.removeEventListener('mousedown', handleClick);
 }, []);

 if (isLoading) {
 return (
 <div className="hidden sm:inline-flex items-center px-4 py-2 text-sm text-surface-400">
 <div className="w-4 h-4 border-2 border-surface-200 border-t-saffron-500 rounded-full animate-spin" />
 </div>
 );
 }

 if (!isAuthenticated) {
 return (
 // DU-03/DU-04: this was the only gradient button on the site — a
 // 135deg blend of saffron-500 into saffron-600 — sitting on all ten
 // screens next to flat solid CTAs, at 36px with its own radius. One
 // recipe now; `hidden sm:inline-flex` is the only call-site addition.
 <a href="/auth/login" className={buttonClass('primary', 'sm', 'hidden sm:inline-flex')}>
 Sign In
 </a>
 );
 }

 const displayName = user?.fullName || 'User';
 const role = user?.role || 'devotee';
 const roleLabel = getRoleLabel(role);
 const initials = displayName
 .split(' ')
 .map((n) => n[0])
 .join('')
 .slice(0, 2)
 .toUpperCase() || 'U';

 const roleBadgeColors: Record<string, string> = {
 devotee: 'bg-saffron-100 text-saffron-700',
 priest: 'bg-amber-100 text-amber-700',
 store_owner: 'bg-emerald-100 text-emerald-700',
 astrologer: 'bg-indigo-100 text-indigo-700',
 };

 return (
 <div className="relative" ref={menuRef}>
 <button
 onClick={() => setMenuOpen(!menuOpen)}
 className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-saffron-50 transition-colors"
 >
 {user?.avatarUrl ? (
 <img width={32} height={32}  src={user.avatarUrl}
 alt={displayName}
 className="w-8 h-8 rounded-full object-cover"
 />
 ) : (
 <div className="w-8 h-8 bg-saffron-100 rounded-full flex items-center justify-center">
 <span className="text-xs font-bold text-saffron-700">{initials}</span>
 </div>
 )}
 <div className="hidden sm:flex flex-col items-start">
 <span className="text-sm font-medium text-surface-700 max-w-[100px] truncate leading-tight">
 {displayName}
 </span>
 <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md leading-none ${roleBadgeColors[role] || roleBadgeColors.devotee}`}>
 {roleLabel}
 </span>
 </div>
 </button>

 {/* Dropdown menu */}
 {menuOpen && (
 <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-surface-100 shadow-xl py-2 z-50">
 <div className="px-4 py-2 border-b border-surface-100">
 <p className="text-sm font-semibold text-surface-800 truncate">{displayName}</p>
 <div className="flex items-center gap-2 mt-0.5">
 <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${roleBadgeColors[role] || roleBadgeColors.devotee}`}>
 {roleLabel}
 </span>
 <span className="text-xs text-surface-400 truncate">{user?.email || user?.phone}</span>
 </div>
 </div>

 <a
 href={getRoleDashboardPath(role)}
 className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
 >
 <LayoutDashboard className="w-4 h-4" />
 Dashboard
 </a>

 <a
 href="/messages"
 className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
 >
 <MessageSquare className="w-4 h-4" />
 Messages
 </a>

 {/* Devotee-specific links */}
 {role === 'devotee' && (
 <>
 <a
 href="/bookings"
 className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
 >
 <BookOpen className="w-4 h-4" />
 My Bookings
 </a>
 <a
 href="/store/cart"
 className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
 >
 <ShoppingBag className="w-4 h-4" />
 My Cart
 </a>
 </>
 )}

 {/* Priest link */}
 {role === 'priest' && (
 <a
 href="/priest"
 className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
 >
 <ShieldCheck className="w-4 h-4" />
 Priest Portal
 </a>
 )}

 {/* Store Owner link */}
 {role === 'store_owner' && (
 <a
 href="/store-admin"
 className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
 >
 <Store className="w-4 h-4" />
 Store Admin
 </a>
 )}

 {/* Astrologer link */}
 {role === 'astrologer' && (
 <a
 href="/astrology"
 className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
 >
 <Moon className="w-4 h-4" />
 Consultations
 </a>
 )}

 <a
 href="/profile"
 className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
 >
 <Settings className="w-4 h-4" />
 Edit Profile
 </a>

 <div className="border-t border-surface-100 mt-1 pt-1">
 {role !== 'admin' && (
 <button
 onClick={() => {
 setMenuOpen(false);
 if (typeof window !== 'undefined') {
 window.dispatchEvent(new CustomEvent('darshya:open-onboarding'));
 }
 }}
 className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-surface-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
 >
 <Compass className="w-4 h-4" />
 Restart guided tour
 </button>
 )}
 <button
 onClick={async () => {
 setMenuOpen(false);
 await signOut();
 window.location.href = '/';
 }}
 className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
 >
 <LogOut className="w-4 h-4" />
 Sign Out
 </button>
 </div>
 </div>
 )}
 </div>
 );
}
