import { Shield, Users, BadgeCheck, FileCheck, Video } from 'lucide-react';
import { verifiedTempleClaim } from '../../lib/platform-stats';

type TrustItem = {
  Icon: typeof Shield;
  text: string;
};

interface Props {
  /**
   * CM-11 (prod sweep 2026-08-12): server-counted temples, or `null` when the
   * count could not be read. The strip used to hardcode "200+ verified
   * temples" and "500+ vetted pandits" against a database holding 20 temples
   * and 3 priests. A number here now only ever comes from a count; when there
   * is no count the copy loses its digits rather than falling back to a
   * remembered figure. See lib/platform-stats.ts.
   */
  verifiedTemples?: number | null;
}

const STATIC_ITEMS: TrustItem[] = [
  // The pandit line is deliberately not a headcount. Three seeded priests is
  // true and reads as an empty marketplace; "Aadhaar-verified" is the claim
  // that is both true and worth making. Restore a number when supply is real.
  { Icon: Users, text: 'Aadhaar-verified pandits' },
  // CM-03 (prod sweep 2026-08-12): this used to promise zero hidden fees while
  // checkout added a ₹51 platform fee (plus ₹150 for prasad delivery) that no
  // surface before step 3 of 4 mentioned. Both are genuinely charged, so the
  // claim was false. The wizard now discloses them on its first screen, which
  // makes "shown upfront" true — "zero fees" still would not be.
  { Icon: BadgeCheck, text: 'All fees shown upfront' },
  { Icon: FileCheck, text: '80G receipt available' },
  { Icon: Video, text: 'Live video proof' },
];

export default function TrustStrip({ verifiedTemples = null }: Props) {
  const ITEMS: TrustItem[] = [
    { Icon: Shield, text: verifiedTempleClaim(verifiedTemples) },
    ...STATIC_ITEMS,
  ];

  return (
    <section
      aria-label="Trust and verification signals"
      className="w-full"
      style={{ background: 'var(--color-surface-offset)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs sm:text-xs font-medium">
          {ITEMS.map((item, i) => (
            <li key={item.text} className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <item.Icon className="w-3.5 h-3.5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                <span style={{ color: 'var(--color-text)' }}>{item.text}</span>
              </span>
              {i < ITEMS.length - 1 && (
                <span className="hidden sm:inline w-1 h-1 rounded-full" style={{ background: 'var(--color-text-faint)' }} aria-hidden="true" />
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
