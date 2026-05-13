import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Contact',
 description: 'Get in touch with Darshya. Reach our support team for puja bookings, temple partnerships, technical issues, or general inquiries.',
 alternates: { canonical: 'https://darshya.online/contact' },
 openGraph: {
 title: 'Contact | Darshya',
 description: 'Email support@darshya.online. Support hours 9 AM-9 PM IST. Bengaluru, India.',
 url: 'https://darshya.online/contact',
 type: 'website',
 // TODO: add /og-default.png (1200x630) to apps/web/public/
 images: ['/og-default.png'],
 },
 twitter: {
 card: 'summary_large_image',
 title: 'Contact | Darshya',
 description: 'Email support@darshya.online. Support hours 9 AM-9 PM IST. Bengaluru, India.',
 images: ['/og-default.png'],
 },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
 return <>{children}</>;
}
