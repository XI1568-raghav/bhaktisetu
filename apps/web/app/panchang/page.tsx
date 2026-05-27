import type { Metadata } from 'next';
import { Suspense } from 'react';
import {
 Sun,
 Moon,
 Sunrise,
 Sunset,
 Star,
 Calendar,
 Clock,
 ChevronLeft,
 ChevronRight,
 AlertTriangle,
 CheckCircle2,
 MapPin,
 Bell,
 ArrowRight,
} from 'lucide-react';
import {
 getTodayPanchang,
 getUpcomingFestivals,
 type Panchang,
} from '../../lib/api';

export const metadata: Metadata = {
 title: 'Panchang',
 description:
 'Daily Hindu Panchang with tithi, nakshatra, yoga, karana, sunrise/sunset times, auspicious muhurat, rahu kaal, and festival calendar.',
};

// ─── Fallback data ────────────────────────────────────────────────────────────

const fallbackPanchang: Panchang = {
 id: 'fallback',
 date: '2026-04-15',
 tithi: 'Shukla Trayodashi',
 nakshatra: 'Hasta',
 yoga: 'Shukla',
 karana: 'Garaja',
 sunrise: '6:02 AM',
 sunset: '6:48 PM',
 rahuKaal: '3:18 PM - 4:48 PM',
 shubhMuhurat: [
 { name: 'Abhijit Muhurat', start: '11:54 AM', end: '12:45 PM' },
 { name: 'Amrit Kaal', start: '2:18 PM', end: '3:52 PM' },
 { name: 'Brahma Muhurat', start: '4:26 AM', end: '5:14 AM' },
 { name: 'Vijay Muhurat', start: '2:27 PM', end: '3:18 PM' },
 ],
 festivals: [],
 vrat: ['Pradosh Vrat'],
 specialInfo:
 'Pradosh Vrat falls on Trayodashi Tithi, dedicated to Lord Shiva and Goddess Parvati. Fasting from sunrise to seeing the moon. Shiva puja during Pradosh Kaal (1.5 hours before and after sunset) is highly meritorious.',
};

const fallbackFestivals = [
 {
 date: 'April 17',
 name: 'Amavasya',
 description: 'New Moon day. Shraadh and Tarpan auspicious.',
 type: 'tithi',
 },
 {
 date: 'April 20',
 name: 'Akshaya Tritiya',
 description:
 'One of the most auspicious days for new beginnings and gold purchases.',
 type: 'festival',
 },
 {
 date: 'April 26',
 name: 'Mohini Ekadashi',
 description: 'Fasting on this day removes sins and grants liberation.',
 type: 'vrat',
 },
 {
 date: 'May 1',
 name: 'Purnima',
 description: 'Full Moon day. Buddha Purnima celebrations.',
 type: 'festival',
 },
];

const calendarDays = [
 { day: 30, month: 'prev' as const, tithi: 'Pratipada' },
 { day: 31, month: 'prev' as const, tithi: 'Dwitiya' },
 { day: 1, month: 'current' as const, tithi: 'Tritiya' },
 { day: 2, month: 'current' as const, tithi: 'Chaturthi' },
 { day: 3, month: 'current' as const, tithi: 'Panchami' },
 { day: 4, month: 'current' as const, tithi: 'Shashthi' },
 { day: 5, month: 'current' as const, tithi: 'Saptami' },
 { day: 6, month: 'current' as const, tithi: 'Ashtami', festival: 'Rama Navami' },
 { day: 7, month: 'current' as const, tithi: 'Navami' },
 { day: 8, month: 'current' as const, tithi: 'Dashami' },
 { day: 9, month: 'current' as const, tithi: 'Ekadashi', vrat: 'Kamada Ekadashi' },
 { day: 10, month: 'current' as const, tithi: 'Dwadashi' },
 { day: 11, month: 'current' as const, tithi: 'Trayodashi' },
 { day: 12, month: 'current' as const, tithi: 'Chaturdashi' },
 { day: 13, month: 'current' as const, tithi: 'Purnima', festival: 'Hanuman Jayanti' },
 { day: 14, month: 'current' as const, tithi: 'Pratipada' },
 { day: 15, month: 'current' as const, tithi: 'Trayodashi', isToday: true, vrat: 'Pradosh Vrat' },
 { day: 16, month: 'current' as const, tithi: 'Chaturdashi' },
 { day: 17, month: 'current' as const, tithi: 'Amavasya' },
 { day: 18, month: 'current' as const, tithi: 'Pratipada' },
 { day: 19, month: 'current' as const, tithi: 'Dwitiya' },
 { day: 20, month: 'current' as const, tithi: 'Tritiya', festival: 'Akshaya Tritiya' },
 { day: 21, month: 'current' as const, tithi: 'Chaturthi' },
 { day: 22, month: 'current' as const, tithi: 'Panchami' },
 { day: 23, month: 'current' as const, tithi: 'Shashthi' },
 { day: 24, month: 'current' as const, tithi: 'Saptami' },
 { day: 25, month: 'current' as const, tithi: 'Ashtami' },
 { day: 26, month: 'current' as const, tithi: 'Navami', vrat: 'Mohini Ekadashi' },
 { day: 27, month: 'current' as const, tithi: 'Dashami' },
 { day: 28, month: 'current' as const, tithi: 'Ekadashi' },
 { day: 29, month: 'current' as const, tithi: 'Dwadashi' },
 { day: 30, month: 'current' as const, tithi: 'Trayodashi' },
 { day: 1, month: 'next' as const, tithi: 'Chaturdashi' },
 { day: 2, month: 'next' as const, tithi: 'Purnima' },
];

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchPanchang(dateOffset: number = 0): Promise<Panchang> {
 try {
 // For now, getTodayPanchang() only returns today.
 // We always try the API, and use dateOffset for UI navigation in the future.
 const data = await getTodayPanchang();
 return data;
 } catch {
 return fallbackPanchang;
 }
}

async function fetchFestivals(): Promise<
 { date: string; name: string; description?: string; type?: string }[]
> {
 try {
 const data = await getUpcomingFestivals();
 return data.festivals.map((f) => ({
 date: f.date,
 name: f.name,
 }));
 } catch {
 return fallbackFestivals;
 }
}

// ─── Async Sections ───────────────────────────────────────────────────────────

async function PanchangDetailsSection({
 dateOffset,
}: {
 dateOffset: number;
}) {
 const panchang = await fetchPanchang(dateOffset);

 // Compute display date from offset
 const displayDate = new Date();
 displayDate.setDate(displayDate.getDate() + dateOffset);
 const dayNames = [
 'Sunday',
 'Monday',
 'Tuesday',
 'Wednesday',
 'Thursday',
 'Friday',
 'Saturday',
 ];
 const monthNames = [
 'January',
 'February',
 'March',
 'April',
 'May',
 'June',
 'July',
 'August',
 'September',
 'October',
 'November',
 'December',
 ];
 const formattedDate = `${dayNames[displayDate.getDay()]}, ${monthNames[displayDate.getMonth()]} ${displayDate.getDate()}, ${displayDate.getFullYear()}`;

 const panchangElements = [
 {
 label: 'Tithi',
 value: panchang.tithi,
 detail: `Active for today.`,
 icon: Moon,
 color: 'bg-saffron-50 text-saffron-600',
 },
 {
 label: 'Nakshatra',
 value: panchang.nakshatra,
 detail: 'Birth star for today.',
 icon: Star,
 color: 'bg-purple-50 text-purple-600',
 },
 {
 label: 'Yoga',
 value: panchang.yoga,
 detail: 'Current yoga period.',
 icon: Sun,
 color: 'bg-amber-50 text-amber-600',
 },
 {
 label: 'Karana',
 value: panchang.karana,
 detail: 'Active karana for today.',
 icon: Clock,
 color: 'bg-green-50 text-green-600',
 },
 {
 label: 'Var (Day)',
 value: `${dayNames[displayDate.getDay()]}`,
 detail: `Today is ${dayNames[displayDate.getDay()]}.`,
 icon: Calendar,
 color: 'bg-red-50 text-red-600',
 },
 ];

 const prevOffset = dateOffset - 1;
 const nextOffset = dateOffset + 1;

 return (
 <>
 {/* Date header */}
 <div className="bg-white rounded-xl p-6 border border-surface-100">
 <div className="flex items-center justify-between mb-6">
 <div>
 <h2 className="text-2xl font-semibold tracking-tight text-surface-800">
 {formattedDate}
 </h2>
 <p className="text-surface-500 mt-1">
 {panchang.tithi} &middot; Vikram Samvat 2083
 </p>
 </div>
 <div className="flex items-center gap-2">
 <a
 href={`/panchang?offset=${prevOffset}`}
 className="p-2 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
 >
 <ChevronLeft className="w-5 h-5 text-surface-500" />
 </a>
 <a
 href="/panchang"
 className="px-3 py-2 bg-saffron-600 text-white text-sm font-medium rounded-lg"
 >
 Today
 </a>
 <a
 href={`/panchang?offset=${nextOffset}`}
 className="p-2 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
 >
 <ChevronRight className="w-5 h-5 text-surface-500" />
 </a>
 </div>
 </div>

 {/* Panchang details grid */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
 <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center mb-2">
 <Sunrise className="w-5 h-5 text-amber-600" />
 </div>
 <div className="text-xs text-surface-500 font-medium uppercase tracking-wider">
 Sunrise
 </div>
 <div className="text-xl font-bold text-surface-800 mt-0.5">
 {panchang.sunrise}
 </div>
 </div>

 <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
 <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center mb-2">
 <Sunset className="w-5 h-5 text-orange-600" />
 </div>
 <div className="text-xs text-surface-500 font-medium uppercase tracking-wider">
 Sunset
 </div>
 <div className="text-xl font-bold text-surface-800 mt-0.5">
 {panchang.sunset}
 </div>
 </div>

 <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
 <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
 <Moon className="w-5 h-5 text-blue-600" />
 </div>
 <div className="text-xs text-surface-500 font-medium uppercase tracking-wider">
 Tithi
 </div>
 <div className="text-lg font-bold text-surface-800 mt-0.5">
 {panchang.tithi}
 </div>
 </div>

 <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
 <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center mb-2">
 <Star className="w-5 h-5 text-indigo-600" />
 </div>
 <div className="text-xs text-surface-500 font-medium uppercase tracking-wider">
 Nakshatra
 </div>
 <div className="text-lg font-bold text-surface-800 mt-0.5">
 {panchang.nakshatra}
 </div>
 </div>
 </div>
 </div>

 {/* Five elements of Panchang */}
 <div className="bg-white rounded-xl p-6 border border-surface-100">
 <h3 className="text-lg font-semibold tracking-tight text-surface-800 mb-4">
 Panchangam (Five Limbs)
 </h3>
 <div className="space-y-4">
 {panchangElements.map((item) => {
 const Icon = item.icon;
 return (
 <div
 key={item.label}
 className="flex items-start gap-4 p-4 rounded-xl bg-surface-50 border border-surface-100"
 >
 <div
 className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center shrink-0`}
 >
 <Icon className="w-5 h-5" />
 </div>
 <div>
 <div className="text-sm text-surface-500 font-medium">
 {item.label}
 </div>
 <div className="text-lg font-bold text-surface-800">
 {item.value}
 </div>
 <div className="text-sm text-surface-400 mt-0.5">
 {item.detail}
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>

 {/* Auspicious & Inauspicious timings */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 {/* Shubh Muhurat */}
 <div className="bg-white rounded-xl p-6 border border-surface-100">
 <h3 className="text-lg font-bold text-tulsi-green flex items-center gap-2 mb-4">
 <CheckCircle2 className="w-5 h-5" />
 Shubh Muhurat
 </h3>
 <div className="space-y-3">
 {panchang.shubhMuhurat.map((item) => (
 <div
 key={item.name}
 className="flex items-center justify-between p-3 bg-tulsi-green/5 rounded-lg border border-tulsi-green/10"
 >
 <span className="text-sm font-medium text-surface-600">
 {item.name}
 </span>
 <span className="text-sm font-semibold text-tulsi-green">
 {item.start} - {item.end}
 </span>
 </div>
 ))}
 </div>
 </div>

 {/* Inauspicious */}
 <div className="bg-white rounded-xl p-6 border border-surface-100">
 <h3 className="text-lg font-bold text-sacred-red flex items-center gap-2 mb-4">
 <AlertTriangle className="w-5 h-5" />
 Inauspicious Timings
 </h3>
 <div className="space-y-3">
 <div className="flex items-center justify-between p-3 bg-sacred-red/5 rounded-lg border border-sacred-red/10">
 <span className="text-sm font-medium text-surface-600">
 Rahu Kaal
 </span>
 <span className="text-sm font-semibold text-sacred-red">
 {panchang.rahuKaal}
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Today's Vrat / Festival */}
 {(panchang.vrat.length > 0 ||
 panchang.festivals.length > 0 ||
 panchang.specialInfo) && (
 <div className="bg-gradient-to-r from-saffron-50 to-amber-50 rounded-xl p-6 border border-saffron-200">
 <h3 className="text-lg font-bold text-surface-800 mb-3 flex items-center gap-2">
 <Calendar className="w-5 h-5 text-saffron-500" />
 Today&rsquo;s Observance
 </h3>
 <div className="bg-white rounded-xl p-4 border border-saffron-100">
 <div className="flex items-start gap-3">
 <div className="w-12 h-12 bg-saffron-100 rounded-xl flex items-center justify-center shrink-0">
 <Moon className="w-6 h-6 text-saffron-600" />
 </div>
 <div>
 <h4 className="font-bold text-surface-800">
 {[...panchang.vrat, ...panchang.festivals].join(', ') ||
 'No special observance'}
 </h4>
 {panchang.specialInfo && (
 <p className="text-sm text-surface-500 mt-1">
 {panchang.specialInfo}
 </p>
 )}
 </div>
 </div>
 </div>
 </div>
 )}
 </>
 );
}

async function FestivalsSidebar() {
 const festivals = await fetchFestivals();

 return (
 <div className="bg-white rounded-xl p-6 border border-surface-100">
 <h3 className="font-semibold text-surface-800 mb-4">
 Upcoming Festivals & Vrats
 </h3>
 <div className="space-y-4">
 {festivals.map((f) => (
 <div
 key={f.name}
 className="flex items-start gap-3 pb-4 border-b border-surface-50 last:border-0 last:pb-0"
 >
 <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-saffron-100 text-saffron-600">
 <Calendar className="w-4 h-4" />
 </div>
 <div>
 <div className="text-xs text-surface-400 font-medium">
 {f.date}
 </div>
 <div className="font-semibold text-surface-800 text-sm">
 {f.name}
 </div>
 {'description' in f && f.description && (
 <p className="text-xs text-surface-500 mt-0.5">
 {f.description}
 </p>
 )}
 </div>
 </div>
 ))}
 </div>
 <a
 href="/panchang"
 className="mt-4 flex items-center justify-center gap-1 text-sm font-semibold text-saffron-600 bg-saffron-50 py-2.5 rounded-xl hover:bg-saffron-100 transition-colors"
 >
 View Full Calendar
 <ArrowRight className="w-4 h-4" />
 </a>
 </div>
 );
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default async function PanchangPage({
 searchParams,
}: {
 searchParams: Promise<{ offset?: string }>;
}) {
 const { offset } = await searchParams;
 const dateOffset = offset ? parseInt(offset, 10) : 0;

 return (
 <div className="min-h-screen bg-saffron-50">
 {/* Hero */}
 <section className="bg-gradient-to-r from-saffron-600 via-saffron-500 to-temple-gold py-12 md:py-16">
 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
 <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
 Daily Panchang
 </h1>
 <p className="text-saffron-100 text-lg max-w-2xl">
 Complete Hindu calendar with tithi, nakshatra, yoga, karana, muhurat,
 and festival information for spiritual guidance.
 </p>
 <div className="mt-4 flex items-center gap-4 text-saffron-200 text-sm">
 <span className="flex items-center gap-1">
 <MapPin className="w-4 h-4" />
 Delhi, India
 </span>
 <span className="flex items-center gap-1">
 <Calendar className="w-4 h-4" />
 Chaitra-Vaishakha, Vikram Samvat 2083
 </span>
 </div>
 </div>
 </section>

 <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
 {/* Left Column - Today's Panchang */}
 <div className="lg:col-span-2 space-y-6">
 <Suspense
 fallback={
 <div className="space-y-6 animate-pulse">
 <div className="bg-white rounded-xl p-6 border border-surface-100">
 <div className="h-8 bg-surface-200 rounded w-3/4 mb-4" />
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <div
 key={i}
 className="h-24 bg-surface-100 rounded-xl"
 />
 ))}
 </div>
 </div>
 </div>
 }
 >
 <PanchangDetailsSection dateOffset={dateOffset} />
 </Suspense>
 </div>

 {/* Right Column - Calendar & Upcoming */}
 <div className="space-y-6">
 {/* Mini Calendar */}
 <div className="bg-white rounded-xl p-6 border border-surface-100">
 <div className="flex items-center justify-between mb-4">
 <h3 className="font-semibold text-surface-800">April 2026</h3>
 <div className="flex items-center gap-1">
 <button className="p-1.5 hover:bg-surface-50 rounded-lg">
 <ChevronLeft className="w-4 h-4 text-surface-400" />
 </button>
 <button className="p-1.5 hover:bg-surface-50 rounded-lg">
 <ChevronRight className="w-4 h-4 text-surface-400" />
 </button>
 </div>
 </div>

 {/* Day headers */}
 <div className="grid grid-cols-7 gap-1 mb-2">
 {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
 <div
 key={d}
 className="text-center text-xs font-semibold text-surface-400 py-1"
 >
 {d}
 </div>
 ))}
 </div>

 {/* Calendar grid */}
 <div className="grid grid-cols-7 gap-1">
 {calendarDays.map((d, i) => (
 <button
 key={i}
 className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-colors ${
 d.isToday
 ? 'bg-saffron-600 text-white font-bold'
 : d.month !== 'current'
 ? 'text-surface-300'
 : d.festival
 ? 'bg-saffron-50 text-saffron-700 font-medium'
 : d.vrat
 ? 'bg-amber-50 text-amber-700'
 : 'text-surface-600 hover:bg-surface-50'
 }`}
 >
 {d.day}
 {(d.festival || d.vrat) && !d.isToday && (
 <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-saffron-500" />
 )}
 </button>
 ))}
 </div>

 {/* Legend */}
 <div className="mt-4 flex flex-wrap gap-3 text-xs text-surface-500">
 <span className="flex items-center gap-1">
 <span className="w-2 h-2 bg-saffron-600 rounded-full" />
 Today
 </span>
 <span className="flex items-center gap-1">
 <span className="w-2 h-2 bg-saffron-200 rounded-full" />
 Festival
 </span>
 <span className="flex items-center gap-1">
 <span className="w-2 h-2 bg-amber-200 rounded-full" />
 Vrat
 </span>
 </div>
 </div>

 {/* Upcoming Festivals */}
 <Suspense
 fallback={
 <div className="bg-white rounded-xl p-6 border border-surface-100 animate-pulse">
 <div className="h-5 bg-surface-200 rounded w-48 mb-4" />
 <div className="space-y-4">
 {Array.from({ length: 4 }).map((_, i) => (
 <div key={i} className="h-14 bg-surface-100 rounded" />
 ))}
 </div>
 </div>
 }
 >
 <FestivalsSidebar />
 </Suspense>

 {/* Notification CTA */}
 <div className="bg-gradient-to-br from-saffron-500 to-temple-gold rounded-xl p-6 text-white">
 <Bell className="w-8 h-8 mb-3 opacity-80" />
 <h3 className="font-bold text-lg mb-2">
 Panchang Notifications
 </h3>
 <p className="text-sm text-saffron-100 mb-4">
 Get daily panchang, shubh muhurat alerts, and festival reminders
 straight to your phone.
 </p>
 <button className="w-full py-2.5 bg-white text-saffron-700 font-medium text-sm rounded-lg hover:bg-saffron-50 transition-colors">
 Enable Notifications
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
