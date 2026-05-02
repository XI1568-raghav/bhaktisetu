import Link from 'next/link';
import { MapPin, ArrowRight, Award, IndianRupee } from 'lucide-react';
import { getApprovedProviders, type ProviderListingType, type ApprovedProvider } from '../lib/api';
import ProviderBadge, { RatingDisplay } from './provider/ProviderBadge';

interface Props {
 type: ProviderListingType;
 heading?: string;
 subheading?: string;
 limit?: number;
 // When false, the section is hidden if there are zero approved providers.
 // Default true so admin/dev can see "no providers yet" state.
 showWhenEmpty?: boolean;
}

const TYPE_LABEL: Record<ProviderListingType, string> = {
 pandit: 'Pandits',
 store: 'Stores',
 astrologer: 'Astrologers',
 wellness: 'Wellness Instructors',
 gaushala: 'Gaushalas',
 temple: 'Temples',
};

const DETAIL_PATH: Record<ProviderListingType, (id: string) => string> = {
 pandit: (id) => `/pandits/${id}`,
 store: (id) => `/store/${id}`,
 astrologer: (id) => `/astrology/${id}`,
 wellness: (id) => `/wellness/instructors/${id}`,
 gaushala: (id) => `/gaushala/${id}`,
 temple: (id) => `/temples/${id}`,
};

function getDisplayName(type: ProviderListingType, p: ApprovedProvider): string {
 switch (type) {
 case 'pandit': return p.templeName || 'Verified Pandit';
 case 'store': return p.storeName || 'Verified Store';
 case 'astrologer': return p.displayName || 'Astrologer';
 case 'wellness': return p.displayName || 'Wellness Instructor';
 case 'gaushala': return p.gaushalaName || 'Gaushala';
 case 'temple': return p.templeName || 'Temple';
 }
}

function getPriceLabel(type: ProviderListingType, p: ApprovedProvider): string | null {
 const fmt = (v: number | string | undefined, suffix: string) => {
 const n = Number(v);
 return Number.isFinite(n) && n > 0 ? `₹${n.toLocaleString('en-IN')}${suffix}` : null;
 };
 switch (type) {
 case 'pandit': return fmt(p.pricePerPuja, ' / puja');
 case 'astrologer': return fmt(p.pricePerMinute, ' / min');
 case 'wellness': return fmt(p.pricePerSession, ' / session');
 default: return null;
 }
}

export async function ApprovedProvidersStrip({
 type,
 heading,
 subheading,
 limit = 8,
 showWhenEmpty = true,
}: Props) {
 const { providers, total } = await getApprovedProviders(type, { limit });

 if (providers.length === 0 && !showWhenEmpty) {
 return null;
 }

 const label = TYPE_LABEL[type];

 return (
 <section className="py-10 px-4">
 <div className="max-w-6xl mx-auto">
 <div className="flex items-end justify-between mb-6">
 <div>
 <h2 className="text-xl font-semibold text-surface-800">
 {heading ?? `Verified ${label}`}
 </h2>
 <p className="text-sm text-surface-500 mt-1">
 {subheading ?? `Approved ${label.toLowerCase()} on Darshya. Each profile is reviewed before going live.`}
 </p>
 </div>
 {total > limit && (
 <Link
 href={`/${type === 'pandit' ? 'pandits' : type}`}
 className="text-sm text-saffron-600 font-medium hover:text-saffron-700 inline-flex items-center gap-1"
 >
 View all {total}
 <ArrowRight className="w-4 h-4" />
 </Link>
 )}
 </div>

 {providers.length === 0 ? (
 <div className="rounded-xl border border-dashed border-surface-200 p-8 text-center bg-surface-50">
 <Award className="w-8 h-8 text-surface-300 mx-auto mb-2" />
 <p className="text-sm font-medium text-surface-700">No approved {label.toLowerCase()} yet</p>
 <p className="text-xs text-surface-500 mt-1">
 New profiles appear here once reviewed.{' '}
 <Link href="/auth/signup" className="text-saffron-600 hover:underline">
 Apply to be listed
 </Link>
 .
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {providers.map((p) => {
 const name = getDisplayName(type, p);
 const price = getPriceLabel(type, p);
 const ratingAvg = typeof p.ratingAvg === 'number' && p.ratingAvg > 0
 ? p.ratingAvg
 : typeof p.rating === 'number' && p.rating > 0
 ? p.rating
 : 0;
 const ratingCount = typeof p.ratingCount === 'number' ? p.ratingCount : 0;

 return (
 <Link
 key={p.id}
 href={DETAIL_PATH[type](p.id)}
 className="block bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 hover:border-saffron-300 hover:shadow-md transition-all"
 >
 <div className="flex items-start gap-3 mb-3">
 <div className="w-10 h-10 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
 <span className="text-sm font-bold text-saffron-700">
 {name.charAt(0).toUpperCase()}
 </span>
 </div>
 <div className="min-w-0 flex-1">
 <h3 className="text-sm font-semibold text-surface-800 truncate">{name}</h3>
 {p.city && (
 <p className="text-xs text-surface-500 mt-0.5 inline-flex items-center gap-1">
 <MapPin className="w-3 h-3" />
 {p.city}
 </p>
 )}
 <div className="mt-1">
 <ProviderBadge
 size="xs"
 aadhaarVerified={p.aadhaarVerified}
 ratingAvg={ratingAvg}
 ratingCount={ratingCount}
 />
 </div>
 </div>
 </div>

 {p.bio && (
 <p className="text-xs text-surface-600 leading-relaxed line-clamp-2 mb-3">
 {p.bio}
 </p>
 )}

 {p.specialties && p.specialties.length > 0 && (
 <div className="flex flex-wrap gap-1 mb-3">
 {p.specialties.slice(0, 2).map((s) => (
 <span key={s} className="px-2 py-0.5 bg-surface-100 text-surface-600 text-[10px] rounded-full">
 {s}
 </span>
 ))}
 {p.specialties.length > 2 && (
 <span className="px-2 py-0.5 bg-surface-100 text-surface-500 text-[10px] rounded-full">
 +{p.specialties.length - 2}
 </span>
 )}
 </div>
 )}

 <div className="flex items-center justify-between pt-2 border-t border-surface-100">
 <RatingDisplay avg={ratingAvg} count={ratingCount} size="xs" />
 {price && (
 <span className="text-xs font-semibold text-surface-700 inline-flex items-center">
 <IndianRupee className="w-3 h-3" />
 {price.replace('₹', '')}
 </span>
 )}
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </div>
 </section>
 );
}
