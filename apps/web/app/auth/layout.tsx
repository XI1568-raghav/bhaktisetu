import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Bhaktisetu with your phone number. Access live darshan, book pujas, and manage your spiritual journey.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-saffron-700 via-saffron-600 to-temple-gold" />

      {/* Decorative mandala pattern */}
      <div className="absolute inset-0 bg-[url('/images/pattern-mandala.svg')] opacity-5 bg-center bg-cover" />

      {/* Floating decorative circles */}
      <div className="absolute top-20 left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-56 h-56 bg-temple-gold/10 rounded-full blur-3xl" />
      <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-saffron-300/10 rounded-full blur-2xl" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {children}
      </div>

      {/* Bottom attribution */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-saffron-200/60 text-xs">
          &copy; {new Date().getFullYear()} Bhaktisetu. All rights reserved.
        </p>
      </div>
    </div>
  );
}
