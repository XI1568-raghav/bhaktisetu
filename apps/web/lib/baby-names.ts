// Baby-name-by-nakshatra — Vedic namakaran shastra.
// Each of the 27 nakshatras has 4 padas (quarters of 3°20' each).
// Per Brihat Samhita + traditional namakaran, each pada governs a starting
// sound (syllable) for the baby's name. The mapping below is the canonical
// shastra-standard pada-syllable table used by panditjis across India.
//
// Curated name corpora are conservative — only commonly-used, traditionally
// auspicious Sanskrit-rooted names. Meanings are deity/quality references.

import { NAKSHATRAS, type Nakshatra } from './nakshatras';

export type Gender = 'boy' | 'girl' | 'all';

export type BabyName = {
 name: string;
 meaning: string;
 deity?: string;
 gender: 'boy' | 'girl';
};

// ─── 27 nakshatras × 4 pada syllables ───────────────────────────────
// Format: lowercase nakshatra slug → 4-tuple of starting syllables (English).
// Devanagari originals: चू/चे/चो/ला for Ashwini etc.
export const NAKSHATRA_PADA_SYLLABLES: Record<string, [string, string, string, string]> = {
 ashwini:       ['Chu', 'Che', 'Cho', 'La'],
 bharani:       ['Li', 'Lu', 'Le', 'Lo'],
 krittika:      ['A', 'I', 'U', 'E'],
 rohini:        ['O', 'Va', 'Vi', 'Vu'],
 mrigashira:    ['Ve', 'Vo', 'Ka', 'Ki'],
 ardra:         ['Ku', 'Gha', 'Nga', 'Chha'],
 punarvasu:     ['Ke', 'Ko', 'Ha', 'Hi'],
 pushya:        ['Hu', 'He', 'Ho', 'Da'],
 ashlesha:      ['Di', 'Du', 'De', 'Do'],
 magha:         ['Ma', 'Mi', 'Mu', 'Me'],
 'purva-phalguni':  ['Mo', 'Ta', 'Ti', 'Tu'],
 'uttara-phalguni': ['Te', 'To', 'Pa', 'Pi'],
 hasta:         ['Pu', 'Sha', 'Na', 'Tha'],
 chitra:        ['Pe', 'Po', 'Ra', 'Ri'],
 swati:         ['Ru', 'Re', 'Ro', 'Ta'],
 vishakha:      ['Ti', 'Tu', 'Te', 'To'],
 anuradha:      ['Na', 'Ni', 'Nu', 'Ne'],
 jyeshtha:      ['No', 'Ya', 'Yi', 'Yu'],
 mula:          ['Ye', 'Yo', 'Bha', 'Bhi'],
 'purva-ashadha':   ['Bhu', 'Dha', 'Pha', 'Dha'],
 'uttara-ashadha':  ['Bhe', 'Bho', 'Ja', 'Ji'],
 shravana:      ['Khi', 'Khu', 'Khe', 'Kho'],
 dhanishta:     ['Ga', 'Gi', 'Gu', 'Ge'],
 shatabhisha:   ['Go', 'Sa', 'Si', 'Su'],
 'purva-bhadrapada':  ['Se', 'So', 'Da', 'Di'],
 'uttara-bhadrapada': ['Du', 'Tha', 'Jha', 'Na'],
 revati:        ['De', 'Do', 'Cha', 'Chi'],
};

// ─── Curated name corpus by starting sound ──────────────────────────
// Each starting English syllable maps to a list of traditional names with
// meanings. Names chosen from common Hindu naming convention — Vedic deities,
// rishi names, virtue names, nature-rooted. Not exhaustive — representative
// pool a pandit would suggest.

const NAMES: Record<string, BabyName[]> = {
 // ─── A ───
 A: [
  { name: 'Aarav', meaning: 'Peaceful, melodious sound', gender: 'boy' },
  { name: 'Aditya', meaning: 'Sun, son of Aditi', deity: 'Surya', gender: 'boy' },
  { name: 'Arjun', meaning: 'Bright, shining; Pandava warrior', deity: 'Krishna-disciple', gender: 'boy' },
  { name: 'Arnav', meaning: 'Ocean, sea', gender: 'boy' },
  { name: 'Akshay', meaning: 'Indestructible, eternal', gender: 'boy' },
  { name: 'Anish', meaning: 'Without master; Supreme Lord', deity: 'Vishnu', gender: 'boy' },
  { name: 'Ananya', meaning: 'Unique, without equal', gender: 'girl' },
  { name: 'Aarohi', meaning: 'Musical note, ascending melody', gender: 'girl' },
  { name: 'Aadhya', meaning: 'First power, primordial', deity: 'Adi Shakti', gender: 'girl' },
  { name: 'Anika', meaning: 'Grace, brilliance', deity: 'Durga', gender: 'girl' },
 ],
 I: [
  { name: 'Ishaan', meaning: 'Lord of all directions; Shiva', deity: 'Shiva', gender: 'boy' },
  { name: 'Indra', meaning: 'King of devas, thunder god', deity: 'Indra', gender: 'boy' },
  { name: 'Inder', meaning: 'Variant of Indra', deity: 'Indra', gender: 'boy' },
  { name: 'Ishita', meaning: 'Goddess, supreme', deity: 'Lakshmi', gender: 'girl' },
  { name: 'Indu', meaning: 'Moon', deity: 'Chandra', gender: 'girl' },
  { name: 'Ila', meaning: 'Earth, daughter of Manu', gender: 'girl' },
 ],
 U: [
  { name: 'Utkarsh', meaning: 'Progress, advancement', gender: 'boy' },
  { name: 'Udit', meaning: 'Risen, awakened', gender: 'boy' },
  { name: 'Uday', meaning: 'Rising sun, emergence', gender: 'boy' },
  { name: 'Urmila', meaning: 'Wife of Lakshmana', gender: 'girl' },
  { name: 'Ujjwala', meaning: 'Bright, luminous', gender: 'girl' },
  { name: 'Urvi', meaning: 'Earth', gender: 'girl' },
 ],
 E: [
  { name: 'Ekansh', meaning: 'One part of God', deity: 'Krishna', gender: 'boy' },
  { name: 'Eklavya', meaning: 'Self-taught archer of Mahabharata', gender: 'boy' },
  { name: 'Esha', meaning: 'Goddess Parvati, desire', deity: 'Parvati', gender: 'girl' },
 ],
 O: [
  { name: 'Om', meaning: 'Primordial sound, Brahman', gender: 'boy' },
  { name: 'Omkar', meaning: 'Form of Om', deity: 'Brahman', gender: 'boy' },
  { name: 'Ojas', meaning: 'Vital energy, divine luster', gender: 'boy' },
  { name: 'Omisha', meaning: 'Goddess of birth and death', deity: 'Shakti', gender: 'girl' },
 ],

 // ─── Cha series ───
 Cha: [
  { name: 'Chaitanya', meaning: 'Consciousness, awareness', gender: 'boy' },
  { name: 'Chakshu', meaning: 'Eye, vision', gender: 'boy' },
  { name: 'Charvi', meaning: 'Beautiful woman', gender: 'girl' },
  { name: 'Charita', meaning: 'Good character', gender: 'girl' },
 ],
 Chi: [
  { name: 'Chirag', meaning: 'Lamp, light', gender: 'boy' },
  { name: 'Chinmay', meaning: 'Consciousness embodied', gender: 'boy' },
  { name: 'Chitra', meaning: 'Picture, painting; nakshatra goddess', gender: 'girl' },
 ],
 Chu: [
  { name: 'Chudamani', meaning: 'Crest jewel', gender: 'boy' },
 ],
 Che: [
  { name: 'Chetan', meaning: 'Consciousness, life-force', gender: 'boy' },
  { name: 'Chetana', meaning: 'Consciousness (fem)', gender: 'girl' },
 ],
 Cho: [
  { name: 'Chodhary', meaning: 'Leader, chief', gender: 'boy' },
 ],
 Chha: [
  { name: 'Chhaya', meaning: 'Shadow; wife of Sun', deity: 'Surya', gender: 'girl' },
 ],

 // ─── La series ───
 La: [
  { name: 'Lakshay', meaning: 'Aim, target', gender: 'boy' },
  { name: 'Laksh', meaning: 'Aim, goal', gender: 'boy' },
  { name: 'Lavanya', meaning: 'Grace, beauty', gender: 'girl' },
  { name: 'Lakshmi', meaning: 'Goddess of wealth', deity: 'Lakshmi', gender: 'girl' },
 ],
 Li: [
  { name: 'Lipika', meaning: 'Writing, letter', gender: 'girl' },
 ],
 Lu: [
  { name: 'Lubhana', meaning: 'Attractive', gender: 'girl' },
 ],
 Le: [
  { name: 'Leena', meaning: 'Devoted, absorbed', gender: 'girl' },
 ],
 Lo: [
  { name: 'Lokesh', meaning: 'Lord of the world', deity: 'Brahma', gender: 'boy' },
 ],

 // ─── Va / Vi / Vu ───
 Va: [
  { name: 'Varun', meaning: 'God of the seas', deity: 'Varuna', gender: 'boy' },
  { name: 'Vamana', meaning: 'Dwarf avatar of Vishnu', deity: 'Vishnu', gender: 'boy' },
  { name: 'Vandita', meaning: 'Praised, revered', gender: 'girl' },
 ],
 Vi: [
  { name: 'Vivaan', meaning: 'Full of life, sun rays', gender: 'boy' },
  { name: 'Vihaan', meaning: 'Dawn, morning', gender: 'boy' },
  { name: 'Vishnu', meaning: 'The Preserver', deity: 'Vishnu', gender: 'boy' },
  { name: 'Vidya', meaning: 'Knowledge', deity: 'Saraswati', gender: 'girl' },
 ],
 Vu: [
  { name: 'Vrushi', meaning: 'Rain (rare)', gender: 'girl' },
 ],
 Ve: [
  { name: 'Vedant', meaning: 'End of the Vedas, ultimate knowledge', gender: 'boy' },
  { name: 'Vedika', meaning: 'Altar, sacred platform', gender: 'girl' },
 ],
 Vo: [
  { name: 'Vohra', meaning: 'Merchant, trader', gender: 'boy' },
 ],

 // ─── Ka / Ki / Ku / Ke / Ko ───
 Ka: [
  { name: 'Karthik', meaning: 'Son of Shiva, lord of war', deity: 'Karthikeya', gender: 'boy' },
  { name: 'Kanha', meaning: 'Young Krishna', deity: 'Krishna', gender: 'boy' },
  { name: 'Kavya', meaning: 'Poetry, poem', gender: 'girl' },
  { name: 'Kashvi', meaning: 'Shining, brilliant', gender: 'girl' },
 ],
 Ki: [
  { name: 'Kirti', meaning: 'Fame, glory', gender: 'girl' },
  { name: 'Kishan', meaning: 'Krishna', deity: 'Krishna', gender: 'boy' },
 ],
 Ku: [
  { name: 'Kunal', meaning: 'Lotus; son of Ashoka', gender: 'boy' },
  { name: 'Kumud', meaning: 'Water lily', gender: 'girl' },
 ],
 Ke: [
  { name: 'Kewal', meaning: 'Sole, unique', gender: 'boy' },
  { name: 'Keshava', meaning: 'Beautiful-haired Krishna', deity: 'Krishna', gender: 'boy' },
 ],
 Ko: [
  { name: 'Kovid', meaning: 'Scholar, wise', gender: 'boy' },
  { name: 'Komal', meaning: 'Tender, gentle', gender: 'girl' },
 ],
 Gha: [
  { name: 'Ghanshyam', meaning: 'Dark cloud (Krishna)', deity: 'Krishna', gender: 'boy' },
 ],
 Nga: [
  { name: 'Nga', meaning: '(rare syllable; use anusvara names)', gender: 'boy' },
 ],

 // ─── Ha / Hi / Hu / He / Ho ───
 Ha: [
  { name: 'Harsh', meaning: 'Joy, happiness', gender: 'boy' },
  { name: 'Hari', meaning: 'Vishnu, remover of sorrow', deity: 'Vishnu', gender: 'boy' },
  { name: 'Hansa', meaning: 'Swan; pure soul', gender: 'girl' },
 ],
 Hi: [
  { name: 'Himanshu', meaning: 'Moon (ice-crowned)', deity: 'Chandra', gender: 'boy' },
  { name: 'Himani', meaning: 'Goddess Parvati', deity: 'Parvati', gender: 'girl' },
 ],
 Hu: [
  { name: 'Hutash', meaning: 'Fire, Agni', deity: 'Agni', gender: 'boy' },
 ],
 He: [
  { name: 'Hemant', meaning: 'Winter season; pre-spring', gender: 'boy' },
  { name: 'Hema', meaning: 'Gold; Parvati', deity: 'Parvati', gender: 'girl' },
 ],
 Ho: [
  { name: 'Homi', meaning: 'One who performs homa (sacrifice)', gender: 'boy' },
 ],

 // ─── Da / Di / Du / De / Do ───
 Da: [
  { name: 'Daksh', meaning: 'Capable, skilled; Prajapati', gender: 'boy' },
  { name: 'Dakshay', meaning: 'Son of Daksha', gender: 'boy' },
  { name: 'Dakshita', meaning: 'Skilled, competent', gender: 'girl' },
 ],
 Di: [
  { name: 'Dilip', meaning: 'Protector of Delhi; ancient king', gender: 'boy' },
  { name: 'Divya', meaning: 'Divine, heavenly', gender: 'girl' },
  { name: 'Diya', meaning: 'Lamp, light', gender: 'girl' },
 ],
 Du: [
  { name: 'Dushyant', meaning: 'King, father of Bharata', gender: 'boy' },
 ],
 De: [
  { name: 'Devansh', meaning: 'Part of God', gender: 'boy' },
  { name: 'Devika', meaning: 'Small goddess', gender: 'girl' },
 ],
 Do: [
  { name: 'Dolly', meaning: 'Doll-like (modern)', gender: 'girl' },
 ],

 // ─── Ma / Mi / Mu / Me / Mo ───
 Ma: [
  { name: 'Madhav', meaning: 'Lord Krishna', deity: 'Krishna', gender: 'boy' },
  { name: 'Manas', meaning: 'Mind, soul', gender: 'boy' },
  { name: 'Maya', meaning: 'Illusion; goddess of magic', gender: 'girl' },
  { name: 'Mahima', meaning: 'Greatness, glory', gender: 'girl' },
 ],
 Mi: [
  { name: 'Mihir', meaning: 'Sun', deity: 'Surya', gender: 'boy' },
  { name: 'Mira', meaning: 'Devotee of Krishna; Mirabai', gender: 'girl' },
 ],
 Mu: [
  { name: 'Mukunda', meaning: 'Liberator; Krishna', deity: 'Krishna', gender: 'boy' },
  { name: 'Muskan', meaning: 'Smile', gender: 'girl' },
 ],
 Me: [
  { name: 'Meghan', meaning: 'Cloud, sky', gender: 'boy' },
  { name: 'Meera', meaning: 'Krishna devotee', gender: 'girl' },
 ],
 Mo: [
  { name: 'Mohan', meaning: 'Enchanter; Krishna', deity: 'Krishna', gender: 'boy' },
  { name: 'Mohini', meaning: 'Bewitching form of Vishnu', deity: 'Vishnu', gender: 'girl' },
 ],

 // ─── Ta / Ti / Tu / Te / To ───
 Ta: [
  { name: 'Tarun', meaning: 'Young, youthful', gender: 'boy' },
  { name: 'Tanish', meaning: 'Ambition', gender: 'boy' },
  { name: 'Tara', meaning: 'Star; goddess', deity: 'Tara', gender: 'girl' },
 ],
 Ti: [
  { name: 'Tilak', meaning: 'Sacred forehead mark', gender: 'boy' },
 ],
 Tu: [
  { name: 'Tushar', meaning: 'Frost, snow', gender: 'boy' },
  { name: 'Tulsi', meaning: 'Sacred basil; Lakshmi avatar', deity: 'Lakshmi', gender: 'girl' },
 ],
 Te: [
  { name: 'Tejas', meaning: 'Brilliance, fire', gender: 'boy' },
 ],
 To: [
  { name: 'Toral', meaning: 'Devotional', gender: 'girl' },
 ],
 Tha: [
  { name: 'Thakur', meaning: 'Lord, master', gender: 'boy' },
 ],

 // ─── Pa / Pi / Pu / Pe / Po ───
 Pa: [
  { name: 'Param', meaning: 'Supreme, ultimate', gender: 'boy' },
  { name: 'Pranay', meaning: 'Love, affection', gender: 'boy' },
  { name: 'Pari', meaning: 'Fairy, angel', gender: 'girl' },
 ],
 Pi: [
  { name: 'Piyush', meaning: 'Nectar, ambrosia', gender: 'boy' },
 ],
 Pu: [
  { name: 'Puneet', meaning: 'Pure, holy', gender: 'boy' },
  { name: 'Pushti', meaning: 'Nourishment; Vishnu energy', deity: 'Vishnu', gender: 'girl' },
 ],
 Pe: [
  { name: 'Pearl', meaning: 'Gem; from the sea', gender: 'girl' },
 ],
 Po: [
  { name: 'Poonam', meaning: 'Full moon', gender: 'girl' },
 ],
 Pha: [
  { name: 'Phalgun', meaning: 'Month of Phalguna; lunar month', gender: 'boy' },
 ],

 // ─── Sha / Sa / Si / Su / Se / So ───
 Sha: [
  { name: 'Shaurya', meaning: 'Courage, valor', gender: 'boy' },
  { name: 'Sharad', meaning: 'Autumn season', gender: 'boy' },
  { name: 'Shanaya', meaning: 'First ray of sun', gender: 'girl' },
 ],
 Sa: [
  { name: 'Sahil', meaning: 'Shore, leader', gender: 'boy' },
  { name: 'Saksham', meaning: 'Capable, competent', gender: 'boy' },
  { name: 'Saanvi', meaning: 'Goddess Lakshmi', deity: 'Lakshmi', gender: 'girl' },
 ],
 Si: [
  { name: 'Siddharth', meaning: 'One who attained the goal; Buddha', gender: 'boy' },
  { name: 'Siya', meaning: 'Sita; Rama\'s consort', deity: 'Sita', gender: 'girl' },
 ],
 Su: [
  { name: 'Surya', meaning: 'Sun god', deity: 'Surya', gender: 'boy' },
  { name: 'Suhana', meaning: 'Pleasant, beautiful', gender: 'girl' },
 ],
 Se: [
  { name: 'Sevak', meaning: 'Servant, devotee', gender: 'boy' },
 ],
 So: [
  { name: 'Soham', meaning: 'I am That; mahavakya', gender: 'boy' },
  { name: 'Sonal', meaning: 'Golden', gender: 'girl' },
 ],

 // ─── Na / Ni / Nu / Ne / No ───
 Na: [
  { name: 'Naman', meaning: 'Salutation, bow', gender: 'boy' },
  { name: 'Nakul', meaning: 'Mongoose; Pandava brother', gender: 'boy' },
  { name: 'Nandini', meaning: 'Daughter; Krishna devotee', gender: 'girl' },
 ],
 Ni: [
  { name: 'Nirav', meaning: 'Silent, calm', gender: 'boy' },
  { name: 'Niharika', meaning: 'Galaxy, nebula', gender: 'girl' },
 ],
 Nu: [
  { name: 'Nupur', meaning: 'Anklet bell', gender: 'girl' },
 ],
 Ne: [
  { name: 'Nehal', meaning: 'Handsome, lovely', gender: 'boy' },
  { name: 'Neha', meaning: 'Love, affection', gender: 'girl' },
 ],
 No: [
  { name: 'Nootan', meaning: 'New, fresh', gender: 'girl' },
 ],

 // ─── Ya / Yi / Yu / Ye / Yo ───
 Ya: [
  { name: 'Yash', meaning: 'Fame, glory', gender: 'boy' },
  { name: 'Yashasvi', meaning: 'Famous, successful', gender: 'boy' },
  { name: 'Yashika', meaning: 'Successful (fem)', gender: 'girl' },
 ],
 Yi: [],
 Yu: [
  { name: 'Yug', meaning: 'Era, age', gender: 'boy' },
  { name: 'Yuvraj', meaning: 'Crown prince', gender: 'boy' },
 ],
 Ye: [],
 Yo: [
  { name: 'Yogi', meaning: 'One united with the Self', gender: 'boy' },
  { name: 'Yogita', meaning: 'United in yoga', gender: 'girl' },
 ],

 // ─── Bha / Bhi / Bhu / Bhe / Bho ───
 Bha: [
  { name: 'Bharat', meaning: 'India personified; brother of Rama', gender: 'boy' },
  { name: 'Bhavik', meaning: 'Pious, righteous', gender: 'boy' },
  { name: 'Bhavna', meaning: 'Feeling, emotion', gender: 'girl' },
 ],
 Bhi: [
  { name: 'Bhima', meaning: 'Mighty Pandava brother', gender: 'boy' },
 ],
 Bhu: [
  { name: 'Bhuvan', meaning: 'World, earth', gender: 'boy' },
  { name: 'Bhumika', meaning: 'Earth, role in life', gender: 'girl' },
 ],
 Bhe: [],
 Bho: [],

 // ─── Dha / Dhi / Dhu / Dhe / Dho ───
 Dha: [
  { name: 'Dhanya', meaning: 'Blessed, fortunate', gender: 'girl' },
  { name: 'Dhruv', meaning: 'Pole star, steadfast', gender: 'boy' },
 ],
 Dhi: [],
 Dhu: [],
 Dhe: [],
 Dho: [],

 // ─── Ja / Ji / Ju ───
 Ja: [
  { name: 'Jay', meaning: 'Victory', gender: 'boy' },
  { name: 'Janardhan', meaning: 'Vishnu', deity: 'Vishnu', gender: 'boy' },
  { name: 'Jaya', meaning: 'Victory (fem); Durga', deity: 'Durga', gender: 'girl' },
 ],
 Ji: [
  { name: 'Jitendra', meaning: 'Conqueror of Indra/senses', gender: 'boy' },
 ],
 Ju: [],

 // ─── Khi / Khu / Khe / Kho ───
 Khi: [],
 Khu: [
  { name: 'Khushi', meaning: 'Happiness, joy', gender: 'girl' },
 ],
 Khe: [],
 Kho: [],

 // ─── Ga / Gi / Gu / Ge / Go ───
 Ga: [
  { name: 'Ganesh', meaning: 'Lord of beginnings', deity: 'Ganesha', gender: 'boy' },
  { name: 'Gaurav', meaning: 'Honor, pride', gender: 'boy' },
  { name: 'Gauri', meaning: 'Fair-skinned Parvati', deity: 'Parvati', gender: 'girl' },
 ],
 Gi: [
  { name: 'Girish', meaning: 'Lord of mountains; Shiva', deity: 'Shiva', gender: 'boy' },
 ],
 Gu: [
  { name: 'Gunjan', meaning: 'Humming, buzz', gender: 'girl' },
 ],
 Ge: [
  { name: 'Geet', meaning: 'Song', gender: 'boy' },
 ],
 Go: [
  { name: 'Gopal', meaning: 'Cowherd; Krishna', deity: 'Krishna', gender: 'boy' },
  { name: 'Govind', meaning: 'Krishna, protector of cows', deity: 'Krishna', gender: 'boy' },
 ],

 // ─── Ra / Ri / Ru / Re / Ro ───
 Ra: [
  { name: 'Ram', meaning: '7th Vishnu avatar; ideal king', deity: 'Rama', gender: 'boy' },
  { name: 'Rajat', meaning: 'Silver', gender: 'boy' },
  { name: 'Radha', meaning: 'Krishna\'s beloved', deity: 'Radha', gender: 'girl' },
  { name: 'Ridhima', meaning: 'Full of love', gender: 'girl' },
 ],
 Ri: [
  { name: 'Rishi', meaning: 'Sage, seer', gender: 'boy' },
  { name: 'Riya', meaning: 'Singer, melody', gender: 'girl' },
 ],
 Ru: [
  { name: 'Rudra', meaning: 'Shiva\'s fierce form', deity: 'Shiva', gender: 'boy' },
  { name: 'Ruchi', meaning: 'Light, splendor, taste', gender: 'girl' },
 ],
 Re: [
  { name: 'Reyansh', meaning: 'Ray of light', gender: 'boy' },
  { name: 'Reva', meaning: 'River Narmada', gender: 'girl' },
 ],
 Ro: [
  { name: 'Rohan', meaning: 'Ascending, growing', gender: 'boy' },
  { name: 'Rohini', meaning: 'Fourth nakshatra; star', deity: 'Chandra-beloved', gender: 'girl' },
 ],

 // ─── Jha ───
 Jha: [],

 // ─── Sha (already above), Th rare ───
};

export function syllablesForNakshatra(slug: string): [string, string, string, string] | null {
 return NAKSHATRA_PADA_SYLLABLES[slug] ?? null;
}

export function namesStartingWith(syllable: string, gender: Gender = 'all'): BabyName[] {
 const pool = NAMES[syllable] ?? [];
 if (gender === 'all') return pool;
 return pool.filter((n) => n.gender === gender);
}

export type NakshatraNameReport = {
 nakshatra: Nakshatra;
 padas: Array<{ pada: number; syllable: string; names: BabyName[] }>;
};

export function nakshatraNameReport(slug: string, gender: Gender = 'all'): NakshatraNameReport | null {
 const nak = NAKSHATRAS.find((n) => n.slug === slug);
 const syls = syllablesForNakshatra(slug);
 if (!nak || !syls) return null;
 const padas = syls.map((sy, i) => ({
  pada: i + 1,
  syllable: sy,
  names: namesStartingWith(sy, gender),
 }));
 return { nakshatra: nak, padas };
}

export function allNakshatraOptions(): Array<{ slug: string; label: string }> {
 return NAKSHATRAS.map((n) => ({ slug: n.slug, label: `${n.name} (${n.sanskritName})` }));
}
