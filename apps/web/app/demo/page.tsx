'use client';

import Link from 'next/link';
import { H1 } from '../../components/ui/heading-recipe';
import {
 Heart,
 BookOpen,
 Store,
 Star,
 Leaf,
 Building2,
 MilkOff,
 ChevronRight,
 Smartphone,
 ArrowLeft,
} from 'lucide-react';

const roles = [
 {
 slug: 'devotee',
 name: 'Devotee',
 icon: Heart,
 screens: 6,
 color: 'from-saffron-100 to-saffron-50',
 iconBg: 'bg-saffron-100',
 iconColor: 'text-saffron-700',
 desc: 'Signup, home feed, puja booking, live darshan, profile',
 },
 {
 slug: 'pandit',
 name: 'Pandit',
 icon: BookOpen,
 screens: 6,
 color: 'from-amber-100 to-amber-50',
 iconBg: 'bg-amber-100',
 iconColor: 'text-amber-700',
 desc: 'Onboarding, dashboard, bookings, earnings, payouts',
 },
 {
 slug: 'store-owner',
 name: 'Store Owner',
 icon: Store,
 screens: 5,
 color: 'from-emerald-100 to-emerald-50',
 iconBg: 'bg-emerald-100',
 iconColor: 'text-emerald-700',
 desc: 'Store setup, products, orders, revenue dashboard',
 },
 {
 slug: 'astrologer',
 name: 'Astrologer',
 icon: Star,
 screens: 5,
 color: 'from-purple-100 to-purple-50',
 iconBg: 'bg-purple-100',
 iconColor: 'text-purple-700',
 desc: 'Consultations, live chat, reviews, earnings',
 },
 {
 slug: 'wellness',
 name: 'Wellness Instructor',
 icon: Leaf,
 screens: 5,
 color: 'from-teal-100 to-teal-50',
 iconBg: 'bg-teal-100',
 iconColor: 'text-teal-700',
 desc: 'Sessions, students, certifications, earnings',
 },
 {
 slug: 'temple-manager',
 name: 'Temple Manager',
 icon: Building2,
 screens: 5,
 color: 'from-rose-100 to-rose-50',
 iconBg: 'bg-rose-100',
 iconColor: 'text-rose-700',
 desc: 'Temple setup, darshan streams, pujas, donations',
 },
 {
 slug: 'gaushala-manager',
 name: 'Gaushala Manager',
 icon: MilkOff,
 screens: 4,
 color: 'from-lime-100 to-lime-50',
 iconBg: 'bg-lime-100',
 iconColor: 'text-lime-700',
 desc: 'Gaushala details, cow profiles, adoptions, donations',
 },
];

export default function DemoHub() {
 return (
 <div className="min-h-[100dvh] bg-gradient-to-b from-surface-900 via-surface-800 to-surface-900">
 {/* Back link */}
 <div className="max-w-5xl mx-auto px-6 pt-8">
 <Link
 href="/"
 className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-saffron-400 transition-colors"
 >
 <ArrowLeft className="w-4 h-4" />
 Back to home
 </Link>
 </div>

 {/* Hero */}
 <div className="text-center pt-8 pb-12 px-6">
 <div className="inline-flex items-center gap-2 bg-saffron-600/10 border border-saffron-600/20 rounded-full px-4 py-1.5 mb-5">
 <Smartphone className="w-3.5 h-3.5 text-saffron-400" />
 <span className="text-xs font-semibold text-saffron-400">Mobile App Preview</span>
 </div>
 <h1 className={H1.detail}>
 See Pooj<span className="text-saffron-400">ly</span> in Action
 </h1>
 <p className="text-surface-400 mt-3 max-w-lg mx-auto text-sm leading-relaxed">
 Walk through the complete app experience for every user type &mdash;
 from signup and onboarding to daily use on Android and iOS.
 </p>
 </div>

 {/* Role cards */}
 <div className="max-w-5xl mx-auto px-6 pb-20">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {roles.map((role) => {
 const Icon = role.icon;
 return (
 <Link
 key={role.slug}
 href={`/demo/${role.slug}`}
 className="group relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 hover:-translate-y-[2px] hover:shadow-lg hover:shadow-saffron-600/5 transition-all duration-300"
 >
 <div className="flex items-start gap-4">
 <div className={`w-12 h-12 ${role.iconBg} rounded-xl flex items-center justify-center shrink-0`}>
 <Icon className={`w-6 h-6 ${role.iconColor}`} />
 </div>
 <div className="flex-1 min-w-0">
 <h2 className="text-base font-semibold text-white group-hover:text-saffron-400 transition-colors">
 {role.name}
 </h2>
 <p className="text-xs text-surface-500 mt-0.5">
 {role.screens} screens
 </p>
 <p className="text-sm text-surface-400 mt-2 leading-relaxed">
 {role.desc}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-1 mt-4 text-sm font-medium text-saffron-400 group-hover:text-saffron-300 transition-colors">
 View Demo
 <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </div>
 </Link>
 );
 })}
 </div>
 </div>
 </div>
 );
}
