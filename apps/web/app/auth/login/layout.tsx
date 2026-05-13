import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Sign In',
 description: 'Sign in to Darshya with phone or email. Access live darshan, book pujas, and manage your spiritual journey.',
 alternates: { canonical: 'https://darshya.online/auth/login' },
 openGraph: {
   title: 'Sign In | Darshya',
   description: 'Sign in to Darshya. Access live darshan, book pujas, and manage your spiritual journey.',
   url: 'https://darshya.online/auth/login',
   type: 'website',
   images: ['/og-default.png'],
 },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
 return children;
}
