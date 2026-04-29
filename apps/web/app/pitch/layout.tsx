import type { Metadata } from 'next';
import './pitch.css';

export const metadata: Metadata = {
  title: 'Darshya — Investor Deck',
  description: "India's devotional super-app. Live darshan, video-proof puja booking, AI panditji, gaushala seva — 8 portals on a $0 free-tier stack.",
  robots: { index: false, follow: false },
};

export default function PitchLayout({ children }: { children: React.ReactNode }) {
  return <div className="pitch-root">{children}</div>;
}
