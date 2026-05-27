import type { Metadata } from 'next';
import { LangLanding } from '../../components/LangLanding';

export const runtime = 'edge';

export const metadata: Metadata = {
  title: 'दर्श्या — भारताचे आध्यात्मिक सुपर अ‍ॅप',
  description:
    'थेट दर्शन, पूजा बुकिंग (व्हिडिओ पुराव्यासह), पंचांग, संस्कृत, गुरुकुल, गोसेवा — एकाच ठिकाणी.',
  alternates: {
    canonical: 'https://darshya.online/mr',
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
    title: 'दर्श्या — आध्यात्मिक सुपर अ‍ॅप',
    description: 'थेट दर्शन, पूजा, पंचांग, गुरुकुल, गोसेवा.',
    url: 'https://darshya.online/mr',
    type: 'website',
    locale: 'mr_IN',
    images: ['/og/default'],
  },
};

export default function MarathiLanding() {
  return (
    <LangLanding
      langCode="mr"
      langTag="mr_IN"
      pillText="सनातन धर्म · दैनंदिन सोबती"
      heroTitle="भारताचे आध्यात्मिक सुपर अ‍ॅप"
      heroSubtitle="थेट दर्शन, पूजा बुकिंग (व्हिडिओ पुराव्यासह), पंचांग, संस्कृत, गुरुकुल आणि गोसेवा — एकाच अ‍ॅपमध्ये."
      ctaBookLabel="पूजा बुक करा"
      ctaDarshanLabel="थेट दर्शन पहा"
      features={[
        { title: 'थेट दर्शन', body: 'काशी, तिरुपती, सिद्धिविनायक, सोमनाथ — प्रमुख मंदिरांचे थेट दर्शन.', href: '/darshan' },
        { title: 'पूजा बुकिंग', body: 'पडताळलेले पंडित, व्हिडिओ पुरावा, 80G पावती. तुमच्या नावे संकल्प.', href: '/pujas' },
        { title: 'दैनंदिन पंचांग', body: 'तिथी, नक्षत्र, राहूकाळ, चौघडिया — तुमच्या शहरानुसार.', href: '/panchang' },
        { title: 'गोसेवा', body: 'गोदान, चारा सेवा — पडताळलेल्या गोशाळांना थेट देणगी.', href: '/gaushala' },
        { title: 'गुरुकुल', body: 'पारंपरिक गुरुकुल प्रवेश — संस्कृत, वेद, तत्त्वज्ञान.', href: '/gurukuls' },
        { title: 'AI पंडित', body: 'धार्मिक प्रश्न, मुहूर्त, शास्त्र सूचना — 24×7 उपलब्ध.', href: '/ask-pandit' },
      ]}
      nriHeading="परदेशात राहता?"
      nriBody="NRI साठी विशेष लेन — तुमच्या नावे भारतीय मंदिरात पूजा, व्हिडिओ पुरावा तुमच्या WhatsApp वर. वार्षिक सदस्यता ₹5000 / $60."
      nriCta="NRI पॅकेज पहा →"
      englishLink="English →"
      footerNote="पूर्ण मराठी भाषांतर प्रगतीपथावर आहे. बहुतेक पाने सध्या इंग्रजीत आहेत."
      englishLinkFooter="इंग्रजी आवृत्ती पहा →"
    />
  );
}
