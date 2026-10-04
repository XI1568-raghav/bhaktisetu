import type { Metadata } from 'next';
import { LangLanding } from '../../components/LangLanding';
import { HAS_80G } from '../../lib/eighty-g';


export const metadata: Metadata = {
  title: 'দর্শ্যা — ভারতের আধ্যাত্মিক সুপার অ্যাপ',
  description:
    'লাইভ দর্শন, পূজা বুকিং (ভিডিও প্রমাণ সহ), পঞ্জিকা, সংস্কৃত, গুরুকুল, গোসেবা — এক জায়গায়।',
  alternates: {
    canonical: 'https://darshya.online/bn',
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
    title: 'দর্শ্যা — আধ্যাত্মিক সুপার অ্যাপ',
    description: 'লাইভ দর্শন, পূজা, পঞ্জিকা, গুরুকুল, গোসেবা।',
    url: 'https://darshya.online/bn',
    type: 'website',
    locale: 'bn_IN',
    images: ['/og/default.png'],
  },
};

export default function BengaliLanding() {
  return (
    <LangLanding
      langCode="bn"
      langTag="bn_IN"
      pillText="সনাতন ধর্ম · দৈনন্দিন সঙ্গী"
      heroTitle="ভারতের আধ্যাত্মিক সুপার অ্যাপ"
      heroSubtitle="লাইভ দর্শন, পূজা বুকিং (ভিডিও প্রমাণ সহ), পঞ্জিকা, সংস্কৃত, গুরুকুল এবং গোসেবা — একটি অ্যাপে।"
      ctaBookLabel="পূজা বুক করুন"
      ctaDarshanLabel="লাইভ দর্শন দেখুন"
      features={[
        { title: 'লাইভ দর্শন', body: 'কাশী, তিরুপতি, সিদ্ধিবিনায়ক, সোমনাথ — প্রধান মন্দির থেকে লাইভ দর্শন।', href: '/darshan' },
        { title: 'পূজা বুকিং', body: `পণ্ডিত, ভিডিও প্রমাণ, ${HAS_80G ? '80G রসিদ' : 'রসিদ'}। আপনার নামে সংকল্প।`, href: '/pujas' },
        { title: 'দৈনিক পঞ্জিকা', body: 'তিথি, নক্ষত্র, রাহুকাল, চৌঘড়িয়া — আপনার শহর অনুযায়ী।', href: '/panchang' },
        { title: 'গোসেবা', body: 'গোদান, ঘাস সেবা — যাচাইকৃত গোশালায় সরাসরি দান।', href: '/gaushala' },
        { title: 'গুরুকুল', body: 'ঐতিহ্যবাহী গুরুকুল ভর্তি — সংস্কৃত, বেদ, দর্শন।', href: '/gurukuls' },
        { title: 'AI পণ্ডিত', body: 'ধর্মীয় প্রশ্ন, মুহূর্ত, শাস্ত্র নির্দেশ — 24×7 উপলব্ধ।', href: '/ask-pandit' },
      ]}
      nriHeading="বিদেশে থাকেন?"
      nriBody="NRI দের জন্য বিশেষ লেন — আপনার নামে ভারতীয় মন্দিরে পূজা, ভিডিও প্রমাণ আপনার WhatsApp এ। বার্ষিক সদস্যতা ₹5000 / $60।"
      nriCta="NRI প্যাকেজ দেখুন →"
      englishLink="English →"
      footerNote="সম্পূর্ণ বাংলা অনুবাদ চলমান। বেশিরভাগ পৃষ্ঠা বর্তমানে ইংরেজিতে রয়েছে।"
      englishLinkFooter="ইংরেজি সংস্করণ দেখুন →"
    />
  );
}
