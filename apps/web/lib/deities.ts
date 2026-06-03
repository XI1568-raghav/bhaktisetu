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
  {
    slug: 'surya',
    name: 'Lord Surya',
    sanskrit: 'सूर्य',
    deityKey: 'Surya',
    description:
      'The Sun god, source of light, life, and health. Worshipped at sunrise via Surya Namaskar and Arghya. Central to Chhath Puja and Makar Sankranti. Devotees seek vitality, eyesight, and authority.',
    popularPujas: ['Chhath Puja', 'Surya Arghya', 'Aditya Hridayam Path'],
    mantra: 'ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः',
    festival: 'Chhath Puja',
  },
  {
    slug: 'kartikeya',
    name: 'Lord Kartikeya / Murugan',
    sanskrit: 'कार्तिकेय',
    deityKey: 'Kartikeya',
    description:
      'Son of Shiva and Parvati, commander of the deva army. Worshipped as Murugan in South India, Subramanya in Karnataka, and Skanda elsewhere. Patron of warriors and victory over evil.',
    popularPujas: ['Skanda Shashti Puja', 'Kavadi Puja', 'Vel Vel Muruga Bhajan'],
    mantra: 'ॐ शरवणभवाय नमः',
    festival: 'Skanda Shashti',
  },
  {
    slug: 'ayyappa',
    name: 'Lord Ayyappa',
    sanskrit: 'अय्यप्प',
    deityKey: 'Ayyappa',
    description:
      'Son of Shiva and Mohini (Vishnu), Lord of Sabarimala. Worshipped through the 41-day Mandala vrata involving celibacy, black dress, and pilgrimage. Devotees address each other as Swami.',
    popularPujas: ['Mandala Vrata', 'Padi Puja', 'Harivarasanam Recitation'],
    mantra: 'स्वामिये शरणम् अय्यप्पा',
    festival: 'Makaravilakku',
  },
  {
    slug: 'narasimha',
    name: 'Lord Narasimha',
    sanskrit: 'नरसिंह',
    deityKey: 'Narasimha',
    description:
      'Fourth avatar of Vishnu, the man-lion who slew Hiranyakashipu to protect devotee Prahlada. Worshipped for protection from enemies, ugra-shanti (calming fierce energy), and removing fear.',
    popularPujas: ['Narasimha Jayanti Puja', 'Narasimha Kavacham Path', 'Lakshmi-Narasimha Homa'],
    mantra: 'ॐ उग्रं वीरं महाविष्णुं ज्वलन्तं सर्वतोमुखम्',
    festival: 'Narasimha Jayanti',
  },
  {
    slug: 'jagannath',
    name: 'Lord Jagannath',
    sanskrit: 'जगन्नाथ',
    deityKey: 'Jagannath',
    description:
      'Lord of the Universe, form of Vishnu/Krishna worshipped with siblings Balabhadra and Subhadra at Puri Dham. Famed for the annual Ratha Yatra where devotees of all castes touch the chariot ropes.',
    popularPujas: ['Ratha Yatra', 'Snana Yatra', 'Mahaprasad Bhog'],
    mantra: 'ॐ जगन्नाथाय नमः',
    festival: 'Ratha Yatra',
  },
  {
    slug: 'brahma',
    name: 'Lord Brahma',
    sanskrit: 'ब्रह्मा',
    deityKey: 'Brahma',
    consort: 'Saraswati',
    description:
      'The Creator in the Trimurti. Rarely worshipped in dedicated temples — the principal one is at Pushkar, Rajasthan. Invoked at Vedic homas, sandhyavandanam, and creative undertakings.',
    popularPujas: ['Brahma Puja at Pushkar', 'Brahma Yagna', 'Sandhyavandanam'],
    mantra: 'ॐ ब्रह्मणे नमः',
    festival: 'Kartik Purnima (Pushkar Mela)',
  },
  {
    slug: 'kali',
    name: 'Maa Kali',
    sanskrit: 'काली',
    deityKey: 'Kali',
    description:
      'Fierce form of Devi, destroyer of evil and time itself. Worshipped especially in Bengal (Kalighat, Dakshineswar) and at Shakti Peeths. Central to Kali Puja on Diwali night and Tantric sadhana.',
    popularPujas: ['Kali Puja (Diwali night)', 'Dakshina Kali Homa', 'Karpuradi Stotra Path'],
    mantra: 'ॐ क्रीं कालिकायै नमः',
    festival: 'Kali Puja',
  },
  {
    slug: 'shirdi-sai-baba',
    name: 'Shirdi Sai Baba',
    sanskrit: 'श्री साईं बाबा',
    deityKey: 'SaiBaba',
    description:
      'Revered 19th-century saint of Shirdi, Maharashtra, worshipped as a divine teacher transcending Hindu-Muslim boundaries. Devotees seek faith (shraddha) and patience (saburi). Thursdays are sacred.',
    popularPujas: ['Sai Sandhya Aarti', 'Sai Satcharitra Path', 'Thursday Sai Vrat'],
    mantra: 'ॐ साईं श्री साईं जय जय साईं',
    festival: 'Guru Purnima · Vijayadashami (Sai Samadhi)',
  },
  {
    slug: 'radha',
    name: 'Radha',
    sanskrit: 'राधा',
    deityKey: 'radha',
    consort: 'Krishna',
    description: "Radha is the eternal beloved of Krishna and the embodiment of pure, selfless devotion (bhakti). Worshipped chiefly in Vrindavan and Barsana, she represents the soul's longing for the Divine.",
    popularPujas: ['Radha Ashtami Puja', 'Radha-Krishna Abhishek', 'Yugal Sarkar Aarti', 'Raas Leela Seva', 'Tulsi Archana'],
    mantra: 'ॐ ह्रीं श्रीराधायै नमः (Om Hreem Shri Radhayai Namah)',
    festival: 'Radha Ashtami',
  },
  {
    slug: 'parvati',
    name: 'Parvati',
    sanskrit: 'पार्वती',
    deityKey: 'parvati',
    consort: 'Shiva',
    description: 'Parvati, daughter of the Himalayas and consort of Shiva, is the gentle form of Adi Shakti and Mother of the Universe. She is venerated as Gauri, Uma, and Mata Devi, granting marital harmony and inner strength.',
    popularPujas: ['Teej Vrat Puja', 'Gauri Puja', 'Mangala Gauri Vrat', 'Parvati Abhishek', 'Shiv-Parvati Vivah'],
    mantra: 'ॐ ह्रीं पार्वत्यै नमः (Om Hreem Parvatyai Namah)',
    festival: 'Hartalika Teej',
  },
  {
    slug: 'sita',
    name: 'Sita',
    sanskrit: 'सीता',
    deityKey: 'sita',
    consort: 'Ram',
    description: 'Sita, also known as Janaki and Vaidehi, is the divine consort of Lord Ram and an incarnation of Lakshmi. Revered as the ideal of purity, patience, and dharmic womanhood, she is worshipped across Janakpur, Ayodhya, and Sitamarhi.',
    popularPujas: ['Sita Navami Puja', 'Sita-Ram Vivah Utsav', 'Janaki Jayanti Aarti', 'Ram-Sita Abhishek', 'Vivah Panchami Seva'],
    mantra: 'ॐ श्री सीतायै नमः (Om Shri Sitayai Namah)',
    festival: 'Sita Navami',
  },
  {
    slug: 'annapurna',
    name: 'Annapurna',
    sanskrit: 'अन्नपूर्णा',
    deityKey: 'annapurna',
    consort: 'Shiva',
    description: 'Annapurna is the goddess of nourishment and abundance, a benevolent form of Parvati who feeds all beings. Her principal shrine stands in Kashi (Varanasi), where she is said to grant that no devotee shall ever go hungry.',
    popularPujas: ['Annapurna Jayanti Puja', 'Annakut Seva', 'Akshaya Patra Abhishek', 'Annadanam Sankalpa', 'Kashi Annapurna Aarti'],
    mantra: 'ॐ ह्रीं श्रीं क्लीं अन्नपूर्णायै नमः (Om Hreem Shreem Kleem Annapurnayai Namah)',
    festival: 'Annapurna Jayanti',
  },
  {
    slug: 'shanidev',
    name: 'Shani Dev',
    sanskrit: 'शनिदेव',
    deityKey: 'shani',
    description: 'Shani Dev, son of Surya and lord of the planet Saturn, is the cosmic dispenser of karmic justice. Worshipped on Saturdays at Shingnapur and Tirunallar, he relieves the afflictions of Sade Sati, Dhaiya, and karmic burdens.',
    popularPujas: ['Shani Shanti Puja', 'Sade Sati Nivaran Puja', 'Shani Tail Abhishek', 'Shani Jayanti Havan', 'Navagraha Shanti'],
    mantra: 'ॐ शं शनैश्चराय नमः (Om Sham Shanaishcharaya Namah)',
    festival: 'Shani Jayanti',
  },
  {
    slug: 'chandra',
    name: 'Chandra',
    sanskrit: 'चन्द्र',
    deityKey: 'chandra',
    description: 'Chandra, the Moon deity of the Navagraha pantheon, governs the mind, emotions, and lunar cycles. Worshipped on Mondays and full-moon nights, he bestows mental peace, fertility, and relief from lunar afflictions in the horoscope.',
    popularPujas: ['Purnima Vrat Puja', 'Chandra Darshan Aarti', 'Somvar Vrat', 'Karwa Chauth Puja', 'Chandra Graha Shanti'],
    mantra: 'ॐ सों सोमाय नमः (Om Som Somaya Namah)',
    festival: 'Sharad Purnima',
  },
  {
    slug: 'mangala',
    name: 'Mangala',
    sanskrit: 'मङ्गल',
    deityKey: 'mangala',
    description: 'Mangala, the deity of the planet Mars, is the bestower of courage, vigor, and victory over enemies. Worshipped on Tuesdays, he is invoked to remedy Mangala Dosha (Manglik affliction) and to bless marital and martial undertakings.',
    popularPujas: ['Mangala Dosha Nivaran Puja', 'Mangalwar Vrat', 'Kuja Shanti Havan', 'Angaraka Chaturthi Puja', 'Navagraha Shanti'],
    mantra: 'ॐ क्रां क्रीं क्रौं सः भौमाय नमः (Om Kraam Kreem Kraum Sah Bhaumaya Namah)',
    festival: 'Angaraka Chaturthi',
  },
  {
    slug: 'rahu-ketu',
    name: 'Rahu & Ketu',
    sanskrit: 'राहु केतु',
    deityKey: 'rahuketu',
    description: 'Rahu and Ketu are the shadow planets and lunar nodes of Vedic astrology, governing karmic destiny and sudden upheavals. Worshipped together at Kalahasti and Naganatha temples, they are propitiated to dissolve Kalsarpa Dosha and ancestral karmic knots.',
    popularPujas: ['Kalsarpa Dosha Nivaran Puja', 'Rahu-Ketu Shanti Havan', 'Sarpa Dosha Parihara', 'Nagathambiran Abhishek', 'Tarpanam Seva'],
    mantra: 'ॐ रां राहवे नमः ॐ कें केतवे नमः (Om Raam Rahave Namah · Om Kem Ketave Namah)',
    festival: 'Naga Panchami',
  },
  {
    slug: 'dattatreya',
    name: 'Lord Dattatreya',
    sanskrit: 'दत्तात्रेय',
    deityKey: 'Dattatreya',
    consort: 'Anagha Devi',
    description: 'Lord Dattatreya is the combined incarnation of the Trimurti - Brahma, Vishnu, and Mahesh - born to sage Atri and Anasuya. Depicted with three heads, six hands, and four dogs symbolising the Vedas, he is the supreme Guru of yogis. Worshipped beneath the sacred Audumbara tree, he grants wisdom, detachment, and liberation to sincere devotees.',
    popularPujas: ['Datta Jayanti Puja', 'Guru Charitra Parayana', 'Audumbara Vriksha Archana'],
    mantra: 'ॐ द्रां दत्तात्रेयाय नमः',
    festival: 'Datta Jayanti',
  },
  {
    slug: 'varaha',
    name: 'Lord Varaha',
    sanskrit: 'वराह',
    deityKey: 'Varaha',
    consort: 'Bhudevi',
    description: 'Lord Varaha is the third avatar of Vishnu, who assumed the form of a mighty boar to rescue Bhudevi, the Earth goddess, from the cosmic waters where the demon Hiranyaksha had submerged her. Lifting the Earth on his tusks, Varaha restored cosmic balance and dharma. He symbolises divine intervention, strength, and the protective grace of Vishnu over all creation.',
    popularPujas: ['Varaha Jayanti Puja', 'Bhudevi Sametha Varaha Archana', 'Yajna Varaha Homa'],
    mantra: 'ॐ नमो भगवते वराहाय',
    festival: 'Varaha Jayanti',
  },
  {
    slug: 'vamana',
    name: 'Lord Vamana',
    sanskrit: 'वामन',
    deityKey: 'Vamana',
    description: "Lord Vamana is the fifth avatar of Vishnu, who incarnated as a brahmin dwarf to humble the benevolent yet proud asura king Bali. Requesting only three paces of land, Vamana expanded into the cosmic Trivikrama form, covering earth and heaven in two strides and placing his third foot on Bali's head, sending him to the netherworld while granting him immortality and devotion.",
    popularPujas: ['Vamana Jayanti Puja', 'Trivikrama Archana', 'Onam Bali Pratipada Vrata'],
    mantra: 'ॐ नमो भगवते वामनाय',
    festival: 'Vamana Jayanti',
  },
  {
    slug: 'parashurama',
    name: 'Lord Parashurama',
    sanskrit: 'परशुराम',
    deityKey: 'Parashurama',
    consort: 'Dharani Devi',
    description: 'Lord Parashurama is the sixth avatar of Vishnu, the axe-wielding warrior-sage born to Jamadagni and Renuka. A unique blend of Brahmin wisdom and Kshatriya might, he rid the earth of corrupt rulers twenty-one times to restore dharma. As one of the seven Chiranjeevis, he is believed to live eternally in the Mahendragiri mountains, awaiting to mentor Kalki in the future.',
    popularPujas: ['Parashurama Jayanti Puja', 'Akshaya Tritiya Archana', 'Renuka Mata Homa'],
    mantra: 'ॐ श्री परशुरामाय नमः',
    festival: 'Parashurama Jayanti',
  },
  {
    slug: 'balarama',
    name: 'Lord Balarama',
    sanskrit: 'बलराम',
    deityKey: 'Balarama',
    consort: 'Revati',
    description: 'Lord Balarama is the elder brother of Krishna and an incarnation of Adishesha, the cosmic serpent. Known as Halayudha, the bearer of the plough, and armed with a mighty mace, he embodies immense strength, agriculture, and righteous power. Fair-complexioned and clad in blue, he is celebrated as the divine companion of Krishna in the Vrindavan lilas and revered as a guardian of dharma.',
    popularPujas: ['Balarama Jayanti Puja', 'Hala Shashti Vrata', 'Revati Sametha Balarama Archana'],
    mantra: 'ॐ नमो भगवते बलरामाय',
    festival: 'Balarama Jayanti',
  },
];

export function getDeity(slug: string): DeityInfo | undefined {
  return DEITIES.find((d) => d.slug === slug);
}

export function deitySlugs(): string[] {
  return DEITIES.map((d) => d.slug);
}
