'use client';

import { User, LogOut, LayoutDashboard, Settings, BookOpen, ShieldCheck, ShoppingBag, Store, Moon, MessageSquare, Compass } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth, getRoleLabel, getRoleDashboardPath } from '../lib/auth-context';
import { buttonClass } from './ui/button-recipe';
import { AvatarWithFallback } from './AvatarWithFallback';

export default function NavAuthButton() {
 // AUTH-09: no `signOut` here on purpose — the Sign Out item navigates to
 // /auth/logout, which runs it and discloses the multi-device effect first.
 const { user, isAuthenticated, isLoading } = useAuth();
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
 {/* PF-04: was a FALSY-only guard, so a present-but-dead avatar URL
     rendered as a broken-image icon in the site header — on every page,
     for every signed-in user. Same initials tile, now also reached when
     the image fails rather than only when it is absent. */}
 <AvatarWithFallback
 src={user?.avatarUrl}
 width={32}
 height={32}
 alt={displayName}
 className="w-8 h-8 rounded-full object-cover"
 fallback={
 <div className="w-8 h-8 bg-saffron-100 rounded-full flex items-center justify-center">
 <span className="text-xs font-bold text-saffron-700">{initials}</span>
 </div>
 }
 />
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
 {/*
   AUTH-09 (2026-08-23): hand off to /auth/logout instead of signing out here.

   This is the sign-out almost every user actually presses, and it used to be
   `await signOut(); window.location.href = '/'`. POST /auth/logout is GLOBAL —
   supabase.auth.signOut() defaults to global scope and the handler burns every
   refresh_token_jtis row the account holds — so pressing this ended the session
   on the user's phone too, and neither this menu nor the '/' it landed on ever
   said so. The disclosure and the scope argument both shipped earlier, but they
   shipped on the SHARED path; this call site bypassed them, so the primary door
   kept the old silent behaviour.

   /auth/logout runs the same global signOut() and then lands on '/' — identical
   outcome — but it puts "this signs you out on all your devices" on screen while
   it happens. Guarded by app/auth/__tests__/nav-signout-discloses.auth09.test.tsx
   and app/auth/logout/__tests__/discloses-all-devices.test.tsx.

   A per-device choice (signOut({ scope: 'local' }) vs 'global') belongs in
   account settings, not in a one-tap header menu — see the AUTH-09 note.
 */}
 <button
 onClick={() => {
 setMenuOpen(false);
 window.location.href = '/auth/logout';
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
