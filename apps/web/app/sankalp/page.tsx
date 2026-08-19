import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { GOTRAS, INTENTS } from '../../lib/sankalp';
import { NAKSHATRAS } from '../../lib/nakshatras';
import { RASHIS } from '../../lib/rashis';
import { SankalpClient } from './SankalpClient';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Sankalp Generator — Personalized Vedic Vow for Any Puja',
  description:
    'Generate your traditional Sanskrit sankalp (vow declaration) with your gotra, nakshatra, rashi, time, place, and intent. Used before every puja, vrat, donation, or homam. Free, no signup.',
  alternates: { canonical: `${BASE_URL}/sankalp` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Sankalp Generator — your personalized Vedic vow',
    description:
      'Recite the right Sanskrit declaration before any puja. Names your gotra, nakshatra, intent, and time per shastra.',
    url: `${BASE_URL}/sankalp`,
    type: 'website',
  },
};

export default function SankalpPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to declare Sankalp before a puja',
    description:
      'A traditional sankalp names the time, place, gotra, nakshatra, rashi, and intent before any Vedic ritual. This tool generates it for you.',
    step: [
      { '@type': 'HowToStep', name: 'Sit facing east', text: 'Sit facing east or north, ideally on a clean asana.' },
      { '@type': 'HowToStep', name: 'Hold water in right palm', text: 'Take a teaspoon of water in your right palm with a few akshat (rice grains) and a flower.' },
      { '@type': 'HowToStep', name: 'Recite the sankalp', text: 'Recite the generated Sanskrit declaration aloud, stating your details and intent.' },
      { '@type': 'HowToStep', name: 'Release water', text: 'Release the water onto a copper plate or the earth to seal the resolve.' },
    ],
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Sankalp Generator', item: `${BASE_URL}/sankalp` },
    ],
  };

  const nakshatraNames = NAKSHATRAS.map((n) => n.name);
  const rashiOptions = RASHIS.map((r) => ({ value: r.rashiEnglish, label: `${r.rashiEnglish} (${r.rashiHindi})` }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-saffron-600">Free tool</p>
        <h1 className={`${H1.catalogue} mt-1`}>Sankalp Generator</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Every Vedic ritual begins with a <strong>sankalp</strong> — a formal Sanskrit declaration naming
          your gotra, place, time, and intent. This tool builds yours instantly per shastra.
        </p>
      </header>

      <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/50 p-5 text-sm text-amber-900">
        <strong className="block mb-1">Why this matters</strong>
        Skipping or fudging sankalp is the #1 reason rituals feel hollow. Without it the puja becomes mechanical;
        with it, your specific intent is recorded in the Sanskrit tradition before God, gotra, and dik.
      </div>

      <SankalpClient
        gotras={GOTRAS}
        intents={INTENTS}
        nakshatraNames={nakshatraNames}
        rashiOptions={rashiOptions}
      />

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">How to recite</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm text-gray-700">
          <li>Sit facing east or north on a clean asana, ideally after a bath.</li>
          <li>Take a teaspoon of water in your right palm with a few <em>akshat</em> (unbroken rice) and a flower.</li>
          <li>Recite the generated Sanskrit aloud — slowly, clearly, with attention on the intent.</li>
          <li>Release the water onto a copper plate or directly onto earth to seal the resolve.</li>
          <li>Proceed with the puja, vrat, or donation immediately after.</li>
        </ol>
      </section>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">Don't know your gotra?</h2>
        <p className="mt-3 text-sm text-gray-700">
          Ask the eldest male in your paternal line, your family priest, or check old wedding invitations or
          shraddha documents. If still unknown, traditional practice allows <strong>Kashyap gotra</strong>
          as the universal default (Kashyapa fathered all beings).
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">Related</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href="/nakshatra" className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">27 Nakshatras</div>
            <div className="text-xs text-indigo-700">Find your birth star</div>
          </Link>
          <Link href="/rashi" className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 hover:bg-emerald-100">
            <div className="text-sm font-semibold text-emerald-900">12 Rashis</div>
            <div className="text-xs text-emerald-700">Your moon sign profile</div>
          </Link>
          <Link href="/muhurat" className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 hover:bg-amber-100">
            <div className="text-sm font-semibold text-amber-900">Muhurat Guide</div>
            <div className="text-xs text-amber-700">Best time for sankalp</div>
          </Link>
          <Link href="/pujas" className="rounded-xl border border-saffron-200 bg-saffron-50/50 p-4 hover:bg-saffron-100">
            <div className="text-sm font-semibold text-saffron-900">Book a Puja</div>
            <div className="text-xs text-saffron-700">Use this sankalp at booking</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
