/**
 * Yatra destination SEO landing pages — affiliate revenue layer.
 *
 * These are LIGHT destination pages (different from full curated yatra
 * packages in `yatra-data.ts`). Purpose: rank for high-intent search
 * queries like "vaishno devi yatra package" and route the click to a
 * partner (MakeMyTrip / Goibibo / IRCTC) via /api/v1/affiliate/click,
 * earning 5-10% commission.
 *
 * Top 5 destinations have hand-written 200-word descriptions. Remaining
 * 5 use placeholder content the marketing team will replace.
 */

export type AffiliatePartner = 'makemytrip' | 'goibibo' | 'irctc';

export interface AffiliatePartnerLink {
  partner: AffiliatePartner;
  label: string;
  // Real partner search URL (no affiliate ID yet — see docs/yatra-affiliate-setup.md).
  baseUrl: string;
}

export interface YatraDestination {
  slug: string;
  name: string;
  state: string;
  region: 'north' | 'south' | 'east' | 'west' | 'himalayas' | 'international';
  startingPriceInr: number;
  durationDays: number;
  heroImage: string;
  shortDescription: string; // ≤140 chars — meta description + card subtitle
  longDescription: string;  // 200-word SEO body OR "coming soon" placeholder
  hasFullContent: boolean;  // false = placeholder; render abbreviated version
  bestTimeToVisit: string;
  howToReach: string;
  whatToExpect: string;
  partners: AffiliatePartnerLink[];
}

const MMT = 'https://www.makemytrip.com/holidays-india';
const GOIBIBO = 'https://www.goibibo.com/holidays';
const IRCTC = 'https://www.irctctourism.com';

function partnersFor(slug: string): AffiliatePartnerLink[] {
  return [
    { partner: 'makemytrip', label: 'Book via MakeMyTrip', baseUrl: `${MMT}/?searchText=${encodeURIComponent(slug)}` },
    { partner: 'goibibo',    label: 'Book via Goibibo',    baseUrl: `${GOIBIBO}/?q=${encodeURIComponent(slug)}` },
    { partner: 'irctc',      label: 'Book via IRCTC Tourism', baseUrl: `${IRCTC}/`           },
  ];
}

export const yatraDestinations: YatraDestination[] = [
  {
    slug: 'vaishno-devi',
    name: 'Vaishno Devi (Katra)',
    state: 'Jammu & Kashmir',
    region: 'north',
    startingPriceInr: 8500,
    durationDays: 3,
    heroImage: 'https://images.unsplash.com/photo-1600100397608-24dae0a3ce7f?w=1200&q=80',
    shortDescription: 'Holy cave shrine of Mata Rani at Trikuta Hills — visited by 10 million devotees yearly.',
    longDescription: `Mata Vaishno Devi at Trikuta Hills (5,200 ft) in Jammu is one of the most visited Hindu shrines, drawing nearly 10 million pilgrims every year. The traditional yatra begins at Katra and follows a 13-kilometre uphill route via Banganga, Charan Paduka, and Ardhkuwari, culminating at the Bhawan where Mata Vaishno Devi is worshipped in three pindi forms — Maha Kali, Maha Lakshmi and Maha Saraswati. Devotees believe Mata Rani fulfils the wishes of those who reach her with sincere devotion. The newer 3.5 km Tarakote Marg has shorter switchbacks and is preferred by elderly yatris. After Bhawan darshan, most pilgrims continue to Bhairavnath temple, 2 km further uphill — completing the yatra is considered essential. Helicopter service connects Katra and Sanjichhat, cutting the trek to under an hour. Battery cars, ponies and palkis are available for those unable to walk. Online yatra slips are mandatory and can be reserved up to 60 days ahead. The shrine remains open year-round, but Sep-Apr is the most pleasant season — the path can be slippery during monsoons (Jul-Aug) and snow-covered in peak winter (Dec-Jan).`,
    hasFullContent: true,
    bestTimeToVisit: 'September to April. Avoid monsoon (Jul-Aug) — landslides; and Dec-Jan — heavy snow at Bhawan.',
    howToReach: 'Fly to Jammu (IXJ), 50 km to Katra. Direct trains run from Delhi, Mumbai, Kolkata to Shri Mata Vaishno Devi Katra (SVDK) station. From Katra, walk, helicopter, or battery car to Bhawan.',
    whatToExpect: 'A 13 km uphill walk (or 1 hour helicopter), darshan inside the holy cave, optional Bhairavnath visit, Aarti at 5 AM and 6 PM, langar prasad available throughout the route.',
    partners: partnersFor('vaishno devi katra'),
  },
  {
    slug: 'tirupati-balaji',
    name: 'Tirupati Balaji',
    state: 'Andhra Pradesh',
    region: 'south',
    startingPriceInr: 12500,
    durationDays: 3,
    heroImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&q=80',
    shortDescription: 'Lord Venkateswara at Tirumala — the wealthiest temple on earth and most visited religious site in the world.',
    longDescription: `The Sri Venkateswara Swamy temple at Tirumala, atop the seven hills of Tirupati in Andhra Pradesh, is the most visited religious site in the world — drawing 50,000 to 100,000 pilgrims daily and over 30 million yearly. Lord Venkateswara, an incarnation of Lord Vishnu, is believed to have descended to earth from Vaikuntha to bestow grace upon devotees during the Kali Yuga. The temple is famous for its strict darshan protocols, mandatory tonsure (mottai) ceremony for devotees offering hair, and the famed Tirupati laddu — a GI-tagged prasad distributed to every visitor. Booking a Sarva Darshan slot online via the TTD website is highly recommended; without it, queue times can stretch 6-12 hours. Premium options like the Special Entry Darshan (SED, ₹300 ticket), VIP Break Darshan, and Aarjitha Sevas (Suprabhatam, Thomala, Archana) reduce the wait dramatically. Most pilgrims combine Tirumala with the nearby Padmavathi temple at Tiruchanur (Lord Venkateswara's consort), Sri Kalahasti (Vayu Lingam Jyotirlinga of Pancha Bhuta sthalam), and Kanipakam Vinayaka. The hills receive over 70% rainfall during the monsoon — Oct to March is the most comfortable visiting period.`,
    hasFullContent: true,
    bestTimeToVisit: 'October to March. Brahmotsavam in Sep-Oct draws huge crowds — book 2 months ahead.',
    howToReach: 'Fly to Tirupati Airport (TIR), 40 min to Tirumala. Trains arrive at Tirupati Main Station; APSRTC buses ply continuously between Tirupati and Tirumala via the ghat road.',
    whatToExpect: 'Pre-booked SED darshan (₹300), 1-2 hour darshan queue, Tirupati laddu prasad (2 free per ticket), optional tonsure, Padmavathi temple visit downhill.',
    partners: partnersFor('tirupati tirumala'),
  },
  {
    slug: 'char-dham',
    name: 'Char Dham (Uttarakhand)',
    state: 'Uttarakhand',
    region: 'himalayas',
    startingPriceInr: 38500,
    durationDays: 11,
    heroImage: 'https://images.unsplash.com/photo-1626621331169-5f34be280ed9?w=1200&q=80',
    shortDescription: 'Yamunotri, Gangotri, Kedarnath and Badrinath — the four sacred Himalayan abodes of Uttarakhand.',
    longDescription: `The Char Dham of Uttarakhand — Yamunotri, Gangotri, Kedarnath and Badrinath — together form the holiest Himalayan pilgrimage every Hindu aspires to complete at least once. Yamunotri at 3,293 m is the source of the river Yamuna, where pilgrims cook rice in the Surya Kund hot springs as offering. Gangotri at 3,100 m is where Goddess Ganga descended to earth at the prayer of King Bhagiratha. Kedarnath at 3,583 m houses one of the 12 Jyotirlingas, where Lord Shiva is worshipped in his Sadashiva form — accessible by a strenuous 16 km trek from Gaurikund or by helicopter. Badrinath at 3,133 m is one of the four Adi Shankaracharya dhams of Vaishnava tradition, where Lord Vishnu meditated for thousands of years. The temples open in late April or early May after the Akshay Tritiya muhurat and close around Diwali in November as the upper Himalayas freeze over. The full circuit takes 10-12 days starting from Haridwar or Rishikesh. Helicopter packages connecting all four shrines complete the yatra in 2-3 days but cost ₹1.5-2 lakh per person. Yatra registration via the Tourism Board's Bio-metric system is mandatory since 2023.`,
    hasFullContent: true,
    bestTimeToVisit: 'May-June and September-October. Closed November to April due to snow.',
    howToReach: 'Fly to Dehradun (DED) or Delhi (DEL), drive to Haridwar/Rishikesh start point. The full road circuit covers 1,600 km via Barkot, Uttarkashi, Guptkashi, Joshimath.',
    whatToExpect: 'Long mountain drives, two demanding treks (Yamunotri 6 km, Kedarnath 16 km — helicopter alternatives available), high altitude acclimatisation, sub-zero nights in Kedarnath even in summer.',
    partners: partnersFor('char dham yatra'),
  },
  {
    slug: 'shirdi-sai',
    name: 'Shirdi Sai Baba',
    state: 'Maharashtra',
    region: 'west',
    startingPriceInr: 9500,
    durationDays: 3,
    heroImage: 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=1200&q=80',
    shortDescription: 'Samadhi Mandir of Sri Sai Baba in Shirdi — visited by 60,000 devotees daily.',
    longDescription: `Shirdi, a quiet village in Ahmednagar district of Maharashtra, became one of India's most visited spiritual destinations because of Sri Sai Baba — the saint who lived here from 1858 until his Mahasamadhi in 1918, preaching Sabka Malik Ek (one God for all). The Samadhi Mandir, built over Baba's burial site in Dwarkamai, draws an average of 60,000 devotees daily and over 25,000 on weekends and Thursdays — Baba's chosen day. The temple complex includes Dwarkamai (the mosque-cum-temple where Baba lived), Chavadi (where Baba alternately slept), Gurusthan (the neem tree under which Baba first appeared as a 16-year-old), and the Lendi Bagh garden tended by Baba himself. The day begins with Kakad Aarti at 4:30 AM, followed by Madhyan Aarti at noon, Dhup Aarti at sunset, and Shej Aarti at 10:30 PM — attending all four in a single day is considered especially auspicious. Free prasad bhojan (lunch) is served at the Sai Prasadalaya for up to 50,000 devotees daily. Most pilgrims combine Shirdi with Shani Shingnapur (the famous roofless Shani Dev shrine, 65 km away) and Trimbakeshwar Jyotirlinga near Nashik (110 km).`,
    hasFullContent: true,
    bestTimeToVisit: 'October to March. Avoid Thursdays and Guru Purnima/Ram Navami/Vijayadashami if you dislike crowds.',
    howToReach: 'Fly to Shirdi Airport (SAG, direct flights from Delhi/Mumbai/Hyderabad), or Aurangabad (IXU 130 km). Trains stop at Sainagar Shirdi (SNSI). Direct buses from Pune (185 km) and Mumbai (240 km).',
    whatToExpect: 'Aarti darshan passes (book online via SaiBaba Sansthan), 1-3 hour queue without VIP pass, free lunch prasad, optional combined Shani Shingnapur + Trimbakeshwar visit.',
    partners: partnersFor('shirdi sai baba'),
  },
  {
    slug: 'kashi',
    name: 'Kashi (Varanasi)',
    state: 'Uttar Pradesh',
    region: 'north',
    startingPriceInr: 11500,
    durationDays: 4,
    heroImage: 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=1200&q=80',
    shortDescription: 'Kashi Vishwanath Jyotirlinga, Ganga Aarti at Dashashwamedh, and the oldest continuously inhabited city on earth.',
    longDescription: `Kashi — also called Varanasi or Banaras — is one of the seven Mokshadayini Sapta Puris and the spiritual capital of India. Continuously inhabited for over 3,500 years, it is sacred for being the abode of Lord Shiva as Kashi Vishwanath, one of the twelve Jyotirlingas. Hindus believe that dying in Kashi grants liberation (moksha) directly, bypassing further rebirth — which is why the city has the world's oldest hospice, Mukti Bhavan, and continuous cremation grounds at Manikarnika Ghat for over 3,000 years. The reconstructed Kashi Vishwanath Corridor (inaugurated December 2021) connects the temple directly to the Ganga at Lalita Ghat for the first time in 250 years, accommodating 50,000 devotees daily. The evening Ganga Aarti at Dashashwamedh Ghat — performed by seven young priests synchronously with conch shells, brass lamps and chanting — is one of the most spiritually moving sights anyone can witness. Sunrise boat rides along the 84 ghats, visiting Sankat Mochan Hanuman Mandir, the BHU campus and Sarnath (where the Buddha gave his first sermon, 10 km away) round out a complete Kashi visit. Most pilgrims also include Prayagraj (Triveni Sangam, 130 km) and the new Ram Mandir at Ayodhya (200 km) in their itinerary.`,
    hasFullContent: true,
    bestTimeToVisit: 'October to March. Dev Deepawali (Nov full moon) and Mahashivratri (Feb-Mar) are spectacular but heavily crowded.',
    howToReach: 'Fly to Lal Bahadur Shastri Airport (VNS), 25 km from city. Multiple daily trains from Delhi, Mumbai, Kolkata to Varanasi Junction (BSB) or Banaras (BSBS).',
    whatToExpect: 'Sunrise boat ride along the ghats, Vishwanath Corridor darshan (1-2 hr queue), evening Ganga Aarti, Manikarnika cremation ghats viewing, day trip to Sarnath.',
    partners: partnersFor('kashi varanasi'),
  },

  // ─── Placeholder destinations (5) — marketing to expand ───
  {
    slug: 'amarnath',
    name: 'Amarnath (Seasonal)',
    state: 'Jammu & Kashmir',
    region: 'himalayas',
    startingPriceInr: 32000,
    durationDays: 6,
    heroImage: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=1200&q=80',
    shortDescription: 'Sacred ice Shiva Lingam at 3,888m in the Kashmir Himalayas. Open July-August only.',
    longDescription: 'Detailed itinerary coming soon. The Amarnath Cave shrine houses a naturally-formed ice stalagmite worshipped as Lord Shiva, accessible only July-August via Pahalgam (36 km traditional trek) or Baltal (14 km shorter route). Shrine Board registration, medical certificate and helicopter passes are mandatory.',
    hasFullContent: false,
    bestTimeToVisit: 'July to August only — yatra dates announced annually by Shrine Board.',
    howToReach: 'Fly to Srinagar (SXR), drive to Pahalgam (95 km) or Baltal (100 km).',
    whatToExpect: 'High-altitude trek with helicopter alternatives. Detailed itinerary coming soon.',
    partners: partnersFor('amarnath yatra'),
  },
  {
    slug: 'kailash-mansarovar',
    name: 'Kailash Mansarovar',
    state: 'Tibet (China)',
    region: 'international',
    startingPriceInr: 185000,
    durationDays: 14,
    heroImage: 'https://images.unsplash.com/photo-1626621331169-5f34be280ed9?w=1200&q=80',
    shortDescription: 'Sacred Mount Kailash and Lake Mansarovar — the holiest pilgrimage in Hinduism, Buddhism, Jainism and Bon.',
    longDescription: 'Detailed itinerary coming soon. Mount Kailash (6,638 m) in Tibet is believed to be the abode of Lord Shiva. The 52 km parikrama around Kailash and the holy dip in Lake Mansarovar are believed to wash away the sins of multiple lifetimes. Routes via Lipulekh (Uttarakhand) or Nathula (Sikkim) operated by MEA, plus private operators via Nepal.',
    hasFullContent: false,
    bestTimeToVisit: 'May to September — limited slots, MEA application opens in February.',
    howToReach: 'Most operators route via Kathmandu, Nepal — onward by road or charter flight to Saga and Darchen.',
    whatToExpect: 'Extreme altitude (5,630 m at Dolma La pass), full medical screening, comprehensive itinerary coming soon.',
    partners: partnersFor('kailash mansarovar'),
  },
  {
    slug: 'rameshwaram-madurai',
    name: 'Rameshwaram & Madurai',
    state: 'Tamil Nadu',
    region: 'south',
    startingPriceInr: 18500,
    durationDays: 5,
    heroImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=1200&q=80',
    shortDescription: 'Ramanathaswamy Jyotirlinga, Meenakshi Amman and Dhanushkodi — a Tamil Nadu temple trail.',
    longDescription: 'Detailed itinerary coming soon. The 5-day southern trail covers Ramanathaswamy Jyotirlinga at Rameshwaram (with the famous 22-well snan ritual), Dhanushkodi where Lord Rama built the Adam\'s Bridge to Lanka, and the spectacular Meenakshi Amman temple at Madurai with its 14 gopurams.',
    hasFullContent: false,
    bestTimeToVisit: 'October to March — avoid summer when temperatures cross 40°C.',
    howToReach: 'Fly to Madurai (IXM), drive 170 km to Rameshwaram via Pamban Bridge.',
    whatToExpect: 'Beach-temple combination with deep historical and architectural depth. Full itinerary coming soon.',
    partners: partnersFor('rameshwaram madurai'),
  },
  {
    slug: 'dwarka-somnath',
    name: 'Dwarka & Somnath',
    state: 'Gujarat',
    region: 'west',
    startingPriceInr: 21000,
    durationDays: 5,
    heroImage: 'https://images.unsplash.com/photo-1590766940554-634ee71ed937?w=1200&q=80',
    shortDescription: "Lord Krishna's Dwarka, Bet Dwarka, Nageshwar Jyotirlinga and the first-ever Jyotirlinga at Somnath.",
    longDescription: "Detailed itinerary coming soon. A 5-day Gujarat pilgrimage covering Dwarkadhish (Lord Krishna's legendary kingdom), Bet Dwarka (original settlement, accessible by boat), Nageshwar Jyotirlinga, and Somnath — the first among the twelve Jyotirlingas. The Sound & Light show at Somnath narrating its 17 destructions and rebuilds is unmissable.",
    hasFullContent: false,
    bestTimeToVisit: 'October to March — Gujarati coast humidity is intense April-September.',
    howToReach: 'Fly to Jamnagar (JGA, 130 km from Dwarka) or Diu (DIU, 90 km from Somnath).',
    whatToExpect: 'Coastal temple drives, full itinerary coming soon.',
    partners: partnersFor('dwarka somnath'),
  },
  {
    slug: 'ujjain-mahakaleshwar',
    name: 'Ujjain Mahakaleshwar',
    state: 'Madhya Pradesh',
    region: 'west',
    startingPriceInr: 9500,
    durationDays: 3,
    heroImage: 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=1200&q=80',
    shortDescription: 'Mahakaleshwar Jyotirlinga and the famous 4 AM Bhasma Aarti — only place where Shiva is worshipped with sacred ash.',
    longDescription: 'Detailed itinerary coming soon. Mahakaleshwar at Ujjain is one of the 12 Jyotirlingas and the only one where Lord Shiva is worshipped with the Bhasma Aarti at 4 AM — using ash from the cremation grounds (now substituted with sacred Vibhuti). Combine with Omkareshwar Jyotirlinga (140 km, on an island in the Narmada) for a complete Shaivite circuit.',
    hasFullContent: false,
    bestTimeToVisit: 'October to March. Simhastha Kumbh every 12 years draws 50+ million pilgrims.',
    howToReach: 'Fly to Indore (IDR), 55 km drive. Direct trains from Delhi, Mumbai, Bhopal.',
    whatToExpect: 'Bhasma Aarti pre-booking is critical (3-day waitlist), full itinerary coming soon.',
    partners: partnersFor('ujjain mahakaleshwar'),
  },
];

export function getDestinationBySlug(slug: string): YatraDestination | undefined {
  return yatraDestinations.find((d) => d.slug === slug);
}

export function destinationSlugs(): string[] {
  return yatraDestinations.map((d) => d.slug);
}

export function formatINRPrice(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}
