import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Contact',
 description: 'Get in touch with Darshya. Reach our support team for puja bookings, temple partnerships, technical issues, or general inquiries.',
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
 return <>{children}</>;
}
