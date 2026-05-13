import type { Metadata } from 'next';

// Verify OTP step — no canonical, noindex (transient flow page).
export const metadata: Metadata = {
 title: 'Verify OTP',
 description: 'Enter the OTP sent to your phone or email to complete sign-in.',
 robots: { index: false, follow: false },
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
 return children;
}
