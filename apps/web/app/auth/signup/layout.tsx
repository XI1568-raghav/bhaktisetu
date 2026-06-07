import type { Metadata } from 'next';

export const metadata: Metadata = {
 title: 'Create Account',
 description: 'Sign up for Darshya. Free account — book pujas, watch live darshan, claim 80G receipts, get AI spiritual guidance.',
 alternates: { canonical: 'https://darshya.online/auth/signup' },
 openGraph: {
   title: 'Create Account | Darshya',
   description: 'Sign up for Darshya. Free account — book pujas, watch live darshan, claim 80G receipts, get AI spiritual guidance.',
   url: 'https://darshya.online/auth/signup',
   type: 'website',
   images: ['/og/default.png'],
 },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
 return children;
}
