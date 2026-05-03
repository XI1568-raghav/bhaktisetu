'use client';
export const runtime = 'edge';

import { getTempleHero, getDeityImage } from '../../lib/images';
import {
 Flame,
 Play,
 Users,
 Star,
 Clock,
 Sparkles,
 ChevronRight,
 Sunrise,
 Sunset,
 Search,
} from 'lucide-react';

const liveStreams = [
 { name: 'Kashi Vishwanath', city: 'Varanasi', deity: 'Lord Shiva', viewers: 12450, img: getTempleHero('kashi-vishwanath') },
 { name: 'Tirupati Balaji', city: 'Tirumala', deity: 'Lord Venkateswara', viewers: 28300, img: getTempleHero('tirumala-tirupati') },
 { name: 'Siddhivinayak', city: 'Mumbai', deity: 'Lord Ganesha', viewers: 8760, img: getTempleHero('siddhivinayak') },
];

const popularPujas = [
 { name: 'Rudrabhishek', deity: 'Lord Shiva', price: 501, rating: 4.9, img: getDeityImage('lord-shiva', 'square') },
 { name: 'Ganesh Puja', deity: 'Lord Ganesha', price: 351, rating: 4.8, img: getDeityImage('lord-ganesha', 'square') },
 { name: 'Lakshmi Puja', deity: 'Goddess Lakshmi', price: 451, rating: 4.7, img: getDeityImage('goddess-lakshmi', 'square') },
 { name: 'Satyanarayan', deity: 'Lord Vishnu', price: 751, rating: 4.9, img: getDeityImage('lord-vishnu', 'square') },
];

export default function MobileHome() {
 return (
 <div className="bg-surface-50">
 {/* Header */}
 <div className="px-5 pt-4 pb-3">
 <div className="flex items-center justify-between">
 <div>
 <p className="text-xs text-surface-400 font-medium">Namaste</p>
 <h1 className="text-xl font-bold text-surface-900 tracking-tight">Arjun Sharma</h1>
 </div>
 <div className="flex items-center gap-2">
 <button className="w-9 h-9 bg-surface-100 rounded-xl flex items-center justify-center">
 <Search className="w-4 h-4 text-surface-500" />
 </button>
 <div className="w-9 h-9 bg-saffron-100 rounded-xl flex items-center justify-center">
 <span className="text-xs font-bold text-saffron-700">AS</span>
 </div>
 </div>
 </div>
 </div>

 {/* Search */}
 <div className="px-5 mb-4">
 <div className="relative">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 type="text"
 placeholder="Search temples, pujas, content..."
 className="w-full pl-10 pr-4 py-2.5 bg-surface-100 rounded-xl text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 border-0"
 />
 </div>
 </div>

 {/* Live Darshan */}
 <div className="px-5 mb-6">
 <div className="flex items-center justify-between mb-3">
 <h2 className="text-base font-bold text-surface-900">Live Darshan</h2>
 <a href="/mobile/darshan" className="text-xs font-semibold text-saffron-600">View All</a>
 </div>
 <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
 {liveStreams.map((s) => (
 <div key={s.name} className="shrink-0 w-[240px] rounded-2xl overflow-hidden bg-white border border-surface-200/60 shadow-sm">
 <div className="relative aspect-[16/10]">
 <img src={s.img} alt={s.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
 <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
 <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
 LIVE
 </div>
 <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-md backdrop-blur-sm">
 <Users className="w-2.5 h-2.5" />
 {(s.viewers / 1000).toFixed(1)}K
 </div>
 <div className="absolute bottom-2.5 left-2.5">
 <p className="text-white text-xs font-semibold drop-shadow-lg">{s.name}</p>
 <p className="text-white/70 text-[10px]">{s.city}</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Today's Panchang */}
 <div className="px-5 mb-6">
 <div className="bg-gradient-to-br from-saffron-50 to-amber-50/50 rounded-2xl p-4 border border-saffron-200/40">
 <div className="flex items-center justify-between mb-3">
 <h2 className="text-sm font-bold text-surface-900">Today&apos;s Panchang</h2>
 <span className="text-[10px] font-medium text-surface-400">April 15, 2026</span>
 </div>
 <div className="grid grid-cols-2 gap-2.5">
 <div className="bg-white/70 rounded-xl px-3 py-2">
 <p className="text-[10px] text-surface-400 font-medium">Tithi</p>
 <p className="text-sm font-semibold text-surface-900">Trayodashi</p>
 </div>
 <div className="bg-white/70 rounded-xl px-3 py-2">
 <p className="text-[10px] text-surface-400 font-medium">Nakshatra</p>
 <p className="text-sm font-semibold text-surface-900">Hasta</p>
 </div>
 <div className="bg-white/70 rounded-xl px-3 py-2 flex items-center gap-2">
 <Sunrise className="w-3.5 h-3.5 text-saffron-500" />
 <div>
 <p className="text-[10px] text-surface-400">Sunrise</p>
 <p className="text-xs font-semibold text-surface-800">6:02 AM</p>
 </div>
 </div>
 <div className="bg-white/70 rounded-xl px-3 py-2 flex items-center gap-2">
 <Sunset className="w-3.5 h-3.5 text-saffron-500" />
 <div>
 <p className="text-[10px] text-surface-400">Sunset</p>
 <p className="text-xs font-semibold text-surface-800">6:48 PM</p>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Popular Pujas */}
 <div className="px-5 mb-6">
 <div className="flex items-center justify-between mb-3">
 <h2 className="text-base font-bold text-surface-900">Popular Pujas</h2>
 <a href="/pujas" className="text-xs font-semibold text-saffron-600">View All</a>
 </div>
 <div className="space-y-2.5">
 {popularPujas.map((p) => (
 <div key={p.name} className="flex items-center gap-3 bg-white rounded-2xl p-3 border border-surface-200/60 shadow-sm">
 <img src={p.img} alt={p.deity} className="w-14 h-14 rounded-xl object-cover" loading="lazy" decoding="async" />
 <div className="flex-1 min-w-0">
 <h3 className="text-sm font-semibold text-surface-900">{p.name}</h3>
 <p className="text-xs text-surface-400">{p.deity}</p>
 <div className="flex items-center gap-1 mt-0.5">
 <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
 <span className="text-[10px] font-medium text-surface-600">{p.rating}</span>
 </div>
 </div>
 <div className="text-right shrink-0">
 <p className="text-sm font-bold text-saffron-600">₹{p.price}</p>
 <button className="mt-1 text-[10px] font-semibold text-saffron-600 bg-saffron-50 px-2.5 py-1 rounded-lg">
 Book
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Ask Pandit FAB */}
 <div className="fixed bottom-24 right-12 z-40">
 <a
 href="/ask-pandit"
 className="flex items-center gap-2 bg-gradient-to-r from-saffron-500 to-saffron-600 text-white px-4 py-3 rounded-2xl shadow-lg shadow-saffron-500/30 hover:shadow-xl transition-shadow"
 >
 <Sparkles className="w-4 h-4" />
 <span className="text-xs font-bold">Ask Pandit</span>
 </a>
 </div>

 {/* Bottom spacer */}
 <div className="h-4" />
 </div>
 );
}
