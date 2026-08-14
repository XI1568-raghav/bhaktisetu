import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
 ArrowLeft,
 Star,
 BadgeCheck,
 Languages,
 Award,
 Clock,
 IndianRupee,
 Flame,
} from 'lucide-react';
import { getPublicPriest, type Offering } from '../../../lib/pandit-api';


interface PageProps {
 params: Promise<{ id: string }>;
}

function initials(name: string): string {
 const parts = name.trim().split(/\s+/);
 const first = parts[0]?.charAt(0) ?? '';
 const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? '' : '';
 return (first + last).toUpperCase() || 'P';
}

function formatCurrency(amount: number): string {
 return new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
 }).format(amount);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
 const { id } = await params;
 const priest = await getPublicPriest(id);
 if (!priest) return { title: 'Pandit' };
 return {
  title: `${priest.displayName} · Verified Pandit`,
  alternates: { canonical: `https://darshya.online/pandits/${id}` },
  description:
   priest.bio?.slice(0, 160) ??
   `Book authentic pujas with ${priest.displayName} on Darshya. Verified pandit, transparent pricing.`,
 };
}

function OfferingCard({
 panditId,
 offering,
}: {
 panditId: string;
 offering: Offering;
}) {
 const price = parseFloat(offering.basePrice);
 return (
  <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 hover:border-saffron-200 transition-colors">
   <div className="flex flex-col sm:flex-row sm:items-start gap-4">
    <div className="w-12 h-12 bg-saffron-50 rounded-xl flex items-center justify-center shrink-0">
     <Flame className="w-5 h-5 text-saffron-500" />
    </div>
    <div className="flex-1 min-w-0">
     <div className="flex flex-wrap items-center gap-2 mb-1">
      <h3 className="text-base font-semibold text-surface-800">
       {offering.name}
      </h3>
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-saffron-50 text-saffron-700">
       {offering.deity}
      </span>
     </div>
     {offering.description && (
      <p className="text-sm text-surface-500 mt-1 leading-relaxed">
       {offering.description}
      </p>
     )}
     <div className="flex items-center gap-4 mt-3 text-sm text-surface-600">
      <span className="inline-flex items-center gap-1 font-medium text-surface-800">
       <IndianRupee className="w-3.5 h-3.5" />
       {formatCurrency(price).replace('₹', '')}
      </span>
      <span className="inline-flex items-center gap-1 text-surface-500">
       <Clock className="w-3.5 h-3.5" />
       {offering.durationMinutes} min
      </span>
     </div>
    </div>
    <div className="shrink-0">
     <Link
      href={`/checkout/offering/${offering.id}`}
      className="inline-flex items-center justify-center px-4 py-2 bg-saffron-600 text-white text-sm font-medium rounded-lg hover:bg-saffron-700 transition-colors"
     >
      Book This Puja
     </Link>
    </div>
   </div>
  </div>
 );
}

export default async function PanditDetailPage({ params }: PageProps) {
 const { id } = await params;
 const priest = await getPublicPriest(id);

 if (!priest) notFound();

 return (
  <div className="min-h-[100dvh] bg-[var(--color-bg)]">
   <div className="max-w-4xl mx-auto px-4 py-6">
    <Link
     href="/pandits"
     className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-700 mb-6"
    >
     <ArrowLeft className="w-4 h-4" />
     All pandits
    </Link>

    {/* Hero card */}
    <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 mb-6">
     <div className="flex flex-col sm:flex-row gap-5">
      {priest.avatarUrl ? (
       // eslint-disable-next-line @next/next/no-img-element
       <img
        src={priest.avatarUrl}
        alt={priest.displayName}
        className="w-20 h-20 rounded-full object-cover shrink-0"
       />
      ) : (
       <div className="w-20 h-20 bg-saffron-100 rounded-full flex items-center justify-center shrink-0">
        <span className="text-2xl font-bold text-saffron-700">
         {initials(priest.displayName)}
        </span>
       </div>
      )}
      <div className="flex-1 min-w-0">
       <div className="flex items-center gap-2 mb-2">
        <h1 className="text-2xl font-semibold text-surface-800">
         {priest.displayName}
        </h1>
        {priest.isVerified && (
         <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-saffron-50 text-saffron-700 text-xs font-medium rounded-full">
          <BadgeCheck className="w-3.5 h-3.5" />
          Verified
         </span>
        )}
       </div>
       <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-surface-500 mb-3">
        {priest.ratingCount > 0 ? (
         <span className="inline-flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-medium text-surface-700">
           {priest.ratingAvg.toFixed(1)}
          </span>
          <span className="text-surface-400">
           ({priest.ratingCount} review{priest.ratingCount === 1 ? '' : 's'})
          </span>
         </span>
        ) : (
         <span className="text-surface-400">New pandit · No reviews yet</span>
        )}
        {priest.experienceYears > 0 && (
         <span className="inline-flex items-center gap-1">
          <Award className="w-3.5 h-3.5" />
          {priest.experienceYears}+ years experience
         </span>
        )}
        {priest.languages.length > 0 && (
         <span className="inline-flex items-center gap-1">
          <Languages className="w-3.5 h-3.5" />
          {priest.languages.join(', ')}
         </span>
        )}
       </div>
       {priest.bio && (
        <p className="text-sm text-surface-600 leading-relaxed">
         {priest.bio}
        </p>
       )}
      </div>
     </div>
    </div>

    {/* Specializations */}
    {priest.specializations.length > 0 && (
     <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5 mb-6">
      <h2 className="text-sm font-semibold text-surface-700 mb-3 inline-flex items-center gap-2">
       <Award className="w-4 h-4 text-saffron-600" />
       Specializations
      </h2>
      <div className="flex flex-wrap gap-2">
       {priest.specializations.map((s) => (
        <span
         key={s}
         className="px-3 py-1 bg-saffron-50 text-saffron-700 text-xs rounded-full"
        >
         {s}
        </span>
       ))}
      </div>
     </div>
    )}

    {/* Puja Services */}
    <div className="mb-6">
     <h2 className="text-lg font-semibold text-surface-800 mb-3 inline-flex items-center gap-2">
      <Flame className="w-5 h-5 text-saffron-500" />
      Puja Services Offered
     </h2>
     {priest.offerings.length === 0 ? (
      <div className="rounded-xl border border-dashed border-surface-200 p-8 text-center bg-[var(--color-surface)]">
       <p className="text-sm text-surface-500">
        This pandit hasn&apos;t listed any pujas yet.
       </p>
      </div>
     ) : (
      <div className="space-y-3">
       {priest.offerings.map((o) => (
        <OfferingCard key={o.id} panditId={priest.id} offering={o} />
       ))}
      </div>
     )}
    </div>
   </div>
  </div>
 );
}
