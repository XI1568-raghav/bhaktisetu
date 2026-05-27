// Hindu festival calendar — drives /festival/[slug] programmatic-SEO pages.
// Date approximations for 2026 (lunar calendar — exact tithis vary).
// Used both for landing pages and for the founder-tweet-draft agent calendar.

export interface FestivalInfo {
  slug: string;
  name: string;
  sanskrit: string;
  date2026: string; // ISO yyyy-mm-dd, approximate
  deity: string;
  deitySlug?: string; // links to /deity/[slug] when canonical match
  description: string;
  rituals: string[];
  pujasAvailable: string[]; // slug references — used to link to /pujas/[slug]
  fastingType: 'full' | 'partial' | 'none';
  significance: string;
}

export const FESTIVALS: FestivalInfo[] = [
  {
    slug: 'maha-shivratri',
    name: 'Maha Shivratri',
    sanskrit: 'महाशिवरात्रि',
    date2026: '2026-02-15',
    deity: 'Lord Shiva',
    deitySlug: 'shiva',
    description:
      'The Great Night of Shiva — observed on the 14th night of Phalguna Krishna Paksha. Devotees fast, perform Rudrabhishek, and chant ॐ नमः शिवाय through the night across four prahars.',
    rituals: [
      'Bilva patra offering',
      'Milk + honey + curd + ghee abhishek',
      'All-night jagran with mantra chanting',
      'Rudrabhishek puja',
      'Reading of Shiva Purana',
    ],
    pujasAvailable: ['rudrabhishek', 'maha-mrityunjaya'],
    fastingType: 'full',
    significance:
      'Marks the night Shiva performed the Tandava and married Parvati. Believed to absolve sins and grant moksha when observed with sincerity.',
  },
  {
    slug: 'holi',
    name: 'Holi',
    sanskrit: 'होली',
    date2026: '2026-03-04',
    deity: 'Krishna / Radha',
    deitySlug: 'krishna',
    description:
      'Festival of colours marking the triumph of good over evil and the arrival of spring. Holika Dahan on the eve, Rangwali Holi the day after.',
    rituals: [
      'Holika Dahan bonfire (eve)',
      'Color play with family + community',
      'Krishna-Radha temple visits',
      'Sweets distribution (gujiya, malpua)',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'Commemorates Prahlad rescue from Holika and the eternal love of Radha-Krishna. Symbolizes burning of ego and embracing universal brotherhood.',
  },
  {
    slug: 'ram-navami',
    name: 'Ram Navami',
    sanskrit: 'राम नवमी',
    date2026: '2026-03-27',
    deity: 'Lord Rama',
    deitySlug: 'rama',
    description:
      'Birth anniversary of Lord Rama — the seventh avatar of Vishnu. Observed on the 9th day of Chaitra Shukla Paksha with fasting, Ramayana recital, and bhajan kirtans.',
    rituals: [
      'Akhanda Ramayana path',
      'Fasting until noon (Ram\'s birth time)',
      'Bhajan kirtan at Ram mandirs',
      'Distribution of panakam (jaggery drink)',
    ],
    pujasAvailable: ['sundarkand-path', 'ramayana-path'],
    fastingType: 'partial',
    significance:
      'Birth of Maryada Purushottam Rama in Ayodhya. Especially significant after the 2024 Ram Mandir consecration.',
  },
  {
    slug: 'hanuman-jayanti',
    name: 'Hanuman Jayanti',
    sanskrit: 'हनुमान जयन्ती',
    date2026: '2026-04-12',
    deity: 'Lord Hanuman',
    deitySlug: 'hanuman',
    description:
      'Birth celebration of Hanuman ji. Observed on full moon of Chaitra. Devotees recite Hanuman Chalisa 108 times, offer sindoor and chola.',
    rituals: [
      'Sundarkand path',
      'Hanuman Chalisa 108 paath',
      'Sindoor + chola offering',
      'Boondi laddoo prasad',
    ],
    pujasAvailable: ['sundarkand-path', 'mangal-dosh'],
    fastingType: 'partial',
    significance:
      'Birth of the eternal devotee of Rama. Removes Shani and Mangal doshas, grants courage and strength.',
  },
  {
    slug: 'guru-purnima',
    name: 'Guru Purnima',
    sanskrit: 'गुरु पूर्णिमा',
    date2026: '2026-07-19',
    deity: 'Vyasa / Guru',
    description:
      'Honoring spiritual and academic teachers. Falls on the full moon of Ashadha. Marks the day Veda Vyasa was born and the day Buddha gave his first sermon.',
    rituals: [
      'Guru pujan with flowers + dakshina',
      'Recitation of Guru Stotra',
      'Visit to ashrams + math',
      'Vyasa puja',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'partial',
    significance:
      'Marks the unbroken guru-shishya parampara. Sadhakas formally accept gurus on this day.',
  },
  {
    slug: 'krishna-janmashtami',
    name: 'Krishna Janmashtami',
    sanskrit: 'कृष्ण जन्माष्टमी',
    date2026: '2026-09-04',
    deity: 'Lord Krishna',
    deitySlug: 'krishna',
    description:
      'Birth anniversary of Krishna — eighth avatar of Vishnu. Observed on the 8th day of Bhadrapada Krishna Paksha with midnight celebration, fasting, and Dahi Handi tradition.',
    rituals: [
      'Fasting until midnight (Krishna\'s birth)',
      'Bhagavad Gita path',
      'Bal Krishna abhishek with milk + honey',
      'Dahi Handi (Maharashtra)',
      'Midnight aarti at ISKCON mandirs',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'full',
    significance:
      'Krishna\'s birth in Mathura. The Bhagavad Gita giver, embodiment of divine love and leela.',
  },
  {
    slug: 'ganesh-chaturthi',
    name: 'Ganesh Chaturthi',
    sanskrit: 'गणेश चतुर्थी',
    date2026: '2026-09-15',
    deity: 'Lord Ganesha',
    deitySlug: 'ganesha',
    description:
      'Ten-day festival celebrating the arrival of Ganesha in homes and pandals. Begins on Bhadrapada Shukla Chaturthi, ends with Anant Chaturdashi visarjan.',
    rituals: [
      'Pranapratishtha (installation)',
      'Daily morning + evening aarti',
      'Modak + ladoo bhog',
      'Visarjan on day 1, 3, 5, 7, or 10',
    ],
    pujasAvailable: ['ganesh-puja'],
    fastingType: 'partial',
    significance:
      'Removes obstacles. Especially significant in Maharashtra after Lokmanya Tilak\'s revival in 1893.',
  },
  {
    slug: 'navaratri',
    name: 'Sharad Navaratri',
    sanskrit: 'शरद नवरात्रि',
    date2026: '2026-10-12',
    deity: 'Maa Durga',
    deitySlug: 'devi',
    description:
      'Nine nights of Devi worship in autumn. Begins on Ashwin Shukla Pratipada. Each day honors one of the nine forms of Durga (Nava Durga).',
    rituals: [
      'Ghatasthapana on day 1',
      'Daily Durga path',
      'Garba + dandiya raas (Gujarat)',
      'Kanya pujan on day 8/9',
      'Vijaya Dashami on day 10',
    ],
    pujasAvailable: ['durga-puja', 'navaratri-puja'],
    fastingType: 'full',
    significance:
      'Devi\'s victory over Mahishasura. Spiritual sadhana, social celebration, and seasonal transition.',
  },
  {
    slug: 'diwali',
    name: 'Diwali',
    sanskrit: 'दीपावली',
    date2026: '2026-11-08',
    deity: 'Maa Lakshmi',
    deitySlug: 'lakshmi',
    description:
      'Festival of lights — five-day celebration centered on Lakshmi puja. Marks Rama\'s return to Ayodhya and Lakshmi\'s emergence from samudra manthan.',
    rituals: [
      'Dhanteras shopping (gold, utensils)',
      'Lakshmi-Ganesh puja on amavasya night',
      'Diyas + rangoli',
      'Govardhan puja day 4',
      'Bhai dooj day 5',
    ],
    pujasAvailable: ['lakshmi-puja'],
    fastingType: 'none',
    significance:
      'Most important festival for prosperity. New beginnings — businesses open new account books.',
  },
  {
    slug: 'chhath-puja',
    name: 'Chhath Puja',
    sanskrit: 'छठ पूजा',
    date2026: '2026-11-15',
    deity: 'Surya / Chhathi Maiya',
    description:
      'Four-day festival of the Sun god. Most celebrated in Bihar, Jharkhand, eastern UP. Strict 36-hour nirjala fast culminating in arghya at sunrise.',
    rituals: [
      'Nahay Khay (day 1 ritual bath)',
      'Kharna (day 2 evening meal)',
      'Sandhya arghya at sunset (day 3)',
      'Usha arghya at sunrise (day 4)',
    ],
    pujasAvailable: ['surya-puja'],
    fastingType: 'full',
    significance:
      'Thanksgiving to Surya for sustaining life. Considered most physically demanding Hindu vrat.',
  },
];

export function getFestival(slug: string): FestivalInfo | undefined {
  return FESTIVALS.find((f) => f.slug === slug);
}

export function festivalSlugs(): string[] {
  return FESTIVALS.map((f) => f.slug);
}

export function nextFestival(today: Date = new Date()): FestivalInfo | undefined {
  const t = today.toISOString().slice(0, 10);
  return FESTIVALS.filter((f) => f.date2026 >= t).sort((a, b) =>
    a.date2026.localeCompare(b.date2026),
  )[0];
}
