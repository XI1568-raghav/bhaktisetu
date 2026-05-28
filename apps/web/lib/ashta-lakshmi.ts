// Ashta Lakshmi — 8 manifestations of Goddess Lakshmi per Lakshmi Tantra
// and Sri Sukta tradition. Each presides over one aspect of prosperity.
// Targets: "ashta lakshmi names", "8 forms of lakshmi", "dhana lakshmi
// mantra", "ashta lakshmi stotra".

export interface AshtaLakshmi {
  slug: string;
  number: number;
  name: string;
  sanskrit: string;
  domain: string;
  iconography: string;
  vahana: string;
  color: string;
  numberOfHands: number;
  attributes: string[];
  beejaMantra: string;
  primaryMantra: string;
  primaryMantraEnglish: string;
  benefit: string;
  bestDay: string;
  signatureFestival: string;
  vrataPractice: string;
  associatedTemple: string;
  storyOrigin: string;
}

export const ASHTA_LAKSHMIS: AshtaLakshmi[] = [
  {
    slug: 'adi-lakshmi',
    number: 1,
    name: 'Adi Lakshmi',
    sanskrit: 'आदि लक्ष्मी',
    domain: 'Primordial / original prosperity',
    iconography: 'Seated on lotus next to Vishnu; symbol of divine union of Sri-Narayana',
    vahana: 'Lotus + Garuda (with Vishnu)',
    color: 'White',
    numberOfHands: 4,
    attributes: ['Lotus', 'White flag', 'Abhaya mudra (no-fear)', 'Varada mudra (boon-granting)'],
    beejaMantra: 'ॐ श्रीं ह्रीं श्रीं कमले कमलालये प्रसीद प्रसीद',
    primaryMantra: 'ॐ श्रीं ह्रीं श्रीं आदि-लक्ष्म्यै नमः',
    primaryMantraEnglish: 'Om Shreem Hreem Shreem Adi-Lakshmyai Namah',
    benefit: 'Spiritual liberation, dissolution of negative samskaras, blessing for fresh start',
    bestDay: 'Friday',
    signatureFestival: 'Diwali (Lakshmi Puja night) — first invocation among the 8 forms',
    vrataPractice: 'Friday Vrat — light ghee lamp + recite 108x mantra at sunset',
    associatedTemple: 'Ashtalakshmi Temple, Besant Nagar, Chennai (all 8 forms in one complex)',
    storyOrigin: 'Lakshmi emerged from the Samudra Manthan (churning of ocean) as Adi form — the seed from which 7 other forms manifested when devotees sought specific blessings.',
  },
  {
    slug: 'dhana-lakshmi',
    number: 2,
    name: 'Dhana Lakshmi',
    sanskrit: 'धन लक्ष्मी',
    domain: 'Monetary wealth, gold, currency, financial abundance',
    iconography: 'Six arms holding gold pot (kalasha) showering coins; rides golden chariot',
    vahana: 'Golden chariot drawn by lions',
    color: 'Red',
    numberOfHands: 6,
    attributes: ['Gold kalasha showering coins', 'Conch', 'Discus', 'Bow', 'Arrow', 'Abhaya mudra'],
    beejaMantra: 'ॐ श्रीं ह्रीं क्लीं श्रीं श्रीं महालक्ष्म्यै नमः',
    primaryMantra: 'ॐ श्रीं ह्रीं श्रीं धन-लक्ष्म्यै नमः',
    primaryMantraEnglish: 'Om Shreem Hreem Shreem Dhana-Lakshmyai Namah',
    benefit: 'Removes debt, attracts steady income, dissolves money-related obstacles, business prosperity',
    bestDay: 'Friday + Thursday (Guru-Lakshmi alignment)',
    signatureFestival: 'Dhanteras (2 days before Diwali) — purchase gold/silver to invite her grace',
    vrataPractice: 'Vaibhava Lakshmi Vrat (21 Fridays) — popular among householders',
    associatedTemple: 'Mahalakshmi Temple, Kolhapur (Maharashtra) — emphasizes Dhana form',
    storyOrigin: 'Indra lost his royal wealth due to Sage Durvasa\'s curse. Vishnu directed devas to churn the ocean — Dhana Lakshmi emerged, restoring Indra\'s treasury and re-establishing cosmic prosperity.',
  },
  {
    slug: 'dhanya-lakshmi',
    number: 3,
    name: 'Dhanya Lakshmi',
    sanskrit: 'धान्य लक्ष्मी',
    domain: 'Agricultural abundance — grain, food, nourishment, harvest',
    iconography: 'Eight arms holding paddy sheaves, sugarcane, fruits, mace, lotus, Chakra, Shankha',
    vahana: 'Bullock cart with paddy',
    color: 'Green',
    numberOfHands: 8,
    attributes: ['Paddy sheaves', 'Sugarcane', 'Banana bunch', 'Mace', 'Lotus pair', 'Conch', 'Discus', 'Abhaya mudra'],
    beejaMantra: 'ॐ श्रीं ह्रीं श्रीं अन्नपूर्णायै नमः',
    primaryMantra: 'ॐ श्रीं ह्रीं श्रीं धान्य-लक्ष्म्यै नमः',
    primaryMantraEnglish: 'Om Shreem Hreem Shreem Dhanya-Lakshmyai Namah',
    benefit: 'Ensures household food supply never depletes, blesses farming, removes hunger',
    bestDay: 'Friday + Akshaya Tritiya',
    signatureFestival: 'Akshaya Tritiya (April-May) — start grain storage; Pongal/Makar Sankranti (harvest)',
    vrataPractice: 'Donate rice/grain to needy on Fridays — annaadana yields direct Dhanya blessing',
    associatedTemple: 'Annapurna Devi Temple, Varanasi (paired form)',
    storyOrigin: 'When famine struck Kashi, Shiva himself begged Annapurna (Dhanya Lakshmi) for food to feed devotees. The act established that even Mahadev acknowledges her as source of all sustenance.',
  },
  {
    slug: 'gaja-lakshmi',
    number: 4,
    name: 'Gaja Lakshmi',
    sanskrit: 'गज लक्ष्मी',
    domain: 'Royal power, fame, recognition, animal wealth (cattle, elephants)',
    iconography: 'Four arms; flanked by two white elephants bathing her with kalasha-water',
    vahana: 'Two royal white elephants (Iravata-class)',
    color: 'Golden / red',
    numberOfHands: 4,
    attributes: ['Lotus (each hand)', 'Abhaya mudra', 'Varada mudra'],
    beejaMantra: 'ॐ श्रीं ह्रीं श्रीं गज-लक्ष्म्यै नमः',
    primaryMantra: 'ॐ श्रीं ह्रीं श्रीं गज-लक्ष्म्यै नमः',
    primaryMantraEnglish: 'Om Shreem Hreem Shreem Gaja-Lakshmyai Namah',
    benefit: 'Royal/governmental favor, leadership recognition, victory in court cases, fame in profession',
    bestDay: 'Thursday + Friday',
    signatureFestival: 'Gaja Lakshmi Vrata (Bhadrapada Shukla Ashtami) — Odisha + Andhra; Varalakshmi Vrata (Sravana)',
    vrataPractice: '8-day Gaja Lakshmi Vrata in Bhadrapada — woven thread + elephant motif on doorway',
    associatedTemple: 'Padmavathi Devi temple, Tiruchanur (consort of Tirupati Venkateswara) — Gaja motif prominent',
    storyOrigin: 'King Indra was bound by demon Bali. To liberate him, Indra performed Gaja Lakshmi vrata — she appeared on white elephants, defeated Bali, and restored royal status. Hence patroness of all kings and leaders.',
  },
  {
    slug: 'santana-lakshmi',
    number: 5,
    name: 'Santana Lakshmi',
    sanskrit: 'सन्तान लक्ष्मी',
    domain: 'Progeny — children, lineage continuation, fertility',
    iconography: 'Six arms; holds a child on lap; carries kalasha, sword, shield, lotus',
    vahana: 'Stands/sits with child; no specific mount',
    color: 'White / pink',
    numberOfHands: 6,
    attributes: ['Child (gently held)', 'Kalasha (water-pot)', 'Sword', 'Shield', 'Lotus', 'Abhaya mudra'],
    beejaMantra: 'ॐ श्रीं ह्रीं श्रीं सन्तान-लक्ष्म्यै नमः',
    primaryMantra: 'ॐ श्रीं ह्रीं श्रीं सन्तान-लक्ष्म्यै नमः',
    primaryMantraEnglish: 'Om Shreem Hreem Shreem Santana-Lakshmyai Namah',
    benefit: 'Blessing of healthy children, removes infertility doshas, protects pregnancy + newborn',
    bestDay: 'Friday + Putrada Ekadashi (twice yearly)',
    signatureFestival: 'Putrada Ekadashi (Pausha + Sravana months); Sankashti Chaturthi for child wellbeing',
    vrataPractice: 'Santana Lakshmi Stotra recitation 108x daily for 41 days; couple together; Friday red-cloth offering',
    associatedTemple: 'Ashtalakshmi Chennai (Santana shrine), Santhana Krishna temple, Sholingar',
    storyOrigin: 'Sage Devala\'s wife was childless for decades. She invoked Santana Lakshmi via 41-day vrata. Devi appeared holding a child, granted her twin sons who became famed rishis — establishing this form as patroness of family continuation.',
  },
  {
    slug: 'veera-lakshmi',
    number: 6,
    name: 'Veera Lakshmi',
    sanskrit: 'वीर लक्ष्मी',
    domain: 'Courage, valor, victory over enemies, warrior strength',
    iconography: 'Eight arms; chakra, conch, bow, arrow, trident, sword, scroll, fearless mudra',
    vahana: 'Lion (Simhavahini)',
    color: 'Red / saffron',
    numberOfHands: 8,
    attributes: ['Chakra', 'Conch', 'Bow', 'Arrow', 'Trident', 'Sword', 'Palm-leaf scroll (knowledge)', 'Abhaya mudra'],
    beejaMantra: 'ॐ श्रीं ह्रीं श्रीं वीर-लक्ष्म्यै नमः',
    primaryMantra: 'ॐ श्रीं ह्रीं श्रीं वीर-लक्ष्म्यै नमः',
    primaryMantraEnglish: 'Om Shreem Hreem Shreem Veera-Lakshmyai Namah',
    benefit: 'Courage in adversity, victory in competitions, protection from enemies + lawsuits, warrior energy',
    bestDay: 'Tuesday + Friday',
    signatureFestival: 'Vijayadashami (Dussehra) — 10-day Navratri culminates in invoking Veera form',
    vrataPractice: 'Recite Veera Lakshmi mantra 108x facing south at dawn; offer red hibiscus',
    associatedTemple: 'Sri Mahalakshmi Temple, Hospet (Veera form prominent in Vijayanagara tradition)',
    storyOrigin: 'When Krishnadevaraya of Vijayanagara faced 8 Bahmani sultans, he invoked Veera Lakshmi. She appeared on her lion, granted victory, and Vijayanagara became South India\'s greatest Hindu empire (1336-1646).',
  },
  {
    slug: 'vijaya-lakshmi',
    number: 7,
    name: 'Vijaya Lakshmi',
    sanskrit: 'विजय लक्ष्मी',
    domain: 'Victory in undertakings, success in goals, breakthrough after struggle',
    iconography: 'Eight arms; chakra, conch, sword, shield, noose, goad, lotus, abhaya mudra',
    vahana: 'Lion',
    color: 'Red',
    numberOfHands: 8,
    attributes: ['Chakra', 'Conch', 'Sword', 'Shield', 'Noose (pasha)', 'Goad (ankusha)', 'Lotus', 'Abhaya mudra'],
    beejaMantra: 'ॐ श्रीं ह्रीं श्रीं विजय-लक्ष्म्यै नमः',
    primaryMantra: 'ॐ श्रीं ह्रीं श्रीं विजय-लक्ष्म्यै नमः',
    primaryMantraEnglish: 'Om Shreem Hreem Shreem Vijaya-Lakshmyai Namah',
    benefit: 'Success in long-pending projects, breakthrough after years of effort, conversion of struggle into victory',
    bestDay: 'Tuesday + Vijayadashami specifically',
    signatureFestival: 'Vijayadashami (Dussehra) — culmination of Navratri, primary day for invoking',
    vrataPractice: 'Sahasranama recitation on Vijayadashami; complete pending tasks before Diwali following Vijayadashami',
    associatedTemple: 'Mahishasura Mardini shrines + Mysore Chamundeshwari (Vijaya is her gentler form)',
    storyOrigin: 'After Durga slew Mahishasura on Vijayadashami, she manifested as Vijaya Lakshmi — gentler form that grants the FRUITS of victory (not just the battle). Hence devotees invoke after any major effort to consolidate gains.',
  },
  {
    slug: 'vidya-lakshmi',
    number: 8,
    name: 'Vidya Lakshmi',
    sanskrit: 'विद्या लक्ष्मी',
    domain: 'Knowledge — academic learning, arts, sciences, dharmic wisdom',
    iconography: 'Four arms; palm-leaf scroll + pen, lotus, abhaya mudra; seated white lotus',
    vahana: 'Swan (sometimes shared with Saraswati)',
    color: 'White',
    numberOfHands: 4,
    attributes: ['Palm-leaf scroll (knowledge)', 'Pen / stylus', 'Lotus', 'Abhaya mudra'],
    beejaMantra: 'ॐ श्रीं ह्रीं श्रीं विद्या-लक्ष्म्यै नमः',
    primaryMantra: 'ॐ श्रीं ह्रीं श्रीं विद्या-लक्ष्म्यै नमः',
    primaryMantraEnglish: 'Om Shreem Hreem Shreem Vidya-Lakshmyai Namah',
    benefit: 'Excellence in studies, success in competitive exams, mastery of an art form, dharmic wisdom + spiritual study',
    bestDay: 'Wednesday (Budha-Vidya) + Friday',
    signatureFestival: 'Vasant Panchami (Saraswati-Vidya combined); Vijayadashami (Aksharabhyasa — children\'s first writing)',
    vrataPractice: 'Recite mantra before exam/study session; offer yellow flowers; donate books on Vasant Panchami',
    associatedTemple: 'Sharadamba Temple, Sringeri (Saraswati-Lakshmi unified form); Ashtalakshmi Chennai Vidya shrine',
    storyOrigin: 'When student-sage Kacha trained under Shukra to learn Sanjivani Vidya, his progress stalled. He invoked Vidya Lakshmi alongside Saraswati — both manifested together (showing wealth + knowledge are non-separable for the seeker). He mastered Sanjivani.',
  },
];

export const getAshtaLakshmiBySlug = (slug: string): AshtaLakshmi | undefined =>
  ASHTA_LAKSHMIS.find((l) => l.slug === slug);

export const ASHTA_LAKSHMI_SLUGS: string[] = ASHTA_LAKSHMIS.map((l) => l.slug);
