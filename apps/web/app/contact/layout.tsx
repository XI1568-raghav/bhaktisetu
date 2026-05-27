import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Contact Darshya Support — Bookings, Partnerships & Help',
 description: 'Get in touch with Darshya. Reach our support team for puja bookings, temple and gaushala partnerships, gurukul listings, NRI assistance, technical issues, or general inquiries. We reply 9 AM-9 PM IST.',
 alternates: { canonical: 'https://darshya.online/contact' },
 openGraph: {
 title: 'Contact | Darshya',
 description: 'Email support@darshya.online. Support hours 9 AM-9 PM IST. Bengaluru, India.',
 url: 'https://darshya.online/contact',
 type: 'website',
 // TODO: add /og/default (1200x630) to apps/web/public/
 images: ['/og/default'],
 },
 twitter: {
 card: 'summary_large_image',
 title: 'Contact | Darshya',
 description: 'Email support@darshya.online. Support hours 9 AM-9 PM IST. Bengaluru, India.',
 images: ['/og/default'],
 },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
 return <>{children}</>;
}
