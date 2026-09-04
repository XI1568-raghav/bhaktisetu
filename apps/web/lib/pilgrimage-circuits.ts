// Pilgrimage circuit programmatic-SEO data. Each circuit is a multi-temple
// itinerary (Char Dham = 4 temples, Jyotirlinga = 12 temples, etc.). Drives
// search traffic for "char dham yatra package", "jyotirlinga tour" — high
// commercial-intent queries that route to yatra inquiry form.
//
// CI-10 (delta audit 2026-08-21): this file used to hold nineteen records for
// sixteen circuits. `sapta-puri` appeared TWICE — the second record (₹35,000,
// seven stops) was unreachable, because `getCircuit` is a `.find()`, yet it
// still occupied a card on the index grid next to the live ₹48,000 one. Two
// further pairs were one subject at two URLs: `ashta-vinayak` /
// `ashta-vinayak-maharashtra` (the identical eight Maharashtra Ganesha
// temples, priced ₹8,500 and ₹12,000) and `dwadasha-aditya` /
// `dwadasha-aditya-circuit` (the same twelve Adityas; the survivor's longDesc
// already describes both the compact Kashi walk and the pan-India tour). The
// three extra records are gone; their URLs are kept alive as permanent
// redirects via CIRCUIT_ALIASES below, so no indexed URL 404s.
//
// `shakti-peeth` (51 peethas, 30-45 days) and `shakti-peeth-major` (the four
// Adi Peeths, 7-10 days) are deliberately NOT merged: different itinerary,
// different length, different stop list, different name. They are two
// products, not one subject at two URLs.

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
  {
    slug: 'panch-prayag',
    name: 'Panch Prayag',
    sanskritName: 'पञ्च प्रयाग',
    shortDesc: 'Five sacred Ganga-tributary confluences in Uttarakhand — Vishnuprayag, Nandprayag, Karnaprayag, Rudraprayag, Devprayag.',
    longDesc: `The Panch Prayag are five holy sangams (confluences) where the Ganga\'s major tributaries merge en route from Himalayan glaciers to Rishikesh. In upstream-to-downstream order: Vishnuprayag (Alaknanda + Dhauliganga, near Joshimath at 1372m), Nandprayag (Alaknanda + Nandakini, named after King Nand), Karnaprayag (Alaknanda + Pindar, where Karna of Mahabharata meditated upon Surya), Rudraprayag (Alaknanda + Mandakini, where Lord Shiva manifested as Rudra to Narada), and Devprayag (Alaknanda + Bhagirathi, where Ganga is officially born and named). Each sangam has ancient temples and ghats; pilgrims take a holy dip at all five to wash away sins of seven lifetimes. The circuit is typically combined with Char Dham Yatra or Badrinath visit since all five lie along the Rishikesh-Badrinath highway (NH-7). Devprayag is also the headquarters of the Daivajna astrologers who maintain Hindu birth records spanning centuries.`,
    region: 'himalayas',
    totalDays: { min: 4, max: 6 },
    bestSeason: 'Apr-Jun, Sep-Oct (avoid monsoon landslides)',
    startingFromInr: 12000,
    difficulty: 'moderate',
    stops: [
      { name: 'Vishnuprayag', deity: 'Vishnu — Alaknanda + Dhauliganga', state: 'Uttarakhand', bestMonths: 'May-Oct' },
      { name: 'Nandprayag', deity: 'Gopal/Krishna — Alaknanda + Nandakini', state: 'Uttarakhand', bestMonths: 'Apr-Nov' },
      { name: 'Karnaprayag', deity: 'Surya/Karna — Alaknanda + Pindar', state: 'Uttarakhand', bestMonths: 'Apr-Nov' },
      { name: 'Rudraprayag', deity: 'Shiva (Rudra) — Alaknanda + Mandakini', state: 'Uttarakhand', bestMonths: 'Apr-Nov' },
      { name: 'Devprayag', deity: 'Raghunathji — Alaknanda + Bhagirathi = Ganga', state: 'Uttarakhand', bestMonths: 'Year-round' },
    ],
    spiritualSignificance: 'Bathing at all five prayags is said to grant moksha and cleanse karma of seven generations. Each confluence is presided over by a different deity who blesses specific life domains.',
    practicalTips: [
      'All five lie along NH-7 (Rishikesh-Badrinath) — easy road circuit',
      'Combine with Badrinath/Kedarnath darshan in same trip',
      'Devprayag has best ghats for a thorough holy dip',
      'Carry plastic bottles to collect Ganga jal from each sangam',
      'Avoid monsoon (Jul-Aug) — frequent road blocks from landslides',
      'Local guides at each prayag charge ₹200-500 for proper sankalp ritual',
    ],
  },
  {
    slug: 'dwadasha-aditya',
    name: 'Dwadasha Aditya Yatra',
    sanskritName: 'द्वादश आदित्य यात्रा',
    shortDesc: 'Twelve forms of Lord Surya across Varanasi and surrounding sacred geography — one for each month of the solar year.',
    longDesc: `The Dwadasha Aditya are 12 manifestations of Lord Surya, one for each solar month (Chaitra through Phalguna), each governing a specific astrological-spiritual function. In Vedic tradition the 12 Adityas are Mitra, Aryaman, Bhaga, Varuna, Daksha, Amsha, Tvashta, Savitr, Pushan, Shakra, Vivasvan, and Vishnu (as the cosmic Surya). The most accessible Dwadasha Aditya circuit is concentrated within Kashi (Varanasi), where 12 ancient Surya temples — Lolarka Aditya (Assi), Uttararka Aditya (Bakaria Kund), Sambaditya, Drupadaditya, Mayukhaditya, Khakholkaditya, Arunaditya, Vimaladitya, Yamaaditya, Gangaaditya, Vriddhaditya, and Kesavaaditya — form a compact 1-2 day walking pilgrimage. The full pan-Indian Dwadasha Aditya circuit includes Konark (Odisha), Modhera (Gujarat), Martand (Kashmir), Suryanar Koil (Tamil Nadu), and others — taking 15-20 days. Devotees believe completing all 12 grants the merit of 12 full Surya Yajnas and balances any Sun-related dosha in the birth chart.`,
    region: 'pan-india',
    totalDays: { min: 2, max: 15 },
    bestSeason: 'Oct-Mar (winter, avoid summer Sun-related fatigue)',
    startingFromInr: 8000,
    difficulty: 'easy',
    stops: [
      { name: 'Lolarka Aditya (Assi Ghat)', deity: 'Surya — fertility/children boon', state: 'Uttar Pradesh', bestMonths: 'Year-round' },
      { name: 'Konark Sun Temple', deity: 'Surya — 13th century stone chariot', state: 'Odisha', bestMonths: 'Oct-Feb' },
      { name: 'Modhera Sun Temple', deity: 'Surya — Solanki dynasty', state: 'Gujarat', bestMonths: 'Nov-Feb' },
      { name: 'Martand Sun Temple', deity: 'Surya — Kashmir 8th century ruins', state: 'Jammu & Kashmir', bestMonths: 'Apr-Oct' },
      { name: 'Suryanar Koil', deity: 'Surya — Navagraha temple', state: 'Tamil Nadu', bestMonths: 'Oct-Mar' },
      { name: 'Arasavalli Surya', deity: 'Surya — Andhra ancient', state: 'Andhra Pradesh', bestMonths: 'Oct-Mar' },
    ],
    spiritualSignificance: 'Balances Sun in horoscope, cures Pitru dosha, strengthens leadership and vitality. Recommended for those with afflicted Sun, Sade-Sati, or low immunity.',
    practicalTips: [
      'Varanasi Dwadasha Aditya = compact 1-day walking yatra, best at sunrise',
      'Konark + Puri Jagannath combo is the most popular bundle (3 days)',
      'Carry red flowers + jaggery + water for arghya at each Surya',
      'Sundays + Rath Saptami (Magha Shukla Saptami) = most auspicious days',
      'Bathing in nearby tank/river before darshan is traditional',
      'Photography prohibited inside several temples — leave phone in vehicle',
    ],
  },
  {
    slug: 'navadurga-yatra',
    name: 'Navadurga Yatra',
    sanskritName: 'नवदुर्गा यात्रा',
    shortDesc: 'Nine forms of Goddess Durga — Shailaputri to Siddhidatri — worshipped across Navratri at corresponding Devi shrines.',
    longDesc: `The Navadurga are nine forms of Adi Shakti invoked over the nine nights of Navratri (twice yearly — Chaitra and Sharad). In order: Day 1 Shailaputri (daughter of mountains), Day 2 Brahmacharini (ascetic seeker), Day 3 Chandraghanta (moon-belled warrior), Day 4 Kushmanda (cosmic egg-creator), Day 5 Skandamata (mother of Kartikeya), Day 6 Katyayani (slayer of Mahishasura), Day 7 Kalaratri (dark destroyer), Day 8 Mahagauri (luminous purifier), Day 9 Siddhidatri (granter of perfections). The most concentrated Navadurga circuit is in Varanasi where all nine have ancient shrines visited day-by-day during Navratri. The grander pan-Indian Navadurga yatra includes Vaishno Devi (Shailaputri-form, Jammu), Brahmacharini temple at Durgakund (Kashi), Chandraghanta temple in Varanasi, Maa Kushmanda at Ghaziabad, Skandamata in Varanasi, Katyayani in Vrindavan/Chhatarpur, Kalaratri in Varanasi, Mahagauri in Kanya Kumari/Varanasi, and Siddhidatri at Nanda Parvat. Each darshan grants the specific siddhi associated with that Devi-form.`,
    region: 'pan-india',
    totalDays: { min: 9, max: 14 },
    bestSeason: 'Sharad Navratri (Sep-Oct) or Chaitra Navratri (Mar-Apr)',
    startingFromInr: 22000,
    difficulty: 'moderate',
    stops: [
      { name: 'Shailaputri (Vaishno Devi)', deity: 'Day 1 — Mountain Daughter', state: 'Jammu & Kashmir', bestMonths: 'Mar-Apr, Sep-Oct' },
      { name: 'Brahmacharini (Durgakund Kashi)', deity: 'Day 2 — Ascetic Seeker', state: 'Uttar Pradesh', bestMonths: 'Year-round' },
      { name: 'Chandraghanta (Varanasi)', deity: 'Day 3 — Bell-of-Moon Warrior', state: 'Uttar Pradesh', bestMonths: 'Year-round' },
      { name: 'Kushmanda (Ghazipur)', deity: 'Day 4 — Cosmic Egg Creator', state: 'Uttar Pradesh', bestMonths: 'Year-round' },
      { name: 'Skandamata (Varanasi)', deity: 'Day 5 — Mother of Kartikeya', state: 'Uttar Pradesh', bestMonths: 'Year-round' },
      { name: 'Katyayani (Chhatarpur Delhi/Vrindavan)', deity: 'Day 6 — Demon Slayer', state: 'Delhi/UP', bestMonths: 'Oct-Mar' },
      { name: 'Kalaratri (Varanasi)', deity: 'Day 7 — Dark Destroyer', state: 'Uttar Pradesh', bestMonths: 'Year-round' },
      { name: 'Mahagauri (Kanya Kumari)', deity: 'Day 8 — Luminous Purifier', state: 'Tamil Nadu', bestMonths: 'Oct-Mar' },
      { name: 'Siddhidatri (Nanda Parvat)', deity: 'Day 9 — Siddhi Granter', state: 'Uttarakhand', bestMonths: 'May-Oct' },
    ],
    spiritualSignificance: 'Completing Navadurga during Navratri grants the nine siddhis: anima, mahima, garima, laghima, prapti, prakamya, ishitva, vashitva. Most powerful for spiritual seekers and women devotees.',
    practicalTips: [
      'Varanasi Navadurga circuit = compact 2-day walking yatra (recommended starter)',
      'Time visits with Navratri days for maximum spiritual effect',
      'Different colored clothing each day per Devi traditional color',
      'Carry red chunari, kumkum, and seasonal fruits as offering',
      'Many shrines have specific timing windows — verify with priests in advance',
      'Kanya puja (worship of 9 girls) on Day 8 or 9 at any Devi temple completes the yatra merit',
    ],
  },
  {
    slug: 'rama-circuit',
    name: 'Rama Circuit (Ramayana Trail)',
    sanskritName: 'राम यात्रा सर्किट',
    shortDesc: 'Major sites of Lord Rama\'s journey from Ayodhya birth through 14-year exile to Lanka war and return — covering north, central, and south India.',
    longDesc: `The Rama Circuit traces the geography of Valmiki\'s Ramayana — connecting the major sites of Lord Rama\'s life: Ayodhya (birthplace, capital, Ram Janmabhoomi temple inaugurated 2024), Mithila/Janakpur (Sita\'s birthplace, marriage), Chitrakoot (first phase of vanvas, hermitage on Mandakini), Panchavati near Nashik (where Surpanakha was repulsed and Sita was abducted), Hampi/Kishkindha (Rama\'s alliance with Sugriva and Hanuman), Rameswaram (where Rama built Setu bridge to Lanka and consecrated Shiva linga), and finally back to Ayodhya. The full circuit spans roughly 5,000 km across 6-7 states and takes 14-21 days depending on which optional stops are included (Sringverpur ghat where Kevat ferried Rama, Bharadwaj Ashram at Prayagraj, Sita Eluwa in Sri Lanka, Talaimannar). Post-2024 Ram Mandir consecration, Ayodhya has become the busiest temple town in India with ~3 lakh daily pilgrims. The Rama Circuit packages combine flights + AC bus + train and offer English-speaking guides for the religious narrative.`,
    region: 'pan-india',
    totalDays: { min: 14, max: 21 },
    bestSeason: 'Oct-Mar (avoid summer + monsoon)',
    startingFromInr: 55000,
    difficulty: 'moderate',
    stops: [
      { name: 'Ayodhya (Ram Janmabhoomi)', deity: 'Rama — birthplace', state: 'Uttar Pradesh', templeSlug: 'ayodhya-ram-mandir', bestMonths: 'Oct-Mar' },
      { name: 'Mithila/Janakpur', deity: 'Sita — birthplace', state: 'Bihar/Nepal', bestMonths: 'Oct-Mar' },
      { name: 'Chitrakoot', deity: 'Rama — first vanvas hermitage', state: 'MP/UP border', bestMonths: 'Oct-Mar' },
      { name: 'Panchavati (Nashik)', deity: 'Sita — abduction site', state: 'Maharashtra', bestMonths: 'Oct-Feb' },
      { name: 'Hampi/Kishkindha', deity: 'Sugriva-Hanuman — vanara kingdom', state: 'Karnataka', bestMonths: 'Oct-Feb' },
      { name: 'Rameswaram', deity: 'Rameshwar Jyotirlinga — Setu start', state: 'Tamil Nadu', templeSlug: 'rameswaram', bestMonths: 'Oct-Mar' },
    ],
    spiritualSignificance: 'Walking the geography of the Ramayana brings the epic alive in heart and memory. Said to grant righteousness (dharma), unwavering devotion (bhakti), and the family-happiness ideals embodied by Rama-Sita-Hanuman.',
    practicalTips: [
      'Book Ayodhya Ram Mandir darshan slot via UP government portal 1 month in advance',
      'Chitrakoot best in Kartik (Oct-Nov) for Deepotsav and Diwali',
      'Hampi requires 2-3 days minimum due to scattered ruins; UNESCO site',
      'Rameswaram: bathe at all 22 theerthams before main darshan',
      'Carry copy of Valmiki Ramayana or Tulsi Ramcharitmanas for site-by-site reading',
      'Many sites have free dharamshala for pilgrims — book ahead during festivals',
    ],
    relatedYatra: 'rama-circuit',
  },
  {
    slug: 'krishna-leela-yatra',
    name: 'Krishna Leela Yatra (Braj Mandal)',
    sanskritName: 'कृष्ण लीला यात्रा',
    shortDesc: 'Major sites of Lord Krishna\'s leelas — Mathura birth through Vrindavan-Govardhan-Barsana childhood to Dwarka kingdom.',
    longDesc: `The Krishna Leela Yatra covers the geographical heart of Krishna\'s life-pastimes: Mathura (birthplace in Kansa\'s prison, Krishna Janmabhoomi temple), Vrindavan (childhood and adolescence among gopis — Banke Bihari, ISKCON, Radha Raman, Nidhivan), Govardhan Hill (where Krishna lifted the mountain to shelter Brijwasis from Indra\'s wrath — 21km Govardhan Parikrama), Barsana (Radha\'s birthplace, Radha Rani Mandir, famous Lathmar Holi), Nandgaon (where Krishna grew up in Yashoda-Nanda\'s home), Gokul (early infancy nestled across the Yamuna), and finally Dwarka in Gujarat (Krishna\'s kingdom for the second half of his life, including Bet Dwarka and Nageshwar Jyotirlinga). The Braj Mandal sub-circuit (Mathura-Vrindavan-Govardhan-Barsana-Nandgaon-Gokul) is the most popular 3-5 day yatra; adding Dwarka stretches to 8-12 days. Holi in Braj (Mar) and Janmashtami (Aug-Sep) are the most spiritually charged times — but also the most crowded.`,
    region: 'pan-india',
    totalDays: { min: 5, max: 12 },
    bestSeason: 'Oct-Mar primary; Holi (Mar) and Janmashtami (Aug-Sep) for festivals',
    startingFromInr: 25000,
    difficulty: 'easy',
    stops: [
      { name: 'Mathura (Krishna Janmabhoomi)', deity: 'Krishna — birthplace', state: 'Uttar Pradesh', templeSlug: 'mathura-krishna-janmabhoomi', bestMonths: 'Oct-Mar' },
      { name: 'Vrindavan (Banke Bihari)', deity: 'Krishna-Radha — leela bhumi', state: 'Uttar Pradesh', templeSlug: 'vrindavan-banke-bihari', bestMonths: 'Oct-Mar' },
      { name: 'Govardhan Parvat', deity: 'Giriraj Krishna — lifted mountain', state: 'Uttar Pradesh', bestMonths: 'Oct-Mar' },
      { name: 'Barsana (Radha Rani)', deity: 'Radha — birthplace + Lathmar Holi', state: 'Uttar Pradesh', bestMonths: 'Feb-Mar (Holi)' },
      { name: 'Nandgaon', deity: 'Krishna — childhood home', state: 'Uttar Pradesh', bestMonths: 'Oct-Mar' },
      { name: 'Gokul', deity: 'Bal Krishna — infancy', state: 'Uttar Pradesh', bestMonths: 'Oct-Mar' },
      { name: 'Dwarka (Dwarkadhish)', deity: 'Krishna — king of Dwarka', state: 'Gujarat', templeSlug: 'dwarka', bestMonths: 'Oct-Mar' },
    ],
    spiritualSignificance: 'Walking Krishna\'s leela bhumi deepens Madhura Bhava (sweet devotion). Saints like Chaitanya, Vallabhacharya, and Meera all walked this circuit. Said to grant Krishna prema (pure devotional love).',
    practicalTips: [
      'Braj Mandal Parikrama = 252 km, ~20 days traditional walking version',
      'Govardhan Parikrama = 21 km, do barefoot at dawn',
      'Banke Bihari closes briefly during day — check timings to avoid disappointment',
      'Nidhivan (Vrindavan) night entry forbidden — Krishna-Radha rasleela believed to happen nightly',
      'Holi in Barsana-Nandgaon is famously aggressive — wear old clothes',
      'Dwarka best combined with Somnath Jyotirlinga (3 hours drive)',
    ],
  },
  {
    slug: 'shakti-peeth-major',
    name: 'Maha Shakti Peeth (4 Adi Peeths)',
    sanskritName: 'महा शक्ति पीठ',
    shortDesc: 'Four primary Adi Shakti Peethas — Kamakhya, Kalighat, Tara Tarini, Bimala — where most powerful Sati body parts fell.',
    longDesc: `Of the 51 (some say 52, 64, or 108) Shakti Peethas across the Indian subcontinent — sacred sites where parts of Goddess Sati\'s body fell when Lord Vishnu cut Her corpse with Sudarshan Chakra to relieve Shiva\'s grief — four are considered the Maha Shakti Peethas (primary Adi Peethas) per Brahmanda Purana: Kamakhya (Guwahati, Assam — yoni/womb fell, presiding goddess Kamakhya, famous Ambubachi mela), Kalighat (Kolkata, West Bengal — toes of right foot, presiding goddess Kali, Bengal\'s most powerful Shakti seat), Tara Tarini (Berhampur, Odisha — breasts, presiding goddess Tara, atop Kumari Hills), and Bimala Devi at Jagannath Puri (Odisha — feet, presiding goddess Bimala, considered the most powerful integrated Shakti-Vaishnav Peetha). Some traditions include Dakshineshwar Bhavatarini (Kolkata) instead of Bimala. The Maha Shakti Peetha yatra is the most concentrated and powerful Devi pilgrimage — completed in 7-10 days, the circuit is said to grant complete spiritual transformation and bestow the Devi\'s direct grace.`,
    region: 'east',
    totalDays: { min: 7, max: 10 },
    bestSeason: 'Oct-Mar; Navratri (Mar/Sep-Oct) most auspicious',
    startingFromInr: 28000,
    difficulty: 'moderate',
    stops: [
      { name: 'Kamakhya (Guwahati)', deity: 'Kamakhya — yoni-peetha', state: 'Assam', bestMonths: 'Oct-Mar; Ambubachi Jun' },
      { name: 'Kalighat (Kolkata)', deity: 'Kali — toes of right foot', state: 'West Bengal', bestMonths: 'Oct-Mar; Kali Puja Oct/Nov' },
      { name: 'Tara Tarini (Berhampur)', deity: 'Tara — breasts', state: 'Odisha', bestMonths: 'Oct-Mar; Chaitra Yatra Apr' },
      { name: 'Bimala (Puri Jagannath)', deity: 'Bimala — feet, integrated with Jagannath', state: 'Odisha', templeSlug: 'jagannath-puri', bestMonths: 'Oct-Mar; Rath Yatra Jun-Jul' },
    ],
    spiritualSignificance: 'The four Maha Shakti Peethas form a complete Devi circuit covering all aspects of feminine cosmic power. Said to remove Pitru dosha, Mangala dosha, and karmic blockages that prevent spiritual progress. The most powerful pilgrimage for women seeking Devi\'s direct grace.',
    practicalTips: [
      'Kamakhya: queue at Ambubachi mela (Jun) is 4+ hours — avoid if not specifically devoted',
      'Kalighat: VIP darshan available for ₹500-1000 — saves 2-3 hours',
      'Tara Tarini: climb 999 steps or use ropeway (₹50); morning best',
      'Bimala-Jagannath: non-Hindus restricted in main temple but can view Bimala from outside',
      'Carry red chunari, kumkum, hibiscus flowers — Devi\'s favorites',
      'Animal sacrifice practiced at Kamakhya and Kalighat — vegetarians may prefer to skip ritual portions',
    ],
  },
  {
    slug: 'maha-kumbh-circuit',
    name: 'Maha Kumbh Mela Circuit',
    sanskritName: 'महाकुम्भ मेला यात्रा',
    shortDesc: 'Four-city rotating Kumbh — Prayagraj, Haridwar, Ujjain, Nashik. World largest religious gathering, held every 12 years per city.',
    longDesc: `The Kumbh Mela is the largest peaceful gathering of humans on Earth — 100M+ pilgrims attend the Prayagraj Maha Kumbh held every 12 years. The four sites rotate: Prayagraj (Allahabad, Triveni Sangam), Haridwar (Har-ki-Pauri, Ganga), Ujjain (Shipra river, Mahakaleshwar), Nashik (Godavari, Trimbakeshwar). Each city hosts Kumbh once every 12 years; collectively a Kumbh happens every 3 years somewhere in India. The 2025 Maha Kumbh at Prayagraj saw 660M+ pilgrim-visits over 45 days — largest gathering in human history. The Ardha Kumbh (every 6 years) and the Maha Kumbh (every 12 years) at Prayagraj are particularly significant. Origin story: per Bhagavata Purana, when gods + asuras churned the Ocean of Milk, drops of Amrita (nectar) fell at these 4 sites — bathing here on auspicious days grants moksha. The Shahi Snan (royal bath) by sadhus on auspicious dates is the spiritual climax. Darshya coordinates verified pandit-led puja + tirth bookings during Kumbh seasons + live-streaming of major snans for diaspora families who cannot attend physically.`,
    region: 'pan-india',
    totalDays: { min: 3, max: 15 },
    bestSeason: 'Per Kumbh schedule — Prayagraj Jan-Mar; Haridwar Apr-May; Ujjain Apr; Nashik Aug-Sep',
    startingFromInr: 8000,
    difficulty: 'moderate',
    stops: [
      { name: 'Triveni Sangam Prayagraj', deity: 'Ganga + Yamuna + Saraswati', state: 'Uttar Pradesh', bestMonths: 'Jan-Mar (next Maha Kumbh 2037)' },
      { name: 'Har-ki-Pauri Haridwar', deity: 'Ganga + Shiva', state: 'Uttarakhand', bestMonths: 'Apr-May' },
      { name: 'Mahakaleshwar Ujjain', deity: 'Shiva (Mahakal)', state: 'Madhya Pradesh', templeSlug: 'mahakaleshwar-ujjain', bestMonths: 'Apr (Simhastha 2028)' },
      { name: 'Trimbakeshwar Nashik', deity: 'Shiva', state: 'Maharashtra', bestMonths: 'Aug-Sep (Simhastha 2027)' },
    ],
    spiritualSignificance: 'The four Kumbh sites cover all four Vedic directions + represent the four spilled drops of Amrita. Bathing at the Sangam (Triveni Sangam Prayagraj) during Shahi Snan grants moksha + dissolves karmic burden of countless lifetimes. The 12-year + 6-year Kumbh cycle aligns with Jupiter Brihaspati transit through specific zodiac signs — cosmic timing reinforces ritual potency.',
    practicalTips: [
      'Kumbh Mela 2027 Nashik (Simhastha) is the next major event — book accommodations 12+ months ahead',
      'Stay in registered yatra camps; avoid unverified accommodations during peak Kumbh days',
      'Shahi Snan dates: Mauni Amavasya, Basant Panchami, Maha Shivaratri are most auspicious',
      'NRI families: 24hr live-stream available via Darshya for major snan windows',
      'Carry minimal essentials: ID, bottled water, snacks, basic medicines',
      'For Maha Kumbh: government registers all pilgrims; pre-registration mandatory'
    ],
  },
  {
    slug: 'panch-vinayak-mumbai',
    name: 'Panch Vinayak Mumbai Circuit',
    sanskritName: 'पंच विनायक मुम्बई परिक्रमा',
    shortDesc: 'Five Ganesha temple circuit within Mumbai — completed in single day during Ganesh Chaturthi or Sankashti.',
    longDesc: `The Panch Vinayak circuit consists of five major Ganesha temples within Mumbai, traditionally completed in a single day during Ganesh Chaturthi or any Sankashti Chaturthi tithi. The circuit is particularly favored by Mumbai residents + Maharashtrian families for removal of major obstacles in life + business. Starting from Siddhivinayak Prabhadevi (most famous), proceed clockwise to Mumbadevi (Bhuleshwar), Walkeshwar Banganga (Malabar Hill), Khwajabaag Ganpati (Worli), and conclude at Ganesh Mandir Chembur. Total circuit takes 4-6 hours including travel + brief darshan at each. Particularly auspicious during Ganesh Chaturthi 10-day festival, when all five temples extend hours + offer special pujas. Darshya coordinates Panch Vinayak day-tour packages w/ verified pandit + transport + meal arrangements for Mumbai residents + NRI Maharashtrian visitors.`,
    region: 'west',
    totalDays: { min: 1, max: 1 },
    bestSeason: 'Year-round; peak during Ganesh Chaturthi (Aug-Sep)',
    startingFromInr: 1500,
    difficulty: 'easy',
    stops: [
      { name: 'Siddhivinayak Prabhadevi', deity: 'Siddhivinayak Ganesh', state: 'Maharashtra', templeSlug: 'siddhivinayak-mumbai', bestMonths: 'Year-round' },
      { name: 'Mumbadevi Bhuleshwar', deity: 'Mumbadevi + Vighnharta Ganesh', state: 'Maharashtra', bestMonths: 'Year-round' },
      { name: 'Walkeshwar Banganga Ganesh', deity: 'Ganesh (heritage 12th cent)', state: 'Maharashtra', bestMonths: 'Year-round' },
      { name: 'Khwajabaag Ganpati Worli', deity: 'Ganesh', state: 'Maharashtra', bestMonths: 'Year-round' },
      { name: 'Sarvajanik Ganesh Mandir Chembur', deity: 'Ganesh (Vighnaraja)', state: 'Maharashtra', bestMonths: 'Year-round' },
    ],
    spiritualSignificance: 'Completing all five Vinayak temples in single day during Sankashti Chaturthi or Ganesh Chaturthi grants relief from severe karmic obstacles. Particularly recommended for those facing business failures, legal cases, marriage difficulties, or chronic health issues. Maharashtrian families consider Panch Vinayak the foundational Mumbai pilgrimage.',
    practicalTips: [
      'Start at 5:00 AM at Siddhivinayak (least crowded); end by 11:00 AM',
      'Use Uber/Ola; metro to Prabhadevi station',
      'Offer modaks at each temple (Ganesh favorite)',
      'Photography prohibited inside Siddhivinayak + Mumbadevi sanctums',
      'On Sankashti Chaturthi days + Ganesh Chaturthi window: bookings 2-4 hour queues',
      'Darshya day-tour package includes pandit + transport + 4 modak meals at temples',
    ],
  },
];

/**
 * CI-10 — retired circuit slug -> surviving slug. Mirrors TIRTHA_ALIASES in
 * lib/tirtha-slug.ts. These were live, indexed URLs before the merge, so
 * app/pilgrimage/[slug]/page.tsx serves them as 308s onto the survivor rather
 * than 404ing them.
 *
 *   ashta-vinayak-maharashtra  "Ashta Vinayak Maharashtra"  -> ashta-vinayak
 *     Both list the same eight temples in the same canonical order:
 *     Morgaon, Siddhatek, Pali, Mahad, Theur, Lenyadri, Ozar, Ranjangaon.
 *   dwadasha-aditya-circuit    "Dwadasha Aditya Circuit"    -> dwadasha-aditya
 *     Both are the twelve Adityas; the survivor's longDesc already covers the
 *     compact Kashi walking set AND the pan-India sun-temple tour.
 *
 * `circuitSlugs()` deliberately returns only canonical slugs, because
 * app/sitemap.ts builds the /pilgrimage section from it and a sitemap must not
 * advertise a redirect. The aliases are added back in generateStaticParams.
 */
export const CIRCUIT_ALIASES: Readonly<Record<string, string>> = {
  'ashta-vinayak-maharashtra': 'ashta-vinayak',
  'dwadasha-aditya-circuit': 'dwadasha-aditya',
};

export function circuitSlugs(): string[] {
  return CIRCUITS.map((c) => c.slug);
}

/** Resolve a possibly-retired circuit slug onto the URL that actually renders. */
export function canonicalCircuitSlug(slug: string): string {
  return CIRCUIT_ALIASES[slug] ?? slug;
}

export function getCircuit(slug: string): PilgrimageCircuit | undefined {
  return CIRCUITS.find((c) => c.slug === slug);
}
