'use client';

import { useState, useEffect } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
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
  { rashi: 'aries', rashiHindi: '\u092E\u0947\u0937', rashiEnglish: 'Aries', symbol: '\u2648', prediction: 'A day of new beginnings and fresh energy. Trust your instincts.', luckyNumber: 9, luckyColor: 'Red', overallRating: 4 },
  { rashi: 'taurus', rashiHindi: '\u0935\u0943\u0937\u092D', rashiEnglish: 'Taurus', symbol: '\u2649', prediction: 'Financial matters take center stage. Family brings joy.', luckyNumber: 6, luckyColor: 'Green', overallRating: 3 },
  { rashi: 'gemini', rashiHindi: '\u092E\u093F\u0925\u0941\u0928', rashiEnglish: 'Gemini', symbol: '\u264A', prediction: 'Communication skills peak today. Express yourself freely.', luckyNumber: 5, luckyColor: 'Yellow', overallRating: 4 },
  { rashi: 'cancer', rashiHindi: '\u0915\u0930\u094D\u0915', rashiEnglish: 'Cancer', symbol: '\u264B', prediction: 'Home and family matters need attention. Creative pursuits shine.', luckyNumber: 2, luckyColor: 'White', overallRating: 3 },
  { rashi: 'leo', rashiHindi: '\u0938\u093F\u0902\u0939', rashiEnglish: 'Leo', symbol: '\u264C', prediction: 'Leadership qualities shine bright. A celebration brings happiness.', luckyNumber: 1, luckyColor: 'Gold', overallRating: 5 },
  { rashi: 'virgo', rashiHindi: '\u0915\u0928\u094D\u092F\u093E', rashiEnglish: 'Virgo', symbol: '\u264D', prediction: 'Attention to detail pays off. Health improvements noticed.', luckyNumber: 7, luckyColor: 'Green', overallRating: 4 },
  { rashi: 'libra', rashiHindi: '\u0924\u0941\u0932\u093E', rashiEnglish: 'Libra', symbol: '\u264E', prediction: 'Balance and harmony define your day. Partnerships flourish.', luckyNumber: 6, luckyColor: 'Pink', overallRating: 4 },
  { rashi: 'scorpio', rashiHindi: '\u0935\u0943\u0936\u094D\u091A\u093F\u0915', rashiEnglish: 'Scorpio', symbol: '\u264F', prediction: 'Transformation and deep insights. Your intuition is strong.', luckyNumber: 8, luckyColor: 'Maroon', overallRating: 3 },
  { rashi: 'sagittarius', rashiHindi: '\u0927\u0928\u0941', rashiEnglish: 'Sagittarius', symbol: '\u2650', prediction: 'Adventure and learning highlighted. Foreign connections bring news.', luckyNumber: 3, luckyColor: 'Purple', overallRating: 4 },
  { rashi: 'capricorn', rashiHindi: '\u092E\u0915\u0930', rashiEnglish: 'Capricorn', symbol: '\u2651', prediction: 'Career ambitions get a major boost. Hard work pays off.', luckyNumber: 10, luckyColor: 'Brown', overallRating: 5 },
  { rashi: 'aquarius', rashiHindi: '\u0915\u0941\u092E\u094D\u092D', rashiEnglish: 'Aquarius', symbol: '\u2652', prediction: 'Innovation and social connections thrive. A unique idea impresses.', luckyNumber: 11, luckyColor: 'Electric Blue', overallRating: 4 },
  { rashi: 'pisces', rashiHindi: '\u092E\u0940\u0928', rashiEnglish: 'Pisces', symbol: '\u2653', prediction: 'Spiritual awareness and creativity peak. Dreams carry messages.', luckyNumber: 12, luckyColor: 'Sea Green', overallRating: 4 },
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
  const [astrologers, setAstrologers] = useState<Astrologer[]>(fallbackAstrologers);
  const [horoscopes] = useState<DailyHoroscope[]>(fallbackHoroscopes);
  const [activeFilter, setActiveFilter] = useState('All');
  const [sortBy, setSortBy] = useState('');
  const [selectedRashi, setSelectedRashi] = useState<string | null>(null);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

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
    return 'bg-gray-400';
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
                : 'fill-gray-200 text-gray-200'
            }`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ── Hero Section ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900">
        {/* Cosmic background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-2 h-2 bg-white rounded-full animate-pulse opacity-60" />
          <div className="absolute top-32 right-20 w-1.5 h-1.5 bg-amber-300 rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.5s' }} />
          <div className="absolute top-20 left-1/3 w-1 h-1 bg-purple-300 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-20 right-1/4 w-2 h-2 bg-indigo-300 rounded-full animate-pulse opacity-50" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-40 right-1/3 w-1.5 h-1.5 bg-amber-200 rounded-full animate-pulse opacity-30" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-32 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse opacity-50" style={{ animationDelay: '0.7s' }} />
          <div className="absolute top-1/2 left-20 w-1.5 h-1.5 bg-purple-200 rounded-full animate-pulse opacity-40" style={{ animationDelay: '1.3s' }} />
          <div className="absolute bottom-10 right-10 w-1 h-1 bg-amber-400 rounded-full animate-pulse opacity-60" style={{ animationDelay: '0.3s' }} />
          {/* Subtle gradient overlay */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-24">
          <div className="text-center">
            {/* Promo badge */}
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-full px-5 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-amber-300">First 5 Minutes FREE</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-5 leading-tight">
              Connect with India&apos;s<br />
              <span className="bg-gradient-to-r from-amber-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                Top Astrologers
              </span>
            </h1>
            <p className="text-lg text-purple-200/80 max-w-2xl mx-auto mb-10 leading-relaxed">
              Get accurate predictions, personalized remedies, and spiritual guidance from
              verified astrologers. Available 24/7 via chat, call, or video.
            </p>

            {/* Feature Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {/* AI Astrologer Card */}
              <Link
                href="/astrology/kundli"
                className="group relative bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-left hover:bg-white/15 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">AI Astrologer</h3>
                <p className="text-sm text-purple-200/70 mb-3">
                  Instant kundli generation, daily horoscope, compatibility check
                </p>
                <div className="inline-flex items-center gap-1 text-sm font-semibold text-amber-300">
                  Free <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {/* Live Consultation Card */}
              <div className="group relative bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 text-left hover:bg-white/15 transition-all duration-300 cursor-pointer">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                  <MessageCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Live Consultation</h3>
                <p className="text-sm text-purple-200/70 mb-3">
                  Chat with verified astrologers for personalized guidance
                </p>
                <div className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300">
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
                className="w-4 h-4 rounded border-surface-300 text-purple-600 focus:ring-purple-500"
              />
              Online only
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-surface-200 rounded-xl px-3 py-2 bg-white text-surface-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'bg-white text-surface-600 border border-surface-200 hover:border-purple-300 hover:text-purple-600'
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
              className="group bg-white rounded-xl border border-surface-200/80 overflow-hidden card-hover transition-all duration-300"
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
                        <BadgeCheck className="w-4 h-4 text-purple-500 shrink-0" />
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
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-600"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 pb-4 flex items-center justify-between">
                <div className="text-sm font-bold text-surface-800">
                  <span className="text-lg">{'\u20B9'}{astrologer.perMinuteRate}</span>
                  <span className="text-xs font-normal text-surface-400">/min</span>
                </div>
                <button
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    astrologer.isOnline && !astrologer.isBusy
                      ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-sm hover:shadow-md hover:from-emerald-600 hover:to-green-600'
                      : astrologer.isBusy
                      ? 'bg-amber-100 text-amber-700 cursor-wait'
                      : 'bg-surface-100 text-surface-400 cursor-not-allowed'
                  }`}
                  onClick={(e) => { if (!astrologer.isOnline || astrologer.isBusy) e.preventDefault(); }}
                >
                  {astrologer.isOnline && !astrologer.isBusy
                    ? 'Chat Now'
                    : astrologer.isBusy
                    ? 'Busy'
                    : 'Offline'}
                </button>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── AI Features Section (Free Tools) ────────────────────────────────── */}
      <section className="bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 py-12 lg:py-16">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 rounded-full px-4 py-1.5 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Free AI Tools</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
              Explore Your Cosmic Blueprint
            </h2>
            <p className="text-purple-200/70 max-w-xl mx-auto">
              Get instant insights with our AI-powered astrology tools. No registration required.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Kundli Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <Sun className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Free Kundli</h3>
                  <p className="text-xs text-purple-300/70">Birth chart analysis</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={kundliName}
                  onChange={(e) => setKundliName(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder:text-purple-300/50 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 outline-none"
                />
                <input
                  type="date"
                  value={kundliDate}
                  onChange={(e) => setKundliDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 outline-none [color-scheme:dark]"
                />
                <input
                  type="time"
                  value={kundliTime}
                  onChange={(e) => setKundliTime(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 outline-none [color-scheme:dark]"
                />
                <input
                  type="text"
                  placeholder="Birth Place"
                  value={kundliPlace}
                  onChange={(e) => setKundliPlace(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder:text-purple-300/50 focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400/50 outline-none"
                />
              </div>

              {kundliGenerated ? (
                <div className="bg-white/10 rounded-xl p-4 mb-4">
                  <p className="text-amber-300 font-semibold text-sm mb-2">Kundli Generated!</p>
                  <div className="space-y-1 text-xs text-purple-200/80">
                    <p>Rashi: <span className="text-white font-medium">Simha (Leo)</span></p>
                    <p>Nakshatra: <span className="text-white font-medium">Magha</span></p>
                    <p>Ascendant: <span className="text-white font-medium">Mesha (Aries)</span></p>
                  </div>
                  <Link href="/astrology/kundli" className="inline-flex items-center gap-1 text-xs text-amber-300 font-semibold mt-3 hover:underline">
                    View Full Kundli <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                <button
                  onClick={handleGenerateKundli}
                  disabled={!kundliName || !kundliDate || !kundliTime || !kundliPlace}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium text-sm rounded-lg hover:from-amber-500 hover:to-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Kundli
                </button>
              )}
            </div>

            {/* Daily Horoscope Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center">
                  <Moon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Daily Horoscope</h3>
                  <p className="text-xs text-purple-300/70">Today&apos;s prediction</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 mb-4">
                {horoscopes.slice(0, 12).map((h) => (
                  <button
                    key={h.rashi}
                    onClick={() => setSelectedRashi(selectedRashi === h.rashi ? null : h.rashi)}
                    className={`flex flex-col items-center py-2 rounded-lg transition-all text-center ${
                      selectedRashi === h.rashi
                        ? 'bg-purple-500/40 border border-purple-400/50'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    <span className="text-lg leading-none">{h.symbol}</span>
                    <span className="text-[9px] text-purple-200/70 mt-0.5">{h.rashiHindi}</span>
                  </button>
                ))}
              </div>

              {selectedRashi ? (
                <div className="bg-white/10 rounded-xl p-4">
                  {(() => {
                    const h = horoscopes.find((hr) => hr.rashi === selectedRashi);
                    if (!h) return null;
                    return (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{h.symbol}</span>
                          <div>
                            <p className="text-sm font-bold text-white">{h.rashiEnglish}</p>
                            <p className="text-[10px] text-purple-300/70">{h.rashiHindi}</p>
                          </div>
                        </div>
                        <p className="text-xs text-purple-200/80 leading-relaxed mb-2">{h.prediction}</p>
                        <div className="flex items-center gap-3 text-[10px] text-purple-300/60">
                          <span>Lucky #{h.luckyNumber}</span>
                          <span>{h.luckyColor}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <p className="text-xs text-purple-300/50 text-center py-3">
                  Select your rashi to see today&apos;s prediction
                </p>
              )}

              <Link
                href="/astrology/horoscope"
                className="inline-flex items-center gap-1 text-xs text-purple-300 font-semibold mt-3 hover:text-white transition-colors"
              >
                View All Horoscopes <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Compatibility Match Card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Compatibility Match</h3>
                  <p className="text-xs text-purple-300/70">Rashi matching</p>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-xs text-purple-300/70 mb-1 block">Your Rashi</label>
                  <select
                    value={compatRashi1}
                    onChange={(e) => { setCompatRashi1(e.target.value); setCompatScore(null); }}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 outline-none"
                  >
                    <option value="" className="text-gray-900">Select Rashi</option>
                    {horoscopes.map((h) => (
                      <option key={h.rashi} value={h.rashi} className="text-gray-900">
                        {h.symbol} {h.rashiEnglish} ({h.rashiHindi})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-purple-300/70 mb-1 block">Partner&apos;s Rashi</label>
                  <select
                    value={compatRashi2}
                    onChange={(e) => { setCompatRashi2(e.target.value); setCompatScore(null); }}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-sm text-white focus:ring-2 focus:ring-pink-400/50 focus:border-pink-400/50 outline-none"
                  >
                    <option value="" className="text-gray-900">Select Rashi</option>
                    {horoscopes.map((h) => (
                      <option key={h.rashi} value={h.rashi} className="text-gray-900">
                        {h.symbol} {h.rashiEnglish} ({h.rashiHindi})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {compatScore !== null ? (
                <div className="bg-white/10 rounded-xl p-4 text-center mb-4">
                  <p className="text-xs text-purple-300/70 mb-1">Compatibility Score</p>
                  <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400">
                    {compatScore}%
                  </p>
                  <p className="text-xs text-purple-200/70 mt-1">
                    {compatScore > 75 ? 'Highly Compatible!' : compatScore > 60 ? 'Good Match!' : 'Needs Understanding'}
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleCompatibility}
                  disabled={!compatRashi1 || !compatRashi2}
                  className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-medium text-sm rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              color: 'from-purple-500 to-indigo-600',
            },
            {
              step: 2,
              icon: MessageCircle,
              title: 'Start Chat',
              desc: 'Connect instantly via chat, call, or video. First 5 minutes are free for new users.',
              color: 'from-emerald-500 to-teal-600',
            },
            {
              step: 3,
              icon: Eye,
              title: 'Get Guidance',
              desc: 'Receive personalized predictions, remedies, and spiritual guidance from the expert.',
              color: 'from-amber-500 to-orange-600',
            },
            {
              step: 4,
              icon: Star,
              title: 'Rate & Review',
              desc: 'Share your experience to help others find the best astrologers on the platform.',
              color: 'from-pink-500 to-rose-600',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="relative text-center group">
                <div className={`w-14 h-14 mx-auto bg-gradient-to-br ${item.color} rounded-xl flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-2 w-6 h-6 bg-white rounded-full border-2 border-purple-200 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600">{item.step}</span>
                </div>
                <h3 className="text-base font-bold text-surface-800 mb-1.5">{item.title}</h3>
                <p className="text-sm text-surface-500 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Trust Section ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-r from-indigo-950 to-purple-900">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-12 lg:py-14">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { icon: Users, value: '41,000+', label: 'Verified Astrologers', color: 'text-amber-400' },
              { icon: Award, value: '5%', label: 'Acceptance Rate', color: 'text-purple-300' },
              { icon: Clock, value: '24/7', label: 'Available', color: 'text-emerald-400' },
              { icon: Lock, value: '100%', label: 'Private & Secure', color: 'text-indigo-300' },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label}>
                  <Icon className={`w-8 h-8 ${stat.color} mx-auto mb-3`} />
                  <p className="text-2xl lg:text-3xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-sm text-purple-200/70">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
