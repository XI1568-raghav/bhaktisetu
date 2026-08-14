'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
 Star,
 ChevronLeft,
 Sparkles,
 ArrowRight,
 Briefcase,
 Heart,
 Activity,
 Calendar,
 Compass,
 Flame,
 Globe,
} from 'lucide-react';
import { RASHIS, type RashiInfo } from '../../../lib/rashis';
import { DateInput } from '../../../components/ui/DateInput';

type DailyHoroscope = RashiInfo;

// Horoscope data sourced from lib/rashis.ts (shared with server pages).

const horoscopes: DailyHoroscope[] = RASHIS;

// Date-based rotation for dynamic feel

function getDateSeed(dateStr: string): number {
 // Create a deterministic seed from the date string
 let hash = 0;
 for (let i = 0; i < dateStr.length; i++) {
 hash = ((hash << 5) - hash) + dateStr.charCodeAt(i);
 hash |= 0;
 }
 return Math.abs(hash);
}

function rotateHoroscopes(dateStr: string): DailyHoroscope[] {
 const seed = getDateSeed(dateStr);
 const directions = ['East', 'West', 'North', 'South', 'Northeast', 'Northwest', 'Southeast', 'Southwest'];
 return horoscopes.map((h, idx) => {
 // Rotate lucky number based on date
 const numOffset = (seed + idx * 7) % 12 + 1;
 // Rotate rating based on date
 const ratingOffset = (seed + idx * 3) % 3;
 const newRating = Math.max(3, Math.min(5, h.overallRating + ratingOffset - 1));

 const colors = ['Red', 'Blue', 'Green', 'Gold', 'White', 'Yellow', 'Pink', 'Orange', 'Purple', 'Silver', 'Maroon', 'Saffron'];
 const colorIdx = (seed + idx * 5) % colors.length;
 const dirIdx = (seed + idx * 4) % directions.length;

 return {
 ...h,
 luckyNumber: numOffset,
 luckyColor: colors[colorIdx]!,
 luckyDirection: directions[dirIdx]!,
 overallRating: newRating,
 };
 });
}

// Page Component

export default function HoroscopePage() {
 const [expandedRashi, setExpandedRashi] = useState<string | null>(null);
 const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]!);

 function renderStars(rating: number) {
 return (
 <div className="flex items-center gap-0.5">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 className={`w-3.5 h-3.5 ${
 star <= rating
 ? 'fill-amber-400 text-amber-400'
 : 'fill-surface-200 text-surface-200'
 }`}
 />
 ))}
 </div>
 );
 }

 // Color mapping for rashi cards
 const rashiColors: Record<string, string> = {
 aries: 'from-red-50 to-orange-50 border-red-200/50',
 taurus: 'from-emerald-50 to-green-50 border-emerald-200/50',
 gemini: 'from-yellow-50 to-amber-50 border-yellow-200/50',
 cancer: 'from-surface-50 to-amber-50/30 border-surface-200/50',
 leo: 'from-amber-50 to-orange-50 border-amber-200/50',
 virgo: 'from-green-50 to-emerald-50 border-green-200/50',
 libra: 'from-pink-50 to-rose-50 border-pink-200/50',
 scorpio: 'from-red-50 to-rose-50 border-red-200/50',
 sagittarius: 'from-saffron-50 to-violet-50 border-saffron-200/50',
 capricorn: 'from-surface-50 to-amber-50 border-surface-200/50',
 aquarius: 'from-blue-50 to-saffron-50 border-blue-200/50',
 pisces: 'from-teal-50 to-cyan-50 border-teal-200/50',
 };

 return (
 <div className="min-h-[100dvh]">
 {/* Header */}
 <section className="bg-[#ede9e3]">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 pt-6 pb-8">
 <Link
 href="/astrology"
 className="inline-flex items-center gap-1.5 text-sm text-surface-500 hover:text-surface-800 transition-colors mb-6"
 >
 <ChevronLeft className="w-4 h-4" />
 Back to Astrology
 </Link>

 <div className="text-center pb-4">
 <h1 className="text-3xl md:text-4xl font-bold text-surface-800 mb-3">
 Daily Horoscope
 </h1>
 <p className="text-surface-500 max-w-xl mx-auto mb-6">
 Read today&apos;s predictions for all 12 rashis. Get insights on career, love, health, mantras, and lucky directions.
 </p>

 {/* Date Selector */}
 <div className="inline-flex items-center gap-2 bg-white border border-surface-200 rounded-xl px-4 py-2">
 <Calendar className="w-4 h-4 text-saffron-500" />
 <DateInput value={selectedDate} onChange={(v) => setSelectedDate(v)} />
 </div>
 </div>
 </div>
 </section>

 {/* Rashi Grid */}
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
 {rotateHoroscopes(selectedDate).map((h) => {
 const isExpanded = expandedRashi === h.rashi;
 return (
 <div
 key={h.rashi}
 className={`bg-gradient-to-br ${rashiColors[h.rashi] || 'from-surface-50 to-white border-surface-200/50'} border rounded-xl overflow-hidden transition-all duration-300 ${
 isExpanded ? 'sm:col-span-2 lg:col-span-2 xl:col-span-2 shadow-lg' : 'hover:shadow-md hover:-translate-y-0.5'
 }`}
 >
 <div
 className="p-5 cursor-pointer"
 onClick={() => setExpandedRashi(isExpanded ? null : h.rashi)}
 >
 {/* Rashi Header */}
 <div className="flex items-start justify-between mb-3">
 <div className="flex items-center gap-3">
 <span className="text-3xl">{h.symbol}</span>
 <div>
 <h3 className="text-base font-bold text-surface-800">
 {h.rashiEnglish}
 </h3>
 <p className="text-xs text-surface-500 font-medium">{h.rashiHindi}</p>
 </div>
 </div>
 <div className="text-right">
 {renderStars(h.overallRating)}
 <p className="text-xs text-surface-400 mt-0.5">{h.rulingPlanet}</p>
 </div>
 </div>

 {/* Brief Prediction */}
 <p className={`text-sm text-surface-600 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
 {h.prediction}
 </p>

 {/* Lucky Info */}
 <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-surface-500">
 <span>
 Lucky #: <span className="font-bold text-surface-700">{h.luckyNumber}</span>
 </span>
 <span>
 Color: <span className="font-bold text-surface-700">{h.luckyColor}</span>
 </span>
 <span className="flex items-center gap-0.5">
 <Compass className="w-3 h-3" />
 <span className="font-bold text-surface-700">{h.luckyDirection}</span>
 </span>
 </div>

 {/* Element badge */}
 <div className="flex items-center gap-2 mt-2">
 <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-white/60 text-surface-600">
 <Flame className="w-2.5 h-2.5" />
 {h.element}
 </span>
 </div>
 </div>

 {/* Expanded Details */}
 {isExpanded && (
 <div className="px-5 pb-5 space-y-4 border-t border-surface-200/50 pt-4">
 {/* Mantra Section */}
 <div className="bg-gradient-to-r from-saffron-50 to-amber-50 rounded-xl p-4 border border-saffron-100">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-7 h-7 bg-saffron-100 rounded-lg flex items-center justify-center">
 <Globe className="w-3.5 h-3.5 text-saffron-600" />
 </div>
 <h4 className="text-sm font-bold text-surface-800">Daily Mantra</h4>
 </div>
 <p className="text-sm font-medium text-saffron-800 mb-1">{h.mantra}</p>
 <p className="text-sm text-saffron-700 font-devanagari">{h.mantraHindi}</p>
 <p className="text-xs text-surface-500 mt-2">
 Chant 108 times daily for best results. Ruling Planet: {h.rulingPlanet}
 </p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
 {/* Career */}
 <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-7 h-7 bg-saffron-100 rounded-lg flex items-center justify-center">
 <Briefcase className="w-3.5 h-3.5 text-saffron-600" />
 </div>
 <h4 className="text-sm font-bold text-surface-800">Career</h4>
 </div>
 <p className="text-xs text-surface-600 leading-relaxed">{h.career}</p>
 </div>

 {/* Love */}
 <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-7 h-7 bg-pink-100 rounded-lg flex items-center justify-center">
 <Heart className="w-3.5 h-3.5 text-pink-600" />
 </div>
 <h4 className="text-sm font-bold text-surface-800">Love</h4>
 </div>
 <p className="text-xs text-surface-600 leading-relaxed">{h.love}</p>
 </div>

 {/* Health */}
 <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4">
 <div className="flex items-center gap-2 mb-2">
 <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
 <Activity className="w-3.5 h-3.5 text-emerald-600" />
 </div>
 <h4 className="text-sm font-bold text-surface-800">Health</h4>
 </div>
 <p className="text-xs text-surface-600 leading-relaxed">{h.health}</p>
 </div>
 </div>

 {/* Lucky Details Row */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 <div className="bg-white/60 rounded-lg p-3 text-center">
 <p className="text-xs text-surface-400 uppercase tracking-wide">Lucky Number</p>
 <p className="text-lg font-bold text-surface-800">{h.luckyNumber}</p>
 </div>
 <div className="bg-white/60 rounded-lg p-3 text-center">
 <p className="text-xs text-surface-400 uppercase tracking-wide">Lucky Color</p>
 <p className="text-sm font-bold text-surface-800">{h.luckyColor}</p>
 </div>
 <div className="bg-white/60 rounded-lg p-3 text-center">
 <p className="text-xs text-surface-400 uppercase tracking-wide">Direction</p>
 <p className="text-sm font-bold text-surface-800 flex items-center justify-center gap-1">
 <Compass className="w-3.5 h-3.5 text-saffron-500" />
 {h.luckyDirection}
 </p>
 </div>
 <div className="bg-white/60 rounded-lg p-3 text-center">
 <p className="text-xs text-surface-400 uppercase tracking-wide">Element</p>
 <p className="text-sm font-bold text-surface-800 flex items-center justify-center gap-1">
 <Flame className="w-3.5 h-3.5 text-orange-500" />
 {h.element}
 </p>
 </div>
 </div>

 <div className="text-center pt-2 space-y-2">
 <Link
 href={`/astrology/horoscope/${h.rashi}`}
 className="inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-700 hover:text-saffron-800 transition-colors"
 >
 Full {h.rashiEnglish} page + recommended pujas <ArrowRight className="w-4 h-4" />
 </Link>
 <div>
 <Link
 href="/astrology/chat"
 className="inline-flex items-center gap-1.5 text-sm font-semibold text-saffron-600 hover:text-saffron-700 transition-colors"
 >
 Ask AI Astrologer for Detailed Reading <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 </div>
 </div>
 )}
 </div>
 );
 })}
 </div>

 {/* Bottom CTA */}
 <div className="mt-10 bg-surface-800 rounded-xl p-8 text-center">
 <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-3" />
 <h3 className="text-xl font-bold text-white mb-2">
 Get Personalized Predictions
 </h3>
 <p className="text-surface-400 max-w-md mx-auto mb-5">
 Daily horoscopes are general. For predictions tailored to your birth chart, try our AI Astrologer or consult a verified astrologer.
 </p>
 <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
 <Link
 href="/astrology/chat"
 className="inline-flex items-center gap-2 px-6 py-3 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-all shadow-md"
 >
 Ask AI Astrologer <ArrowRight className="w-4 h-4" />
 </Link>
 <Link
 href="/astrology/kundli"
 className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 text-white font-medium rounded-lg hover:bg-white/20 transition-all"
 >
 Generate Free Kundli
 </Link>
 <Link
 href="/free-pandit-advice"
 className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600/90 text-white font-medium rounded-lg hover:bg-emerald-600 transition-all"
 >
 Free Pandit Advice
 </Link>
 </div>
 </div>
 </div>
 </div>
 );
}
