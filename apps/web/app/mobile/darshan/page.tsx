'use client';

import { getTempleHero } from '../../../lib/images';
import { Play, Users, Clock, Bell, MapPin } from 'lucide-react';

const liveStreams = [
 { name: 'Kashi Vishwanath', city: 'Varanasi', deity: 'Lord Shiva', viewers: 12450, event: 'Morning Aarti', img: getTempleHero('kashi-vishwanath') },
 { name: 'Tirupati Balaji', city: 'Tirumala', deity: 'Lord Venkateswara', viewers: 28300, event: 'Suprabhatam', img: getTempleHero('tirumala-tirupati') },
 { name: 'Siddhivinayak', city: 'Mumbai', deity: 'Lord Ganesha', viewers: 8760, event: 'Abhishek', img: getTempleHero('siddhivinayak') },
 { name: 'Mahakaleshwar', city: 'Ujjain', deity: 'Lord Shiva', viewers: 9800, event: 'Bhasma Aarti', img: getTempleHero('kashi-vishwanath') },
];

const upcoming = [
 { name: 'Jagannath Temple', city: 'Puri', time: '5:30 AM', img: getTempleHero('jagannath-puri') },
 { name: 'Kedarnath', city: 'Uttarakhand', time: '6:00 AM', img: getTempleHero('kedarnath') },
];

export default function MobileDarshan() {
 return (
 <div className="bg-surface-900 min-h-full">
 {/* Header */}
 <div className="px-5 pt-4 pb-3">
 <div className="flex items-center gap-2">
 <div className="flex items-center gap-1 bg-red-600/20 text-red-400 text-xs font-bold px-2 py-1 rounded-full">
 <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
 LIVE
 </div>
 <span className="text-xs text-surface-500">4 streams active</span>
 </div>
 <h1 className="text-xl font-bold text-white tracking-tight mt-1">Live Darshan</h1>
 </div>

 {/* Live Streams */}
 <div className="px-5 mb-6">
 <div className="grid grid-cols-2 gap-2.5">
 {liveStreams.map((s) => (
 <div key={s.name} className="rounded-2xl overflow-hidden bg-surface-800 border border-surface-700/50">
 <div className="relative aspect-[4/3]">
 <img src={s.img} alt={s.name} className="w-full h-full object-cover opacity-80" loading="lazy" decoding="async" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
 <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
 <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
 LIVE
 </div>
 <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/50 text-white text-[8px] px-1 py-0.5 rounded backdrop-blur-sm">
 <Users className="w-2 h-2" />
 {(s.viewers / 1000).toFixed(1)}K
 </div>
 <button className="absolute inset-0 flex items-center justify-center">
 <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
 <Play className="w-4 h-4 text-white ml-0.5" />
 </div>
 </button>
 <div className="absolute bottom-2 left-2 right-2">
 <p className="text-white text-xs font-semibold truncate">{s.name}</p>
 <p className="text-white/60 text-xs">{s.event}</p>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>

 {/* Upcoming */}
 <div className="px-5 mb-4">
 <h2 className="text-sm font-bold text-white mb-3">Upcoming Streams</h2>
 <div className="space-y-2">
 {upcoming.map((s) => (
 <div key={s.name} className="flex items-center gap-3 bg-surface-800/80 rounded-xl p-3 border border-surface-700/40">
 <img src={s.img} alt={s.name} className="w-12 h-12 rounded-lg object-cover opacity-70" loading="lazy" decoding="async" />
 <div className="flex-1">
 <p className="text-xs font-semibold text-white">{s.name}</p>
 <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
 <MapPin className="w-2.5 h-2.5" /> {s.city}
 </p>
 </div>
 <div className="text-right shrink-0">
 <p className="text-xs text-surface-400 flex items-center gap-1">
 <Clock className="w-2.5 h-2.5" /> {s.time}
 </p>
 <button className="mt-1 text-xs font-semibold text-saffron-400 flex items-center gap-0.5">
 <Bell className="w-2.5 h-2.5" /> Remind
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
