// Standalone famous mantras — drives /chants programmatic-SEO.
// Different intent than /deity/[slug]/mantras (which groups BY deity).
// Targets queries like "mahamrityunjaya mantra benefits", "gayatri mantra meaning",
// "shanti mantra lyrics", "asato ma sadgamaya translation".

export interface Chant {
  slug: string;
  name: string;             // English/transliterated common name
  sanskritName: string;     // Devanagari title
  category: 'protection' | 'wisdom' | 'wealth' | 'peace' | 'devotional' | 'invocation';
  deity: string;
  source: string;           // Veda / Upanishad / Purana origin
  sanskrit: string;         // Full Devanagari text
  transliteration: string;  // IAST/common transliteration
  meaning: string;          // English translation (~80 words)
  benefits: string;         // Spiritual + worldly benefits (~70 words)
  whenToChant: string;      // Time/occasion (~40 words)
  howToChant: string;       // Procedure, breath, count (~50 words)
  recommendedCount: number; // Suggested japa count
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const CHANTS: Chant[] = [
  {
    slug: 'gayatri-mantra',
    name: 'Gayatri Mantra',
    sanskritName: 'गायत्री मन्त्र',
    category: 'wisdom',
    deity: 'Savitr (Sun) / Vedmata',
    source: 'Rig Veda 3.62.10 — by Rishi Vishvamitra',
    sanskrit: 'ॐ भूर्भुवः स्वः।\nतत्सवितुर्वरेण्यं।\nभर्गो देवस्य धीमहि।\nधियो यो नः प्रचोदयात्॥',
    transliteration: 'Om Bhur Bhuvah Svah | Tat-Savitur Varenyam | Bhargo Devasya Dhimahi | Dhiyo Yo Nah Prachodayat',
    meaning: 'Om — the three worlds (earth, atmosphere, heaven). We meditate upon the supreme radiance of that divine Sun (Savitr) — the source of all illumination. May He inspire and illumine our intellect.',
    benefits: 'Awakens buddhi (discriminative intellect), purifies mind, removes karmic darkness. Daily chanting brings clarity in decisions, success in studies, spiritual progress. Called the mother of all Vedas — chanting Gayatri is said to grant the merit of reciting all four Vedas.',
    whenToChant: 'Three sandhyas — sunrise, noon, sunset. Most powerful at brahma muhurta (4-6am). Minimum 108 times daily for serious sadhakas.',
    howToChant: 'Face east at sunrise, west at sunset. Sit in padmasana. Use rudraksha or tulsi mala. Chant slowly with attention on meaning. Brahmacharis traditionally need initiation; householders can chant freely.',
    recommendedCount: 108,
    difficulty: 'intermediate',
  },
  {
    slug: 'mahamrityunjaya-mantra',
    name: 'Maha Mrityunjaya Mantra',
    sanskritName: 'महामृत्युञ्जय मन्त्र',
    category: 'protection',
    deity: 'Shiva (Tryambaka)',
    source: 'Rig Veda 7.59.12 — by Rishi Vasishtha',
    sanskrit: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्।\nउर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्॥',
    transliteration: 'Om Tryambakam Yajamahe Sugandhim Pushti-vardhanam | Urvarukamiva Bandhanan Mrityor-mukshiya Maamritat',
    meaning: 'We worship the three-eyed Lord Shiva, the fragrant one who nourishes all beings. As a ripe cucumber falls easily from its vine, may He liberate us from the bondage of death, but not from immortality (moksha).',
    benefits: 'Most powerful healing mantra in Sanatan dharma. Cures serious illness, protects from accidents, untimely death, grah-dosha. Recommended during sade-sati, mahadasha of malefics, after medical diagnosis, family crises. Said to defeat Yamaraj himself.',
    whenToChant: 'Mondays, pradosh kaal, shivratri, during illness, before surgery. Brahma muhurta most powerful. Family member can chant on behalf of patient.',
    howToChant: 'Sit facing east or north. Rudraksha mala. Slow, clear pronunciation — each syllable. Visualize Shiva\'s three eyes radiating healing light. 108 minimum; serious cases recite 1.25 lakh (one purascharan).',
    recommendedCount: 108,
    difficulty: 'beginner',
  },
  {
    slug: 'shanti-mantra',
    name: 'Shanti Mantra (Asato Ma)',
    sanskritName: 'असतो मा सद्गमय',
    category: 'peace',
    deity: 'Universal / Brahman',
    source: 'Brihadaranyaka Upanishad 1.3.28',
    sanskrit: 'ॐ असतो मा सद्गमय।\nतमसो मा ज्योतिर्गमय।\nमृत्योर्मा अमृतं गमय।\nॐ शान्तिः शान्तिः शान्तिः॥',
    transliteration: 'Om Asato Ma Sadgamaya | Tamaso Ma Jyotirgamaya | Mrityorma Amritam Gamaya | Om Shanti Shanti Shantih',
    meaning: 'Lead me from the unreal to the real. Lead me from darkness to light. Lead me from death to immortality. Om peace, peace, peace.',
    benefits: 'Calms restless mind, dispels confusion, removes fear of death. Universal mantra suitable for all — Hindu, non-Hindu, beginner, sage. Sets devotional intention before puja, meditation, study. Three shantis pacify adhi-bhautika (external), adhi-daivika (cosmic), adhi-atmika (internal) afflictions.',
    whenToChant: 'Start of any puja, meditation session, study, journey. Also when anxious, before sleep, during family conflict.',
    howToChant: 'Sit comfortably. Soft voice or mental japa. No mala required — even 3 repetitions effective. Pause and feel peace settle after final shantih.',
    recommendedCount: 3,
    difficulty: 'beginner',
  },
  {
    slug: 'ganesh-mantra',
    name: 'Vakratunda Mahakaya (Ganesh Pranamya)',
    sanskritName: 'वक्रतुण्ड महाकाय',
    category: 'invocation',
    deity: 'Ganesha (Vighnaharta)',
    source: 'Traditional Sanskrit invocation',
    sanskrit: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।\nनिर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥',
    transliteration: 'Vakratunda Mahakaya Surya-koti Samaprabha | Nirvighnam Kuru Me Deva Sarva-karyeshu Sarvada',
    meaning: 'O Lord with the curved trunk, the great body, with the brilliance of ten million suns — please make all my undertakings free from obstacles, always.',
    benefits: 'Remover of obstacles (vighnaharta). Chanted at start of every new venture — business launch, exam, journey, ceremony, learning, construction. Aligns mind with success-flow. First mantra Hindu children traditionally learn.',
    whenToChant: 'Before every important task. Wednesdays (Ganesh\'s day), Ganesh Chaturthi, on chaturthi tithi monthly.',
    howToChant: 'Face east. Light a diya. Visualize Ganesha smiling. Three repetitions before action sufficient; 108 for serious obstacles.',
    recommendedCount: 11,
    difficulty: 'beginner',
  },
  {
    slug: 'lakshmi-mantra',
    name: 'Sri Mahalakshmi Ashtakshari',
    sanskritName: 'श्री महालक्ष्म्यै नमः',
    category: 'wealth',
    deity: 'Mahalakshmi',
    source: 'Lakshmi Tantra; Padma Purana',
    sanskrit: 'ॐ श्रीं ह्रीं श्रीं कमले कमलालये\nप्रसीद प्रसीद ॐ श्रीं ह्रीं श्रीं\nमहालक्ष्म्यै नमः॥',
    transliteration: 'Om Shreem Hreem Shreem Kamale Kamalalaye | Prasida Prasida | Om Shreem Hreem Shreem | Mahalakshmyai Namah',
    meaning: 'Om — Shreem (beej of Lakshmi), Hreem (beej of cosmic feminine), Shreem. O lotus-dweller, lotus-seated one — be pleased, be pleased. Salutations to Mahalakshmi.',
    benefits: 'Attracts wealth — both spiritual (daya, dharma) and material (artha). Removes financial blockages, increases dhana yoga in chart. Chanted by businesspeople, before Diwali, on Fridays. Said to bring Lakshmi to one\'s home if chanted with shraddha for 40 days.',
    whenToChant: 'Fridays, Diwali, Akshaya Tritiya, on purnima. Best at sunset (Lakshmi\'s arrival time) or brahma muhurta.',
    howToChant: 'Face east. Sphatik (crystal) mala ideal. Light ghee diya with cotton wicks. Visualize golden Lakshmi with elephants. 108 daily minimum for prosperity sadhana.',
    recommendedCount: 108,
    difficulty: 'intermediate',
  },
  {
    slug: 'saraswati-mantra',
    name: 'Saraswati Vandana',
    sanskritName: 'या कुन्देन्दु तुषारहारधवला',
    category: 'wisdom',
    deity: 'Saraswati',
    source: 'Saraswati Stotra (attributed to Agastya)',
    sanskrit: 'या कुन्देन्दुतुषारहारधवला या शुभ्रवस्त्रावृता।\nया वीणावरदण्डमण्डितकरा या श्वेतपद्मासना।\nया ब्रह्माच्युत शङ्करप्रभृतिभिर्देवैः सदा वन्दिता।\nसा मां पातु सरस्वती भगवती निःशेषजाड्यापहा॥',
    transliteration: 'Ya Kundendu Tushara Haara Dhavala | Ya Shubhra Vastravrita | Ya Vina Vara Danda Mandita Kara | Ya Shveta Padmasana | Ya Brahmachyuta Shankara Prabhritibhirdevaih Sada Vandita | Sa Mam Patu Saraswati Bhagavati Nihshesha Jadyapaha',
    meaning: 'She who is white as jasmine, moon, snow garland; clothed in pure white; whose hands are adorned with the veena; who sits on a white lotus; who is ever worshipped by Brahma, Vishnu, Shankara and all devas — may that Goddess Saraswati protect me and remove all dullness of mind.',
    benefits: 'Removes mental dullness (jadya). Sharpens memory, intellect, learning capacity. Chanted by students before study, exams, debates. Said to grant fluency in speech, writing, music, all arts. Especially powerful on Vasant Panchami.',
    whenToChant: 'Vasant Panchami, before exams or study, on Wednesdays or Thursdays. Daily morning for students.',
    howToChant: 'Face east near books/instruments. White flowers. Three repetitions before any study session; 108 daily for serious students.',
    recommendedCount: 11,
    difficulty: 'intermediate',
  },
  {
    slug: 'hanuman-chalisa',
    name: 'Hanuman Chalisa (Opening Doha)',
    sanskritName: 'श्रीगुरु चरन सरोज रज',
    category: 'protection',
    deity: 'Hanuman',
    source: 'Composed by Tulsidas (~16th century)',
    sanskrit: 'श्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि।\nबरनउँ रघुबर बिमल जसु, जो दायकु फल चारि॥',
    transliteration: 'Shri Guru Charan Saroj Raj, Nij Manu Mukuru Sudhari | Baranau Raghubar Bimal Jasu, Jo Dayaku Phal Chari',
    meaning: 'Having cleansed the mirror of my mind with the dust of my Guru\'s lotus feet, I describe the pure glory of Sri Rama, who bestows the four fruits (dharma, artha, kama, moksha).',
    benefits: 'Hanuman is the destroyer of all obstacles, especially negative energies (pret-badha, drishti dosh). Full 40 verses chanted on Tuesdays/Saturdays repels evil, grants courage, strength, devotion. Even the opening doha invokes Hanuman\'s presence. Full text → /chalisa/hanuman.',
    whenToChant: 'Tuesdays, Saturdays, Hanuman Jayanti, when facing fear or negativity. Sunrise or sunset.',
    howToChant: 'Face image of Hanuman or Ram-Lakshman-Sita. Offer red flowers, sindoor. Read full Chalisa (8-10 min). Minimum 11 times in 21 days clears most prarabdha obstacles.',
    recommendedCount: 1,
    difficulty: 'beginner',
  },
  {
    slug: 'aditya-hridayam',
    name: 'Aditya Hridayam (Opening Verses)',
    sanskritName: 'आदित्य हृदय',
    category: 'protection',
    deity: 'Surya (Aditya)',
    source: 'Valmiki Ramayana, Yuddha Kand 105',
    sanskrit: 'आदित्यहृदयं पुण्यं सर्वशत्रुविनाशनम्।\nजयावहं जपं नित्यमक्षयं परमं शिवम्॥',
    transliteration: 'Aditya Hridayam Punyam Sarva-shatru Vinashanam | Jayavaham Japam Nityam Akshayyam Paramam Shivam',
    meaning: 'The sacred Aditya Hridaya destroys all enemies and brings victory. Continuous japa of this hymn grants imperishable supreme auspiciousness.',
    benefits: 'Taught by Rishi Agastya to Rama before the final battle with Ravana. Grants victory in seemingly impossible struggles — legal cases, competitive exams, illness, enemies. Removes laziness, depression, lack of vitality (sun = pranic source). Surya is karaka for father, government, fame.',
    whenToChant: 'Sundays, sunrise (arghya time), Ratha Saptami, before exams, court cases, surgery, important meetings.',
    howToChant: 'Face east at sunrise. Offer water (arghya) to sun. Full 31 verses takes ~15 min. Daily for 40 days transforms life direction.',
    recommendedCount: 1,
    difficulty: 'advanced',
  },
  {
    slug: 'krishna-mahamantra',
    name: 'Hare Krishna Mahamantra',
    sanskritName: 'हरे कृष्ण महामन्त्र',
    category: 'devotional',
    deity: 'Krishna / Radha',
    source: 'Kali-Santarana Upanishad (Atharva Veda)',
    sanskrit: 'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे।\nहरे राम हरे राम राम राम हरे हरे॥',
    transliteration: 'Hare Krishna Hare Krishna Krishna Krishna Hare Hare | Hare Rama Hare Rama Rama Rama Hare Hare',
    meaning: 'O Hara (Radha, divine feminine energy), O Krishna, O Rama — please engage me in your loving devotional service.',
    benefits: 'Yuga-mantra of Kali Yuga per Kali-Santarana Upanishad. Cleanses sins of countless lifetimes through pure name-chanting (nama-sankirtana). Easiest path to moksha in current age. Suitable for any age, caste, gender, religion. Sankirtan (group chanting) multiplies benefit exponentially.',
    whenToChant: 'Anytime, anywhere — no restrictions. Sankirtan especially on Ekadashi, Janmashtami, Holi.',
    howToChant: 'Tulsi mala ideal. ISKCON tradition: 16 rounds daily = 1728 mantras. Even one round (108) daily transforms consciousness over time. Chant aloud or mentally; both work.',
    recommendedCount: 108,
    difficulty: 'beginner',
  },
  {
    slug: 'durga-mantra',
    name: 'Durga Mantra (Sarva Mangala)',
    sanskritName: 'सर्व मङ्गल माङ्गल्ये',
    category: 'protection',
    deity: 'Durga (Mahadevi)',
    source: 'Devi Mahatmyam (Markandeya Purana) chapter 11',
    sanskrit: 'सर्वमङ्गलमाङ्गल्ये शिवे सर्वार्थसाधिके।\nशरण्ये त्र्यम्बके गौरि नारायणि नमोऽस्तु ते॥',
    transliteration: 'Sarva-mangala Mangalye Shive Sarvartha-sadhike | Sharanye Tryambake Gauri Narayani Namostu Te',
    meaning: 'O auspicious Goddess of all auspiciousness, fulfiller of all aims, refuge of all, three-eyed fair one, Narayani — salutations to you.',
    benefits: 'Universal Devi salutation invoking all 9 forms of Durga. Protects from accidents, enemies, evil spirits, black magic, miscarriage. Empowers women — health, courage, leadership. Most chanted Devi mantra after Devi Mahatmyam itself. Daily chanting brings Mother\'s grace into household.',
    whenToChant: 'Navratri (twice yearly), Ashtami/Navami tithi monthly, Fridays, before travel, surgery, exams.',
    howToChant: 'Face east or north. Rudraksha or red coral mala. Offer red flowers, kumkum. 108 daily during Navratri; 11 daily otherwise.',
    recommendedCount: 108,
    difficulty: 'beginner',
  },
  {
    slug: 'navagraha-shanti-mantra',
    name: 'Navagraha Shanti Mantra',
    sanskritName: 'नवग्रह शान्ति मन्त्र',
    category: 'protection',
    deity: 'Nine Planets (Navagraha)',
    source: 'Yajur Veda, Navagraha Stotra',
    sanskrit: 'ब्रह्मा मुरारिस्त्रिपुरान्तकारी\nभानुः शशी भूमिसुतो बुधश्च।\nगुरुश्च शुक्रः शनि राहुकेतवः\nसर्वे ग्रहाः शान्तिकरा भवन्तु॥',
    transliteration: 'Brahma Murari Tripurantakari | Bhanuh Shashi Bhumi-suto Budhashcha | Guruscha Shukrah Shani Rahu-ketavah | Sarve Grahah Shantikara Bhavantu',
    meaning: 'May Brahma (presiding over Sun), Murari/Vishnu (Moon), Tripurantakari/Shiva (Mars), and the planets — Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu, Ketu — all become bestowers of peace.',
    benefits: 'Pacifies all 9 grahas (planets) simultaneously. Useful when multiple grah-doshas active, during mahadasha transitions, sade-sati. Daily chanting balances karmic planetary influences. Recommended addition to morning sandhya by jyotishis.',
    whenToChant: 'Daily morning. Especially before astrological transits (planet sign-changes), eclipses, sankranti days.',
    howToChant: 'Face east. Light 9 wicks if possible. Chant 9 times (one per graha) or 108 times.',
    recommendedCount: 9,
    difficulty: 'intermediate',
  },
  {
    slug: 'guru-mantra',
    name: 'Guru Mantra (Gurur Brahma)',
    sanskritName: 'गुरुर्ब्रह्मा',
    category: 'devotional',
    deity: 'Guru (universal teacher)',
    source: 'Guru Gita; Skanda Purana',
    sanskrit: 'गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः।\nगुरुः साक्षात् परब्रह्म तस्मै श्रीगुरवे नमः॥',
    transliteration: 'Gurur Brahma Gurur Vishnuh Gurur Devo Maheshvarah | Guruh Sakshat Parabrahma Tasmai Shri Gurave Namah',
    meaning: 'The Guru is Brahma (creator), the Guru is Vishnu (sustainer), the Guru is Maheshvara (Shiva, transformer). The Guru is the supreme Brahman itself made manifest. Salutations to that revered Guru.',
    benefits: 'Invokes guru-tattva — the principle that liberates. Chanted before any learning, sadhana, or important spiritual decision. Especially powerful on Guru Purnima. Brings the right teacher into one\'s life when sincere. Daily chanting deepens devotion and dispels intellectual pride.',
    whenToChant: 'Guru Purnima (Ashada Purnima), Thursdays, at start of any study or sadhana, before meeting teachers.',
    howToChant: 'Face north or east. Visualize your teacher or any realized master. Three repetitions before sadhana sufficient; 108 on Guru Purnima.',
    recommendedCount: 3,
    difficulty: 'beginner',
  },
];

export function chantSlugs(): string[] {
  return CHANTS.map((c) => c.slug);
}

export function getChant(slug: string): Chant | undefined {
  return CHANTS.find((c) => c.slug === slug);
}

export function chantsByCategory(category: Chant['category']): Chant[] {
  return CHANTS.filter((c) => c.category === category);
}
