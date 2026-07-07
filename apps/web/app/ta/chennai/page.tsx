import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'தர்ஷ்யா சென்னை — பூஜை, தரிசனம், பஞ்சாங்கம் (தமிழில்)',
  description:
    'சென்னை மெட்ரோவில் சரிபார்க்கப்பட்ட பண்டிதர்கள் + 5 அணைய கோயில்கள் (கபாலீஸ்வரர், பார்த்தசாரதி, வடபழனி முருகன், மருந்தீஸ்வரர், இஸ்கான்) — வீடியோ ஆதாரத்துடன் பூஜை, நேரலை தரிசனம், 80G ரசீது.',
  alternates: {
    canonical: 'https://darshya.online/ta/chennai',
    languages: {
      en: 'https://darshya.online/city/chennai',
      ta: 'https://darshya.online/ta/chennai',
    },
  },
  openGraph: {
    title: 'தர்ஷ்யா சென்னை — தமிழ்நாட்டின் முதல் டிஜிட்டல் ஆலய மேடை',
    description: 'மயிலாப்பூர் கபாலீஸ்வரர், திருவல்லிக்கேணி பார்த்தசாரதி, வடபழனி, திருவான்மியூர், இஸ்கான் — அனைத்திற்கும் ஒரே ஆப்.',
    url: 'https://darshya.online/ta/chennai',
    type: 'website',
    locale: 'ta_IN',
    images: ['/og/default.png'],
  },
};

interface AnchorTemple {
  name: string;
  nameTamil: string;
  area: string;
  deity: string;
  highlight: string;
  status: 'live' | 'onboarding';
  href: string;
}

// Anchor temples per spec R-Q3-G-003 success criterion #3.
// Status 'onboarding' = founder MoU pending; flip to 'live' after temple-portal verification.
const ANCHOR_TEMPLES: AnchorTemple[] = [
  {
    name: 'Kapaleeshwarar',
    nameTamil: 'கபாலீஸ்வரர் ஆலயம்',
    area: 'மயிலாப்பூர் (Mylapore)',
    deity: 'சிவன் (கபாலீஸ்வரர் + கற்பகாம்பாள்)',
    highlight: '7-ம் நூற்றாண்டு பழமை. பங்குனி உத்திரம் ப்ரம்மோத்சவம் (மார்ச்) — லட்சக்கணக்கான தரிசனம்.',
    status: 'onboarding',
    href: '/city/chennai',
  },
  {
    name: 'Parthasarathy',
    nameTamil: 'பார்த்தசாரதி பெருமாள் ஆலயம்',
    area: 'திருவல்லிக்கேணி (Triplicane)',
    deity: 'விஷ்ணு (பார்த்தசாரதி)',
    highlight: '108 திவ்ய தேசங்களில் ஒன்று. வைகுண்ட ஏகாதசி பெருவிழா (டிசம்பர்).',
    status: 'onboarding',
    href: '/city/chennai',
  },
  {
    name: 'Vadapalani Murugan',
    nameTamil: 'வடபழனி ஆண்டவர் ஆலயம்',
    area: 'வடபழனி (Vadapalani)',
    deity: 'முருகன் (சுப்ரமணியர்)',
    highlight: 'திருக்கல்யாண சங்கல்பத்திற்கு புகழ்பெற்றது. தைபூசம் + பங்குனி உத்திரம் முக்கிய நாட்கள்.',
    status: 'onboarding',
    href: '/city/chennai',
  },
  {
    name: 'Marundeeshwarar',
    nameTamil: 'மருந்தீஸ்வரர் ஆலயம்',
    area: 'திருவான்மியூர் (Thiruvanmiyur)',
    deity: 'சிவன் (மருந்தீஸ்வரர்) + த்ரிபுர சுந்தரி',
    highlight: 'மருத்துவ வரம் தரும் தலம். பஞ்ச க்ரோச க்ஷேத்திரங்களில் ஒன்று.',
    status: 'onboarding',
    href: '/city/chennai',
  },
  {
    name: 'ISKCON Chennai',
    nameTamil: 'இஸ்கான் சென்னை',
    area: 'இஞ்சம்பாக்கம் (Injambakkam, ECR)',
    deity: 'ராதா-கிருஷ்ணா + நரசிம்மர்',
    highlight: 'ஜன்மாஷ்டமி + கீதா ஜெயந்தி பெருவிழா. ECR கடற்கரை அருகே.',
    status: 'onboarding',
    href: '/city/chennai',
  },
];

interface PanditRosterStub {
  zone: string;
  zoneTamil: string;
  target: number;
  status: string;
}

// 25-pandit roster target per R-Q3-S-001 (pre-req). Zones balanced to anchor temples.
// All entries 'recruiting' until founder KYC video calls + Aadhaar verify per business rule #4.
const PANDIT_ROSTER: PanditRosterStub[] = [
  { zone: 'Mylapore + Triplicane', zoneTamil: 'மயிலாப்பூர் + திருவல்லிக்கேணி', target: 7, status: 'recruiting' },
  { zone: 'Vadapalani + T.Nagar', zoneTamil: 'வடபழனி + டி.நகர்', target: 6, status: 'recruiting' },
  { zone: 'Thiruvanmiyur + Adyar + Besant Nagar', zoneTamil: 'திருவான்மியூர் + அடையார் + பெசன்ட் நகர்', target: 6, status: 'recruiting' },
  { zone: 'ECR + OMR (IT corridor + NRI families)', zoneTamil: 'ECR + OMR (IT வாரியர் + NRI குடும்பங்கள்)', target: 6, status: 'recruiting' },
];

export default function TamilChennaiLanding() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'தர்ஷ்யா சென்னை',
    description: 'Verified pandits + 5 anchor temples in Chennai metro. Tamil-language puja booking + live darshan.',
    url: 'https://darshya.online/ta/chennai',
    areaServed: { '@type': 'City', name: 'Chennai', sameAs: 'https://en.wikipedia.org/wiki/Chennai' },
    address: { '@type': 'PostalAddress', addressLocality: 'Chennai', addressRegion: 'Tamil Nadu', addressCountry: 'IN' },
    inLanguage: ['ta', 'en'],
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10" lang="ta">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="text-right mb-4 text-sm">
        <Link href="/city/chennai" className="text-saffron-700 hover:underline">
          English version →
        </Link>
      </div>

      <header className="text-center mb-12">
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          🕉️ சென்னை · தமிழ்நாடு · சனாதன தர்மம்
        </div>
        <h1 className="text-3xl sm:text-5xl font-bold text-surface-900 mb-4 leading-tight">
          தர்ஷ்யா சென்னை
        </h1>
        <p className="text-surface-700 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          மயிலாப்பூர் கபாலீஸ்வரர் முதல் ECR இஸ்கான் வரை — சென்னை மெட்ரோவின் 5 அணைய ஆலயங்களில் சரிபார்க்கப்பட்ட பண்டிதர்களுடன் பூஜை, வீடியோ ஆதாரம், நேரலை தரிசனம், 80G ரசீது.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link
            href="/pujas?city=chennai"
            className="px-6 py-3 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            சென்னையில் பூஜை முன்பதிவு செய்க
          </Link>
          <Link
            href="/darshan?city=chennai"
            className="px-6 py-3 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            நேரலை தரிசனம் காண்க
          </Link>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-surface-900 mb-2">5 அணைய ஆலயங்கள் (Anchor Temples)</h2>
        <p className="text-sm text-surface-600 mb-6">
          சைவம், வைஷ்ணவம், முருகன், கிருஷ்ண-பக்தி — அனைத்து பாரம்பரியங்களையும் உள்ளடக்கிய சென்னை மெட்ரோ கவரேஜ்.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ANCHOR_TEMPLES.map((t) => (
            <article
              key={t.name}
              className="rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:shadow-sm transition"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-surface-900">{t.nameTamil}</h3>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    t.status === 'live'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {t.status === 'live' ? 'நேரலை' : 'விரைவில்'}
                </span>
              </div>
              <p className="text-xs text-surface-500 mb-1">{t.area}</p>
              <p className="text-sm text-surface-700 mb-1">
                <span className="font-medium">தெய்வம்:</span> {t.deity}
              </p>
              <p className="text-sm text-surface-600 leading-relaxed">{t.highlight}</p>
              <Link
                href={t.href}
                className="text-xs text-saffron-700 hover:underline mt-2 inline-block"
              >
                மேலும் காண்க →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-surface-900 mb-2">25 பண்டிதர் சேர்க்கை இலக்கு (Pandit Roster)</h2>
        <p className="text-sm text-surface-600 mb-6">
          சென்னை மெட்ரோ முழுவதும் — 4 மண்டலங்களில் சமமாக பகிரப்பட்டது. அனைத்தும் ஆதார் சரிபார்ப்பு + KYC வீடியோ அழைப்பிற்கு பின் ஏற்றுக்கொள்ளப்படும்.
        </p>
        <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 text-surface-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">மண்டலம் (Zone)</th>
                <th className="text-right px-4 py-3 font-semibold">இலக்கு</th>
                <th className="text-right px-4 py-3 font-semibold">நிலை</th>
              </tr>
            </thead>
            <tbody>
              {PANDIT_ROSTER.map((r) => (
                <tr key={r.zone} className="border-t border-surface-100">
                  <td className="px-4 py-3 text-surface-800">{r.zoneTamil}</td>
                  <td className="px-4 py-3 text-right text-surface-900 font-medium">{r.target}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      சேர்த்துக்கொண்டிருக்கிறது
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-surface-200 bg-surface-50 font-semibold">
                <td className="px-4 py-3 text-surface-900">மொத்தம்</td>
                <td className="px-4 py-3 text-right text-surface-900">25</td>
                <td className="px-4 py-3 text-right text-surface-700 text-xs">Q3 2026 இலக்கு</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-surface-500 mt-3">
          நீங்கள் சென்னையில் வேதம் கற்ற பண்டிதரா? <Link href="/become-priest" className="text-saffron-700 hover:underline">இங்கே சேரவும் →</Link>
        </p>
      </section>

      <section className="rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-2">வெளிநாட்டில் உள்ள தமிழர்களுக்கு (NRI Tamils)</h2>
        <p className="text-surface-700 text-sm mb-4 max-w-xl mx-auto">
          சிங்கப்பூர், மலேசியா, அமெரிக்கா, இங்கிலாந்து — உங்கள் பெற்றோர்/குடும்பத்தின் பெயரில் சென்னை ஆலயத்தில் பூஜை. வீடியோ ஆதாரம் உங்கள் WhatsApp இல். ஆண்டு சந்தா ₹5000 / $60.
        </p>
        <Link
          href="/nri"
          className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
        >
          NRI தொகுப்பு காண்க →
        </Link>
      </section>

      <footer className="border-t border-surface-200 pt-6 text-center text-sm text-surface-600">
        <p>
          இந்த பக்கம் சென்னை மென்-தொடக்க உறுப்பினர் (Q3 2026) — பண்டிதர் சேர்க்கை + ஆலய MoU தொடரும்.
          <br />
          <Link href="/" className="text-saffron-700 hover:underline mt-2 inline-block">
            முழு ஆங்கில பதிப்பு காண்க →
          </Link>
        </p>
      </footer>
    </main>
  );
}
