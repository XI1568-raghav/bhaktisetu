import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'దర్శ్యా హైదరాబాద్ — పూజ, దర్శనం, పంచాంగం (తెలుగులో)',
  description:
    'హైదరాబాద్ మెట్రోలో ధృవీకరించబడిన పండితులు + 5 యాంకర్ ఆలయాలు (బిర్లా మందిర్, చిల్కూర్ బాలాజీ, భాగ్యలక్ష్మి, జగన్నాథ్, యాదగిరిగుట్ట లింక్) — వీడియో ప్రూఫ్‌తో పూజ, ప్రత్యక్ష దర్శనం, 80G రసీదు.',
  alternates: {
    canonical: 'https://darshya.online/te/hyderabad',
    languages: {
      en: 'https://darshya.online/city/hyderabad',
      te: 'https://darshya.online/te/hyderabad',
    },
  },
  openGraph: {
    title: 'దర్శ్యా హైదరాబాద్ — తెలంగాణ + AP తొలి డిజిటల్ ఆలయ వేదిక',
    description:
      'బిర్లా మందిర్, చిల్కూర్ బాలాజీ, భాగ్యలక్ష్మి, జగన్నాథ్ ఆలయం, ISKCON — అన్నింటికీ ఒకే యాప్.',
    url: 'https://darshya.online/te/hyderabad',
    type: 'website',
    locale: 'te_IN',
    images: ['/og/default.png'],
  },
};

interface AnchorTemple {
  name: string;
  nameTelugu: string;
  area: string;
  deity: string;
  highlight: string;
  status: 'live' | 'onboarding';
  href: string;
}

// Anchor temples per spec R-Q2-G-005 success criterion #2 (Birla Mandir + Chilkur Balaji + 3 others).
// Status 'onboarding' = founder MoU pending; flip to 'live' after temple-portal verified=true.
const ANCHOR_TEMPLES: AnchorTemple[] = [
  {
    name: 'Birla Mandir',
    nameTelugu: 'బిర్లా మందిర్ (వేంకటేశ్వర)',
    area: 'నౌబత్ పహాడ్, హైదరాబాద్ (Naubat Pahad)',
    deity: 'శ్రీ వేంకటేశ్వర స్వామి + పద్మావతి అమ్మవారు',
    highlight:
      '1976లో నిర్మించబడిన శ్వేత మార్బుల్ ఆలయం. హుసేన్ సాగర్ సరస్సును అధిగమించే కొండపై. వైకుంఠ ఏకాదశి + బ్రహ్మోత్సవం.',
    status: 'onboarding',
    href: '/city/hyderabad',
  },
  {
    name: 'Chilkur Balaji',
    nameTelugu: 'చిల్కూర్ బాలాజీ ఆలయం (Visa God)',
    area: 'చిల్కూర్, మొయినాబాద్ (Moinabad mandal)',
    deity: 'శ్రీ బాలాజీ వేంకటేశ్వర స్వామి',
    highlight:
      'వీసా బాలాజీ — భక్తులు H1B/విద్యార్థి వీసా కోసం 108 ప్రదక్షిణలు చేస్తారు. ఉచిత ఆలయం, VIP లేదు, హుండీ లేదు.',
    status: 'onboarding',
    href: '/city/hyderabad',
  },
  {
    name: 'Bhagyalakshmi',
    nameTelugu: 'భాగ్యలక్ష్మి అమ్మవారు',
    area: 'చార్మినార్ ప్రక్కన (Charminar adjacent)',
    deity: 'శ్రీ మహాలక్ష్మి (భాగ్యలక్ష్మి)',
    highlight:
      'హైదరాబాద్ నగరం పేరుకు మూలం. వరలక్ష్మి వ్రతం + శుక్రవార విశేష పూజలు. చారిత్రక + వాణిజ్య హృదయం వద్ద.',
    status: 'onboarding',
    href: '/city/hyderabad',
  },
  {
    name: 'Jagannath Temple',
    nameTelugu: 'జగన్నాథ ఆలయం (Banjara Hills)',
    area: 'బంజారా హిల్స్ (Banjara Hills)',
    deity: 'జగన్నాథుడు, బలభద్రుడు, సుభద్ర',
    highlight:
      'పూరి జగన్నాథ ఆలయం ప్రతిరూపం. వార్షిక రథయాత్ర (ఆషాడ శుద్ధ ద్వితీయ) నిర్వహణ. ఒడియా + తెలుగు భక్తుల కేంద్రం.',
    status: 'onboarding',
    href: '/city/hyderabad',
  },
  {
    name: 'ISKCON Hyderabad',
    nameTelugu: 'ఇస్కాన్ హైదరాబాద్',
    area: 'అబిడ్స్ + హరే కృష్ణ ల్యాండ్ (Abids + HKL)',
    deity: 'రాధా-కృష్ణ + నృసింహ',
    highlight:
      'జన్మాష్టమి + గీతా జయంతి. గోవింద్ హోటల్ ప్రసాదం. యువతకు + NRI పిల్లలకు భగవద్గీత తరగతులు.',
    status: 'onboarding',
    href: '/city/hyderabad',
  },
];

interface PanditRosterStub {
  zoneTelugu: string;
  target: number;
  status: string;
}

// 25-pandit roster target per R-Q2-S-005 (pre-req). Zones balanced across Hyderabad metro.
// All entries 'recruiting' until founder KYC video calls + Aadhaar verify per business rule #4.
const PANDIT_ROSTER: PanditRosterStub[] = [
  { zoneTelugu: 'సికింద్రాబాద్ + ట్యాంక్ బండ్ (Secunderabad + Tank Bund)', target: 6, status: 'recruiting' },
  { zoneTelugu: 'బంజారా హిల్స్ + జూబ్లీ హిల్స్ (Banjara + Jubilee Hills)', target: 6, status: 'recruiting' },
  { zoneTelugu: 'హైటెక్ సిటీ + గచ్చిబౌలి + కొండాపూర్ (HITEC City + Gachibowli + Kondapur)', target: 7, status: 'recruiting' },
  { zoneTelugu: 'చార్మినార్ + LB నగర్ + ఉప్పల్ (Old City + LB Nagar + Uppal)', target: 6, status: 'recruiting' },
];

export default function TeluguHyderabadLanding() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'దర్శ్యా హైదరాబాద్',
    description:
      'Verified pandits + 5 anchor temples in Hyderabad metro. Telugu-language puja booking + live darshan + 80G receipts.',
    url: 'https://darshya.online/te/hyderabad',
    areaServed: { '@type': 'City', name: 'Hyderabad', sameAs: 'https://en.wikipedia.org/wiki/Hyderabad' },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Hyderabad',
      addressRegion: 'Telangana',
      addressCountry: 'IN',
    },
    inLanguage: ['te', 'en'],
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10" lang="te">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="text-right mb-4 text-sm">
        <Link href="/city/hyderabad" className="text-saffron-700 hover:underline">
          English version →
        </Link>
      </div>

      <header className="text-center mb-12">
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          🕉️ హైదరాబాద్ · తెలంగాణ · సనాతన ధర్మం
        </div>
        <h1 className={`${H1.marketing} mb-4`}>
          దర్శ్యా హైదరాబాద్
        </h1>
        <p className="prose-lead text-surface-700 leading-relaxed max-w-2xl mx-auto">
          బిర్లా మందిర్ నుండి చిల్కూర్ బాలాజీ వరకు — హైదరాబాద్ మెట్రోలోని 5 యాంకర్ ఆలయాల వద్ద ధృవీకరించబడిన పండితులతో పూజ, వీడియో ప్రూఫ్, ప్రత్యక్ష దర్శనం, 80G రసీదు.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link
            href="/pujas?city=hyderabad"
            className={buttonClass('primary', 'md')}
          >
            హైదరాబాద్‌లో పూజ బుక్ చేయండి
          </Link>
          <Link
            href="/darshan?city=hyderabad"
            className="px-6 py-3 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            ప్రత్యక్ష దర్శనం చూడండి
          </Link>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-surface-900 mb-2">5 యాంకర్ ఆలయాలు (Anchor Temples)</h2>
        <p className="text-sm text-surface-600 mb-6">
          వైష్ణవం, శైవం, శాక్తేయం, కృష్ణ-భక్తి — హైదరాబాద్ మెట్రోలో అన్ని సంప్రదాయాలను కవర్ చేస్తుంది.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ANCHOR_TEMPLES.map((t) => (
            <article
              key={t.name}
              className="rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:shadow-sm transition"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-surface-900">{t.nameTelugu}</h3>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    t.status === 'live'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {t.status === 'live' ? 'ప్రత్యక్షం' : 'త్వరలో'}
                </span>
              </div>
              <p className="text-xs text-surface-500 mb-1">{t.area}</p>
              <p className="text-sm text-surface-700 mb-1">
                <span className="font-medium">దేవత:</span> {t.deity}
              </p>
              <p className="text-sm text-surface-600 leading-relaxed">{t.highlight}</p>
              <Link
                href={t.href}
                className="text-xs text-saffron-700 hover:underline mt-2 inline-block"
              >
                మరింత చూడండి →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-surface-900 mb-2">25 పండిత నియామక లక్ష్యం (Pandit Roster)</h2>
        <p className="text-sm text-surface-600 mb-6">
          హైదరాబాద్ మెట్రో అంతటా — 4 జోన్‌లలో సమతుల్యం. అన్నీ ఆధార్ ధృవీకరణ + KYC వీడియో కాల్ తర్వాతే ఆమోదించబడతాయి.
        </p>
        <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 text-surface-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">జోన్ (Zone)</th>
                <th className="text-right px-4 py-3 font-semibold">లక్ష్యం</th>
                <th className="text-right px-4 py-3 font-semibold">స్థితి</th>
              </tr>
            </thead>
            <tbody>
              {PANDIT_ROSTER.map((r) => (
                <tr key={r.zoneTelugu} className="border-t border-surface-100">
                  <td className="px-4 py-3 text-surface-800">{r.zoneTelugu}</td>
                  <td className="px-4 py-3 text-right text-surface-900 font-medium">{r.target}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      నియమిస్తోంది
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-surface-200 bg-surface-50 font-semibold">
                <td className="px-4 py-3 text-surface-900">మొత్తం</td>
                <td className="px-4 py-3 text-right text-surface-900">25</td>
                <td className="px-4 py-3 text-right text-surface-700 text-xs">Q2 2026 లక్ష్యం</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-surface-500 mt-3">
          మీరు హైదరాబాద్‌లో వేద పఠనం చేసిన పండితులా? <Link href="/become-priest" className="text-saffron-700 hover:underline">ఇక్కడ చేరండి →</Link>
        </p>
      </section>

      <section className="rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-2">విదేశాల్లోని తెలుగువారికి (NRI Telugus)</h2>
        <p className="text-surface-700 text-sm mb-4 max-w-xl mx-auto">
          USA (న్యూజెర్సీ, బే ఏరియా, టెక్సాస్), UK, ఆస్ట్రేలియా, సింగపూర్ — మీ తల్లిదండ్రులు/కుటుంబం పేరిట హైదరాబాద్ ఆలయంలో పూజ. వీడియో ప్రూఫ్ మీ WhatsApp‌లో. వార్షిక సభ్యత్వం ₹5000 / $60.
        </p>
        <Link
          href="/nri"
          className={buttonClass('primary', 'md')}
        >
          NRI ప్యాకేజీ చూడండి →
        </Link>
      </section>

      <footer className="border-t border-surface-200 pt-6 text-center text-sm text-surface-600">
        <p>
          ఈ పేజీ హైదరాబాద్ సాఫ్ట్-లాంచ్ స్టబ్ (Q2 2026) — పండిత నియామకం + ఆలయ MoU కొనసాగుతోంది.
          <br />
          <Link href="/" className="text-saffron-700 hover:underline mt-2 inline-block">
            పూర్తి ఆంగ్ల వెర్షన్ చూడండి →
          </Link>
        </p>
      </footer>
    </main>
  );
}
