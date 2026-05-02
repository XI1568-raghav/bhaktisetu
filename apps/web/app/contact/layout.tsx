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
 },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
 return <>{children}</>;
}
