interface Era {
  period: string;
  name: string;
  description: string;
}

const ERAS: Era[] = [
  { period: '~1500–1200 BCE', name: 'Early Vedic / Rigvedic period', description: 'Composition of the Rigveda Samhita; hymns to Agni, Indra, Soma; semi-nomadic pastoral society in the Sapta-Sindhu region.' },
  { period: '~1200–900 BCE', name: 'Mantra / Samhita period', description: 'Composition of the Sama, Yajur, and Atharva Vedas; expansion into the Gangetic plains.' },
  { period: '~900–700 BCE', name: 'Brahmana period', description: 'Composition of the Brahmana texts — prose commentaries on Vedic ritual; rise of the Kuru-Panchala kingdoms.' },
  { period: '~700–500 BCE', name: 'Aranyaka / Upanishadic period', description: 'Aranyakas and the earliest principal Upanishads (Brihadaranyaka, Chandogya); shift from external ritual to internal contemplation.' },
  { period: '~500 BCE–200 CE', name: 'Sutra and Smriti period', description: 'Composition of the Dharma-sutras, Grihya-sutras, and Sulba-sutras; Panini\'s Ashtadhyayi (~5th c. BCE); Mahabharata and Ramayana take shape.' },
  { period: '~200 BCE–500 CE', name: 'Classical age', description: 'Bhagavad Gita, Yoga Sutras of Patanjali, Brahma Sutras of Badarayana; six classical darshanas (Nyaya, Vaisheshika, Samkhya, Yoga, Mimamsa, Vedanta) crystallize.' },
  { period: '~500–1200 CE', name: 'Puranic and Bhakti age', description: 'Composition of major Puranas; rise of Shankara\'s Advaita Vedanta (8th c.); Tamil Alvar and Nayanar bhakti movements; temple-building peaks.' },
  { period: '~1200–1700 CE', name: 'Medieval Bhakti renaissance', description: 'Ramanuja, Madhva, Vallabha; Kabir, Tulsidas, Surdas, Mirabai, Chaitanya; Sant tradition across north India.' },
  { period: '~1700–present', name: 'Modern revival', description: 'Raja Ram Mohan Roy, Dayananda Saraswati, Ramakrishna, Vivekananda, Aurobindo, Gandhi; global yoga and Vedanta movement.' },
];

export default function VedicTimeline() {
  return (
    <div className="my-8">
      <h2 className="text-2xl font-bold text-surface-900 mb-4">Timeline of Sanatan Dharm</h2>
      <ol className="relative border-l-2 border-saffron-200 pl-6 space-y-6">
        {ERAS.map((e, i) => (
          <li key={i} className="relative">
            <span className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-saffron-500 border-2 border-white shadow" />
            <div className="text-xs font-semibold uppercase tracking-wider text-saffron-700">{e.period}</div>
            <h3 className="text-lg font-bold text-surface-900 mt-0.5">{e.name}</h3>
            <p className="text-sm text-surface-600 mt-1 leading-relaxed">{e.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
