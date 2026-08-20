'use client';

import { useEffect, useState } from 'react';
import { buttonClass } from './ui/button-recipe';
import Link from 'next/link';
import { CheckCircle2, Clock, ExternalLink, Pencil, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { cardBlurb } from '../lib/copy';
import {
 API_BASE_URL,
 DATA_FETCH_TIMEOUT_MS,
 fetchWithTimeout,
 loadErrorMessage,
} from '../lib/api-config';

interface Props {
 // Backend MarketplaceRole enum string. The dashboard hosting this card
 // already knows which role the page is for, so we don't infer.
 role: 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER';
 // Slug used in /onboarding/[role] and /pandits/[id] etc.
 onboardingSlug: 'priest' | 'store_owner' | 'astrologer' | 'wellness_instructor' | 'gaushala_manager' | 'temple_manager';
 // The public-listing URL prefix; null for stores (handled separately).
 publicListingType?: 'pandit' | 'astrologer' | 'wellness' | 'gaushala' | 'temple' | null;
}

interface ProviderProfile {
 id?: string;
 templeName?: string | null;
 displayName?: string | null;
 storeName?: string | null;
 gaushalaName?: string | null;
 city?: string | null;
 bio?: string | null;
 specialties?: string[];
 approved?: boolean;
}

const ROLE_LABEL: Record<Props['role'], string> = {
 PANDIT: 'Pandit',
 STORE_OWNER: 'Store',
 ASTROLOGER: 'Astrologer',
 WELLNESS_INSTRUCTOR: 'Wellness Instructor',
 GAUSHALA_MANAGER: 'Gaushala',
 TEMPLE_MANAGER: 'Temple',
};

function getDisplayName(role: Props['role'], p: ProviderProfile): string {
 switch (role) {
 case 'PANDIT': return p.templeName || 'Your pandit profile';
 case 'STORE_OWNER': return p.storeName || 'Your store';
 case 'ASTROLOGER': return p.displayName || 'Your astrologer profile';
 case 'WELLNESS_INSTRUCTOR': return p.displayName || 'Your wellness profile';
 case 'GAUSHALA_MANAGER': return p.gaushalaName || 'Your gaushala';
 case 'TEMPLE_MANAGER': return p.templeName || 'Your temple';
 }
}

export default function MyProviderProfileCard({ role, onboardingSlug, publicListingType }: Props) {
 const { session } = useAuth();
 const token = session?.accessToken;
 const [profile, setProfile] = useState<ProviderProfile | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 // RES-06 (2026-08-12): "no profile" and "we could not READ the profile" are
 // different facts and this card used to render both as the onboarding nag —
 // "Complete your Pandit profile / Submit your details so an admin can review
 // and approve your listing" — on all six portals whenever the API 500'd.
 // Providers who onboarded months ago re-submit documents or conclude we lost
 // their verification. Track the unread case separately.
 const [loadFailed, setLoadFailed] = useState<string | null>(null);
 const [reloadKey, setReloadKey] = useState(0);

 useEffect(() => {
 if (!token) return;
 // Demo sessions return demoMode:true with no profile; show the
 // "complete onboarding" state instead of failing.
 if (token.startsWith('demo-')) {
 setLoading(false);
 setProfile(null);
 return;
 }
 let cancelled = false;
 (async () => {
 try {
 setLoadFailed(null);
 // RES-01: bare fetch has no timeout, so a stalled read left this card on
 // "Loading your profile…" forever at the top of every portal.
 const res = await fetchWithTimeout(`${API_BASE_URL}/onboarding/provider?role=${role}`, {
 headers: { Authorization: `Bearer ${token}` },
 }, DATA_FETCH_TIMEOUT_MS);
 if (!res.ok) {
 if (!cancelled) setLoadFailed(loadErrorMessage(res));
 return;
 }
 const data = await res.json();
 if (!cancelled) {
 setProfile(data.profile ?? null);
 }
 } catch (err) {
 if (!cancelled) {
 setLoadFailed(loadErrorMessage(err));
 setError(err instanceof Error ? err.message : 'Failed to load');
 }
 } finally {
 if (!cancelled) setLoading(false);
 }
 })();
 return () => { cancelled = true; };
 }, [token, role, reloadKey]);

 if (loading) {
 return (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 mb-6">
 <div className="flex items-center gap-2 text-sm text-surface-500">
 <Loader2 className="w-4 h-4 animate-spin" />
 Loading your profile…
 </div>
 </div>
 );
 }

 // We could not READ the profile. Say so — never the onboarding nag, which
 // reads to an approved provider as "we lost your verification".
 if (loadFailed) {
 return (
 <div role="alert" className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
 <div className="flex flex-wrap items-start gap-2 text-sm text-amber-800">
 <span className="flex-1 min-w-[12rem]">
 {loadFailed} Your listing and approval status are unchanged.
 </span>
 <button
 type="button"
 onClick={() => { setLoading(true); setReloadKey((k) => k + 1); }}
 className="font-semibold underline underline-offset-2 hover:text-amber-900"
 >
 Retry
 </button>
 </div>
 </div>
 );
 }

 // No profile yet — the API ANSWERED and said there isn't one. Prompt to
 // complete onboarding.
 if (!profile) {
 return (
 <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
 <div className="flex items-start gap-3">
 <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
 <div className="flex-1">
 {/* DU-08: this was an h3 rendered above the first h2 on /priest, so the
     level sequence skipped from the page h1 straight to h3. It is a
     top-level section of the dashboard, so it is an h2. */}
 <h2 className="font-semibold text-amber-900 mb-1">
 Complete your {ROLE_LABEL[role]} profile
 </h2>
 <p className="text-sm text-amber-800 mb-3">
 Submit your details so an admin can review and approve your listing.
 {error && <span className="block text-xs text-amber-700 mt-1">{error}</span>}
 </p>
 <Link
 href={`/onboarding/view?role=${onboardingSlug}`}
 className={buttonClass('primary', 'md')}
 >
 Complete onboarding
 <ExternalLink className="w-3.5 h-3.5" />
 </Link>
 </div>
 </div>
 </div>
 );
 }

 const approved = !!profile.approved;
 const name = getDisplayName(role, profile);
 // CM-10: an unbounded provider bio used to render under a CSS clamp alone —
 // the whole essay in the DOM and the accessibility tree, cut mid-word wherever
 // the box happened to end. cardBlurb keeps the first whole sentence.
 const bio = cardBlurb(profile.bio);

 return (
 <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 mb-6">
 <div className="flex items-start gap-4">
 <div className="w-12 h-12 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
 <span className="text-lg font-bold text-saffron-700">
 {name.charAt(0).toUpperCase()}
 </span>
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <h3 className="font-semibold text-surface-800 truncate">{name}</h3>
 {approved ? (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
 <CheckCircle2 className="w-3 h-3" />
 Live on Darshya
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
 <Clock className="w-3 h-3" />
 Pending approval
 </span>
 )}
 </div>
 {profile.city && (
 <p className="text-xs text-surface-500 mb-2">{profile.city}</p>
 )}
 {/* The clamp stays as the narrow-width backstop. */}
 {bio && (
 <p className="text-sm text-surface-600 line-clamp-2 mb-3">{bio}</p>
 )}
 <div className="flex flex-wrap gap-2">
 <Link
 href={`/onboarding/view?role=${onboardingSlug}`}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-surface-600 bg-surface-100 rounded-md hover:bg-surface-200"
 >
 <Pencil className="w-3 h-3" />
 Edit profile
 </Link>
 {approved && publicListingType && profile.id && (
 <Link
 href={`/${publicListingType === 'pandit' ? 'pandits' : publicListingType}/${profile.id}`}
 className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-saffron-700 bg-saffron-50 border border-saffron-200 rounded-md hover:bg-saffron-100"
 >
 <ExternalLink className="w-3 h-3" />
 View public profile
 </Link>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
