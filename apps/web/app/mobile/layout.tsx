'use client';

import { usePathname } from 'next/navigation';
import {
 Home,
 MapPin,
 Video,
 Music,
 User,
} from 'lucide-react';

const tabs = [
 { href: '/mobile', label: 'Home', icon: Home },
 { href: '/mobile/temples', label: 'Temples', icon: MapPin },
 { href: '/mobile/darshan', label: 'Darshan', icon: Video },
 { href: '/mobile/content', label: 'Content', icon: Music },
 { href: '/mobile/profile', label: 'Profile', icon: User },
];

export default function MobileLayout({ children }: { children: React.ReactNode }) {
 const pathname = usePathname();

 return (
 <div className="flex items-center justify-center min-h-[100dvh] bg-surface-200 py-8">
 {/* Phone frame */}
 <div className="relative w-[390px] h-[844px] bg-surface-50 rounded-[3rem] shadow-2xl shadow-black/20 border-[8px] border-surface-800 overflow-hidden flex flex-col">
 {/* Status bar */}
 <div className="flex items-center justify-between px-8 pt-3 pb-1 bg-surface-50">
 <span className="text-xs font-semibold text-surface-800">9:41</span>
 <div className="w-[80px] h-[28px] bg-surface-800 rounded-full mx-auto" />
 <div className="flex items-center gap-1">
 <div className="w-4 h-2.5 border border-surface-800 rounded-sm relative">
 <div className="absolute inset-[1px] bg-surface-800 rounded-[1px]" style={{ width: '75%' }} />
 </div>
 </div>
 </div>

 {/* Screen content */}
 <div className="flex-1 overflow-y-auto overflow-x-hidden">
 {children}
 </div>

 {/* Tab bar */}
 <div className="shrink-0 bg-white/90 backdrop-blur-xl border-t border-surface-200/60 px-2 pt-2 pb-6">
 <div className="flex items-center justify-around">
 {tabs.map((tab) => {
 const Icon = tab.icon;
 const isActive = pathname === tab.href;
 return (
 <a
 key={tab.href}
 href={tab.href}
 className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors ${
 isActive
 ? 'text-saffron-600'
 : 'text-surface-400 hover:text-surface-600'
 }`}
 >
 <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : ''}`} />
 <span className={`text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
 {tab.label}
 </span>
 </a>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 );
}
