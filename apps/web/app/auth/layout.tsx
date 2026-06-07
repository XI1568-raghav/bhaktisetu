import type { Metadata } from 'next';

// Generic auth-segment defaults. Per-route canonical lives in each
// route's own layout.tsx (login/signup/verify/callback) — hardcoding
// /auth/login here would mistag signup, verify, callback as login.
export const metadata: Metadata = {
 title: { default: 'Sign In', template: '%s | Darshya' },
 description: 'Sign in to Darshya with your phone number. Access live darshan, book pujas, and manage your spiritual journey.',
 openGraph: {
   title: 'Darshya — Sign In',
   description: 'Sign in to Darshya with your phone number. Access live darshan, book pujas, and manage your spiritual journey.',
   type: 'website',
   images: ['/og/default.png'],
 },
 twitter: {
   card: 'summary_large_image',
   title: 'Darshya — Sign In',
   description: 'Sign in to Darshya. Access live darshan, book pujas, and manage your spiritual journey.',
   images: ['/og/default.png'],
 },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
 return (
 <div className="min-h-[100dvh] relative flex items-center justify-center overflow-hidden py-8">
 {/* Background gradient — warm saffron tones */}
 <div className="absolute inset-0 bg-gradient-to-br from-saffron-700 via-saffron-600 to-temple-gold" />

 {/* Decorative mandala pattern */}
 <div className="absolute inset-0 bg-[url('/images/pattern-mandala.svg')] opacity-5 bg-center bg-cover" />

 {/* Content */}
 <div className="relative z-10 w-full max-w-md mx-4">
 {children}
 </div>

 {/* Bottom attribution */}
 <div className="absolute bottom-4 left-0 right-0 text-center">
 <p className="text-saffron-200/60 text-xs">
 &copy; {new Date().getFullYear()} Darshya. All rights reserved.
 </p>
 </div>
 </div>
 );
}
