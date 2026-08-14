import { CheckCircle2 } from 'lucide-react';
import { hasEnoughCompletions, MIN_COMPLETIONS_TO_SHOW } from '../lib/social-proof';

/**
 * CM-05 — the only social-proof surface on the puja funnel.
 *
 * It takes ONE prop that matters: a count the API computed from
 * `puja_bookings`. It has no default, no fallback copy and no second data
 * source, so the worst thing it can do when data is missing is disappear.
 *
 * What it deliberately does NOT render, and why:
 *  · No stars / ratings. `reviews` = 0 rows and `service_ratings` = 0 rows in
 *    Postgres; exactly one puja_booking carries a rating (n=1, avg 5.0). Any
 *    star on this page today would be invented.
 *  · No testimonials or devotee names. `devotee_names` is personal data given
 *    for a sankalp, not for marketing, and no consent to publish exists.
 *  · No proof video. Of the 9 rows with a non-null `video_proof_url`, 5 are
 *    literal junk ("not a url at all", "   ") and the remaining 4 point at
 *    placeholder hosts (cdn.example.com, drive.google.com/CORRECT-LINK). There
 *    is no playable genuine video to show, and publishing an identifiable
 *    devotee's puja recording is an owner/consent decision, not a code one.
 */
export interface PujaSocialProofProps {
  /** Completed pujas for this puja type, straight from the API's COUNT. */
  count: number;
  /** Used only to make the sentence read naturally. Never a source of numbers. */
  pujaName?: string;
  /** `hero` renders on the dark hero band; `card` on a light catalogue card. */
  variant?: 'card' | 'hero';
  className?: string;
}

export default function PujaSocialProof({
  count,
  pujaName,
  variant = 'card',
  className,
}: PujaSocialProofProps) {
  // Single gate. Missing, non-integer, negative, or below the honesty
  // threshold — including the API's own `bookingCount: 0` fallback rows —
  // renders nothing at all.
  if (!hasEnoughCompletions(count)) return null;

  const noun = count === 1 ? 'puja' : 'pujas';
  const subject = pujaName ? `${pujaName} ${noun}` : noun;
  const hero = variant === 'hero';

  return (
    <p
      data-testid="puja-social-proof"
      data-completed-count={count}
      className={[
        'inline-flex items-center gap-1.5 text-xs font-medium',
        hero
          ? 'rounded-full bg-white/20 px-3 py-1 text-white backdrop-blur-sm'
          : 'text-surface-600',
        className ?? '',
      ]
        .join(' ')
        .trim()}
    >
      <CheckCircle2 className={hero ? 'h-3.5 w-3.5 text-white' : 'h-3.5 w-3.5 text-saffron-600'} />
      <span>
        {count.toLocaleString('en-IN')} {subject} completed on Darshya
      </span>
    </p>
  );
}

/** Re-exported so pages can gate a whole section on the same rule. */
export { MIN_COMPLETIONS_TO_SHOW };
