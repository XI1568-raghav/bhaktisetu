import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Ask a Pandit — Free AI Astrology Consultation | Darshya',
 description:
  'Get instant Vedic astrology answers from AI Pandit. Free consultation on horoscope, kundli, muhurat, and more.',
 alternates: { canonical: 'https://darshya.online/ask-pandit' },
 openGraph: {
  title: 'Ask a Pandit — Free AI Astrology Consultation | Darshya',
  description:
   'Get instant Vedic astrology answers from AI Pandit. Free consultation on horoscope, kundli, muhurat, and more.',
  url: 'https://darshya.online/ask-pandit',
  type: 'website',
  // TODO: add /og-default.png (1200x630) to apps/web/public/
  images: ['/og-default.png'],
 },
 twitter: {
  card: 'summary_large_image',
  title: 'Ask a Pandit — Free AI Astrology Consultation | Darshya',
  description:
   'Get instant Vedic astrology answers from AI Pandit. Free consultation on horoscope, kundli, muhurat, and more.',
  images: ['/og-default.png'],
 },
};

export default function AskPanditLayout({ children }: { children: React.ReactNode }) {
 return (
 <div className="fixed inset-0 top-14 z-10 bg-surface-50 overflow-hidden">
 {children}
 </div>
 );
}
