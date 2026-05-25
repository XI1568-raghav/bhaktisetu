export interface SanskritLessonQuiz {
  q: string;
  options: string[];
  correct: number;
  explanation?: string;
}

export interface SanskritLesson {
  id: string;
  title: string;
  subtitle?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  minutes: number;
  intro: string;
  body: string;
  quiz: SanskritLessonQuiz[];
}

export const LESSONS: SanskritLesson[] = [
  {
    id: 'l01-devanagari-vowels',
    title: 'Devanagari Vowels (स्वराः)',
    subtitle: 'The 14 vowel sounds of Sanskrit',
    level: 'beginner',
    minutes: 8,
    intro: 'Sanskrit has 14 traditional vowels (svaras): अ आ इ ई उ ऊ ऋ ॠ ऌ ॡ ए ऐ ओ औ. Each is a self-contained sound — short or long, simple or compound.',
    body: `## Short and long pairs\n\nMost vowels come in short/long pairs:\n- **अ (a)** short — **आ (ā)** long\n- **इ (i)** short — **ई (ī)** long\n- **उ (u)** short — **ऊ (ū)** long\n- **ऋ (ṛ)** short — **ॠ (ṝ)** long\n\nThe long vowel takes roughly twice the duration of the short.\n\n## Compound vowels\n\n- **ए (e)**, **ऐ (ai)**, **ओ (o)**, **औ (au)** — these are always long, formed historically by vowel combinations.\n\n## Pronunciation tips\n\n- अ is pronounced like the 'u' in English 'cup', not 'ah'\n- ऋ is a vocalic 'r' — closer to 'ri' than to 'ru'\n- Length matters: देव (deva, god) ≠ देवी (devī, goddess)`,
    quiz: [
      { q: 'How many traditional vowels does Sanskrit have?', options: ['12', '14', '16', '10'], correct: 1, explanation: 'The classical count is 14, including the rare ऌ and ॡ.' },
      { q: 'Which is the LONG counterpart of इ?', options: ['ए', 'ई', 'ऐ', 'ऋ'], correct: 1 },
      { q: 'Which vowel is always pronounced long?', options: ['अ', 'इ', 'उ', 'ऐ'], correct: 3 },
    ],
  },
  {
    id: 'l02-devanagari-consonants',
    title: 'Devanagari Consonants (व्यञ्जनानि)',
    subtitle: 'The 33 consonants in 5 varga groups',
    level: 'beginner',
    minutes: 10,
    intro: 'Sanskrit consonants are organized by the place of articulation in the mouth — a remarkably scientific arrangement.',
    body: `## The 5 vargas (groups)\n\nEach varga has 5 consonants — unvoiced unaspirated, unvoiced aspirated, voiced unaspirated, voiced aspirated, and the nasal:\n\n1. **Kaṇṭhya (velar)**: क ख ग घ ङ\n2. **Tālavya (palatal)**: च छ ज झ ञ\n3. **Mūrdhanya (retroflex)**: ट ठ ड ढ ण\n4. **Dantya (dental)**: त थ द ध न\n5. **Oṣṭhya (labial)**: प फ ब भ म\n\n## Semivowels and sibilants\n\n- **Antaḥstha (semivowels)**: य र ल व\n- **Ūṣma (sibilants)**: श ष स\n- **Aspirate**: ह`,
    quiz: [
      { q: 'How many vargas are there?', options: ['4', '5', '6', '8'], correct: 1 },
      { q: 'क belongs to which varga?', options: ['Palatal', 'Velar', 'Dental', 'Labial'], correct: 1 },
      { q: 'Which is the nasal of the dental varga?', options: ['ङ', 'ण', 'न', 'म'], correct: 2 },
    ],
  },
  {
    id: 'l03-namaste',
    title: 'Your first word: नमस्ते',
    subtitle: 'Greeting, etymology, and reverence',
    level: 'beginner',
    minutes: 5,
    intro: 'Namaste — perhaps the most famous Sanskrit word in the world. Let us see what it actually means.',
    body: `## The structure\n\n**नमस्ते = नमः + ते**\n\n- **नमः (namaḥ)**: bowing, salutation, reverence\n- **ते (te)**: to you (dative singular of तत्/त्वम्)\n\nLiterally: "salutation to you".\n\n## The deeper meaning\n\nTraditionally interpreted as: "I bow to the divine in you" — recognizing the Atman that pervades both the greeter and the greeted.\n\n## Variations\n\n- **नमस्कार (namaskāra)**: the act of namaste\n- **प्रणाम (praṇāma)**: a deeper bow, often with prostration`,
    quiz: [
      { q: 'What does the second part "ते" mean?', options: ['I', 'You (to)', 'We', 'They'], correct: 1 },
      { q: 'नमः literally means…', options: ['Hello', 'Bowing/salutation', 'Goodbye', 'Friend'], correct: 1 },
    ],
  },
];

export function getLesson(id: string): SanskritLesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function getAllLessons(): SanskritLesson[] {
  return LESSONS.slice();
}
