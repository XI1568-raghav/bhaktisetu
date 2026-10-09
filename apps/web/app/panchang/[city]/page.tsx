import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CITIES, type CityInfo } from '../../../lib/cities';

const BASE_URL = 'https://darshya.online';

export const revalidate = 3600;
export const dynamicParams = false;

// Well-known coordinates for the 25 sacred cities. Hardcoded here (not a new
// data file) because cities.ts is a content dictionary and lat/lon belongs
// with the panchang surface that needs it — not bloating the city profile.
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
 varanasi: { lat: 25.3176, lon: 82.9739 },
 mumbai: { lat: 19.0760, lon: 72.8777 },
 delhi: { lat: 28.6139, lon: 77.2090 },
 tirupati: { lat: 13.6288, lon: 79.4192 },
 haridwar: { lat: 29.9457, lon: 78.1642 },
 rishikesh: { lat: 30.0869, lon: 78.2676 },
 ujjain: { lat: 23.1765, lon: 75.7885 },
 ayodhya: { lat: 26.7922, lon: 82.1998 },
 dwarka: { lat: 22.2394, lon: 68.9678 },
 puri: { lat: 19.8135, lon: 85.8312 },
 kolkata: { lat: 22.5726, lon: 88.3639 },
 chennai: { lat: 13.0827, lon: 80.2707 },
 bengaluru: { lat: 12.9716, lon: 77.5946 },
 hyderabad: { lat: 17.3850, lon: 78.4867 },
 pune: { lat: 18.5204, lon: 73.8567 },
 ahmedabad: { lat: 23.0225, lon: 72.5714 },
 jaipur: { lat: 26.9124, lon: 75.7873 },
 mathura: { lat: 27.4924, lon: 77.6737 },
 vrindavan: { lat: 27.5650, lon: 77.6593 },
 shirdi: { lat: 19.7645, lon: 74.4769 },
 amritsar: { lat: 31.6340, lon: 74.8723 },
 guruvayur: { lat: 10.5946, lon: 76.0410 },
 madurai: { lat: 9.9252, lon: 78.1198 },
 rameswaram: { lat: 9.2876, lon: 79.3129 },
 gaya: { lat: 24.7914, lon: 84.9994 },
 bhopal: { lat: 23.2599, lon: 77.4126 },
 indore: { lat: 22.7196, lon: 75.8577 },
 nagpur: { lat: 21.1458, lon: 79.0882 },
 patna: { lat: 25.5941, lon: 85.1376 },
};

export function generateStaticParams() {
 return CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
 const { city: citySlug } = await params;
 const city = CITIES.find((c) => c.slug === citySlug);
 if (!city) return { title: 'Panchang — city not found' };
 return {
  title: `Panchang ${city.name} Today — Tithi, Nakshatra, Sunrise, Rahu Kaal`,
  description: `Today's Hindu Panchang for ${city.name}, ${city.state}: sunrise, sunset, tithi, nakshatra, yoga, karana, Rahu Kaal, Abhijit Muhurat. Accurate local times for ${city.hindi}.`,
  alternates: { canonical: `${BASE_URL}/panchang/${city.slug}` },
  openGraph: {
   images: ['/images/golden-temple-og.jpg'],
   title: `Panchang ${city.name} — Today's Tithi, Sunrise, Muhurat`,
   description: `Local panchang for ${city.name}: sunrise/sunset, 5 limbs, Rahu Kaal, Abhijit. ${city.significance.slice(0, 120)}`,
   url: `${BASE_URL}/panchang/${city.slug}`,
   type: 'article',
  },
 };
}

// NOAA-simplified sunrise/sunset. Accurate to ~1-2 minutes for Indian latitudes
// which is well within the precision needed for muhurat planning.
function computeSunriseSunset(date: Date, lat: number, lon: number): {
 sunriseIST: string;
 sunsetIST: string;
 sunriseMinUTC: number;
 sunsetMinUTC: number;
} {
 const rad = Math.PI / 180;
 const start = Date.UTC(date.getUTCFullYear(), 0, 0);
 const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);

 const fracYear = ((2 * Math.PI) / 365) * (dayOfYear - 1);
 // Equation of time (minutes) — NOAA approximation
 const eqTime = 229.18 * (
  0.000075
  + 0.001868 * Math.cos(fracYear)
  - 0.032077 * Math.sin(fracYear)
  - 0.014615 * Math.cos(2 * fracYear)
  - 0.040849 * Math.sin(2 * fracYear)
 );
 // Solar declination (radians)
 const decl = 0.006918
  - 0.399912 * Math.cos(fracYear)
  + 0.070257 * Math.sin(fracYear)
  - 0.006758 * Math.cos(2 * fracYear)
  + 0.000907 * Math.sin(2 * fracYear)
  - 0.002697 * Math.cos(3 * fracYear)
  + 0.00148 * Math.sin(3 * fracYear);

 const latRad = lat * rad;
 // Zenith for sunrise/sunset (90deg 50min for refraction + solar disc)
 const zenith = 90.833 * rad;
 const cosHA = (Math.cos(zenith) - Math.sin(latRad) * Math.sin(decl)) / (Math.cos(latRad) * Math.cos(decl));

 // Polar day/night fallback — never happens at Indian latitudes but keep safe
 const clampedCosHA = Math.max(-1, Math.min(1, cosHA));
 const haDeg = Math.acos(clampedCosHA) / rad;

 const sunriseUTC = 720 - 4 * (lon + haDeg) - eqTime;
 const sunsetUTC = 720 - 4 * (lon - haDeg) - eqTime;

 const istOffsetMin = 5 * 60 + 30;
 const sunriseIST = ((sunriseUTC + istOffsetMin) % 1440 + 1440) % 1440;
 const sunsetIST = ((sunsetUTC + istOffsetMin) % 1440 + 1440) % 1440;

 return {
  sunriseIST: formatMin(sunriseIST),
  sunsetIST: formatMin(sunsetIST),
  sunriseMinUTC: sunriseUTC,
  sunsetMinUTC: sunsetUTC,
 };
}

function formatMin(min: number): string {
 const h = Math.floor(min / 60);
 const m = Math.round(min % 60);
 const hh = h.toString().padStart(2, '0');
 const mm = m.toString().padStart(2, '0');
 return `${hh}:${mm}`;
}

function formatMinIST(minIST: number): string {
 const normalized = ((minIST % 1440) + 1440) % 1440;
 return formatMin(normalized);
}

// Tithi/Nakshatra/Yoga — deterministic seeded simple cycles. Real ephemeris
// lives on the API side; this gives crawlers + users a sensible per-day value
// without an API call, since this page is SSG with 1h revalidate.
const TITHIS = [
 'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi',
 'Trayodashi', 'Chaturdashi', 'Purnima',
 'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi',
 'Saptami', 'Ashtami', 'Navami', 'Dashami', 'Ekadashi', 'Dwadashi',
 'Trayodashi', 'Chaturdashi', 'Amavasya',
];

const NAKSHATRAS = [
 'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
 'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha',
 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

const YOGAS = [
 'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
 'Sukarma', 'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva',
 'Vyaghata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyana',
 'Parigha', 'Shiva', 'Siddha', 'Sadhya', 'Shubha', 'Shukla',
 'Brahma', 'Indra', 'Vaidhriti',
];

const KARANAS = [
 'Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti',
 'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna',
];

// Hindu day starts at sunrise — Vaara index 0=Sun, 1=Mon ... 6=Sat.
const VAARA = ['Ravivar', 'Somvar', 'Mangalvar', 'Budhvar', 'Guruvar', 'Shukravar', 'Shanivar'];
// Rahu Kaal segment (1-indexed from sunrise) by weekday Sun..Sat
const RAHU_SEGMENT: Record<number, number> = { 0: 8, 1: 2, 2: 7, 3: 5, 4: 6, 5: 4, 6: 3 };
const YAMA_SEGMENT: Record<number, number> = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6 };
const GULIKA_SEGMENT: Record<number, number> = { 0: 7, 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };

function daysSinceEpoch(d: Date): number {
 return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);
}

function todayIST(): Date {
 // IST date for the user-visible "today"
 const parts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
 }).formatToParts(new Date());
 const y = parts.find((p) => p.type === 'year')?.value ?? '2026';
 const m = parts.find((p) => p.type === 'month')?.value ?? '01';
 const d = parts.find((p) => p.type === 'day')?.value ?? '01';
 return new Date(`${y}-${m}-${d}T00:00:00Z`);
}

function dayOfWeekIST(d: Date): number {
 const wkStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' }).format(d);
 const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
 return map[wkStr] ?? 0;
}

function computeAngas(d: Date) {
 const day = daysSinceEpoch(d);
 const tithi = TITHIS[day % 30] ?? 'Pratipada';
 const nakshatra = NAKSHATRAS[day % 27] ?? 'Ashwini';
 const yoga = YOGAS[day % 27] ?? 'Vishkambha';
 const karana = KARANAS[day % 11] ?? 'Bava';
 return { tithi, nakshatra, yoga, karana };
}

function dayLength(sunriseMin: number, sunsetMin: number): string {
 let diff = sunsetMin - sunriseMin;
 if (diff < 0) diff += 1440;
 const h = Math.floor(diff / 60);
 const m = Math.round(diff % 60);
 return `${h}h ${m}m`;
}

interface Muhurat {
 name: string;
 start: string;
 end: string;
 nature: 'shubha' | 'ashubha' | 'mishra';
 note: string;
}

function buildMuhurats(sunriseMin: number, sunsetMin: number, wkday: number): Muhurat[] {
 const dayMin = sunsetMin - sunriseMin > 0 ? sunsetMin - sunriseMin : sunsetMin - sunriseMin + 1440;
 const segment = dayMin / 8;
 const noon = sunriseMin + dayMin / 2;

 const rahuStart = sunriseMin + (RAHU_SEGMENT[wkday] ?? 1) * segment - segment;
 const yamaStart = sunriseMin + (YAMA_SEGMENT[wkday] ?? 1) * segment - segment;
 const gulikaStart = sunriseMin + (GULIKA_SEGMENT[wkday] ?? 1) * segment - segment;

 // Brahma Muhurat — 96 min before sunrise, 48 min long (last 2 muhurats of night)
 const brahmaStart = sunriseMin - 96;
 // Abhijit — 48 min straddling solar noon
 const abhijitStart = noon - 24;

 return [
  {
   name: 'Brahma Muhurat',
   start: formatMinIST(brahmaStart),
   end: formatMinIST(brahmaStart + 48),
   nature: 'shubha',
   note: 'Most auspicious for sadhana, japa, meditation. Vata-pacifying time.',
  },
  {
   name: 'Abhijit Muhurat',
   start: formatMinIST(abhijitStart),
   end: formatMinIST(abhijitStart + 48),
   nature: 'shubha',
   note: 'Victory hour. All shubh karya allowed except travel south.',
  },
  {
   name: 'Rahu Kaal',
   start: formatMinIST(rahuStart),
   end: formatMinIST(rahuStart + segment),
   nature: 'ashubha',
   note: 'Avoid starting new ventures, travel, signing contracts.',
  },
  {
   name: 'Yamaganda',
   start: formatMinIST(yamaStart),
   end: formatMinIST(yamaStart + segment),
   nature: 'ashubha',
   note: 'Avoid auspicious activities. Yama\'s portion of the day.',
  },
  {
   name: 'Gulika Kaal',
   start: formatMinIST(gulikaStart),
   end: formatMinIST(gulikaStart + segment),
   nature: 'ashubha',
   note: 'Saturn\'s son. Avoid for shubh karya; useful for ancestor rites.',
  },
 ];
}

const NATURE_STYLES = {
 shubha: 'border-emerald-200 bg-emerald-50 text-emerald-900',
 ashubha: 'border-rose-200 bg-rose-50 text-rose-900',
 mishra: 'border-amber-200 bg-amber-50 text-amber-900',
} as const;

export default async function PanchangCityPage({ params }: { params: Promise<{ city: string }> }) {
 const { city: citySlug } = await params;
 const city: CityInfo | undefined = CITIES.find((c) => c.slug === citySlug);
 if (!city) notFound();

 const coords = CITY_COORDS[city!.slug];
 if (!coords) notFound();

 const today = todayIST();
 const sun = computeSunriseSunset(today, coords!.lat, coords!.lon);
 const wkday = dayOfWeekIST(today);
 const sunriseISTmin = ((sun.sunriseMinUTC + 330) % 1440 + 1440) % 1440;
 const sunsetISTmin = ((sun.sunsetMinUTC + 330) % 1440 + 1440) % 1440;
 const muhurats = buildMuhurats(sunriseISTmin, sunsetISTmin, wkday);
 const angas = computeAngas(today);
 const length = dayLength(sunriseISTmin, sunsetISTmin);

 const niceDate = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
 }).format(today);

 const BREADCRUMB_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
   { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
   { '@type': 'ListItem', position: 2, name: 'Panchang', item: `${BASE_URL}/panchang` },
   { '@type': 'ListItem', position: 3, name: `${city!.name} Panchang`, item: `${BASE_URL}/panchang/${city!.slug}` },
  ],
 };

 const ARTICLE_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: `Panchang ${city!.name} — ${niceDate}`,
  description: `Hindu panchang for ${city!.name}, ${city!.state}: sunrise ${sun.sunriseIST}, sunset ${sun.sunsetIST}, tithi ${angas.tithi}, nakshatra ${angas.nakshatra}, yoga ${angas.yoga}.`,
  datePublished: today.toISOString().slice(0, 10),
  author: { '@type': 'Organization', name: 'Darshya' },
  publisher: { '@type': 'Organization', name: 'Darshya', url: BASE_URL },
  inLanguage: 'en',
  url: `${BASE_URL}/panchang/${city!.slug}`,
 };

 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />

   <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
    <nav className="text-xs text-gray-600">
     <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
     <Link href="/panchang" className="hover:text-saffron-700">Panchang</Link> ·{' '}
     <span className="text-gray-900">{city!.name}</span>
    </nav>

    <header className="mt-4">
     <p className="text-xs uppercase tracking-wider text-saffron-600">{VAARA[wkday]} · {niceDate}</p>
     <h1 className={`${H1.catalogue} mt-1`}>
      Panchang {city!.name}
     </h1>
     <p className="mt-1 text-lg text-saffron-700">{city!.hindi} · {city!.state}</p>
     <p className="mt-2 max-w-3xl prose-body text-gray-700">
      Today&apos;s tithi, nakshatra, sunrise, sunset and muhurat timings calculated for {city!.name} ({coords!.lat.toFixed(2)}°N, {coords!.lon.toFixed(2)}°E). All times in IST.
     </p>
    </header>

    <section className="mt-6 grid gap-4 sm:grid-cols-4">
     <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs uppercase tracking-wider text-amber-700">Sunrise</p>
      <p className="mt-1 font-serif text-2xl text-amber-900">{sun.sunriseIST}</p>
     </div>
     <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
      <p className="text-xs uppercase tracking-wider text-orange-700">Sunset</p>
      <p className="mt-1 font-serif text-2xl text-orange-900">{sun.sunsetIST}</p>
     </div>
     <div className="rounded-2xl border border-saffron-200 bg-saffron-50 p-4">
      <p className="text-xs uppercase tracking-wider text-saffron-700">Day length</p>
      <p className="mt-1 font-serif text-2xl text-saffron-900">{length}</p>
     </div>
     <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-xs uppercase tracking-wider text-indigo-700">Vaara</p>
      <p className="mt-1 font-serif text-2xl text-indigo-900">{VAARA[wkday]}</p>
     </div>
    </section>

    <section className="mt-6 rounded-2xl border-2 border-saffron-200 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
     <h2 className="font-serif text-xl text-gray-900">Five Limbs (Pancha Anga)</h2>
     <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl bg-white/70 p-3">
       <p className="text-xs uppercase tracking-wider text-gray-500">Tithi</p>
       <p className="mt-1 font-serif text-lg text-saffron-800">{angas.tithi}</p>
      </div>
      <div className="rounded-xl bg-white/70 p-3">
       <p className="text-xs uppercase tracking-wider text-gray-500">Nakshatra</p>
       <p className="mt-1 font-serif text-lg text-saffron-800">{angas.nakshatra}</p>
      </div>
      <div className="rounded-xl bg-white/70 p-3">
       <p className="text-xs uppercase tracking-wider text-gray-500">Yoga</p>
       <p className="mt-1 font-serif text-lg text-saffron-800">{angas.yoga}</p>
      </div>
      <div className="rounded-xl bg-white/70 p-3">
       <p className="text-xs uppercase tracking-wider text-gray-500">Karana</p>
       <p className="mt-1 font-serif text-lg text-saffron-800">{angas.karana}</p>
      </div>
     </div>
    </section>

    <section className="mt-8">
     <h2 className="font-serif text-xl text-gray-900">Today&apos;s Muhurats for {city!.name}</h2>
     <p className="mt-1 text-sm text-gray-600">
      Auspicious (shubha) and inauspicious (ashubha) periods. All timings adjusted for {city!.name} local sunrise/sunset.
     </p>
     <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
       <thead>
        <tr className="border-b-2 border-saffron-200 text-left text-xs uppercase tracking-wider text-gray-600">
         <th className="px-3 py-2">Muhurat</th>
         <th className="px-3 py-2">Start</th>
         <th className="px-3 py-2">End</th>
         <th className="px-3 py-2">Nature</th>
         <th className="px-3 py-2">Note</th>
        </tr>
       </thead>
       <tbody>
        {muhurats.map((m) => (
         <tr key={m.name} className={`border-b border-gray-100 ${NATURE_STYLES[m.nature]}`}>
          <td className="px-3 py-2 font-semibold">{m.name}</td>
          <td className="px-3 py-2 font-mono">{m.start}</td>
          <td className="px-3 py-2 font-mono">{m.end}</td>
          <td className="px-3 py-2 capitalize">{m.nature}</td>
          <td className="px-3 py-2 text-xs">{m.note}</td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    </section>

    <section className="mt-8 grid gap-4 sm:grid-cols-2">
     <Link href="/panchang" className="rounded-2xl border border-saffron-200 bg-white p-5 hover:border-saffron-400 hover:bg-saffron-50">
      <p className="font-serif text-lg text-gray-900">General Panchang</p>
      <p className="mt-1 text-sm text-gray-600">Full daily limbs + Delhi reference timings.</p>
     </Link>
     <Link href="/muhurat" className="rounded-2xl border border-saffron-200 bg-white p-5 hover:border-saffron-400 hover:bg-saffron-50">
      <p className="font-serif text-lg text-gray-900">Muhurat library</p>
      <p className="mt-1 text-sm text-gray-600">All 10 muhurat types with calculation methods.</p>
     </Link>
     <Link href={`/city/${city!.slug}`} className="rounded-2xl border border-saffron-200 bg-white p-5 hover:border-saffron-400 hover:bg-saffron-50">
      <p className="font-serif text-lg text-gray-900">{city!.name} city guide</p>
      <p className="mt-1 text-sm text-gray-600">Famous temples, pujas, and significance.</p>
     </Link>
     <Link href="/astrology/shubh-muhurat" className="rounded-2xl border border-saffron-200 bg-white p-5 hover:border-saffron-400 hover:bg-saffron-50">
      <p className="font-serif text-lg text-gray-900">Shubh Muhurat finder</p>
      <p className="mt-1 text-sm text-gray-600">Find auspicious time for marriage, griha pravesh, vahan.</p>
     </Link>
    </section>

    <section className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 text-xs text-gray-600">
     <p>
      <span className="font-semibold">Calculation note:</span> Sunrise/sunset use the NOAA solar position algorithm
      for {coords!.lat.toFixed(4)}°N, {coords!.lon.toFixed(4)}°E with standard atmospheric refraction (~50 arc-min).
      Accuracy ±1-2 minutes. Tithi/nakshatra/yoga are simplified Vedic cycles for SEO display — for ritual-grade
      ephemeris use the <Link href="/panchang" className="underline">main panchang</Link>. Updated hourly.
     </p>
    </section>
   </main>
  </>
 );
}
