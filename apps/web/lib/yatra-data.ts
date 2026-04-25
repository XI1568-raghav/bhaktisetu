/**
 * Dharmic Yatra — Pilgrimage data for Darshya
 * Hardcoded, realistic data for 9 yatras, 8 companions, and 30+ sacred sites.
 */

import { getTempleHero, getDeityImage } from './images';

export type YatraRegion = 'north' | 'south' | 'east' | 'west' | 'himalayas';
export type YatraDifficulty = 'easy' | 'moderate' | 'challenging' | 'extreme';
export type YatraBudgetTier = 'economy' | 'standard' | 'premium';

export interface YatraItineraryDay {
  day: number;
  title: string;
  description: string;
  stay: string;
  meals: string;
  highlights: string[];
}

export interface YatraPackageTier {
  tier: YatraBudgetTier;
  name: string;
  price: number; // INR per person
  tagline: string;
  includes: string[];
  transport: string;
  stay: string;
  guide: string;
  helicopterOption?: boolean;
}

export interface YatraReview {
  name: string;
  location: string;
  rating: number;
  comment: string;
  yatra: string;
  date: string;
}

export interface YatraFaq {
  q: string;
  a: string;
}

export interface Yatra {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  longDescription: string;
  durationDays: number;
  distanceKm: number;
  bestTime: string;
  difficulty: YatraDifficulty;
  deity: string;
  region: YatraRegion;
  places: string[];
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: YatraItineraryDay[];
  packages: YatraPackageTier[];
  heroImage: string;
  gallery: string[];
  helicopterAvailable: boolean;
  tags: string[];
  reviews: YatraReview[];
  faqs: YatraFaq[];
  startingPrice: number;
}

export interface TravelCompanion {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: 'male' | 'female';
  city: string;
  languages: string[];
  yatrasCompleted: number;
  rating: number;
  reviewCount: number;
  specializations: string[];
  bio: string;
  experience: string;
  pricePerDay: number;
  verified: {
    aadhaar: boolean;
    background: boolean;
    medical: boolean;
  };
  avatarColor: string;
  availability: 'available' | 'limited' | 'busy';
  pastYatras: string[];
  reviews: { author: string; rating: number; comment: string; yatra: string }[];
}

export interface SacredSite {
  id: string;
  name: string;
  location: string;
  state: string;
  region: YatraRegion;
  deity: string;
  type: 'jyotirlinga' | 'dham' | 'shakti-peeth' | 'ram-tirth' | 'krishna-tirth' | 'sikh' | 'sufi' | 'other';
}

// ────────────────────────────────────────────────────────────
// Helper — realistic itinerary generator template
// ────────────────────────────────────────────────────────────

const meals = {
  full: 'Breakfast, Lunch & Dinner (Sattvic)',
  bnd: 'Breakfast & Dinner (Sattvic)',
  bd: 'Breakfast & Dinner',
};

// ────────────────────────────────────────────────────────────
// YATRAS — 9 complete pilgrimage packages
// ────────────────────────────────────────────────────────────

export const yatras: Yatra[] = [
  // ── 1. Char Dham ────────────────────────────────────────────
  {
    slug: 'char-dham',
    title: 'Char Dham Yatra',
    subtitle: 'The four sacred abodes of Uttarakhand',
    description:
      'The most revered Himalayan pilgrimage — Yamunotri, Gangotri, Kedarnath and Badrinath. A journey every Hindu aspires to complete once in their lifetime.',
    longDescription:
      'Nestled in the majestic Garhwal Himalayas, the Char Dham is considered the holiest pilgrimage circuit in Hinduism. Pilgrims begin at Yamunotri (source of the Yamuna), proceed to Gangotri (source of the Ganga), then trek to the sanctum of Lord Shiva at Kedarnath, and conclude at Badrinath — the abode of Lord Vishnu. Our curated yatra handles permits, stays, helicopter options for Kedarnath, and ensures elderly-friendly pacing.',
    durationDays: 11,
    distanceKm: 1607,
    bestTime: 'May to June & September to October',
    difficulty: 'challenging',
    deity: 'Shiva, Vishnu, Ganga, Yamuna',
    region: 'himalayas',
    places: ['Haridwar', 'Yamunotri', 'Gangotri', 'Kedarnath', 'Badrinath', 'Rishikesh'],
    highlights: [
      'Complete Char Dham circuit with permits handled',
      'Helicopter option to Kedarnath (skip 16km trek)',
      'Sunrise darshan at Badrinath',
      'Holy dip at Gangotri',
      'Ganga Aarti at Haridwar',
      'Sattvic meals throughout',
    ],
    inclusions: [
      'AC transport (11 days)',
      'All stays (10 nights)',
      'Daily breakfast & dinner',
      'Temple entry & VIP darshan',
      'Experienced tour manager',
      'Biomedical waste insurance',
      'Helicopter booking assistance',
      'All permits & e-passes',
    ],
    exclusions: [
      'Airfare to/from Dehradun',
      'Personal expenses',
      'Helicopter charges (optional)',
      'Pony/palki at Kedarnath',
      'Tips & porters',
    ],
    itinerary: [
      { day: 1, title: 'Arrive Haridwar', description: 'Pickup from Dehradun airport/railway. Drive to Haridwar. Evening Ganga Aarti at Har Ki Pauri.', stay: 'Haridwar hotel', meals: meals.bnd, highlights: ['Ganga Aarti', 'Har Ki Pauri'] },
      { day: 2, title: 'Haridwar → Barkot', description: 'Scenic drive through Mussoorie to Barkot. Overnight stay.', stay: 'Barkot hotel', meals: meals.full, highlights: ['Mussoorie hill views'] },
      { day: 3, title: 'Yamunotri Darshan', description: 'Drive to Janki Chatti. 6km trek (or pony) to Yamunotri. Darshan & return.', stay: 'Barkot hotel', meals: meals.full, highlights: ['Yamunotri Temple', 'Surya Kund hot spring', 'Divya Shila'] },
      { day: 4, title: 'Barkot → Uttarkashi', description: 'Drive to Uttarkashi via Radi Top. Visit Vishwanath Temple.', stay: 'Uttarkashi hotel', meals: meals.full, highlights: ['Kashi Vishwanath Uttarkashi'] },
      { day: 5, title: 'Gangotri Darshan', description: 'Drive to Gangotri (100km). Darshan, holy dip in Bhagirathi. Return.', stay: 'Uttarkashi hotel', meals: meals.full, highlights: ['Gangotri Temple', 'Bhagirathi Shila', 'Surya Kund'] },
      { day: 6, title: 'Uttarkashi → Guptkashi', description: 'Long drive to Guptkashi (base for Kedarnath). Scenic valleys & confluences.', stay: 'Guptkashi hotel', meals: meals.full, highlights: ['Triyuginarayan Temple (optional)'] },
      { day: 7, title: 'Kedarnath Darshan (by trek/pony/heli)', description: 'Transfer to Sonprayag/Sersi. 16km trek to Kedarnath, or helicopter service. Evening darshan & Aarti.', stay: 'Kedarnath GMVN/helipad return', meals: meals.full, highlights: ['Kedarnath Jyotirlinga', 'Evening Aarti', 'Adi Shankaracharya Samadhi'] },
      { day: 8, title: 'Kedarnath → Guptkashi → Joshimath', description: 'Morning Abhishek (optional). Return & drive to Joshimath.', stay: 'Joshimath hotel', meals: meals.full, highlights: ['Narsingh Temple'] },
      { day: 9, title: 'Badrinath Darshan', description: 'Drive through Hanuman Chatti to Badrinath. Tapt Kund, darshan, Mana village visit.', stay: 'Badrinath hotel', meals: meals.full, highlights: ['Badrinath Dham', 'Tapt Kund', 'Mana Village', 'Vyas Gufa'] },
      { day: 10, title: 'Badrinath → Rishikesh', description: 'Drive back to Rishikesh. Evening Triveni Ghat Aarti.', stay: 'Rishikesh hotel', meals: meals.full, highlights: ['Triveni Ghat Aarti', 'Ram Jhula'] },
      { day: 11, title: 'Rishikesh → Dehradun Departure', description: 'Morning at Parmarth Niketan. Transfer to airport/station.', stay: '—', meals: 'Breakfast', highlights: ['Parmarth Niketan'] },
    ],
    packages: [
      { tier: 'economy', name: 'Sharda (Shared)', price: 38500, tagline: 'Shared tempo traveller, budget dharamshalas', includes: ['Shared 12-seater', 'Dharamshala/budget hotel', 'Shared guide', 'Basic meals'], transport: 'Shared tempo traveller', stay: 'Budget hotels & dharamshalas', guide: 'Shared tour manager', helicopterOption: true },
      { tier: 'standard', name: 'Shraddha (Private)', price: 68500, tagline: 'Private cab, 3-star stays, personal guide', includes: ['Private Innova/Ertiga', '3-star hotels', 'Personal guide', 'All sattvic meals', 'VIP darshan'], transport: 'Private Innova Crysta', stay: '3-star hotels', guide: 'Personal tour manager', helicopterOption: true },
      { tier: 'premium', name: 'Divya (Luxury + Heli)', price: 149000, tagline: 'SUV + Kedarnath helicopter, boutique stays, dedicated team', includes: ['Private Fortuner/Innova', 'Heritage & boutique stays', 'Kedarnath helicopter return', 'Dedicated guide + cook', 'Special puja arrangements', 'Oxygen cylinder standby'], transport: 'Fortuner + Kedarnath helicopter', stay: 'Heritage resorts & boutique hotels', guide: 'Dedicated guide + cook', helicopterOption: true },
    ],
    heroImage: getTempleHero('kedarnath'),
    gallery: [getTempleHero('kedarnath'), getTempleHero('badrinath'), getDeityImage('lord-shiva'), getDeityImage('lord-vishnu'), getTempleHero('kashi-vishwanath'), getTempleHero('somnath')],
    helicopterAvailable: true,
    tags: ['Himalayas', 'Shiva', 'Vishnu', '11 days', 'Helicopter'],
    reviews: [
      { name: 'Ramesh Iyer', location: 'Chennai', rating: 5, comment: 'Completed Char Dham at 68 — the team made it possible. Helicopter to Kedarnath was a blessing for my knees.', yatra: 'Char Dham', date: 'Jun 2025' },
      { name: 'Meena Sharma', location: 'Delhi', rating: 5, comment: 'Every meal was sattvic, every stay comfortable. Our guide Raghav handled everything including my mother\'s medication reminders.', yatra: 'Char Dham', date: 'Sep 2025' },
      { name: 'Kapil Malhotra', location: 'Mumbai', rating: 4, comment: 'Organized beautifully. Weather delayed Yamunotri by a day but team re-planned the entire schedule seamlessly.', yatra: 'Char Dham', date: 'May 2025' },
    ],
    faqs: [
      { q: 'What is the best time for Char Dham?', a: 'May-June (spring) and September-October (post-monsoon). The yatra closes by Diwali and reopens on Akshaya Tritiya.' },
      { q: 'Is Char Dham suitable for elderly?', a: 'Yes, with the premium package including helicopter to Kedarnath. We recommend pre-yatra fitness check and carrying prescribed medicines.' },
      { q: 'What clothing should I pack?', a: 'Woolens (even in summer), trekking shoes, raincoat, thermal innerwear, gloves, warm cap. Temperature drops to 2-5°C at night.' },
      { q: 'Are biometric registrations mandatory?', a: 'Yes. Our team handles your Uttarakhand Tourism registration in advance.' },
      { q: 'How difficult is the Kedarnath trek?', a: '16km uphill, 6-8 hours. Pony (₹3,500-4,500), palki (₹8,000) and helicopter (₹7,500-8,500 one-way) are available.' },
    ],
    startingPrice: 38500,
  },

  // ── 2. Do Dham ──────────────────────────────────────────────
  {
    slug: 'do-dham',
    title: 'Do Dham Yatra',
    subtitle: 'Kedarnath & Badrinath — the Shiva-Vishnu circuit',
    description:
      'The shorter Himalayan pilgrimage covering two of the most sacred dhams — Kedarnath Jyotirlinga and Badrinath Dham. Ideal for those with limited time.',
    longDescription:
      'Do Dham focuses on the two most prominent shrines of the Char Dham — Kedarnath (Lord Shiva) and Badrinath (Lord Vishnu). A 7-day circuit that delivers the spiritual depth of the Himalayan pilgrimage without the longer Yamunotri-Gangotri leg.',
    durationDays: 7,
    distanceKm: 890,
    bestTime: 'May to June & September to October',
    difficulty: 'moderate',
    deity: 'Shiva & Vishnu',
    region: 'himalayas',
    places: ['Haridwar', 'Guptkashi', 'Kedarnath', 'Joshimath', 'Badrinath', 'Rishikesh'],
    highlights: ['Kedarnath helicopter option', 'Tapt Kund holy bath', 'Mana village visit', 'Ganga Aarti at Haridwar', 'Brahma Kapal tarpan'],
    inclusions: ['AC transport', '6 nights stay', 'Breakfast & dinner', 'VIP darshan', 'Tour manager', 'Permits'],
    exclusions: ['Flights', 'Helicopter (optional)', 'Personal expenses', 'Pony/palki charges'],
    itinerary: [
      { day: 1, title: 'Arrive Haridwar', description: 'Pickup from Dehradun. Drive to Haridwar. Ganga Aarti.', stay: 'Haridwar hotel', meals: meals.bnd, highlights: ['Ganga Aarti'] },
      { day: 2, title: 'Haridwar → Guptkashi', description: '230km scenic drive through Devprayag & Rudraprayag.', stay: 'Guptkashi hotel', meals: meals.full, highlights: ['Devprayag Sangam'] },
      { day: 3, title: 'Kedarnath Darshan', description: 'Transfer to Sonprayag. Trek/helicopter to Kedarnath. Evening Aarti.', stay: 'Kedarnath/Guptkashi', meals: meals.full, highlights: ['Kedarnath Jyotirlinga'] },
      { day: 4, title: 'Kedarnath → Joshimath', description: 'Morning Abhishek (optional). Drive to Joshimath.', stay: 'Joshimath hotel', meals: meals.full, highlights: ['Narsingh Temple'] },
      { day: 5, title: 'Badrinath Darshan', description: 'Drive to Badrinath. Tapt Kund bath, Brahma Kapal tarpan, darshan, Mana village.', stay: 'Badrinath hotel', meals: meals.full, highlights: ['Badrinath Dham', 'Mana Village', 'Vyas Gufa'] },
      { day: 6, title: 'Badrinath → Rishikesh', description: 'Long drive back. Evening at Triveni Ghat.', stay: 'Rishikesh hotel', meals: meals.full, highlights: ['Triveni Ghat Aarti'] },
      { day: 7, title: 'Departure', description: 'Transfer to Dehradun airport/station.', stay: '—', meals: 'Breakfast', highlights: [] },
    ],
    packages: [
      { tier: 'economy', name: 'Sharda', price: 24500, tagline: 'Shared transport, budget stays', includes: ['Shared tempo', 'Budget hotel', 'Shared guide'], transport: 'Shared tempo traveller', stay: 'Budget hotels', guide: 'Shared', helicopterOption: true },
      { tier: 'standard', name: 'Shraddha', price: 44500, tagline: 'Private cab, 3-star', includes: ['Private Innova', '3-star hotel', 'Personal guide', 'VIP darshan'], transport: 'Private Innova', stay: '3-star hotel', guide: 'Personal guide', helicopterOption: true },
      { tier: 'premium', name: 'Divya (with Heli)', price: 92000, tagline: 'SUV + Kedarnath helicopter return, boutique stays', includes: ['Fortuner', 'Boutique stays', 'Kedarnath helicopter return', 'Dedicated guide + cook', 'Special puja'], transport: 'Fortuner + helicopter', stay: 'Heritage boutique', guide: 'Dedicated', helicopterOption: true },
    ],
    heroImage: getTempleHero('badrinath'),
    gallery: [getTempleHero('kedarnath'), getTempleHero('badrinath'), getDeityImage('lord-shiva'), getDeityImage('lord-vishnu')],
    helicopterAvailable: true,
    tags: ['Shiva', 'Vishnu', '7 days', 'Himalayas', 'Helicopter'],
    reviews: [
      { name: 'Sanjay Gupta', location: 'Kanpur', rating: 5, comment: 'Perfect for limited leave. Helicopter to Kedarnath saved the trip for my 72-year-old father.', yatra: 'Do Dham', date: 'Jun 2025' },
      { name: 'Lakshmi Narayan', location: 'Hyderabad', rating: 5, comment: 'Brahma Kapal tarpan was deeply emotional. Well-organized throughout.', yatra: 'Do Dham', date: 'Sep 2025' },
      { name: 'Asha Devi', location: 'Jaipur', rating: 4, comment: 'Good yatra. A bit rushed on Day 2 but everything else was excellent.', yatra: 'Do Dham', date: 'May 2025' },
    ],
    faqs: [
      { q: 'Can I do only Kedarnath?', a: 'Yes, we offer a 4-day Kedarnath-only package. Contact us for customization.' },
      { q: 'Is helicopter included?', a: 'Helicopter is included in the Premium tier only. Optional add-on for other tiers at ₹8,000/pp one-way.' },
      { q: 'What if weather cancels Kedarnath?', a: 'We rebook helicopter slots or extend stay. In extreme cases, we arrange darshan via Omkareshwar/Ukhimath temple where the deity winters.' },
    ],
    startingPrice: 24500,
  },

  // ── 3. 12 Jyotirlingas ──────────────────────────────────────
  {
    slug: 'jyotirlinga-yatra',
    title: '12 Jyotirlingas Yatra',
    subtitle: 'The twelve self-manifested Shiva shrines',
    description:
      'A comprehensive 16-day pilgrimage covering all 12 Jyotirlingas across 9 states — from Somnath in Gujarat to Rameswaram in Tamil Nadu.',
    longDescription:
      'The twelve Jyotirlingas are the most sacred abodes of Lord Shiva — where he manifested as columns of light. This once-in-a-lifetime yatra spans the breadth of India, covering Somnath, Nageshwar, Mahakaleshwar, Omkareshwar, Trimbakeshwar, Bhimashankar, Grishneshwar, Kashi Vishwanath, Baidyanath, Mallikarjuna, Ramanathaswamy and Kedarnath.',
    durationDays: 16,
    distanceKm: 4200,
    bestTime: 'October to March',
    difficulty: 'moderate',
    deity: 'Lord Shiva',
    region: 'north',
    places: ['Somnath', 'Dwarka', 'Ujjain', 'Omkareshwar', 'Nashik', 'Pune', 'Aurangabad', 'Varanasi', 'Deoghar', 'Srisailam', 'Rameswaram', 'Kedarnath'],
    highlights: [
      'All 12 Jyotirlingas in one curated circuit',
      'Rudrabhishek at Mahakaleshwar Bhasma Aarti',
      'Kashi Vishwanath VIP darshan',
      'Setu bandh at Rameswaram',
      'Sethu teertham in 22 wells',
      'Includes flights between distant shrines',
    ],
    inclusions: ['All internal flights (4 sectors)', 'AC transport', '15 nights stay', 'All sattvic meals', 'VIP darshan at each Jyotirlinga', 'Rudrabhishek puja at 3 temples', 'Experienced tour manager'],
    exclusions: ['International travel', 'Personal expenses', 'Camera fees', 'Tips'],
    itinerary: [
      { day: 1, title: 'Arrive Ahmedabad', description: 'Pickup. Drive to Somnath.', stay: 'Somnath hotel', meals: meals.bnd, highlights: ['Drive briefing'] },
      { day: 2, title: 'Somnath Jyotirlinga', description: 'Morning darshan, Triveni Sangam, sound & light show.', stay: 'Dwarka hotel', meals: meals.full, highlights: ['Somnath Jyotirlinga', 'Triveni Sangam'] },
      { day: 3, title: 'Nageshwar + Dwarka', description: 'Nageshwar Jyotirlinga darshan, Dwarkadhish temple, Bet Dwarka.', stay: 'Dwarka hotel', meals: meals.full, highlights: ['Nageshwar', 'Dwarkadhish', 'Bet Dwarka'] },
      { day: 4, title: 'Fly to Indore → Ujjain', description: 'Fly Jamnagar to Indore. Drive to Ujjain.', stay: 'Ujjain hotel', meals: meals.full, highlights: ['Airport transfer'] },
      { day: 5, title: 'Mahakaleshwar + Omkareshwar', description: 'Early Bhasma Aarti at Mahakaleshwar. Drive to Omkareshwar.', stay: 'Omkareshwar hotel', meals: meals.full, highlights: ['Bhasma Aarti', 'Mahakaleshwar', 'Omkareshwar'] },
      { day: 6, title: 'Fly to Pune → Bhimashankar', description: 'Drive to Indore, fly to Pune, drive to Bhimashankar.', stay: 'Pune hotel', meals: meals.full, highlights: ['Bhimashankar Jyotirlinga'] },
      { day: 7, title: 'Trimbakeshwar + Aurangabad', description: 'Drive to Nashik, Trimbakeshwar darshan, continue to Aurangabad.', stay: 'Aurangabad hotel', meals: meals.full, highlights: ['Trimbakeshwar', 'Godavari origin'] },
      { day: 8, title: 'Grishneshwar + Ellora', description: 'Grishneshwar Jyotirlinga & Ellora Caves.', stay: 'Aurangabad hotel', meals: meals.full, highlights: ['Grishneshwar', 'Ellora Cave 16'] },
      { day: 9, title: 'Fly to Varanasi', description: 'Aurangabad-Mumbai-Varanasi. Evening Ganga Aarti.', stay: 'Varanasi hotel', meals: meals.full, highlights: ['Ganga Aarti at Dashashwamedh Ghat'] },
      { day: 10, title: 'Kashi Vishwanath', description: 'Mangala Aarti, VIP darshan, Manikarnika & Kashi parikrama.', stay: 'Varanasi hotel', meals: meals.full, highlights: ['Kashi Vishwanath Jyotirlinga'] },
      { day: 11, title: 'Fly to Deoghar', description: 'Drive/fly to Deoghar via Patna.', stay: 'Deoghar hotel', meals: meals.full, highlights: ['Travel day'] },
      { day: 12, title: 'Baidyanath Dham', description: 'Baidyanath Jyotirlinga darshan. Panchshul.', stay: 'Deoghar hotel', meals: meals.full, highlights: ['Baidyanath Dham'] },
      { day: 13, title: 'Fly to Hyderabad → Srisailam', description: 'Long travel day. Drive to Srisailam.', stay: 'Srisailam hotel', meals: meals.full, highlights: ['Pathalganga'] },
      { day: 14, title: 'Mallikarjuna + fly to Madurai', description: 'Mallikarjuna darshan. Fly to Madurai, drive to Rameswaram.', stay: 'Rameswaram hotel', meals: meals.full, highlights: ['Mallikarjuna Jyotirlinga'] },
      { day: 15, title: 'Ramanathaswamy', description: '22-well snan, Ramanathaswamy darshan, Dhanushkodi.', stay: 'Rameswaram hotel', meals: meals.full, highlights: ['Ramanathaswamy', 'Dhanushkodi'] },
      { day: 16, title: 'Departure', description: 'Fly from Madurai to home city. (Kedarnath via separate 4-day add-on.)', stay: '—', meals: 'Breakfast', highlights: [] },
    ],
    packages: [
      { tier: 'economy', name: 'Saral', price: 72500, tagline: 'Group tour, 2-star stays, shared transport', includes: ['Economy flights', 'Group tour', '2-star hotel', 'Shared guide'], transport: 'Economy flights + bus', stay: '2-star hotels', guide: 'Group guide' },
      { tier: 'standard', name: 'Sampoorna', price: 135000, tagline: 'Private car, 3-star hotels, VIP darshan', includes: ['Economy flights', 'Private SUV', '3-4 star hotels', 'VIP darshan', 'Personal guide'], transport: 'Flights + private SUV', stay: '3-4 star hotels', guide: 'Personal guide' },
      { tier: 'premium', name: 'Parampara', price: 265000, tagline: 'Business class flights, 5-star stays, dedicated concierge + priest', includes: ['Business class flights (domestic)', '5-star hotels', 'Dedicated guide + accompanying priest', 'Special pujas at each temple', 'All prasad delivered home'], transport: 'Business class flights + luxury SUV', stay: '5-star & heritage hotels', guide: 'Dedicated guide + priest' },
    ],
    heroImage: getTempleHero('somnath'),
    gallery: [getTempleHero('somnath'), getTempleHero('kashi-vishwanath'), getTempleHero('mahakaleshwar'), getTempleHero('kedarnath'), getDeityImage('lord-shiva'), getTempleHero('meenakshi-temple')],
    helicopterAvailable: false,
    tags: ['Shiva', '12 Jyotirlingas', '16 days', 'Pan-India'],
    reviews: [
      { name: 'Om Prakash', location: 'Lucknow', rating: 5, comment: 'A lifetime dream fulfilled. Every Jyotirlinga darshan was unhurried. Bhasma Aarti at Mahakaleshwar — cannot describe the feeling.', yatra: '12 Jyotirlingas', date: 'Nov 2024' },
      { name: 'Sushma & Vinod Desai', location: 'Pune', rating: 5, comment: 'We did it at ages 66 and 69. The team arranged wheelchair access at Kashi Vishwanath which made all the difference.', yatra: '12 Jyotirlingas', date: 'Feb 2025' },
      { name: 'Harish Agarwal', location: 'Indore', rating: 5, comment: 'Flights between sectors kept the pace manageable. Highly recommend for serious devotees.', yatra: '12 Jyotirlingas', date: 'Jan 2025' },
    ],
    faqs: [
      { q: 'Is the 12th (Kedarnath) included?', a: 'Kedarnath is offered as a separate 4-day add-on since it\'s seasonal (May-Oct only). Full 12-Jyotirlinga combo available May-June & Sep-Oct.' },
      { q: 'Can I split the yatra into two parts?', a: 'Yes — many devotees do North India 6 Jyotirlingas + South India 5 Jyotirlingas in two separate yatras.' },
      { q: 'Is physical fitness required?', a: 'Moderate fitness. Darshan queues can be long. Wheelchair assistance can be arranged.' },
      { q: 'Are rudrabhishek pujas included?', a: 'Standard package: 3 temples. Premium: all 12 temples with personalized sankalpa.' },
    ],
    startingPrice: 72500,
  },

  // ── 4. 4 Dhams India ────────────────────────────────────────
  {
    slug: 'four-dhams-india',
    title: '4 Dhams of India',
    subtitle: 'Badrinath, Dwarka, Puri, Rameswaram',
    description:
      'The four cardinal abodes of Lord Vishnu established by Adi Shankaracharya — spanning the four corners of India.',
    longDescription:
      'Established by Adi Shankaracharya in the 8th century, the Char Dham of India refers to the four sacred Vaishnava pilgrimage sites — Badrinath (North), Dwarka (West), Puri (East) and Rameswaram (South). Completing this circuit is believed to grant moksha.',
    durationDays: 14,
    distanceKm: 5800,
    bestTime: 'October to March (Badrinath: May-October)',
    difficulty: 'moderate',
    deity: 'Lord Vishnu',
    region: 'north',
    places: ['Haridwar', 'Badrinath', 'Ahmedabad', 'Dwarka', 'Bhubaneswar', 'Puri', 'Madurai', 'Rameswaram'],
    highlights: ['All 4 Adi Shankaracharya dhams', 'Jagannath Rath Yatra season option', 'Dwarkadhish + Bet Dwarka', 'Ramanathaswamy 22-well snan', 'Badrinath Tapt Kund'],
    inclusions: ['3 domestic flights', 'AC transport', '13 nights accommodation', 'All breakfasts & dinners', 'VIP darshan', 'Tour manager'],
    exclusions: ['International flights', 'Personal expenses', 'Special puja fees'],
    itinerary: [
      { day: 1, title: 'Arrive Dehradun', description: 'Drive to Rishikesh.', stay: 'Rishikesh hotel', meals: meals.bnd, highlights: ['Triveni Ghat'] },
      { day: 2, title: 'Rishikesh → Joshimath', description: '250km drive.', stay: 'Joshimath hotel', meals: meals.full, highlights: ['Narsingh Temple'] },
      { day: 3, title: 'Badrinath', description: 'Drive to Badrinath. Tapt Kund, darshan, Mana village.', stay: 'Badrinath hotel', meals: meals.full, highlights: ['Badrinath Dham', 'Mana Village'] },
      { day: 4, title: 'Return to Haridwar & fly to Ahmedabad', description: 'Long travel day.', stay: 'Ahmedabad hotel', meals: meals.bd, highlights: ['Akshardham (if time permits)'] },
      { day: 5, title: 'Ahmedabad → Dwarka', description: 'Drive/train to Dwarka.', stay: 'Dwarka hotel', meals: meals.full, highlights: ['Dwarka arrival'] },
      { day: 6, title: 'Dwarkadhish + Bet Dwarka', description: 'Dwarkadhish darshan, boat to Bet Dwarka, Nageshwar (bonus).', stay: 'Dwarka hotel', meals: meals.full, highlights: ['Dwarkadhish', 'Bet Dwarka', 'Nageshwar'] },
      { day: 7, title: 'Fly Jamnagar → Bhubaneswar', description: 'Via Mumbai. Transfer to Puri.', stay: 'Puri hotel', meals: meals.full, highlights: ['Lingaraj Temple'] },
      { day: 8, title: 'Jagannath Puri', description: 'Mangla Aarti, Jagannath darshan, temple parikrama.', stay: 'Puri hotel', meals: meals.full, highlights: ['Jagannath Temple', 'Mahaprasad'] },
      { day: 9, title: 'Konark + Puri Beach', description: 'Konark Sun Temple, beach, return to Puri.', stay: 'Puri hotel', meals: meals.full, highlights: ['Konark Sun Temple'] },
      { day: 10, title: 'Fly to Madurai', description: 'Via Chennai.', stay: 'Madurai hotel', meals: meals.full, highlights: ['Meenakshi Temple evening'] },
      { day: 11, title: 'Madurai → Rameswaram', description: 'Drive via Pamban bridge.', stay: 'Rameswaram hotel', meals: meals.full, highlights: ['Pamban Bridge'] },
      { day: 12, title: 'Ramanathaswamy + Dhanushkodi', description: '22-well snan, Ramanathaswamy darshan, Dhanushkodi.', stay: 'Rameswaram hotel', meals: meals.full, highlights: ['Ramanathaswamy', 'Dhanushkodi'] },
      { day: 13, title: 'Rameswaram → Madurai', description: 'Meenakshi Amman temple darshan.', stay: 'Madurai hotel', meals: meals.full, highlights: ['Meenakshi Temple'] },
      { day: 14, title: 'Departure', description: 'Fly from Madurai.', stay: '—', meals: 'Breakfast', highlights: [] },
    ],
    packages: [
      { tier: 'economy', name: 'Saral', price: 58000, tagline: 'Economy flights, 2-star stays', includes: ['Economy flights', 'Group tour', '2-star hotel'], transport: 'Economy flights', stay: '2-star hotels', guide: 'Group' },
      { tier: 'standard', name: 'Sampoorna', price: 115000, tagline: 'Flights + private cab + 3-star', includes: ['Flights', 'Private cab', '3-star hotel', 'Personal guide'], transport: 'Flights + private cab', stay: '3-star hotels', guide: 'Personal' },
      { tier: 'premium', name: 'Parampara', price: 225000, tagline: 'Business class flights, 5-star, dedicated concierge', includes: ['Business class', '5-star hotels', 'Dedicated guide + priest', 'Special pujas'], transport: 'Business flights + luxury SUV', stay: '5-star', guide: 'Dedicated + priest' },
    ],
    heroImage: getTempleHero('dwarkadhish'),
    gallery: [getTempleHero('dwarkadhish'), getTempleHero('jagannath-puri'), getTempleHero('badrinath'), getTempleHero('meenakshi-temple'), getDeityImage('lord-vishnu'), getDeityImage('lord-krishna')],
    helicopterAvailable: false,
    tags: ['Vishnu', '14 days', 'Pan-India', '4 Dhams'],
    reviews: [
      { name: 'Anand Bhatt', location: 'Ahmedabad', rating: 5, comment: 'The spiritual arc of going from Badrinath to Rameswaram is indescribable. Excellent organization.', yatra: '4 Dhams India', date: 'Nov 2024' },
      { name: 'Vasudha Nair', location: 'Kochi', rating: 5, comment: 'Mahaprasad at Jagannath Puri was the spiritual highlight. Team pre-booked the anand bazaar for us.', yatra: '4 Dhams India', date: 'Jan 2025' },
      { name: 'Madhav Rao', location: 'Bangalore', rating: 4, comment: 'Day 4 was tiring but unavoidable. Rest of the yatra was smooth.', yatra: '4 Dhams India', date: 'Feb 2025' },
    ],
    faqs: [
      { q: 'Can I do this during Jagannath Rath Yatra?', a: 'Yes, we run a special June-July batch aligned with Rath Yatra in Puri. Book 6 months in advance.' },
      { q: 'Is the 4 Dhams same as Char Dham?', a: 'No. Char Dham Yatra refers to the 4 shrines in Uttarakhand. 4 Dhams of India refers to the 4 corners of India established by Adi Shankaracharya.' },
    ],
    startingPrice: 58000,
  },

  // ── 5. Amarnath ─────────────────────────────────────────────
  {
    slug: 'amarnath',
    title: 'Amarnath Yatra',
    subtitle: 'The ice Shiva Lingam of Kashmir',
    description:
      'The sacred cave pilgrimage in the Himalayas where Lord Shiva revealed the secret of immortality. Naturally formed ice lingam visible July-August only.',
    longDescription:
      'Amarnath Cave shrine, at 3,888m in the Kashmir Himalayas, houses a naturally-formed ice stalagmite worshipped as Lord Shiva. Accessible only July-August via Pahalgam (traditional) or Baltal (shorter) routes. We handle Amarnath Shrine Board registration, medical certificates, and provide helicopter options.',
    durationDays: 6,
    distanceKm: 420,
    bestTime: 'July to August (only)',
    difficulty: 'extreme',
    deity: 'Lord Shiva',
    region: 'himalayas',
    places: ['Srinagar', 'Pahalgam/Baltal', 'Amarnath Cave', 'Sonmarg'],
    highlights: ['Ice Shiva Lingam darshan', 'Helicopter from Neelgrath/Pahalgam', 'Pahalgam Valley stay', 'Shankaracharya Temple Srinagar', 'Medical support throughout'],
    inclusions: ['Shrine Board yatra permit', 'AC transport', '5 nights stay', 'All meals', 'Medical check-up', 'Experienced guide', 'Oxygen cylinders standby'],
    exclusions: ['Flights to Srinagar', 'Helicopter charges (optional)', 'Pony/palki', 'Personal expenses'],
    itinerary: [
      { day: 1, title: 'Arrive Srinagar', description: 'Shikara ride on Dal Lake. Houseboat stay briefing.', stay: 'Srinagar houseboat', meals: meals.bnd, highlights: ['Dal Lake Shikara', 'Shankaracharya Temple'] },
      { day: 2, title: 'Srinagar → Pahalgam/Baltal', description: 'Drive to base camp (90-100km). Medical check. Rest.', stay: 'Pahalgam hotel', meals: meals.full, highlights: ['Betaab Valley', 'Medical clearance'] },
      { day: 3, title: 'Amarnath Darshan (by trek/pony/heli)', description: 'Early start. Helicopter to Panjtarni or trek from Chandanwari. Ice Lingam darshan.', stay: 'Pahalgam hotel', meals: meals.full, highlights: ['Amarnath Cave', 'Ice Shiva Lingam'] },
      { day: 4, title: 'Pahalgam Valley', description: 'Rest day. Aru, Betaab, Chandanwari sightseeing.', stay: 'Pahalgam hotel', meals: meals.full, highlights: ['Aru Valley', 'Betaab Valley'] },
      { day: 5, title: 'Pahalgam → Sonmarg → Srinagar', description: 'Drive via Sonmarg. Thajiwas Glacier (optional).', stay: 'Srinagar hotel', meals: meals.full, highlights: ['Sonmarg', 'Thajiwas Glacier'] },
      { day: 6, title: 'Departure', description: 'Mughal gardens, Shankaracharya Temple, transfer to airport.', stay: '—', meals: 'Breakfast', highlights: ['Nishat Bagh', 'Shankaracharya Temple'] },
    ],
    packages: [
      { tier: 'economy', name: 'Sharda', price: 32000, tagline: 'Shared transport, tented stays at base', includes: ['Shared tempo', 'Tent/budget stay', 'Shared guide'], transport: 'Shared tempo', stay: 'Budget/tent', guide: 'Shared', helicopterOption: true },
      { tier: 'standard', name: 'Shraddha', price: 62000, tagline: 'Private cab, hotel stays, personal guide', includes: ['Private cab', '3-star hotel', 'Personal guide', 'VIP registration'], transport: 'Private Innova', stay: '3-star hotel', guide: 'Personal', helicopterOption: true },
      { tier: 'premium', name: 'Divya (Heli return)', price: 125000, tagline: 'SUV + helicopter both ways, deluxe houseboat', includes: ['Fortuner', 'Deluxe houseboat + hotel', 'Helicopter both ways', 'Dedicated guide + medical', 'Special puja at cave'], transport: 'SUV + helicopter', stay: 'Deluxe houseboat', guide: 'Dedicated + medical', helicopterOption: true },
    ],
    heroImage: getTempleHero('kedarnath'),
    gallery: [getTempleHero('kedarnath'), getDeityImage('lord-shiva'), getTempleHero('somnath')],
    helicopterAvailable: true,
    tags: ['Shiva', 'Kashmir', '6 days', 'Helicopter', 'Seasonal'],
    reviews: [
      { name: 'Vikram Singh', location: 'Chandigarh', rating: 5, comment: 'Did it at 62 with helicopter. Cave darshan is absolutely divine. Team handled everything including medical.', yatra: 'Amarnath', date: 'Jul 2025' },
      { name: 'Priya Saxena', location: 'Lucknow', rating: 5, comment: 'Helicopter from Neelgrath cut the trek by 80%. Excellent for those who cannot trek.', yatra: 'Amarnath', date: 'Aug 2025' },
      { name: 'Rohit Verma', location: 'Delhi', rating: 4, comment: 'Weather sensitive — our day was delayed but they rebooked helicopter next day.', yatra: 'Amarnath', date: 'Jul 2025' },
    ],
    faqs: [
      { q: 'When does the yatra open?', a: 'Amarnath yatra runs for ~45 days from early July to mid-August (Shravan Purnima). Dates announced by Shri Amarnathji Shrine Board each year.' },
      { q: 'Is medical certificate mandatory?', a: 'Yes. Compulsory Health Certificate (CHC) from authorized doctor. We assist with documentation.' },
      { q: 'What is the age limit?', a: 'Yatris between 13-75 years. Pregnant women and those with serious health conditions are not permitted.' },
      { q: 'Baltal vs Pahalgam route?', a: 'Baltal: 14km trek (1 day). Pahalgam: 36km trek (3-5 days). We recommend helicopter for all elderly devotees.' },
    ],
    startingPrice: 32000,
  },

  // ── 6. Vaishno Devi ────────────────────────────────────────
  {
    slug: 'vaishno-devi',
    title: 'Vaishno Devi Yatra',
    subtitle: 'The holy cave of Mata Rani',
    description:
      'Pilgrimage to the sacred cave of Mata Vaishno Devi at Trikuta Hills, Jammu — one of the most visited shrines in India.',
    longDescription:
      'Mata Vaishno Devi shrine at Trikuta Hills (5,200 ft) is visited by 10 million pilgrims annually. The 13km trek from Katra to Bhawan passes through Banganga, Ardhkuwari, and concludes at the holy cave where three pindi forms of the Goddess reside. Battery cars, helicopter, ponies and palkis available.',
    durationDays: 3,
    distanceKm: 85,
    bestTime: 'September to April',
    difficulty: 'moderate',
    deity: 'Mata Vaishno Devi (Durga)',
    region: 'north',
    places: ['Jammu', 'Katra', 'Ardhkuwari', 'Bhawan', 'Bhairavnath'],
    highlights: ['VIP darshan at Bhawan', 'Helicopter from Katra to Sanjichhat', 'Bhairavnath temple darshan', 'Aarti timings assistance', 'Pre-booked pony/palki'],
    inclusions: ['AC transport Jammu-Katra', '2 nights Katra hotel', 'Breakfast & dinner', 'Yatra slip (RFID)', 'Guide assistance', 'Prasad'],
    exclusions: ['Flights to Jammu', 'Helicopter (optional)', 'Pony/palki', 'Food during trek'],
    itinerary: [
      { day: 1, title: 'Arrive Jammu → Katra', description: 'Pickup from Jammu. Drive to Katra (50km). Raghunath Temple en route.', stay: 'Katra hotel', meals: meals.bnd, highlights: ['Raghunath Temple Jammu'] },
      { day: 2, title: 'Vaishno Devi Darshan', description: 'Early start. Trek/battery car/helicopter to Bhawan. Darshan at holy cave. Bhairavnath temple. Return to Katra.', stay: 'Katra hotel', meals: meals.full, highlights: ['Vaishno Devi Bhawan', 'Bhairavnath'] },
      { day: 3, title: 'Departure', description: 'Darshan of Shiv Khori (optional). Transfer to Jammu airport/station.', stay: '—', meals: 'Breakfast', highlights: ['Shiv Khori cave'] },
    ],
    packages: [
      { tier: 'economy', name: 'Sharda', price: 8500, tagline: 'Shared transport, budget hotel', includes: ['Shared transport', 'Budget hotel', 'Yatra slip'], transport: 'Shared', stay: 'Budget', guide: 'Shared', helicopterOption: true },
      { tier: 'standard', name: 'Shraddha', price: 18500, tagline: 'Private cab, 3-star, battery car included', includes: ['Private cab', '3-star hotel', 'Battery car', 'Personal guide'], transport: 'Private Innova', stay: '3-star', guide: 'Personal', helicopterOption: true },
      { tier: 'premium', name: 'Divya (Heli)', price: 38500, tagline: 'SUV + helicopter both ways, luxury stay', includes: ['Fortuner', 'Luxury hotel', 'Helicopter both ways', 'VIP darshan', 'Bhairavnath heli possible'], transport: 'SUV + helicopter', stay: 'Luxury hotel', guide: 'Dedicated', helicopterOption: true },
    ],
    heroImage: getTempleHero('meenakshi-temple'),
    gallery: [getTempleHero('meenakshi-temple'), getDeityImage('goddess-durga'), getTempleHero('kedarnath')],
    helicopterAvailable: true,
    tags: ['Durga', 'Jammu', '3 days', 'Helicopter', 'Easy'],
    reviews: [
      { name: 'Sunita Agarwal', location: 'Delhi', rating: 5, comment: 'Did it with my 75-year-old mother. Helicopter made it possible. Jai Mata Di!', yatra: 'Vaishno Devi', date: 'Dec 2024' },
      { name: 'Rajesh Khanna', location: 'Jalandhar', rating: 5, comment: 'Third time doing it with Darshya. They handle everything — we just walk and pray.', yatra: 'Vaishno Devi', date: 'Feb 2025' },
      { name: 'Geeta Patel', location: 'Ahmedabad', rating: 4, comment: 'VIP darshan pass saved us 4 hours of queue. Worth the upgrade.', yatra: 'Vaishno Devi', date: 'Jan 2025' },
    ],
    faqs: [
      { q: 'Is Yatra Parchi (slip) mandatory?', a: 'Yes. We pre-book your RFID-enabled Yatra slip. No entry without it.' },
      { q: 'Helicopter vs trek?', a: 'Helicopter: Katra-Sanjichhat-Katra covers 80% of the climb. 2.5km walk from Sanjichhat remains. Total time: 3-4 hours vs 10-12 hours trek.' },
      { q: 'Bhairavnath darshan?', a: 'Yatra is complete only after Bhairavnath darshan. Located 2km from Bhawan. Helicopter also possible.' },
    ],
    startingPrice: 8500,
  },

  // ── 7. Shirdi Sai ──────────────────────────────────────────
  {
    slug: 'shirdi-sai',
    title: 'Shirdi Sai + Shani Shingnapur',
    subtitle: 'Sai Baba darshan + Shani Dev shrine',
    description:
      'A spiritually dense 4-day yatra covering Shirdi Sai Baba, Shani Shingnapur, and the Ashtavinayak Ganesh temples circuit.',
    longDescription:
      'This yatra takes you to Shirdi (Sai Baba\'s samadhi), Shani Shingnapur (the unique roofless Shani shrine), Trimbakeshwar (Jyotirlinga) and optionally covers part of the Ashtavinayak (8 Ganesh shrines) circuit in Maharashtra.',
    durationDays: 4,
    distanceKm: 520,
    bestTime: 'October to March',
    difficulty: 'easy',
    deity: 'Sai Baba, Shani Dev, Shiva, Ganesh',
    region: 'west',
    places: ['Mumbai/Pune', 'Shirdi', 'Shani Shingnapur', 'Trimbakeshwar', 'Nashik'],
    highlights: ['Shirdi Kakad Aarti', 'Dwarkamai & Chavadi', 'Shani Shingnapur oil abhishek', 'Trimbakeshwar Jyotirlinga', 'Sai prasad delivery'],
    inclusions: ['AC transport', '3 nights stay', 'Breakfast & dinner', 'VIP darshan passes', 'Tour manager'],
    exclusions: ['Flights', 'Personal puja fees', 'Shopping'],
    itinerary: [
      { day: 1, title: 'Arrive Mumbai → Shirdi', description: 'Drive to Shirdi (230km). Evening Dhoop Aarti.', stay: 'Shirdi hotel', meals: meals.bnd, highlights: ['Dhoop Aarti'] },
      { day: 2, title: 'Shirdi Full Day', description: 'Kakad Aarti, Samadhi darshan, Dwarkamai, Chavadi, Gurusthan, Khandoba Temple.', stay: 'Shirdi hotel', meals: meals.full, highlights: ['Kakad Aarti', 'Dwarkamai', 'Chavadi'] },
      { day: 3, title: 'Shani Shingnapur + Trimbakeshwar', description: 'Morning Shani Shingnapur (drive 75km). Continue to Trimbakeshwar.', stay: 'Nashik hotel', meals: meals.full, highlights: ['Shani Shingnapur', 'Trimbakeshwar Jyotirlinga'] },
      { day: 4, title: 'Nashik → Mumbai Departure', description: 'Panchvati, Kalaram Temple, return to Mumbai.', stay: '—', meals: 'Breakfast', highlights: ['Panchvati', 'Kalaram Temple'] },
    ],
    packages: [
      { tier: 'economy', name: 'Sharda', price: 15500, tagline: 'Shared, 2-star', includes: ['Shared transport', '2-star hotel', 'Basic darshan'], transport: 'Shared tempo', stay: '2-star', guide: 'Shared' },
      { tier: 'standard', name: 'Shraddha', price: 28500, tagline: 'Private cab, 3-star, VIP darshan', includes: ['Private cab', '3-star hotel', 'VIP darshan passes', 'Personal guide'], transport: 'Private Innova', stay: '3-star', guide: 'Personal' },
      { tier: 'premium', name: 'Divya', price: 55000, tagline: 'Luxury SUV, 5-star stays, special puja', includes: ['Fortuner', '5-star hotels', 'Special abhishek at Trimbakeshwar', 'Dedicated guide + priest'], transport: 'Fortuner', stay: '5-star', guide: 'Dedicated + priest' },
    ],
    heroImage: getTempleHero('siddhivinayak'),
    gallery: [getTempleHero('siddhivinayak'), getDeityImage('lord-shiva'), getDeityImage('lord-ganesha'), getTempleHero('somnath')],
    helicopterAvailable: false,
    tags: ['Sai Baba', 'Shani', 'Maharashtra', '4 days', 'Easy'],
    reviews: [
      { name: 'Ashwini Deshmukh', location: 'Mumbai', rating: 5, comment: 'Sabka Malik Ek! Kakad Aarti was divine. Very well organized.', yatra: 'Shirdi Sai', date: 'Jan 2025' },
      { name: 'Suresh Iyengar', location: 'Bangalore', rating: 5, comment: 'Oil abhishek at Shani Shingnapur was a powerful experience. Highly recommend.', yatra: 'Shirdi Sai', date: 'Dec 2024' },
      { name: 'Kavita Joshi', location: 'Nagpur', rating: 4, comment: 'Day 3 was packed — consider extending by a day for slower pace.', yatra: 'Shirdi Sai', date: 'Feb 2025' },
    ],
    faqs: [
      { q: 'Can women enter Shani Shingnapur sanctum?', a: 'Yes, since 2016 women are permitted to enter the chauthara. Our guide will accompany.' },
      { q: 'Is Kakad Aarti (4:30am) mandatory?', a: 'Optional but highly recommended. We arrange VIP passes.' },
    ],
    startingPrice: 15500,
  },

  // ── 8. Tirupati South India ────────────────────────────────
  {
    slug: 'tirupati-south',
    title: 'Tirupati + South India Temples',
    subtitle: 'Balaji darshan + South India temple circuit',
    description:
      'A 9-day grand South Indian temple yatra covering Tirupati Balaji, Meenakshi Amman, Ramanathaswamy, Padmanabhaswamy, Mookambika and Udupi Krishna.',
    longDescription:
      'The Dakshin Bharat yatra features the wealthiest temple in the world (Tirupati), the Dravidian architectural marvel (Meenakshi), the Setu Jyotirlinga (Rameswaram), and the mystical shrines of Kerala and Karnataka coast.',
    durationDays: 9,
    distanceKm: 1850,
    bestTime: 'October to March',
    difficulty: 'moderate',
    deity: 'Vishnu (Balaji), Shiva, Meenakshi, Krishna',
    region: 'south',
    places: ['Chennai', 'Tirupati', 'Kanchipuram', 'Madurai', 'Rameswaram', 'Kanyakumari', 'Trivandrum', 'Udupi'],
    highlights: ['Tirupati VIP darshan (Seeghra)', 'Meenakshi Amman temple', 'Ramanathaswamy 22-well snan', 'Padmanabhaswamy darshan', 'Udupi Krishna kanakana kindi'],
    inclusions: ['AC transport', '1 internal flight', '8 nights stay', 'All meals', 'Tirupati VIP darshan', 'Tour manager'],
    exclusions: ['Flights to Chennai', 'Special darshan upgrades', 'Personal shopping'],
    itinerary: [
      { day: 1, title: 'Chennai → Tirupati', description: 'Pickup. Drive to Tirupati (140km). Check in.', stay: 'Tirupati hotel', meals: meals.bnd, highlights: ['Tirupati arrival'] },
      { day: 2, title: 'Tirumala Darshan', description: 'Early morning drive up. Seeghra darshan of Balaji. Return.', stay: 'Tirupati hotel', meals: meals.full, highlights: ['Balaji Darshan', 'Laddu Prasadam'] },
      { day: 3, title: 'Tirupati → Kanchipuram → Chennai', description: 'Kamakshi Amman, Ekambareswarar darshan. Overnight Chennai.', stay: 'Chennai hotel', meals: meals.full, highlights: ['Kamakshi Amman', 'Ekambareswarar'] },
      { day: 4, title: 'Chennai → Madurai', description: 'Fly to Madurai. Evening Meenakshi Amman darshan.', stay: 'Madurai hotel', meals: meals.full, highlights: ['Meenakshi Amman'] },
      { day: 5, title: 'Madurai → Rameswaram', description: 'Drive via Pamban. Ramanathaswamy darshan & 22-well snan.', stay: 'Rameswaram hotel', meals: meals.full, highlights: ['Ramanathaswamy', 'Dhanushkodi'] },
      { day: 6, title: 'Rameswaram → Kanyakumari', description: 'Drive to Kanyakumari. Sunset at Triveni.', stay: 'Kanyakumari hotel', meals: meals.full, highlights: ['Kanyakumari sunset', 'Vivekananda Rock'] },
      { day: 7, title: 'Kanyakumari → Trivandrum', description: 'Sunrise. Drive to Trivandrum. Padmanabhaswamy darshan.', stay: 'Trivandrum hotel', meals: meals.full, highlights: ['Padmanabhaswamy Temple'] },
      { day: 8, title: 'Fly to Mangalore → Udupi', description: 'Udupi Krishna darshan. Kanakana Kindi.', stay: 'Udupi hotel', meals: meals.full, highlights: ['Udupi Krishna', 'Kanakana Kindi'] },
      { day: 9, title: 'Mookambika → Mangalore departure', description: 'Kollur Mookambika darshan. Drive to Mangalore. Fly home.', stay: '—', meals: 'Breakfast', highlights: ['Kollur Mookambika'] },
    ],
    packages: [
      { tier: 'economy', name: 'Saral', price: 38500, tagline: 'Economy flights, 2-star stays', includes: ['Economy flight', 'Group tour', '2-star hotel'], transport: 'Economy flight + AC bus', stay: '2-star hotels', guide: 'Group' },
      { tier: 'standard', name: 'Sampoorna', price: 72500, tagline: 'Private cab, 3-star, VIP darshan', includes: ['Flight', 'Private cab', '3-star hotel', 'Tirupati Seeghra darshan'], transport: 'Flight + private Innova', stay: '3-star', guide: 'Personal' },
      { tier: 'premium', name: 'Parampara', price: 155000, tagline: 'Business class flights, 5-star, dedicated priest', includes: ['Business flight', '5-star hotels', 'Dedicated priest at each temple', 'Special darshan upgrades'], transport: 'Business flight + Fortuner', stay: '5-star', guide: 'Dedicated + priest' },
    ],
    heroImage: getTempleHero('tirupati'),
    gallery: [getTempleHero('tirupati'), getTempleHero('meenakshi-temple'), getDeityImage('lord-vishnu'), getDeityImage('goddess-lakshmi')],
    helicopterAvailable: false,
    tags: ['Balaji', 'Meenakshi', 'South India', '9 days'],
    reviews: [
      { name: 'Lakshmipathi Rao', location: 'Hyderabad', rating: 5, comment: 'Tirupati Seeghra darshan was pre-arranged perfectly. No 8-hour wait like before. Worth every rupee.', yatra: 'Tirupati South India', date: 'Jan 2025' },
      { name: 'Radha Menon', location: 'Kochi', rating: 5, comment: 'Covering 6 major temples in 9 days with comfort — only Darshya managed this.', yatra: 'Tirupati South India', date: 'Feb 2025' },
      { name: 'Vasant Shetty', location: 'Mangalore', rating: 4, comment: 'Udupi + Mookambika combo is a nice touch. Would prefer extra day at Rameswaram.', yatra: 'Tirupati South India', date: 'Dec 2024' },
    ],
    faqs: [
      { q: 'Is Tirupati darshan guaranteed?', a: 'Yes, we pre-book TTD Seeghra Darshan quota (₹300 slot) included in Standard/Premium. Economy gets regular darshan.' },
      { q: 'Dress code at Padmanabhaswamy?', a: 'Strict: Men — dhoti (veshti), no shirt. Women — saree/mundu. Our team provides dhotis at entry.' },
      { q: 'Can Kanyakumari + Madurai swap?', a: 'Yes, the itinerary is flexible based on flight availability. We confirm 7 days before travel.' },
    ],
    startingPrice: 38500,
  },

  // ── 9. Ayodhya + Kashi + Prayagraj ─────────────────────────
  {
    slug: 'ayodhya-kashi',
    title: 'Ayodhya Ram Mandir + Kashi + Prayagraj',
    subtitle: 'Ram Janmabhoomi, Kashi Vishwanath & Triveni Sangam',
    description:
      'The holiest Vaishnava-Shaiva circuit of North India — Ram Lalla darshan at the new Ram Mandir, Kashi Vishwanath corridor, and Triveni Sangam at Prayagraj.',
    longDescription:
      'Following the Ram Mandir pran pratishtha in January 2024, Ayodhya has become the foremost Vaishnava tirth. Combined with the Kashi Vishwanath corridor and Prayagraj\'s Triveni Sangam, this 6-day yatra is the most sought-after pilgrimage of our time.',
    durationDays: 6,
    distanceKm: 650,
    bestTime: 'October to March',
    difficulty: 'easy',
    deity: 'Ram, Shiva, Sangam',
    region: 'north',
    places: ['Lucknow', 'Ayodhya', 'Prayagraj', 'Varanasi', 'Sarnath'],
    highlights: ['Ram Lalla darshan at new Mandir', 'Hanuman Garhi', 'Kashi Vishwanath VIP darshan', 'Triveni Sangam snan', 'Ganga Aarti at Dashashwamedh', 'Sarnath Buddhist circuit'],
    inclusions: ['AC transport', '5 nights stay', 'All breakfasts & dinners', 'VIP passes for Ram Mandir & Kashi Vishwanath', 'Tour manager', 'Boat ride in Sangam'],
    exclusions: ['Flights', 'Special puja/Rudrabhishek fees', 'Personal expenses'],
    itinerary: [
      { day: 1, title: 'Arrive Lucknow → Ayodhya', description: 'Drive to Ayodhya (135km). Evening Saryu Aarti.', stay: 'Ayodhya hotel', meals: meals.bnd, highlights: ['Saryu Aarti'] },
      { day: 2, title: 'Ayodhya Full Day', description: 'Ram Mandir darshan, Hanuman Garhi, Kanak Bhawan, Nandigram, Saryu ghat.', stay: 'Ayodhya hotel', meals: meals.full, highlights: ['Ram Mandir', 'Hanuman Garhi', 'Kanak Bhawan'] },
      { day: 3, title: 'Ayodhya → Prayagraj', description: 'Drive via Faizabad (160km). Afternoon Sangam boat ride.', stay: 'Prayagraj hotel', meals: meals.full, highlights: ['Triveni Sangam boat'] },
      { day: 4, title: 'Prayagraj → Varanasi', description: 'Morning Sangam snan & tarpan. Hanuman Mandir, Akshayavat. Drive to Varanasi.', stay: 'Varanasi hotel', meals: meals.full, highlights: ['Sangam snan', 'Akshayavat', 'Ganga Aarti at Dashashwamedh'] },
      { day: 5, title: 'Varanasi Full Day', description: 'Mangala Aarti Kashi Vishwanath, corridor tour, Sankat Mochan, Sarnath, evening boat ride.', stay: 'Varanasi hotel', meals: meals.full, highlights: ['Kashi Vishwanath', 'Sankat Mochan', 'Sarnath'] },
      { day: 6, title: 'Departure', description: 'Manikarnika ghat, BHU Vishwanath, transfer to Varanasi airport.', stay: '—', meals: 'Breakfast', highlights: ['BHU Vishwanath', 'Manikarnika'] },
    ],
    packages: [
      { tier: 'economy', name: 'Saral', price: 22500, tagline: 'Shared, 2-star hotels', includes: ['Shared transport', '2-star hotel', 'General darshan'], transport: 'Shared tempo', stay: '2-star', guide: 'Shared' },
      { tier: 'standard', name: 'Sampoorna', price: 42500, tagline: 'Private cab, 3-star, VIP darshan', includes: ['Private cab', '3-star hotel', 'Ram Mandir + Kashi VIP passes', 'Personal guide'], transport: 'Private Innova', stay: '3-star', guide: 'Personal' },
      { tier: 'premium', name: 'Parampara', price: 85000, tagline: 'SUV, 5-star, dedicated priest + Rudrabhishek', includes: ['Fortuner', '5-star hotels', 'Rudrabhishek at Kashi Vishwanath', 'Saryu tarpan puja', 'Dedicated guide + priest'], transport: 'Fortuner', stay: '5-star', guide: 'Dedicated + priest' },
    ],
    heroImage: getTempleHero('kashi-vishwanath'),
    gallery: [getTempleHero('kashi-vishwanath'), getDeityImage('lord-rama'), getDeityImage('lord-shiva'), getDeityImage('lord-hanuman'), getTempleHero('akshardham')],
    helicopterAvailable: false,
    tags: ['Ram', 'Shiva', '6 days', 'Ayodhya', 'Kashi'],
    reviews: [
      { name: 'Dinesh Mishra', location: 'Patna', rating: 5, comment: 'Ram Lalla darshan — tears rolled down. Darshya handled the pre-booking. No chaotic queues.', yatra: 'Ayodhya Kashi', date: 'Feb 2025' },
      { name: 'Kamala Devi', location: 'Gwalior', rating: 5, comment: 'Rudrabhishek at Kashi with my son\'s sankalpa was the spiritual peak of my life. Premium package is worth it.', yatra: 'Ayodhya Kashi', date: 'Jan 2025' },
      { name: 'Ravi Shankar', location: 'Kolkata', rating: 5, comment: 'Triveni Sangam tarpan for ancestors was conducted by the tour priest beautifully. Highly recommend.', yatra: 'Ayodhya Kashi', date: 'Dec 2024' },
    ],
    faqs: [
      { q: 'How long is the queue at Ram Mandir?', a: 'Standard queue: 2-4 hours. Our pre-booked suvidha passes reduce it to 30 minutes.' },
      { q: 'Can Rudrabhishek be arranged at Kashi Vishwanath?', a: 'Yes — included in Premium. For Standard, ₹2,100 add-on.' },
      { q: 'Is Kumbh Mela possible via this yatra?', a: 'Yes — during Kumbh (every 6 years) and Maha Kumbh (every 12 years), we run special extended yatras with tent accommodation.' },
    ],
    startingPrice: 22500,
  },
];

// ────────────────────────────────────────────────────────────
// TRAVEL COMPANIONS — 8 verified profiles
// ────────────────────────────────────────────────────────────

export const companions: TravelCompanion[] = [
  {
    id: 'rajesh-kumar',
    name: 'Rajesh Kumar',
    initials: 'RK',
    age: 42,
    gender: 'male',
    city: 'Haridwar',
    languages: ['Hindi', 'English', 'Garhwali'],
    yatrasCompleted: 187,
    rating: 4.9,
    reviewCount: 124,
    specializations: ['Char Dham specialist', 'Elderly care', 'Medical first-aid'],
    bio: 'Born and raised in Haridwar, Rajesh has been guiding Char Dham yatris for 16 years. Certified in Wilderness First Aid and fluent in 3 languages. Rajesh personally carries a medical kit with BP monitor, oximeter and emergency medicines.',
    experience: '16 years',
    pricePerDay: 3500,
    verified: { aadhaar: true, background: true, medical: true },
    avatarColor: '#b87333',
    availability: 'available',
    pastYatras: ['Char Dham (85)', 'Do Dham (62)', 'Amarnath (24)', 'Vaishno Devi (16)'],
    reviews: [
      { author: 'Seema Gupta, Delhi', rating: 5, comment: 'My father (74) could not have completed Char Dham without Rajesh ji. He remembered every medication timing.', yatra: 'Char Dham' },
      { author: 'Anil Desai, Mumbai', rating: 5, comment: 'Rajesh coordinated with family back home every evening. 100% recommend.', yatra: 'Do Dham' },
    ],
  },
  {
    id: 'priya-sharma',
    name: 'Priya Sharma',
    initials: 'PS',
    age: 35,
    gender: 'female',
    city: 'Varanasi',
    languages: ['Hindi', 'English', 'Sanskrit', 'Bhojpuri'],
    yatrasCompleted: 142,
    rating: 5.0,
    reviewCount: 98,
    specializations: ['Women-only groups', 'Kashi corridor expert', 'Senior ladies', 'Widow tirth yatra'],
    bio: 'Priya holds a degree in Sanskrit from BHU and has been leading yatras since 2015. She specializes in women-only groups and is the preferred companion for elderly ladies undertaking widow tirth yatras. Trained in basic nursing.',
    experience: '10 years',
    pricePerDay: 3200,
    verified: { aadhaar: true, background: true, medical: true },
    avatarColor: '#ec4899',
    availability: 'available',
    pastYatras: ['Ayodhya-Kashi-Prayagraj (64)', 'Vindhyachal (18)', 'Vrindavan (32)', '12 Jyotirlingas (8)'],
    reviews: [
      { author: 'Kamla Devi, Kanpur', rating: 5, comment: 'Priya beti was like my own daughter. Made my first yatra without my husband bearable.', yatra: 'Kashi' },
      { author: 'Veena Iyer, Chennai', rating: 5, comment: 'Her Sanskrit mantra knowledge enhanced every temple darshan.', yatra: 'Ayodhya Kashi' },
    ],
  },
  {
    id: 'mohammed-aslam',
    name: 'Mohammed Aslam',
    initials: 'MA',
    age: 48,
    gender: 'male',
    city: 'Srinagar',
    languages: ['Hindi', 'English', 'Urdu', 'Kashmiri', 'Dogri'],
    yatrasCompleted: 156,
    rating: 4.8,
    reviewCount: 103,
    specializations: ['Amarnath specialist', 'Vaishno Devi', 'High-altitude medicine', 'Weather judgment'],
    bio: 'Born in Srinagar, Aslam has led 156 Amarnath yatras and is the most trusted companion for Kashmir-region pilgrimages. His weather judgment has avoided multiple helicopter cancellations. AMRI-certified in High Altitude Medicine.',
    experience: '22 years',
    pricePerDay: 4500,
    verified: { aadhaar: true, background: true, medical: true },
    avatarColor: '#0ea5e9',
    availability: 'limited',
    pastYatras: ['Amarnath (76)', 'Vaishno Devi (54)', 'Kailash Mansarovar (14)', 'Ladakh spiritual (12)'],
    reviews: [
      { author: 'Gaurav Mehta, Delhi', rating: 5, comment: 'Aslam bhai insisted we wait 1 day at Pahalgam — next day helicopter flew perfectly. Others got stuck for 3 days.', yatra: 'Amarnath' },
      { author: 'Pankaj Sharma, Jammu', rating: 5, comment: 'Medical knowledge saved my father from altitude sickness. Carried oxygen throughout.', yatra: 'Amarnath' },
    ],
  },
  {
    id: 'lakshmi-iyer',
    name: 'Lakshmi Iyer',
    initials: 'LI',
    age: 38,
    gender: 'female',
    city: 'Madurai',
    languages: ['Tamil', 'English', 'Hindi', 'Malayalam', 'Sanskrit'],
    yatrasCompleted: 112,
    rating: 4.9,
    reviewCount: 87,
    specializations: ['South India routes', 'Tamil Nadu temples', 'Agama shastra knowledge', 'Elderly care'],
    bio: 'Lakshmi is a Sanskrit scholar and Agama shastra expert. She specializes in South Indian temple yatras and is the go-to companion for North Indian devotees doing Tirupati + Meenakshi + Rameswaram circuits. Vegetarian cook by training.',
    experience: '12 years',
    pricePerDay: 3000,
    verified: { aadhaar: true, background: true, medical: true },
    avatarColor: '#16a34a',
    availability: 'available',
    pastYatras: ['Tirupati + South (58)', '4 Dhams India (22)', 'Navagraha (18)', 'Murugan Arupadai Veedu (14)'],
    reviews: [
      { author: 'Nirmal Saxena, Lucknow', rating: 5, comment: 'Lakshmi madam explained each temple history and ritual. North Indian family — she handled our food preferences perfectly.', yatra: 'Tirupati South India' },
      { author: 'Shanti Bhatia, Delhi', rating: 5, comment: 'Our dietary restrictions (Jain) were handled without a single error. Thank you Lakshmi!', yatra: '4 Dhams' },
    ],
  },
  {
    id: 'vikram-nayar',
    name: 'Vikram Nayar',
    initials: 'VN',
    age: 45,
    gender: 'male',
    city: 'Pune',
    languages: ['Marathi', 'Hindi', 'English', 'Konkani'],
    yatrasCompleted: 201,
    rating: 4.9,
    reviewCount: 156,
    specializations: ['Ashtavinayak expert', 'Shirdi Sai', 'Maharashtra temple circuit', '12 Jyotirlingas'],
    bio: 'Vikram has been a temple circuit specialist for 18 years. Completed 58 full 12-Jyotirlinga yatras. Ex-Army medic with advanced first-aid training. Preferred by high-profile devotees for discretion and efficiency.',
    experience: '18 years',
    pricePerDay: 4000,
    verified: { aadhaar: true, background: true, medical: true },
    avatarColor: '#943B19',
    availability: 'busy',
    pastYatras: ['12 Jyotirlingas (58)', 'Shirdi Sai (72)', 'Ashtavinayak (46)', '4 Dhams (25)'],
    reviews: [
      { author: 'Neeta Agarwal, Delhi', rating: 5, comment: 'Vikram ji\'s military precision showed at every temple — VIP darshan arranged in minutes, not hours.', yatra: '12 Jyotirlingas' },
      { author: 'Hari Chand, Hyderabad', rating: 5, comment: 'He arranged a last-minute helicopter for my wife when she got altitude sickness at Bhimashankar. Life-saver.', yatra: '12 Jyotirlingas' },
    ],
  },
  {
    id: 'anita-deshmukh',
    name: 'Anita Deshmukh',
    initials: 'AD',
    age: 33,
    gender: 'female',
    city: 'Nashik',
    languages: ['Marathi', 'Hindi', 'English'],
    yatrasCompleted: 78,
    rating: 4.7,
    reviewCount: 62,
    specializations: ['Hindi-only comfort', 'Shirdi Sai routes', 'Dietary assistance (Jain/Vaishnav)', 'Elderly with mobility issues'],
    bio: 'Anita is a certified elder-care specialist with 8 years of experience. She is the preferred companion for elderly Hindi-speaking devotees who are not comfortable in English. Holds a diploma in gerontology.',
    experience: '8 years',
    pricePerDay: 2800,
    verified: { aadhaar: true, background: true, medical: true },
    avatarColor: '#D4A438',
    availability: 'available',
    pastYatras: ['Shirdi Sai (42)', 'Trimbakeshwar (28)', 'Do Dham (8)'],
    reviews: [
      { author: 'Prema Kulkarni, Bhopal', rating: 5, comment: 'Anita ji helped my 82-year-old mother with wheelchair at every temple. Incredibly patient.', yatra: 'Shirdi Sai' },
      { author: 'Ram Lal, Jodhpur', rating: 4, comment: 'Good Hindi-only communication. Our group felt very comfortable.', yatra: 'Shirdi Sai' },
    ],
  },
  {
    id: 'suresh-nair',
    name: 'Suresh Nair',
    initials: 'SN',
    age: 40,
    gender: 'male',
    city: 'Thiruvananthapuram',
    languages: ['Malayalam', 'Tamil', 'English', 'Hindi'],
    yatrasCompleted: 94,
    rating: 4.8,
    reviewCount: 71,
    specializations: ['Kerala temples', 'Sabarimala specialist', 'Padmanabhaswamy protocol', 'Nair gotra pujas'],
    bio: 'Suresh is an expert in Kerala temple protocols. Has completed 18 Sabarimala seasons as a guide and knows the strict dress codes and rituals of Kerala\'s ancient shrines. Fluent in temple-Sanskrit.',
    experience: '14 years',
    pricePerDay: 3500,
    verified: { aadhaar: true, background: true, medical: true },
    avatarColor: '#0369a1',
    availability: 'available',
    pastYatras: ['Sabarimala (18 seasons)', 'Padmanabhaswamy (24)', 'Guruvayur (32)', 'Tirupati + Kerala (20)'],
    reviews: [
      { author: 'Murali Krishnan, Chennai', rating: 5, comment: 'Suresh ji arranged our Padmanabhaswamy darshan including dhoti assistance. Flawless.', yatra: 'Tirupati South' },
      { author: 'Rani Pillai, Mumbai', rating: 5, comment: 'Sabarimala yatra during Mandalam — Suresh managed 41-day vratham guidance before travel.', yatra: 'Sabarimala' },
    ],
  },
  {
    id: 'meena-agarwal',
    name: 'Meena Agarwal',
    initials: 'MA',
    age: 36,
    gender: 'female',
    city: 'Ayodhya',
    languages: ['Hindi', 'English', 'Awadhi', 'Sanskrit'],
    yatrasCompleted: 89,
    rating: 5.0,
    reviewCount: 68,
    specializations: ['Ayodhya Ram Mandir expert', 'Kashi Vishwanath corridor', 'Saryu tarpan', 'Women-only groups'],
    bio: 'Meena has been deeply involved in Ayodhya\'s rise as a pilgrimage center post-Ram Mandir inauguration. She coordinates directly with Shri Ram Janmabhoomi Teerth Kshetra Trust for suvidha pass bookings.',
    experience: '9 years',
    pricePerDay: 3000,
    verified: { aadhaar: true, background: true, medical: true },
    avatarColor: '#b87333',
    availability: 'limited',
    pastYatras: ['Ayodhya Kashi Prayagraj (64)', 'Vindhyachal (12)', 'Naimisharanya (13)'],
    reviews: [
      { author: 'Vijay Singh, Bhopal', rating: 5, comment: 'Meena ji got us Ram Lalla darshan without any wait. Her connections with Trust are genuine.', yatra: 'Ayodhya Kashi' },
      { author: 'Sushma Jain, Indore', rating: 5, comment: 'Saryu tarpan for my late father was conducted with proper Awadhi rituals. Emotional.', yatra: 'Ayodhya Kashi' },
    ],
  },
];

// ────────────────────────────────────────────────────────────
// SACRED SITES — 30+ for custom planner
// ────────────────────────────────────────────────────────────

export const sacredSites: SacredSite[] = [
  // Jyotirlingas (12)
  { id: 'somnath', name: 'Somnath', location: 'Veraval', state: 'Gujarat', region: 'west', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'mallikarjuna', name: 'Mallikarjuna', location: 'Srisailam', state: 'Andhra Pradesh', region: 'south', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'mahakaleshwar', name: 'Mahakaleshwar', location: 'Ujjain', state: 'Madhya Pradesh', region: 'west', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'omkareshwar', name: 'Omkareshwar', location: 'Khandwa', state: 'Madhya Pradesh', region: 'west', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'kedarnath', name: 'Kedarnath', location: 'Rudraprayag', state: 'Uttarakhand', region: 'himalayas', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'bhimashankar', name: 'Bhimashankar', location: 'Pune', state: 'Maharashtra', region: 'west', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'kashi-vishwanath', name: 'Kashi Vishwanath', location: 'Varanasi', state: 'Uttar Pradesh', region: 'north', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'trimbakeshwar', name: 'Trimbakeshwar', location: 'Nashik', state: 'Maharashtra', region: 'west', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'baidyanath', name: 'Baidyanath', location: 'Deoghar', state: 'Jharkhand', region: 'east', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'nageshwar', name: 'Nageshwar', location: 'Dwarka', state: 'Gujarat', region: 'west', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'rameswaram', name: 'Ramanathaswamy', location: 'Rameswaram', state: 'Tamil Nadu', region: 'south', deity: 'Shiva', type: 'jyotirlinga' },
  { id: 'grishneshwar', name: 'Grishneshwar', location: 'Aurangabad', state: 'Maharashtra', region: 'west', deity: 'Shiva', type: 'jyotirlinga' },
  // Char Dham (Uttarakhand)
  { id: 'yamunotri', name: 'Yamunotri', location: 'Uttarkashi', state: 'Uttarakhand', region: 'himalayas', deity: 'Yamuna', type: 'dham' },
  { id: 'gangotri', name: 'Gangotri', location: 'Uttarkashi', state: 'Uttarakhand', region: 'himalayas', deity: 'Ganga', type: 'dham' },
  { id: 'badrinath', name: 'Badrinath', location: 'Chamoli', state: 'Uttarakhand', region: 'himalayas', deity: 'Vishnu', type: 'dham' },
  // 4 Dhams
  { id: 'dwarka', name: 'Dwarkadhish', location: 'Dwarka', state: 'Gujarat', region: 'west', deity: 'Krishna', type: 'dham' },
  { id: 'jagannath-puri', name: 'Jagannath Puri', location: 'Puri', state: 'Odisha', region: 'east', deity: 'Jagannath', type: 'dham' },
  // Ram Tirths
  { id: 'ayodhya', name: 'Ram Janmabhoomi', location: 'Ayodhya', state: 'Uttar Pradesh', region: 'north', deity: 'Ram', type: 'ram-tirth' },
  { id: 'chitrakoot', name: 'Chitrakoot', location: 'Chitrakoot', state: 'Madhya Pradesh', region: 'north', deity: 'Ram', type: 'ram-tirth' },
  // Krishna Tirths
  { id: 'vrindavan', name: 'Vrindavan', location: 'Mathura', state: 'Uttar Pradesh', region: 'north', deity: 'Krishna', type: 'krishna-tirth' },
  { id: 'mathura', name: 'Krishna Janmabhoomi', location: 'Mathura', state: 'Uttar Pradesh', region: 'north', deity: 'Krishna', type: 'krishna-tirth' },
  { id: 'udupi', name: 'Udupi Krishna', location: 'Udupi', state: 'Karnataka', region: 'south', deity: 'Krishna', type: 'krishna-tirth' },
  // Shakti Peeths
  { id: 'vaishno-devi', name: 'Vaishno Devi', location: 'Katra', state: 'Jammu & Kashmir', region: 'north', deity: 'Durga', type: 'shakti-peeth' },
  { id: 'kamakhya', name: 'Kamakhya', location: 'Guwahati', state: 'Assam', region: 'east', deity: 'Kamakhya', type: 'shakti-peeth' },
  { id: 'kalighat', name: 'Kalighat', location: 'Kolkata', state: 'West Bengal', region: 'east', deity: 'Kali', type: 'shakti-peeth' },
  { id: 'meenakshi', name: 'Meenakshi Amman', location: 'Madurai', state: 'Tamil Nadu', region: 'south', deity: 'Meenakshi', type: 'shakti-peeth' },
  { id: 'mookambika', name: 'Mookambika', location: 'Kollur', state: 'Karnataka', region: 'south', deity: 'Mookambika', type: 'shakti-peeth' },
  // Others
  { id: 'tirupati', name: 'Tirupati Balaji', location: 'Tirumala', state: 'Andhra Pradesh', region: 'south', deity: 'Vishnu (Balaji)', type: 'other' },
  { id: 'padmanabhaswamy', name: 'Padmanabhaswamy', location: 'Thiruvananthapuram', state: 'Kerala', region: 'south', deity: 'Vishnu', type: 'other' },
  { id: 'shirdi', name: 'Shirdi Sai Baba', location: 'Shirdi', state: 'Maharashtra', region: 'west', deity: 'Sai Baba', type: 'other' },
  { id: 'shani-shingnapur', name: 'Shani Shingnapur', location: 'Ahmednagar', state: 'Maharashtra', region: 'west', deity: 'Shani', type: 'other' },
  { id: 'siddhivinayak', name: 'Siddhivinayak', location: 'Mumbai', state: 'Maharashtra', region: 'west', deity: 'Ganesh', type: 'other' },
  { id: 'amarnath', name: 'Amarnath Cave', location: 'Pahalgam', state: 'Jammu & Kashmir', region: 'himalayas', deity: 'Shiva (Ice Lingam)', type: 'other' },
  { id: 'golden-temple', name: 'Harmandir Sahib', location: 'Amritsar', state: 'Punjab', region: 'north', deity: 'Waheguru', type: 'sikh' },
  { id: 'sabarimala', name: 'Sabarimala', location: 'Pathanamthitta', state: 'Kerala', region: 'south', deity: 'Ayyappa', type: 'other' },
  { id: 'ajmer', name: 'Ajmer Sharif', location: 'Ajmer', state: 'Rajasthan', region: 'north', deity: 'Khwaja Moinuddin Chishti', type: 'sufi' },
  { id: 'prayagraj', name: 'Triveni Sangam', location: 'Prayagraj', state: 'Uttar Pradesh', region: 'north', deity: 'Sangam (Ganga-Yamuna-Saraswati)', type: 'other' },
];

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

export function getYatraBySlug(slug: string): Yatra | undefined {
  return yatras.find((y) => y.slug === slug);
}

export function getCompanionById(id: string): TravelCompanion | undefined {
  return companions.find((c) => c.id === id);
}

export function formatINR(amount: number): string {
  return `\u20B9${amount.toLocaleString('en-IN')}`;
}

export const durationBuckets = [
  { value: 'short', label: '3-6 days', match: (d: number) => d <= 6 },
  { value: 'medium', label: '7-10 days', match: (d: number) => d >= 7 && d <= 10 },
  { value: 'long', label: '11-14 days', match: (d: number) => d >= 11 && d <= 14 },
  { value: 'extended', label: '15+ days', match: (d: number) => d >= 15 },
];

export const budgetBuckets = [
  { value: 'economy', label: 'Economy (₹8k-40k)' },
  { value: 'standard', label: 'Standard (₹40k-100k)' },
  { value: 'premium', label: 'Premium (₹100k+)' },
];

export const regionOptions: { value: YatraRegion | 'all'; label: string }[] = [
  { value: 'all', label: 'All Regions' },
  { value: 'north', label: 'North India' },
  { value: 'south', label: 'South India' },
  { value: 'east', label: 'East India' },
  { value: 'west', label: 'West India' },
  { value: 'himalayas', label: 'Himalayas' },
];
