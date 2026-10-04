// Hindi landing — single Devanagari surface today. Routes that have not
// been fully translated link back to the canonical English route rather
// than fake /hi/* paths (which would harm SEO — and which 404 today).
//
// Audit I-02 / I18N-01 (2026-08-12): those onward links now carry the locale
// (`?lang=hi`), which the middleware converts into the durable
// `poojly_language` cookie and strips off the URL. Previously the visitor's
// language choice survived exactly zero clicks.
//
// They are all prefetch={false} for the same reason as components/LangLanding
// (see the note there): the cookie is only written when the click actually
// reaches the middleware, and a prefetched static route can be replayed from the
// Next 15 client Router Cache for minutes without any request going out.
import type { Metadata } from 'next';
import Link from 'next/link';

import { localeHref } from '../../lib/i18n/locales';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';
import { HAS_80G } from '../../lib/eighty-g';

const href = (to: string) => localeHref(to, 'hi');


export const metadata: Metadata = {
  title: 'दर्शया — भारत का आध्यात्मिक सुपर-ऐप',
  description:
    'लाइव दर्शन, पूजा बुकिंग (वीडियो प्रमाण के साथ), पंचांग, संस्कृत, गुरुकुल, गौशाला सेवा — एक ही जगह पर। NRI के लिए विशेष लेन।',
  alternates: {
    canonical: 'https://darshya.online/hi',
    languages: {
      en: 'https://darshya.online/',
      hi: 'https://darshya.online/hi',
      ta: 'https://darshya.online/ta',
      te: 'https://darshya.online/te',
      bn: 'https://darshya.online/bn',
      mr: 'https://darshya.online/mr',
    },
  },
  openGraph: {
    title: 'दर्शया — आध्यात्मिक सुपर-ऐप',
    description: 'लाइव दर्शन, पूजा, पंचांग, गुरुकुल, गौशाला सेवा।',
    url: 'https://darshya.online/hi',
    type: 'website',
    locale: 'hi_IN',
    images: ['/og/default.png'],
  },
};

const FEATURES = [
  { title: 'लाइव दर्शन', body: 'भारत के प्रमुख मंदिरों से लाइव दर्शन — काशी, तिरुपति, सिद्धिविनायक, सोमनाथ।', href: '/darshan' },
  { title: 'पूजा बुकिंग', body: `पंडित, वीडियो प्रमाण, ${HAS_80G ? '80G रसीद' : 'रसीद'}। आपके नाम से संकल्प।`, href: '/pujas' },
  { title: 'दैनिक पंचांग', body: 'तिथि, नक्षत्र, राहु काल, चौघड़िया — आपके शहर के अनुसार।', href: '/panchang' },
  { title: 'गौ सेवा', body: 'गोदान, चारा सेवा — सत्यापित गौशालाओं को सीधा दान।', href: '/gaushala' },
  { title: 'गुरुकुल', body: 'पारंपरिक गुरुकुल प्रवेश — संस्कृत, वेद, दर्शन।', href: '/gurukuls' },
  { title: 'AI पंडित', body: 'धार्मिक प्रश्न, मुहूर्त, शास्त्र संदर्भ — 24×7 उपलब्ध।', href: '/ask-pandit' },
];

export default function HindiLanding() {
  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10" lang="hi">
      <div className="text-right mb-4 text-sm">
        <Link href="/?lang=en" className="text-saffron-700 hover:underline" prefetch={false}>English →</Link>
      </div>

      <header className="text-center mb-12">
        <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
          🕉️ सनातन धर्म · दैनिक साथी
        </div>
        <h1 className={`${H1.marketing} mb-4`}>
          भारत का आध्यात्मिक सुपर-ऐप
        </h1>
        <p className="prose-lead text-surface-700 leading-relaxed max-w-2xl mx-auto">
          लाइव दर्शन, पूजा बुकिंग (वीडियो प्रमाण के साथ), पंचांग, संस्कृत, गुरुकुल और गौशाला सेवा — एक ही ऐप पर।
        </p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link
            href={href('/pujas')}
            className={buttonClass('primary', 'md')}
            prefetch={false}
          >
            पूजा बुक करें
          </Link>
          <Link
            href={href('/darshan')}
            className="px-6 py-3 border border-saffron-600 text-saffron-700 rounded-md text-sm font-semibold hover:bg-saffron-50"
            prefetch={false}
          >
            लाइव दर्शन देखें
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {FEATURES.map((f) => (
          <Link
            key={f.href}
            href={href(f.href)}
            className="block rounded-xl border border-surface-200 bg-white p-5 hover:border-saffron-300 hover:shadow-sm transition"
            prefetch={false}
          >
            <h2 className="text-lg font-semibold text-surface-900 mb-2">{f.title}</h2>
            <p className="text-sm text-surface-700 leading-relaxed">{f.body}</p>
          </Link>
        ))}
      </section>

      <section className="rounded-xl border border-saffron-200 bg-saffron-50 p-6 text-center mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-2">विदेश में रहते हैं?</h2>
        <p className="text-surface-700 prose-body mb-4 max-w-xl mx-auto">
          NRI के लिए विशेष लेन — अपने नाम से भारत के मंदिर में पूजा, वीडियो प्रमाण आपके WhatsApp पर। साल भर सदस्यता ₹5000 / $60।
        </p>
        <Link
          href={href('/nri')}
          className={buttonClass('primary', 'md')}
          prefetch={false}
        >
          NRI पैकेज देखें →
        </Link>
      </section>

      <footer className="border-t border-surface-200 pt-6 text-center text-sm text-surface-600">
        <p>पूर्ण हिंदी अनुवाद प्रगति पर है। अधिकांश पृष्ठ अभी अंग्रेज़ी में हैं।</p>
        <Link href="/?lang=en" className="text-saffron-700 hover:underline mt-2 inline-block" prefetch={false}>
          अंग्रेज़ी संस्करण देखें →
        </Link>
      </footer>
    </main>
  );
}
