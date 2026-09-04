import type { Metadata } from 'next';
import Link from 'next/link';
import { Heart, MessageCircle, Video, Gift, Globe, ShieldCheck } from 'lucide-react';
import { GiftPujaForm } from './GiftPujaForm';
import { getPujaTypes } from '../../lib/api';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'Gift a puja to your family in India',
  description:
    'NRIs — send a Vedic puja to your parents or relatives in India. Recipient gets WhatsApp confirmation + video proof from the temple.',
  keywords: [
    'gift puja india',
    'send puja to parents',
    'nri gift puja',
    'puja gift for family',
    'send vedic ritual to india',
  ],
  openGraph: {
    title: 'Gift a puja to your family in India',
    description:
      'Recipient gets WhatsApp + video. Performed at the temple of your choice.',
    type: 'website',
    url: 'https://darshya.online/gift',
    images: ['/og/default.png'],
  },
  alternates: { canonical: 'https://darshya.online/gift' },
};

/**
 * CM-07 (prod sweep 2026-08-12) — /gift is the highest-value visitor on the
 * site (an NRI at 11pm remembering a parent's anniversary) and it carried NO
 * PRICE ANYWHERE: a regex for a currency amount over the full page text
 * returned zero matches. Everyone was routed through a form and told to wait
 * four hours for a number, while the self-serve /pujas rail next door has
 * prices and takes payment. Purchase intent here is emotional and time-boxed;
 * a four-hour gap loses most of it.
 *
 * The picker below is now the live catalogue with real prices, deep-linked
 * into the booking wizard. The concierge form stays for "not sure — recommend
 * one", which is what a concierge is for.
 */
const STEPS = [
  {
    n: '1',
    title: 'Pick the puja',
    body: 'Choose from the catalogue below — every listing shows its price before you commit to anything.',
  },
  {
    n: '2',
    title: 'Add recipient details',
    body: 'Name + WhatsApp number of the family member receiving the blessings. They will be in the sankalp.',
  },
  {
    n: '3',
    title: 'Book it yourself, or ask us',
    body: 'Book straight from the catalogue at the listed price. If you would rather we recommended one, use the form — we reply within 4 working hours (09:00–21:00 IST).',
  },
  {
    n: '4',
    title: 'Recipient gets WhatsApp + video',
    body: 'Recipient gets a WhatsApp confirmation once the puja is scheduled, or a call from our coordinator. Full video arrives within 24h of the puja.',
  },
];

const TRUST = [
  { icon: ShieldCheck, label: 'Verified temples', body: 'Every puja performed by a verified pandit at a real temple.' },
  { icon: Video, label: 'Video proof mandatory', body: 'Full recording of the ceremony — no exceptions.' },
  { icon: MessageCircle, label: 'WhatsApp updates', body: 'Recipient notified before, during, and after the puja.' },
  { icon: Globe, label: 'NRI-friendly', body: 'Book from anywhere in the world. Billing is in INR; international cards are accepted.' },
];

export default async function GiftPujaPage() {
  // Real prices, or none. A hardcoded "from ₹1,501" would be the same class of
  // defect this finding is about, so a failed fetch renders no picker at all
  // and the concierge form carries the page.
  let catalogue: { slug: string; name: string; basePrice: string }[] = [];
  try {
    const res = await getPujaTypes({ limit: 50 });
    catalogue = res.data ?? [];
  } catch {
    catalogue = [];
  }

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-saffron-50 via-white to-amber-50">
      <section className="max-w-5xl mx-auto px-4 pt-12 pb-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-saffron-100 px-3 py-1 text-xs font-semibold text-saffron-700 mb-4">
            <Gift className="h-3.5 w-3.5" />
            NRI gift puja
          </div>
          <h1 className={H1.marketing}>
            Gift a puja to your family in India
          </h1>
          <p className="prose-lead mt-4 text-surface-600 max-w-2xl mx-auto">
            Your parents or relatives in India receive a WhatsApp confirmation and a full video of the ceremony — within 24 hours of completion.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-surface-500">
            <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
            Most-gifted: <strong className="text-surface-700">Satyanarayan Puja for parents</strong>
          </div>
        </div>
      </section>

      {catalogue.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-8" aria-labelledby="gift-picker-heading">
          <h2 id="gift-picker-heading" className="text-xl font-bold text-surface-800 mb-1">
            Pick a puja &mdash; prices shown upfront
          </h2>
          <p className="text-sm text-surface-600 mb-4">
            Billed in INR; international cards are accepted. A platform fee is shown on the
            booking screen before you enter any details.
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {catalogue.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/pujas/${p.slug}/book`}
                  className="flex min-h-[44px] flex-col justify-between gap-1 rounded-xl border border-surface-200 bg-white p-4 hover:border-saffron-300 hover:shadow-sm transition"
                >
                  <span className="text-sm font-semibold text-surface-900">{p.name}</span>
                  <span className="text-sm text-saffron-700">
                    from &#8377;{Number(p.basePrice).toLocaleString('en-IN')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="max-w-5xl mx-auto px-4 pb-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold text-surface-800 mb-4">How it works</h2>
            <ol className="space-y-4">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron-600 text-sm font-bold text-white">
                    {s.n}
                  </span>
                  <div>
                    <h3 className="font-semibold text-surface-800">{s.title}</h3>
                    <p className="text-sm text-surface-600">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            <h2 className="text-xl font-bold text-surface-800 mt-8 mb-4">Why families trust Darshya</h2>
            <div className="grid grid-cols-2 gap-3">
              {TRUST.map((t) => (
                <div key={t.label} className="rounded-lg border border-surface-200 bg-white p-3">
                  <t.icon className="h-5 w-5 text-saffron-600" />
                  <h3 className="mt-2 text-sm font-semibold text-surface-800">{t.label}</h3>
                  <p className="text-xs text-surface-600 mt-1">{t.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="md:sticky md:top-4 self-start">
            <div className="rounded-2xl border border-surface-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-surface-800 mb-1">Start your gift puja</h2>
              <p className="text-sm text-surface-500 mb-4">
                Not sure which puja? We&apos;ll email you within 4 working hours
                (09:00&ndash;21:00 IST) with pandits and dates. To book right now at the listed
                price, use the catalogue above.
              </p>
              <GiftPujaForm />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="rounded-2xl bg-surface-900 px-6 py-8 text-center">
          <h2 className="text-xl font-bold text-white">Popular gift puja occasions</h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm">
            {[
              "Parents' anniversary",
              'Mother / father birthday',
              'New home pravesh',
              'Job promotion gratitude',
              'Newborn ashirvad',
              'Health recovery',
              'Pitra paksha shraddha',
              'Sibling marriage',
            ].map((o) => (
              <span key={o} className="rounded-full bg-white/10 px-3 py-1 text-white">
                {o}
              </span>
            ))}
          </div>
          <div className="mt-6">
            <Link
              href="/pujas"
              className={buttonClass('primary', 'md')}
            >
              Browse the full catalogue
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
