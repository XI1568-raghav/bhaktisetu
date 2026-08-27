'use client';

import { getTempleHero } from '../../../lib/images';
import { MapPin, Star, Search, Shield } from 'lucide-react';
import { H1 } from '../../../components/ui/heading-recipe';

// DF-10 (2026-08-24): the `viewers` key is gone from these rows. It held
// 12450 / 28300 / 8760 / 5420 / 0 and was rendered as "12.5K" under a Users
// icon on every live card. 12450 is the exact figure the 2026-05-02 content
// audit deleted from the homepage as fabricated
// (docs/content-audit-2026-05-02.md:31) — it survived here because the card
// only ever showed the rounded form. Nothing in this app counts an audience,
// so per lib/platform-stats.ts:5-24 the copy loses its digits rather than
// falling back to a literal; the LIVE pill above still states liveness.
//
// Note that the row for Jagannath carried `viewers: 0` alongside `live: false`
// and was suppressed by a `> 0` guard. That guard is gone with the field: an
// absent count and a zero count are the same thing here, and neither belongs
// on screen.
const temples = [
 { name: 'Kashi Vishwanath', city: 'Varanasi', deity: 'Lord Shiva', rating: 4.9, live: true, verified: true, img: getTempleHero('kashi-vishwanath') },
 { name: 'Tirupati Balaji', city: 'Tirumala', deity: 'Lord Venkateswara', rating: 4.9, live: true, verified: true, img: getTempleHero('tirumala-tirupati') },
 { name: 'Siddhivinayak', city: 'Mumbai', deity: 'Lord Ganesha', rating: 4.8, live: true, verified: true, img: getTempleHero('siddhivinayak') },
 { name: 'Somnath Temple', city: 'Somnath', deity: 'Lord Shiva', rating: 4.8, live: true, verified: true, img: getTempleHero('somnath') },
 { name: 'Jagannath Temple', city: 'Puri', deity: 'Lord Jagannath', rating: 4.9, live: false, verified: true, img: getTempleHero('jagannath-puri') },
];

export default function MobileTemples() {
 return (
 <div className="bg-surface-50">
 {/* Header */}
 <div className="px-5 pt-4 pb-3">
 <h1 className={H1.portal}>Temples</h1>
 <p className="text-xs text-surface-400 mt-0.5">Explore sacred temples across India</p>
 </div>

 {/* Search */}
 <div className="px-5 mb-4">
 <div className="relative">
 <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
 <input
 type="text"
 placeholder="Search by name, city, or deity..."
 className="w-full pl-10 pr-4 py-2.5 bg-surface-100 rounded-xl text-sm placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-saffron-300 border-0"
 />
 </div>
 </div>

 {/* Filters */}
 <div className="px-5 mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
 {['All', 'Jyotirlinga', 'Char Dham', 'Live Darshan', 'Shaiva', 'Vaishnava'].map((f, i) => (
 <button
 key={f}
 className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full transition-colors ${
 i === 0 ? 'bg-saffron-600 text-white' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
 }`}
 >
 {f}
 </button>
 ))}
 </div>

 {/* Temple list */}
 <div className="px-5 space-y-3 pb-4">
 {temples.map((t) => (
 <div key={t.name} className="bg-white rounded-2xl overflow-hidden border border-surface-200/60 shadow-sm">
 <div className="relative aspect-[2.2/1]">
 <img width={440} height={200} src={t.img} alt={t.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
 <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
 {t.live && (
 <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
 <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
 LIVE
 </div>
 )}
 {t.verified && (
 <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 bg-green-600/90 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
 <Shield className="w-2.5 h-2.5" />
 </div>
 )}
 </div>
 <div className="p-3.5">
 <h3 className="text-sm font-semibold text-surface-900">{t.name}</h3>
 <div className="flex items-center justify-between mt-1">
 <p className="text-xs text-surface-400 flex items-center gap-1">
 <MapPin className="w-3 h-3" />
 {t.city} &middot; {t.deity}
 </p>
 <div className="flex items-center gap-0.5">
 <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
 <span className="text-xs font-semibold text-surface-700">{t.rating}</span>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 </div>
 );
}
