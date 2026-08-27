import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';

export const revalidate = 86400;

export const metadata: Metadata = {
  title: 'दर्श्या पुणे — पूजा, दर्शन, पंचांग (मराठीत)',
  description:
    'पुणे महानगरात पडताळलेले पंडित + दगडूशेठ हलवाई + कसबा गणपती + पार्वती + चिंचवड + अष्टविनायक — व्हिडिओ पुराव्यासह पूजा, थेट दर्शन, ८०G पावती.',
  alternates: {
    canonical: 'https://darshya.online/mr/pune',
    languages: {
      en: 'https://darshya.online/city/pune',
      mr: 'https://darshya.online/mr/pune',
    },
  },
  openGraph: {
    title: 'दर्श्या पुणे — महाराष्ट्राच्या सांस्कृतिक राजधानीसाठी डिजिटल मंदिर मंच',
    description: 'दगडूशेठ हलवाई, कसबा गणपती, पार्वती, चिंचवड मोरया, श्रीमंत भाऊसाहेब रंगारी — एकाच अ‍ॅपवर.',
    url: 'https://darshya.online/mr/pune',
    type: 'website',
    locale: 'mr_IN',
    images: ['/og/default.png'],
  },
};

interface AnchorTemple {
  name: string;
  nameMarathi: string;
  area: string;
  deity: string;
  highlight: string;
  status: 'live' | 'onboarding';
  href: string;
}

// Anchor temples per spec R-Q1-G-006 success criterion #2.
// Status 'onboarding' = founder MoU pending; flip to 'live' after temple-portal verification.
const ANCHOR_TEMPLES: AnchorTemple[] = [
  {
    name: 'Dagdusheth Halwai Ganpati',
    nameMarathi: 'श्रीमंत दगडूशेठ हलवाई गणपती',
    area: 'बुधवार पेठ (Budhwar Peth)',
    deity: 'गणेश (दगडूशेठ)',
    highlight: '१८९३ पासून लोकमान्य टिळकांच्या प्रेरणेने स्थापित. गणेशोत्सवात लाखो भाविक.',
    status: 'onboarding',
    href: '/city/pune',
  },
  {
    name: 'Kasba Ganpati',
    nameMarathi: 'कसबा गणपती',
    area: 'कसबा पेठ (Kasba Peth)',
    deity: 'गणेश (पुण्याचा ग्रामदेवता)',
    highlight: 'पुण्याचा मानाचा पहिला गणपती. छत्रपती शिवाजी महाराजांच्या काळातील पवित्र स्थळ.',
    status: 'onboarding',
    href: '/city/pune',
  },
  {
    name: 'Parvati',
    nameMarathi: 'पार्वती मंदिर',
    area: 'पार्वती टेकडी (Parvati Hill)',
    deity: 'शिव-पार्वती + विष्णू + कार्तिकेय',
    highlight: '१७व्या शतकातील पेशवेकालीन मंदिर. १०३ पायऱ्या — पुणे शहराचे विहंगम दृश्य.',
    status: 'onboarding',
    href: '/city/pune',
  },
  {
    name: 'Chaturshringi',
    nameMarathi: 'चतुःशृंगी देवी',
    area: 'सेनापती बापट रोड (Senapati Bapat Rd)',
    deity: 'चतुःशृंगी (दुर्गा-स्वरूप)',
    highlight: 'पुण्याची कुलदेवी. नवरात्र उत्सवात ९ दिवस गर्दी. १०० पायऱ्या वर.',
    status: 'onboarding',
    href: '/city/pune',
  },
  {
    name: 'Chinchwad Morya Gosavi',
    nameMarathi: 'चिंचवड श्री मोरया गोसावी',
    area: 'चिंचवड (Chinchwad)',
    deity: 'गणेश (मोरया)',
    highlight: 'अष्टविनायकांपैकी एक नसून — मोरया गोसावींची समाधी. "मंगलमूर्ती मोरया" जयघोषाचे मूळ स्थान.',
    status: 'onboarding',
    href: '/city/pune',
  },
  {
    name: 'Shreemant Bhausaheb Rangari Ganpati',
    nameMarathi: 'श्रीमंत भाऊसाहेब रंगारी गणपती',
    area: 'शुक्रवार पेठ (Shukrawar Peth)',
    deity: 'गणेश',
    highlight: '१८९२ — सार्वजनिक गणेशोत्सवाची पहिली मूर्ती. ऐतिहासिक मानाचा गणपती.',
    status: 'onboarding',
    href: '/city/pune',
  },
];

interface PanditRosterStub {
  zone: string;
  zoneMarathi: string;
  target: number;
  status: string;
}

// 3-pandit minimum per R-Q1-G-006 success criterion #1 (15 stretch target across 4 zones).
// All entries 'recruiting' until founder KYC video calls + Aadhaar verify per business rule #4.
const PANDIT_ROSTER: PanditRosterStub[] = [
  { zone: 'Old Pune (Kasba + Budhwar + Shaniwar Peth)', zoneMarathi: 'जुनं पुणे (कसबा + बुधवार + शनिवार पेठ)', target: 4, status: 'recruiting' },
  { zone: 'Deccan + FC Road + Shivajinagar', zoneMarathi: 'डेक्कन + एफ.सी. रोड + शिवाजीनगर', target: 4, status: 'recruiting' },
  { zone: 'Pimpri-Chinchwad (Morya + Akurdi)', zoneMarathi: 'पिंपरी-चिंचवड (मोरया + आकुर्डी)', target: 4, status: 'recruiting' },
  { zone: 'Hadapsar + Kharadi + Viman Nagar (IT corridor + NRI)', zoneMarathi: 'हडपसर + खराडी + विमान नगर (आय.टी. कॉरिडॉर + NRI)', target: 3, status: 'recruiting' },
];

export default function MarathiPuneLanding() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'दर्श्या पुणे',
    description: 'Verified pandits + 6 anchor temples in Pune metro. Marathi-language puja booking + live darshan.',
    url: 'https://darshya.online/mr/pune',
    areaServed: { '@type': 'City', name: 'Pune', sameAs: 'https://en.wikipedia.org/wiki/Pune' },
    address: { '@type': 'PostalAddress', addressLocality: 'Pune', addressRegion: 'Maharashtra', addressCountry: 'IN' },
    inLanguage: ['mr', 'en'],
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10" lang="mr">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="text-right mb-4 text-sm">
        <Link href="/city/pune" className="text-saffron-700 hover:underline">
          English version →
        </Link>
      </div>

      <header className="text-center mb-12">
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          🕉️ पुणे · महाराष्ट्र · सनातन धर्म
        </div>
        <h1 className={`${H1.marketing} mb-4`}>
          दर्श्या पुणे
        </h1>
        <p className="prose-lead text-surface-700 leading-relaxed max-w-2xl mx-auto">
          दगडूशेठ हलवाई गणपतीपासून चिंचवड मोरया गोसावींपर्यंत — पुणे महानगरातील ६ मानाच्या मंदिरांत पडताळलेल्या पंडितांकडून पूजा, व्हिडिओ पुरावा, थेट दर्शन, ८०G पावती.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link
            href="/pujas?city=pune"
            className={buttonClass('primary', 'md')}
          >
            पुण्यात पूजा बुक करा
          </Link>
          <Link
            href="/darshan?city=pune"
            className="px-6 py-3 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
          >
            थेट दर्शन पाहा
          </Link>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-surface-900 mb-2">६ मानाची मंदिरे (Anchor Temples)</h2>
        <p className="text-sm text-surface-600 mb-6">
          गाणपत्य परंपरा (दगडूशेठ + कसबा + भाऊसाहेब रंगारी + चिंचवड मोरया) + शैव-शाक्त (पार्वती + चतुःशृंगी) — पुणे महानगराचे संपूर्ण कव्हरेज.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {ANCHOR_TEMPLES.map((t) => (
            <article
              key={t.name}
              className="rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:shadow-sm transition"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-surface-900">{t.nameMarathi}</h3>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    t.status === 'live'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {t.status === 'live' ? 'थेट' : 'लवकरच'}
                </span>
              </div>
              <p className="text-xs text-surface-500 mb-1">{t.area}</p>
              <p className="text-sm text-surface-700 mb-1">
                <span className="font-medium">देवता:</span> {t.deity}
              </p>
              <p className="text-sm text-surface-600 leading-relaxed">{t.highlight}</p>
              <Link
                href={t.href}
                className="text-xs text-saffron-700 hover:underline mt-2 inline-block"
              >
                अधिक पाहा →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold text-surface-900 mb-2">पंडित नोंदणी लक्ष्य (Pandit Roster)</h2>
        <p className="text-sm text-surface-600 mb-6">
          पुणे महानगरात — ४ झोनमध्ये समतोल वाटप. किमान ३ पंडित Q1 २०२६ शेवटपर्यंत (शिप-गेट), १५ पर्यंत स्केल. सर्व आधार पडताळणी + KYC व्हिडिओ कॉलनंतरच स्वीकार.
        </p>
        <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 text-surface-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">झोन (Zone)</th>
                <th className="text-right px-4 py-3 font-semibold">लक्ष्य</th>
                <th className="text-right px-4 py-3 font-semibold">स्थिती</th>
              </tr>
            </thead>
            <tbody>
              {PANDIT_ROSTER.map((r) => (
                <tr key={r.zone} className="border-t border-surface-100">
                  <td className="px-4 py-3 text-surface-800">{r.zoneMarathi}</td>
                  <td className="px-4 py-3 text-right text-surface-900 font-medium">{r.target}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      भरती सुरू
                    </span>
                  </td>
                </tr>
              ))}
              <tr className="border-t border-surface-200 bg-surface-50 font-semibold">
                <td className="px-4 py-3 text-surface-900">एकूण (stretch)</td>
                <td className="px-4 py-3 text-right text-surface-900">15</td>
                <td className="px-4 py-3 text-right text-surface-700 text-xs">Q1 2026 (किमान 3 ship-gate)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-surface-500 mt-3">
          तुम्ही पुण्यातील वेदशास्त्र संपन्न पंडित आहात का? <Link href="/become-priest" className="text-saffron-700 hover:underline">इथे सामील व्हा →</Link>
        </p>
      </section>

      <section className="rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-2">परदेशातील मराठी मंडळींसाठी (NRI Marathi)</h2>
        <p className="text-surface-700 prose-body mb-4 max-w-xl mx-auto">
          अमेरिका, ब्रिटन, ऑस्ट्रेलिया, सिंगापूर — आई-वडिलांच्या / कुटुंबाच्या नावाने पुण्यातील मंदिरात पूजा. व्हिडिओ पुरावा तुमच्या WhatsApp वर. वार्षिक सदस्यता ₹5000 / $60.
        </p>
        <Link
          href="/nri"
          className={buttonClass('primary', 'md')}
        >
          NRI पॅकेज पाहा →
        </Link>
      </section>

      <footer className="border-t border-surface-200 pt-6 text-center text-sm text-surface-600">
        <p>
          हे पान पुणे सॉफ्ट-लॉन्चचा भाग आहे (Q1 2026) — पंडित नोंदणी + मंदिर MoU प्रगतीपथावर.
          <br />
          <Link href="/" className="text-saffron-700 hover:underline mt-2 inline-block">
            पूर्ण इंग्रजी आवृत्ती पाहा →
          </Link>
        </p>
      </footer>
    </main>
  );
}
