import type { Metadata } from 'next';
import Link from 'next/link';
import {
 Star,
 BadgeCheck,
 Languages,
 Award,
 Flame,
 Users,
} from 'lucide-react';
import { getPublicPriests, type PriestSummary } from '../../lib/pandit-api';
import { remoteImage, IMG_W } from '../../lib/images';
import { H1 } from '../../components/ui/heading-recipe';

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/pandits' },
 title: 'Verified Pandits',
 description:
  'Book authentic pujas with verified pandits across India. Each pandit is reviewed by Darshya before being listed.',
};

function initials(name: string): string {
 const parts = name.trim().split(/\s+/);
 const first = parts[0]?.charAt(0) ?? '';
 const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? '' : '';
 return (first + last).toUpperCase() || 'P';
}

function PriestCard({ priest }: { priest: PriestSummary }) {
 return (
  <Link
   href={`/pandits/${priest.id}`}
   className="block bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 hover:border-saffron-300 hover:shadow-md transition-all"
  >
   <div className="flex items-start gap-3 mb-3">
    {priest.avatarUrl ? (
     // eslint-disable-next-line @next/next/no-img-element
     <img
      src={remoteImage(priest.avatarUrl, IMG_W.THUMB)}
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      alt={priest.displayName}
      className="w-12 h-12 rounded-full object-cover shrink-0"
     />
    ) : (
     <div className="w-12 h-12 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
      <span className="text-sm font-bold text-saffron-700">
       {initials(priest.displayName)}
      </span>
     </div>
    )}
    <div className="min-w-0 flex-1">
     <div className="flex items-center gap-1.5">
      <h3 className="font-semibold text-surface-800 truncate">
       {priest.displayName}
      </h3>
      {priest.isVerified && (
       <BadgeCheck className="w-4 h-4 text-saffron-600 shrink-0" />
      )}
     </div>
     <div className="flex items-center gap-1 text-xs text-surface-500 mt-0.5">
      {priest.ratingCount > 0 ? (
       <>
        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
        <span className="font-medium text-surface-700">
         {priest.ratingAvg.toFixed(1)}
        </span>
        <span className="text-surface-400">({priest.ratingCount})</span>
       </>
      ) : (
       <span className="text-surface-400">New</span>
      )}
     </div>
    </div>
   </div>

   {priest.bio && (
    <p className="text-sm text-surface-600 leading-relaxed line-clamp-2 mb-3">
     {priest.bio}
    </p>
   )}

   {priest.specializations.length > 0 && (
    <div className="flex flex-wrap gap-1.5 mb-3">
     {priest.specializations.slice(0, 3).map((s) => (
      <span
       key={s}
       className="px-2 py-0.5 bg-saffron-50 text-saffron-700 text-xs rounded-full"
      >
       {s}
      </span>
     ))}
     {priest.specializations.length > 3 && (
      <span className="px-2 py-0.5 bg-surface-100 text-surface-500 text-xs rounded-full">
       +{priest.specializations.length - 3}
      </span>
     )}
    </div>
   )}

   <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-surface-500">
    {priest.languages.length > 0 && (
     <span className="inline-flex items-center gap-1">
      <Languages className="w-3 h-3" />
      {priest.languages.slice(0, 3).join(', ')}
     </span>
    )}
    {priest.experienceYears > 0 && (
     <span className="inline-flex items-center gap-1">
      <Award className="w-3 h-3" />
      {priest.experienceYears}+ yrs
     </span>
    )}
   </div>

   <div className="flex items-center justify-between pt-3 mt-3 border-t border-surface-100">
    <span className="inline-flex items-center gap-1 text-xs text-surface-500">
     <Flame className="w-3 h-3 text-saffron-500" />
     {priest.offeringCount} puja service{priest.offeringCount === 1 ? '' : 's'}
    </span>
    <span className="text-xs font-medium text-saffron-600">View profile →</span>
   </div>
  </Link>
 );
}

export default async function PanditsListingPage() {
 const priests = await getPublicPriests();

 return (
  <div className="min-h-[100dvh] bg-[var(--color-bg)]">
   {/* Hero */}
   <section className="bg-gradient-to-b from-saffron-50 to-[var(--color-bg)] py-12 px-4">
    <div className="max-w-6xl mx-auto">
     <h1 className={`${H1.catalogue} mb-3`}>
      Verified Pandits
     </h1>
     <p className="text-surface-600 max-w-2xl">
      Book authentic pujas with verified pandits across India.
     </p>
    </div>
   </section>

   <section className="py-10 px-4">
    <div className="max-w-6xl mx-auto">
     {priests.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-surface-200 p-12 text-center bg-[var(--color-surface)]">
       <Users className="w-12 h-12 text-saffron-300 mx-auto mb-3" />
       <h2 className="text-lg font-semibold text-surface-800 mb-2">
        No pandits listed yet
       </h2>
       <p className="text-sm text-surface-500 max-w-md mx-auto">
        We are onboarding verified pandits. New profiles appear here once
        reviewed by our team.
       </p>
      </div>
     ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
       {priests.map((p) => (
        <PriestCard key={p.id} priest={p} />
       ))}
      </div>
     )}
    </div>
   </section>
  </div>
 );
}
