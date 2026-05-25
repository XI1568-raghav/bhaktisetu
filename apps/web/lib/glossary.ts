import { getAllArticlesAcrossCategories } from './content';

export interface GlossaryEntry {
  term: string;
  devanagari?: string;
  meaning: string;
  source?: string;
}

const SEED: GlossaryEntry[] = [
  { term: 'Atman', devanagari: 'आत्मन्', meaning: 'The innermost self or soul; in Vedanta, identical with Brahman.' },
  { term: 'Brahman', devanagari: 'ब्रह्मन्', meaning: 'The ultimate, unchanging reality underlying all existence.' },
  { term: 'Dharma', devanagari: 'धर्म', meaning: 'Righteous duty, cosmic order, moral law that sustains the world.' },
  { term: 'Karma', devanagari: 'कर्म', meaning: 'Action and its consequences; the law of cause and effect.' },
  { term: 'Moksha', devanagari: 'मोक्ष', meaning: 'Liberation from the cycle of birth and death.' },
  { term: 'Samsara', devanagari: 'संसार', meaning: 'The continuous cycle of birth, death, and rebirth.' },
  { term: 'Yoga', devanagari: 'योग', meaning: 'Union; spiritual discipline for joining individual consciousness with the universal.' },
  { term: 'Veda', devanagari: 'वेद', meaning: 'Knowledge; the four foundational scriptures of Sanatan Dharm.' },
  { term: 'Upanishad', devanagari: 'उपनिषद्', meaning: 'Philosophical texts that form the theoretical basis of Hinduism.' },
  { term: 'Mantra', devanagari: 'मन्त्र', meaning: 'Sacred utterance, syllable, word or phonemes used as an instrument of thought.' },
  { term: 'Sandhi', devanagari: 'सन्धि', meaning: 'Euphonic combination of sounds at word boundaries in Sanskrit.' },
  { term: 'Sutra', devanagari: 'सूत्र', meaning: 'Aphorism or rule, typically a short formula condensing a teaching.' },
  { term: 'Rishi', devanagari: 'ऋषि', meaning: 'Seer; one who has heard or perceived the Vedic mantras.' },
  { term: 'Yajna', devanagari: 'यज्ञ', meaning: 'Sacrificial ritual involving offerings into a consecrated fire.' },
  { term: 'Bhakti', devanagari: 'भक्ति', meaning: 'Devotion; loving surrender to a chosen form of the divine.' },
  { term: 'Jnana', devanagari: 'ज्ञान', meaning: 'Knowledge; the path of wisdom and discrimination.' },
  { term: 'Tapas', devanagari: 'तपस्', meaning: 'Austerity, ascetic heat, disciplined practice.' },
  { term: 'Ahimsa', devanagari: 'अहिंसा', meaning: 'Non-violence in thought, word, and deed.' },
  { term: 'Satya', devanagari: 'सत्य', meaning: 'Truth; truthfulness as a moral discipline.' },
  { term: 'Guru', devanagari: 'गुरु', meaning: 'Teacher who dispels darkness and reveals knowledge.' },
  { term: 'Acharya', devanagari: 'आचार्य', meaning: 'Preceptor who teaches by example.' },
  { term: 'Shastra', devanagari: 'शास्त्र', meaning: 'Authoritative scripture or treatise.' },
  { term: 'Smriti', devanagari: 'स्मृति', meaning: 'That which is remembered — traditional texts including the epics and Dharma-shastras.' },
  { term: 'Shruti', devanagari: 'श्रुति', meaning: 'That which is heard — the Vedas, considered revealed.' },
  { term: 'Om', devanagari: 'ॐ', meaning: 'The sacred primordial sound, symbol of Brahman.' },
  { term: 'Devanagari', devanagari: 'देवनागरी', meaning: 'The script in which Sanskrit, Hindi, and many Indian languages are written.' },
  { term: 'Pranayama', devanagari: 'प्राणायाम', meaning: 'Regulation of the breath as a yogic practice.' },
  { term: 'Dhyana', devanagari: 'ध्यान', meaning: 'Meditation; sustained, unbroken attention.' },
  { term: 'Samadhi', devanagari: 'समाधि', meaning: 'Absorptive concentration; the eighth limb of Yoga.' },
  { term: 'Purusha', devanagari: 'पुरुष', meaning: 'The cosmic person; pure consciousness in Samkhya philosophy.' },
  { term: 'Prakriti', devanagari: 'प्रकृति', meaning: 'Primordial nature; the material principle in Samkhya.' },
  { term: 'Avatar', devanagari: 'अवतार', meaning: 'Descent of the divine into worldly form.' },
  { term: 'Puja', devanagari: 'पूजा', meaning: 'Ritual worship of a deity with offerings of flowers, lamp, incense.' },
  { term: 'Aarti', devanagari: 'आरती', meaning: 'Devotional song accompanied by waving of lamps before a deity.' },
  { term: 'Tirtha', devanagari: 'तीर्थ', meaning: 'Sacred crossing place; a pilgrimage site.' },
];

let cache: Map<string, GlossaryEntry> | null = null;

function buildIndex(): Map<string, GlossaryEntry> {
  if (cache) return cache;
  const map = new Map<string, GlossaryEntry>();
  for (const e of SEED) map.set(e.term.toLowerCase(), e);
  for (const art of getAllArticlesAcrossCategories()) {
    for (const t of art.frontmatter.glossaryTerms ?? []) {
      const key = t.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { term: t, meaning: `See related: ${art.frontmatter.title}`, source: art.frontmatter.slug });
      }
    }
  }
  cache = map;
  return cache;
}

export function lookupTerm(term: string): GlossaryEntry | undefined {
  return buildIndex().get(term.toLowerCase());
}

export function getAllGlossary(): GlossaryEntry[] {
  return Array.from(buildIndex().values()).sort((a, b) => a.term.localeCompare(b.term));
}
