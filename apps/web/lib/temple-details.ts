/**
 * Rich temple detail data for comprehensive temple pages.
 * Keyed by temple slug. Fall back to basic API data for any slug not present here.
 */

export type DeityType = 'Shiva' | 'Vishnu' | 'Shakti' | 'Ganesha' | 'Sikh' | 'Other';

export interface PujaOffering {
  name: string;
  price: number; // INR
  duration: string;
  description: string;
  spiritualBenefit: string;
  bookExternal?: boolean; // if true, book on official temple website
}

export interface TempleDetailRich {
  slug: string;
  name: string;
  deity: string;
  deityType: DeityType;
  location: string; // city
  state: string;
  isJyotirlinga?: boolean;
  isDivyaDesam?: boolean;
  isShaktiPeetha?: boolean;

  officialWebsite?: string;
  officialBookingUrl?: string;
  officialDarshanBookingUrl?: string;

  history: string;
  significance: string;
  deityDescription: string;

  mainFestivals: { name: string; when: string }[];

  openingHours: {
    morning: string;
    afternoon: string;
    evening: string;
  };

  dressCode: string;

  howToReach: {
    nearestAirport: string;
    nearestRailway: string;
    roadDirections: string;
  };

  accommodation: string[];

  pujasOffered: PujaOffering[];

  photoCount: number;

  rules: string[];

  nearbyAttractions: string[];

  specialNote: string;

  testimonials?: {
    name: string;
    city: string;
    text: string;
    rating: number;
  }[];

  faqs?: { q: string; a: string }[];
}

export const TEMPLE_DETAILS: Record<string, TempleDetailRich> = {
  'kashi-vishwanath': {
    slug: 'kashi-vishwanath',
    name: 'Shri Kashi Vishwanath Temple',
    deity: 'Lord Shiva',
    deityType: 'Shiva',
    location: 'Varanasi',
    state: 'Uttar Pradesh',
    isJyotirlinga: true,
    officialWebsite: 'https://shrikashivishwanath.org',
    officialBookingUrl: 'https://shrikashivishwanath.org/Home/SugamDarshan',
    officialDarshanBookingUrl: 'https://shrikashivishwanath.org/Home/SugamDarshan',
    history:
      'The Kashi Vishwanath Temple, standing on the western bank of the Ganga in Varanasi, is among the twelve Jyotirlingas of Lord Shiva. The original shrine is mentioned in the Skanda Purana and Puranas dating back over a thousand years. The temple was destroyed by the armies of Qutb-ud-din Aibak in 1194 CE and rebuilt multiple times. Aurangzeb demolished it in 1669 CE and built the Gyanvapi Mosque over its ruins. The current structure was commissioned by Maharani Ahilyabai Holkar of Indore in 1780 CE.\n\nIn 1835, Maharaja Ranjit Singh of the Sikh Empire donated gold to plate the temple\'s spires, earning it the epithet "Suvarna Mandir" (Golden Temple of Varanasi). The Kashi Vishwanath Corridor project, inaugurated in December 2021, connected the temple directly to the Ganga ghats and transformed pilgrim access.\n\nMillions of devotees believe that a single darshan of Vishwanath and a dip in the Ganga at Kashi grants moksha — liberation from the cycle of birth and death.',
    significance:
      'Kashi is said to rest on the trident of Lord Shiva himself. It is one of the Sapta Puri (seven sacred cities) and the Shiva who dwells here is called Vishweshwara — Lord of the Universe. Dying in Kashi is believed to ensure liberation, and it is one of only two places on earth (along with Rameswaram) where both Shaiva and Vaishnava pilgrims complete their holy journey.',
    deityDescription:
      'The Jyotirlinga at Kashi Vishwanath is a black stone lingam roughly 60 cm tall, set in a silver altar. Devotees offer water from the Ganga, bilva leaves, milk and flowers directly onto the lingam — a rare privilege in a major Jyotirlinga.',
    mainFestivals: [
      { name: 'Maha Shivaratri', when: 'February / March' },
      { name: 'Shravan Somwar', when: 'July / August (every Monday)' },
      { name: 'Dev Deepavali', when: 'November (Kartik Purnima)' },
      { name: 'Rangbhari Ekadashi', when: 'March' },
      { name: 'Annakut', when: 'Day after Diwali' },
    ],
    openingHours: {
      morning: 'Mangala Aarti 3:00 AM; General darshan 4:00 AM to 11:00 AM',
      afternoon: 'Bhog Aarti 11:35 AM; darshan resumes 12:00 PM to 7:00 PM',
      evening: 'Sapta Rishi Aarti 7:00 PM; Shringar Aarti 9:00 PM; Shayana Aarti 10:30 PM (closes 11:00 PM)',
    },
    dressCode:
      'Traditional Indian attire preferred. Men: dhoti-kurta or shirt with trousers (no shorts). Women: saree or salwar-kameez (no sleeveless, no short dresses). Leather items must be removed before entering.',
    howToReach: {
      nearestAirport: 'Lal Bahadur Shastri International Airport, Varanasi (24 km / 45 min by road)',
      nearestRailway: 'Varanasi Junction (BSB) — 6 km; Banaras station (BSBS) — 4 km',
      roadDirections:
        'Vehicles can reach up to Godowlia Chowk. From there a 10–12 minute walk through Vishwanath Gali leads to Gate 4 of the Corridor. Battery rickshaws run from Godowlia.',
    },
    accommodation: [
      'Taj Ganges (5-star, Nadesar Palace Grounds)',
      'Hotel Clarks Varanasi (5-star)',
      'BrijRama Palace (heritage, Darbhanga Ghat)',
      'Ramada Plaza JHV Varanasi (4-star)',
      'Hotel Pradeep (budget, Jagatganj)',
      'Mumukshu Bhawan & Birla Guest House (dharamshalas for pilgrims)',
    ],
    pujasOffered: [
      {
        name: 'Mangala Aarti Darshan (VIP)',
        price: 500,
        duration: '1 hour',
        description: 'Pre-booked sanctum entry during the 3:00 AM Mangala Aarti.',
        spiritualBenefit: 'Considered the most auspicious darshan of the day; blesses the devotee with peace and clarity.',
        bookExternal: true,
      },
      {
        name: 'Sugam Darshan Pass',
        price: 300,
        duration: '30 min',
        description: 'Skip-the-line ticketed entry through a shorter queue.',
        spiritualBenefit: 'Convenient darshan for elderly and time-constrained pilgrims.',
        bookExternal: true,
      },
      {
        name: 'Rudrabhishek',
        price: 750,
        duration: '90 min',
        description: 'Abhishek of the Jyotirlinga with Panchamrit and Ganga jal while Rudram is chanted.',
        spiritualBenefit: 'Removes chronic illness, planetary afflictions and grants longevity.',
      },
      {
        name: 'Maha Mrityunjaya Jaap (1.25 lakh)',
        price: 11000,
        duration: '3 days',
        description: '1,25,000 recitations of the Maha Mrityunjaya mantra by a team of priests.',
        spiritualBenefit: 'Wards off untimely death, serious illness and fear.',
      },
      {
        name: 'Shringar Aarti Participation',
        price: 300,
        duration: '1 hour',
        description: 'Special pass to witness the 9:00 PM ornamentation aarti up close.',
        spiritualBenefit: 'Sight of adorned Mahadev is believed to bring householder prosperity.',
        bookExternal: true,
      },
      {
        name: 'Shiv Sahasranama Archana',
        price: 1100,
        duration: '2 hours',
        description: 'Archana with 1,008 names of Shiva, bilva patra and flowers.',
        spiritualBenefit: 'Fulfils specific sankalp wishes; general wellbeing.',
      },
      {
        name: 'Kaal Bhairav Puja',
        price: 1500,
        duration: '2 hours',
        description: 'Puja at the Kaal Bhairav temple (Kotwal of Kashi) combined with Vishwanath darshan.',
        spiritualBenefit: 'Protection from enemies and black magic; said to be mandatory for pilgrims of Kashi.',
      },
      {
        name: 'Annakoot Seva',
        price: 2100,
        duration: 'Half day',
        description: 'Sponsor a portion of the Annakoot (mountain of food) offering on the day after Diwali.',
        spiritualBenefit: 'Merit equivalent to feeding the entire universe; family prosperity.',
      },
    ],
    photoCount: 6,
    rules: [
      'Mobile phones, cameras, pens, belts and leather items are strictly prohibited in the sanctum zone',
      'Free lockers available at Gate 4; keep only ID card and wallet',
      'No photography inside the inner temple',
      'Footwear to be deposited at the designated stand (free)',
      'Menstruating women are traditionally advised not to enter the sanctum',
      'Queue separately for men and women in the inner sanctum',
      'Do not touch the lingam unless a priest guides you during a paid abhishek',
    ],
    nearbyAttractions: [
      'Dashashwamedh Ghat & Ganga Aarti (5 min walk)',
      'Manikarnika Ghat',
      'Sankat Mochan Hanuman Temple (6 km)',
      'Kaal Bhairav Temple (2 km)',
      'Banaras Hindu University (Vishwanath Temple BHU)',
      'Sarnath (10 km)',
    ],
    specialNote:
      'During Shravan month (July-August) and Maha Shivaratri, queues can stretch 6-8 hours. Online Sugam Darshan or Mangala Aarti booking is essential. The Corridor is fully accessible and includes wheelchair assistance at Gate 4.',
    testimonials: [
      {
        name: 'Anjali Mishra',
        city: 'Delhi',
        text: 'Booked Mangala Aarti through Darshya and reached Gate 4 at 2:30 AM. Pandit ji guided us throughout — the sight of Baba at 3 AM was something I will never forget.',
        rating: 5,
      },
      {
        name: 'Ravi Shankar Iyer',
        city: 'Bangalore',
        text: 'As an elderly devotee, Sugam Darshan was a lifesaver. Took about 40 minutes on a Shravan Monday vs 5+ hours regular.',
        rating: 5,
      },
      {
        name: 'Meera Kapoor',
        city: 'Mumbai',
        text: 'The Rudrabhishek was beautifully performed — full 90 minutes, proper Rudram chanting. Video was emailed within a day.',
        rating: 5,
      },
    ],
    faqs: [
      {
        q: 'When is the best time to visit Kashi Vishwanath?',
        a: 'October to March has pleasant weather. Avoid peak Shravan Mondays unless you have pre-booked Sugam Darshan. Early morning (3–6 AM) has the shortest queues.',
      },
      {
        q: 'Can non-Hindus enter the temple?',
        a: 'Yes, since the 2021 Corridor opening there is no restriction on entry based on religion.',
      },
      {
        q: 'What should I offer to Baba Vishwanath?',
        a: 'Ganga jal, raw milk, bilva (bel) leaves, dhatura flower, white flowers and bhang are the traditional offerings. You can buy a standard offering thali at the entrance.',
      },
      {
        q: 'How do I get the temple prasad?',
        a: 'Official laddu and khichdi prasad is sold at the Prasad Counter inside the Corridor. You can also get tulsi mala and bhasma (sacred ash).',
      },
      {
        q: 'Is there a fee for general darshan?',
        a: 'No, general darshan is free. Sugam Darshan is ₹300 and Mangala Aarti is ₹500 per person.',
      },
    ],
  },

  somnath: {
    slug: 'somnath',
    name: 'Somnath Temple',
    deity: 'Lord Shiva',
    deityType: 'Shiva',
    location: 'Somnath',
    state: 'Gujarat',
    isJyotirlinga: true,
    officialWebsite: 'https://somnath.org',
    officialBookingUrl: 'https://somnath.org/Puja-Reservation',
    officialDarshanBookingUrl: 'https://somnath.org/VIP-Darshan',
    history:
      'Somnath, the "Lord of the Moon," is the first among the twelve Jyotirlingas. According to legend, Chandra (the Moon God) built the original temple in gold after being cursed and redeemed by Shiva. Ravana then rebuilt it in silver, Krishna in sandalwood, and Raja Bhimdev in stone.\n\nThe temple stood at the confluence of Kapila, Hiran and the mythical Saraswati rivers. Between 1024 and 1706 CE it was plundered and destroyed six times — by Mahmud of Ghazni, Alauddin Khilji, Muzaffar Shah, Mahmud Begada, Aurangzeb and others — and rebuilt each time. Each reconstruction is an act of civilisational memory.\n\nThe present temple in Maru-Gurjara architectural style was inaugurated on 11 May 1951 by India\'s first President Dr. Rajendra Prasad, following a project initiated by Sardar Vallabhbhai Patel in 1947.',
    significance:
      'The Shiva Purana places Somnath as the Aadi (first) Jyotirlinga — the starting point of any Jyotirlinga Yatra. The shrine is also the southernmost point of mainland India with no land between it and the South Pole along its meridian (marked by the Baan Stambh pillar).',
    deityDescription:
      'The Shiva lingam at Somnath is described as "Jyotirlinga" — a self-manifested pillar of light. The current lingam is set in a richly decorated sanctum facing east toward the Arabian Sea.',
    mainFestivals: [
      { name: 'Maha Shivaratri', when: 'February / March' },
      { name: 'Kartik Purnima', when: 'November' },
      { name: 'Somnath Patotsav', when: 'Vaishakh Purnima (May)' },
      { name: 'Shravan Maas', when: 'July / August' },
    ],
    openingHours: {
      morning: 'Temple opens 6:00 AM; Morning aarti 7:00 AM',
      afternoon: 'Darshan continues 9:00 AM to 12:00 PM aarti',
      evening: 'Evening aarti 7:00 PM; Light & Sound show 8:00 PM; closes 9:30 PM',
    },
    dressCode:
      'Modest Indian attire recommended. Shorts, skirts above the knee and sleeveless tops are discouraged. Electronics (phones, cameras, watches, pens) are banned — free cloakroom outside the entrance.',
    howToReach: {
      nearestAirport: 'Diu Airport (80 km) or Rajkot Airport (200 km)',
      nearestRailway: 'Veraval Junction (7 km)',
      roadDirections:
        'Well connected by state highway from Ahmedabad (410 km, 7-8 hrs), Rajkot (190 km) and Junagadh (85 km). GSRTC buses and private taxis ply regularly.',
    },
    accommodation: [
      'Hotel The Fern Residency Somnath',
      'Lords Inn Somnath',
      'Hotel Sundaram (budget)',
      'Sagar Darshan Atithigruh (trust-run guest house)',
      'Maheshwari Samaj Dharamshala',
      'Lilavati Atithi Bhavan (near the temple)',
    ],
    pujasOffered: [
      {
        name: 'VIP Darshan',
        price: 300,
        duration: '30 min',
        description: 'Pre-booked access through a priority queue.',
        spiritualBenefit: 'Undisturbed darshan of the Jyotirlinga.',
        bookExternal: true,
      },
      {
        name: 'Morning Aarti Sponsorship',
        price: 1100,
        duration: '1 hour',
        description: 'Sponsor the 7:00 AM aarti and receive prasad in your family\'s name.',
        spiritualBenefit: 'Collective merit for the family; name announced inside the sanctum.',
        bookExternal: true,
      },
      {
        name: 'Rudrabhishek',
        price: 1100,
        duration: '1.5 hours',
        description: 'Classical Rudram abhishek with panchamrit and Triveni Sangam jal.',
        spiritualBenefit: 'Health, wealth and harmony in the household.',
      },
      {
        name: 'Laghu Rudra',
        price: 5100,
        duration: 'Half day',
        description: '11 priests chanting Rudram 11 times each with coordinated abhishek.',
        spiritualBenefit: 'Major dosha relief and business prosperity.',
      },
      {
        name: 'Maha Rudra',
        price: 21000,
        duration: 'Full day',
        description: '11 priests chanting Rudram 121 times with full Yagna.',
        spiritualBenefit: 'Highest form of Shiva abhishek; granted once in a lifetime sankalp.',
      },
      {
        name: 'Annakshetra Bhojan Seva',
        price: 5100,
        duration: '1 day',
        description: 'Sponsor one day of meals for pilgrims at the temple annakshetra.',
        spiritualBenefit: 'Anna-daan is said to exceed even gold daan in merit.',
      },
      {
        name: 'Light & Sound Show VIP Seating',
        price: 200,
        duration: '55 min',
        description: 'Pre-reserved front-row seating for the evening history narration by Amitabh Bachchan\'s voice.',
        spiritualBenefit: 'Experience of the temple\'s 2,000 year history.',
        bookExternal: true,
      },
    ],
    photoCount: 6,
    rules: [
      'Absolutely no electronic items inside — phones, smart watches, cameras',
      'Free cloakroom outside Gate 1 for all belongings',
      'Photography of the inner sanctum is strictly prohibited',
      'Do not touch the walls or lingam outside of paid abhishek',
      'Maintain silence in the sanctum',
      'Remove leather items (belts, wallets)',
    ],
    nearbyAttractions: [
      'Bhalka Tirth (where Krishna left for Vaikuntha) — 5 km',
      'Triveni Sangam (confluence of Kapila, Hiran, Saraswati) — 2 km',
      'Panch Pandav Gufa',
      'Suraj Mandir (Sun Temple, Prabhas Patan)',
      'Dehotsarg Tirth',
      'Gir National Park (60 km — Asiatic lions)',
    ],
    specialNote:
      'The Light and Sound show at 8 PM every evening is a must-attend — it narrates the temple\'s destruction and resurrection with projection mapping on the spire. Phones banned inside the temple; arrange to keep them at the cloakroom before approach.',
    testimonials: [
      { name: 'Ketan Patel', city: 'Ahmedabad', text: 'Booked the Light & Sound VIP seating plus next-morning VIP darshan — seamless flow. Prasad delivery reached home in 4 days.', rating: 5 },
      { name: 'Sushma Rao', city: 'Hyderabad', text: 'Laghu Rudra was performed with full vidhi. Eleven priests chanting in unison at the Aadi Jyotirlinga is indescribable.', rating: 5 },
      { name: 'Ashish Mehra', city: 'Delhi', text: 'Organised a family visit during Kartik Purnima. Booking through Darshya saved us hours.', rating: 4 },
    ],
    faqs: [
      { q: 'Is Somnath open during monsoon?', a: 'Yes, open year-round. Monsoon (June–September) has pleasant weather but can be windy.' },
      { q: 'Can I offer flowers at the Jyotirlinga?', a: 'Offerings are collected by priests at the entrance and placed on your behalf. Direct touching of the lingam is only via paid abhishek.' },
      { q: 'Where to stay near the temple?', a: 'Sagar Darshan Atithigruh run by the trust is clean, affordable and 100 m from the temple.' },
      { q: 'Is parking available?', a: 'Yes, free parking at Gate 2. Walk ~300 m to the main temple.' },
      { q: 'Can I see the original Jyotirlinga?', a: 'The present lingam is consecrated per Shastra and is the pratishtha of the same Jyotirlinga that has been worshipped for millennia, despite multiple destructions.' },
    ],
  },

  mahakaleshwar: {
    slug: 'mahakaleshwar',
    name: 'Shri Mahakaleshwar Temple',
    deity: 'Lord Shiva',
    deityType: 'Shiva',
    location: 'Ujjain',
    state: 'Madhya Pradesh',
    isJyotirlinga: true,
    officialWebsite: 'https://shrimahakaleshwar.com',
    officialBookingUrl: 'https://shrimahakaleshwar.com/Home/OnlineDarshan',
    officialDarshanBookingUrl: 'https://shrimahakaleshwar.com/Home/BhasmaAartiBooking',
    history:
      'Mahakaleshwar in Ujjain is among the twelve Jyotirlingas and is unique for being a "Dakshinamukhi" lingam — the only one facing south. The temple is mentioned in the Skanda Purana, the Shiva Purana and in Kalidasa\'s Meghadūta.\n\nThe original structure was destroyed by Iltutmish in 1235 CE. Between 1732 and 1734, Maratha general Ranoji Shinde rebuilt the present temple in Bhumija style. Mahakaleshwar is considered one of the 7 Mukti-Sthalas — places that grant final liberation.\n\nUjjain is also counted as one of the Sapta Puri and Moksha-puri, and is where the Kumbh Mela (Simhastha) is held every 12 years. The recent Mahakal Lok Corridor, inaugurated in 2022, has transformed the pilgrim experience.',
    significance:
      'Mahakaleshwar is the only Jyotirlinga that is Swayambhu (self-manifested) and Dakshinamukhi. Ujjain was historically the prime meridian of India, and Shiva here is called "Mahakal" — the master of time itself.',
    deityDescription:
      'The lingam is anointed every morning with Bhasma (sacred ash), believed to be from a cremation ground — making this the only Bhasma Aarti in the world. The lingam faces south, representing Shiva as the destroyer who faces the realm of Yama.',
    mainFestivals: [
      { name: 'Maha Shivaratri', when: 'February / March' },
      { name: 'Simhastha Kumbh Mela', when: 'Every 12 years (next: 2028)' },
      { name: 'Shravan Somwar Sawari', when: 'Mondays of Shravan' },
      { name: 'Harihar Milan', when: 'Kartik month' },
      { name: 'Nag Panchami (Nagchandreshwar opens)', when: 'August' },
    ],
    openingHours: {
      morning: 'Bhasma Aarti 4:00 AM – 6:00 AM (ticketed); General darshan from 6:00 AM',
      afternoon: 'Bhog aarti 10:30 AM; Avantika Aarti 2:30 PM',
      evening: 'Sandhya Aarti 7:00 PM; Shayan Aarti 10:30 PM; closes 11:00 PM',
    },
    dressCode:
      'Bhasma Aarti requires traditional wear: men must wear only dhoti (no upper garment inside the Garbhagriha); women must wear saree. Full sleeves and trousers acceptable for general darshan.',
    howToReach: {
      nearestAirport: 'Devi Ahilyabai Holkar Airport, Indore (55 km / 1 hr)',
      nearestRailway: 'Ujjain Junction (UJN) — 2 km from the temple',
      roadDirections:
        'Ujjain is 55 km from Indore, 190 km from Bhopal. Autos and e-rickshaws from the station. Parking available at the Mahakal Corridor Gate 4.',
    },
    accommodation: [
      'Anjushree Hotel (4-star, Ujjain)',
      'Hotel Imperial Plaza',
      'Club Mahindra Ujjain (MP)',
      'Dharamshalas run by Madhya Pradesh Tourism',
      'Shri Mahakal Temple Trust Dharamshalas',
      'Hotel Rudraksh',
    ],
    pujasOffered: [
      {
        name: 'Bhasma Aarti Booking',
        price: 200,
        duration: '2 hours',
        description: 'Pre-booked entry for the 4:00 AM Bhasma Aarti — only available on official site.',
        spiritualBenefit: 'Witnessing Bhasma Aarti once is said to wash away the karmas of this birth.',
        bookExternal: true,
      },
      {
        name: 'Shighra Darshan (VIP)',
        price: 250,
        duration: '30 min',
        description: 'Priority queue for general darshan.',
        spiritualBenefit: 'Quick and peaceful darshan.',
        bookExternal: true,
      },
      {
        name: 'Rudrabhishek Puja',
        price: 1100,
        duration: '1.5 hours',
        description: 'Abhishek of the Jyotirlinga with Narmada jal, milk and panchamrit.',
        spiritualBenefit: 'Health, longevity and removal of untimely death (Akal Mrityu).',
      },
      {
        name: 'Maha Mrityunjaya Jaap (125,000)',
        price: 11000,
        duration: '3 days',
        description: '125,000 mantra recitations by 5 priests over 3 days.',
        spiritualBenefit: 'Healing from serious illness and planetary doshas.',
      },
      {
        name: 'Kaal Sarp Dosh Puja',
        price: 2500,
        duration: '3 hours',
        description: 'Special puja at Mahakaleshwar for Kaal Sarp Dosh, performed with Rahu-Ketu yantras.',
        spiritualBenefit: 'Relieves the effects of Kaal Sarp Yog in one\'s horoscope.',
      },
      {
        name: 'Nag Panchami Special Puja',
        price: 1500,
        duration: '2 hours',
        description: 'Rare puja at the Nagchandreshwar temple above Mahakal — open only once a year on Nag Panchami.',
        spiritualBenefit: 'Protection from snake fear and Sarp dosh.',
      },
      {
        name: 'Panchakroshi Yatra Sponsorship',
        price: 5100,
        duration: '5 days',
        description: 'Sponsor a group\'s participation in the traditional 118 km parikrama of Ujjain.',
        spiritualBenefit: 'Merit of all pilgrimages combined.',
      },
    ],
    photoCount: 6,
    rules: [
      'Bhasma Aarti dress code is strictly enforced — no exceptions',
      'No electronics inside (free cloakroom)',
      'Photography banned in the sanctum; allowed only in the Corridor',
      'Menstruating women traditionally avoid the sanctum',
      'Touching the lingam only during paid abhishek',
      'Carry original Aadhaar for Bhasma Aarti booking verification',
    ],
    nearbyAttractions: [
      'Kaal Bhairav Temple (where liquor is the offering!) — 8 km',
      'Harsiddhi Mata Shakti Peetha — 2 km',
      'Ram Ghat on Shipra river',
      'Sandipani Ashram (Krishna-Sudama\'s school)',
      'Mangalnath Mandir (birthplace of Mars)',
      'ISKCON Ujjain',
    ],
    specialNote:
      'The Bhasma Aarti is the most sacred ritual here — book online 60 days in advance. Walk-in slots are extremely limited. During Shravan Mondays the "Sawari" procession of Mahakal happens — a once-in-a-lifetime sight.',
    testimonials: [
      { name: 'Pradeep Kulkarni', city: 'Pune', text: 'Got Bhasma Aarti booking through the official site — experience beyond words. The 4 AM atmosphere with drums, bhasma and the lingam is pure Shiva.', rating: 5 },
      { name: 'Sneha Agarwal', city: 'Jaipur', text: 'Kaal Sarp Dosh puja was done properly with full vidhi. Video proof came within 24 hours. Felt much lighter after.', rating: 5 },
      { name: 'Harish Menon', city: 'Kochi', text: 'Shighra Darshan on a Monday saved 4 hours of queue. Worth every rupee.', rating: 4 },
    ],
    faqs: [
      { q: 'How do I book Bhasma Aarti?', a: 'Only through shrimahakaleshwar.com, 60 days in advance. ID proof required. ₹200 per person.' },
      { q: 'What is the dress code for Bhasma Aarti?', a: 'Men: only dhoti (no shirt/vest) in the sanctum. Women: saree. Bring a change of clothes.' },
      { q: 'Can children attend Bhasma Aarti?', a: 'Not recommended for children under 12 due to the early hour and discipline requirements.' },
      { q: 'Is the Mahakal Lok corridor free?', a: 'Yes, the corridor is free. Only Bhasma Aarti and Shighra Darshan are ticketed.' },
      { q: 'Which is better — Shravan Monday or Maha Shivaratri?', a: 'Shravan Mondays for the Sawari procession; Maha Shivaratri for 44-hour continuous darshan but with massive crowds.' },
    ],
  },

  omkareshwar: {
    slug: 'omkareshwar',
    name: 'Omkareshwar Jyotirlinga',
    deity: 'Lord Shiva',
    deityType: 'Shiva',
    location: 'Khandwa',
    state: 'Madhya Pradesh',
    isJyotirlinga: true,
    officialWebsite: 'https://shriomkareshwar.org',
    officialBookingUrl: 'https://shriomkareshwar.org/donation',
    history:
      'Omkareshwar sits on the Mandhata island in the Narmada river, shaped naturally like the sacred syllable "Om." It is one of the twelve Jyotirlingas, alongside a second Shiva shrine — Amareshwar — on the south bank. The combined darshan of Omkareshwar and Amareshwar is considered one Jyotirlinga darshan.\n\nKing Mandhata of the Ikshvaku dynasty is said to have worshipped Shiva here after extreme penance, granting the island its name. The present temple is in Bhumija architecture, with five floors, each housing a separate shrine.',
    significance:
      'The only Jyotirlinga in the shape of Om, reinforced by the Narmada river itself which bends to form the sacred syllable around the island. Considered a spiritually charged place for meditation.',
    deityDescription:
      'The lingam is naturally formed (Swayambhu) and is placed not at the centre of the sanctum, but to one side. Water naturally fills around the lingam — a phenomenon unique among all Jyotirlingas.',
    mainFestivals: [
      { name: 'Maha Shivaratri', when: 'February / March' },
      { name: 'Kartik Purnima', when: 'November' },
      { name: 'Narmada Jayanti', when: 'January / February' },
      { name: 'Shravan month', when: 'July / August' },
    ],
    openingHours: {
      morning: 'Mangala Aarti 5:00 AM; Darshan from 5:30 AM',
      afternoon: 'Bhog Aarti 12:20 PM',
      evening: 'Sandhya Aarti 8:20 PM; Shayan Aarti 9:30 PM',
    },
    dressCode: 'Modest traditional attire. Wet clothes after Narmada snan are acceptable — people often enter in dhoti after bathing.',
    howToReach: {
      nearestAirport: 'Devi Ahilyabai Holkar Airport, Indore (77 km)',
      nearestRailway: 'Omkareshwar Road station (12 km) / Khandwa Junction (72 km)',
      roadDirections: 'Regular buses from Indore (2 hrs) and Khandwa. The island is reached by a pedestrian bridge or ferry.',
    },
    accommodation: [
      'MPT Narmada Resort (run by MP Tourism)',
      'Shri Gajanan Maharaj Sansthan guest house',
      'Hotel Rajesh',
      'Holkar Dharamshala',
      'Several small lodges near the bridge',
    ],
    pujasOffered: [
      { name: 'Jyotirlinga Abhishek', price: 501, duration: '45 min', description: 'Traditional abhishek with Narmada jal.', spiritualBenefit: 'Sin-cleansing and peace.' },
      { name: 'Rudrabhishek', price: 1100, duration: '90 min', description: 'Rudram chanting with Panchamrit.', spiritualBenefit: 'Removes doshas; family harmony.' },
      { name: 'Narmada Aarti Sponsorship', price: 751, duration: '1 hour', description: 'Sponsor the evening Ganga-like aarti on the Narmada ghat.', spiritualBenefit: 'Blessings of Narmada Maiya.' },
      { name: 'Parikrama Puja', price: 2100, duration: 'Half day', description: 'Puja performed during the 7 km parikrama of the Om-shaped island.', spiritualBenefit: 'Circumambulation of the sacred syllable.' },
      { name: 'Kaal Sarp Dosh Nivaran', price: 2500, duration: '3 hours', description: 'Specialised Shiva puja for Kaal Sarp Yog.', spiritualBenefit: 'Relief from serpent dosha.' },
      { name: 'Mahamrityunjaya Havan', price: 3100, duration: '4 hours', description: '11,000 mantra havan in the temple precincts.', spiritualBenefit: 'Health restoration and longevity.' },
    ],
    photoCount: 4,
    rules: [
      'No leather or electronics inside',
      'Photography allowed only outside the sanctum',
      'Maintain silence on the island — it is a meditation zone',
      'Do not litter on the ghats — the Narmada is sacred',
      'Queue carefully on the narrow temple stairs',
    ],
    nearbyAttractions: [
      'Mamleshwar (Amareshwar) Temple on the south bank',
      'Siddhnath Temple (10th-century Bhumija masterpiece)',
      '24 Avatar Temple',
      'Parikrama trek (7 km around the island)',
      'Kedareshwar Temple',
      'Adi Shankara\'s Cave',
    ],
    specialNote:
      'The Adi Shankara met his guru Govinda Bhagavatpada in a cave on this island — pilgrims consider visiting the cave essential. Do both Omkareshwar and Amareshwar darshan for a complete Jyotirlinga darshan.',
    testimonials: [
      { name: 'Vikram Deshpande', city: 'Mumbai', text: 'The parikrama around the Om-shaped island at sunrise was transcendental. Narmada jal abhishek at the lingam is sacred.', rating: 5 },
      { name: 'Kavita Sharma', city: 'Lucknow', text: 'Less crowded than Mahakaleshwar — intimate and spiritual. Priest explained every step of the Rudrabhishek.', rating: 5 },
      { name: 'Sunil Joshi', city: 'Bhopal', text: 'Combined Omkareshwar and Mahakaleshwar in one trip. Omkareshwar is the hidden gem.', rating: 5 },
    ],
    faqs: [
      { q: 'Do I need to visit both Omkareshwar and Mamleshwar?', a: 'Yes, tradition says both must be visited for complete Jyotirlinga darshan.' },
      { q: 'How long does the parikrama take?', a: 'The 7 km parikrama takes 2–3 hours. Many pilgrims do it barefoot.' },
      { q: 'Can I bathe in the Narmada here?', a: 'Yes, the Brahmapuri Ghat has designated bathing areas with steps.' },
      { q: 'Is the temple wheelchair-accessible?', a: 'Partially — the approach stairs are steep, but basic assistance is available.' },
      { q: 'When is the best time to visit?', a: 'October to February; avoid peak summer when the rocks heat up.' },
    ],
  },

  kedarnath: {
    slug: 'kedarnath',
    name: 'Kedarnath Temple',
    deity: 'Lord Shiva',
    deityType: 'Shiva',
    location: 'Rudraprayag',
    state: 'Uttarakhand',
    isJyotirlinga: true,
    officialWebsite: 'https://badrinath-kedarnath.gov.in',
    officialBookingUrl: 'https://badrinath-kedarnath.gov.in/BKTC/OnlinePuja',
    officialDarshanBookingUrl: 'https://registrationandtouristcare.uk.gov.in',
    history:
      'Kedarnath sits at 3,583 m in the Garhwal Himalayas. It is among the holiest Jyotirlingas, one of the Panch Kedars, and a key stop on the Char Dham Yatra. Legend says the Pandavas, seeking Shiva to absolve the sin of killing their kin at Kurukshetra, chased him to the Himalayas. Shiva took the form of a bull and dived into the ground — leaving his hump at Kedarnath, arms at Tungnath, face at Rudranath, navel at Madhyamaheshwar and hair at Kalpeshwar.\n\nThe temple is attributed to Adi Shankaracharya (8th century), who is said to have attained mahasamadhi here; his samadhi is behind the temple. The structure has withstood centuries of harsh weather and remains closed for about 6 months each year under snow. The 2013 Kedarnath flash floods destroyed the region but spared the temple itself — the famous "Bhim Shila" boulder that stopped the waters is worshipped on the premises.',
    significance:
      'One of the Chota Char Dhams and among the 12 Jyotirlingas. Darshan of Kedarnath is considered an essential part of a Hindu life cycle, especially after Badrinath.',
    deityDescription:
      'The lingam is a conical, pyramidal rock — the hump of the bull form of Shiva. It is unique among Jyotirlingas for being triangular rather than cylindrical.',
    mainFestivals: [
      { name: 'Temple Opening (Kapat Kholna)', when: 'Akshaya Tritiya (April/May)' },
      { name: 'Temple Closing (Kapat Bandh)', when: 'Bhai Dooj after Diwali (October/November)' },
      { name: 'Badri-Kedar Utsav', when: 'June' },
      { name: 'Maha Shivaratri (at Ukhimath winter seat)', when: 'February / March' },
    ],
    openingHours: {
      morning: 'Kapat opens 4:00 AM; Mahabhishek 4:00 AM – 7:00 AM',
      afternoon: 'General darshan 7:00 AM – 3:00 PM',
      evening: 'Shringar and Sandhya Aarti 5:00 PM – 7:00 PM; Shayan Aarti 8:30 PM',
    },
    dressCode: 'Warm woollens mandatory — even in summer temperatures are 5–15°C. Traditional attire preferred for sanctum entry.',
    howToReach: {
      nearestAirport: 'Jolly Grant Airport, Dehradun (239 km). Helicopter from Dehradun/Phata/Guptkashi recommended.',
      nearestRailway: 'Rishikesh (223 km) or Haridwar (240 km)',
      roadDirections:
        'Road journey ends at Gaurikund (15 km from temple). The final 15 km must be covered on foot, pony, doli (palanquin) or helicopter. Trek takes 5–7 hours one way.',
    },
    accommodation: [
      'GMVN Tourist Rest House (government)',
      'Punjab Sindh Awas (dharamshala)',
      'Sri Bharat Sewa Ashram',
      'Guptkashi hotels (for early-morning trek start)',
      'Kedarnath Tent City (seasonal)',
      'Phata and Sitapur hotels (helicopter base)',
    ],
    pujasOffered: [
      { name: 'Mahabhishek (Sanctum Entry)', price: 1100, duration: '90 min', description: 'Only puja that grants entry into the Garbhagriha; performed 4-7 AM.', spiritualBenefit: 'Highest Kedarnath ritual; touching Shiva himself.', bookExternal: true },
      { name: 'Rudrabhishek', price: 1900, duration: '90 min', description: 'Full Rudram chanting with Panchamrit and Gangotri jal.', spiritualBenefit: 'Health, prosperity, longevity.' },
      { name: 'Shodashopachar Puja', price: 2500, duration: '2 hours', description: '16-step traditional puja.', spiritualBenefit: 'Removes accumulated negative karma.' },
      { name: 'Laghu Rudra', price: 7500, duration: '4 hours', description: '11 priests chanting Rudram 11 times.', spiritualBenefit: 'Major sankalp fulfilment.' },
      { name: 'Maha Rudra', price: 21000, duration: 'Full day', description: '121 Rudram chants with havan.', spiritualBenefit: 'Once-in-a-lifetime puja at Kedar.' },
      { name: 'Samputit Maha Rudra', price: 51000, duration: '3 days', description: 'The most elaborate Shiva puja — 1,331 Rudram chants.', spiritualBenefit: 'Reserved for major life sankalps.' },
      { name: 'Helicopter Darshan Package', price: 8000, duration: '4 hours', description: 'Phata/Sirsi – Kedarnath helicopter + priority darshan.', spiritualBenefit: 'Accessible darshan for elderly/health-limited devotees.', bookExternal: true },
    ],
    photoCount: 5,
    rules: [
      'Registration mandatory via registrationandtouristcare.uk.gov.in',
      'Health certificate required for devotees above 55 or with conditions',
      'Do not attempt the trek in poor weather — follow rescue team guidance',
      'No plastic bottles allowed on the trek',
      'Photography permitted in the outer courtyard; not in sanctum',
      'Helicopter tickets only via IRCTC Heli Yatra portal',
    ],
    nearbyAttractions: [
      'Bhairavnath Temple (essential post-darshan stop)',
      'Adi Shankara Samadhi (behind the temple)',
      'Gauri Kund (hot springs)',
      'Vasuki Tal (trek)',
      'Chorabari Tal / Gandhi Sarovar',
      'Triyuginarayan (Shiva-Parvati wedding site)',
    ],
    specialNote:
      'Temple remains open only 6 months a year (late April/May to November). In winter the deity is shifted to Omkareshwar Temple, Ukhimath. Registration and health check are mandatory. Carry warm clothing, ID proof, medicines and emergency cash.',
    testimonials: [
      { name: 'Jitendra Rana', city: 'Delhi', text: 'Trekked from Gaurikund — 7 hours up. The moment you see the Kedarnath temple against the snow peaks, the fatigue vanishes.', rating: 5 },
      { name: 'Lata Prabhu', city: 'Mumbai', text: 'Booked helicopter and Mahabhishek together. Touched the lingam — tears just flowed. Pure Mahadev.', rating: 5 },
      { name: 'Ramesh Agarwal', city: 'Kolkata', text: 'Darshya arranged the puja and priests booked in advance. No hassle on ground.', rating: 5 },
    ],
    faqs: [
      { q: 'When is Kedarnath open?', a: 'Late April/May (Akshaya Tritiya) to October/November (Bhai Dooj). Exact dates announced yearly.' },
      { q: 'Is helicopter available?', a: 'Yes — from Phata, Sirsi and Guptkashi. Book only via IRCTC Heli Yatra (official).' },
      { q: 'How hard is the trek?', a: '15–16 km one way from Gaurikund, steep in parts. Ponies and dolis available. Plan 2 days for a comfortable yatra.' },
      { q: 'Can I visit in winter?', a: 'No. Visit Omkareshwar Temple, Ukhimath, where the deity is worshipped during the winter months.' },
      { q: 'Do I need to register?', a: 'Yes, all pilgrims must register on registrationandtouristcare.uk.gov.in — mandatory since 2022.' },
    ],
  },

  bhimashankar: {
    slug: 'bhimashankar',
    name: 'Bhimashankar Jyotirlinga',
    deity: 'Lord Shiva',
    deityType: 'Shiva',
    location: 'Pune',
    state: 'Maharashtra',
    isJyotirlinga: true,
    officialWebsite: 'https://shreekshetrabhimashankar.com',
    history:
      'Bhimashankar is nestled in the Sahyadri hills of the Western Ghats, about 110 km from Pune. It is among the twelve Jyotirlingas and the source of the Bhima river. Legend holds that Lord Shiva took the form of Bhima here to destroy the demon Tripurasura. His sweat flowing from the battle formed the Bhima river.\n\nThe temple is in Nagara style with influences of Hemadpanti architecture, built between the 13th and 18th centuries. Nana Phadnavis, the Maratha statesman, donated the Shikhara (spire). The 5-ton "Roman bell" was gifted by Chimaji Appa, brother of Peshwa Bajirao I, after his victory over the Portuguese at Vasai.',
    significance:
      'Jyotirlinga status combined with a pristine Western Ghats forest setting makes Bhimashankar spiritually and ecologically unique. Home to the endangered Malabar Giant Squirrel.',
    deityDescription:
      'The Swayambhu lingam is large, stout and fixed in place. Devotees can offer water and bilva patra directly.',
    mainFestivals: [
      { name: 'Maha Shivaratri', when: 'February / March' },
      { name: 'Tripuri Purnima', when: 'November' },
      { name: 'Shravan Somwar', when: 'Mondays of Shravan' },
      { name: 'Kartika Purnima', when: 'November' },
    ],
    openingHours: {
      morning: 'Kakad Aarti 4:30 AM; darshan from 5:00 AM',
      afternoon: 'Madhyan Aarti 12:00 PM',
      evening: 'Sandhya Aarti 7:30 PM; closes 9:30 PM',
    },
    dressCode: 'Traditional attire preferred. Carry layers — the hills are cool year-round.',
    howToReach: {
      nearestAirport: 'Pune International Airport (125 km)',
      nearestRailway: 'Pune Junction (110 km) / Khed (67 km)',
      roadDirections:
        'From Pune via Chakan, Manchar, Ghodegaon — 110 km, 3.5 hrs. The last 50 km is ghat road with sharp bends. Buses run from Pune\'s Shivajinagar stand.',
    },
    accommodation: [
      'Blue Mormon Resort (forest lodging)',
      'MTDC Bhimashankar Resort',
      'Raosaheb Hotel',
      'Kulkarni Niwas (homestay)',
      'Manchar hotels (50 km away)',
    ],
    pujasOffered: [
      { name: 'Rudrabhishek', price: 501, duration: '1 hour', description: 'Abhishek with Panchamrit and holy water.', spiritualBenefit: 'Relief from doshas, family wellbeing.' },
      { name: 'Laghu Rudra', price: 2500, duration: '3 hours', description: '11 Rudram chants by priest team.', spiritualBenefit: 'Major sankalp fulfillment.' },
      { name: 'Shiv Sahasranama Archana', price: 751, duration: '90 min', description: '1,008 names of Shiva with bilva offering.', spiritualBenefit: 'Overall wellbeing.' },
      { name: 'Mahashivaratri Special Puja', price: 1100, duration: '3 hours', description: 'Night-long 4-prahar puja.', spiritualBenefit: 'Highest merit — once a year only.' },
      { name: 'Annadaan Seva', price: 1501, duration: '1 day', description: 'Sponsor meals for pilgrims at the Annachhatra.', spiritualBenefit: 'Anna-daan mahat-daan.' },
      { name: 'Tripuri Purnima Deepotsav', price: 501, duration: 'Evening', description: 'Sponsor lamps for the full-moon lighting.', spiritualBenefit: 'Prosperity and light in the home.' },
    ],
    photoCount: 4,
    rules: [
      'Single-use plastics prohibited — this is a wildlife sanctuary',
      'Do not feed or disturb the Malabar Giant Squirrels',
      'Photography in sanctum not allowed',
      'Respect the silence of the forest ghats on approach',
      'Drive carefully on the ghat road — frequent fog',
    ],
    nearbyAttractions: [
      'Hanuman Lake (Hanuman Talav)',
      'Gupt Bhimashankar',
      'Nagphani Viewpoint',
      'Bhimashankar Wildlife Sanctuary trails',
      'Mokshakund Tirtha',
    ],
    specialNote:
      'The approach is a beautiful drive through the Sahyadri forest. Trek routes from Khandas (6–7 hours) and Shidi ghat are popular with fit pilgrims. Visit on a weekday to avoid Pune weekend crowds.',
    testimonials: [
      { name: 'Sanjana Joshi', city: 'Pune', text: 'Drove up with family for Shravan Somwar — the forest road, the old temple, the Sahyadri air — pure peace.', rating: 5 },
      { name: 'Prasad Rane', city: 'Mumbai', text: 'Trekked from Khandas — 7 hours up. Reaching the lingam after that climb is unforgettable.', rating: 5 },
      { name: 'Meenal Kale', city: 'Nashik', text: 'Rudrabhishek was short but proper. Good experience.', rating: 4 },
    ],
    faqs: [
      { q: 'Can I drive up to the temple?', a: 'Yes, parking is 300 m from the temple entrance. Road is narrow and windy.' },
      { q: 'Is the trek suitable for children?', a: 'Khandas trek is steep; not recommended under 10. Shidi ghat route has steps.' },
      { q: 'Best time to visit?', a: 'October to February (pleasant); monsoon (June-Sept) is beautiful but roads can be dangerous.' },
      { q: 'Can I see wildlife?', a: 'Yes — Malabar Giant Squirrels are commonly seen from the forest trails around the temple.' },
      { q: 'Any ATM or food nearby?', a: 'Basic stalls near temple. Carry cash — ATMs unreliable.' },
    ],
  },

  trimbakeshwar: {
    slug: 'trimbakeshwar',
    name: 'Trimbakeshwar Jyotirlinga',
    deity: 'Lord Shiva',
    deityType: 'Shiva',
    location: 'Nashik',
    state: 'Maharashtra',
    isJyotirlinga: true,
    officialWebsite: 'https://trimbakeshwar.org',
    officialBookingUrl: 'https://trimbakeshwar.org/online-pooja',
    history:
      'Trimbakeshwar is at the source of the Godavari river, in the Brahmagiri hills, about 28 km from Nashik. It is one of the twelve Jyotirlingas, uniquely featuring three lingams (tri-mukhi) representing Brahma, Vishnu and Shiva — making it the only "Tridev Jyotirlinga."\n\nThe current temple was built by Peshwa Balaji Baji Rao (Nanasaheb Peshwa) between 1755 and 1786, replacing an older shrine. It is carved in black basalt in the Hemadpanti style. Trimbakeshwar is famous for Narayan Nagbali, Kaal Sarp, Tripindi and Pitru Dosha Nivaran pujas.',
    significance:
      'Only Jyotirlinga with the three supreme deities in one lingam. The source of the Godavari (Gautami Ganga) makes it one of the holiest pilgrimage sites for the entire Deccan.',
    deityDescription:
      'The three thumb-sized lingams representing Brahma (the creator), Vishnu (the preserver) and Shiva (the destroyer) are set in a shallow depression filled with flowing Godavari water.',
    mainFestivals: [
      { name: 'Maha Shivaratri', when: 'February / March' },
      { name: 'Nashik Kumbh Mela', when: 'Every 12 years (next: 2027)' },
      { name: 'Rath Yatra', when: 'October / November' },
      { name: 'Tripuri Purnima', when: 'November' },
    ],
    openingHours: {
      morning: '5:30 AM to 12:00 PM',
      afternoon: 'Closed 1:00 PM to 4:00 PM',
      evening: '4:30 PM to 9:00 PM; Shayana Aarti 8:30 PM',
    },
    dressCode:
      'Men must wear only dhoti/sovala (no shirt/vest) for Antargruha darshan and Kaal Sarp puja. Women must wear sarees for inner sanctum entry.',
    howToReach: {
      nearestAirport: 'Nashik Airport (30 km) / Mumbai Airport (180 km)',
      nearestRailway: 'Nashik Road (40 km)',
      roadDirections:
        'From Nashik — 28 km via NH848. Regular buses and taxis. Mumbai – Trimbakeshwar is 180 km, 4 hours.',
    },
    accommodation: [
      'Hotel Royal Sarovar Portico (Nashik)',
      'Ibis Nashik',
      'Sayaji Trimbakeshwar (near temple)',
      'Trimbakeshwar Devasthan Trust guest house',
      'Shri Balaji Yatri Niwas',
      'Numerous small lodges near temple',
    ],
    pujasOffered: [
      { name: 'Jyotirlinga Darshan Pass', price: 200, duration: '30 min', description: 'Priority darshan bypass.', spiritualBenefit: 'Peaceful darshan.', bookExternal: true },
      { name: 'Rudrabhishek', price: 1100, duration: '1 hour', description: 'Abhishek of the Tridev lingam.', spiritualBenefit: 'Combined grace of Brahma, Vishnu, Shiva.' },
      { name: 'Kaal Sarp Dosh Nivaran Puja', price: 5100, duration: '5 hours', description: 'Full-day puja with Rahu-Ketu mantras; the most popular puja here.', spiritualBenefit: 'Removes Kaal Sarp Dosh from horoscope — a Trimbak speciality.' },
      { name: 'Narayan Nagbali Puja', price: 7500, duration: '3 days', description: 'Special puja for unfulfilled ancestors and snake-killing karma.', spiritualBenefit: 'Resolves childless couples\' ancestral blockage; only performed at Trimbakeshwar.' },
      { name: 'Tripindi Shraddha', price: 2100, duration: '2 hours', description: 'Shraddha ritual for three generations of unfulfilled ancestors.', spiritualBenefit: 'Peace for restless pitru.' },
      { name: 'Maha Rudra', price: 11000, duration: 'Full day', description: '121 Rudram chants with havan.', spiritualBenefit: 'Major sankalp pooja.' },
      { name: 'Antargruha Darshan (Sanctum Entry)', price: 200, duration: '15 min', description: 'Paid sanctum entry — Mondays only.', spiritualBenefit: 'Rare direct darshan.', bookExternal: true },
    ],
    photoCount: 5,
    rules: [
      'Strict dress code for inner sanctum — men in sovala only',
      'Electronics banned inside (free cloakroom)',
      'Mondays have Antargruha Darshan (sanctum open to public)',
      'Kaal Sarp puja requires full day — no shortcut',
      'Beware of touts claiming to arrange faster pujas — book only through temple or verified platforms',
      'Carry Gotra details and ancestor names for Narayan Nagbali',
    ],
    nearbyAttractions: [
      'Brahmagiri hill trek (source of Godavari)',
      'Kushavart Kund (sacred bath before puja)',
      'Anjaneri (birthplace of Hanuman)',
      'Pandavleni Caves (Nashik)',
      'Saptashrungi Devi (60 km)',
      'Ramkund, Nashik',
    ],
    specialNote:
      'Trimbakeshwar is THE place for Kaal Sarp Dosh Nivaran and Narayan Nagbali pujas — pilgrims come from across India specifically for these. Book priest and accommodation well in advance. Antargruha darshan is only on Mondays.',
    testimonials: [
      { name: 'Anup Khurana', city: 'Delhi', text: 'Did Narayan Nagbali over 3 days — life-changing experience. Priests were patient and explained every step.', rating: 5 },
      { name: 'Sonali Deshmukh', city: 'Pune', text: 'Kaal Sarp Dosh puja done properly. Booking via Darshya was transparent, no haggling.', rating: 5 },
      { name: 'Rajesh Singh', city: 'Patna', text: 'The Brahmagiri trek to the Godavari source at sunrise was the highlight. Rudrabhishek was peaceful.', rating: 5 },
    ],
    faqs: [
      { q: 'What is Kaal Sarp Dosh?', a: 'When all 7 planets in a horoscope are placed between Rahu and Ketu, it is called Kaal Sarp Yog/Dosh. Trimbakeshwar is traditionally the place to perform the nivaran puja.' },
      { q: 'How long does Narayan Nagbali take?', a: '3 full days. Budget for 4 nights stay.' },
      { q: 'Is there a fee for general darshan?', a: 'Free. Only Antargruha Darshan (inside sanctum) on Mondays is paid at ₹200.' },
      { q: 'Men\'s dress for inner sanctum?', a: 'Only dhoti/sovala (a cotton unstitched cloth). Vests, shirts and trousers not allowed inside.' },
      { q: 'Can I combine with Shirdi?', a: 'Yes, Shirdi is 120 km away — common 2-day combined itinerary.' },
    ],
  },

  grishneshwar: {
    slug: 'grishneshwar',
    name: 'Grishneshwar Jyotirlinga',
    deity: 'Lord Shiva',
    deityType: 'Shiva',
    location: 'Aurangabad',
    state: 'Maharashtra',
    isJyotirlinga: true,
    officialWebsite: 'https://grishneshwar.in',
    history:
      'Grishneshwar (Ghrishneshwar) is the last (12th) Jyotirlinga in the traditional Dwadasha Jyotirlinga stotra of Adi Shankaracharya. It sits in Verul village, 30 km from Aurangabad, right next to the UNESCO World Heritage Ellora Caves.\n\nLegend tells of Kusuma, a devout Shiva bhakt, whose son was murdered by her jealous co-wife Ghushma. Kusuma refused to abandon her Shiva worship, and the lingam she worshipped in a nearby pond restored her son to life. Shiva granted Kusuma\'s wish to remain there as the Grishneshwar Jyotirlinga.\n\nThe present temple was rebuilt in the 18th century by Maloji Raje Bhosale (grandfather of Shivaji Maharaj) and later by Ahilyabai Holkar. It is built in red basalt in the Shikhara style, with intricate carvings rivaling the Ellora caves next door.',
    significance:
      'Being the 12th and final Jyotirlinga, many pilgrims consider the Jyotirlinga Yatra incomplete without Grishneshwar. Its proximity to Ellora makes it a combined heritage + pilgrimage destination.',
    deityDescription:
      'The lingam is east-facing, with a water-filled Jalharini. The temple also houses Nandi, Ganesha and Vishnu shrines.',
    mainFestivals: [
      { name: 'Maha Shivaratri', when: 'February / March' },
      { name: 'Tripuri Purnima', when: 'November' },
      { name: 'Shravan Somwar', when: 'July / August Mondays' },
    ],
    openingHours: {
      morning: '5:30 AM; Kakad Aarti 4:00 AM',
      afternoon: 'General darshan till 12:30 PM; reopens 3:00 PM',
      evening: 'Sandhya Aarti 7:30 PM; closes 9:30 PM',
    },
    dressCode: 'Men must remove shirts for sanctum entry. Traditional attire preferred.',
    howToReach: {
      nearestAirport: 'Aurangabad (Chhatrapati Sambhajinagar) Airport — 35 km',
      nearestRailway: 'Aurangabad Railway Station (30 km)',
      roadDirections: 'From Aurangabad — 30 km to Verul via Ellora Road. Well-marked highway.',
    },
    accommodation: [
      'Hotel Kailas (Ellora, right next to Grishneshwar)',
      'Ajanta Ambassador (Aurangabad)',
      'Vivanta by Taj Aurangabad',
      'Lemon Tree Hotel Aurangabad',
      'Hotel Regal Plaza',
    ],
    pujasOffered: [
      { name: 'Rudrabhishek', price: 501, duration: '1 hour', description: 'Traditional abhishek with panchamrit.', spiritualBenefit: 'Family wellbeing and health.' },
      { name: 'Jyotirlinga Archana', price: 301, duration: '30 min', description: 'Flower and bilva patra archana.', spiritualBenefit: 'Darshan enhancement.' },
      { name: 'Laghu Rudra', price: 2500, duration: '3 hours', description: '11 Rudram chants.', spiritualBenefit: 'Specific sankalp fulfillment.' },
      { name: 'Maha Rudra', price: 11000, duration: 'Full day', description: '121 Rudram with havan.', spiritualBenefit: 'Life-changing sankalp.' },
      { name: 'Shiva Sahasranama Path', price: 751, duration: '1.5 hours', description: '1,008 names of Shiva recitation.', spiritualBenefit: 'Overall spiritual cleansing.' },
      { name: 'Anna-daan Seva', price: 1100, duration: '1 meal', description: 'Sponsor meals for pilgrims.', spiritualBenefit: 'Anna-daan merit.' },
    ],
    photoCount: 4,
    rules: [
      'Men must enter the sanctum bare-chested',
      'No electronics in the sanctum',
      'Photography allowed outside only',
      'Follow queue discipline',
      'Keep Ellora combo in the same day for efficiency',
    ],
    nearbyAttractions: [
      'Ellora Caves (500 m — UNESCO site, Kailasa Temple)',
      'Daulatabad Fort (15 km)',
      'Bibi Ka Maqbara (Aurangabad)',
      'Panchakki (Aurangabad)',
      'Ajanta Caves (100 km)',
    ],
    specialNote:
      'Plan to cover Ellora Caves and Grishneshwar in one day. Ellora\'s Cave 16 (Kailasa Temple) is one of the most stunning monuments in India — a single rock carved into a full Shiva temple. Grishneshwar darshan is traditionally done after Ellora.',
    testimonials: [
      { name: 'Sharad Deshpande', city: 'Pune', text: 'Completed my 12 Jyotirlinga yatra here. Emotional moment. The temple is simple but powerful.', rating: 5 },
      { name: 'Renuka Iyer', city: 'Chennai', text: 'Combined with Ellora in one day — perfect plan. Rudrabhishek was serene.', rating: 5 },
      { name: 'Ashok Deshmukh', city: 'Mumbai', text: 'Lesser crowds than other Jyotirlingas — you can actually spend time at the lingam.', rating: 4 },
    ],
    faqs: [
      { q: 'Why must men be shirtless?', a: 'An old custom at Grishneshwar — men must enter the garbhagriha bare-chested, symbolising humility before Shiva.' },
      { q: 'Is Ellora Caves walking distance?', a: 'Yes, 500 m. You can comfortably cover both in half a day.' },
      { q: 'Best time to visit?', a: 'October to March. Summer Aurangabad is very hot.' },
      { q: 'Is there a fee?', a: 'Free darshan. Pujas are paid.' },
      { q: 'Parking?', a: 'Yes, free parking near the temple.' },
    ],
  },

  'baidyanath-dham': {
    slug: 'baidyanath-dham',
    name: 'Baidyanath Jyotirlinga (Baba Dham)',
    deity: 'Lord Shiva',
    deityType: 'Shiva',
    location: 'Deoghar',
    state: 'Jharkhand',
    isJyotirlinga: true,
    officialWebsite: 'https://babadham.org',
    officialBookingUrl: 'https://babadham.org/online-puja',
    history:
      'Baidyanath Dham (Vaidyanath) in Deoghar is among the twelve Jyotirlingas and one of the most-visited Shiva shrines in India, particularly during Shravan. Legend says Ravana carried a Shiva lingam from Kailash toward Lanka but had to put it down at Deoghar — where it became fixed. Vishnu, disguised as a Brahmin, tricked Ravana into setting it down. Shiva here is the "Lord of Physicians" — Vaidyanath — and is believed to cure ailments.\n\nDeoghar ("abode of God") is part of the Shravani Mela, during which millions of Kanwariyas walk 108 km barefoot from Sultanganj carrying Ganga jal on bamboo poles, to offer at Baidyanath.',
    significance:
      'Unique among Jyotirlingas for also being a Shakti Peetha (where Sati\'s heart fell). Simultaneous Shiva + Shakti darshan makes it doubly powerful. Also the healing Jyotirlinga.',
    deityDescription:
      'The Swayambhu lingam is 5 inches above the floor, with a top slightly cupped to hold water. It is enclosed in an elaborate silver altar.',
    mainFestivals: [
      { name: 'Shravani Mela (Kanwar Yatra)', when: 'Shravan — July/August' },
      { name: 'Maha Shivaratri', when: 'February / March' },
      { name: 'Basant Panchami', when: 'January / February' },
      { name: 'Bhadrapada Shravani Mela', when: 'September' },
    ],
    openingHours: {
      morning: 'Shringar Puja 4:00 AM; darshan from 4:30 AM',
      afternoon: 'Darshan continues till 3:30 PM (brief closure)',
      evening: '6:00 PM to Shringar Puja 8:00 PM; closes 9:00 PM',
    },
    dressCode: 'Traditional attire. During Shravan, Kanwariyas wear saffron kurta-dhoti.',
    howToReach: {
      nearestAirport: 'Deoghar Airport (10 km) — direct flights from Delhi, Kolkata, Mumbai',
      nearestRailway: 'Jasidih Junction (7 km); Baidyanath Dham station (2 km)',
      roadDirections:
        'From Ranchi — 250 km, 6 hrs. From Patna — 280 km, 6 hrs. From Kolkata — 370 km, 8 hrs.',
    },
    accommodation: [
      'Hotel Yashoda International',
      'Baba Baidyanath Temple Trust dharamshalas',
      'Hotel Tanu Palace',
      'Vrindavan Hotel Deoghar',
      'Numerous budget lodges near the temple',
    ],
    pujasOffered: [
      { name: 'Shringar Puja', price: 1100, duration: '1 hour', description: 'Morning adornment puja with silver ornaments.', spiritualBenefit: 'Prosperity and beauty in the home.' },
      { name: 'Rudrabhishek', price: 751, duration: '90 min', description: 'Full Rudram abhishek.', spiritualBenefit: 'Healing from chronic illness (Baba Vaidyanath\'s speciality).' },
      { name: 'Laghu Rudra', price: 3100, duration: '3 hours', description: '11 Rudram chants.', spiritualBenefit: 'Major health and dosha relief.' },
      { name: 'Shravani Mela Kanwar Jal Offering', price: 500, duration: '2 hours', description: 'Assisted offering of Ganga jal during the Shravani Mela.', spiritualBenefit: 'Equivalent merit of a full Kanwar Yatra.', bookExternal: true },
      { name: 'Rogashanti Special Puja', price: 2100, duration: '2 hours', description: 'Dedicated healing puja — this is the "Lord of Physicians" shrine.', spiritualBenefit: 'Healing of physical and mental ailments.' },
      { name: 'Night Shringar Sponsorship', price: 5100, duration: 'Evening', description: 'Sponsor the 8 PM evening shringar aarti.', spiritualBenefit: 'Family sankalp fulfillment.' },
    ],
    photoCount: 5,
    rules: [
      'During Shravan, expect 12+ hour queues for general darshan — booking essential',
      'Kanwariyas have dedicated lanes',
      'No leather or electronics',
      'Maintain silence in the sanctum',
      'Prasad distribution is organised — do not rush',
    ],
    nearbyAttractions: [
      'Naulakha Temple (2 km)',
      'Basukinath Dham (42 km — must-visit post Baidyanath)',
      'Tapovan Hill',
      'Trikuta Parvata',
      'Satsang Ashram (Anukul Chandra Thakur)',
    ],
    specialNote:
      'Baidyanath is both a Jyotirlinga AND Shakti Peetha (where Sati\'s heart fell). Traditional pilgrims visit Basukinath (42 km away) immediately after Baidyanath to complete the "Baba Baidyanath – Basukinath" yatra. During Shravani Mela (Jul-Aug), book pujas online well in advance.',
    testimonials: [
      { name: 'Ajit Kumar', city: 'Patna', text: 'Did Kanwar Yatra from Sultanganj — 108 km, 4 days barefoot. Offering Ganga jal at Baba Dham is the peak of a Shiv bhakt\'s life.', rating: 5 },
      { name: 'Sarita Jha', city: 'Ranchi', text: 'Rogashanti puja for my father\'s illness — within 2 months he recovered. Baba Vaidyanath ki kripa.', rating: 5 },
      { name: 'Mukesh Agarwal', city: 'Kolkata', text: 'Visited during Shravan. Crowds are intense but the energy is divine.', rating: 5 },
    ],
    faqs: [
      { q: 'What is Shravani Mela?', a: 'The month-long festival in Shravan where Kanwariyas walk 108 km from Sultanganj to Deoghar carrying Ganga jal. July–August.' },
      { q: 'Is Baidyanath a Shakti Peetha?', a: 'Yes — it\'s unique in being both a Jyotirlinga and Shakti Peetha, where Sati\'s heart is believed to have fallen.' },
      { q: 'Best time to visit?', a: 'October–March for pleasant weather. Shravan for the spiritual intensity but expect crowds.' },
      { q: 'Can I book darshan online?', a: 'Yes, through babadham.org. VIP darshan and puja bookings available.' },
      { q: 'Nearby must-visit?', a: 'Basukinath Dham, 42 km away. Pilgrims typically do both in one trip.' },
    ],
  },

  rameswaram: {
    slug: 'rameswaram',
    name: 'Rameswaram Temple (Ramanathaswamy)',
    deity: 'Lord Shiva (Ramanathaswamy)',
    deityType: 'Shiva',
    location: 'Rameswaram',
    state: 'Tamil Nadu',
    isJyotirlinga: true,
    officialWebsite: 'https://rameswaramtemple.tnhrce.in',
    history:
      'Rameswaram, on Pamban island in Tamil Nadu, holds the Ramanathaswamy temple — among the twelve Jyotirlingas and one of the four Char Dhams. Legend: after killing Ravana, Lord Rama was afflicted with Brahmahatya dosha (killing a Brahmin, as Ravana was one). On advice, Rama decided to worship Shiva to cleanse the sin. Hanuman was sent to Kailash to fetch a Shiva lingam. When Hanuman was late, Sita built a lingam from sand — this is the Ramalingam (main deity). Hanuman\'s brought lingam is placed alongside as Vishwalingam.\n\nThe temple has the longest corridor of any Hindu temple in India (over 1,200 ft), with 1,212 carved granite pillars.\n\nIt is among only two sites where both Shaiva and Vaishnava pilgrims complete their yatra (the other being Kashi).',
    significance:
      'Only Jyotirlinga installed by Lord Rama himself. Completing the Char Dham (Rameswaram – Dwarka – Puri – Badrinath) includes this temple. The 22 theerthams (sacred wells) inside the temple complex are believed to absolve all sins.',
    deityDescription:
      'The main deity is Ramalingam (made of sand by Sita). Adjacent is Vishwalingam (brought by Hanuman). Both are worshipped — with Vishwalingam traditionally touched first.',
    mainFestivals: [
      { name: 'Maha Shivaratri', when: 'February / March' },
      { name: 'Thirukalyanam (Ramanatha Marriage)', when: 'July' },
      { name: 'Rama Navami', when: 'March / April' },
      { name: 'Navaratri', when: 'September / October' },
    ],
    openingHours: {
      morning: '5:00 AM to 1:00 PM; Spathikalinga Darshan 5:00–6:00 AM',
      afternoon: 'Closed 1:00 PM to 3:00 PM',
      evening: '3:00 PM to 9:00 PM',
    },
    dressCode:
      'Men: dhoti, no shirt in inner sanctum. Women: saree or salwar. Wet clothes after 22-theertham bath are acceptable.',
    howToReach: {
      nearestAirport: 'Madurai Airport (175 km)',
      nearestRailway: 'Rameswaram Railway Station (2 km) — connected via the iconic Pamban Bridge',
      roadDirections: 'NH87 from Madurai (170 km, 4 hrs). The Pamban Bridge drive is spectacular.',
    },
    accommodation: [
      'Hyatt Place Rameswaram',
      'Hotel Pearl Residency',
      'Daiwik Hotels Rameswaram',
      'Hotel Jaya International',
      'TNTDC Tamil Nadu Hotel',
      'Dharamshalas near the temple',
    ],
    pujasOffered: [
      { name: '22 Theertham Snan', price: 100, duration: '1 hour', description: 'Bath in the 22 sacred wells inside the temple complex, with assistance.', spiritualBenefit: 'Absolves all sins; mandatory part of the yatra.' },
      { name: 'Spathikalinga Darshan (Crystal Lingam)', price: 50, duration: '30 min', description: 'Early morning 5:00–6:00 AM darshan of the crystal lingam.', spiritualBenefit: 'Said to clear karma of this life.' },
      { name: 'Ramanathaswamy Abhishek', price: 1500, duration: '90 min', description: 'Sand lingam abhishek with panchamrit.', spiritualBenefit: 'Grace of Rama and Shiva combined.' },
      { name: 'Panchamrita Abhishek', price: 501, duration: '45 min', description: 'Standard abhishek.', spiritualBenefit: 'General wellbeing.' },
      { name: 'Sahasranama Archana', price: 501, duration: '1 hour', description: '1,008 names of Shiva with Bilva.', spiritualBenefit: 'Clears specific sankalps.' },
      { name: 'Rudra Homam', price: 3100, duration: '3 hours', description: 'Fire ritual with Rudram.', spiritualBenefit: 'Major dosha removal.' },
      { name: 'Tharpanam / Shraddha for Ancestors', price: 1100, duration: '2 hours', description: 'Ancestor rites at Agnitheertham.', spiritualBenefit: 'Pitru dosh nivaran — Rameswaram is famed for this.' },
    ],
    photoCount: 5,
    rules: [
      '22 theertham bath is best done first — carry extra clothes',
      'Men must be bare-chested in the sanctum',
      'No electronics inside (free cloakroom)',
      'Photography prohibited in all sanctum areas',
      'Spathikalinga Darshan requires pre-booking or early arrival',
      'Hire only authorised priests (Darshya priests or verified temple priests)',
    ],
    nearbyAttractions: [
      'Agni Theertham (sea beach adjacent)',
      'Dhanushkodi (30 km — Rama\'s land\'s-end)',
      'Pamban Bridge (iconic rail bridge)',
      'Five-faced Hanuman Temple',
      'Kothandaramaswamy Temple',
      'Dr. A.P.J. Abdul Kalam\'s House Museum',
      'Adi Jagannatha Temple (Thiruppullani)',
    ],
    specialNote:
      'Rameswaram is unique for the 22-theertham snan inside the temple — a priest or guide will draw water from each well and pour over you in sequence. Wear clothes that can get wet, and carry a change. Complete Char Dham yatra includes this temple. Pitru-dosh nivaran is a famous ritual here.',
    testimonials: [
      { name: 'Krishna Iyer', city: 'Chennai', text: 'Finished my Char Dham at Rameswaram. The 22 theertham snan followed by Ramalingam abhishek is unbeatable.', rating: 5 },
      { name: 'Asha Bhatt', city: 'Ahmedabad', text: 'Tharpanam for my late father — priest was compassionate and thorough. Felt real peace afterwards.', rating: 5 },
      { name: 'Sanjay Reddy', city: 'Hyderabad', text: 'Drive from Madurai via Pamban Bridge is scenic. The temple corridor is breathtaking.', rating: 5 },
    ],
    faqs: [
      { q: 'What are the 22 theerthams?', a: '22 sacred wells inside the temple with water from different rivers. Bathing in each is an essential ritual. A priest pulls water and pours on each devotee.' },
      { q: 'Do I need to book in advance?', a: 'For Spathikalinga Darshan (5-6 AM) — yes. Regular darshan is walk-in.' },
      { q: 'How to reach Dhanushkodi?', a: '30 km from Rameswaram; jeeps run from Rameswaram to the last land point. Moving experience — the ghost town destroyed in 1964 cyclone.' },
      { q: 'Best time to visit?', a: 'October to March. Summer is hot and humid.' },
      { q: 'Is the temple accessible?', a: 'Mostly yes; wheelchairs available. The 22 theertham trail requires walking on wet floors.' },
    ],
  },

  mallikarjuna: {
    slug: 'mallikarjuna',
    name: 'Mallikarjuna Jyotirlinga (Srisailam)',
    deity: 'Lord Shiva & Goddess Bhramaramba',
    deityType: 'Shiva',
    location: 'Srisailam',
    state: 'Andhra Pradesh',
    isJyotirlinga: true,
    isShaktiPeetha: true,
    officialWebsite: 'https://srisailadevasthanam.org',
    officialBookingUrl: 'https://onlineseva.srisailadevasthanam.org',
    history:
      'Mallikarjuna at Srisailam, on the Nallamala hills beside the Krishna river, is among the twelve Jyotirlingas and also among the 18 Maha Shakti Peethas (Bhramaramba Devi). The story: after his wedding, Kartikeya was hurt when his parents gave the divine mango to Ganesha and stormed off to Mount Kraunch. Parvati and Shiva followed to console him — and settled there as Mallikarjuna and Bhramaramba. Mallika means jasmine (Parvati\'s favourite flower), Arjuna is Shiva.\n\nThe temple finds mention in Mahabharata, Skanda Purana and Shiva Purana. Historical reconstruction and contributions came from the Satavahanas, Ikshvakus, Chalukyas, Kakatiyas, Vijayanagara and Maratha dynasties. Chhatrapati Shivaji built the northern gopuram in the 17th century.',
    significance:
      'Rare combination of Jyotirlinga + Shakti Peetha in one complex — bhakts can touch both Shiva and Shakti here. Known as the "Kashi of the South."',
    deityDescription:
      'Mallikarjuna: Swayambhu Shiva lingam. Bhramaramba: 8-armed Devi form slayer of demon Arunasura. Both sanctums in the same complex.',
    mainFestivals: [
      { name: 'Maha Shivaratri (Brahmotsavam)', when: 'February / March — 11 day festival' },
      { name: 'Kumbhotsavam', when: 'March' },
      { name: 'Ugadi', when: 'March / April' },
      { name: 'Dasara (Navaratri)', when: 'October' },
    ],
    openingHours: {
      morning: '5:00 AM to 1:00 PM; Suprabhatam 4:30 AM',
      afternoon: 'Closed 1:00 PM to 3:30 PM',
      evening: '3:30 PM to 9:00 PM; Shayana Aarti 10:00 PM',
    },
    dressCode:
      'Men: dhoti for abhishek (shirt allowed otherwise). Women: saree or churidar-salwar.',
    howToReach: {
      nearestAirport: 'Hyderabad (Rajiv Gandhi International) — 213 km',
      nearestRailway: 'Markapur Road (85 km) / Kurnool (160 km)',
      roadDirections:
        'From Hyderabad — 213 km, 5 hrs through Nallamala forest. TSRTC buses ply regularly.',
    },
    accommodation: [
      'Haritha Hotel (APTDC — government)',
      'Pathaleshwar Sadan (Devasthanam)',
      'Ganga Sadan',
      'Sri Akkamma Bhavan',
      'Numerous cottages managed by the temple trust',
    ],
    pujasOffered: [
      { name: 'Suprabhatam Seva', price: 500, duration: '1 hour', description: 'Early morning 4:30 AM awakening ceremony.', spiritualBenefit: 'Most auspicious darshan of the day.', bookExternal: true },
      { name: 'Panchamruta Abhishek', price: 1500, duration: '1 hour', description: 'Traditional 5-ingredient abhishek.', spiritualBenefit: 'Good health and wealth.' },
      { name: 'Rudrabhishek', price: 1000, duration: '1 hour', description: 'Rudram chanting abhishek.', spiritualBenefit: 'Dosha removal.' },
      { name: 'Bhramaramba Kumkum Archana', price: 501, duration: '45 min', description: 'Kumkum archana at the Shakti Peetha.', spiritualBenefit: 'Prosperity for women and family.' },
      { name: 'Saswatha Seva (Lifetime Sponsor)', price: 10000, duration: 'Lifetime annual', description: 'Annual puja in your name every year for life.', spiritualBenefit: 'Continuous blessings across years.', bookExternal: true },
      { name: 'VIP Break Darshan', price: 150, duration: '30 min', description: 'Priority queue via breakdarshan pass.', spiritualBenefit: 'Quick darshan.', bookExternal: true },
      { name: 'Kalyanotsavam', price: 3000, duration: '2 hours', description: 'Ceremonial wedding of Mallikarjuna & Bhramaramba.', spiritualBenefit: 'Marital harmony and progeny.' },
    ],
    photoCount: 5,
    rules: [
      'Sparsha darshan (touching the lingam) is only for paid abhishek participants',
      'Visit both Mallikarjuna AND Bhramaramba — a combined darshan is the Srisailam tradition',
      'Electronics banned',
      'Separate queues for men and women',
      'Book online for fast darshan',
    ],
    nearbyAttractions: [
      'Srisailam Dam (Krishna river)',
      'Bhramaramba Temple (in complex)',
      'Patala Ganga',
      'Sakshi Ganapati',
      'Hatakeshwaram',
      'Srisailam Wildlife Sanctuary (tigers!)',
    ],
    specialNote:
      'Srisailam is unique — one of the rare sites combining a Jyotirlinga and Shakti Peetha. Both Mallikarjuna and Bhramaramba must be visited. Book accommodation through the Devasthanam website — cheaper and closer than hotels.',
    testimonials: [
      { name: 'Sridhar Reddy', city: 'Bangalore', text: 'Did Suprabhatam Seva — being the first to see Mallikarjuna at 4:30 AM is surreal. The silence of the Nallamala hills amplifies it.', rating: 5 },
      { name: 'Kamakshi Iyer', city: 'Chennai', text: 'Kumkum Archana at Bhramaramba was spiritual. The combined Shiva+Shakti darshan is rare.', rating: 5 },
      { name: 'Venkat Naidu', city: 'Vijayawada', text: 'Drive through Nallamala forest was an adventure. The temple during Maha Shivaratri Brahmotsavam is spectacular.', rating: 5 },
    ],
    faqs: [
      { q: 'Can I touch the lingam?', a: 'Only during paid Abhishek sevas. General darshan is from behind the railing.' },
      { q: 'What is Bhramaramba Shakti Peetha?', a: 'The neck of Sati fell here. It\'s one of the 18 Maha Shakti Peethas and is part of the same complex.' },
      { q: 'How long to plan?', a: '1.5 days — arrive evening, Suprabhatam next morning, abhishek, both darshans, depart afternoon.' },
      { q: 'Any wildlife concerns?', a: 'The road through Nallamala sometimes sees tigers and leopards. Drive safely, avoid night travel.' },
      { q: 'Parking?', a: 'Free, plentiful, near the Devasthanam complex.' },
    ],
  },

  nageshwar: {
    slug: 'nageshwar',
    name: 'Nageshwar Jyotirlinga',
    deity: 'Lord Shiva (Nagnath)',
    deityType: 'Shiva',
    location: 'Dwarka',
    state: 'Gujarat',
    isJyotirlinga: true,
    officialWebsite: 'https://nageshwarjyotirlinga.org',
    history:
      'Nageshwar Jyotirlinga, between Dwarka and Bet Dwarka, is counted among the twelve Jyotirlingas. "Nag" means serpent, "Eshwar" means Lord — Lord of Serpents. Legend: a devout Shiva bhakt named Supriya was kidnapped by the demon Daaruka and imprisoned in his city. Supriya, undeterred, prayed to Shiva and inspired other prisoners. Shiva appeared as a radiant Jyotirlinga, killed Daaruka, and stayed as Nageshwar.\n\nThe most recognisable feature is the 25-meter tall sitting Shiva statue outside the temple, visible from a distance. The present temple was reconstructed with contributions from industrialist Gulshan Kumar (T-series).',
    significance:
      'Protector from all forms of poison (physical and metaphorical). Part of the Dwarka pilgrimage circuit.',
    deityDescription:
      'The Swayambhu lingam is Dakshinamukhi (south-facing) with a triangular shape. It is set in a sanctum below ground level — devotees descend stairs.',
    mainFestivals: [
      { name: 'Maha Shivaratri', when: 'February / March' },
      { name: 'Nag Panchami', when: 'July / August' },
      { name: 'Shravan Somwar', when: 'July / August Mondays' },
      { name: 'Kartik Purnima', when: 'November' },
    ],
    openingHours: {
      morning: '5:00 AM; Mangala Aarti 5:30 AM',
      afternoon: 'Darshan 6:00 AM to 12:30 PM; reopens 5:00 PM',
      evening: 'Shringar Aarti 7:00 PM; Shayan Aarti 8:30 PM; closes 9:00 PM',
    },
    dressCode: 'Traditional attire preferred. Shorts and sleeveless tops discouraged.',
    howToReach: {
      nearestAirport: 'Jamnagar Airport (137 km) / Rajkot (217 km)',
      nearestRailway: 'Dwarka Railway Station (17 km)',
      roadDirections: 'From Dwarka — 17 km towards Bet Dwarka. Good highway. Combine with Dwarkadhish.',
    },
    accommodation: [
      'Taj Gateway Dwarka',
      'Lords Resort Dwarka',
      'Hotel Dwarkadhish (budget)',
      'Shree Dwarkadhish Trust Dharamshalas',
      'Iskcon Guest House Dwarka',
    ],
    pujasOffered: [
      { name: 'Shringar Aarti', price: 501, duration: '1 hour', description: 'Sponsor the evening 7 PM adornment aarti.', spiritualBenefit: 'Prosperity in the home.' },
      { name: 'Rudrabhishek', price: 751, duration: '1 hour', description: 'Traditional Rudram abhishek.', spiritualBenefit: 'Protection from poison, disease and evil.' },
      { name: 'Laghu Rudra', price: 2500, duration: '3 hours', description: '11 Rudram chants by 3 priests.', spiritualBenefit: 'Removes chronic afflictions.' },
      { name: 'Nag Dosh Nivaran Puja', price: 2100, duration: '2 hours', description: 'Special puja at Nageshwar for Naga dosha (serpent karma).', spiritualBenefit: 'Nageshwar speciality — clears serpent-related karmic blocks.' },
      { name: 'Maha Mrityunjaya Jaap', price: 3100, duration: '4 hours', description: '11,000 Maha Mrityunjaya mantras.', spiritualBenefit: 'Healing and longevity.' },
      { name: 'Dwarka Parikrama Package', price: 5100, duration: '2 days', description: 'Combined Nageshwar + Dwarkadhish + Bet Dwarka + Rukmini temple puja.', spiritualBenefit: 'Complete Dwarka circuit merit.' },
    ],
    photoCount: 4,
    rules: [
      'Descend carefully — sanctum is below ground',
      'No photography inside',
      'No electronics in the sanctum',
      'Do not disturb other devotees in the narrow sanctum',
      'Combine with Dwarkadhish for full pilgrimage',
    ],
    nearbyAttractions: [
      'Dwarkadhish Temple (17 km)',
      'Bet Dwarka (island with Krishna\'s residence, boat from Okha)',
      'Rukmini Devi Temple',
      'Gopi Talav',
      'Sudama Setu (pedestrian bridge, Dwarka)',
      'Gomti Ghat',
    ],
    specialNote:
      'The 25m tall Shiva statue outside is iconic — great photo spot. Always combine with Dwarkadhish and Bet Dwarka for the complete Dwarka circuit. Nag Panchami here is especially significant.',
    testimonials: [
      { name: 'Prerna Shah', city: 'Mumbai', text: 'The giant Shiva statue outside sets the mood — then descending into the sanctum is a different world. Peaceful.', rating: 5 },
      { name: 'Nitesh Bhatt', city: 'Rajkot', text: 'Nag Dosh puja done with full vidhi. Priest was knowledgeable.', rating: 5 },
      { name: 'Kamlesh Patel', city: 'Ahmedabad', text: 'Combined Dwarka + Nageshwar + Bet Dwarka in 2 days — perfect pilgrimage.', rating: 4 },
    ],
    faqs: [
      { q: 'Distance from Dwarka?', a: '17 km, 30 min drive. Easy to combine.' },
      { q: 'Is the statue inside or outside?', a: 'Outside — the temple itself is inside a smaller structure below the statue.' },
      { q: 'Best month to visit?', a: 'October to February. Summer is hot; monsoon has good breeze.' },
      { q: 'Parking and food?', a: 'Free parking. Basic stalls outside. Dharamshalas serve meals.' },
      { q: 'Is this the Nageshwar in Almora/Aundha?', a: 'There is a debate — Dwarka, Aundha Nagnath (Maharashtra), and Jageshwar (Uttarakhand) all claim the Jyotirlinga title. Most traditional lists name Dwarka.' },
    ],
  },

  'tirupati-balaji': {
    slug: 'tirupati-balaji',
    name: 'Tirumala Tirupati Venkateswara Temple',
    deity: 'Lord Venkateswara (Balaji)',
    deityType: 'Vishnu',
    location: 'Tirumala',
    state: 'Andhra Pradesh',
    isDivyaDesam: true,
    officialWebsite: 'https://tirupatibalaji.ap.gov.in',
    officialBookingUrl: 'https://tirupatibalaji.ap.gov.in/#!/onlineServices',
    officialDarshanBookingUrl: 'https://tirupatibalaji.ap.gov.in/#!/onlineServices',
    history:
      'Tirumala Venkateswara Temple, on the Tirumala hills in Andhra Pradesh, is dedicated to Lord Venkateswara (Balaji) — an incarnation of Lord Vishnu. It is the richest Hindu temple in the world and the most-visited place of worship anywhere, with 50,000–100,000 devotees daily.\n\nThe temple is mentioned in the Alwars\' Divya Prabandham (8th century) and is one of the 108 Divya Desams. It was developed by successive dynasties — Pallavas, Cholas, Pandyas, Vijayanagara emperors (notably Krishnadevaraya) — and endowed with vast gold and jewels. The TTD (Tirumala Tirupati Devasthanams) trust manages it today.\n\nThe self-manifested deity has a permanent sheen of camphor and the famed "Suprabhatam" awakening hymn has become world-renowned.',
    significance:
      'Believed that Lord Venkateswara took a loan from Kubera (god of wealth) to marry Goddess Padmavathi, and the interest is being repaid by devotees through the hundi (donation box). The Tirumala hundi collects over ₹1,500 crores annually.',
    deityDescription:
      'The 8-foot Swayambhu murti stands in the sanctum with a thick layer of fragrant paste (karpura-kaapu) that is replenished every Friday during the Abhishekam.',
    mainFestivals: [
      { name: 'Brahmotsavams', when: 'September/October — 9 days' },
      { name: 'Vaikunta Ekadashi', when: 'December / January' },
      { name: 'Rathasapthami', when: 'February' },
      { name: 'Garuda Seva', when: 'During Brahmotsavams' },
    ],
    openingHours: {
      morning: 'Suprabhatam 3:00 AM; Tomala Seva 3:30 AM; General darshan from 6:00 AM',
      afternoon: 'Continuous darshan till 5:00 PM',
      evening: 'Darshan 6:00 PM to 12:00 AM; Ekanta Seva 1:30 AM',
    },
    dressCode: 'Traditional attire mandatory. Men: dhoti/pant-shirt. Women: saree/chudidar with dupatta. No Western wear (jeans, shirts untucked, shorts). T-shirts allowed but avoid logos.',
    howToReach: {
      nearestAirport: 'Tirupati Airport (15 km)',
      nearestRailway: 'Tirupati Station (28 km from Tirumala)',
      roadDirections: 'Ghat road from Tirupati (28 km, 45 min). TTD buses from Alipiri. Pedestrian trek via Alipiri Metlu (11 km) or Srivari Mettu (2 km).',
    },
    accommodation: [
      'TTD Cottages — Nandakam, Sreenivasam, Padmavathi Guest House (book via TTD online)',
      'Hotel Sitara Grand',
      'Marasa Sarovar Premiere',
      'Minerva Grand Tirupati',
      'ISKCON Guest House',
      'Bhimas Deluxe Hotel',
    ],
    pujasOffered: [
      { name: 'Sarva Darshan (Free)', price: 0, duration: '4-8 hours', description: 'General free darshan — expect long queues.', spiritualBenefit: 'Basic darshan of Balaji.', bookExternal: true },
      { name: 'Special Entry Darshan (₹300)', price: 300, duration: '2-3 hours', description: 'Tirumala\'s Seeghra darshan ticket.', spiritualBenefit: 'Quicker darshan.', bookExternal: true },
      { name: 'VIP Break Darshan (₹600 virtual)', price: 600, duration: '1 hour', description: 'Faster priority queue.', spiritualBenefit: 'Quick divine darshan.', bookExternal: true },
      { name: 'Suprabhatam Seva', price: 250, duration: '1 hour', description: 'Witness the 3:00 AM awakening ceremony.', spiritualBenefit: 'Most auspicious moment of the day.', bookExternal: true },
      { name: 'Archana Seva (Sankalpam)', price: 500, duration: '45 min', description: 'Personalised archana in your name and gotra.', spiritualBenefit: 'Deity hears your specific sankalp.', bookExternal: true },
      { name: 'Kalyanotsavam (Celestial Wedding)', price: 1000, duration: '2 hours', description: 'Witness the re-enactment of the celestial wedding of Venkateswara & Padmavathi.', spiritualBenefit: 'Marital harmony and prosperity.', bookExternal: true },
      { name: 'Thomala Seva', price: 800, duration: '1 hour', description: 'Early morning garland ceremony — the deity is adorned with fresh flowers.', spiritualBenefit: 'Floral blessings.', bookExternal: true },
      { name: 'Hair Tonsure (Mundan)', price: 0, duration: '1 hour', description: 'Traditional offering of hair at Kalyana Katta (free).', spiritualBenefit: 'Symbolic surrender of ego; fulfilling vows.' },
      { name: 'Venkateswara Tula Bharam', price: 2500, duration: '1 hour', description: 'Weighing yourself against an offering (sugar, jaggery, coins).', spiritualBenefit: 'Symbolic offering of body weight to Balaji.', bookExternal: true },
    ],
    photoCount: 6,
    rules: [
      'ALL darshan and seva bookings only via TTD official website (tirupatibalaji.ap.gov.in)',
      'Government-issued photo ID required at every checkpoint',
      'Electronics, cameras not allowed inside the temple',
      'Dress code strictly enforced',
      'Free meal prasadam at Nitya Annadanam — collect token',
      'Laddu prasadam is paid (₹50); carry a second ID for purchase',
      'Avoid booking via agents/touts — they cannot guarantee entry',
      'Pregnant women above 7 months should avoid',
    ],
    nearbyAttractions: [
      'Sri Padmavathi Temple at Tiruchanoor (must-visit before Tirumala)',
      'Sri Govindarajaswamy Temple, Tirupati',
      'Kapila Theertham',
      'Swami Pushkarini (sacred lake at Tirumala)',
      'Akasa Ganga waterfall',
      'Silathoranam natural rock formation',
      'Srikalahasti (Vayu Lingam) — 38 km',
    ],
    specialNote:
      'THE most important travel note: all darshan, seva and accommodation must be booked on the official TTD website (tirupatibalaji.ap.gov.in). Bookings open exactly 90 days in advance and get fast-booked within minutes. Third-party agents are not authorised. Plan Padmavathi Temple in Tiruchanoor before going to Tirumala (traditional order).',
    testimonials: [
      { name: 'Lakshmi Subramanian', city: 'Chennai', text: 'Booked Kalyanotsavam — the celestial wedding re-enactment is magical. TTD process is transparent and fair.', rating: 5 },
      { name: 'Rahul Gupta', city: 'Delhi', text: 'Trekked up Srivari Mettu (2 km, 2,200 steps). Reaching the temple on foot after the climb is the traditional way.', rating: 5 },
      { name: 'Priya Iyer', city: 'Pune', text: 'Suprabhatam Seva at 3 AM was divine. Booking filled up 90 days ahead — plan carefully.', rating: 5 },
    ],
    faqs: [
      { q: 'How many days in advance to book?', a: 'Exactly 90 days. Bookings open at 10:00 AM IST sharp on the TTD website and sell out in minutes.' },
      { q: 'Dress code?', a: 'Traditional only. Men: dhoti + kurta or shirt + pants. Women: saree or chudidar with dupatta. No shorts, no shirtless darshan (unlike some other Jyotirlingas).' },
      { q: 'How do I get laddu prasadam?', a: 'Bought separately at the laddu counter after darshan (₹50 per laddu, max 2 per ID).' },
      { q: 'Is a free darshan possible?', a: 'Yes — Sarva Darshan (free) queue. Expect 4–10 hours. Seeghra Darshan (₹300) is much faster.' },
      { q: 'What about the hair tonsure ritual?', a: 'Done at Kalyana Katta (free). Many devotees offer their hair as surrender. Attendants are professional barbers.' },
    ],
  },

  'vaishno-devi': {
    slug: 'vaishno-devi',
    name: 'Shri Mata Vaishno Devi Shrine',
    deity: 'Goddess Vaishno Devi (Shakti)',
    deityType: 'Shakti',
    location: 'Katra (Trikuta Hills)',
    state: 'Jammu & Kashmir',
    isShaktiPeetha: true,
    officialWebsite: 'https://maavaishnodevi.org',
    officialBookingUrl: 'https://www.maavaishnodevi.org/yatra-registration.aspx',
    officialDarshanBookingUrl: 'https://www.maavaishnodevi.org/yatra-registration.aspx',
    history:
      'Mata Vaishno Devi\'s cave shrine is at 5,200 ft in the Trikuta hills of Jammu & Kashmir. Devi Vaishnavi was born from the combined energy of Mahalakshmi, Mahasaraswati and Mahakali to destroy demons. She meditated in the Trikuta cave for centuries awaiting Lord Vishnu.\n\nLegend of the yatra: a demon Bhairon tried to molest Vaishnavi; she fled into the cave. After 9 months (the gestation period — hence her hindu form as Mata), she emerged as Chandi and decapitated Bhairon, who then begged forgiveness. She granted him that a yatra would not be complete without visiting his shrine atop the hill first.\n\nThe yatra is 13 km from Katra. The shrine was formally managed by the Shri Mata Vaishno Devi Shrine Board from 1986 onwards, under whom cleanliness, queue management and pilgrim welfare dramatically improved.',
    significance:
      'One of the 108 Shakti Peethas. The Devi is self-manifested in three Pindis (natural rock formations) representing Mahakali, Mahalakshmi and Mahasaraswati.',
    deityDescription:
      'No murti — Devi manifests as 3 Pindis (natural rock outcrops) inside the cave, representing the three primordial Shakti forms: Mahakali, Mahalakshmi, Mahasaraswati.',
    mainFestivals: [
      { name: 'Navaratri (Sharad and Chaitra)', when: 'October and March/April' },
      { name: 'Yatra Darshan Anniversary', when: 'November' },
      { name: 'Vaishno Devi Mela', when: 'During Navaratri' },
    ],
    openingHours: {
      morning: '24/7 open (except Aarti breaks)',
      afternoon: 'Morning aarti 6:00 AM; closed for aarti 6:00–8:00 AM',
      evening: 'Evening aarti 7:00 PM; closed 7:00–9:00 PM',
    },
    dressCode: 'Comfortable warm clothing — temperatures drop at the shrine. Sports shoes or trekking shoes for the 13 km trek. Traditional attire not strictly required.',
    howToReach: {
      nearestAirport: 'Jammu Airport (50 km from Katra) or Shri Mata Vaishno Devi Katra Airport (upcoming)',
      nearestRailway: 'Shri Mata Vaishno Devi Katra Railway Station (1 km from Katra base)',
      roadDirections: 'Katra is the base town. From Katra, the yatra is by foot, pony, palki, battery car (last 500m) or helicopter to Sanjichhat.',
    },
    accommodation: [
      'Hotel Asia Vaishnodevi',
      'The White Hotel, Katra',
      'Country Inn & Suites Katra',
      'Shrine Board Bhawans (Niharika, Vaishnavi, Kalika)',
      'Adhkuwari guest house (midway halt)',
      'Sanjichhat guest house (helicopter drop point)',
    ],
    pujasOffered: [
      { name: 'Yatra Registration (Yatra Parchi)', price: 0, duration: 'N/A', description: 'Mandatory free slip from Katra before starting the trek.', spiritualBenefit: 'Entry permit for the yatra.', bookExternal: true },
      { name: 'Helicopter Ticket (Katra to Sanjichhat)', price: 1830, duration: '8 min', description: 'Govt-authorised helicopter ride.', spiritualBenefit: 'Accessibility for elderly, saves 11 km uphill.', bookExternal: true },
      { name: 'Battery Car (Bhavan)', price: 0, duration: '15 min', description: 'Last 500m uphill access.', spiritualBenefit: 'For those unable to walk the final stretch.' },
      { name: 'Atka Aarti Darshan (Cave Pujan)', price: 1100, duration: '2 hours', description: 'VIP darshan including participation in the aarti at the Pindis.', spiritualBenefit: 'Direct closeness to Devi.', bookExternal: true },
      { name: 'Sponsored Navaratri Havan', price: 5100, duration: 'Full day', description: 'Sponsor a day of the Navaratri havan in the Bhavan.', spiritualBenefit: 'Nine Devis\' blessings.', bookExternal: true },
      { name: 'Prasad Courier Service', price: 300, duration: 'N/A', description: 'Temple prasad couriered to your home address.', spiritualBenefit: 'Devi\'s blessings reach your home.', bookExternal: true },
      { name: 'Bhairon Darshan', price: 0, duration: '2 hours', description: 'Required trek to Bhairon temple (2.5 km uphill from Bhavan) — essential for yatra completion.', spiritualBenefit: 'Completes the yatra; without this, yatra is considered incomplete.' },
    ],
    photoCount: 5,
    rules: [
      'Yatra Parchi is mandatory — free but must be obtained at Katra Yatra Registration Counter',
      'No mobile phones beyond Adhkuwari (banned in the Bhavan and cave)',
      'Free cloakroom at the Bhavan for all belongings',
      'No leather, no eggs or non-veg from the moment you start the yatra',
      'Pregnant women should carry medical consent',
      'Children below 10 and elderly above 75 should use palki or helicopter',
      'Beware of unauthorised darshan sellers near Katra — all bookings via Shrine Board only',
    ],
    nearbyAttractions: [
      'Bhairon Baba Temple (2.5 km above Bhavan)',
      'Ardhkumari (Garbhjoon) — the cave where Devi meditated for 9 months',
      'Ban Ganga (sacred river at start of yatra)',
      'Charan Paduka',
      'Shiv Khori (77 km from Katra)',
      'Patnitop (hill station, 75 km)',
    ],
    specialNote:
      'The 13 km yatra from Katra to Bhavan is a pilgrimage in itself. "Jai Mata Di" chants echo throughout the path. Start early morning or late evening to avoid heat. The yatra is NOT complete without visiting Bhairon temple (2.5 km above Bhavan). Helicopter seats sell out months in advance during Navaratri.',
    testimonials: [
      { name: 'Dipti Sharma', city: 'Delhi', text: 'Walked all 13 km — took 6 hours up. The "Jai Mata Di" chants keep you going. Darshan of the Pindis in the cave is life-changing.', rating: 5 },
      { name: 'Rakesh Malhotra', city: 'Chandigarh', text: 'Took helicopter both ways — saved my knees. But I walked to Bhairon temple afterward. Perfect balance.', rating: 5 },
      { name: 'Sunita Kapoor', city: 'Mumbai', text: 'Visited during Navaratri — crowded but the energy is beyond words. Prasad was couriered home beautifully.', rating: 5 },
    ],
    faqs: [
      { q: 'How long does the yatra take?', a: 'On foot: 6–8 hrs one way. By pony: 3–4 hrs. By helicopter: 8 min to Sanjichhat + 2.5 km walk to Bhavan.' },
      { q: 'Is Bhairon darshan really necessary?', a: 'Yes — tradition holds that the yatra is incomplete without Bhairon darshan. A 2.5 km steep uphill from the Bhavan.' },
      { q: 'Best time to visit?', a: 'March–May and September–November. Navaratri is spiritually peak but crowded.' },
      { q: 'Is the cave open year-round?', a: 'Yes, but during heavy snowfall (January–February), the route can be disrupted briefly.' },
      { q: 'Can I carry food?', a: 'Yes, veg only. Langar (free community meal) runs at multiple points on the trek.' },
    ],
  },

  'jagannath-puri': {
    slug: 'jagannath-puri',
    name: 'Shree Jagannath Temple, Puri',
    deity: 'Lord Jagannath, Balabhadra, Subhadra',
    deityType: 'Vishnu',
    location: 'Puri',
    state: 'Odisha',
    officialWebsite: 'https://shreejagannatha.in',
    officialBookingUrl: 'https://shreejagannatha.in/online-donation-2',
    history:
      'Shree Jagannath Puri is one of the four Char Dhams, alongside Badrinath, Dwarka and Rameswaram. Dedicated to Lord Jagannath (a form of Vishnu/Krishna), Balabhadra (elder brother), and Subhadra (sister), the temple\'s wooden deities are unique — carved in incomplete form.\n\nLegend: King Indradyumna, seeking to install a divine murti, found a sacred log washing ashore. A divine carpenter agreed to carve the deities but demanded 21 days of undisturbed solitude. After 14 days the king grew impatient and opened the door — the carpenter (Vishvakarma/Vishnu himself) vanished leaving the deities incomplete. This incomplete form is worshipped to this day.\n\nThe present temple was built by King Chodaganga Deva in the 12th century. The Nabakalebara ritual (every 12–19 years) reconsecrates the deities with new neem wood bodies, while transferring the "Brahma" (soul substance) in absolute secrecy.',
    significance:
      'One of the Char Dhams. Famous for the Rath Yatra (chariot festival) where the deities are pulled through Puri by millions. Mahaprasad (the temple\'s food offering) is believed to be Anna-Brahma itself — never contaminable.',
    deityDescription:
      'Jagannath (black/darker skin, large round eyes, wooden form), Balabhadra (fair, wooden), Subhadra (smaller, wooden) — all three installed on the Ratnavedi (jewelled platform).',
    mainFestivals: [
      { name: 'Rath Yatra', when: 'Ashadha Shukla Dwitiya — June/July' },
      { name: 'Snana Yatra', when: 'Jyeshtha Purnima — June' },
      { name: 'Chandan Yatra', when: 'Akshaya Tritiya — April/May' },
      { name: 'Nabakalebara (when held)', when: 'Every 12-19 years' },
      { name: 'Kartik Purnima', when: 'November' },
    ],
    openingHours: {
      morning: 'Mangala Aarti 5:00 AM; Mailama, Abakasa, Surya Puja',
      afternoon: 'Madhyanha Dhupa 12:00 PM (lunch offering); reopens 5:30 PM',
      evening: 'Sandhya Dhupa 7:30 PM; Pahuda (closing) 11:00 PM',
    },
    dressCode: 'Traditional Indian attire. Western wear, skirts, shorts strictly prohibited.',
    howToReach: {
      nearestAirport: 'Biju Patnaik International Airport, Bhubaneswar (60 km)',
      nearestRailway: 'Puri Railway Station (2 km from the temple)',
      roadDirections: 'From Bhubaneswar — 60 km, 1.5 hrs. Well connected by highway and rail.',
    },
    accommodation: [
      'Hotel Mayfair Heritage Puri',
      'Hans Coco Palms',
      'Hotel Sonar Bangla',
      'Niladri Bhakta Niwas (temple trust)',
      'Gopabandhu Ashram (dharamshala)',
      'Pushpagiri Guest House',
    ],
    pujasOffered: [
      { name: 'Mangala Aarti Darshan', price: 500, duration: '1 hour', description: 'Witness the 5:00 AM awakening aarti.', spiritualBenefit: 'Most auspicious morning darshan.' },
      { name: 'Gajapati Pravesh Puja', price: 1100, duration: '1 hour', description: 'Special puja in your family name.', spiritualBenefit: 'Family blessings.' },
      { name: 'Mahaprasad Sponsorship', price: 2100, duration: '1 day', description: 'Sponsor the cooking of Chappan Bhog (56 dishes) for one day.', spiritualBenefit: 'Anna-Brahma merit — highest in Hindu tradition.' },
      { name: 'Niladri Bije (Rath Yatra time)', price: 3100, duration: '5 days', description: 'Priority access during the Rath Yatra sequence.', spiritualBenefit: 'Seeing Lord Jagannath on the chariot is equivalent to a lifetime of merit.' },
      { name: 'Sunabesa (Gold Dressing)', price: 501, duration: 'Seasonal', description: 'Witness the Lord dressed in gold after Bahuda Yatra return.', spiritualBenefit: 'Rare darshan — only once a year.' },
      { name: 'Kartik Purnima Boita Bandana', price: 501, duration: '1 hour', description: 'Participate in the ritual of floating paper boats remembering Odisha\'s maritime heritage.', spiritualBenefit: 'Prosperity through ancestral trade blessings.' },
      { name: 'Panchamukhi Dhupa', price: 1100, duration: '1 hour', description: 'Sponsor one of the 5 major dhupa (offerings) of the day.', spiritualBenefit: 'Direct offering to the Lord.' },
    ],
    photoCount: 5,
    rules: [
      'Non-Hindus are strictly not permitted inside the temple (this is enforced)',
      'Electronics banned inside',
      'Leather items must be removed',
      'Photography inside temple and on Grand Road during Rath Yatra is restricted',
      'Avoid touts/Pandas demanding donations at entry — verify Panda credentials',
      'Mahaprasad must be consumed inside or near Anand Bazar; not taken in disposable plates',
      'Do not ask about Nabakalebara secret rituals',
    ],
    nearbyAttractions: [
      'Konark Sun Temple (35 km — UNESCO site)',
      'Puri Beach (adjacent)',
      'Gundicha Temple (Mausi Maa — Rath Yatra destination, 3 km)',
      'Alarnath Temple (23 km)',
      'Sakshi Gopal (20 km)',
      'Chilika Lake (50 km)',
      'Pipili applique village',
    ],
    specialNote:
      'Non-Hindus are not allowed inside the temple — this is strictly enforced. Rath Yatra (June/July) attracts millions — book accommodation 6+ months in advance. Mahaprasad at Anand Bazar (within temple complex) is a must-experience. The temple\'s flag changes direction of wind — scientifically unexplained phenomenon.',
    testimonials: [
      { name: 'Srikant Mohapatra', city: 'Bhubaneswar', text: 'Rath Yatra from childhood — every year I pull the rope. No experience compares.', rating: 5 },
      { name: 'Anjali Das', city: 'Kolkata', text: 'Mahaprasad in the Anand Bazar is simple, sacred, and never gets cold even after hours — Jagannath\'s miracle.', rating: 5 },
      { name: 'Prabhakar Pillai', city: 'Chennai', text: 'Chatur Dham complete. Sunabesa darshan after Bahuda Yatra was spectacular.', rating: 5 },
    ],
    faqs: [
      { q: 'Can foreigners enter the temple?', a: 'Unfortunately no — non-Hindus are not permitted inside. They can view it from the rooftop of Raghunandan Library across the road.' },
      { q: 'What is Mahaprasad?', a: '56 dishes cooked on sacred fires and offered to the Lord. Available in the Anand Bazar inside the temple complex.' },
      { q: 'When is Rath Yatra?', a: 'Ashadha Shukla Dwitiya (June/July). Nine-day festival ending with Bahuda Yatra (return).' },
      { q: 'Is photography allowed?', a: 'Outside — yes. Inside sanctum and during Rath Yatra procession — restricted.' },
      { q: 'Any unique scientific facts?', a: 'The temple\'s flag flies in the opposite direction of the wind. No bird flies over it. The Singhadwar (Lion Gate) loses sea sound once entered.' },
    ],
  },

  siddhivinayak: {
    slug: 'siddhivinayak',
    name: 'Shree Siddhivinayak Temple, Prabhadevi',
    deity: 'Lord Ganesha',
    deityType: 'Ganesha',
    location: 'Prabhadevi, Mumbai',
    state: 'Maharashtra',
    officialWebsite: 'https://siddhivinayak.org',
    officialBookingUrl: 'https://www.siddhivinayak.org/online_booking.php',
    officialDarshanBookingUrl: 'https://www.siddhivinayak.org/online_booking.php',
    history:
      'Shree Siddhivinayak Temple at Prabhadevi, Mumbai, is one of the richest and most visited Ganesha temples in India. The original temple was built on 19 November 1801 by Laxman Vithu and Deubai Patil, a childless wife who wished that no other woman should remain childless. The idol of Ganesha was discovered buried in a nearby lake.\n\nThe deity is "Siddhivinayak" — the Ganesha who grants wishes (Siddhi) — and unique for having the trunk curled to the right side (Dakshin-abhimukhi), which makes prayers especially potent but also demanding strict observance of ritual.\n\nThe present five-story structure with gold-plated domes was rebuilt in 1990. It is a premier destination for Bollywood stars, politicians and businessmen — often receiving daily donations of ₹1 crore.',
    significance:
      'Mumbai\'s most beloved Ganesha. Dakshin-mukhi Ganesha (right-trunk) is considered extremely powerful for wish fulfillment. Every major Bollywood film starts with a Siddhivinayak visit.',
    deityDescription:
      'Black stone idol, approximately 2.5 ft tall, with the trunk curved to the right. Four hands hold lotus, axe, modak, and rosary. The inner sanctum is plated with gold.',
    mainFestivals: [
      { name: 'Ganesh Chaturthi (Vinayaka Chaturthi)', when: 'August / September — 10 days' },
      { name: 'Angarki Chaturthi', when: 'Tuesday Chaturthi (every 3-4 months)' },
      { name: 'Sankashti Chaturthi', when: 'Every month' },
      { name: 'Maghi Ganesh Jayanti', when: 'February' },
    ],
    openingHours: {
      morning: 'Kakad Aarti 5:30 AM; Darshan from 6:00 AM',
      afternoon: 'Naivedya Aarti 12:15 PM; darshan resumes 12:45 PM',
      evening: 'Aarti 7:30 PM; Shejarati 9:50 PM; closes 10:00 PM',
    },
    dressCode: 'No strict dress code, but modest attire expected. Shorts discouraged. Tuesdays are busiest.',
    howToReach: {
      nearestAirport: 'Chhatrapati Shivaji International Airport (14 km)',
      nearestRailway: 'Dadar Station (3 km); Prabhadevi (2 km) on local train network',
      roadDirections: 'On SV Road, Prabhadevi. Taxis and auto-rickshaws abundant. Mumbai Metro nearest: Siddhivinayak station (coming soon)',
    },
    accommodation: [
      'The St. Regis Mumbai (nearby)',
      'ITC Grand Central (Parel)',
      'Hotel Kohinoor Continental',
      'Hotel Sea Palace',
      'Treebo Trend Grand Residency',
      'Service apartments in Prabhadevi and Worli',
    ],
    pujasOffered: [
      { name: 'Regular Darshan', price: 0, duration: '30-120 min', description: 'Free general darshan — Tuesdays have 4-6 hour queues.', spiritualBenefit: 'Ganesha\'s basic blessing.' },
      { name: 'Sugam Darshan (VIP Pass)', price: 200, duration: '30 min', description: 'Skip-the-queue ticket.', spiritualBenefit: 'Quick peaceful darshan.', bookExternal: true },
      { name: 'Abhishek', price: 750, duration: '45 min', description: 'Personal abhishek of Siddhivinayak.', spiritualBenefit: 'Specific wish fulfillment (Siddhi).' },
      { name: 'Ganesh Atharvashirsha Path', price: 500, duration: '1 hour', description: '108 recitations of the Atharvashirsha hymn.', spiritualBenefit: 'Obstacle removal (Vighnaharta).' },
      { name: 'Modak Bhog Sponsorship', price: 1100, duration: '1 meal', description: 'Sponsor Ganesha\'s favourite offering of 21 modaks.', spiritualBenefit: 'Wish fulfillment through Ganesha\'s joy.' },
      { name: 'Ganesh Homam', price: 2100, duration: '2 hours', description: 'Fire ritual with 108 ahutis.', spiritualBenefit: 'Major obstacle removal.' },
      { name: 'Angarki Chaturthi Special Puja', price: 1500, duration: '3 hours', description: 'Puja on Tuesday Chaturthi — considered the most powerful.', spiritualBenefit: '1000x merit of any other Ganesha day.' },
    ],
    photoCount: 5,
    rules: [
      'Tuesdays and Chaturthis have 4-6 hour queues — plan accordingly',
      'Mobile phones banned inside the sanctum area (free cloakroom)',
      'Photography not allowed inside',
      'No parking near temple on Tuesdays — use BEST bus or local train',
      'Book Sugam Darshan online to skip queues',
      'Avoid on Angarki Chaturthi unless pre-booked',
    ],
    nearbyAttractions: [
      'Shree Mahalaxmi Temple, Mahalaxmi (4 km)',
      'Haji Ali Dargah (6 km)',
      'Dhobi Ghat',
      'Worli Seaface',
      'Nehru Planetarium',
      'Bandra Worli Sea Link',
      'Juhu Beach (6 km)',
    ],
    specialNote:
      'Tuesdays see 2-4 lakh devotees — if visiting on Tuesday, arrive by 4 AM or book Sugam Darshan. Angarki Chaturthi (Tuesday Chaturthi, every 3-4 months) is the most spiritually potent day. Modak prasad is available at the temple counter.',
    testimonials: [
      { name: 'Anil Joshi', city: 'Mumbai', text: 'Visited every Tuesday for years. Asked for Siddhi for my daughter\'s wedding — happened in 6 months. Bappa\'s kripa.', rating: 5 },
      { name: 'Rina Desai', city: 'Mumbai', text: 'Sugam Darshan on a weekday — 30 minutes, peaceful. Modak prasad was delicious.', rating: 5 },
      { name: 'Arjun Malhotra', city: 'Delhi', text: 'Did Atharvashirsha path — priest was patient and explained every shloka. Felt lighter afterwards.', rating: 5 },
    ],
    faqs: [
      { q: 'Best day to visit?', a: 'Tuesdays spiritually — but also the most crowded. Wednesday-Friday mornings are ideal for peaceful darshan.' },
      { q: 'How to book Sugam Darshan?', a: 'Through siddhivinayak.org — 15 days in advance, ₹200 per person.' },
      { q: 'Parking?', a: 'Limited — Tuesdays especially bad. Use public transport.' },
      { q: 'What is Angarki Chaturthi?', a: 'When Sankashti Chaturthi falls on a Tuesday. Happens every 3-4 months. Extremely auspicious and crowded.' },
      { q: 'Prasad?', a: 'Modak, laddu, and peda available at the prasad counter after darshan.' },
    ],
  },

  'golden-temple': {
    slug: 'golden-temple',
    name: 'Sri Harmandir Sahib (Golden Temple)',
    deity: 'Guru Granth Sahib',
    deityType: 'Sikh',
    location: 'Amritsar',
    state: 'Punjab',
    officialWebsite: 'https://sgpc.net',
    officialBookingUrl: 'https://sgpc.net/sri-harmandir-sahib',
    history:
      'Sri Harmandir Sahib ("Temple of God") — the Golden Temple of Amritsar — is Sikhism\'s holiest shrine. The foundation was laid by Sufi saint Hazrat Mian Mir Ji at the request of Guru Arjan Dev Ji in 1589 CE, deliberately inviting all faiths to the foundation. The Adi Granth (first Sikh scripture) was installed inside in 1604.\n\nThe temple was destroyed multiple times by Afghan invaders and rebuilt each time. Maharaja Ranjit Singh of the Sikh Empire gold-plated the upper floors in 1830, giving it the name "Golden Temple."\n\nIn 1984, Operation Blue Star damaged parts of the Akal Takht; it was rebuilt by the Sikh community. Today it welcomes over 1 lakh visitors daily, and the langar (free community kitchen) serves meals to anyone — regardless of faith, caste or wealth — over 100,000 every single day.',
    significance:
      'Holiest Sikh shrine. Doors on all four sides symbolise openness to all — Hindus, Muslims, Christians, and everyone else. The langar is the world\'s largest free kitchen.',
    deityDescription:
      'Sri Guru Granth Sahib Ji (the Sikh scripture, considered the eternal living Guru) is placed on a decorated palki on the Harmandir Sahib central structure, set in the middle of the Amrit Sarovar (holy pond).',
    mainFestivals: [
      { name: 'Guru Nanak Jayanti', when: 'November' },
      { name: 'Baisakhi (Khalsa Panth foundation)', when: '13 April' },
      { name: 'Martyrdom of Guru Arjan Dev', when: 'May / June' },
      { name: 'Gurupurab of Guru Ram Das', when: 'October' },
      { name: 'Shaheedi Divas of Guru Tegh Bahadur', when: 'November' },
    ],
    openingHours: {
      morning: 'Palki Sahib (Gurugranth installation) 4:00 AM (summer) / 5:00 AM (winter)',
      afternoon: 'Continuous darshan — open 24 hours',
      evening: 'Palki Sahib return (Sukhasan) 10:00 PM (summer) / 9:30 PM (winter)',
    },
    dressCode:
      'Head covering is mandatory for all (men and women). Scarves/patkas available free at entrance. Remove footwear before entering. Wash feet in the ankle-deep water channel.',
    howToReach: {
      nearestAirport: 'Sri Guru Ram Dass Jee International Airport, Amritsar (13 km)',
      nearestRailway: 'Amritsar Junction (2 km)',
      roadDirections: 'Central Amritsar. Rickshaws, autos, taxis abundant. Amritsar Metro coming soon.',
    },
    accommodation: [
      'Sri Guru Ram Das Niwas (free SGPC dharamshala — 1 km)',
      'Guru Arjan Dev Niwas',
      'Taj Swarna Amritsar',
      'Hyatt Regency Amritsar',
      'Hotel Ramada Amritsar',
      'The Grand Legacy',
    ],
    pujasOffered: [
      { name: 'Akhand Path Sponsorship', price: 2100, duration: '48 hours continuous', description: 'Sponsor a non-stop 48-hour recitation of the Guru Granth Sahib.', spiritualBenefit: 'Highest Sikh seva — prayers accepted in your name.', bookExternal: true },
      { name: 'Sehaj Path', price: 1100, duration: '7 days', description: 'Recitation of the Granth Sahib over 7 days at your sankalp.', spiritualBenefit: 'Family blessings.', bookExternal: true },
      { name: 'Ardas Beneti', price: 51, duration: '5 min', description: 'Personal prayer offering with your name and wish.', spiritualBenefit: 'Direct communion with Guru.' },
      { name: 'Karah Prasad Sponsorship', price: 1100, duration: '1 service', description: 'Sponsor the sacred sweet prasad distribution.', spiritualBenefit: 'Equal distribution merit.' },
      { name: 'Langar Seva Donation', price: 1000, duration: 'Ongoing', description: 'Sponsor meals in the world\'s largest free kitchen.', spiritualBenefit: 'Feeding lakhs is the highest seva.', bookExternal: true },
      { name: 'Palki Seva (during Palki Sahib)', price: 501, duration: '1 ceremony', description: 'Carry the Guru Granth Sahib palki — a rare honour.', spiritualBenefit: 'Once in a lifetime seva.', bookExternal: true },
    ],
    photoCount: 6,
    rules: [
      'Head covering mandatory — scarves available free',
      'No tobacco, alcohol or drugs anywhere near Harmandir Sahib (permanent ban)',
      'Photography not allowed inside the Harmandir Sahib main structure',
      'Maintain silence on the parikrama',
      'Do langar seva — volunteer in the kitchen/serving',
      'Dip in the Amrit Sarovar is optional but auspicious',
      'Do not turn your back to the Granth Sahib while leaving',
    ],
    nearbyAttractions: [
      'Jallianwala Bagh (500 m)',
      'Partition Museum',
      'Durgiana Temple (2 km — Hindu temple modelled on Harmandir Sahib)',
      'Wagah Border Ceremony (30 km)',
      'Gobindgarh Fort',
      'Ram Tirath (12 km — Valmiki\'s ashram)',
      'Maharaja Ranjit Singh Museum',
    ],
    specialNote:
      'The langar serves 100,000+ free meals daily — doing seva (volunteering) in the kitchen is highly recommended. Visit at 4 AM or 9-10 PM to witness the Palki Sahib ceremony. Night view of the golden dome reflected in the Sarovar is iconic.',
    testimonials: [
      { name: 'Gurmeet Singh', city: 'Chandigarh', text: 'Took my children — did langar seva together. They won\'t forget the humility of feeding strangers.', rating: 5 },
      { name: 'Neha Arora', city: 'Delhi', text: 'Visited at 4 AM for Palki Sahib — the golden dome, the hymns, the silence. One of life\'s greatest experiences.', rating: 5 },
      { name: 'Harpreet Kaur', city: 'Ludhiana', text: 'Akhand Path sponsorship was done seamlessly. The Ardas with my name and wish brought tears.', rating: 5 },
    ],
    faqs: [
      { q: 'Can non-Sikhs enter?', a: 'Absolutely. The Golden Temple has doors on all four sides to welcome people of all faiths. This is central to its message.' },
      { q: 'Do I need to cover my head?', a: 'Yes, mandatory. Free scarves/patkas available at every entrance.' },
      { q: 'Is langar really free?', a: 'Completely free. Everyone — tourists, rich, poor — eats together sitting on the floor. Seva is also open.' },
      { q: 'Best time to visit?', a: 'Early morning (3-5 AM Palki Sahib) or late evening for peace. Weekends crowded.' },
      { q: 'Can I do kitchen seva as a tourist?', a: 'Yes — walk into the Guru Ka Langar building and ask. They will guide you to a station (chopping, rolling chapatis, serving, cleaning).' },
    ],
  },
};

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

export function getTempleDetail(slug: string): TempleDetailRich | null {
  return TEMPLE_DETAILS[slug] ?? null;
}

export function getAllTempleDetails(): TempleDetailRich[] {
  return Object.values(TEMPLE_DETAILS);
}

export function getSimilarTemples(slug: string, limit = 3): TempleDetailRich[] {
  const current = TEMPLE_DETAILS[slug];
  if (!current) return Object.values(TEMPLE_DETAILS).slice(0, limit);
  return Object.values(TEMPLE_DETAILS)
    .filter((t) => t.slug !== slug && t.deityType === current.deityType)
    .slice(0, limit);
}

/** Filter temple list by state / deity type / search query. */
export function filterTempleDetails(params: {
  state?: string;
  deityType?: DeityType | 'All';
  search?: string;
}): TempleDetailRich[] {
  return Object.values(TEMPLE_DETAILS).filter((t) => {
    if (params.state && params.state !== 'All States' && t.state !== params.state) return false;
    if (params.deityType && params.deityType !== 'All' && t.deityType !== params.deityType) return false;
    if (params.search) {
      const q = params.search.toLowerCase();
      if (
        !t.name.toLowerCase().includes(q) &&
        !t.location.toLowerCase().includes(q) &&
        !t.deity.toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
}
