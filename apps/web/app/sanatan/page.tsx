import type { Metadata } from 'next';
import CategoryIndex from '../../components/CategoryIndex';
import VedicTimeline from '../../components/VedicTimeline';

export const metadata: Metadata = {
  title: 'Sanatan Dharm — Knowledge & History',
  description: 'The eternal dharma — its history, philosophy (Vedanta, Yoga, Samkhya, Nyaya, Vaisheshika, Mimamsa), deities, texts, festivals, and lived traditions across millennia.',
};

export default function SanatanPage() {
  return (
    <>
      <CategoryIndex
        category="sanatan"
        title="Sanatan Dharm"
        description="The eternal way — six darshanas, the Itihasa-Purana corpus, bhakti traditions, festivals, and the living history from Vedic times to the modern renaissance."
        heroEmoji="सनातन"
      />
      <div className="max-w-5xl mx-auto px-4 pb-12">
        <VedicTimeline />
      </div>
    </>
  );
}
