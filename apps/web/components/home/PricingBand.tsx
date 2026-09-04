import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CITY_PUJAS } from '../../lib/city-pujas';
import { feeDisclosureLine, formatInr } from '../../lib/puja-pricing';

/**
 * PLAN §4 — the monetization band the homepage does not have.
 *
 * MEASURED ON THE LIVE PAGE (darshya.online, 2026-09-01): sixteen rupee
 * figures are scattered through the document — ₹25, ₹15, ₹1,299, ₹599, ₹249,
 * ₹2,499, ₹1,100, ₹51, ₹399, ₹299, ₹24,999 — and there is no pricing block
 * anywhere. At 390x844 the FIRST price a visitor meets is at fold 5.1: five
 * screens of scrolling before the page answers "what does this cost?".
 *
 * WHY THE PRICES ARE NOT WRITTEN HERE
 *
 * Every figure is read from `CITY_PUJAS`, the same table the /pujas funnel and
 * the city landing pages render. Hardcoding three prices into a marketing
 * component is exactly how CM-11 and DF-05 happened: the old homepage carried
 * "200+ verified temples" and "500+ vetted pandits" as string literals against
 * an inventory roughly a tenth of that, and WorshipStrip advertised cow
 * adoption "from ₹500 a month" against a plan table whose cheapest monthly
 * tier is ₹3,000. A price that lives in two places drifts.
 *
 * WHY EACH CARD SHOWS THE TOTAL, NOT THE BASE
 *
 * This is CM-03, and it is the reason a pricing block could not simply be
 * added. An advertised ₹1,100 became ₹1,301 at step 3 of 4 on a site whose
 * trust strip promised "₹0 hidden fees". The fees are real — the API folds
 * both into `priceAmount` and mints the Razorpay order from that — so the fix
 * is disclosure, not deletion. `feeDisclosureLine()` is the same helper the
 * puja card, the detail hero and the temple compare row use, so the buyer sees
 * one sentence, unchanged, at every step of the funnel. Publishing a base
 * price here without it would re-create the defect on the highest-traffic page
 * on the site.
 */

/** Three genuinely distinct intents, not three price points of one thing. */
const FEATURED = ['satyanarayan-puja', 'griha-pravesh', 'rudrabhishek'] as const;

const WHY: Record<string, string> = {
  'satyanarayan-puja': 'The most-booked ceremony. Katha, sankalp and prasad.',
  'griha-pravesh': 'New-home entry with vaastu sankalp, on your muhurat.',
  rudrabhishek: 'Abhishek with the full Rudram, at a Kashi temple.',
};

export default function PricingBand() {
  const picks = FEATURED.map((slug) => CITY_PUJAS.find((p) => p.puja === slug)).filter(
    (p): p is NonNullable<typeof p> => Boolean(p)
  );

  // If the catalogue ever stops carrying these, render nothing rather than a
  // band with holes in it.
  if (picks.length === 0) return null;

  return (
    <section className="py-10 md:py-14" style={{ background: 'var(--color-surface)' }}>
      <div className="container-wide">
        <div className="flex items-baseline justify-between gap-4 mb-5">
          <div>
            <p
              className="text-xs font-medium uppercase tracking-widest mb-1"
              style={{ color: 'var(--color-primary)' }}
            >
              What it costs
            </p>
            <h2
              className="text-xl sm:text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Fixed prices, quoted in full
            </h2>
          </div>
          <Link
            href="/pujas"
            className="tap-safe items-center gap-1 text-xs font-medium link-underline"
            style={{ color: 'var(--color-primary)' }}
          >
            All pujas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {picks.map((p, i) => (
            <Link
              key={p.puja}
              href={`/pujas/${p.puja}`}
              prefetch={false}
              data-reveal="up"
              data-delay={String(i)}
              className="group flex flex-col rounded-xl p-5 card-hover"
              style={{
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
              }}
            >
              <h3
                className="text-base font-semibold tracking-tight"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                {p.pujadisplay}
              </h3>
              <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--color-text-muted)' }}>
                {WHY[p.puja] ?? p.intent}
              </p>

              <div className="mt-4">
                <span
                  className="text-2xl font-semibold"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                >
                  ₹{formatInr(p.priceInr)}
                </span>
                {/* CM-03: the all-in figure, in the same words the funnel uses. */}
                <span className="mt-0.5 block text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {feeDisclosureLine(p.priceInr)}
                </span>
              </div>

              <span
                className="mt-3 text-xs"
                style={{ color: 'var(--color-text-faint)' }}
              >
                {p.durationMinutes >= 60
                  ? `About ${Math.round(p.durationMinutes / 60)} hour${p.durationMinutes >= 120 ? 's' : ''}`
                  : `About ${p.durationMinutes} minutes`}{' '}
                · {p.templeName}
              </span>

              <span
                className="tap-safe mt-3 items-center gap-1 text-xs font-medium"
                style={{ color: 'var(--color-primary)' }}
              >
                See what is included <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-4 text-xs" style={{ color: 'var(--color-text-faint)' }}>
          Prices in INR. The amount shown as the total is the amount charged.
        </p>
      </div>
    </section>
  );
}
