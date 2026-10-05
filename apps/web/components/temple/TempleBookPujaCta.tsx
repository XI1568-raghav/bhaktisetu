import Link from 'next/link';
import { ArrowUpRight, Flame } from 'lucide-react';
import { templeBookCta, type TempleOfferingLike } from '../../lib/temple-booking';

/**
 * The "Book Puja via Darshya" card. Always rendered (owner decision
 * 2026-10-06): every registered temple has standard offerings, so the CTA is
 * never hidden or replaced by a "coming soon" card. See `templeBookCta`.
 */
export default function TempleBookPujaCta({
  templeSlug,
  apiTempleSlug,
  offerings,
  className,
  variant = 'card',
}: {
  templeSlug: string;
  apiTempleSlug: string | null;
  offerings: readonly TempleOfferingLike[] | null | undefined;
  className?: string;
  /** 'card' = the hero CTA tile; 'button' = the compact sidebar action. */
  variant?: 'card' | 'button';
}) {
  const cta = templeBookCta(templeSlug, apiTempleSlug, offerings);

  if (variant === 'button') {
    return (
      <Link
        href={cta.href}
        className={
          className ??
          'flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-600 py-2.5 text-sm font-medium text-white hover:bg-saffron-700'
        }
      >
        <Flame className="h-4 w-4" /> Book Puja
      </Link>
    );
  }

  return (
    <Link
      href={cta.href}
      className={
        className ??
        'group relative overflow-hidden rounded-xl bg-gradient-to-br from-saffron-600 to-saffron-700 p-6 text-white shadow-warm-md transition-transform hover:-translate-y-0.5'
      }
    >
      <Flame className="mb-3 h-7 w-7 text-amber-200" />
      <div className="text-lg font-semibold">Book Puja via Darshya</div>
      {/* TC-08: "Verified priests" claimed a vetting process the product does
        not perform. Priest.isVerified, Priest.verificationStatus and
        Priest.aadhaarVerified have no writer anywhere outside prisma/seed.ts,
        so no credential check, reference call or probation stands behind the
        word. The two promises left are ones the platform actually makes. */}
      <p className="mt-1 text-sm text-white/80">
        Video proof of your ceremony, prasad delivery to your door
      </p>
      <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}
