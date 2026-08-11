import type { Metadata } from 'next';

// noindex: a password-recovery entry point has no search value and indexing it
// only invites scripted reset-request traffic against real addresses.
export const metadata: Metadata = {
 title: 'Reset your password',
 description: 'Request a link to reset your Darshya password.',
 robots: { index: false, follow: false },
 alternates: { canonical: 'https://darshya.online/auth/forgot-password' },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
 return children;
}
