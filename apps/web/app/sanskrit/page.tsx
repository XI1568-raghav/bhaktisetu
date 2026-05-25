import type { Metadata } from 'next';
import CategoryIndex from '../../components/CategoryIndex';

export const metadata: Metadata = {
  title: 'Sanskrit — Knowledge & History',
  description: 'Learn Sanskrit grammar, history, literature, and philosophy. Articles on Devanagari script, Panini, sandhi, prosody, and the Vedic to classical evolution of the language.',
};

export default function SanskritPage() {
  return (
    <CategoryIndex
      category="sanskrit"
      title="Sanskrit"
      description="The mother of Indic languages — grammar, history, literature, and the world of Panini, Patanjali, and the great kavyas."
      heroEmoji="संस्कृतम्"
    />
  );
}
