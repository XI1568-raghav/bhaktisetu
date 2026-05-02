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
    longDescription: `The Amarnath Cave shrine, situated at 3,888 metres (12,756 ft) in Anantnag district of Jammu & Kashmir, houses one of the most mystical Shiva manifestations on earth — a naturally-formed ice stalagmite that waxes and wanes with the lunar cycle, worshipped as a Swayambhu Lingam of Lord Shiva. Two smaller ice formations alongside represent Mata Parvati and Lord Ganesha. Hindu tradition holds that Lord Shiva revealed the secret of immortality (Amar Katha) to Parvati inside this 40-metre-tall cave — the legend is recorded in the Nilamata Purana (6th-7th century) and Kalhana's Rajatarangini. The yatra runs for roughly 45 days each year during Shravan (July-August), managed by the Shree Amarnath Shrine Board (SASB). Pilgrims choose between two routes: the traditional 43 km, 3-5 day trail from Pahalgam-Chandanwari via Sheshnag and Panchtarni, or the steeper 13 km Baltal route completed in 1-2 days. Helicopter service runs from Pahalgam and Baltal to Panjtarni, six kilometres from the cave. Online registration via SASB, a Compulsory Health Certificate from authorised doctors, and an RFID tracking tag are mandatory since 2019. Acclimatisation, warm clothing, and physical fitness are non-negotiable for this high-altitude darshan.`,
    hasFullContent: true,
    bestTimeToVisit: 'July to early August during the Shravan month. Exact yatra dates (typically late June to Raksha Bandhan) are announced annually by the Shree Amarnath Shrine Board. Avoid the first and last week — slots fill 3 months ahead.',
    howToReach: 'Fly to Srinagar Airport (SXR). For the Pahalgam route, drive 95 km to Pahalgam, then to base camp Chandanwari (16 km). For Baltal route, drive 100 km via Sonamarg. Both routes have JKSRTC and private cab service from Srinagar/Jammu. Yatra registration counters are at Jammu, Srinagar, Pahalgam and Baltal.',
    whatToExpect: 'Strenuous high-altitude trek (3,888 m), sub-zero nights even in July, mandatory RFID tag and medical certificate, langar tents along the route, helicopter shuttles to Panjtarni, ponies/palkis available, ice lingam darshan with strict no-photography rules inside the cave, return same day from Pahalgam or Baltal base camp.',
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
    longDescription: `Mount Kailash (6,638 m / 21,778 ft) in the Ngari Prefecture of the Tibet Autonomous Region is revered as the earthly abode of Lord Shiva and Mata Parvati — the most sacred peak in four traditions: Hinduism, Buddhism, Jainism and the indigenous Bon faith. Buddhists call it the navel of the universe; Jains identify it as Ashtapada, the site where Rishabhadeva attained nirvana. At its base lies Lake Mansarovar (4,590 m), the highest freshwater lake in the world spanning 320 sq km, said to have been created in the mind of Lord Brahma — bathing in its waters is believed to cleanse the sins of a hundred lifetimes. The 53 km parikrama (kora) of Kailash begins and ends at Darchen, crosses the formidable Drolma La Pass at 5,650 m, and is traditionally completed in three days on foot. Indian devotees travel either through the MEA-operated Lipulekh Pass (Uttarakhand) or Nathu La Pass (Sikkim, opened 2015) circuits, which run June-September with strict medical screening and a public lottery. Private operators route via Kathmandu through Humla or Rasuwa-Gyirong, taking 12-14 days. The yatra requires Chinese permits, exceptional cardiovascular fitness, and full acclimatisation — symptoms of HAPE are common above 5,000 m.`,
    hasFullContent: true,
    bestTimeToVisit: 'Mid-May to mid-September. MEA Lipulekh and Nathu La applications open in February-March via the kmy.gov.in portal. Saga Dawa (full moon of May-June) is the most auspicious month, drawing maximum pilgrims and Tibetan Buddhists.',
    howToReach: 'MEA route: fly to Delhi, then Kathgodam/Almora for Lipulekh; or Bagdogra for Nathu La. Private/Nepal route: fly to Kathmandu, drive via Syabrubesi-Kerung-Saga-Mansarovar-Darchen (5-6 day overland) or charter flight Kathmandu-Nepalgunj-Simikot-Hilsa-Taklakot. Chinese visa and Tibet Travel Permit required.',
    whatToExpect: 'Extreme altitude (Drolma La 5,650 m), 3-day 53 km parikrama on foot or pony, holy snan in Lake Mansarovar, parikrama of Mansarovar lake (104 km, by vehicle), darshan at Yam Dwar and Charan Sparsh, basic guesthouse and tented stays, oxygen support, sub-zero temperatures even in summer, mandatory medical fitness and HAPE screening.',
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
    longDescription: `The Rameshwaram-Madurai pilgrimage covers two of South India's holiest sites and the legendary Dhanushkodi shoreline. Sri Ramanathaswamy at Rameshwaram is the southernmost of the twelve Jyotirlingas and one of the four Char Dham of Adi Shankaracharya — established by Lord Rama himself before crossing to Lanka. The temple boasts the longest pillared corridor of any Hindu temple in India (around 3,850 ft, supported by approximately 1,212 carved pillars) and houses 22 sacred theerthams (wells), each representing one of the arrows in Lord Rama's quiver. Pilgrims traditionally bathe in Agni Theertham (Bay of Bengal shore) followed by snan in all 22 wells before darshan. Twenty kilometres east lies Dhanushkodi, the ghost town where Lord Rama is said to have launched the Ram Setu — a 48 km coral causeway visible from satellite imagery — to rescue Mata Sita. Madurai, 170 km west via the engineering marvel Pamban Bridge, hosts the Meenakshi Amman Temple — a 14-acre Pandya-Nayaka complex with 14 gopurams (the southern reaching 170 ft), the Porthamarai Kulam golden lotus tank, and the Hall of a Thousand Pillars. The Chithirai festival in April-May, celebrating the celestial wedding of Goddess Meenakshi and Sundareswarar, is among Tamil Nadu's grandest temple events.`,
    hasFullContent: true,
    bestTimeToVisit: 'October to March — Tamil Nadu coastal weather is most pleasant. Mahashivratri (Feb-Mar), Chithirai festival at Madurai (April-May, 15 days), and Aadi Amavasai are major occasions. Avoid April-June when temperatures regularly cross 40°C.',
    howToReach: 'Fly to Madurai Airport (IXM), then drive 170 km east to Rameshwaram via the Pamban Bridge — India\'s first sea bridge, recently complemented by the new Pamban vertical-lift railway bridge. Direct trains run from Chennai, Madurai and Coimbatore to Rameshwaram (RMM) station. From Madurai, regular TNSTC buses connect both temples.',
    whatToExpect: '22-theertham snan ritual at Ramanathaswamy (priests assist with bucket pours), Spadika Lingam darshan at 5 AM, drive to Dhanushkodi point and Adam\'s Bridge viewpoint, Pamban Bridge sea crossing, evening Meenakshi Amman corridor walk, Hall of 1000 Pillars and museum, traditional Chettinad cuisine, optional add-on of Madurai Thiruparankundram Murugan temple.',
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
    longDescription: `The Dwarka-Somnath circuit traces Lord Krishna's legendary kingdom and the most ancient Shiva shrine on earth across Gujarat's Saurashtra coast. Dwarkadhish Temple (Jagat Mandir) at Dwarka is one of the four Char Dham of Adi Shankaracharya and counts among the seven Sapta Puris. The five-storey limestone shikhara rises 78 metres on 72 carved pillars, with archaeological roots dating back to 200 BCE — the present structure was rebuilt in the 16th century after Mahmud Begada's destruction in 1473. Devotees enter through Swarga Dwara (south) and exit via Moksha Dwara (north), descending the 56 Gomti Ghat steps for the holy snan. Thirty kilometres offshore, Bet Dwarka — believed to be Krishna's original residential settlement — is reached by a short ferry from Okha and houses ancient temples to Krishna, Rukmini, Devki and Hanuman. Nearby Nageshwar Jyotirlinga (17 km from Dwarka) marks the tenth of the twelve Jyotirlingas. Somnath, 230 km south on the Veraval coast, is the first and most ancient Jyotirlinga — destroyed and rebuilt repeatedly, most famously plundered by Mahmud of Ghazni in 1026 CE and reconstructed under Sardar Vallabhbhai Patel's leadership in 1951. The temple stands at the Triveni Sangam of Kapila, Hiran and Saraswati rivers, with no land between it and Antarctica directly south.`,
    hasFullContent: true,
    bestTimeToVisit: 'October to March — coastal Gujarat humidity drops to comfortable levels. Janmashtami (Aug-Sep) at Dwarka and Mahashivratri (Feb-Mar) at Somnath draw huge crowds. Avoid April-June when temperatures cross 38-40°C with heavy humidity along the coast.',
    howToReach: 'Fly to Jamnagar Airport (JGA, 130 km from Dwarka) or Rajkot (RAJ). For Somnath, fly to Diu (DIU, 90 km) or Keshod (IXK). Direct trains run from Mumbai, Ahmedabad and Jamnagar to Dwarka (DWK) and Veraval (VRL) stations. Most pilgrims drive the 230 km coastal stretch between Dwarka and Somnath in 5 hours.',
    whatToExpect: 'Mangal Aarti at Dwarkadhish (6:30 AM, dress code enforced), Gomti snan at the 56 ghats, Bet Dwarka ferry from Okha jetty, Nageshwar Jyotirlinga darshan (giant 25 m Shiva statue outside), Somnath Mahapooja and the famous Sound-and-Light show narrating the temple\'s repeated destruction and rebuilding, Bhalka Tirth (Krishna\'s mortal departure site) and Triveni Sangam ghat snan.',
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
    longDescription: `Mahakaleshwar at Ujjain on the banks of the holy Shipra is one of the twelve Jyotirlingas and one of the eighteen Maha Shakta Pithas — uniquely sacred because the Lingam is Swayambhu (self-manifested) and Dakshinamukhi (south-facing), the only such alignment among the twelve Jyotirlingas. The presiding Shakti is worshipped as Mahakali, where Sati's upper lip is said to have fallen. The temple is most famous for its Bhasma Aarti at 4 AM — the sole shrine in India where Lord Shiva is honoured with sacred ash; the original tradition used ash from a freshly cremated body from the nearby Chakra Tirth ghats, now substituted with consecrated Vibhuti. The five-storey complex includes an underground sanctum and the Nagchandreshwar idol on the third floor, opened to public darshan only on Nag Panchami once a year. The temple was destroyed by Iltutmish in 1234-35 and rebuilt by the Marathas in the 18th century under the Scindia rulers. Ujjain itself, one of the seven Sapta Puris, hosts the Simhastha Kumbh Mela every twelve years on the Shipra. A complete Shaivite circuit pairs Mahakaleshwar with Omkareshwar Jyotirlinga (140 km south on the Narmada island), Kaal Bhairav Mandir (where the deity drinks offered alcohol), Harsiddhi Shaktipeeth and Mangalnath — believed birthplace of Mars (Mangal).`,
    hasFullContent: true,
    bestTimeToVisit: 'October to March is most pleasant. Mahashivratri (Feb-Mar) sees the spectacular Shahi Sawari procession. Simhastha Kumbh Mela (next in 2028) attracts 50+ million pilgrims over 30 days. Sawan Mondays in July-August are also auspicious but heavily crowded.',
    howToReach: 'Fly to Indore Devi Ahilyabai Holkar Airport (IDR), 58 km drive. Direct trains from Delhi, Mumbai, Bhopal, Ahmedabad to Ujjain Junction (UJN). Regular Madhya Pradesh state buses connect Ujjain with Indore, Omkareshwar (140 km) and Bhopal (190 km).',
    whatToExpect: 'Bhasma Aarti at 4 AM with mandatory pre-booking via shrimahakaleshwar.com (₹200, opens 1 month prior, slots fill within hours; men dhoti, women saree dress code), Sandhya Aarti at 6 PM, Shipra ghat snan at Ramghat, Kaal Bhairav darshan with liquor offering, Harsiddhi Shaktipeeth, optional 1-day add-on to Omkareshwar Jyotirlinga.',
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
