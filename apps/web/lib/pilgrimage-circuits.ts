// Pilgrimage circuit programmatic-SEO data. Each circuit is a multi-temple
// itinerary (Char Dham = 4 temples, Jyotirlinga = 12 temples, etc.). Drives
// search traffic for "char dham yatra package", "jyotirlinga tour" — high
// commercial-intent queries that route to yatra inquiry form.
//
// 8 canonical circuits cover the highest-search-volume Hindu pilgrimages.

export interface CircuitStop {
  name: string;       // Display name
  deity: string;      // Primary deity
  state: string;      // Indian state
  templeSlug?: string; // Link to /temples/{slug} if we have a detail page
  bestMonths: string;  // e.g. "Apr-Oct"
}

export interface PilgrimageCircuit {
  slug: string;
  name: string;          // Display title
  sanskritName?: string;  // Devanagari
  shortDesc: string;     // ≤140 chars meta description
  longDesc: string;      // 400-word body — SEO + visitor info
  region: 'north' | 'south' | 'east' | 'west' | 'himalayas' | 'pan-india';
  totalDays: { min: number; max: number };
  bestSeason: string;
  startingFromInr: number;  // base package starting price
  difficulty: 'easy' | 'moderate' | 'challenging';
  stops: CircuitStop[];
  spiritualSignificance: string;
  practicalTips: string[];   // 4-6 bullet tips
  relatedYatra?: string;     // slug of /yatra/{slug} for full package
}

export const CIRCUITS: PilgrimageCircuit[] = [
  {
    slug: 'char-dham',
    name: 'Char Dham Yatra',
    sanskritName: 'चार धाम यात्रा',
    shortDesc: 'The four sacred abodes in the Himalayas — Yamunotri, Gangotri, Kedarnath, Badrinath. The most revered pilgrimage in Hinduism.',
    longDesc: `The Chota Char Dham circuit in Uttarakhand is considered the holiest pilgrimage every Hindu aspires to complete in their lifetime. The clockwise circuit begins at Yamunotri (source of river Yamuna), proceeds to Gangotri (source of Ganga), then Kedarnath (Lord Shiva — one of the 12 Jyotirlingas), and concludes at Badrinath (Lord Vishnu — one of the 108 Divya Desams). The yatra is open only April-October due to Himalayan snow; the temples close from Diwali to Akshaya Tritiya. Travel is mix of vehicle + helicopter + pony/palki + trek — the Kedarnath leg alone requires a 16km trek (or helicopter). Helicopter packages compress 12 days to 2-3 days. Online registration on uttarakhandtourism.gov.in is mandatory since 2022 to control overcrowding. The deeper, far harder Char Dham of Adi Shankaracharya — Badrinath, Dwarka, Jagannath Puri, Rameswaram — spans pan-India and takes 3-4 weeks.`,
    region: 'himalayas',
    totalDays: { min: 10, max: 14 },
    bestSeason: 'May-June (post-snow), Sept-Oct (post-monsoon)',
    startingFromInr: 28000,
    difficulty: 'challenging',
    stops: [
      { name: 'Yamunotri', deity: 'Goddess Yamuna', state: 'Uttarakhand', bestMonths: 'May-Oct' },
      { name: 'Gangotri', deity: 'Goddess Ganga', state: 'Uttarakhand', bestMonths: 'May-Oct' },
      { name: 'Kedarnath', deity: 'Lord Shiva (Jyotirlinga)', state: 'Uttarakhand', templeSlug: 'kedarnath', bestMonths: 'May-Oct' },
      { name: 'Badrinath', deity: 'Lord Vishnu', state: 'Uttarakhand', templeSlug: 'badrinath', bestMonths: 'May-Oct' },
    ],
    spiritualSignificance: 'Completing Char Dham is believed to wash away all sins and grant moksha (liberation). The clockwise order follows ancient Vedic tradition.',
    practicalTips: [
      'Register online before travel — uttarakhandtourism.gov.in mandatory since 2022',
      'Carry warm clothing even in May — Himalayan nights are cold',
      'Helicopter packages save 8+ days but cost ₹80,000-1,50,000',
      'Medical checkup recommended for travelers above 60 or with cardiac conditions',
      'Avoid June-Aug monsoon — landslides frequently block roads',
      'Kedarnath trek: alternative ponies (₹3000-5000), palki (₹6000+), helicopter (₹7000-8000 one-way)',
    ],
    relatedYatra: 'char-dham',
  },
  {
    slug: '12-jyotirlinga',
    name: '12 Jyotirlinga Yatra',
    sanskritName: 'द्वादश ज्योतिर्लिंग यात्रा',
    shortDesc: 'The 12 sacred Shiva Jyotirlinga temples across India — from Somnath in Gujarat to Rameshwaram in Tamil Nadu.',
    longDesc: `The 12 Jyotirlingas are the most revered shrines of Lord Shiva, where He is said to have manifested as a column of light (jyoti + linga). The Stotra by Adi Shankaracharya lists them in canonical order: Somnath (Gujarat), Mallikarjuna (Andhra Pradesh), Mahakaleshwar (Madhya Pradesh), Omkareshwar (Madhya Pradesh), Kedarnath (Uttarakhand), Bhimashankar (Maharashtra), Kashi Vishwanath (UP), Trimbakeshwar (Maharashtra), Vaidyanath (Jharkhand), Nageshwar (Gujarat), Rameshwaram (Tamil Nadu), Grishneshwar (Maharashtra). A full circuit takes 18-25 days and spans 12,000+ km. Packaged tours typically use private bus + train + flight combinations. Devotees often complete the yatra over multiple trips spread across years. The recommended sequence groups temples by geography — Western (4), Central (3), Northern (2), Southern (2), Eastern (1) — minimizing backtracking.`,
    region: 'pan-india',
    totalDays: { min: 18, max: 25 },
    bestSeason: 'Oct-March (avoid summer + monsoon)',
    startingFromInr: 65000,
    difficulty: 'moderate',
    stops: [
      { name: 'Somnath', deity: 'Lord Shiva', state: 'Gujarat', templeSlug: 'somnath', bestMonths: 'Oct-Mar' },
      { name: 'Mallikarjuna', deity: 'Lord Shiva', state: 'Andhra Pradesh', bestMonths: 'Oct-Mar' },
      { name: 'Mahakaleshwar', deity: 'Lord Shiva', state: 'Madhya Pradesh', templeSlug: 'mahakaleshwar', bestMonths: 'Oct-Mar' },
      { name: 'Omkareshwar', deity: 'Lord Shiva', state: 'Madhya Pradesh', bestMonths: 'Oct-Mar' },
      { name: 'Kedarnath', deity: 'Lord Shiva', state: 'Uttarakhand', templeSlug: 'kedarnath', bestMonths: 'May-Oct' },
      { name: 'Bhimashankar', deity: 'Lord Shiva', state: 'Maharashtra', bestMonths: 'Oct-Mar' },
      { name: 'Kashi Vishwanath', deity: 'Lord Shiva', state: 'Uttar Pradesh', templeSlug: 'kashi-vishwanath', bestMonths: 'Oct-Mar' },
      { name: 'Trimbakeshwar', deity: 'Lord Shiva', state: 'Maharashtra', bestMonths: 'Oct-Mar' },
      { name: 'Vaidyanath', deity: 'Lord Shiva', state: 'Jharkhand', bestMonths: 'Oct-Mar' },
      { name: 'Nageshwar', deity: 'Lord Shiva', state: 'Gujarat', bestMonths: 'Oct-Mar' },
      { name: 'Rameshwaram', deity: 'Lord Shiva', state: 'Tamil Nadu', templeSlug: 'rameshwaram', bestMonths: 'Oct-Feb' },
      { name: 'Grishneshwar', deity: 'Lord Shiva', state: 'Maharashtra', bestMonths: 'Oct-Mar' },
    ],
    spiritualSignificance: 'Reciting the Dwadasha Jyotirlinga Stotra after darshan is said to grant moksha and liberation from rebirth.',
    practicalTips: [
      'Split into 2-3 trips by region — Western (4), Central (3), South (2), North (2), East (1)',
      'Book Kashi Vishwanath sugam darshan online in advance — queues are 4-6h otherwise',
      'Rameshwaram + Kedarnath are weather-locked; plan circuit accordingly',
      'Most packages bundle Mahakaleshwar Bhasma Aarti (4am) — book days in advance',
      'Carry photo ID at all temples — security checks are strict post-2008',
    ],
    relatedYatra: 'jyotirlinga-yatra',
  },
  {
    slug: 'do-dham',
    name: 'Do Dham Yatra (Kedarnath + Badrinath)',
    sanskritName: 'दो धाम यात्रा',
    shortDesc: 'Compressed Himalayan pilgrimage — Kedarnath + Badrinath only. 5-7 days, ideal for short window travelers.',
    longDesc: `Do Dham combines the two most revered of the four Char Dham shrines — Kedarnath (Shiva Jyotirlinga) and Badrinath (Vishnu Divya Desam). Skipping Yamunotri + Gangotri compresses the yatra from 12 days to 5-7. Most pilgrims with limited PTO opt for Do Dham, sometimes adding Hemkund Sahib for Sikh devotees. The route: Haridwar → Guptkashi (overnight) → Kedarnath (helicopter or 16km trek) → Joshimath → Badrinath → Haridwar. Helicopter packages compress further to 2-3 days but at 3-5× cost. Same online registration applies. Best paired with brief Rishikesh visit on return — Ganga aarti at Triveni Ghat is non-negotiable for first-time visitors.`,
    region: 'himalayas',
    totalDays: { min: 5, max: 7 },
    bestSeason: 'May-June, Sept-Oct',
    startingFromInr: 18000,
    difficulty: 'moderate',
    stops: [
      { name: 'Kedarnath', deity: 'Lord Shiva (Jyotirlinga)', state: 'Uttarakhand', templeSlug: 'kedarnath', bestMonths: 'May-Oct' },
      { name: 'Badrinath', deity: 'Lord Vishnu', state: 'Uttarakhand', templeSlug: 'badrinath', bestMonths: 'May-Oct' },
    ],
    spiritualSignificance: 'Worshipping Shiva at Kedarnath and Vishnu at Badrinath in a single yatra completes the Hari-Hara devotional cycle.',
    practicalTips: [
      'Helicopter from Phata/Sersi/Sitapur to Kedarnath — book on heliyatra.irctc.co.in',
      'Take altitude sickness medication (Diamox) 1 day before travel',
      'Carry packed lunch — Kedarnath trek has limited clean food options',
      'Photography prohibited inside both temples',
      'Combine with Auli skiing (winter Mar) or Valley of Flowers (Jul-Aug, separate trip)',
    ],
    relatedYatra: 'do-dham',
  },
  {
    slug: 'shakti-peeth',
    name: '51 Shakti Peethas',
    sanskritName: 'एकपञ्चाशत् शक्तिपीठ',
    shortDesc: 'Sacred temples of Goddess Shakti — where parts of Sati Devi fell. Spans India, Pakistan, Bangladesh, Nepal, Sri Lanka.',
    longDesc: `The 51 Shakti Peethas are sites where parts of Goddess Sati's body fell when Lord Vishnu dismembered her with the Sudarshana Chakra to release Shiva from his grief. The list varies between Devi Bhagavata Purana (108), Devi Gita (51), and other texts. The accessible 42 within India include Kamakhya (Assam, yoni), Kalighat (West Bengal, toes), Vindhyavasini (UP), Jwala Devi (HP, tongue manifesting as flame), Naina Devi (HP, eyes), Mansa Devi (Haridwar). Full international circuit (Hingula in Pakistan, Sugandha in Bangladesh, Guhyeshwari in Nepal, Indrakshi in Sri Lanka) is geopolitically complex and rarely undertaken. Indian-only circuit takes 30-40 days. Most pilgrims complete it over a lifetime as 3-4 regional clusters.`,
    region: 'pan-india',
    totalDays: { min: 30, max: 45 },
    bestSeason: 'Oct-March',
    startingFromInr: 95000,
    difficulty: 'challenging',
    stops: [
      { name: 'Kamakhya', deity: 'Goddess Kamakhya', state: 'Assam', bestMonths: 'Oct-Mar' },
      { name: 'Kalighat', deity: 'Goddess Kali', state: 'West Bengal', bestMonths: 'Oct-Mar' },
      { name: 'Vindhyavasini', deity: 'Goddess Vindhyavasini', state: 'Uttar Pradesh', bestMonths: 'Oct-Mar' },
      { name: 'Jwala Devi', deity: 'Goddess Jwala', state: 'Himachal Pradesh', bestMonths: 'Mar-Oct' },
      { name: 'Naina Devi', deity: 'Goddess Naina', state: 'Himachal Pradesh', bestMonths: 'Mar-Oct' },
      { name: 'Mansa Devi (Haridwar)', deity: 'Goddess Mansa', state: 'Uttarakhand', bestMonths: 'Oct-Mar' },
    ],
    spiritualSignificance: 'Each peetha grants a specific boon — Kamakhya for fertility, Jwala for prosperity, Kalighat for protection.',
    practicalTips: [
      'Navratri (Mar-Apr + Sept-Oct) is most auspicious but extremely crowded',
      'Kamakhya Ambubachi Mela in June is unique — temple closed 3 days',
      'Group regional clusters — North, East, South, Central — 3-4 trips total',
      'Many peethas are inside larger temples — confirm exact location in advance',
    ],
    relatedYatra: 'shakti-peeth',
  },
  {
    slug: 'pancha-bhoota',
    name: 'Pancha Bhoota Sthalam',
    sanskritName: 'पञ्चभूत स्थलम्',
    shortDesc: 'Five Shiva temples representing the five elements — earth, water, fire, air, space. Concentrated in South India.',
    longDesc: `The Pancha Bhoota Sthalams are five Shiva temples in South India where the lingam represents the five great elements (Pancha Mahabhuta): earth at Ekambareshwarar (Kanchipuram), water at Jambukeshwarar (Thiruvanaikaval), fire at Arunachaleshwar (Tiruvannamalai), air at Sri Kalahasti (Chittoor), and space (akasha) at Thillai Natarajar (Chidambaram). Completing all five in correct order — earth → water → fire → air → space — is considered the most refined Shiva sadhana per Saiva Siddhanta tradition. The circuit covers 800-1000km, takes 5-7 days, and is best done Oct-Feb. Thillai Chidambaram contains the famous Chidambara Rahasyam (an empty space behind a curtain representing the formless Brahman). Arunachala Karthigai Deepam (Nov-Dec) — a giant flame atop the hill — draws millions.`,
    region: 'south',
    totalDays: { min: 5, max: 7 },
    bestSeason: 'Oct-Feb',
    startingFromInr: 22000,
    difficulty: 'easy',
    stops: [
      { name: 'Ekambareshwarar (Earth)', deity: 'Lord Shiva — Prithvi linga', state: 'Tamil Nadu', bestMonths: 'Oct-Feb' },
      { name: 'Jambukeshwarar (Water)', deity: 'Lord Shiva — Appu linga', state: 'Tamil Nadu', bestMonths: 'Oct-Feb' },
      { name: 'Arunachaleshwar (Fire)', deity: 'Lord Shiva — Agni linga', state: 'Tamil Nadu', bestMonths: 'Oct-Feb' },
      { name: 'Sri Kalahasti (Air)', deity: 'Lord Shiva — Vayu linga', state: 'Andhra Pradesh', bestMonths: 'Oct-Feb' },
      { name: 'Thillai Natarajar (Space)', deity: 'Lord Shiva — Akasha linga', state: 'Tamil Nadu', bestMonths: 'Oct-Feb' },
    ],
    spiritualSignificance: 'Completing Pancha Bhoota Sthalam in correct elemental order is held to grant darshan of Shiva in His formless aspect.',
    practicalTips: [
      'Plan around Karthigai Deepam (Nov-Dec) at Arunachala if possible',
      'Sri Kalahasti Rahu-Ketu pujas attract long queues — book online slot',
      'Chidambaram darshan timings vary — temple closes 12-4pm',
      'Hire a single car+driver for full circuit — saves 30% vs separate cabs',
    ],
  },
  {
    slug: 'ashta-vinayak',
    name: 'Ashta Vinayak Yatra',
    sanskritName: 'अष्टविनायक यात्रा',
    shortDesc: 'Eight sacred Ganesh temples in Maharashtra — a single circuit completing Ganesha sadhana per the Ganesha Purana.',
    longDesc: `The Ashta Vinayak circuit comprises eight ancient Ganesh temples in Maharashtra, all swayambhu (self-manifested) idols rather than installed murtis. Per the Ganesha Purana, completing the yatra in canonical order — Morgaon → Siddhatek → Pali → Mahad → Theur → Lenyadri → Ozar → Ranjangaon → return to Morgaon — bestows the eight siddhis. The circuit is compact (650km, 3 days), centered around Pune. Most temples have early morning Mangal Aarti (4-5am); Sankashti Chaturthi (monthly) is the most auspicious day for darshan. Many travel companies offer "1.5 day" packages departing Pune Friday night, returning Sunday evening. Combine with Shirdi Sai Baba (300km from Morgaon) for a 5-day spiritual circuit.`,
    region: 'west',
    totalDays: { min: 3, max: 4 },
    bestSeason: 'Year-round (avoid Jul-Aug monsoon)',
    startingFromInr: 8500,
    difficulty: 'easy',
    stops: [
      { name: 'Morgaon (Mayureshwar)', deity: 'Ganesha (1st)', state: 'Maharashtra', bestMonths: 'Year-round' },
      { name: 'Siddhatek (Siddhivinayak)', deity: 'Ganesha (2nd)', state: 'Maharashtra', bestMonths: 'Year-round' },
      { name: 'Pali (Ballaleshwar)', deity: 'Ganesha (3rd)', state: 'Maharashtra', bestMonths: 'Year-round' },
      { name: 'Mahad (Varadavinayak)', deity: 'Ganesha (4th)', state: 'Maharashtra', bestMonths: 'Year-round' },
      { name: 'Theur (Chintamani)', deity: 'Ganesha (5th)', state: 'Maharashtra', bestMonths: 'Year-round' },
      { name: 'Lenyadri (Girijatmaj)', deity: 'Ganesha (6th)', state: 'Maharashtra', bestMonths: 'Year-round' },
      { name: 'Ozar (Vighneshwar)', deity: 'Ganesha (7th)', state: 'Maharashtra', bestMonths: 'Year-round' },
      { name: 'Ranjangaon (Mahaganapati)', deity: 'Ganesha (8th)', state: 'Maharashtra', bestMonths: 'Year-round' },
    ],
    spiritualSignificance: 'Completing the circuit + return to Morgaon (the 9th darshan of the 1st temple) is held to grant the Ashta Siddhi.',
    practicalTips: [
      'Sankashti Chaturthi (monthly) most auspicious — book ahead',
      'Morgaon → Siddhatek requires Bhima river crossing by boat (15min)',
      'Lenyadri is a cave temple — 300+ steps; carry water',
      'Combine with Shirdi (300km) for 5-day spiritual road trip',
    ],
  },
  {
    slug: 'sapta-puri',
    name: 'Sapta Puri (7 Sacred Cities)',
    sanskritName: 'सप्तपुरी',
    shortDesc: 'The seven holiest cities of Hinduism — Ayodhya, Mathura, Haridwar, Kashi, Kanchi, Ujjain, Dwarka.',
    longDesc: `Per the Garuda Purana, the Sapta Puri are seven cities considered moksha-dayini (giver of liberation): Ayodhya (Lord Rama's birthplace), Mathura (Lord Krishna's birthplace), Haridwar (Ganga gateway), Kashi/Varanasi (Lord Shiva's city), Kanchipuram (Devi + Vishnu), Ujjain (Mahakaleshwar Jyotirlinga + Kumbha Mela site), and Dwarka (Lord Krishna's kingdom). Dying or being cremated in any of these cities is believed to grant moksha. The full circuit covers 6,000+ km across 6 states and takes 18-22 days. Most pilgrims complete it as 3-4 regional trips. Key timings: Ayodhya Ram Navami (Mar-Apr) draws 50 lakh pilgrims, Kashi during Dev Deepawali (Nov), Ujjain Simhastha Kumbha (every 12 years, next 2028). Pair with adjacent shrines — Mathura with Vrindavan + Govardhan, Dwarka with Bet Dwarka + Nageshwar Jyotirlinga, Kashi with Sarnath + Allahabad.`,
    region: 'pan-india',
    totalDays: { min: 18, max: 22 },
    bestSeason: 'Oct-March',
    startingFromInr: 48000,
    difficulty: 'moderate',
    stops: [
      { name: 'Ayodhya', deity: 'Lord Rama', state: 'Uttar Pradesh', bestMonths: 'Oct-Mar' },
      { name: 'Mathura', deity: 'Lord Krishna', state: 'Uttar Pradesh', bestMonths: 'Oct-Mar' },
      { name: 'Haridwar', deity: 'Ganga', state: 'Uttarakhand', bestMonths: 'Oct-Mar' },
      { name: 'Kashi (Varanasi)', deity: 'Lord Shiva', state: 'Uttar Pradesh', templeSlug: 'kashi-vishwanath', bestMonths: 'Oct-Mar' },
      { name: 'Kanchipuram', deity: 'Goddess Kamakshi + Vishnu', state: 'Tamil Nadu', bestMonths: 'Oct-Feb' },
      { name: 'Ujjain', deity: 'Lord Shiva (Mahakaleshwar)', state: 'Madhya Pradesh', templeSlug: 'mahakaleshwar', bestMonths: 'Oct-Mar' },
      { name: 'Dwarka', deity: 'Lord Krishna', state: 'Gujarat', templeSlug: 'dwarkadhish', bestMonths: 'Oct-Mar' },
    ],
    spiritualSignificance: 'Dying in any Sapta Puri is held to grant immediate moksha (liberation from rebirth).',
    practicalTips: [
      'Plan around Ram Navami (Ayodhya), Krishna Janmashtami (Mathura), Mahashivratri (Kashi/Ujjain)',
      'Kashi: book Vishwanath darshan + Ganga aarti (Dashashwamedh Ghat) ahead',
      'Mathura+Vrindavan day combination is standard — don\'t skip Govardhan parikrama',
      'Dwarka: Bet Dwarka requires boat (45min) — bundle with main visit',
    ],
  },
  {
    slug: 'panch-kedar',
    name: 'Panch Kedar',
    sanskritName: 'पञ्च केदार',
    shortDesc: 'Five Himalayan Shiva temples — where parts of Lord Shiva manifested when fleeing the Pandavas.',
    longDesc: `Per the Mahabharata, when the Pandavas sought Lord Shiva for absolution after the Kurukshetra war, He fled and assumed the form of a bull. The Pandavas chased Him — and parts of the bull (hump at Kedarnath, navel/middle at Madhyamaheshwar, arms at Tungnath, face at Rudranath, hair at Kalpeshwar) manifested at five sites in the Garhwal Himalayas. The Panch Kedar circuit visits all five, completing the trek-heavy 18-25 day yatra through 14,000+ ft passes. Tungnath at 12,073 ft is the highest Shiva temple in the world. Rudranath requires the toughest trek (24km one-way, 6-7 days round trip). Kalpeshwar is the only one open year-round; rest close Nov-April. Only ~5,000 pilgrims complete full Panch Kedar annually due to difficulty — most do Kedarnath + Tungnath as a starter combo.`,
    region: 'himalayas',
    totalDays: { min: 18, max: 25 },
    bestSeason: 'May-June, Sept-Oct',
    startingFromInr: 45000,
    difficulty: 'challenging',
    stops: [
      { name: 'Kedarnath (Hump)', deity: 'Lord Shiva — Jyotirlinga', state: 'Uttarakhand', templeSlug: 'kedarnath', bestMonths: 'May-Oct' },
      { name: 'Tungnath (Arms)', deity: 'Lord Shiva — highest temple', state: 'Uttarakhand', bestMonths: 'May-Oct' },
      { name: 'Rudranath (Face)', deity: 'Lord Shiva', state: 'Uttarakhand', bestMonths: 'May-Oct' },
      { name: 'Madhyamaheshwar (Middle)', deity: 'Lord Shiva', state: 'Uttarakhand', bestMonths: 'May-Oct' },
      { name: 'Kalpeshwar (Hair)', deity: 'Lord Shiva', state: 'Uttarakhand', bestMonths: 'Year-round' },
    ],
    spiritualSignificance: 'Completing Panch Kedar absolves the karma of war and violence, per the Pandava mythology.',
    practicalTips: [
      'Tungnath: 4km trek from Chopta — combine with Chandrashila peak sunrise',
      'Rudranath trek (24km) requires 4-day round-trip — book Garhwal Mandal hut',
      'Only attempt after acclimatizing 1-2 days at 8,000+ ft',
      'Carry trekking poles + sturdy waterproof boots',
      'Hire local porter (₹800-1200/day) for camping gear',
    ],
  },
];

export function circuitSlugs(): string[] {
  return CIRCUITS.map((c) => c.slug);
}

export function getCircuit(slug: string): PilgrimageCircuit | undefined {
  return CIRCUITS.find((c) => c.slug === slug);
}
