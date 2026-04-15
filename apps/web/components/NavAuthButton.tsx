'use client';

import { User, LogOut, LayoutDashboard, Settings, BookOpen, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';

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
      <div className="hidden sm:inline-flex items-center px-4 py-2 text-sm text-stone-400">
        <div className="w-4 h-4 border-2 border-stone-200 border-t-saffron-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <a
        href="/auth/login"
        className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white gradient-saffron rounded-lg hover:opacity-90 transition-opacity shadow-sm"
      >
        Sign In
      </a>
    );
  }

  const displayName = user?.fullName || 'Devotee';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-saffron-50 transition-colors"
      >
        {user?.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 bg-saffron-100 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-saffron-700">{initials}</span>
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-stone-700 max-w-[100px] truncate">
          {displayName}
        </span>
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl border border-stone-100 shadow-xl py-2 z-50">
          <div className="px-4 py-2 border-b border-stone-100">
            <p className="text-sm font-semibold text-stone-800 truncate">{displayName}</p>
            <p className="text-xs text-stone-400 truncate">{user?.phone}</p>
          </div>

          <a
            href="/dashboard"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </a>
          <a
            href="/bookings"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            My Bookings
          </a>
          <a
            href="/store/cart"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            My Cart
          </a>
          <a
            href="/profile"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Edit Profile
          </a>
          <a
            href="/priest"
            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-stone-700 hover:bg-saffron-50 hover:text-saffron-700 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            Priest Portal
          </a>

          <div className="border-t border-stone-100 mt-1 pt-1">
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
