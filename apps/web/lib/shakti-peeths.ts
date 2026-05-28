// 51 Shakti Peeth catalog — sites where parts of Sati's body fell after
// Daksha Yajna, per Devi Bhagavata + Pithanirnaya. Each is paired with a
// specific Bhairava (Shiva manifestation) and Devi name.
// Targets: "{name} shakti peeth", "51 shakti peeth list", "kamakhya temple
// darshan", "shakti peeth in {state}".

export type ShaktiPeethCountry = 'India' | 'Nepal' | 'Bangladesh' | 'Sri Lanka' | 'Pakistan' | 'Tibet';

export interface ShaktiPeeth {
  slug: string;
  number: number;
  name: string;
  sanskrit: string;
  bodyPart: string;
  devi: string;
  bhairava: string;
  location: string;
  state: string;
  country: ShaktiPeethCountry;
  significance: string;
  legend: string;
  signatureRitual: string;
  darshanTimings: string;
  bestSeason: string;
  howToReach: string;
  primaryPujas: string[];
  navratriSpecial: string;
  modernAccess: string;
  estimatedDailyVisitors: string;
}

export const SHAKTI_PEETHS: ShaktiPeeth[] = [
  { slug: 'kamakhya', number: 1, name: 'Kamakhya', sanskrit: 'कामाख्या', bodyPart: 'Yoni (womb)', devi: 'Kamakhya', bhairava: 'Umananda', location: 'Nilachal Hill, Guwahati', state: 'Assam', country: 'India',
    significance: 'Most powerful Shakti Peeth — celebrates feminine fertility. Annual Ambubachi Mela marks the goddess\'s menstruation.', legend: 'Sati\'s yoni fell here. Temple has no idol — only a yoni-shaped stone perpetually moistened by underground spring.',
    signatureRitual: 'Ambubachi Mela (June 22-26 annually) — temple closed 3 days for goddess\'s rest, reopens with prasad of red cloth',
    darshanTimings: '05:30–13:00, 14:30–17:30 IST', bestSeason: 'October–March (Ambubachi June for advanced sadhakas)',
    howToReach: 'Guwahati airport (20 km) → taxi to Nilachal Hill. Cable car from base.', primaryPujas: ['Yoni Tantra Puja', 'Shodashopachara', 'Kumari Puja', 'Animal sacrifice (traditional)'],
    navratriSpecial: 'Manasa Puja + Tantric ritual nights — devotees from across India',
    modernAccess: 'Online VIP booking via Kamakhya Trust. Ambubachi pre-registration mandatory.', estimatedDailyVisitors: '8,000–12,000 (Ambubachi 25L+ across 5 days)' },

  { slug: 'kalighat', number: 2, name: 'Kalighat', sanskrit: 'कालीघाट', bodyPart: 'Right toe', devi: 'Kalika', bhairava: 'Nakuleshwar', location: 'Kalighat, Kolkata', state: 'West Bengal', country: 'India',
    significance: 'Kolkata\'s namesake temple. Goddess Kali in her fiercest swayambhu form.', legend: 'Sati\'s right toe fell here on the banks of the old Adi Ganga channel.',
    signatureRitual: 'Bhog Aarti at noon', darshanTimings: '05:00–14:00, 17:00–22:30 IST', bestSeason: 'October–March (Kali Puja Oct/Nov peak)',
    howToReach: 'Kolkata Metro Kalighat station (200m walk).', primaryPujas: ['Kali Puja', 'Manasik Puja (wish-vow)', 'Pushpanjali', 'Chandi Path'],
    navratriSpecial: 'Kali Puja (Amavasya of Kartik) — devotees offer red hibiscus + animal sacrifice (registered)',
    modernAccess: 'No online booking. VIP darshan via on-site ticket counter ₹150.', estimatedDailyVisitors: '15,000–20,000 (Kali Puja 2L+)' },

  { slug: 'dakshina-kali-tarapith', number: 3, name: 'Tarapith', sanskrit: 'तारापीठ', bodyPart: 'Third eye', devi: 'Tara', bhairava: 'Chandra Chuda', location: 'Tarapith, Birbhum', state: 'West Bengal', country: 'India',
    significance: 'Tantric Vajrayana cremation-ground sadhana site. Bamakhyapa\'s samadhi.', legend: 'Sati\'s third eye (or as some texts say nayan-tara) fell here. Sage Vasishtha installed the image.',
    signatureRitual: 'Mahashmashana sadhana at adjacent cremation ground (night-time only, for initiated)',
    darshanTimings: '06:00–14:00, 16:30–21:00 IST', bestSeason: 'October–February',
    howToReach: 'Rampurhat junction (10 km) → auto/cab.', primaryPujas: ['Tara Puja', 'Bhog Aarti', 'Mahabhairavi Puja', 'Shava Sadhana (for initiated)'],
    navratriSpecial: 'Magh Purnima + Kaushiki Amavasya draw 5L+ devotees', modernAccess: 'Off-line booking only via temple priests.', estimatedDailyVisitors: '5,000–10,000 (festivals 2L+)' },

  { slug: 'jwalamukhi', number: 4, name: 'Jwalamukhi', sanskrit: 'ज्वालामुखी', bodyPart: 'Tongue', devi: 'Siddhida (Ambika)', bhairava: 'Unmatta Bhairava', location: 'Jwalamukhi, Kangra', state: 'Himachal Pradesh', country: 'India',
    significance: 'Goddess manifests as 9 perpetual blue flames burning from rock fissures — no fuel source.', legend: 'Sati\'s tongue fell here. Akbar tried to extinguish flames with iron disc + water — failed.',
    signatureRitual: 'Akhand Jyot Darshan + Aarti', darshanTimings: '05:00–12:00, 14:30–22:00 IST',
    bestSeason: 'March–June, September–November (avoid winter snow)',
    howToReach: 'Pathankot railway (123 km) → cab. Dharamshala airport (50 km).', primaryPujas: ['Jyot Aarti', 'Akhand Jyot Darshan', 'Chunari offering', 'Navratri 9-day fast'],
    navratriSpecial: 'Navratri 2x yearly — devotees fast all 9 days, lakhs visit', modernAccess: 'Online darshan booking via HP Tourism portal.', estimatedDailyVisitors: '5,000–8,000 (Navratri 1L+)' },

  { slug: 'naina-devi', number: 5, name: 'Naina Devi', sanskrit: 'नैना देवी', bodyPart: 'Eyes', devi: 'Mahishamardini', bhairava: 'Koteshwar Mahadev', location: 'Naina Devi, Bilaspur', state: 'Himachal Pradesh', country: 'India',
    significance: 'Goddess Naina (eye) form. Hilltop temple at 1,177m overlooking Govind Sagar lake.', legend: 'Sati\'s eyes fell here. Naina Bhil, a Gujjar boy, discovered the swayambhu pindi.',
    signatureRitual: 'Maha Aarti at sunset', darshanTimings: '04:00–22:00 IST',
    bestSeason: 'March–June, September–November',
    howToReach: 'Anandpur Sahib railway (20 km) → cable car / cab to hilltop.', primaryPujas: ['Pindi Darshan', 'Chunari', 'Mundan ceremony', 'Halwa-Puri prasad'],
    navratriSpecial: 'Shravan Ashtami Mela + 2 Navratris — among Himachal\'s biggest religious fairs', modernAccess: 'HP Tourism online VIP slot ₹200.', estimatedDailyVisitors: '4,000–8,000 (Navratri 50k+)' },

  { slug: 'chintpurni', number: 6, name: 'Chintpurni', sanskrit: 'छिन्नमस्तिका', bodyPart: 'Forehead', devi: 'Chinnamastika (Chhinnamastika)', bhairava: 'Rudra Mahadev', location: 'Chintpurni, Una', state: 'Himachal Pradesh', country: 'India',
    significance: 'Goddess in headless form — most esoteric Tantric mahavidya. Wish-fulfilling deity.', legend: 'Sati\'s forehead/feet fell here per varying traditions. Chinnamasta beheads herself to feed two attendants.',
    signatureRitual: 'Pindi Darshan + Prasad Bhog', darshanTimings: '04:00–22:30 IST',
    bestSeason: 'March–June, September–November',
    howToReach: 'Una railway (50 km) → bus/cab.', primaryPujas: ['Pindi Darshan', 'Chunari', 'Akhand Jyot', 'Halwa offering'],
    navratriSpecial: 'Sawan Ashtami fair (Aug) + 2 Navratris — massive pilgrim load', modernAccess: 'HP Tourism online booking.', estimatedDailyVisitors: '6,000–10,000 (Navratri 1L+)' },

  { slug: 'vajreshwari-kangra', number: 7, name: 'Vajreshwari (Kangra)', sanskrit: 'वज्रेश्वरी', bodyPart: 'Left breast', devi: 'Vajreshwari (Bajreshwari)', bhairava: 'Abhiru', location: 'Kangra fort, Kangra', state: 'Himachal Pradesh', country: 'India',
    significance: 'Devi as wielder of thunderbolt. One of richest medieval temples — looted 5 times.', legend: 'Sati\'s left breast fell here. Pandavas built original temple after dream-vision.',
    signatureRitual: 'Shringar Aarti at dawn', darshanTimings: '05:00–12:00, 14:00–21:00 IST',
    bestSeason: 'March–June, September–November',
    howToReach: 'Pathankot (95 km) or Dharamshala airport (15 km).', primaryPujas: ['Pindi Darshan', 'Shringar', 'Mundan', 'Chunari'],
    navratriSpecial: 'Makar Sankranti special (ghee + butter mountain offering — Pind Dan tradition)', modernAccess: 'On-site VIP ticket ₹100.', estimatedDailyVisitors: '4,000–7,000 (Navratri 80k+)' },

  { slug: 'mansa-devi-haridwar', number: 8, name: 'Mansa Devi (Haridwar)', sanskrit: 'मनसा देवी', bodyPart: 'Hands', devi: 'Mansa', bhairava: 'Bhairavnath', location: 'Bilwa Parvat, Haridwar', state: 'Uttarakhand', country: 'India',
    significance: 'Wish-fulfilling Devi (mansa = mind/wish). One of Panch Tirth of Haridwar.', legend: 'Sati\'s hands fell here per local tradition. Image self-manifested.',
    signatureRitual: 'Wish-thread tying on temple tree', darshanTimings: '05:00–21:00 IST',
    bestSeason: 'October–March (avoid monsoon)',
    howToReach: 'Haridwar railway (5 km) → ropeway (only ₹109 round-trip) or 1.5 km trek.', primaryPujas: ['Pindi Darshan', 'Mansa Puja', 'Wish-thread ritual', 'Prasad bhog'],
    navratriSpecial: 'Both Navratris peak — combined with Chandi Devi + Maya Devi tour', modernAccess: 'Ropeway online booking via UTDB portal.', estimatedDailyVisitors: '15,000–25,000 (Kumbh + Navratri 1L+)' },

  { slug: 'chandi-devi-haridwar', number: 9, name: 'Chandi Devi (Haridwar)', sanskrit: 'चण्डी देवी', bodyPart: 'Neck/right shoulder', devi: 'Chandi', bhairava: 'Chandrashekhar', location: 'Neel Parvat, Haridwar', state: 'Uttarakhand', country: 'India',
    significance: 'Goddess Chandi slayed demons Shumbha-Nishumbha here per Devi Mahatmya.', legend: 'Sati\'s navel/neck per varying texts. Adi Shankaracharya installed current image 8th century.',
    signatureRitual: 'Sunrise Aarti from Neel Parvat peak', darshanTimings: '06:00–20:00 IST',
    bestSeason: 'October–March',
    howToReach: 'Haridwar railway (8 km) → ropeway from Chandi Ghat or 3 km trek.', primaryPujas: ['Pindi Darshan', 'Chandi Path recitation', 'Bhog'],
    navratriSpecial: 'Chandi Path daily 9 days — recitation continuously', modernAccess: 'Ropeway ticket ₹196 round-trip.', estimatedDailyVisitors: '8,000–15,000' },

  { slug: 'mahalakshmi-kolhapur', number: 10, name: 'Mahalakshmi (Kolhapur)', sanskrit: 'महालक्ष्मी', bodyPart: 'Three eyes', devi: 'Mahalakshmi (Ambabai)', bhairava: 'Krodhish (Krodhishwar)', location: 'Kolhapur, Maharashtra', state: 'Maharashtra', country: 'India',
    significance: 'One of 3.5 Shakti Peeths of Maharashtra. Goddess of wealth + abundance.', legend: 'Sati\'s eyes fell here. Twin temple has self-illuminated lingam at Ambabai\'s feet.',
    signatureRitual: 'Kiranotsava — sun rays directly strike idol Jan 31, Feb 1, Nov 9, Nov 10',
    darshanTimings: '04:30–10:30, 11:30–22:30 IST', bestSeason: 'October–March',
    howToReach: 'Kolhapur airport (8 km). Pune (240 km) via Pune-Bangalore highway.', primaryPujas: ['Padya Puja', 'Shodashopachara', 'Kiranotsava darshan', 'Lalita Sahasranama'],
    navratriSpecial: '9-day Mahalakshmi Yatra — pradakshina around Kolhapur old city', modernAccess: 'Online VIP slot ₹100 via mahalakshmikolhapur.com.', estimatedDailyVisitors: '15,000–20,000 (Navratri 2L+)' },

  { slug: 'tulja-bhavani', number: 11, name: 'Tulja Bhavani', sanskrit: 'तुळजा भवानी', bodyPart: 'Right hand', devi: 'Tulja Bhavani', bhairava: 'Bhima', location: 'Tuljapur, Osmanabad', state: 'Maharashtra', country: 'India',
    significance: 'Family deity (kuldevi) of Chhatrapati Shivaji. He received the famous Bhavani Talwar from her here.', legend: 'Sati\'s right hand fell here. Originally a swayambhu image found in forest.',
    signatureRitual: 'Tulja Bhavani Yatra (Aug-Sept) — 21-day fair', darshanTimings: '05:00–13:00, 17:00–22:00 IST',
    bestSeason: 'October–March', howToReach: 'Solapur railway (50 km) → bus/cab.',
    primaryPujas: ['Padya Puja', 'Maharudra Abhishek', 'Shringar', 'Mahabhog'],
    navratriSpecial: 'Both Navratris — 9-day fair, lakhs visit', modernAccess: 'On-site VIP ticket ₹150.', estimatedDailyVisitors: '8,000–12,000 (Navratri 1.5L+)' },

  { slug: 'mahur-renuka', number: 12, name: 'Mahur (Renuka Mata)', sanskrit: 'माहुर रेणुका', bodyPart: 'Right cheek', devi: 'Renuka (Ekvira)', bhairava: 'Dattatreya', location: 'Mahur, Nanded', state: 'Maharashtra', country: 'India',
    significance: '3rd of Maharashtra\'s 3.5 Shakti Peeths. Birthplace of Lord Dattatreya per tradition.', legend: 'Sati\'s right cheek fell here. Renuka is also Parashurama\'s mother — beheaded + revived.',
    signatureRitual: 'Dattatreya Jayanti combined celebration', darshanTimings: '05:00–13:00, 16:00–21:00 IST',
    bestSeason: 'October–March', howToReach: 'Nanded railway (130 km) → bus.',
    primaryPujas: ['Renuka Puja', 'Datta Aarti', 'Padya Puja', 'Mundan'],
    navratriSpecial: 'Datta Jayanti (Margashirsha Purnima) draws 1L+', modernAccess: 'No online booking.', estimatedDailyVisitors: '5,000–8,000 (festivals 50k+)' },

  { slug: 'saptashrungi', number: 13, name: 'Saptashrungi', sanskrit: 'सप्तशृंगी', bodyPart: 'Right arm', devi: 'Saptashrungi (Bhagawati)', bhairava: 'Vikritaksha', location: 'Saptashringi Hills, Nashik', state: 'Maharashtra', country: 'India',
    significance: 'Half-Shakti Peeth (Ardha-Shakti). 18-armed goddess on 7 peaks (sapta-shrunga).', legend: 'Sati\'s right arm fell here. Goddess slayed Mahishasura on this hill.',
    signatureRitual: 'Chaitri Yatra (Hanuman Jayanti to Chaitra Purnima)', darshanTimings: '04:00–22:00 IST',
    bestSeason: 'October–March (avoid monsoon hill route)',
    howToReach: 'Nashik (60 km) → bus to base + funicular trolley.', primaryPujas: ['Padya Puja', 'Shodashopachara', 'Mundan', 'Chunari'],
    navratriSpecial: 'Both Navratris peak — funicular fully booked', modernAccess: 'Funicular online booking via Maharashtra State Tourism.', estimatedDailyVisitors: '8,000–12,000 (Chaitri Yatra 5L+)' },

  { slug: 'amba-ji', number: 14, name: 'Ambaji', sanskrit: 'अम्बाजी', bodyPart: 'Heart', devi: 'Arasuri Amba', bhairava: 'Batuk Bhairav', location: 'Ambaji, Banaskantha', state: 'Gujarat', country: 'India',
    significance: 'One of original 51. No idol — only inscribed yantra (Visa Shree Yantra). Most-visited Devi shrine in Gujarat.', legend: 'Sati\'s heart fell here. Yantra worshipped since Vedic era.',
    signatureRitual: 'Aarti 7 times daily', darshanTimings: '07:00–11:30, 12:30–16:30, 18:30–21:00 IST',
    bestSeason: 'October–March (Bhadarvi Poonam Sept fair peak)',
    howToReach: 'Ahmedabad airport (185 km) → bus/cab. Direct trains to Ambaji station (1.5 km).',
    primaryPujas: ['Yantra Puja', 'Shodashopachara', 'Garba performance offering', 'Mahaprasad'],
    navratriSpecial: 'Navratri 9 nights — community Garba dance, sponsored by trust', modernAccess: 'Trust online VIP booking ₹100.', estimatedDailyVisitors: '20,000–30,000 (Bhadarvi Poonam 50L over 5 days)' },

  { slug: 'hinglaj-mata', number: 15, name: 'Hinglaj Mata', sanskrit: 'हिङ्गलाज', bodyPart: 'Brahmarandhra (crown)', devi: 'Hinglaj (Kotari)', bhairava: 'Bhimalochan', location: 'Hingol National Park, Lasbela', state: 'Balochistan', country: 'Pakistan',
    significance: 'Westernmost Shakti Peeth — 250 km from Karachi in desolate Hingol. Sufi pilgrimage too (Nani Mandir / Bibi Nani).', legend: 'Sati\'s brahmarandhra (crown of head) fell here. Cave-temple deep in Hingol mountains.',
    signatureRitual: 'Hinglaj Yatra (April pilgrimage from Karachi)', darshanTimings: 'Sunrise to sunset (no electricity at site)',
    bestSeason: 'November–March only',
    howToReach: 'Karachi → Hingol (250 km road, off-road last 50 km). Permit required.',
    primaryPujas: ['Cave darshan', 'Yatra offerings', 'Trek-pilgrimage', 'Sufi-Hindu syncretic rites'],
    navratriSpecial: 'Hinglaj Yatra — April only, ~50k pilgrims', modernAccess: 'Pakistan visa + Pakistan Hindu Council coordination required.', estimatedDailyVisitors: 'Almost 0 (yatra-only)' },

  { slug: 'sharada-peeth', number: 16, name: 'Sharada Peeth', sanskrit: 'शारदा पीठ', bodyPart: 'Right hand', devi: 'Sharada (Saraswati)', bhairava: 'Sharvananda', location: 'Mount Harmukh, PoK', state: 'Pakistan-Occupied Kashmir', country: 'Pakistan',
    significance: 'Ancient Sanskrit + Sharada-script university destroyed in invasions. Adi Shankaracharya visited.', legend: 'Sati\'s right hand fell here. Sharada-Mandir was Kashmir\'s Vidyapeeth.',
    signatureRitual: 'Currently no darshan possible — ruins only', darshanTimings: 'N/A (ruins)', bestSeason: 'N/A',
    howToReach: 'In PoK Neelum Valley — Indian devotees cannot access. Restoration negotiations ongoing.',
    primaryPujas: ['Symbolic puja from Indian side (Kupwara) in dedicated Sharada shrine'],
    navratriSpecial: 'Kashmiri Pandit community holds remembrance rituals each year', modernAccess: 'Inaccessible — Kashmir Hindu groups seek pilgrimage corridor.', estimatedDailyVisitors: '0 (closed since 1948)' },

  { slug: 'kankalitala', number: 17, name: 'Kankalitala', sanskrit: 'कङ्कालीतला', bodyPart: 'Pelvis (kankal)', devi: 'Devgarbha', bhairava: 'Ruru', location: 'Kankalitala, Birbhum', state: 'West Bengal', country: 'India',
    significance: 'Where Sati\'s skeleton fell. Pond next to temple holds water year-round even in summer.', legend: 'Sati\'s pelvic bone (kankal) fell here. Image installed in pond — no traditional sanctum.',
    signatureRitual: 'Bhog Aarti', darshanTimings: '06:00–12:00, 16:00–20:00 IST', bestSeason: 'October–March',
    howToReach: 'Bolpur-Shantiniketan (9 km) → cab.', primaryPujas: ['Pond darshan', 'Pinda Daan (ancestor rites)', 'Chunari'],
    navratriSpecial: 'Kaushiki Amavasya draws crowds', modernAccess: 'No online booking.', estimatedDailyVisitors: '2,000–4,000' },

  { slug: 'tripura-sundari-udaipur', number: 18, name: 'Tripura Sundari', sanskrit: 'त्रिपुर सुन्दरी', bodyPart: 'Right leg', devi: 'Tripura Sundari', bhairava: 'Tripuresh', location: 'Udaipur (Matabari), Gomati', state: 'Tripura', country: 'India',
    significance: 'Tripura state\'s namesake. Maharaja built current temple 1501 CE in red brick.', legend: 'Sati\'s right leg fell here. Image swayambhu, identical to Kashi Vishalakshi (twin shrines).',
    signatureRitual: 'Diwali Mela 7-day fair', darshanTimings: '04:00–14:00, 17:00–22:00 IST',
    bestSeason: 'October–March', howToReach: 'Agartala airport (60 km) → cab/bus.',
    primaryPujas: ['Padya Puja', 'Shodashopachara', 'Animal sacrifice (registered)', 'Diwali special'],
    navratriSpecial: 'Diwali Mela 7 days draws 5L+', modernAccess: 'On-site VIP ticket.', estimatedDailyVisitors: '5,000–8,000 (Diwali Mela 50k/day)' },

  { slug: 'gandaki-chandi', number: 19, name: 'Gandaki Chandi (Muktinath)', sanskrit: 'मुक्तिनाथ', bodyPart: 'Right cheek', devi: 'Gandaki Chandi', bhairava: 'Chakrapani', location: 'Muktinath, Mustang', state: 'Gandaki', country: 'Nepal',
    significance: 'At 3,710m altitude. Sacred to Hindus + Buddhists. Source of all 64 Shaligrams of Vishnu found in Gandaki river.', legend: 'Sati\'s right cheek fell here. Vishnu freed from Tulsi-curse here — both Devi + Vishnu sanctity.',
    signatureRitual: '108 water spouts bath', darshanTimings: '05:00–17:00 IST (closed Dec–Feb snow)',
    bestSeason: 'April–November',
    howToReach: 'Pokhara → Jomsom flight → Muktinath jeep. Or 7-day Annapurna trek.',
    primaryPujas: ['Saligram Puja', 'Devi Darshan', '108-spout bath', 'Pind Daan'],
    navratriSpecial: 'Yartung festival (Aug) draws Buddhist + Hindu pilgrims', modernAccess: 'Nepal Tourism flight booking.', estimatedDailyVisitors: '500–1,500 in season' },

  { slug: 'guhyeshwari', number: 20, name: 'Guhyeshwari', sanskrit: 'गुह्येश्वरी', bodyPart: 'Both knees', devi: 'Guhyeshwari (Mahamaya)', bhairava: 'Kapali', location: 'Pashupatinath complex, Kathmandu', state: 'Bagmati', country: 'Nepal',
    significance: 'Tantric Devi adjacent to Pashupatinath. King Pratap Malla built current shrine 1654 CE.', legend: 'Sati\'s knees fell here. "Guhyeshwari" = lady of the secret place. Image hidden behind cloth always.',
    signatureRitual: 'Kalaratri Puja during Navratri', darshanTimings: '04:00–20:00 IST', bestSeason: 'October–March',
    howToReach: 'Kathmandu airport (8 km) → Pashupatinath area.',
    primaryPujas: ['Guhya Puja (Tantric)', 'Padya Puja', 'Bhog Aarti', 'Pashupatinath combined yatra'],
    navratriSpecial: 'Dashain (Navratri) is Nepal\'s biggest festival — 15 days', modernAccess: 'Open to all (foreigners restricted at Pashupatinath but Guhyeshwari accessible).', estimatedDailyVisitors: '4,000–8,000' },

  { slug: 'dakshayani-manasarovar', number: 21, name: 'Dakshayani (Manasarovar)', sanskrit: 'दाक्षायणी', bodyPart: 'Right hand', devi: 'Dakshayani (Sati)', bhairava: 'Amar', location: 'Lake Manasarovar, Mount Kailash', state: 'Tibet Autonomous Region', country: 'Tibet',
    significance: 'Most sacred Shakti Peeth — adjacent to Mount Kailash (Shiva\'s abode). Lake bath = moksha.', legend: 'Sati herself fell here per local tradition. Body of Sati = Dakshayani (daughter of Daksha).',
    signatureRitual: 'Manasarovar parikrama (88 km) + Kailash parikrama (52 km, 3 days)',
    darshanTimings: 'Sunrise to sunset (yatra season May–Sept)',
    bestSeason: 'May–September only (rest of year snowed in)',
    howToReach: 'Delhi → Lhasa flight → 4-day road journey via Nepal border. KMVN/MEA yatra registration.',
    primaryPujas: ['Lake snan', 'Parikrama', 'Pind Daan at Manasarovar shore', 'Kailash darshan'],
    navratriSpecial: 'Saga Dawa (May full moon) — Buddhist + Hindu syncretic festival', modernAccess: 'MEA Kailash Manasarovar Yatra application via portal.', estimatedDailyVisitors: '50–200 (registered yatris only)' },

  { slug: 'biraja-jajpur', number: 22, name: 'Biraja Devi (Jajpur)', sanskrit: 'विरजा', bodyPart: 'Navel', devi: 'Biraja (Girija)', bhairava: 'Jagannath', location: 'Jajpur, Odisha', state: 'Odisha', country: 'India',
    significance: 'Navi Gaya — Pind Daan equivalent to Gaya in efficacy. Pre-Vaishnava Tantric Devi.', legend: 'Sati\'s navel (nabhi) fell here. Idol has 2 hands holding spear + Mahishasura-tail.',
    signatureRitual: 'Pind Daan + Tarpana for ancestors', darshanTimings: '06:00–13:00, 16:00–21:00 IST',
    bestSeason: 'October–March', howToReach: 'Cuttack (80 km) → bus/train to Jajpur Road station.',
    primaryPujas: ['Pind Daan', 'Tarpana', 'Padya Puja', 'Shodashopachara'],
    navratriSpecial: 'Both Navratris peak; Mahalaya Amavasya 2L+ for ancestor rites', modernAccess: 'On-site ticket.', estimatedDailyVisitors: '4,000–8,000 (Mahalaya 50k+)' },

  { slug: 'kireeteshwari', number: 23, name: 'Kireeteshwari', sanskrit: 'किरीटेश्वरी', bodyPart: 'Crown (kireet)', devi: 'Mukteshwari (Vimla)', bhairava: 'Samvarta', location: 'Kiritkona, Murshidabad', state: 'West Bengal', country: 'India',
    significance: 'Sati\'s crown ornament fell here. Maintained by zamindari trust since Mughal era.', legend: 'Crown fragment fell when Vishnu cut Sati\'s body. No idol — only stone slab.',
    signatureRitual: 'Bhog at noon', darshanTimings: '05:30–13:00, 16:30–20:00 IST', bestSeason: 'October–March',
    howToReach: 'Murshidabad station (35 km) → cab/bus.',
    primaryPujas: ['Slab darshan', 'Bhog', 'Pushpanjali'],
    navratriSpecial: 'Bengal\'s Sarat Navratri — devotees from Murshidabad-Birbhum belt', modernAccess: 'No online.', estimatedDailyVisitors: '1,000–3,000' },

  { slug: 'manibandh', number: 24, name: 'Manibandh (Pushkar)', sanskrit: 'मणिबन्ध', bodyPart: 'Wrists', devi: 'Gayatri', bhairava: 'Sarvananda', location: 'Gayatri Hill, Pushkar', state: 'Rajasthan', country: 'India',
    significance: 'Where Sati\'s wrist-bracelets (mani-bandh) fell. Adjacent to Brahma Mandir Pushkar.', legend: 'Sati\'s wrists fell here. Both Brahma + Devi worshipped — rare combination.',
    signatureRitual: 'Gayatri Mahayagna at Kartik Purnima', darshanTimings: '05:00–12:00, 16:00–21:00 IST',
    bestSeason: 'October–March (Pushkar Mela November)',
    howToReach: 'Ajmer (15 km) → cab. Pushkar walk + uphill 30 min.',
    primaryPujas: ['Gayatri Mantra recitation', 'Padya Puja', 'Yagna (Kartik)', 'Pushkar lake snan'],
    navratriSpecial: 'Pushkar Mela 5 days — combines Brahma + Gayatri worship', modernAccess: 'On-site ticket.', estimatedDailyVisitors: '3,000–6,000 (Mela 50k/day)' },

  { slug: 'shri-shail', number: 25, name: 'Shri Shail (Srisailam)', sanskrit: 'श्री शैल', bodyPart: 'Neck', devi: 'Bhramaramba', bhairava: 'Mallikarjuna', location: 'Srisailam, Nallamala forest', state: 'Andhra Pradesh', country: 'India',
    significance: 'Both Jyotirlinga (Mallikarjuna) and Shakti Peeth (Bhramaramba). Extremely rare dual sanctity.', legend: 'Sati\'s neck fell here. Bhramaramba = "bee-goddess" who took form of 6 bees to fight demon.',
    signatureRitual: 'Maha Mangala Aarti + Bhramaramba Devi Darshan combined', darshanTimings: '04:30–13:00, 14:30–22:00 IST',
    bestSeason: 'October–February',
    howToReach: 'Hyderabad (230 km) road. Markapur Road station (85 km).',
    primaryPujas: ['Mallikarjuna Rudrabhishek', 'Bhramaramba Kumkumarchana', 'Combined Devi-Shiva puja', 'Maha Nyasa'],
    navratriSpecial: 'Maha Shivratri + Devi Navratri both major', modernAccess: 'Online booking via sevatickets portal.', estimatedDailyVisitors: '5,000–8,000 (Shivratri 50k+)' },

  { slug: 'kashi-vishalakshi', number: 26, name: 'Vishalakshi (Kashi)', sanskrit: 'विशालाक्षी', bodyPart: 'Earring/eye', devi: 'Vishalakshi', bhairava: 'Kala Bhairav', location: 'Mir Ghat, Varanasi', state: 'Uttar Pradesh', country: 'India',
    significance: 'Shakti Peeth pair to Kashi Vishwanath Jyotirlinga — twin sanctity.', legend: 'Sati\'s earring (kundal) fell here per Pithanirnaya. Vishalakshi = "wide-eyed".',
    signatureRitual: 'Mahamaya Aarti', darshanTimings: '04:00–11:00, 12:00–20:00 IST',
    bestSeason: 'October–March', howToReach: 'Mir Ghat in Old City — 8 km from Varanasi station.',
    primaryPujas: ['Padya Puja', 'Shodashopachara', 'Kashi Vishalakshi-Vishwanath combined yatra', 'Ganga snan'],
    navratriSpecial: 'Both Navratris — pilgrims combine with Vishwanath darshan', modernAccess: 'On-site ticket.', estimatedDailyVisitors: '8,000–15,000' },

  { slug: 'lalita-prayag', number: 27, name: 'Lalita (Prayagraj)', sanskrit: 'ललिता', bodyPart: 'Finger', devi: 'Lalita (Alopi Devi)', bhairava: 'Bhava', location: 'Alopibagh, Prayagraj', state: 'Uttar Pradesh', country: 'India',
    significance: 'No idol — only a wooden palanquin (palki) over a stone pit. Goddess "disappeared" (alopi).', legend: 'Sati\'s finger fell here. Goddess vanished into the pit during a robbery — only palanquin remains.',
    signatureRitual: 'Palki Aarti', darshanTimings: '05:00–22:00 IST', bestSeason: 'October–February (Magh Mela Jan)',
    howToReach: 'Prayagraj junction (4 km) → cab.', primaryPujas: ['Palki Darshan', 'Padya Puja', 'Triveni Sangam snan'],
    navratriSpecial: 'Magh Mela (Jan-Feb) + Kumbh combined', modernAccess: 'On-site only.', estimatedDailyVisitors: '6,000–12,000 (Kumbh 5L+)' },

  { slug: 'shuchindram', number: 28, name: 'Shuchindram', sanskrit: 'शुचीन्द्रम्', bodyPart: 'Upper teeth', devi: 'Narayani', bhairava: 'Sanhar', location: 'Shuchindram, Kanyakumari', state: 'Tamil Nadu', country: 'India',
    significance: 'Trimurti shrine — Brahma + Vishnu + Shiva combined as Sthanumalayam. Adjacent Devi sanctum.', legend: 'Sati\'s upper teeth fell here. Indra purified (shuchi) of Ahalya-curse at this site.',
    signatureRitual: 'Trimurti darshan + Devi darshan combined', darshanTimings: '04:30–12:00, 17:00–20:30 IST',
    bestSeason: 'November–February',
    howToReach: 'Kanyakumari (12 km) → bus/cab. Trivandrum airport (85 km).',
    primaryPujas: ['Trimurti Puja', 'Narayani Devi Puja', 'Special Friday abhishek', 'Vinayaka homam'],
    navratriSpecial: 'Both Navratris', modernAccess: 'On-site ticket.', estimatedDailyVisitors: '3,000–6,000' },

  { slug: 'panchsagar', number: 29, name: 'Panchsagar', sanskrit: 'पञ्चसागर', bodyPart: 'Lower teeth', devi: 'Varahi', bhairava: 'Maharudra', location: 'Disputed (Varanasi outskirts or Lohaghat)', state: 'Uttar Pradesh / Uttarakhand', country: 'India',
    significance: 'Identification disputed. Some texts place at 5-river confluence near Varanasi; others at Lohaghat Champavat.', legend: 'Sati\'s lower teeth fell here. Varahi = boar-faced Shakti.',
    signatureRitual: 'Varahi Puja', darshanTimings: 'Local variations', bestSeason: 'October–March',
    howToReach: 'Lohaghat candidate: Tanakpur (90 km) → bus. Varahi temple at Lohaghat.',
    primaryPujas: ['Varahi Yantra Puja', 'Padya Puja'],
    navratriSpecial: 'Local Navratri observance', modernAccess: 'Limited info available.', estimatedDailyVisitors: '500–2,000' },

  { slug: 'jayanti-bangladesh', number: 30, name: 'Jayanti', sanskrit: 'जयन्ती', bodyPart: 'Left thigh', devi: 'Jayanti', bhairava: 'Kramadishwar', location: 'Sylhet (Baurbhag village)', state: 'Sylhet Division', country: 'Bangladesh',
    significance: 'Sati\'s left thigh fell here. Hindu pilgrim trail in Sylhet hills.', legend: 'Per Pithanirnaya — Jayanti at Khasia hills.',
    signatureRitual: 'Local Bengali Hindu observances', darshanTimings: 'Daylight only',
    bestSeason: 'October–March (avoid monsoon flooding)',
    howToReach: 'Sylhet city (60 km) → cab. Bangladesh visa required.',
    primaryPujas: ['Bhog', 'Pushpanjali'],
    navratriSpecial: 'Durga Puja peak in Sylhet Hindu community', modernAccess: 'Bangladesh visa + local guide.', estimatedDailyVisitors: 'Few hundred (festivals 5-10k)' },

  { slug: 'bhairavparvat-mp', number: 31, name: 'Bhairavparvat', sanskrit: 'भैरवपर्वत', bodyPart: 'Upper lip', devi: 'Avanti', bhairava: 'Lambakarna', location: 'Bhairav Parvat, Ujjain', state: 'Madhya Pradesh', country: 'India',
    significance: 'Adjacent to Mahakaleshwar Jyotirlinga + Harsiddhi Shakti Peeth — Ujjain holds 3 major shrines.', legend: 'Sati\'s upper lip fell here. Hill outside Ujjain old city.',
    signatureRitual: 'Bhairav Tantra rituals', darshanTimings: '06:00–13:00, 16:00–21:00 IST', bestSeason: 'October–March',
    howToReach: 'Ujjain (5 km from city center). Combined with Mahakaleshwar tour.',
    primaryPujas: ['Bhairav Puja', 'Madya (liquor) offering — traditional only', 'Padya Puja'],
    navratriSpecial: 'Both Navratris — combined with Harsiddhi Devi yatra', modernAccess: 'On-site ticket.', estimatedDailyVisitors: '3,000–6,000' },

  { slug: 'harsiddhi-ujjain', number: 32, name: 'Harsiddhi', sanskrit: 'हरसिद्धि', bodyPart: 'Elbow', devi: 'Mahalaxmi (Harsiddhi)', bhairava: 'Asitanga', location: 'Ujjain old city', state: 'Madhya Pradesh', country: 'India',
    significance: 'Family deity (kuldevi) of Vikramaditya. Twin oil-lamp pillars (deepstambh) light up Navratri.', legend: 'Sati\'s elbow fell here. Vikramaditya offered his own head 11 times to please goddess.',
    signatureRitual: 'Deepstambh Lighting at sunset (Navratri)', darshanTimings: '05:00–12:00, 16:00–22:00 IST',
    bestSeason: 'October–March (Navratri peak)',
    howToReach: 'Ujjain station (1 km). Combined with Mahakaleshwar + Bhairavparvat.',
    primaryPujas: ['Padya Puja', 'Shodashopachara', 'Deepdaan', 'Kumkum Archana'],
    navratriSpecial: '9-day Deepdaan — both 51-foot deepstambh fully lit with 1,000+ lamps each', modernAccess: 'On-site VIP ticket.', estimatedDailyVisitors: '6,000–10,000 (Navratri 50k+)' },

  { slug: 'utkala', number: 33, name: 'Utkala (Viraja annexed)', sanskrit: 'उत्कल', bodyPart: 'Navel', devi: 'Vimla', bhairava: 'Jagannath', location: 'Puri Jagannath complex', state: 'Odisha', country: 'India',
    significance: 'Vimla shrine inside Jagannath temple complex — Jagannath bhog passes through Vimla first.', legend: 'Sati\'s navel per varying tradition (also at Biraja Jajpur). Vimla = goddess of Jagannath kshetra.',
    signatureRitual: 'Vimla Bhog Naivedya before Jagannath', darshanTimings: '05:00–22:00 IST (with Jagannath complex)',
    bestSeason: 'October–March (Rath Yatra June-July)',
    howToReach: 'Inside Jagannath complex Puri — non-Hindus restricted.',
    primaryPujas: ['Vimla Bhog', 'Padya Puja', 'Combined Jagannath darshan'],
    navratriSpecial: 'Sharad Navratri — Vimla worshipped 9 days separately', modernAccess: 'Hindu-only.', estimatedDailyVisitors: '30,000–50,000 (Rath Yatra 10L+)' },

  { slug: 'kalmadhav', number: 34, name: 'Kalmadhav', sanskrit: 'कालमाधव', bodyPart: 'Left buttock', devi: 'Kali (Devi)', bhairava: 'Asitanga Bhairav', location: 'Amarkantak vicinity (debated)', state: 'Madhya Pradesh', country: 'India',
    significance: 'Sati\'s left buttock fell here per Devi Bhagavata. Exact site debated — Amarkantak Narmada source area.', legend: 'Sage Kalmadhav installed first image. Pre-Vedic Tantric site.',
    signatureRitual: 'Narmada parikrama starts here', darshanTimings: 'Sunrise to sunset', bestSeason: 'October–March',
    howToReach: 'Pendra Road station (40 km) → bus to Amarkantak.',
    primaryPujas: ['Padya Puja', 'Narmada snan + Devi darshan', 'Parikrama vow-taking'],
    navratriSpecial: 'Both Navratris', modernAccess: 'No formal portal.', estimatedDailyVisitors: '1,500–3,000' },

  { slug: 'shondesh-amarkantak', number: 35, name: 'Shondesh (Amarkantak)', sanskrit: 'शोन्देश', bodyPart: 'Right buttock', devi: 'Narmada', bhairava: 'Bhadrasena', location: 'Sone river source, Amarkantak', state: 'Madhya Pradesh', country: 'India',
    significance: 'Sone-bhed Tirth — confluence of Sone river source + Narmada source. Twin-river origin point.', legend: 'Sati\'s right buttock fell here. River Sone (= "gold") begins.',
    signatureRitual: 'Sone-source snan + Devi darshan', darshanTimings: 'Sunrise to sunset',
    bestSeason: 'October–March', howToReach: 'Amarkantak town → 1.5 km walk uphill to source.',
    primaryPujas: ['Sone snan', 'Padya Puja', 'Pind Daan'],
    navratriSpecial: 'Narmada Jayanti (Magh Sukla Saptami) peak', modernAccess: 'On-site only.', estimatedDailyVisitors: '1,000–2,500' },

  { slug: 'ramgiri', number: 36, name: 'Ramgiri (Chitrakoot)', sanskrit: 'रामगिरि', bodyPart: 'Right breast', devi: 'Shivani', bhairava: 'Chanda', location: 'Chitrakoot, Satna', state: 'Madhya Pradesh', country: 'India',
    significance: 'Where Rama spent 11 years of vanvas. Sati\'s right breast Shakti Peeth + Rama vanvas site overlap.', legend: 'Sati\'s right breast fell at Ramgiri hill. Image worshipped since Treta Yuga per Ramayana.',
    signatureRitual: 'Kamadgiri Parikrama (5 km)', darshanTimings: '05:00–12:00, 16:00–21:00 IST',
    bestSeason: 'October–March',
    howToReach: 'Chitrakoot Dham Karwi station (10 km) → cab.',
    primaryPujas: ['Padya Puja', 'Kamadgiri Parikrama', 'Mandakini snan'],
    navratriSpecial: 'Ramnavmi + Janaki Jayanti peak', modernAccess: 'On-site ticket.', estimatedDailyVisitors: '5,000–10,000 (festivals 1L+)' },

  { slug: 'vaktreshwar', number: 37, name: 'Vakreshwar', sanskrit: 'वक्रेश्वर', bodyPart: 'Eyebrow', devi: 'Mahishmardini', bhairava: 'Vakranath', location: 'Vakreshwar, Birbhum', state: 'West Bengal', country: 'India',
    significance: 'Hot sulfur springs (7 named kunds) adjacent to Devi temple. Therapeutic + sacred.', legend: 'Sati\'s eyebrow region (vakra = curved) fell here. Sage Ashtavakra meditated here.',
    signatureRitual: 'Hot kund snan before darshan', darshanTimings: '05:00–13:00, 16:00–21:00 IST',
    bestSeason: 'October–March', howToReach: 'Suri (24 km) → bus.',
    primaryPujas: ['Padya Puja', 'Kund snan ritual', 'Shiva-Devi combined'],
    navratriSpecial: 'Maghi Purnima Mela', modernAccess: 'On-site ticket.', estimatedDailyVisitors: '2,000–4,000' },

  { slug: 'yashor-bangladesh', number: 38, name: 'Yashor (Jessore)', sanskrit: 'यशोर', bodyPart: 'Palms + soles', devi: 'Yashoreshwari', bhairava: 'Chanda', location: 'Ishwaripur, Satkhira', state: 'Khulna', country: 'Bangladesh',
    significance: 'Maintained by local Hindu community. PM Modi visited 2021 — restoration push.', legend: 'Sati\'s palms + soles fell here. King Pratapaditya built original 16th c.',
    signatureRitual: 'Kali Puja', darshanTimings: '06:00–20:00 BD time', bestSeason: 'November–February',
    howToReach: 'Kolkata → Petrapole border → Satkhira (5 hr).',
    primaryPujas: ['Kali Puja', 'Pushpanjali', 'Bhog'],
    navratriSpecial: 'Durga Puja 5 days', modernAccess: 'Bangladesh visa + Hindu Council assistance.', estimatedDailyVisitors: '500–2,000 (Durga Puja 20k+)' },

  { slug: 'nainadevi-prayag-overlap', number: 39, name: 'Prayag (Lalita pair)', sanskrit: 'प्रयाग', bodyPart: 'Finger of hand', devi: 'Lalita', bhairava: 'Bhava', location: 'Sangam, Prayagraj', state: 'Uttar Pradesh', country: 'India',
    significance: 'Triveni Sangam Shakti Peeth — same as Alopi but separate textual identification.', legend: 'Sati\'s right-hand finger fell at Sangam confluence.',
    signatureRitual: 'Triveni snan + Lalita darshan', darshanTimings: '05:00–22:00 IST',
    bestSeason: 'October–March (Magh Mela + Kumbh peak)',
    howToReach: 'Prayagraj junction → cycle-rickshaw to Sangam.',
    primaryPujas: ['Triveni Snan', 'Pind Daan', 'Akshayavata darshan combined'],
    navratriSpecial: 'Both Navratris + Kumbh Mela',
    modernAccess: 'On-site only.', estimatedDailyVisitors: '15,000–30,000 (Kumbh 1Cr+)' },

  { slug: 'godavari-tir', number: 40, name: 'Godavari Tir (Kotilingeswara)', sanskrit: 'गोदावरी तीर', bodyPart: 'Left cheek', devi: 'Vishweshwari', bhairava: 'Dandapani', location: 'Kotipalli, East Godavari', state: 'Andhra Pradesh', country: 'India',
    significance: 'Pind Daan tirth on Godavari banks — equivalent to Gaya. 1 crore (koti) lingams legend.', legend: 'Sati\'s left cheek fell at Godavari Triveni Sangam.',
    signatureRitual: 'Pind Daan + Kotilingeswara abhishek', darshanTimings: '05:00–12:00, 16:00–21:00 IST',
    bestSeason: 'October–March',
    howToReach: 'Kakinada (60 km) → bus to Kotipalli.',
    primaryPujas: ['Pind Daan', 'Godavari snan', 'Koti Linga abhishek'],
    navratriSpecial: 'Mahalaya Amavasya peak for ancestor rites', modernAccess: 'On-site only.', estimatedDailyVisitors: '2,000–5,000 (Mahalaya 50k+)' },

  { slug: 'shivaharkaray-pakistan', number: 41, name: 'Shivaharkaray (Karachi)', sanskrit: 'शिवहरकराय', bodyPart: 'Eyes', devi: 'Mahishmardini', bhairava: 'Krodhish', location: 'Karachi (Parkai station area)', state: 'Sindh', country: 'Pakistan',
    significance: 'Karachi Shakti Peeth — Pakistan Hindu community shrine.', legend: 'Sati\'s eyes per Sindh tradition. "Shivaharkaray" = Shiva-bearer.',
    signatureRitual: 'Local Hindu Sindhi rituals', darshanTimings: 'Daylight',
    bestSeason: 'November–February',
    howToReach: 'Karachi airport → Hindu Council coordination required.',
    primaryPujas: ['Pushpanjali', 'Aarti'],
    navratriSpecial: 'Sindhi Cheti Chand + Navratri', modernAccess: 'Pakistan Hindu Council visit only.', estimatedDailyVisitors: '200–500' },

  { slug: 'attahas', number: 42, name: 'Attahas', sanskrit: 'अट्टहास', bodyPart: 'Lower lip', devi: 'Phullara', bhairava: 'Vishwesh', location: 'Dakshin Dihi (Labhpur), Birbhum', state: 'West Bengal', country: 'India',
    significance: 'Phullara Devi temple. Famous for shamshan-sadhana (cremation-ground meditation).', legend: 'Sati\'s lower lip fell here. Attahas = loud laugh — Shiva\'s grief-laugh erupted here.',
    signatureRitual: 'Bhog at midnight', darshanTimings: '05:00–22:00 IST',
    bestSeason: 'October–March', howToReach: 'Labhpur station (5 km) → walk.',
    primaryPujas: ['Padya Puja', 'Shamshan Tantra (for initiated)', 'Bhog'],
    navratriSpecial: 'Maa Phullara Puja 9 days', modernAccess: 'On-site only.', estimatedDailyVisitors: '1,500–3,500' },

  { slug: 'nandipur', number: 43, name: 'Nandipur', sanskrit: 'नन्दीपुर', bodyPart: 'Necklace', devi: 'Nandini', bhairava: 'Nandikeshwar', location: 'Nandipur, Birbhum', state: 'West Bengal', country: 'India',
    significance: 'Where Sati\'s necklace (haar) fell. Small village shrine maintained by trust.', legend: 'Necklace = vow-symbol of married women — Devi blesses suhag.',
    signatureRitual: 'Bhog at noon', darshanTimings: '05:00–13:00, 16:00–20:00 IST',
    bestSeason: 'October–March', howToReach: 'Sainthia (15 km) → bus.',
    primaryPujas: ['Padya Puja', 'Bhog', 'Married-women vow ritual'],
    navratriSpecial: 'Sarat Navratri', modernAccess: 'No portal.', estimatedDailyVisitors: '500–1,500' },

  { slug: 'manas-tibet', number: 44, name: 'Manas (Manasa Devi Kailash)', sanskrit: 'मानस', bodyPart: 'Right palm', devi: 'Dakshayani (Manas Devi)', bhairava: 'Amar', location: 'Manasarovar lake area, near Kailash', state: 'Tibet Autonomous Region', country: 'Tibet',
    significance: 'Some traditions distinguish Manas from Dakshayani — 2 separate Tibetan Shakti Peeths near Kailash.', legend: 'Sati\'s right palm fell at Manas lake banks.',
    signatureRitual: 'Manasarovar parikrama', darshanTimings: 'Sunrise to sunset (yatra May-Sept)',
    bestSeason: 'May–September only',
    howToReach: 'Via Kailash Manasarovar yatra route (MEA registration).',
    primaryPujas: ['Lake snan', 'Parikrama', 'Combined Kailash darshan'],
    navratriSpecial: 'No fixed schedule — yatris stop here in May-September', modernAccess: 'MEA application only.', estimatedDailyVisitors: '50–200 in season' },

  { slug: 'kanyakashram', number: 45, name: 'Kanyakashram (Kanyakumari)', sanskrit: 'कन्याकुमारी', bodyPart: 'Back', devi: 'Kanyakumari (Bhagavathy Amman)', bhairava: 'Nimishan', location: 'Kanyakumari southernmost India', state: 'Tamil Nadu', country: 'India',
    significance: 'Confluence of 3 oceans (Bay of Bengal + Arabian Sea + Indian Ocean). Devi as virgin princess waiting for Shiva.', legend: 'Sati\'s back per Devi Bhagavata. Devi did penance for Shiva — diamond nose-ring visible from sea.',
    signatureRitual: 'Sunrise + sunset darshan from sea-rocks', darshanTimings: '04:30–12:30, 16:30–20:30 IST',
    bestSeason: 'November–February',
    howToReach: 'Trivandrum (85 km) airport / Nagercoil (20 km) railway.',
    primaryPujas: ['Padya Puja', 'Diamond nose-ring darshan', 'Sea-rock pradakshina'],
    navratriSpecial: 'Navratri 9 days — Devi pulled through streets in chariot', modernAccess: 'On-site VIP ticket.', estimatedDailyVisitors: '12,000–20,000' },

  { slug: 'bahula', number: 46, name: 'Bahula (Ketugram)', sanskrit: 'बाहुला', bodyPart: 'Left arm', devi: 'Bahula', bhairava: 'Bhiruk', location: 'Ketugram, Burdwan', state: 'West Bengal', country: 'India',
    significance: 'Sati\'s left arm (bahula) fell here. River Ajay-side shrine.', legend: 'Bahula = "abundance" — goddess of grain harvest.',
    signatureRitual: 'Annakut (harvest offering)', darshanTimings: '05:00–13:00, 16:00–21:00 IST',
    bestSeason: 'October–March', howToReach: 'Katwa station (40 km) → bus.',
    primaryPujas: ['Padya Puja', 'Annakut Bhog', 'Pushpanjali'],
    navratriSpecial: 'Sarat Navratri', modernAccess: 'No portal.', estimatedDailyVisitors: '1,000–2,000' },

  { slug: 'ujjaini-mp-overlap', number: 47, name: 'Ujjaini (Avanti pair)', sanskrit: 'उज्जयिनी', bodyPart: 'Elbow', devi: 'Mangal Chandika', bhairava: 'Kapilambar', location: 'Ujjain (separate from Harsiddhi)', state: 'Madhya Pradesh', country: 'India',
    significance: 'Ujjain hosts 3 Shakti Peeth identifications — Avanti (Bhairavparvat), Harsiddhi, + this Ujjaini.', legend: 'Sati\'s elbow per varying texts.',
    signatureRitual: 'Combined Ujjain pithh yatra', darshanTimings: '05:00–22:00 IST',
    bestSeason: 'October–March', howToReach: 'Ujjain old city.',
    primaryPujas: ['Combined Ujjain yatra'],
    navratriSpecial: 'Both Navratris', modernAccess: 'On-site.', estimatedDailyVisitors: '2,000–5,000' },

  { slug: 'jeshoreshwari-bangladesh', number: 48, name: 'Jeshoreshwari (Bangladesh)', sanskrit: 'जेशोरेश्वरी', bodyPart: 'Palm', devi: 'Jeshoreshwari (Kali)', bhairava: 'Chanda', location: 'Ishwaripur, Khulna', state: 'Khulna', country: 'Bangladesh',
    significance: 'Same as Yashor — alternate identification or paired site.', legend: 'Sati\'s palm fell here.',
    signatureRitual: 'Kali Puja', darshanTimings: 'Daylight', bestSeason: 'November–February',
    howToReach: 'Bangladesh visa + Hindu Council.',
    primaryPujas: ['Kali Puja', 'Bhog'],
    navratriSpecial: 'Durga Puja', modernAccess: 'Visa coordination.', estimatedDailyVisitors: '500–2,000' },

  { slug: 'bhabanipur-bangladesh', number: 49, name: 'Bhabanipur (Sherpur)', sanskrit: 'भवानीपुर', bodyPart: 'Left rib', devi: 'Aparna (Bhavani)', bhairava: 'Vamana', location: 'Sherpur, Bogra', state: 'Rajshahi', country: 'Bangladesh',
    significance: 'Bangladesh\'s premier Shakti Peeth. Goddess fast-observance shrine.', legend: 'Sati\'s left rib (vaam-paarshva) fell here.',
    signatureRitual: 'Aparna vrata observance', darshanTimings: '06:00–20:00 BD time',
    bestSeason: 'November–February',
    howToReach: 'Bangladesh visa + Bogra route.', primaryPujas: ['Aparna Puja', 'Bhog'],
    navratriSpecial: 'Durga Puja peak', modernAccess: 'Visa + Hindu Council.', estimatedDailyVisitors: '300–1,000' },

  { slug: 'kapalini-bangladesh', number: 50, name: 'Kapalini (Bhuvaneshwari)', sanskrit: 'कापालिनी', bodyPart: 'Bones (kapal)', devi: 'Kapalini (Bhuvaneshwari)', bhairava: 'Sarbananda', location: 'Comilla / Vikrampur (debated)', state: 'Chittagong', country: 'Bangladesh',
    significance: 'Sati\'s bones fell here. Tantric Mahavidya — Bhuvaneshwari = "ruler of the universe".', legend: 'Bones (kapal) — kapali = skull-holder = Tantric form.',
    signatureRitual: 'Tantric Bhuvaneshwari Puja', darshanTimings: 'Daylight',
    bestSeason: 'November–February', howToReach: 'Bangladesh visa.',
    primaryPujas: ['Bhuvaneshwari Yantra Puja', 'Bhog'],
    navratriSpecial: 'Durga Puja', modernAccess: 'Visa.', estimatedDailyVisitors: 'Few hundred' },

  { slug: 'indrakshi-sri-lanka', number: 51, name: 'Indrakshi (Trincomalee)', sanskrit: 'इन्द्राक्षी', bodyPart: 'Anklet', devi: 'Indrakshi', bhairava: 'Rakshasaeshwar', location: 'Trincomalee (Konesvaram)', state: 'Eastern Province', country: 'Sri Lanka',
    significance: 'Sati\'s anklet (nupura) fell here. Adjacent to ancient Koneswaram Shiva temple — Tamil Saiva pilgrimage.', legend: 'Indra installed image after worshipping. Hence "Indrakshi" = "Indra-eyed".',
    signatureRitual: 'Maha Shivratri at adjacent Konesvaram + Indrakshi combined', darshanTimings: '06:00–13:00, 16:00–20:00 SLT',
    bestSeason: 'November–April',
    howToReach: 'Trincomalee (270 km from Colombo) via train/bus. Sri Lanka visa-on-arrival.',
    primaryPujas: ['Padya Puja', 'Indrakshi Shloka recitation', 'Koneswaram combined yatra'],
    navratriSpecial: 'Maha Shivratri + Skanda Sashti peak', modernAccess: 'Sri Lanka eta visa.', estimatedDailyVisitors: '1,000–3,000 (festivals 20k+)' },
];

export const getShaktiPeethBySlug = (slug: string): ShaktiPeeth | undefined =>
  SHAKTI_PEETHS.find((s) => s.slug === slug);

export const SHAKTI_PEETH_SLUGS: string[] = SHAKTI_PEETHS.map((s) => s.slug);
