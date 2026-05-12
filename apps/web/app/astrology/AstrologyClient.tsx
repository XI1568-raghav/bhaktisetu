'use client';

import { useState, useEffect } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getAstrologerImage } from '../../lib/images';
import {
 Star,
 Moon,
 Sun,
 Sparkles,
 MessageCircle,
 Phone,
 Video,
 Shield,
 Clock,
 Users,
 Lock,
 ChevronRight,
 Search,
 Filter,
 Zap,
 Heart,
 Brain,
 Eye,
 ArrowRight,
 BadgeCheck,
 Globe,
 Award,
 Compass,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Astrologer {
 id: string;
 name: string;
 photo: string;
 specializations: string[];
 languages: string[];
 experienceYears: number;
 rating: number;
 reviewCount: number;
 consultationCount: number;
 perMinuteRate: number;
 isOnline: boolean;
 isBusy: boolean;
 bio: string;
 verified: boolean;
 badges: string[];
}

interface DailyHoroscope {
 rashi: string;
 rashiHindi: string;
 rashiEnglish: string;
 symbol: string;
 prediction: string;
 luckyNumber: number;
 luckyColor: string;
 luckyDirection: string;
 mantra: string;
 mantraHindi: string;
 rulingPlanet: string;
 element: string;
 overallRating: number;
}

// ─── Hardcoded Fallback Data ──────────────────────────────────────────────────

const fallbackAstrologers: Astrologer[] = [
 {
 id: 'astro_001',
 name: 'Pt. Raghunath Sharma',
 photo: getAstrologerImage('male', 0),
 specializations: ['Vedic Astrology', 'Prashna Kundli', 'Nadi Astrology'],
 languages: ['Hindi', 'English', 'Sanskrit'],
 experienceYears: 25,
 rating: 4.9,
 reviewCount: 12450,
 consultationCount: 34200,
 perMinuteRate: 50,
 isOnline: true,
 isBusy: false,
 bio: 'Renowned Jyotish Acharya with 25 years of experience.',
 verified: true,
 badges: ['Top Rated', '10K+ Consults'],
 },
 {
 id: 'astro_002',
 name: 'Dr. Meera Devi',
 photo: getAstrologerImage('female', 1),
 specializations: ['Tarot Reading', 'Numerology', 'Vedic Astrology'],
 languages: ['Hindi', 'English', 'Gujarati'],
 experienceYears: 15,
 rating: 4.8,
 reviewCount: 8920,
 consultationCount: 22100,
 perMinuteRate: 40,
 isOnline: true,
 isBusy: false,
 bio: 'Gifted Tarot reader and Numerologist with PhD in Astro-Sciences.',
 verified: true,
 badges: ['Top Rated', 'Quick Response'],
 },
 {
 id: 'astro_003',
 name: 'Acharya Vikram Joshi',
 photo: getAstrologerImage('male', 2),
 specializations: ['Vedic Astrology', 'Vastu', 'KP Astrology'],
 languages: ['Hindi', 'English', 'Marathi'],
 experienceYears: 20,
 rating: 4.7,
 reviewCount: 6540,
 consultationCount: 18500,
 perMinuteRate: 60,
 isOnline: true,
 isBusy: true,
 bio: 'Master of KP Astrology and Vastu Shastra.',
 verified: true,
 badges: ['Top Rated', '10K+ Consults'],
 },
 {
 id: 'astro_004',
 name: 'Jyotishi Sunita Patel',
 photo: getAstrologerImage('female', 3),
 specializations: ['Palmistry', 'Numerology', 'Tarot Reading'],
 languages: ['Hindi', 'Gujarati', 'English'],
 experienceYears: 12,
 rating: 4.6,
 reviewCount: 4320,
 consultationCount: 11800,
 perMinuteRate: 25,
 isOnline: true,
 isBusy: false,
 bio: 'Unique blend of Palmistry and Numerology.',
 verified: true,
 badges: ['Quick Response'],
 },
 {
 id: 'astro_005',
 name: 'Pt. Devendra Mishra',
 photo: getAstrologerImage('male', 1),
 specializations: ['Vedic Astrology', 'Nadi Astrology', 'Prashna Kundli'],
 languages: ['Hindi', 'English', 'Tamil'],
 experienceYears: 30,
 rating: 4.9,
 reviewCount: 15600,
 consultationCount: 41000,
 perMinuteRate: 80,
 isOnline: false,
 isBusy: false,
 bio: 'One of India\'s most respected Nadi Astrologers.',
 verified: true,
 badges: ['Top Rated', '10K+ Consults', 'Quick Response'],
 },
 {
 id: 'astro_006',
 name: 'Tarot Priya Singh',
 photo: getAstrologerImage('female', 0),
 specializations: ['Tarot Reading', 'Numerology'],
 languages: ['Hindi', 'English', 'Punjabi'],
 experienceYears: 8,
 rating: 4.5,
 reviewCount: 3210,
 consultationCount: 8900,
 perMinuteRate: 20,
 isOnline: true,
 isBusy: false,
 bio: 'Young and intuitive Tarot card reader.',
 verified: true,
 badges: ['Quick Response'],
 },
 {
 id: 'astro_007',
 name: 'Acharya Ramesh Iyer',
 photo: getAstrologerImage('male', 3),
 specializations: ['KP Astrology', 'Vedic Astrology', 'Vastu'],
 languages: ['Hindi', 'English', 'Tamil', 'Kannada'],
 experienceYears: 22,
 rating: 4.8,
 reviewCount: 9100,
 consultationCount: 25600,
 perMinuteRate: 55,
 isOnline: true,
 isBusy: false,
 bio: 'KP Astrology specialist from Vaitheeswaran Koil lineage.',
 verified: true,
 badges: ['Top Rated', '10K+ Consults'],
 },
 {
 id: 'astro_008',
 name: 'Dr. Kavita Reddy',
 photo: getAstrologerImage('female', 2),
 specializations: ['Vastu', 'Vedic Astrology', 'Numerology'],
 languages: ['Hindi', 'English', 'Telugu'],
 experienceYears: 18,
 rating: 4.7,
 reviewCount: 5840,
 consultationCount: 15200,
 perMinuteRate: 45,
 isOnline: true,
 isBusy: true,
 bio: 'Doctorate in Vastu Shastra combined with Vedic Astrology.',
 verified: true,
 badges: ['Top Rated'],
 },
];

const fallbackHoroscopes: DailyHoroscope[] = [
 { rashi: 'aries', rashiHindi: 'मेष', rashiEnglish: 'Aries', symbol: '', prediction: 'A day of new beginnings and fresh energy. Trust your instincts.', luckyNumber: 9, luckyColor: 'Red', luckyDirection: 'East', mantra: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah', mantraHindi: 'ओम क्रां क्रीं क्रौं सः भौमाय नमः', rulingPlanet: 'Mars (Mangal)', element: 'Fire (Agni)', overallRating: 4 },
 { rashi: 'taurus', rashiHindi: 'वृषभ', rashiEnglish: 'Taurus', symbol: '', prediction: 'Financial matters take center stage. Family brings joy.', luckyNumber: 6, luckyColor: 'Green', luckyDirection: 'Southeast', mantra: 'Om Draam Dreem Draum Sah Shukraya Namah', mantraHindi: 'ओम द्रां द्रीं द्रौं सः शुक्राय नमः', rulingPlanet: 'Venus (Shukra)', element: 'Earth (Prithvi)', overallRating: 3 },
 { rashi: 'gemini', rashiHindi: 'मिथुन', rashiEnglish: 'Gemini', symbol: '', prediction: 'Communication skills peak today. Express yourself freely.', luckyNumber: 5, luckyColor: 'Yellow', luckyDirection: 'North', mantra: 'Om Braam Breem Braum Sah Budhaya Namah', mantraHindi: 'ओम ब्रां ब्रीं ब्रौं सः बुधाय नमः', rulingPlanet: 'Mercury (Budh)', element: 'Air (Vayu)', overallRating: 4 },
 { rashi: 'cancer', rashiHindi: 'कर्क', rashiEnglish: 'Cancer', symbol: '', prediction: 'Home and family matters need attention. Creative pursuits shine.', luckyNumber: 2, luckyColor: 'White', luckyDirection: 'Northwest', mantra: 'Om Shraam Shreem Shraum Sah Chandraya Namah', mantraHindi: 'ओम श्रां श्रीं श्रौं सः चंद्राय नमः', rulingPlanet: 'Moon (Chandra)', element: 'Water (Jal)', overallRating: 3 },
 { rashi: 'leo', rashiHindi: 'सिंह', rashiEnglish: 'Leo', symbol: '', prediction: 'Leadership qualities shine bright. A celebration brings happiness.', luckyNumber: 1, luckyColor: 'Gold', luckyDirection: 'East', mantra: 'Om Hraam Hreem Hraum Sah Suryaya Namah', mantraHindi: 'ओम ह्रां ह्रीं ह्रौं सः सूर्याय नमः', rulingPlanet: 'Sun (Surya)', element: 'Fire (Agni)', overallRating: 5 },
 { rashi: 'virgo', rashiHindi: 'कन्या', rashiEnglish: 'Virgo', symbol: '', prediction: 'Attention to detail pays off. Health improvements noticed.', luckyNumber: 7, luckyColor: 'Green', luckyDirection: 'South', mantra: 'Om Braam Breem Braum Sah Budhaya Namah', mantraHindi: 'ओम ब्रां ब्रीं ब्रौं सः बुधाय नमः', rulingPlanet: 'Mercury (Budh)', element: 'Earth (Prithvi)', overallRating: 4 },
 { rashi: 'libra', rashiHindi: 'तुला', rashiEnglish: 'Libra', symbol: '', prediction: 'Balance and harmony define your day. Partnerships flourish.', luckyNumber: 6, luckyColor: 'Pink', luckyDirection: 'West', mantra: 'Om Draam Dreem Draum Sah Shukraya Namah', mantraHindi: 'ओम द्रां द्रीं द्रौं सः शुक्राय नमः', rulingPlanet: 'Venus (Shukra)', element: 'Air (Vayu)', overallRating: 4 },
 { rashi: 'scorpio', rashiHindi: 'वृश्चिक', rashiEnglish: 'Scorpio', symbol: '', prediction: 'Transformation and deep insights. Your intuition is strong.', luckyNumber: 8, luckyColor: 'Maroon', luckyDirection: 'North', mantra: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah', mantraHindi: 'ओम क्रां क्रीं क्रौं सः भौमाय नमः', rulingPlanet: 'Mars (Mangal)', element: 'Water (Jal)', overallRating: 3 },
 { rashi: 'sagittarius', rashiHindi: 'धनु', rashiEnglish: 'Sagittarius', symbol: '', prediction: 'Adventure and learning highlighted. Foreign connections bring news.', luckyNumber: 3, luckyColor: 'Purple', luckyDirection: 'Northeast', mantra: 'Om Graam Greem Graum Sah Gurave Namah', mantraHindi: 'ओम ग्रां ग्रीं ग्रौं सः गुरवे नमः', rulingPlanet: 'Jupiter (Guru)', element: 'Fire (Agni)', overallRating: 4 },
 { rashi: 'capricorn', rashiHindi: 'मकर', rashiEnglish: 'Capricorn', symbol: '', prediction: 'Career ambitions get a major boost. Hard work pays off.', luckyNumber: 10, luckyColor: 'Brown', luckyDirection: 'West', mantra: 'Om Praam Preem Praum Sah Shanaischaraya Namah', mantraHindi: 'ओम प्रां प्रीं प्रौं सः शनैश्चराय नमः', rulingPlanet: 'Saturn (Shani)', element: 'Earth (Prithvi)', overallRating: 5 },
 { rashi: 'aquarius', rashiHindi: 'कुम्भ', rashiEnglish: 'Aquarius', symbol: '', prediction: 'Innovation and social connections thrive. A unique idea impresses.', luckyNumber: 11, luckyColor: 'Electric Blue', luckyDirection: 'Southwest', mantra: 'Om Praam Preem Praum Sah Shanaischaraya Namah', mantraHindi: 'ओम प्रां प्रीं प्रौं सः शनैश्चराय नमः', rulingPlanet: 'Saturn (Shani)', element: 'Air (Vayu)', overallRating: 4 },
 { rashi: 'pisces', rashiHindi: 'मीन', rashiEnglish: 'Pisces', symbol: '', prediction: 'Spiritual awareness and creativity peak. Dreams carry messages.', luckyNumber: 12, luckyColor: 'Sea Green', luckyDirection: 'Northeast', mantra: 'Om Graam Greem Graum Sah Gurave Namah', mantraHindi: 'ओम ग्रां ग्रीं ग्रौं सः गुरवे नमः', rulingPlanet: 'Jupiter (Guru)', element: 'Water (Jal)', overallRating: 4 },
];

const specializations = [
 'All',
 'Vedic Astrology',
 'Tarot Reading',
 'Numerology',
 'Vastu',
 'KP Astrology',
 'Palmistry',
 'Nadi Astrology',
];

const sortOptions = [
 { value: '', label: 'Relevance' },
 { value: 'rating', label: 'Top Rated' },
 { value: 'price', label: 'Price: Low to High' },
 { value: 'experience', label: 'Most Experienced' },
];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AstrologyPage() {
 const router = useRouter();
 const pathname = usePathname();
 const searchParams = useSearchParams();

 const [astrologers, setAstrologers] = useState<Astrologer[]>(fallbackAstrologers);
 const [horoscopes] = useState<DailyHoroscope[]>(fallbackHoroscopes);
 const [activeFilter, setActiveFilter] = useState(() => searchParams.get('filter') || 'All');
 const [sortBy, setSortBy] = useState(() => searchParams.get('sort') || '');
 const [selectedRashi, setSelectedRashi] = useState<string | null>(() => searchParams.get('rashi'));
 const [showOnlineOnly, setShowOnlineOnly] = useState(() => searchParams.get('online') === '1');

 useEffect(() => {
  const params = new URLSearchParams();
  if (activeFilter !== 'All') params.set('filter', activeFilter);
  if (sortBy) params.set('sort', sortBy);
  if (selectedRashi) params.set('rashi', selectedRashi);
  if (showOnlineOnly) params.set('online', '1');
  const qs = params.toString();
  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
 }, [activeFilter, sortBy, selectedRashi, showOnlineOnly, pathname, router]);

 // Kundli form
 const [kundliName, setKundliName] = useState('');
 const [kundliDate, setKundliDate] = useState('');
 const [kundliTime, setKundliTime] = useState('');
 const [kundliPlace, setKundliPlace] = useState('');
 const [kundliGenerated, setKundliGenerated] = useState(false);

 // Compatibility form
 const [compatRashi1, setCompatRashi1] = useState('');
 const [compatRashi2, setCompatRashi2] = useState('');
 const [compatScore, setCompatScore] = useState<number | null>(null);

 // Filter astrologers
 const filteredAstrologers = astrologers.filter((a) => {
 if (activeFilter !== 'All' && !a.specializations.includes(activeFilter)) return false;
 if (showOnlineOnly && !a.isOnline) return false;
 return true;
 }).sort((a, b) => {
 if (sortBy === 'rating') return b.rating - a.rating;
 if (sortBy === 'price') return a.perMinuteRate - b.perMinuteRate;
 if (sortBy === 'experience') return b.experienceYears - a.experienceYears;
 // Default: online first
 if (a.isOnline && !a.isBusy && !(b.isOnline && !b.isBusy)) return -1;
 if (b.isOnline && !b.isBusy && !(a.isOnline && !a.isBusy)) return 1;
 return b.rating - a.rating;
 });

 function getStatusColor(astrologer: Astrologer) {
 if (astrologer.isOnline && !astrologer.isBusy) return 'bg-emerald-400';
 if (astrologer.isOnline && astrologer.isBusy) return 'bg-amber-400';
 return 'bg-surface-400';
 }

 function getStatusText(astrologer: Astrologer) {
 if (astrologer.isOnline && !astrologer.isBusy) return 'Online';
 if (astrologer.isOnline && astrologer.isBusy) return 'Busy';
 return 'Offline';
 }

 function handleGenerateKundli() {
 if (kundliName && kundliDate && kundliTime && kundliPlace) {
 setKundliGenerated(true);
 }
 }

 function handleCompatibility() {
 if (compatRashi1 && compatRashi2) {
 const seed = (compatRashi1.charCodeAt(0) + compatRashi2.charCodeAt(0)) % 30;
 setCompatScore(Math.min(98, 55 + seed + ((compatRashi1.length + compatRashi2.length) % 20)));
 }
 }

 function renderStars(rating: number) {
 return (
 <div className="flex items-center gap-0.5">
 {[1, 2, 3, 4, 5].map((star) => (
 <Star
 key={star}
 className={`w-3.5 h-3.5 ${
 star <= Math.round(rating)
 ? 'fill-amber-400 text-amber-400'
 : 'fill-surface-200 text-surface-200'
 }`}
 />
 ))}
 </div>
 );
 }

 return (
 <div className="min-h-screen">
 {/* ── Hero Section ─────────────────────────────────────────────────────── */}
 <section className="bg-[#ede9e3]">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-24">
 <div className="text-center">
 {/* Promo badge */}
 <div className="inline-flex items-center gap-2 bg-saffron-100 border border-saffron-200 rounded-full px-5 py-2 mb-6">
 <Sparkles className="w-4 h-4 text-saffron-600" />
 <span className="text-sm font-semibold text-saffron-700">First 5 Minutes FREE</span>
 </div>

 <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-surface-800 mb-5 leading-tight">
 Connect with India&apos;s<br />
 <span className="text-[var(--color-primary)]">
 Top Astrologers
 </span>
 </h1>
 <p className="text-lg text-surface-500 max-w-2xl mx-auto mb-10 leading-relaxed">
 Get accurate predictions, personalized remedies, and spiritual guidance from
 verified astrologers. Available 24/7 via chat, call, or video.
 </p>

 {/* Feature Cards */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
 {/* AI Astrologer Card */}
 <Link
 href="/astrology/chat"
 className="group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 text-left hover:-translate-y-0.5 hover:shadow-md transition-all duration-300"
 >
 <div className="w-12 h-12 bg-saffron-600/15 rounded-xl flex items-center justify-center mb-4">
 <Brain className="w-6 h-6 text-saffron-600" />
 </div>
 <h3 className="text-lg font-bold text-surface-800 mb-2">AI Astrologer</h3>
 <p className="text-sm text-surface-500 mb-3">
 Free consultation, kundli analysis, remedies, and predictions
 </p>
 <div className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-600">
 Free Consultation <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </div>
 </Link>

 {/* Live Consultation Card */}
 <div className="group relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 text-left hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 cursor-pointer">
 <div className="w-12 h-12 bg-saffron-600 rounded-xl flex items-center justify-center mb-4">
 <MessageCircle className="w-6 h-6 text-white" />
 </div>
 <h3 className="text-lg font-bold text-surface-800 mb-2">Live Consultation</h3>
 <p className="text-sm text-surface-500 mb-3">
 Chat with verified astrologers for personalized guidance
 </p>
 <div className="inline-flex items-center gap-1 text-sm font-semibold text-saffron-600">
 From Rs. 10/min <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
 </div>
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* ── Online Astrologers Section ──────────────────────────────────────── */}
 <section className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-12 lg:py-16">
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
 <div>
 <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight text-surface-800">
 Talk to Astrologers
 </h2>
 <p className="text-surface-500 mt-1">
 {filteredAstrologers.filter(a => a.isOnline && !a.isBusy).length} astrologers online now
 </p>
 </div>
 <div className="flex items-center gap-3">
 <label className="flex items-center gap-2 text-sm text-surface-600 cursor-pointer">
 <input
 type="checkbox"
 checked={showOnlineOnly}
 onChange={(e) => setShowOnlineOnly(e.target.checked)}
 className="w-4 h-4 rounded border-surface-300 text-saffron-600 focus:ring-saffron-400"
 />
 Online only
 </label>
 <select
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value)}
 className="text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white text-surface-700 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400"
 >
 {sortOptions.map((opt) => (
 <option key={opt.value} value={opt.value}>{opt.label}</option>
 ))}
 </select>
 </div>
 </div>

 {/* Specialization Filter Pills */}
 <div className="flex flex-wrap gap-2 mb-8">
 {specializations.map((spec) => (
 <button
 key={spec}
 onClick={() => setActiveFilter(spec)}
 className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
 activeFilter === spec
 ? 'bg-saffron-600 text-white shadow-md'
 : 'bg-white text-surface-600 border border-surface-200 hover:border-saffron-300 hover:text-saffron-600'
 }`}
 >
 {spec}
 </button>
 ))}
 </div>

 {/* Astrologer Cards Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
 {filteredAstrologers.map((astrologer) => (
 <Link
 key={astrologer.id}
 href={`/astrology/${astrologer.id}`}
 className="group bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden card-hover transition-all duration-300"
 >
 {/* Card Header */}
 <div className="relative p-4 pb-3">
 <div className="flex items-start gap-3">
 {/* Photo */}
 <div className="relative shrink-0">
 <img
 src={astrologer.photo}
 alt={astrologer.name}
 className="w-16 h-16 rounded-xl object-cover"
 />
 {/* Status dot */}
 <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 ${getStatusColor(astrologer)} rounded-full border-2 border-white`} />
 </div>

 {/* Info */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-1.5 mb-0.5">
 <h3 className="text-sm font-bold text-surface-800 truncate">
 {astrologer.name}
 </h3>
 {astrologer.verified && (
 <BadgeCheck className="w-4 h-4 text-saffron-600 shrink-0" />
 )}
 </div>
 <div className="flex items-center gap-1.5 mb-1">
 {renderStars(astrologer.rating)}
 <span className="text-xs text-surface-500">
 {astrologer.rating} ({astrologer.reviewCount.toLocaleString()})
 </span>
 </div>
 <p className="text-xs text-surface-500">
 {astrologer.experienceYears} yrs exp | {astrologer.languages.slice(0, 2).join(', ')}
 </p>
 </div>
 </div>

 {/* Badges */}
 {astrologer.badges.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-2.5">
 {astrologer.badges.map((badge) => (
 <span
 key={badge}
 className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/60"
 >
 {badge}
 </span>
 ))}
 </div>
 )}
 </div>

 {/* Specializations */}
 <div className="px-4 pb-3">
 <div className="flex flex-wrap gap-1">
 {astrologer.specializations.slice(0, 3).map((spec) => (
 <span
 key={spec}
 className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-saffron-50 text-saffron-600"
 >
 {spec}
 </span>
 ))}
 </div>
 </div>

 {/* Footer */}
 <div className="px-4 pb-4 flex items-center justify-between">
 <div className="text-sm font-bold text-surface-800">
 <span className="text-lg">{'₹'}{astrologer.perMinuteRate}</span>
 <span className="text-xs font-normal text-surface-400">/min</span>
 </div>
 <span
 className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
 astrologer.isOnline && !astrologer.isBusy
 ? 'bg-saffron-600 text-white shadow-sm group-hover:shadow-md group-hover:bg-saffron-700'
 : astrologer.isBusy
 ? 'bg-surface-200 text-surface-500'
 : 'bg-surface-100 text-surface-400'
 }`}
 >
 {astrologer.isOnline && !astrologer.isBusy
 ? 'Chat Now'
 : astrologer.isBusy
 ? 'Busy'
 : 'Offline'}
 </span>
 </div>
 </Link>
 ))}
 </div>
 </section>

 {/* ── AI Features Section (Free Tools) ────────────────────────────────── */}
 <section className="bg-[#ede9e3] py-12 lg:py-16">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
 <div className="text-center mb-10">
 <div className="inline-flex items-center gap-2 bg-saffron-100 border border-saffron-200 rounded-full px-4 py-1.5 mb-4">
 <Sparkles className="w-3.5 h-3.5 text-saffron-600" />
 <span className="text-xs font-bold text-saffron-700 uppercase tracking-wider">Free AI Tools</span>
 </div>
 <h2 className="text-2xl font-semibold text-surface-800 mb-2">
 Explore Your Astrology Blueprint
 </h2>
 <p className="text-surface-500 max-w-xl mx-auto">
 Get instant insights with our AI-powered astrology tools. No registration required.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Free Kundli Card */}
 <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 bg-saffron-600/15 rounded-xl flex items-center justify-center">
 <Sun className="w-5 h-5 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-bold text-surface-800">Free Kundli</h3>
 <p className="text-xs text-surface-500">Birth chart analysis</p>
 </div>
 </div>

 <div className="space-y-3 mb-5">
 <input
 type="text"
 placeholder="Full Name"
 value={kundliName}
 onChange={(e) => setKundliName(e.target.value)}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 />
 <input
 type="date"
 value={kundliDate}
 onChange={(e) => setKundliDate(e.target.value)}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 />
 <input
 type="time"
 value={kundliTime}
 onChange={(e) => setKundliTime(e.target.value)}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 />
 <input
 type="text"
 placeholder="Birth Place"
 value={kundliPlace}
 onChange={(e) => setKundliPlace(e.target.value)}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 placeholder:text-surface-400 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 />
 </div>

 {kundliGenerated ? (
 <div className="bg-saffron-50 rounded-xl p-4 mb-4">
 <p className="text-saffron-700 font-semibold text-sm mb-2">Quick Preview Generated!</p>
 <p className="text-xs text-surface-500 mb-3">
 For full birth chart with planetary positions, dasha periods, and dosha analysis:
 </p>
 <Link href="/astrology/kundli" className="inline-flex items-center gap-1 text-xs text-saffron-600 font-semibold hover:underline">
 Open Full Kundli Generator <ArrowRight className="w-3 h-3" />
 </Link>
 </div>
 ) : (
 <Link
 href="/astrology/kundli"
 className="w-full py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-all text-center block"
 >
 Generate Kundli
 </Link>
 )}
 </div>

 {/* Daily Horoscope Card */}
 <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 bg-saffron-600/15 rounded-xl flex items-center justify-center">
 <Moon className="w-5 h-5 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-bold text-surface-800">Daily Horoscope</h3>
 <p className="text-xs text-surface-500">Today&apos;s prediction</p>
 </div>
 </div>

 <div className="grid grid-cols-4 gap-1.5 mb-4">
 {horoscopes.slice(0, 12).map((h) => (
 <button
 key={h.rashi}
 onClick={() => setSelectedRashi(selectedRashi === h.rashi ? null : h.rashi)}
 className={`flex flex-col items-center py-2 rounded-lg transition-all text-center ${
 selectedRashi === h.rashi
 ? 'bg-saffron-100 border border-saffron-300'
 : 'bg-surface-50 border border-transparent hover:bg-surface-100'
 }`}
 >
 <span className="text-lg leading-none">{h.symbol}</span>
 <span className="text-[9px] text-surface-500 mt-0.5">{h.rashiHindi}</span>
 </button>
 ))}
 </div>

 {selectedRashi ? (
 <div className="bg-saffron-50 rounded-xl p-4">
 {(() => {
 const h = horoscopes.find((hr) => hr.rashi === selectedRashi);
 if (!h) return null;
 return (
 <>
 <div className="flex items-center gap-2 mb-2">
 <span className="text-xl">{h.symbol}</span>
 <div>
 <p className="text-sm font-bold text-surface-800">{h.rashiEnglish}</p>
 <p className="text-[10px] text-surface-500">{h.rashiHindi} &middot; {h.rulingPlanet}</p>
 </div>
 </div>
 <p className="text-xs text-surface-600 leading-relaxed mb-2">{h.prediction}</p>
 {/* Mantra */}
 <div className="bg-white/60 rounded-lg p-2 mb-2">
 <p className="text-[10px] text-surface-400 uppercase tracking-wide mb-0.5">Daily Mantra</p>
 <p className="text-[11px] font-medium text-saffron-700">{h.mantraHindi}</p>
 </div>
 <div className="flex flex-wrap items-center gap-2 text-[10px] text-surface-400">
 <span>Lucky #{h.luckyNumber}</span>
 <span>{h.luckyColor}</span>
 <span className="flex items-center gap-0.5">
 <Compass className="w-2.5 h-2.5" />
 {h.luckyDirection}
 </span>
 <span>{h.element}</span>
 </div>
 </>
 );
 })()}
 </div>
 ) : (
 <p className="text-xs text-surface-400 text-center py-3">
 Select your rashi to see today&apos;s prediction
 </p>
 )}

 <Link
 href="/astrology/horoscope"
 className="inline-flex items-center gap-1 text-xs text-saffron-600 font-semibold mt-3 hover:text-saffron-700 transition-colors"
 >
 View All Horoscopes <ArrowRight className="w-3 h-3" />
 </Link>
 </div>

 {/* Compatibility Match Card */}
 <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300">
 <div className="flex items-center gap-3 mb-5">
 <div className="w-10 h-10 bg-saffron-600/15 rounded-xl flex items-center justify-center">
 <Heart className="w-5 h-5 text-saffron-600" />
 </div>
 <div>
 <h3 className="font-bold text-surface-800">Compatibility Match</h3>
 <p className="text-xs text-surface-500">Rashi matching</p>
 </div>
 </div>

 <div className="space-y-3 mb-5">
 <div>
 <label className="text-xs text-surface-500 mb-1 block">Your Rashi</label>
 <select
 value={compatRashi1}
 onChange={(e) => { setCompatRashi1(e.target.value); setCompatScore(null); }}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 >
 <option value="">Select Rashi</option>
 {horoscopes.map((h) => (
 <option key={h.rashi} value={h.rashi}>
 {h.symbol} {h.rashiEnglish} ({h.rashiHindi})
 </option>
 ))}
 </select>
 </div>
 <div>
 <label className="text-xs text-surface-500 mb-1 block">Partner&apos;s Rashi</label>
 <select
 value={compatRashi2}
 onChange={(e) => { setCompatRashi2(e.target.value); setCompatScore(null); }}
 className="w-full px-3 py-2 bg-surface-50 border border-[var(--color-border)] rounded-xl text-sm text-surface-800 focus:ring-2 focus:ring-saffron-400 focus:border-saffron-400 outline-none"
 >
 <option value="">Select Rashi</option>
 {horoscopes.map((h) => (
 <option key={h.rashi} value={h.rashi}>
 {h.symbol} {h.rashiEnglish} ({h.rashiHindi})
 </option>
 ))}
 </select>
 </div>
 </div>

 {compatScore !== null ? (
 <div className="bg-saffron-50 rounded-xl p-4 text-center mb-4">
 <p className="text-xs text-surface-500 mb-1">Compatibility Score</p>
 <p className="text-xl font-semibold text-saffron-600">
 {compatScore}%
 </p>
 <p className="text-xs text-surface-500 mt-1">
 {compatScore > 75 ? 'Highly Compatible!' : compatScore > 60 ? 'Good Match!' : 'Needs Understanding'}
 </p>
 </div>
 ) : (
 <button
 onClick={handleCompatibility}
 disabled={!compatRashi1 || !compatRashi2}
 className="w-full py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
 >
 Check Compatibility
 </button>
 )}
 </div>
 </div>
 </div>
 </section>

 {/* ── How It Works ─────────────────────────────────────────────────────── */}
 <section className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-12 lg:py-16">
 <div className="text-center mb-10">
 <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight text-surface-800 mb-2">
 How It Works
 </h2>
 <p className="text-surface-500">Get guidance in 4 simple steps</p>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
 {[
 {
 step: 1,
 icon: Search,
 title: 'Choose Astrologer',
 desc: 'Browse profiles, check ratings, specializations, and find the right astrologer for you.',
 },
 {
 step: 2,
 icon: MessageCircle,
 title: 'Start Chat',
 desc: 'Connect instantly via chat, call, or video. First 5 minutes are free for new users.',
 },
 {
 step: 3,
 icon: Eye,
 title: 'Get Guidance',
 desc: 'Receive personalized predictions, remedies, and spiritual guidance from the expert.',
 },
 {
 step: 4,
 icon: Star,
 title: 'Rate & Review',
 desc: 'Share your experience to help others find the best astrologers on the platform.',
 },
 ].map((item) => {
 const Icon = item.icon;
 return (
 <div key={item.step} className="relative text-center group">
 <div className="w-14 h-14 mx-auto bg-saffron-600/15 rounded-xl flex items-center justify-center mb-4">
 <Icon className="w-6 h-6 text-saffron-600" />
 </div>
 <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-2 w-6 h-6 bg-white rounded-full border-2 border-saffron-200 flex items-center justify-center">
 <span className="text-xs font-bold text-saffron-600">{item.step}</span>
 </div>
 <h3 className="text-base font-bold text-surface-800 mb-1.5">{item.title}</h3>
 <p className="text-sm text-surface-500 leading-relaxed">{item.desc}</p>
 </div>
 );
 })}
 </div>
 </section>

 {/* ── Trust Section ────────────────────────────────────────────────────── */}
 <section className="bg-[#ede9e3]">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-12 lg:py-14">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
 {[
 { icon: Users, value: 'Vetted', label: 'Verified Astrologers', color: 'text-saffron-600' },
 { icon: Award, value: 'Selective', label: 'Manual Onboarding', color: 'text-saffron-600' },
 { icon: Clock, value: '24/7', label: 'Available', color: 'text-saffron-600' },
 { icon: Lock, value: '100%', label: 'Private & Secure', color: 'text-saffron-600' },
 ].map((stat) => {
 const Icon = stat.icon;
 return (
 <div key={stat.label}>
 <Icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
 <p className="text-lg font-semibold text-surface-800 mb-1">{stat.value}</p>
 <p className="text-sm text-surface-500">{stat.label}</p>
 </div>
 );
 })}
 </div>
 </div>
 </section>
 </div>
 );
}
