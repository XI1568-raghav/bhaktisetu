import type { Metadata } from 'next';

// noindex: this route is only ever reached from a one-time emailed link, and
// the recovery credential arrives in the URL fragment — it must never be
// crawled, cached, or surfaced in search.
export const metadata: Metadata = {
 title: 'Choose a new password',
 description: 'Set a new password for your Darshya account.',
 robots: { index: false, follow: false },
 alternates: { canonical: 'https://darshya.online/auth/reset-password' },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
 return children;
}
