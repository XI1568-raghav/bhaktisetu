// ─── Astrological Mapping Data for Puja Recommendations ───────────────────────

// ─── Nakshatra → Deity & Puja Categories ──────────────────────────────────────

export interface NakshatraInfo {
  name: string;
  deity: string;
  rulingPlanet: string;
  pujaCategories: string[];
  element: string;
}

export const NAKSHATRA_DEITY_MAP: Record<string, NakshatraInfo> = {
  ashwini:      { name: 'Ashwini',      deity: 'Ashwini Kumaras',     rulingPlanet: 'Ketu',    pujaCategories: ['health', 'prosperity'],         element: 'fire' },
  bharani:      { name: 'Bharani',      deity: 'Yama',                rulingPlanet: 'Venus',   pujaCategories: ['protection', 'memorial'],       element: 'fire' },
  krittika:     { name: 'Krittika',     deity: 'Agni',                rulingPlanet: 'Sun',     pujaCategories: ['prosperity', 'protection'],     element: 'fire' },
  rohini:       { name: 'Rohini',       deity: 'Brahma',              rulingPlanet: 'Moon',    pujaCategories: ['prosperity', 'marriage'],       element: 'earth' },
  mrigashira:   { name: 'Mrigashira',   deity: 'Soma (Chandra)',      rulingPlanet: 'Mars',    pujaCategories: ['marriage', 'health'],           element: 'earth' },
  ardra:        { name: 'Ardra',        deity: 'Rudra (Shiva)',       rulingPlanet: 'Rahu',    pujaCategories: ['protection', 'health'],         element: 'water' },
  punarvasu:    { name: 'Punarvasu',    deity: 'Aditi',               rulingPlanet: 'Jupiter', pujaCategories: ['prosperity', 'education'],      element: 'water' },
  pushya:       { name: 'Pushya',       deity: 'Brihaspati',          rulingPlanet: 'Saturn',  pujaCategories: ['prosperity', 'education'],      element: 'water' },
  ashlesha:     { name: 'Ashlesha',     deity: 'Naga (Serpent)',      rulingPlanet: 'Mercury', pujaCategories: ['protection', 'health'],         element: 'water' },
  magha:        { name: 'Magha',        deity: 'Pitris (Ancestors)',  rulingPlanet: 'Ketu',    pujaCategories: ['memorial', 'prosperity'],       element: 'fire' },
  purva_phalguni: { name: 'Purva Phalguni', deity: 'Bhaga',          rulingPlanet: 'Venus',   pujaCategories: ['marriage', 'prosperity'],       element: 'fire' },
  uttara_phalguni: { name: 'Uttara Phalguni', deity: 'Aryaman',      rulingPlanet: 'Sun',     pujaCategories: ['marriage', 'career'],           element: 'fire' },
  hasta:        { name: 'Hasta',        deity: 'Savitar (Sun)',       rulingPlanet: 'Moon',    pujaCategories: ['career', 'education'],          element: 'earth' },
  chitra:       { name: 'Chitra',       deity: 'Vishwakarma',         rulingPlanet: 'Mars',    pujaCategories: ['career', 'house'],              element: 'fire' },
  swati:        { name: 'Swati',        deity: 'Vayu',                rulingPlanet: 'Rahu',    pujaCategories: ['career', 'travel'],             element: 'air' },
  vishakha:     { name: 'Vishakha',     deity: 'Indra-Agni',          rulingPlanet: 'Jupiter', pujaCategories: ['career', 'prosperity'],         element: 'fire' },
  anuradha:     { name: 'Anuradha',     deity: 'Mitra',               rulingPlanet: 'Saturn',  pujaCategories: ['prosperity', 'marriage'],       element: 'water' },
  jyeshtha:     { name: 'Jyeshtha',     deity: 'Indra',               rulingPlanet: 'Mercury', pujaCategories: ['protection', 'career'],         element: 'water' },
  mula:         { name: 'Mula',         deity: 'Nirriti',             rulingPlanet: 'Ketu',    pujaCategories: ['protection', 'health'],         element: 'fire' },
  purva_ashadha: { name: 'Purva Ashadha', deity: 'Apas (Water)',      rulingPlanet: 'Venus',   pujaCategories: ['prosperity', 'travel'],         element: 'water' },
  uttara_ashadha: { name: 'Uttara Ashadha', deity: 'Vishvedevas',     rulingPlanet: 'Sun',     pujaCategories: ['career', 'prosperity'],         element: 'fire' },
  shravana:     { name: 'Shravana',     deity: 'Vishnu',              rulingPlanet: 'Moon',    pujaCategories: ['education', 'prosperity'],      element: 'water' },
  dhanishta:    { name: 'Dhanishta',    deity: 'Ashta Vasus',         rulingPlanet: 'Mars',    pujaCategories: ['prosperity', 'career'],         element: 'air' },
  shatabhisha:  { name: 'Shatabhisha',  deity: 'Varuna',              rulingPlanet: 'Rahu',    pujaCategories: ['health', 'protection'],         element: 'air' },
  purva_bhadrapada: { name: 'Purva Bhadrapada', deity: 'Aja Ekapada', rulingPlanet: 'Jupiter', pujaCategories: ['protection', 'prosperity'],    element: 'air' },
  uttara_bhadrapada: { name: 'Uttara Bhadrapada', deity: 'Ahir Budhnya', rulingPlanet: 'Saturn', pujaCategories: ['health', 'protection'],     element: 'water' },
  revati:       { name: 'Revati',       deity: 'Pushan',              rulingPlanet: 'Mercury', pujaCategories: ['travel', 'prosperity'],         element: 'water' },
};

// ─── Rashi → Element, Ruling Planet, Deity ────────────────────────────────────

export interface RashiInfo {
  name: string;
  nameHindi: string;
  element: 'fire' | 'earth' | 'air' | 'water';
  rulingPlanet: string;
  deityAffinity: string[];
}

export const RASHI_MAP: Record<string, RashiInfo> = {
  mesha:    { name: 'Aries (Mesha)',       nameHindi: 'मेष',    element: 'fire',  rulingPlanet: 'Mars',    deityAffinity: ['Hanuman', 'Kartikeya', 'Ganesha'] },
  vrishabha: { name: 'Taurus (Vrishabha)', nameHindi: 'वृषभ',   element: 'earth', rulingPlanet: 'Venus',   deityAffinity: ['Lakshmi', 'Krishna', 'Shiva'] },
  mithuna:  { name: 'Gemini (Mithuna)',    nameHindi: 'मिथुन',  element: 'air',   rulingPlanet: 'Mercury', deityAffinity: ['Vishnu', 'Saraswati', 'Krishna'] },
  karka:    { name: 'Cancer (Karka)',      nameHindi: 'कर्क',    element: 'water', rulingPlanet: 'Moon',    deityAffinity: ['Durga', 'Parvati', 'Chandra'] },
  simha:    { name: 'Leo (Simha)',         nameHindi: 'सिंह',    element: 'fire',  rulingPlanet: 'Sun',     deityAffinity: ['Surya', 'Rama', 'Vishnu'] },
  kanya:    { name: 'Virgo (Kanya)',       nameHindi: 'कन्या',   element: 'earth', rulingPlanet: 'Mercury', deityAffinity: ['Saraswati', 'Vishnu', 'Ganesha'] },
  tula:     { name: 'Libra (Tula)',        nameHindi: 'तुला',    element: 'air',   rulingPlanet: 'Venus',   deityAffinity: ['Lakshmi', 'Radha-Krishna', 'Venus'] },
  vrishchika: { name: 'Scorpio (Vrishchika)', nameHindi: 'वृश्चिक', element: 'water', rulingPlanet: 'Mars', deityAffinity: ['Hanuman', 'Kali', 'Shiva'] },
  dhanu:    { name: 'Sagittarius (Dhanu)', nameHindi: 'धनु',    element: 'fire',  rulingPlanet: 'Jupiter', deityAffinity: ['Dattatreya', 'Brihaspati', 'Vishnu'] },
  makara:   { name: 'Capricorn (Makara)',  nameHindi: 'मकर',    element: 'earth', rulingPlanet: 'Saturn',  deityAffinity: ['Shani Dev', 'Hanuman', 'Shiva'] },
  kumbha:   { name: 'Aquarius (Kumbha)',   nameHindi: 'कुम्भ',   element: 'air',   rulingPlanet: 'Saturn',  deityAffinity: ['Shani Dev', 'Shiva', 'Hanuman'] },
  meena:    { name: 'Pisces (Meena)',      nameHindi: 'मीन',    element: 'water', rulingPlanet: 'Jupiter', deityAffinity: ['Vishnu', 'Lakshmi', 'Brihaspati'] },
};

// ─── Life Events → Recommended Pujas ──────────────────────────────────────────

export interface LifeEventPujaInfo {
  event: string;
  label: string;
  labelHindi: string;
  pujaCategories: string[];
  recommendedDeities: string[];
  suggestedPujas: string[];
  mantras: string[];
}

export const LIFE_EVENT_PUJA_MAP: Record<string, LifeEventPujaInfo> = {
  marriage: {
    event: 'marriage',
    label: 'Marriage / Relationship',
    labelHindi: 'विवाह / संबंध',
    pujaCategories: ['special_occasion', 'prosperity'],
    recommendedDeities: ['Shiva-Parvati', 'Radha-Krishna', 'Lakshmi-Narayana'],
    suggestedPujas: ['Vivah Puja', 'Gauri Shankar Puja', 'Swayamvara Parvati Mantra Japa', 'Mangal Dosha Nivaran'],
    mantras: ['Om Namah Shivaya', 'Shiva-Parvati Mantra'],
  },
  health: {
    event: 'health',
    label: 'Health & Healing',
    labelHindi: 'स्वास्थ्य',
    pujaCategories: ['health', 'planetary'],
    recommendedDeities: ['Dhanvantari', 'Shiva', 'Hanuman', 'Surya'],
    suggestedPujas: ['Mahamrityunjaya Japa', 'Dhanvantari Puja', 'Navagraha Shanti', 'Ayushya Homam'],
    mantras: ['Mahamrityunjaya Mantra', 'Dhanvantari Mantra'],
  },
  career: {
    event: 'career',
    label: 'Career & Professional Growth',
    labelHindi: 'करियर / व्यवसाय',
    pujaCategories: ['prosperity', 'planetary'],
    recommendedDeities: ['Ganesha', 'Saraswati', 'Lakshmi', 'Vishnu'],
    suggestedPujas: ['Ganesh Puja', 'Saraswati Puja', 'Vishnu Sahasranama', 'Navagraha Shanti'],
    mantras: ['Ganesh Mantra', 'Gayatri Mantra'],
  },
  education: {
    event: 'education',
    label: 'Education & Exams',
    labelHindi: 'शिक्षा / परीक्षा',
    pujaCategories: ['special_occasion', 'prosperity'],
    recommendedDeities: ['Saraswati', 'Ganesha', 'Hayagriva', 'Dakshinamurti'],
    suggestedPujas: ['Saraswati Puja', 'Vidya Ganapati Puja', 'Hayagriva Japa', 'Aksharabhyasam'],
    mantras: ['Saraswati Mantra', 'Gayatri Mantra', 'Medha Suktam'],
  },
  childbirth: {
    event: 'childbirth',
    label: 'Childbirth & Fertility',
    labelHindi: 'संतान प्राप्ति',
    pujaCategories: ['special_occasion', 'health'],
    recommendedDeities: ['Santana Gopala', 'Parvati', 'Krishna', 'Garbha Rakshambika'],
    suggestedPujas: ['Santana Gopala Puja', 'Pumsavana Homam', 'Garbaraksha Puja', 'Seemantham'],
    mantras: ['Santana Gopala Mantra', 'Parvati Mantra'],
  },
  house: {
    event: 'house',
    label: 'New Home / Construction',
    labelHindi: 'नया घर / गृहप्रवेश',
    pujaCategories: ['special_occasion', 'prosperity'],
    recommendedDeities: ['Ganesha', 'Vastu Purusha', 'Lakshmi', 'Vishwakarma'],
    suggestedPujas: ['Griha Pravesh Puja', 'Vastu Shanti', 'Ganesh Puja', 'Navagraha Homa'],
    mantras: ['Ganesh Mantra', 'Vastu Mantra'],
  },
  travel: {
    event: 'travel',
    label: 'Travel & Safety',
    labelHindi: 'यात्रा / सुरक्षा',
    pujaCategories: ['protection'],
    recommendedDeities: ['Ganesha', 'Hanuman', 'Rama'],
    suggestedPujas: ['Ganesh Puja', 'Hanuman Chalisa Path', 'Sankat Mochan Puja'],
    mantras: ['Hanuman Chalisa', 'Ganesh Mantra'],
  },
  legal: {
    event: 'legal',
    label: 'Legal Matters & Justice',
    labelHindi: 'कानूनी मामले',
    pujaCategories: ['protection', 'planetary'],
    recommendedDeities: ['Shani Dev', 'Hanuman', 'Durga', 'Narasimha'],
    suggestedPujas: ['Bagalamukhi Puja', 'Navagraha Shanti', 'Hanuman Puja', 'Narasimha Kavacham'],
    mantras: ['Bagalamukhi Mantra', 'Hanuman Chalisa'],
  },
  prosperity: {
    event: 'prosperity',
    label: 'Wealth & Prosperity',
    labelHindi: 'धन / समृद्धि',
    pujaCategories: ['prosperity', 'festival'],
    recommendedDeities: ['Lakshmi', 'Kubera', 'Ganesha', 'Vishnu'],
    suggestedPujas: ['Lakshmi Puja', 'Kubera Puja', 'Sri Suktam Homa', 'Kanakdhara Stotram'],
    mantras: ['Lakshmi Mantra', 'Sri Suktam', 'Kubera Mantra'],
  },
  protection: {
    event: 'protection',
    label: 'Protection from Negativity',
    labelHindi: 'नकारात्मकता से सुरक्षा',
    pujaCategories: ['protection', 'planetary'],
    recommendedDeities: ['Hanuman', 'Durga', 'Narasimha', 'Kali'],
    suggestedPujas: ['Sudarshana Homam', 'Chandi Path', 'Hanuman Puja', 'Durga Kavacham'],
    mantras: ['Durga Mantra', 'Hanuman Chalisa', 'Sudarshana Mantra'],
  },
};

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Get the ruling deity and puja categories for a given nakshatra.
 */
export function getDeityForNakshatra(nakshatra: string): NakshatraInfo | null {
  const key = nakshatra.toLowerCase().replace(/\s+/g, '_');
  return NAKSHATRA_DEITY_MAP[key] || null;
}

/**
 * Get recommended puja categories and deities for a life event.
 */
export function getPujaCategoriesForEvent(event: string): LifeEventPujaInfo | null {
  const key = event.toLowerCase().replace(/\s+/g, '_');
  return LIFE_EVENT_PUJA_MAP[key] || null;
}

/**
 * Get a recommended deity based on rashi and nakshatra combination.
 * Combines deity affinities from both to find the best match.
 */
export function getRecommendedDeity(
  rashi?: string,
  nakshatra?: string
): { primaryDeity: string; alternateDeities: string[]; reasoning: string } {
  const rashiInfo = rashi ? RASHI_MAP[rashi.toLowerCase().replace(/\s+/g, '_')] : null;
  const nakshatraInfo = nakshatra ? getDeityForNakshatra(nakshatra) : null;

  if (!rashiInfo && !nakshatraInfo) {
    return {
      primaryDeity: 'Ganesha',
      alternateDeities: ['Vishnu', 'Shiva', 'Durga'],
      reasoning: 'Lord Ganesha is universally recommended as the remover of obstacles and is worshipped before all other deities.',
    };
  }

  if (rashiInfo && !nakshatraInfo) {
    return {
      primaryDeity: rashiInfo.deityAffinity[0]!,
      alternateDeities: rashiInfo.deityAffinity.slice(1),
      reasoning: `Based on your rashi ${rashiInfo.name}, ruled by ${rashiInfo.rulingPlanet}, ${rashiInfo.deityAffinity[0]} is highly recommended for you.`,
    };
  }

  if (!rashiInfo && nakshatraInfo) {
    return {
      primaryDeity: nakshatraInfo.deity,
      alternateDeities: ['Ganesha', 'Shiva'],
      reasoning: `Based on your nakshatra ${nakshatraInfo.name}, the ruling deity is ${nakshatraInfo.deity}, ruled by planet ${nakshatraInfo.rulingPlanet}.`,
    };
  }

  // Both available — combine insights
  const combinedDeities = [
    nakshatraInfo!.deity,
    ...rashiInfo!.deityAffinity,
  ];
  // Remove duplicates
  const uniqueDeities = [...new Set(combinedDeities)];

  return {
    primaryDeity: uniqueDeities[0]!,
    alternateDeities: uniqueDeities.slice(1, 4),
    reasoning: `Based on your rashi ${rashiInfo!.name} (${rashiInfo!.element} element, ruled by ${rashiInfo!.rulingPlanet}) and nakshatra ${nakshatraInfo!.name} (ruled by ${nakshatraInfo!.rulingPlanet}), ${uniqueDeities[0]} is your primary recommended deity.`,
  };
}

/**
 * Get comprehensive recommendations combining life event, rashi, and nakshatra.
 */
export function getComprehensiveRecommendation(params: {
  lifeEvent?: string;
  rashi?: string;
  nakshatra?: string;
}): {
  deities: { primaryDeity: string; alternateDeities: string[]; reasoning: string };
  pujas: string[];
  mantras: string[];
  categories: string[];
} {
  const { lifeEvent, rashi, nakshatra } = params;

  const deities = getRecommendedDeity(rashi, nakshatra);
  const eventInfo = lifeEvent ? getPujaCategoriesForEvent(lifeEvent) : null;
  const nakshatraInfo = nakshatra ? getDeityForNakshatra(nakshatra) : null;

  const pujas: string[] = [];
  const mantras: string[] = [];
  const categories: string[] = [];

  if (eventInfo) {
    pujas.push(...eventInfo.suggestedPujas);
    mantras.push(...eventInfo.mantras);
    categories.push(...eventInfo.pujaCategories);
  }

  if (nakshatraInfo) {
    categories.push(...nakshatraInfo.pujaCategories);
  }

  // Deduplicate
  return {
    deities,
    pujas: [...new Set(pujas)],
    mantras: [...new Set(mantras)],
    categories: [...new Set(categories)],
  };
}
