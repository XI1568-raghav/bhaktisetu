'use client';

import { useEffect, useState, useCallback } from 'react';
import {
 Sparkles,
 Flame,
 Calendar,
 ArrowRight,
 AlertCircle,
 ChevronDown,
 Loader2,
 User,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { API_BASE_URL } from '../lib/api-config';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface PujaRecommendation {
 pujaName: string;
 pujaSlug: string;
 deity: string;
 reason: string;
 recommendedDate: string;
 priceRange: string;
 templeSlug: string;
}

interface PujaRecommendationWidgetProps {
 lifeEvent?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const LIFE_EVENTS = [
 { value: '', label: 'General Recommendations' },
 { value: 'career', label: 'Career & Business' },
 { value: 'health', label: 'Health & Wellness' },
 { value: 'marriage', label: 'Marriage & Relationships' },
 { value: 'education', label: 'Education & Exams' },
 { value: 'finance', label: 'Financial Prosperity' },
 { value: 'family', label: 'Family Harmony' },
 { value: 'childbirth', label: 'Childbirth & Fertility' },
 { value: 'travel', label: 'Safe Travel' },
 { value: 'graha_shanti', label: 'Graha Shanti (Planetary)' },
];

const DEITY_COLORS: Record<string, string> = {
 'Lord Shiva': 'bg-surface-100 text-surface-700',
 'Lord Vishnu': 'bg-blue-50 text-blue-700',
 'Lord Ganesha': 'bg-orange-50 text-orange-700',
 'Lord Hanuman': 'bg-red-50 text-red-700',
 'Lord Krishna': 'bg-sky-50 text-sky-700',
 'Lord Rama': 'bg-amber-50 text-amber-700',
 'Goddess Lakshmi': 'bg-pink-50 text-pink-700',
 'Goddess Durga': 'bg-rose-50 text-rose-700',
 'Goddess Saraswati': 'bg-violet-50 text-violet-700',
 Navagraha: 'bg-purple-50 text-purple-700',
};

// ─── Component ──────────────────────────────────────────────────────────────────

export default function PujaRecommendationWidget({
 lifeEvent: initialLifeEvent,
}: PujaRecommendationWidgetProps) {
 const { user, session, isAuthenticated } = useAuth();
 const [recommendations, setRecommendations] = useState<PujaRecommendation[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(false);
 const [lifeEvent, setLifeEvent] = useState(initialLifeEvent || '');

 // Check if user has rashi/nakshatra in their profile
 // The user object from auth-context may not have these fields directly,
 // so we fetch from the profile endpoint
 const [hasProfile, setHasProfile] = useState<boolean | null>(null);

 const checkProfile = useCallback(async () => {
 if (!session?.accessToken) {
 setHasProfile(false);
 return;
 }
 try {
 const res = await fetch(`${API_BASE_URL}/users/me`, {
 headers: { Authorization: `Bearer ${session.accessToken}` },
 });
 if (res.ok) {
 const data = await res.json();
 const profile = data.user || data;
 setHasProfile(!!(profile.rashi || profile.nakshatra));
 } else {
 // If profile endpoint fails, still allow recommendations with defaults
 setHasProfile(true);
 }
 } catch {
 setHasProfile(true);
 }
 }, [session?.accessToken]);

 const fetchRecommendations = useCallback(async () => {
 if (!session?.accessToken) {
 setLoading(false);
 return;
 }

 setLoading(true);
 setError(false);

 try {
 const body: Record<string, string> = {};
 if (lifeEvent) body.lifeEvent = lifeEvent;

 const res = await fetch(`${API_BASE_URL}/ai/recommend-puja`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 Authorization: `Bearer ${session.accessToken}`,
 },
 body: JSON.stringify(body),
 });

 if (res.ok) {
 const data = await res.json();
 setRecommendations(data.recommendations || []);
 } else {
 throw new Error('API error');
 }
 } catch {
 setError(true);
 setRecommendations([]);
 } finally {
 setLoading(false);
 }
 }, [session?.accessToken, lifeEvent]);

 useEffect(() => {
 checkProfile();
 }, [checkProfile]);

 useEffect(() => {
 if (isAuthenticated && hasProfile !== null) {
 fetchRecommendations();
 } else if (!isAuthenticated) {
 setLoading(false);
 }
 }, [isAuthenticated, hasProfile, fetchRecommendations]);

 // Not authenticated
 if (!isAuthenticated) {
 return (
 <div className="rounded-2xl border border-surface-100 bg-white p-6 shadow-sm">
 <div className="flex items-center gap-2 mb-4">
 <Sparkles className="h-5 w-5 text-temple-gold" />
 <h3 className="text-lg font-bold text-surface-900">Recommended for You</h3>
 </div>
 <div className="text-center py-6">
 <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-saffron-50">
 <User className="h-6 w-6 text-saffron-400" />
 </div>
 <p className="text-sm text-surface-500 mb-3">
 Sign in to get personalized puja recommendations based on your spiritual profile.
 </p>
 <a
 href="/auth/login"
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-700 transition-colors"
 >
 Sign In <ArrowRight className="h-3.5 w-3.5" />
 </a>
 </div>
 </div>
 );
 }

 // Profile incomplete — no rashi/nakshatra
 if (hasProfile === false) {
 return (
 <div className="rounded-2xl border border-surface-100 bg-white p-6 shadow-sm">
 <div className="flex items-center gap-2 mb-4">
 <Sparkles className="h-5 w-5 text-temple-gold" />
 <h3 className="text-lg font-bold text-surface-900">Recommended for You</h3>
 </div>
 <div className="text-center py-6">
 <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-saffron-50">
 <Sparkles className="h-6 w-6 text-saffron-400" />
 </div>
 <p className="text-sm font-medium text-surface-700 mb-1">
 Complete your profile for personalized recommendations
 </p>
 <p className="text-xs text-surface-500 mb-4">
 Add your rashi and nakshatra to receive AI-powered puja suggestions tailored for you.
 </p>
 <a
 href="/profile"
 className="inline-flex items-center gap-2 rounded-lg bg-saffron-600 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-700 transition-colors"
 >
 Complete Profile <ArrowRight className="h-3.5 w-3.5" />
 </a>
 </div>
 </div>
 );
 }

 return (
 <div className="rounded-2xl border border-surface-100 bg-white p-6 shadow-sm">
 {/* Header */}
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-2">
 <Sparkles className="h-5 w-5 text-temple-gold" />
 <h3 className="text-lg font-bold text-surface-900">Recommended for You</h3>
 </div>
 </div>

 {/* Life Event Dropdown */}
 <div className="mb-5">
 <label className="block text-xs font-medium text-surface-500 mb-1.5">
 Get recommendations for a life event
 </label>
 <div className="relative">
 <select
 value={lifeEvent}
 onChange={(e) => setLifeEvent(e.target.value)}
 className="w-full appearance-none rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 pr-8 text-sm text-surface-800 focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
 >
 {LIFE_EVENTS.map((evt) => (
 <option key={evt.value} value={evt.value}>
 {evt.label}
 </option>
 ))}
 </select>
 <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
 </div>
 </div>

 {/* Loading State */}
 {loading && (
 <div className="space-y-3">
 {[1, 2, 3].map((i) => (
 <div key={i} className="animate-pulse rounded-xl border border-surface-100 p-4">
 <div className="flex items-start gap-3">
 <div className="h-10 w-10 rounded-lg bg-surface-200" />
 <div className="flex-1">
 <div className="h-4 w-32 rounded bg-surface-200 mb-2" />
 <div className="h-3 w-20 rounded bg-surface-100 mb-3" />
 <div className="h-3 w-full rounded bg-surface-100 mb-1" />
 <div className="h-3 w-3/4 rounded bg-surface-100" />
 </div>
 </div>
 </div>
 ))}
 </div>
 )}

 {/* Error State */}
 {!loading && error && (
 <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-center">
 <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-400" />
 <p className="text-sm font-medium text-red-700">Unable to load recommendations</p>
 <p className="text-xs text-red-500 mt-1">Please try again later.</p>
 <button
 onClick={fetchRecommendations}
 className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
 >
 <Loader2 className="h-3 w-3" />
 Retry
 </button>
 </div>
 )}

 {/* Recommendations */}
 {!loading && !error && recommendations.length > 0 && (
 <div className="space-y-3">
 {recommendations.slice(0, 3).map((rec, index) => {
 const deityClass = DEITY_COLORS[rec.deity] || 'bg-saffron-50 text-saffron-700';
 return (
 <div
 key={`${rec.pujaSlug}-${index}`}
 className="group rounded-xl border border-surface-100 p-4 hover:border-saffron-200 hover:shadow-md transition-all"
 >
 <div className="flex items-start gap-3">
 {/* Deity Icon */}
 <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${deityClass}`}>
 <Flame className="h-5 w-5" />
 </div>

 <div className="flex-1 min-w-0">
 {/* Puja Name */}
 <h4 className="font-semibold text-surface-900 group-hover:text-saffron-600 transition-colors text-sm">
 {rec.pujaName}
 </h4>
 {/* Deity */}
 <p className="text-xs text-surface-500 mt-0.5">{rec.deity}</p>

 {/* AI Reason */}
 <p className="mt-2 text-xs text-surface-600 leading-relaxed line-clamp-3">
 {rec.reason}
 </p>

 {/* Meta row */}
 <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
 {rec.recommendedDate && (
 <span className="inline-flex items-center gap-1 text-surface-500">
 <Calendar className="h-3 w-3" />
 {new Date(rec.recommendedDate).toLocaleDateString('en-IN', {
 day: 'numeric',
 month: 'short',
 })}
 </span>
 )}
 {rec.priceRange && (
 <span className="font-semibold text-saffron-600">
 {rec.priceRange}
 </span>
 )}
 </div>
 </div>
 </div>

 {/* Book Now */}
 <div className="mt-3 pt-3 border-t border-surface-50">
 <a
 href={`/pujas/${rec.pujaSlug}/book${rec.templeSlug ? `?temple=${rec.templeSlug}` : ''}`}
 className="inline-flex items-center gap-1.5 rounded-lg bg-saffron-600 px-4 py-2 text-xs font-semibold text-white hover:bg-saffron-700 transition-colors w-full justify-center"
 >
 <Flame className="h-3.5 w-3.5" />
 Book Now
 </a>
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Empty state (no recommendations returned) */}
 {!loading && !error && recommendations.length === 0 && (
 <div className="text-center py-4">
 <p className="text-sm text-surface-500">
 No recommendations available right now. Try selecting a life event above.
 </p>
 </div>
 )}
 </div>
 );
}
