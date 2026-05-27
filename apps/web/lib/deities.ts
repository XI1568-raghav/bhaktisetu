// Canonical deity dictionary for /deity/[slug] programmatic-SEO routes.
// Slug = lowercase English; deityKey = value used in PujaType.deity / Temple.deityPrimary
// in API filters (usually capitalised single word).

export interface DeityInfo {
  slug: string;
  name: string;
  sanskrit: string;
  deityKey: string; // value passed to API ?deity= filter
  consort?: string;
  description: string;
  popularPujas: string[]; // friendly puja names (for copy, not slugs)
  mantra: string;
  festival: string;
}

export const DEITIES: DeityInfo[] = [
  {
    slug: 'shiva',
    name: 'Lord Shiva',
    sanskrit: 'शिव',
    deityKey: 'Shiva',
    consort: 'Parvati',
    description:
      'The Destroyer and Transformer in the Trimurti. Worshipped at Jyotirlingas and Shiva temples across India. Devotees seek liberation (moksha), removal of obstacles, and inner peace.',
    popularPujas: ['Rudrabhishek', 'Maha Mrityunjaya Japa', 'Shiva Tandava Path'],
    mantra: 'ॐ नमः शिवाय',
    festival: 'Maha Shivratri',
  },
  {
    slug: 'vishnu',
    name: 'Lord Vishnu',
    sanskrit: 'विष्णु',
    deityKey: 'Vishnu',
    consort: 'Lakshmi',
    description:
      'The Preserver in the Trimurti. Worshipped through ten incarnations (Dashavatara) including Rama and Krishna. Devotees seek protection, prosperity, and dharma.',
    popularPujas: ['Satyanarayan Puja', 'Vishnu Sahasranama', 'Sundarkand Path'],
    mantra: 'ॐ नमो भगवते वासुदेवाय',
    festival: 'Vaikuntha Ekadashi',
  },
  {
    slug: 'ganesha',
    name: 'Lord Ganesha',
    sanskrit: 'गणेश',
    deityKey: 'Ganesha',
    description:
      'Remover of obstacles and Lord of beginnings. Invoked first in every Hindu ritual. Worshipped before exams, weddings, business launches, and new ventures.',
    popularPujas: ['Ganesh Puja', 'Sankashti Chaturthi', 'Vinayaka Vrat'],
    mantra: 'ॐ गं गणपतये नमः',
    festival: 'Ganesh Chaturthi',
  },
  {
    slug: 'devi',
    name: 'Maa Durga / Devi',
    sanskrit: 'देवी',
    deityKey: 'Durga',
    description:
      'The Divine Mother in her various forms — Durga, Kali, Lakshmi, Saraswati. Worshipped for strength, protection, prosperity, and wisdom. Central to Navaratri celebrations.',
    popularPujas: ['Durga Puja', 'Navaratri Puja', 'Lalita Sahasranama'],
    mantra: 'ॐ दुं दुर्गायै नमः',
    festival: 'Navaratri',
  },
  {
    slug: 'hanuman',
    name: 'Lord Hanuman',
    sanskrit: 'हनुमान्',
    deityKey: 'Hanuman',
    description:
      'The mighty devotee of Lord Rama, embodiment of strength, devotion, and courage. Worshipped on Tuesdays and Saturdays. Removes fear, planetary doshas, and grants strength.',
    popularPujas: ['Hanuman Chalisa Path', 'Sunderkand Path', 'Mangal Dosh Puja'],
    mantra: 'ॐ हं हनुमते नमः',
    festival: 'Hanuman Jayanti',
  },
  {
    slug: 'krishna',
    name: 'Lord Krishna',
    sanskrit: 'कृष्ण',
    deityKey: 'Krishna',
    consort: 'Radha',
    description:
      'Eighth avatar of Vishnu, teacher of the Bhagavad Gita, beloved of Radha. Worshipped for love, wisdom, and devotion. Central to Janmashtami celebrations.',
    popularPujas: ['Janmashtami Puja', 'Bhagavad Gita Path', 'Govinda Nama Sankirtan'],
    mantra: 'ॐ नमो भगवते वासुदेवाय',
    festival: 'Krishna Janmashtami',
  },
  {
    slug: 'rama',
    name: 'Lord Rama',
    sanskrit: 'राम',
    deityKey: 'Rama',
    consort: 'Sita',
    description:
      'Seventh avatar of Vishnu, the ideal king (Maryada Purushottam) and hero of the Ramayana. Worshipped for righteousness, family harmony, and dharma.',
    popularPujas: ['Ram Navami Puja', 'Ramayana Path', 'Sundarkand Path'],
    mantra: 'श्री राम जय राम जय जय राम',
    festival: 'Ram Navami',
  },
  {
    slug: 'lakshmi',
    name: 'Maa Lakshmi',
    sanskrit: 'लक्ष्मी',
    deityKey: 'Lakshmi',
    consort: 'Vishnu',
    description:
      'Goddess of wealth, prosperity, fortune, and beauty. Worshipped on Fridays, during Diwali, and for new business ventures. Devotees seek abundance and well-being.',
    popularPujas: ['Lakshmi Puja', 'Diwali Puja', 'Sri Suktam Path'],
    mantra: 'ॐ श्रीं महालक्ष्म्यै नमः',
    festival: 'Diwali',
  },
  {
    slug: 'saraswati',
    name: 'Maa Saraswati',
    sanskrit: 'सरस्वती',
    deityKey: 'Saraswati',
    description:
      'Goddess of knowledge, music, arts, and wisdom. Worshipped by students, artists, and scholars. Central to Basant Panchami and Vidyarambham ceremonies.',
    popularPujas: ['Saraswati Puja', 'Vidyarambham', 'Akshara Abhyasam'],
    mantra: 'ॐ ऐं सरस्वत्यै नमः',
    festival: 'Basant Panchami',
  },
];

export function getDeity(slug: string): DeityInfo | undefined {
  return DEITIES.find((d) => d.slug === slug);
}

export function deitySlugs(): string[] {
  return DEITIES.map((d) => d.slug);
}
