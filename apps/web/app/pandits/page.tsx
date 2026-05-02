import type { Metadata } from 'next';
import Link from 'next/link';
import { MapPin, Award, Languages, ArrowRight } from 'lucide-react';
import { getApprovedProviders, type ApprovedProvider } from '../../lib/api';
import ProviderBadge, { RatingDisplay } from '../../components/provider/ProviderBadge';

export const runtime = 'edge';

export const metadata: Metadata = {
 title: 'Verified Pandits on Darshya',
 description:
 'Book pujas with verified pandits across India. Each pandit is reviewed by Darshya before being listed. Filter by city, specialty, and experience.',
};

interface SearchParams {
 city?: string;
 specialty?: string;
 sort?: string;
 page?: string;
}

function getDisplayName(p: ApprovedProvider): string {
 return p.templeName || 'Verified Pandit';
}

function getPrice(p: ApprovedProvider): string | null {
 const n = Number(p.pricePerPuja);
 return Number.isFinite(n) && n > 0 ? `₹${n.toLocaleString('en-IN')}` : null;
}

export default async function PanditsListingPage({
 searchParams,
}: {
 searchParams: Promise<SearchParams>;
}) {
 const params = await searchParams;
 const page = Math.max(1, Number(params.page) || 1);

 const { providers, total, limit } = await getApprovedProviders('pandit', {
 city: params.city,
 specialty: params.specialty,
 sort: params.sort,
 page,
 limit: 24,
 });

 const totalPages = Math.max(1, Math.ceil(total / limit));

 return (
 <div className="min-h-screen bg-[var(--color-bg)]">
 {/* Hero */}
 <section className="bg-gradient-to-b from-saffron-50 to-[var(--color-bg)] py-12 px-4">
 <div className="max-w-6xl mx-auto">
 <h1 className="text-3xl sm:text-4xl font-semibold text-surface-800 mb-3">
 Verified Pandits
 </h1>
 <p className="text-surface-600 max-w-2xl">
 {total > 0
 ? `${total} approved pandit${total === 1 ? '' : 's'} on Darshya. Each profile is reviewed before going live.`
 : 'Verified pandits across India. Each profile is reviewed by our team before being listed.'}
 </p>
 </div>
 </section>

 <section className="py-10 px-4">
 <div className="max-w-6xl mx-auto">
 {providers.length === 0 ? (
 <div className="rounded-2xl border border-dashed border-surface-200 p-12 text-center bg-[var(--color-surface)]">
 <Award className="w-12 h-12 text-saffron-300 mx-auto mb-3" />
 <h2 className="text-lg font-semibold text-surface-800 mb-2">
 No pandits listed yet
 </h2>
 <p className="text-sm text-surface-500 mb-6 max-w-md mx-auto">
 We are onboarding verified pandits. New profiles appear here once
 reviewed by our team.
 </p>
 <Link
 href="/auth/signup"
 className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron-600 text-white text-sm font-medium rounded-lg hover:bg-saffron-700 transition-colors"
 >
 Apply to be listed
 <ArrowRight className="w-4 h-4" />
 </Link>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {providers.map((p) => {
 const name = getDisplayName(p);
 const price = getPrice(p);
 return (
 <Link
 key={p.id}
 href={`/pandits/${p.id}`}
 className="block bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 hover:border-saffron-300 hover:shadow-md transition-all"
 >
 <div className="flex items-start gap-3 mb-3">
 <div className="w-12 h-12 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
 <span className="text-base font-bold text-saffron-700">
 {name.charAt(0).toUpperCase()}
 </span>
 </div>
 <div className="min-w-0 flex-1">
 <h3 className="font-semibold text-surface-800 truncate">{name}</h3>
 <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-surface-500 mt-0.5">
 {p.city && (
 <span className="inline-flex items-center gap-1">
 <MapPin className="w-3 h-3" />
 {p.city}
 </span>
 )}
 {typeof p.experience === 'number' && p.experience > 0 && (
 <span>{p.experience}+ yrs experience</span>
 )}
 </div>
 </div>
 </div>

 {p.bio && (
 <p className="text-sm text-surface-600 leading-relaxed line-clamp-2 mb-3">
 {p.bio}
 </p>
 )}

 {p.specialties && p.specialties.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mb-3">
 {p.specialties.slice(0, 3).map((s) => (
 <span
 key={s}
 className="px-2 py-0.5 bg-saffron-50 text-saffron-700 text-[11px] rounded-full"
 >
 {s}
 </span>
 ))}
 {p.specialties.length > 3 && (
 <span className="px-2 py-0.5 bg-surface-100 text-surface-500 text-[11px] rounded-full">
 +{p.specialties.length - 3}
 </span>
 )}
 </div>
 )}

 {p.languages && p.languages.length > 0 && (
 <p className="inline-flex items-center gap-1 text-xs text-surface-500 mb-3">
 <Languages className="w-3 h-3" />
 {p.languages.slice(0, 3).join(', ')}
 </p>
 )}

 <div className="mb-2">
 <ProviderBadge
 size="xs"
 aadhaarVerified={p.aadhaarVerified}
 ratingAvg={p.ratingAvg ?? p.rating}
 ratingCount={p.ratingCount}
 />
 </div>
 <div className="flex items-center justify-between pt-3 border-t border-surface-100">
 <RatingDisplay
 avg={p.ratingAvg ?? p.rating}
 count={p.ratingCount}
 size="xs"
 />
 {price && (
 <span className="text-sm font-semibold text-surface-800">
 {price} <span className="text-xs font-normal text-surface-500">/ puja</span>
 </span>
 )}
 </div>
 </Link>
 );
 })}
 </div>
 )}

 {totalPages > 1 && (
 <div className="flex items-center justify-center gap-2 mt-8">
 {page > 1 && (
 <Link
 href={`/pandits?page=${page - 1}${params.city ? `&city=${params.city}` : ''}`}
 className="px-4 py-2 border border-surface-200 text-surface-600 text-sm rounded-lg hover:bg-surface-50"
 >
 Previous
 </Link>
 )}
 <span className="text-sm text-surface-500">
 Page {page} of {totalPages}
 </span>
 {page < totalPages && (
 <Link
 href={`/pandits?page=${page + 1}${params.city ? `&city=${params.city}` : ''}`}
 className="px-4 py-2 border border-surface-200 text-surface-600 text-sm rounded-lg hover:bg-surface-50"
 >
 Next
 </Link>
 )}
 </div>
 )}
 </div>
 </section>
 </div>
 );
}
