export const runtime = 'edge';
import type { Metadata } from 'next';
import AstrologyClient from './AstrologyClient';
import { ApprovedProvidersStrip } from '../../components/ApprovedProvidersStrip';

export const metadata: Metadata = {
 title: 'Vedic Astrology, Horoscope & Kundli',
 description:
 'Talk to verified astrologers on Darshya. Vedic horoscope, free Kundli, daily rashifal, and live consultations from approved practitioners.',
};

export default function AstrologyPage() {
 return (
 <>
 <AstrologyClient />
 <ApprovedProvidersStrip
 type="astrologer"
 heading="Verified astrologers on Darshya"
 subheading="Talk to approved Vedic astrologers. Each profile is reviewed before going live."
 limit={8}
 />
 </>
 );
}
