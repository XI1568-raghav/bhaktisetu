import type { Metadata } from 'next';

// OAuth/magic-link callback — transient redirect page, noindex.
export const metadata: Metadata = {
 title: 'Signing In…',
 description: 'Completing sign-in.',
 robots: { index: false, follow: false },
};

export default function CallbackLayout({ children }: { children: React.ReactNode }) {
 return children;
}
