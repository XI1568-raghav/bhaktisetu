import type { Metadata } from 'next';
import CategoryIndex from '../../components/CategoryIndex';

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/ved' },
  title: 'Vedas — Knowledge & History',
  description: 'The four Vedas — Rigveda, Samaveda, Yajurveda, Atharvaveda — their Samhitas, Brahmanas, Aranyakas, and Upanishads, the rishis who heard them, and the Vedic worldview.',
};

export default function VedPage() {
  return (
    <CategoryIndex
      category="ved"
      title="Vedas"
      description="The oldest layer of Sanatan knowledge — hymns, rituals, contemplations, and the Upanishadic turn from outer sacrifice to inner Self."
      heroEmoji="वेद"
    />
  );
}
