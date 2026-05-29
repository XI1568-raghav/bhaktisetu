export interface PanchaBhootaTemple {
  slug: string;
  number: number;
  element: string;
  elementSanskrit: string;
  templeName: string;
  templeSanskrit: string;
  presidingDeity: string;
  consort: string;
  city: string;
  state: string;
  lingaForm: string;
  sthalaVriksha: string;
  theertham: string;
  signatureRitual: string;
  majorFestival: string;
  whyThisElement: string;
  significance: string;
  mantra: string;
  mantraEnglish: string;
  bestSeason: string;
  nearestAirport: string;
  associatedSaint: string;
}

export const PANCHA_BHOOTA: PanchaBhootaTemple[] = [
  {
    slug: 'ekambareshwarar-kanchipuram',
    number: 1,
    element: 'Earth (Prithvi)',
    elementSanskrit: 'पृथ्वी',
    templeName: 'Ekambareshwarar Temple',
    templeSanskrit: 'एकाम्बरेश्वर मन्दिर',
    presidingDeity: 'Shiva as Ekambareshwarar (Prithvi Lingam)',
    consort: 'Kamakshi (separate Kamakshi Amman Temple nearby)',
    city: 'Kanchipuram',
    state: 'Tamil Nadu',
    lingaForm: 'Prithvi Lingam — made of sand (swayambhu), never bathed in water; sandalwood paste applied daily',
    sthalaVriksha: 'Mango tree — 3,500-year-old single tree said to bear 4 different mango varieties on 4 branches (one per Veda)',
    theertham: 'Sivaganga Theertham (within temple), Kampa river',
    signatureRitual: 'Sandalwood-paste abhishekam (no water — earth element preserved). Pradosham worship most powerful here.',
    majorFestival: 'Panguni Brahmotsavam (March-April, 10 days), Maha Shivaratri',
    whyThisElement: 'Parvati is said to have moulded a lingam from sand on the riverbank to worship Shiva. When floods threatened it, she embraced the lingam to protect it — the imprint of her bangles and breasts is still visible. The lingam being sand makes this the Earth Sthalam.',
    significance: 'One of 275 Paadal Petra Sthalams sung by the Nayanar saints. Largest of the Pancha Bhoota Stalas — 23 acres, 1,000-pillar mandapam, 59m raja gopuram.',
    mantra: 'ॐ नमः शिवाय एकाम्बरेश्वराय',
    mantraEnglish: 'Om Namah Shivaya Ekambareshwaraya',
    bestSeason: 'November – February (dry, cool)',
    nearestAirport: 'Chennai (75 km)',
    associatedSaint: 'Appar, Sundarar, Sambandar (all three Nayanars sang of this temple)',
  },
  {
    slug: 'jambukeshwarar-thiruvanaikaval',
    number: 2,
    element: 'Water (Apas / Jala)',
    elementSanskrit: 'आपः / जल',
    templeName: 'Jambukeshwarar Temple, Thiruvanaikaval',
    templeSanskrit: 'जम्बुकेश्वर मन्दिर',
    presidingDeity: 'Shiva as Jambukeshwarar (Appu Lingam)',
    consort: 'Akilandeshwari (Akhilandeshwari)',
    city: 'Thiruvanaikaval (Srirangam suburb), Tiruchirappalli',
    state: 'Tamil Nadu',
    lingaForm: 'Appu Lingam — underground spring perpetually wets the lingam from below; sanctum partially flooded throughout the year',
    sthalaVriksha: 'Jamun (Jambu) tree — gave the temple its name (a spider and an elephant worshipped Shiva at this tree)',
    theertham: 'Cauvery river, Akhanda Cauvery within temple',
    signatureRitual: 'Madhyahna puja — noon-time priest dressed as a woman (representing Parvati) performs go-puja (cow worship) + lingam abhishekam',
    majorFestival: 'Panguni Brahmotsavam, Pankuni Uthiram (Akhilandeshwari Tirumanjanam)',
    whyThisElement: 'The lingam is constantly wet from a natural underground spring — water visibly oozes from beneath the lingam year-round, even in peak summer. The Cauvery flows beside the temple. Water element personified.',
    significance: 'One of Pancha Sabhai of Shiva (here, Akilandeshwari learned Shiva-knowledge from Adi Shankara who installed her Sri Chakra earrings to calm her fierce form). 5 prakaras, vibhuti prasadam famous.',
    mantra: 'ॐ नमः शिवाय जम्बुकेश्वराय',
    mantraEnglish: 'Om Namah Shivaya Jambukeshwaraya',
    bestSeason: 'October – March',
    nearestAirport: 'Tiruchirappalli (15 km)',
    associatedSaint: 'Adi Shankaracharya (installed Sri Chakra at Akilandeshwari shrine), Appar, Sambandar',
  },
  {
    slug: 'arunachaleshwar-thiruvannamalai',
    number: 3,
    element: 'Fire (Agni / Tejas)',
    elementSanskrit: 'अग्नि / तेजस्',
    templeName: 'Arunachaleshwar Temple, Thiruvannamalai',
    templeSanskrit: 'अरुणाचलेश्वर मन्दिर',
    presidingDeity: 'Shiva as Arunachaleshwar (Agni Lingam)',
    consort: 'Unnamulai Amman (Apita Kuchambal)',
    city: 'Thiruvannamalai',
    state: 'Tamil Nadu',
    lingaForm: 'Agni Lingam — the entire Arunachala hill itself is the lingam (swayambhu)',
    sthalaVriksha: 'Magizham tree (Mimusops elengi)',
    theertham: 'Brahma Theertham, Indra Theertham, plus 5 other major theerthams around the hill',
    signatureRitual: 'Girivalam — barefoot pradakshina of the 14 km Arunachala hill on every full moon night (1 lakh+ pilgrims). Karthikai Deepam — massive flame lit atop the hill seen for 35 km.',
    majorFestival: 'Karthikai Deepam (Nov-Dec, Krittika nakshatra of Karthika month), Maha Shivaratri, Pankuni Uthiram',
    whyThisElement: 'Brahma and Vishnu argued over supremacy; Shiva appeared as a pillar of infinite fire (Linga Purana). Vishnu went down as Varaha, Brahma flew up as a swan — neither could find the ends. Shiva manifested as Arunachala hill. The hill is the cosmic fire-lingam.',
    significance: 'Ramana Maharshi spent 54 years at this hill (1896-1950). Karthikai Deepam attracts 3 million+ pilgrims annually. Arunachala considered the most spiritually powerful hill in South India per Skanda Purana.',
    mantra: 'ॐ अरुणाचलाय नमः',
    mantraEnglish: 'Om Arunachalaya Namah',
    bestSeason: 'November – February (Karthikai Deepam in Nov-Dec is peak)',
    nearestAirport: 'Chennai (185 km) / Bengaluru (215 km)',
    associatedSaint: 'Ramana Maharshi, Seshadri Swamigal, all four Nayanmars sang of it',
  },
  {
    slug: 'srikalahasti',
    number: 4,
    element: 'Air (Vayu)',
    elementSanskrit: 'वायु',
    templeName: 'Srikalahasti Temple',
    templeSanskrit: 'श्रीकालहस्ती मन्दिर',
    presidingDeity: 'Shiva as Kalahasteeshwarar (Vayu Lingam)',
    consort: 'Gnana Prasoonambika',
    city: 'Srikalahasti',
    state: 'Andhra Pradesh',
    lingaForm: 'Vayu Lingam — flickers as if blown by wind even in a closed sanctum; oil lamps inside flicker constantly though no draft',
    sthalaVriksha: 'Bilva (Aegle marmelos)',
    theertham: 'Swarnamukhi river (flows north — uttara-vahini, rare and auspicious)',
    signatureRitual: 'Rahu-Ketu sarpa dosha nivarana puja — most famous in South India; pilgrims travel here for snake-planet remedy. Conducted continuously in 4 daily slots.',
    majorFestival: 'Maha Shivaratri (10-day Brahmotsavam), Kanu Pongal',
    whyThisElement: 'The deepa (oil lamp) in the closed inner sanctum flickers as if blown by wind year-round — proof of Vayu element. Devotees can see the lingam slightly shake. Name derives from Sri (spider), Kala (serpent), Hasti (elephant) — three devotees who worshipped here and attained moksha.',
    significance: 'Most powerful Rahu-Ketu dosha nivarana temple in India. Lingam never touched by human hand — abhishekam done from above via brass pipe. Kannappa Nayanar — hunter devotee — attained moksha here.',
    mantra: 'ॐ नमः शिवाय कालहस्तीश्वराय',
    mantraEnglish: 'Om Namah Shivaya Kalahasteeshwaraya',
    bestSeason: 'October – March',
    nearestAirport: 'Tirupati (36 km) / Chennai (115 km)',
    associatedSaint: 'Kannappa Nayanar, Nakkeera (composed Tirumurugatrupadai here)',
  },
  {
    slug: 'nataraja-chidambaram',
    number: 5,
    element: 'Ether / Space (Akasha)',
    elementSanskrit: 'आकाश',
    templeName: 'Nataraja Temple, Chidambaram',
    templeSanskrit: 'नटराज मन्दिर चिदम्बरम्',
    presidingDeity: 'Shiva as Nataraja (Akasha Lingam) — also called Chidambara Rahasyam',
    consort: 'Shivakami Amman',
    city: 'Chidambaram',
    state: 'Tamil Nadu',
    lingaForm: 'Akasha Lingam — formless empty space (Chidambara Rahasyam, the "secret of Chidambaram"). A bilva garland in front of empty space inside the inner sanctum represents Shiva.',
    sthalaVriksha: 'Thillai tree (Excoecaria agallocha) — gave the temple its old name Thillai Ambalam',
    theertham: 'Shivaganga Theertham, Paramanada Koobam',
    signatureRitual: 'Nataraja darshan during 6-times-daily puja. The "Chidambara Rahasyam" curtain is parted to reveal — nothing — the formless Akasha-Shiva. Strings of golden bilva leaves swing in the empty space.',
    majorFestival: 'Margazhi Tiruvadirai (Dec-Jan, 10 days), Aani Tirumanjanam (Jun-Jul), Maha Shivaratri',
    whyThisElement: 'No lingam — only empty space, demonstrating that the highest truth (param Brahma) is formless ether. Shiva\'s Ananda Tandava (cosmic dance of bliss) was performed here for sage Patanjali and Vyaghrapada.',
    significance: 'Of all Pancha Bhoota Stalams, this is the philosophical peak — represents the formless absolute. Patanjali (the Yoga Sutras author) is said to have witnessed Shiva\'s cosmic dance here. Gold-roofed Chit Sabha (consciousness hall). Bharatanatyam karanas (108 dance postures) carved on temple walls.',
    mantra: 'ॐ नटराजाय नमः',
    mantraEnglish: 'Om Natarajaya Namah',
    bestSeason: 'November – February',
    nearestAirport: 'Tiruchirappalli (170 km) / Pondicherry (60 km)',
    associatedSaint: 'Patanjali, Vyaghrapada, Manikkavacakar (composed Tiruvasagam here)',
  },
];

export const PANCHA_BHOOTA_SLUGS = PANCHA_BHOOTA.map((p) => p.slug);

export function getPanchaBhootaBySlug(slug: string): PanchaBhootaTemple | undefined {
  return PANCHA_BHOOTA.find((p) => p.slug === slug);
}
