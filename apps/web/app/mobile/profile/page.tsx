'use client';

import {
 User,
 BookOpen,
 CreditCard,
 MapPin,
 Settings,
 HelpCircle,
 Info,
 Share2,
 LogOut,
 ChevronRight,
 Shield,
 Star,
 Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';

function initialsOf(name: string | null | undefined): string {
 if (!name) return '👤';
 const parts = name.trim().split(/\s+/);
 if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
 return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const quickLinks = [
 { icon: BookOpen, label: 'My Bookings', badge: '3', href: '/bookings' },
 { icon: CreditCard, label: 'Subscription', badge: 'Bhakti Pass', href: '/profile' },
 { icon: MapPin, label: 'Saved Addresses', href: '/profile' },
 { icon: Sparkles, label: 'Ask Pandit AI', href: '/ask-pandit' },
 { icon: Settings, label: 'Settings', href: '/profile' },
];

const moreLinks = [
 { icon: HelpCircle, label: 'Help & Support' },
 { icon: Info, label: 'About Darshya' },
 { icon: Share2, label: 'Share App' },
 { icon: Star, label: 'Rate Us' },
];

export default function MobileProfile() {
 // P0 #PUB-05 (2026-07-09): render the real signed-in user instead of a
 // hardcoded "Arjun Sharma" placeholder. Falls back to a sign-in prompt when
 // there is no session so the page isn't impersonating a fake user.
 const { user } = useAuth();

 return (
 <div className="bg-surface-50 min-h-full">
 {/* Profile header */}
 <div className="bg-gradient-to-b from-saffron-50 to-surface-50 px-5 pt-6 pb-4">
 <div className="flex items-center gap-4">
 <div className="w-16 h-16 bg-saffron-100 rounded-2xl flex items-center justify-center">
 <span className="text-xl font-bold text-saffron-700">{initialsOf(user?.fullName)}</span>
 </div>
 <div className="flex-1">
 <h1 className="text-lg font-bold text-surface-900">
 {user?.fullName ?? 'Guest'}
 </h1>
 <p className="text-xs text-surface-400">
 {user?.phone ? `+91 ${user.phone.replace(/^\+91/, '').trim()}` : 'Sign in to sync your profile'}
 </p>
 <div className="flex items-center gap-1.5 mt-1">
 <span className="text-xs font-semibold text-saffron-700 bg-saffron-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
 <Shield className="w-2.5 h-2.5" />
 Bhakti Pass
 </span>
 <span className="text-xs font-medium text-surface-400">Member since 2026</span>
 </div>
 </div>
 {user ? (
 <button className="text-xs font-semibold text-saffron-600 bg-saffron-50 px-3 py-1.5 rounded-xl">
 Edit
 </button>
 ) : (
 <a
 href="/auth/login"
 className="text-xs font-semibold text-white bg-saffron-600 px-3 py-1.5 rounded-xl"
 >
 Sign In
 </a>
 )}
 </div>

 {/* Stats */}
 <div className="grid grid-cols-3 gap-2 mt-4">
 <div className="bg-white rounded-xl px-3 py-2.5 text-center border border-surface-200/60">
 <p className="text-lg font-bold text-surface-900">12</p>
 <p className="text-xs text-surface-400">Bookings</p>
 </div>
 <div className="bg-white rounded-xl px-3 py-2.5 text-center border border-surface-200/60">
 <p className="text-lg font-bold text-surface-900">3</p>
 <p className="text-xs text-surface-400">Temples</p>
 </div>
 <div className="bg-white rounded-xl px-3 py-2.5 text-center border border-surface-200/60">
 <p className="text-lg font-bold text-saffron-600">₹8.5K</p>
 <p className="text-xs text-surface-400">Spent</p>
 </div>
 </div>
 </div>

 {/* Quick Links */}
 <div className="px-5 mt-4 mb-6">
 <div className="bg-white rounded-2xl border border-surface-200/60 overflow-hidden divide-y divide-surface-100">
 {quickLinks.map((link) => {
 const Icon = link.icon;
 return (
 <a
 key={link.label}
 href={link.href}
 className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-surface-50 transition-colors"
 >
 <div className="w-8 h-8 bg-surface-100 rounded-lg flex items-center justify-center">
 <Icon className="w-4 h-4 text-surface-600" />
 </div>
 <span className="flex-1 text-sm font-medium text-surface-800">{link.label}</span>
 {link.badge && (
 <span className="text-xs font-semibold text-saffron-600 bg-saffron-50 px-2 py-0.5 rounded-full">
 {link.badge}
 </span>
 )}
 <ChevronRight className="w-4 h-4 text-surface-300" />
 </a>
 );
 })}
 </div>
 </div>

 {/* More */}
 <div className="px-5 mb-6">
 <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 px-1">More</p>
 <div className="bg-white rounded-2xl border border-surface-200/60 overflow-hidden divide-y divide-surface-100">
 {moreLinks.map((link) => {
 const Icon = link.icon;
 return (
 <button
 key={link.label}
 className="flex items-center gap-3.5 px-4 py-3.5 w-full text-left hover:bg-surface-50 transition-colors"
 >
 <div className="w-8 h-8 bg-surface-100 rounded-lg flex items-center justify-center">
 <Icon className="w-4 h-4 text-surface-500" />
 </div>
 <span className="flex-1 text-sm font-medium text-surface-800">{link.label}</span>
 <ChevronRight className="w-4 h-4 text-surface-300" />
 </button>
 );
 })}
 </div>
 </div>

 {/* Sign Out */}
 <div className="px-5 mb-8">
 <button className="flex items-center justify-center gap-2 w-full py-3 text-sm font-semibold text-red-600 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors">
 <LogOut className="w-4 h-4" />
 Sign Out
 </button>
 </div>

 {/* Footer */}
 <div className="text-center pb-6">
 <p className="text-xs text-surface-300">Darshya v1.0.0</p>
 <p className="text-xs text-surface-300">Made with devotion in India</p>
 </div>
 </div>
 );
}
