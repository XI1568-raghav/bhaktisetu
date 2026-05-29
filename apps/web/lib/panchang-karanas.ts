// 11 karanas — 5th anga of Panchang. Half-tithi unit (~12 hours).
// 7 chara (movable) repeat 8 times each across 30 tithis = 56 slots.
// 4 sthira (fixed) occupy 4 specific slots near full moon + new moon.
// Vishti (Bhadra) is the most-avoided karana — universally inauspicious.
// References: Surya Siddhanta, Muhurta Chintamani, Brihat Samhita.

export interface PanchangKarana {
 slug: string;
 number: number;             // 1..11
 sanskrit: string;
 name: string;
 deity: string;
 category: 'chara' | 'sthira';
 nature: 'auspicious' | 'inauspicious' | 'mixed';
 effect: string;
 bestFor: string[];
 avoidFor: string[];
 notes: string;
 mantra: string;
 mantraEnglish: string;
}

export const PANCHANG_KARANAS: PanchangKarana[] = [
 { slug: 'bava',        number: 1,  sanskrit: 'बव',        name: 'Bava',        deity: 'Indra',     category: 'chara', nature: 'auspicious',
   effect: 'Stable, growth-oriented karana. Excellent for activities that need long-lasting outcomes.',
   bestFor: ['Foundation laying', 'Long-term contracts', 'Sankalp for multi-year vows', 'Marriage rituals', 'Coronation / leadership-taking'],
   avoidFor: ['Travel started late evening'],
   notes: 'First of the 7 chara karanas. Sun-amsha gives steady prosperity.',
   mantra: 'ॐ इन्द्राय नमः', mantraEnglish: 'Om Indraya Namah' },

 { slug: 'balava',      number: 2,  sanskrit: 'बालव',      name: 'Balava',      deity: 'Brahma',    category: 'chara', nature: 'auspicious',
   effect: 'Vitality + strength giving karana. Good for learning, child-rituals, foundational education.',
   bestFor: ['Vidyarambha (study start)', 'Annaprashan', 'Upanayana (sacred thread)', 'New skill learning', 'Vedic chanting commencement'],
   avoidFor: ['Surgery on minors'],
   notes: 'Bala = strength. Especially auspicious for children and beginnings.',
   mantra: 'ॐ ब्रह्मणे नमः', mantraEnglish: 'Om Brahmane Namah' },

 { slug: 'kaulava',     number: 3,  sanskrit: 'कौलव',      name: 'Kaulava',     deity: 'Mitra',     category: 'chara', nature: 'auspicious',
   effect: 'Friendship + alliance karana. Strengthens relationships, partnerships, social bonds.',
   bestFor: ['Marriage', 'Business partnership', 'Reconciliation', 'Friendship rituals', 'Diplomatic talks'],
   avoidFor: ['Litigation filing', 'Adversarial action'],
   notes: 'Mitra-amsha promotes harmony; avoid all conflict-oriented work.',
   mantra: 'ॐ मित्राय नमः', mantraEnglish: 'Om Mitraya Namah' },

 { slug: 'taitila',     number: 4,  sanskrit: 'तैतिल',     name: 'Taitila',     deity: 'Aryaman',   category: 'chara', nature: 'auspicious',
   effect: 'Prosperity + accumulation. Wealth + assets + grain-storage work flourish.',
   bestFor: ['Grain purchase / storage', 'Property registration', 'Treasury work', 'Gold purchase', 'Lakshmi puja'],
   avoidFor: ['Borrowing / new loan'],
   notes: 'Aryaman governs hospitality + wealth — good for receiving gifts and accumulation.',
   mantra: 'ॐ अर्यम्णे नमः', mantraEnglish: 'Om Aryamne Namah' },

 { slug: 'gara',        number: 5,  sanskrit: 'गर',        name: 'Gara',        deity: 'Bhumi',     category: 'chara', nature: 'auspicious',
   effect: 'Agricultural + land-related karana. Excellent for soil, seeds, building on earth.',
   bestFor: ['Sowing / planting', 'Bhumi puja', 'Construction start', 'Well-digging', 'Tree planting'],
   avoidFor: ['Naval / sea travel'],
   notes: 'Bhumi-amsha favors earth-based work; weak for water and air activities.',
   mantra: 'ॐ भूम्यै नमः', mantraEnglish: 'Om Bhumyai Namah' },

 { slug: 'vanija',      number: 6,  sanskrit: 'वणिज',      name: 'Vanija',      deity: 'Lakshmi',   category: 'chara', nature: 'auspicious',
   effect: 'Trade + commerce karana. Strongest for buying-selling, retail launch, mercantile signing.',
   bestFor: ['Shop opening', 'Stock purchase', 'Trade contracts', 'E-commerce launch', 'Vehicle for business'],
   avoidFor: ['Donation (give-away contradicts commerce intent)'],
   notes: 'Vanija = merchant. Lakshmi favours profit-making and accumulation through trade.',
   mantra: 'ॐ लक्ष्म्यै नमः', mantraEnglish: 'Om Lakshmyai Namah' },

 { slug: 'vishti',      number: 7,  sanskrit: 'विष्टि',    name: 'Vishti (Bhadra)', deity: 'Yama',  category: 'chara', nature: 'inauspicious',
   effect: 'Most inauspicious karana. Bhadra — universally avoided for ALL auspicious work. Yama-amsha brings obstacles, delay, loss.',
   bestFor: ['Adversarial action (litigation, war)', 'Surgery only if unavoidable', 'Pitr-paksha rites', 'Bhadra-shanti puja itself'],
   avoidFor: ['Marriage', 'Griha pravesh', 'Travel', 'Business start', 'Vehicle purchase', 'Naming ceremony', 'Sankalp', 'All shubh karya'],
   notes: 'Also called Bhadra Karana. Visited by Yama. Even routine work suffers. Check Drik Panchang daily to skip Bhadra hours.',
   mantra: 'ॐ यमाय नमः', mantraEnglish: 'Om Yamaya Namah' },

 { slug: 'shakuni',     number: 8,  sanskrit: 'शकुनि',     name: 'Shakuni',     deity: 'Kali',      category: 'sthira', nature: 'inauspicious',
   effect: 'Fixed karana — occurs in 2nd half of Krishna Chaturdashi. Treachery + deception risks; avoid important work.',
   bestFor: ['Tantric sadhana', 'Kali puja', 'Removing enemies (under guru guidance)'],
   avoidFor: ['Marriage', 'Travel', 'Contracts', 'New ventures', 'Trust-based agreements'],
   notes: 'Shakuni = bird of ill-omen. Fixed slot near amavasya.',
   mantra: 'ॐ कालिकायै नमः', mantraEnglish: 'Om Kalikayai Namah' },

 { slug: 'chatushpada', number: 9,  sanskrit: 'चतुष्पद',   name: 'Chatushpada', deity: 'Vrishabha (Bull)', category: 'sthira', nature: 'mixed',
   effect: 'Fixed karana — 1st half of Amavasya. Four-legged-creature ritual karana. Cattle puja + Govardhan-style worship favored.',
   bestFor: ['Cattle puja', 'Govardhan worship', 'Gaushala donations', 'Bull purchase', 'Pitru tarpan'],
   avoidFor: ['Marriage', 'Travel', 'New business'],
   notes: 'Chatuh-pada = four-legged. Auspicious only for animal-related and ancestral work.',
   mantra: 'ॐ वृषभाय नमः', mantraEnglish: 'Om Vrishabhaya Namah' },

 { slug: 'naga',        number: 10, sanskrit: 'नाग',       name: 'Naga',        deity: 'Sarpa (Serpent)', category: 'sthira', nature: 'inauspicious',
   effect: 'Fixed karana — 2nd half of Amavasya. Serpent karana. Naga puja + Kalsarpa dosh remedies; otherwise inauspicious.',
   bestFor: ['Naga puja', 'Kalsarpa dosh remedy', 'Rahu-Ketu shanti', 'Nag Panchami rituals'],
   avoidFor: ['Marriage', 'Travel', 'Surgery', 'New venture', 'Property purchase'],
   notes: 'Sarpa-amsha brings hidden dangers; only Naga-related puja recommended.',
   mantra: 'ॐ नागाय नमः', mantraEnglish: 'Om Nagaya Namah' },

 { slug: 'kintughna',   number: 11, sanskrit: 'किंस्तुघ्न', name: 'Kintughna',   deity: 'Vayu',     category: 'sthira', nature: 'auspicious',
   effect: 'Fixed karana — 1st half of Shukla Pratipada (just after Amavasya). Kim-tu-ghna = "destroyer of obstacles". Sin-cleansing.',
   bestFor: ['Sin-removal puja', 'New month start', 'Beginning fresh chapter', 'Vidyarambha', 'Foundation laying'],
   avoidFor: ['Funeral postponement'],
   notes: 'Only auspicious sthira karana. Vayu-amsha purifies and gives momentum to new beginnings.',
   mantra: 'ॐ वायवे नमः', mantraEnglish: 'Om Vayave Namah' },
];

export function getKarana(slug: string): PanchangKarana | undefined {
 return PANCHANG_KARANAS.find((k) => k.slug === slug);
}

export const CHARA_KARANAS = PANCHANG_KARANAS.filter((k) => k.category === 'chara');
export const STHIRA_KARANAS = PANCHANG_KARANAS.filter((k) => k.category === 'sthira');
export const INAUSPICIOUS_KARANAS = PANCHANG_KARANAS.filter((k) => k.nature === 'inauspicious');
export const AUSPICIOUS_KARANAS = PANCHANG_KARANAS.filter((k) => k.nature === 'auspicious');

export function natureColor(nature: PanchangKarana['nature']): string {
 if (nature === 'auspicious') return 'emerald';
 if (nature === 'inauspicious') return 'rose';
 return 'amber';
}
