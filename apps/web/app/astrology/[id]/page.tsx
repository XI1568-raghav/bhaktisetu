'use client';
export const runtime = 'edge';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getAstrologerImage } from '../../../lib/images';
import {
  Star,
  BadgeCheck,
  MessageCircle,
  Phone,
  Video,
  Clock,
  Globe,
  Award,
  ChevronLeft,
  Heart,
  Share2,
  Shield,
  Sparkles,
  Users,
  ThumbsUp,
  ArrowRight,
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

interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

// ─── Fallback Data ────────────────────────────────────────────────────────────

const allAstrologers: Record<string, Astrologer & { reviews: Review[] }> = {
  astro_001: {
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
    bio: 'With 25 years of experience in Vedic Astrology, Pt. Raghunath Sharma is a renowned Jyotish Acharya who has guided over 34,000 devotees. Specializing in Prashna Kundli and Nadi Astrology, he offers precise predictions and effective remedies. Educated at Banaras Hindu University in Jyotish Shastra, he has been featured in leading spiritual magazines and TV channels.',
    verified: true,
    badges: ['Top Rated', '10K+ Consults'],
    reviews: [
      { id: 'r1', userName: 'Priya M.', rating: 5, comment: 'Extremely accurate predictions. The remedies suggested were practical and effective. Highly recommended!', date: '2026-04-10' },
      { id: 'r2', userName: 'Rahul K.', rating: 5, comment: 'Very knowledgeable and patient. Explained everything in detail. Will consult again for sure.', date: '2026-04-08' },
      { id: 'r3', userName: 'Sneha T.', rating: 4, comment: 'Good consultation overall. The astrologer understood my concerns and provided helpful guidance.', date: '2026-04-05' },
      { id: 'r4', userName: 'Amit S.', rating: 5, comment: 'Predictions about my career change were spot on. The timing advice was very helpful.', date: '2026-04-02' },
      { id: 'r5', userName: 'Kavya R.', rating: 4, comment: 'Nice experience. Clear explanations and practical remedies. Felt very positive after the session.', date: '2026-03-28' },
    ],
  },
  astro_002: {
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
    bio: 'Dr. Meera Devi is a gifted Tarot reader and Numerologist with a PhD in Astro-Sciences. She blends ancient Vedic wisdom with modern Tarot techniques to provide holistic guidance on career, relationships, and life decisions. With over 22,000 consultations, she has helped people across India and abroad find clarity and direction.',
    verified: true,
    badges: ['Top Rated', 'Quick Response'],
    reviews: [
      { id: 'r1', userName: 'Deepak G.', rating: 5, comment: 'One of the best Tarot readers I have consulted. Deep knowledge and genuine concern.', date: '2026-04-12' },
      { id: 'r2', userName: 'Anjali P.', rating: 5, comment: 'The Tarot reading was incredibly accurate. She predicted events that actually happened!', date: '2026-04-09' },
      { id: 'r3', userName: 'Vikash N.', rating: 4, comment: 'Very professional and to the point. Great numerology analysis.', date: '2026-04-06' },
      { id: 'r4', userName: 'Ritu D.', rating: 5, comment: 'The Numerology analysis was thorough. Helped me choose the right business name.', date: '2026-04-01' },
      { id: 'r5', userName: 'Suresh B.', rating: 4, comment: 'Good experience. The remedies were simple and effective.', date: '2026-03-25' },
    ],
  },
  astro_003: {
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
    bio: 'Acharya Vikram Joshi is a master of KP Astrology and Vastu Shastra. With two decades of practice, he has helped thousands of families achieve harmony through precise Vastu corrections and astrological guidance. He specializes in property Vastu, business astrology, and marriage compatibility.',
    verified: true,
    badges: ['Top Rated', '10K+ Consults'],
    reviews: [
      { id: 'r1', userName: 'Priya M.', rating: 5, comment: 'Amazing Vastu consultation. Our home feels so much better after the changes.', date: '2026-04-11' },
      { id: 'r2', userName: 'Rahul K.', rating: 5, comment: 'KP Astrology predictions were incredibly precise. Got the job on the exact date predicted!', date: '2026-04-07' },
      { id: 'r3', userName: 'Sneha T.', rating: 4, comment: 'Good Vastu advice for our new office. Practical and non-demolition remedies.', date: '2026-04-03' },
      { id: 'r4', userName: 'Amit S.', rating: 5, comment: 'Excellent experience. Very knowledgeable in both astrology and Vastu.', date: '2026-03-30' },
      { id: 'r5', userName: 'Kavya R.', rating: 4, comment: 'Helpful consultation. The astrologer was patient and thorough.', date: '2026-03-26' },
    ],
  },
};

const similarAstrologers = [
  {
    id: 'astro_007',
    name: 'Acharya Ramesh Iyer',
    photo: getAstrologerImage('male', 3),
    specializations: ['KP Astrology', 'Vedic Astrology'],
    rating: 4.8,
    reviewCount: 9100,
    perMinuteRate: 55,
    isOnline: true,
    isBusy: false,
  },
  {
    id: 'astro_006',
    name: 'Tarot Priya Singh',
    photo: getAstrologerImage('female', 0),
    specializations: ['Tarot Reading', 'Numerology'],
    rating: 4.5,
    reviewCount: 3210,
    perMinuteRate: 20,
    isOnline: true,
    isBusy: false,
  },
  {
    id: 'astro_011',
    name: 'Acharya Bhaskar Rao',
    photo: getAstrologerImage('male', 4),
    specializations: ['Nadi Astrology', 'Vedic Astrology'],
    rating: 4.9,
    reviewCount: 11200,
    perMinuteRate: 90,
    isOnline: true,
    isBusy: false,
  },
];

// ─── Page Component ───────────────────────────────────────────────────────────

export default function AstrologerDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const astrologer = allAstrologers[id] || allAstrologers['astro_001']!;

  function getStatusColor() {
    if (astrologer.isOnline && !astrologer.isBusy) return 'bg-emerald-400';
    if (astrologer.isOnline && astrologer.isBusy) return 'bg-amber-400';
    return 'bg-surface-400';
  }

  function getStatusText() {
    if (astrologer.isOnline && !astrologer.isBusy) return 'Online';
    if (astrologer.isOnline && astrologer.isBusy) return 'Busy';
    return 'Offline';
  }

  function renderStars(rating: number, size = 'w-4 h-4') {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${
              star <= Math.round(rating)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-surface-200 text-surface-200'
            }`}
          />
        ))}
      </div>
    );
  }

  // Rating breakdown (hardcoded distribution)
  const ratingBreakdown = [
    { stars: 5, percent: 72 },
    { stars: 4, percent: 20 },
    { stars: 3, percent: 5 },
    { stars: 2, percent: 2 },
    { stars: 1, percent: 1 },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      {/* ── Cosmic Header ────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-surface-900 via-surface-800 to-surface-800 pb-24">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 pt-6">
          <Link
            href="/astrology"
            className="inline-flex items-center gap-1.5 text-sm text-saffron-300/70 hover:text-white transition-colors mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Astrologers
          </Link>
        </div>
      </div>

      {/* ── Profile Card (overlapping header) ────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 -mt-20">
        <div className="bg-white rounded-xl shadow-xl border border-surface-200/50 overflow-hidden">
          <div className="p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Photo & Status */}
              <div className="shrink-0">
                <div className="relative inline-block">
                  <img
                    src={astrologer.photo}
                    alt={astrologer.name}
                    className="w-28 h-28 lg:w-36 lg:h-36 rounded-xl object-cover shadow-lg"
                  />
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 ${getStatusColor()} rounded-full border-3 border-white shadow-sm`} />
                  {astrologer.verified && (
                    <div className="absolute -top-2 -right-2 w-7 h-7 bg-saffron-600 rounded-full flex items-center justify-center shadow-sm">
                      <BadgeCheck className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl lg:text-3xl font-bold text-surface-800">
                        {astrologer.name}
                      </h1>
                    </div>

                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-1.5">
                        {renderStars(astrologer.rating)}
                        <span className="text-sm font-semibold text-surface-700">{astrologer.rating}</span>
                      </div>
                      <span className="text-surface-300">|</span>
                      <span className="text-sm text-surface-500">
                        {astrologer.reviewCount.toLocaleString()} reviews
                      </span>
                      <span className="text-surface-300">|</span>
                      <span className="text-sm text-surface-500">
                        {astrologer.consultationCount.toLocaleString()} consultations
                      </span>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {astrologer.badges.map((badge) => (
                        <span
                          key={badge}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60"
                        >
                          {badge}
                        </span>
                      ))}
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                        astrologer.isOnline && !astrologer.isBusy
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          : astrologer.isBusy
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          : 'bg-surface-50 text-surface-500 border border-surface-200/60'
                      }`}>
                        {getStatusText()}
                      </span>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-surface-500">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-saffron-400" />
                        {astrologer.experienceYears} years experience
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-saffron-400" />
                        {astrologer.languages.join(', ')}
                      </span>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="sm:text-right shrink-0">
                    <div className="mb-3">
                      <span className="text-lg font-semibold text-surface-800">{'\u20B9'}{astrologer.perMinuteRate}</span>
                      <span className="text-sm text-surface-400">/min</span>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-1.5 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-700">First 5 min FREE</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                          astrologer.isOnline && !astrologer.isBusy
                            ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md shadow-emerald-500/25 hover:shadow-lg hover:from-emerald-600 hover:to-green-600'
                            : 'bg-surface-100 text-surface-400 cursor-not-allowed'
                        }`}
                        disabled={!astrologer.isOnline || astrologer.isBusy}
                      >
                        <MessageCircle className="w-4 h-4" />
                        Chat Now
                      </button>
                      <button
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm border-2 transition-all duration-200 ${
                          astrologer.isOnline && !astrologer.isBusy
                            ? 'border-saffron-200 text-saffron-600 hover:bg-saffron-50'
                            : 'border-surface-200 text-surface-400 cursor-not-allowed'
                        }`}
                        disabled={!astrologer.isOnline || astrologer.isBusy}
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content Grid ─────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left column — Bio, Specializations */}
          <div className="lg:col-span-2 space-y-6">
            {/* Specializations */}
            <div className="bg-white rounded-xl border border-surface-200/80 p-6">
              <h2 className="text-lg font-bold text-surface-800 mb-4">Specializations</h2>
              <div className="flex flex-wrap gap-2">
                {astrologer.specializations.map((spec) => (
                  <span
                    key={spec}
                    className="px-4 py-2 rounded-xl bg-saffron-50 text-saffron-700 text-sm font-medium border border-saffron-100"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div className="bg-white rounded-xl border border-surface-200/80 p-6">
              <h2 className="text-lg font-bold text-surface-800 mb-3">About</h2>
              <p className="text-surface-600 leading-relaxed">{astrologer.bio}</p>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-xl border border-surface-200/80 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-surface-800">Reviews</h2>
                <span className="text-sm text-surface-500">{astrologer.reviewCount.toLocaleString()} total</span>
              </div>

              {/* Rating Breakdown */}
              <div className="flex items-start gap-6 mb-6 pb-6 border-b border-surface-100">
                <div className="text-center shrink-0">
                  <p className="text-xl font-semibold text-surface-800">{astrologer.rating}</p>
                  <div className="mt-1">{renderStars(astrologer.rating, 'w-3.5 h-3.5')}</div>
                  <p className="text-xs text-surface-400 mt-1">{astrologer.reviewCount.toLocaleString()} reviews</p>
                </div>
                <div className="flex-1 space-y-2">
                  {ratingBreakdown.map((rb) => (
                    <div key={rb.stars} className="flex items-center gap-2">
                      <span className="text-xs text-surface-500 w-3">{rb.stars}</span>
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${rb.percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-surface-400 w-8 text-right">{rb.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="space-y-5">
                {astrologer.reviews.map((review) => (
                  <div key={review.id} className="pb-5 border-b border-surface-100 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-saffron-100 to-saffron-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-saffron-600">
                            {review.userName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-surface-700">{review.userName}</p>
                          <p className="text-xs text-surface-400">{review.date}</p>
                        </div>
                      </div>
                      {renderStars(review.rating, 'w-3 h-3')}
                    </div>
                    <p className="text-sm text-surface-600 leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl border border-surface-200/80 p-6">
              <h3 className="text-base font-bold text-surface-800 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500 flex items-center gap-2">
                    <Users className="w-4 h-4 text-saffron-400" /> Consultations
                  </span>
                  <span className="text-sm font-bold text-surface-700">{astrologer.consultationCount.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-saffron-400" /> Experience
                  </span>
                  <span className="text-sm font-bold text-surface-700">{astrologer.experienceYears} years</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500 flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-saffron-400" /> Rating
                  </span>
                  <span className="text-sm font-bold text-surface-700">{astrologer.rating}/5.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-surface-500 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-saffron-400" /> Verified
                  </span>
                  <span className="text-sm font-bold text-emerald-600">Yes</span>
                </div>
              </div>
            </div>

            {/* Languages */}
            <div className="bg-white rounded-xl border border-surface-200/80 p-6">
              <h3 className="text-base font-bold text-surface-800 mb-3">Languages</h3>
              <div className="flex flex-wrap gap-2">
                {astrologer.languages.map((lang) => (
                  <span key={lang} className="px-3 py-1.5 bg-saffron-50 text-saffron-600 text-xs font-medium rounded-lg border border-saffron-100">
                    {lang}
                  </span>
                ))}
              </div>
            </div>

            {/* Similar Astrologers */}
            <div className="bg-white rounded-xl border border-surface-200/80 p-6">
              <h3 className="text-base font-bold text-surface-800 mb-4">Similar Astrologers</h3>
              <div className="space-y-4">
                {similarAstrologers.map((sa) => (
                  <Link
                    key={sa.id}
                    href={`/astrology/${sa.id}`}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-saffron-50/50 transition-colors"
                  >
                    <img
                      src={sa.photo}
                      alt={sa.name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-surface-700 truncate">{sa.name}</p>
                      <p className="text-xs text-surface-400">{sa.specializations[0]}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs text-surface-500">{sa.rating}</span>
                        <span className="text-xs text-saffron-600 font-semibold">{'\u20B9'}{sa.perMinuteRate}/min</span>
                      </div>
                    </div>
                    {sa.isOnline && !sa.isBusy && (
                      <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </div>

            {/* CTA Card */}
            <div className="bg-gradient-to-br from-surface-900 via-surface-800 to-surface-800 rounded-xl p-6 text-center">
              <Sparkles className="w-8 h-8 text-amber-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-2">Free Kundli Analysis</h3>
              <p className="text-xs text-saffron-200/70 mb-4">
                Get your birth chart generated instantly with our AI tool
              </p>
              <Link
                href="/astrology/kundli"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold rounded-xl hover:from-amber-500 hover:to-orange-600 transition-all"
              >
                Generate Kundli <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
