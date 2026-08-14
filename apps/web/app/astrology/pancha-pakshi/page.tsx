import type { Metadata } from 'next';
import Link from 'next/link';
import PanchaPakshiClient from './PanchaPakshiClient';
import { ACTIVITIES, ACTIVITY_COLOR, PANCHA_PAKSHI_BIRDS } from '../../../lib/pancha-pakshi';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;

export const metadata: Metadata = {
 title: 'Pancha Pakshi Shastra — Tamil Siddhar 5-Bird Astrology | Free',
 description:
  'Free Pancha Pakshi Sastra calculator — ancient Tamil Siddhar 5-bird system. Find your ruling bird (Vulture / Owl / Crow / Cock / Peacock) by birth nakshatra. Get personality, lucky days, compatible birds, careers, mantra + remedy. 5 daily activities (Rules / Eats / Walks / Sleeps / Dies) explained. Per S.M. Manuswamy & Tamil Siddhar tradition.',
 alternates: { canonical: `${BASE_URL}/astrology/pancha-pakshi` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Pancha Pakshi Shastra — Tamil 5-Bird Astrology',
  description: 'Which Pakshi rules you? Vulture / Owl / Crow / Cock / Peacock — find your bird by nakshatra.',
  url: `${BASE_URL}/astrology/pancha-pakshi`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Pancha Pakshi Shastra?',
  a: 'Pancha Pakshi Sastra is an ancient Tamil Siddhar (Yogi-sage) astrological system that classifies all humans under 5 birds — Vulture, Owl, Crow, Cock, Peacock — based on birth nakshatra and lunar paksha (waxing or waning). Each day is divided into 5 windows where each bird performs one of 5 activities (Rules, Eats, Walks, Sleeps, Dies). The bird and its activity at any moment determine the auspiciousness of action.',
 },
 {
  q: 'How is Pancha Pakshi different from regular Vedic astrology?',
  a: 'Vedic Jyotisha (from Brihat Parashara) uses planets + 12 houses + 27 nakshatras. Pancha Pakshi is a parallel Tamil system from Siddhar Yoga tradition that uses bird-archetypes as the unit of analysis. The two are complementary — many Tamil astrologers consult both for major muhurat decisions.',
 },
 {
  q: 'Which bird is the strongest?',
  a: 'No bird is universally strongest — strength depends on the moment. At any given window, one bird is Ruling (peak power) while another is Dying (lowest). The system is dynamic: your bird is at peak some hours, dormant in others. The art is matching your activity to the right window.',
 },
 {
  q: 'Can I do important work when my bird is Dying?',
  a: 'Tradition strongly advises against major auspicious work (marriage, business launch, signing contracts, long travel) when your bird is in the Dying or Sleeping window. These periods are best used for rest, study, planning, or routine work. The Ruling and Eating windows are reserved for important action.',
 },
 {
  q: 'How do I compute the bird activity for any specific time?',
  a: 'Full computation requires sunrise time + lunar paksha (waxing or waning fortnight) + weekday. Each day from sunrise to sunset is divided into 5 parts per the bird-of-the-day, and each night is similarly divided. A pandit-led muhurat consultation gives you the bird-activity table for your important date.',
 },
 {
  q: 'Does Pancha Pakshi apply outside Tamil Nadu?',
  a: 'The system originated in Tamil Siddhar tradition but is followed across South India (Kerala, Karnataka, Andhra). Increasingly recognised by North Indian Vedic astrologers as a powerful muhurat refinement layer on top of Panchang.',
 },
 {
  q: 'My birth nakshatra appears in two birds — which is mine?',
  a: 'A small overlap exists in some traditions because nakshatra-to-bird mapping varies between regional Pancha Pakshi schools (Pillai vs. Manuswamy vs. Aiyar lineage). For the purpose of this free tool we use the most commonly cited mapping. A specialist Tamil Jyotisha pandit can confirm by consulting your paksha (Shukla / Krishna) and lagna.',
 },
 {
  q: 'What remedies work for a weak Pakshi position?',
  a: 'Each bird has a deity (Garuda / Lakshmi / Shani / Murugan / Saraswati), a mantra, a lucky direction/color, and dietary preferences. Daily mantra chanting, color-of-bird clothing on lucky days, facing the lucky direction during meditation, and offerings to the bird&apos;s deity all strengthen the Pakshi. See per-bird detail pages for specifics.',
 },
];

const FAQ_LD = {
 '@context': 'https://schema.org',
 '@type': 'FAQPage',
 mainEntity: FAQS.map((f) => ({
  '@type': 'Question',
  name: f.q,
  acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/&apos;/g, "'") },
 })),
};

const BREADCRUMB_LD = {
 '@context': 'https://schema.org',
 '@type': 'BreadcrumbList',
 itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
  { '@type': 'ListItem', position: 2, name: 'Astrology', item: `${BASE_URL}/astrology` },
  { '@type': 'ListItem', position: 3, name: 'Pancha Pakshi', item: `${BASE_URL}/astrology/pancha-pakshi` },
 ],
};

const ITEMLIST_LD = {
 '@context': 'https://schema.org',
 '@type': 'ItemList',
 itemListElement: PANCHA_PAKSHI_BIRDS.map((b, i) => ({
  '@type': 'ListItem',
  position: i + 1,
  url: `${BASE_URL}/astrology/pancha-pakshi/${b.slug}`,
  name: `${b.name} (${b.sanskrit})`,
 })),
};

const WEBAPP_LD = {
 '@context': 'https://schema.org',
 '@type': 'WebApplication',
 name: 'Pancha Pakshi Shastra Calculator',
 url: `${BASE_URL}/astrology/pancha-pakshi`,
 applicationCategory: 'LifestyleApplication',
 offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
 operatingSystem: 'Web',
};

export default function PanchaPakshiPage() {
 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ITEMLIST_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBAPP_LD) }} />

   <main>
    <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
     <nav className="text-xs text-gray-600">
      <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
      <Link href="/astrology" className="hover:text-saffron-700">Astrology</Link> · <span className="text-gray-900">Pancha Pakshi</span>
     </nav>

     <header className="mt-4 text-center">
      <p className="text-xs uppercase tracking-wider text-saffron-600">Free Tamil Siddhar 5-bird astrology</p>
      <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">Pancha Pakshi Shastra</h1>
      <p className="mt-2 text-sm text-saffron-700">பஞ்ச பட்சி சாஸ்திரம் · पञ्च पक्षी शास्त्र</p>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-700">
       Ancient Tamil Siddhar system classifying humans under 5 birds —
       Vulture, Owl, Crow, Cock, Peacock — by birth nakshatra. Each bird has
       lucky days, direction, color, deity, mantra, and a daily activity
       cycle (Rules / Eats / Walks / Sleeps / Dies). Powerful muhurat layer
       on top of Vedic Panchang.
      </p>
     </header>
    </section>

    <PanchaPakshiClient />

    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">5 daily activities of every Pakshi</h2>
     <p className="mt-1 text-sm text-gray-700">
      From sunrise to sunset every bird passes through these 5 states. Match your task
      to your bird&apos;s state for that window.
     </p>
     <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {ACTIVITIES.map((a) => (
       <div key={a.slug} className={`rounded-2xl border-2 p-4 ${ACTIVITY_COLOR[a.quality]}`}>
        <p className="text-xs uppercase tracking-wider">Activity</p>
        <p className="mt-1 font-serif text-lg font-bold">{a.label}</p>
        <p className="mt-2 text-xs leading-relaxed">{a.meaning}</p>
       </div>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">5 Pakshi at a glance</h2>
     <div className="mt-4 overflow-x-auto rounded-2xl border border-saffron-200">
      <table className="w-full text-sm">
       <thead className="bg-saffron-50 text-left text-xs uppercase tracking-wider text-saffron-800">
        <tr>
         <th className="px-4 py-3">Bird</th>
         <th className="px-4 py-3">Tamil</th>
         <th className="px-4 py-3">Element</th>
         <th className="px-4 py-3">Planet</th>
         <th className="px-4 py-3">Direction</th>
         <th className="px-4 py-3">Deity</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-saffron-100 text-gray-700">
        {PANCHA_PAKSHI_BIRDS.map((b) => (
         <tr key={b.slug}>
          <td className="px-4 py-3 font-semibold text-gray-900">
           <Link href={`/astrology/pancha-pakshi/${b.slug}`} className="hover:text-saffron-700">{b.name}</Link>
           <br /><span className="text-xs font-normal text-saffron-700">{b.sanskrit}</span>
          </td>
          <td className="px-4 py-3 text-xs">{b.tamil}</td>
          <td className="px-4 py-3 text-xs capitalize">{b.element}</td>
          <td className="px-4 py-3 text-xs">{b.planet}</td>
          <td className="px-4 py-3 text-xs">{b.luckyDirection}</td>
          <td className="px-4 py-3 text-xs">{b.deity.split('·')[0]?.trim() ?? b.deity}</td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">FAQs about Pancha Pakshi</h2>
     <div className="mt-6 space-y-3">
      {FAQS.map((f) => (
       <details key={f.q} className="rounded-2xl border border-saffron-200 bg-white p-5">
        <summary className="cursor-pointer font-serif text-base font-semibold text-gray-900">{f.q}</summary>
        <p className="mt-3 text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: f.a }} />
       </details>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-lg text-gray-900">Want a Pakshi-based muhurat for your special date?</p>
      <p className="mt-2 text-sm text-gray-700">
       A Tamil Jyotisha pandit can give you the exact bird-activity table for any date —
       so you know when to sign, marry, launch, or travel.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask a Pandit Live
       </Link>
       <Link href="/astrology" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        ← All free astrology tools
       </Link>
      </div>
     </div>
    </section>
   </main>
  </>
 );
}
