// Hindu festival calendar — drives /festival/[slug] programmatic-SEO pages.
// Date approximations for 2026 (lunar calendar — exact tithis vary).
// Used both for landing pages and for the founder-tweet-draft agent calendar.

export interface FestivalInfo {
  slug: string;
  name: string;
  sanskrit: string;
  date2026: string; // ISO yyyy-mm-dd, approximate
  deity: string;
  deitySlug?: string; // links to /deity/[slug] when canonical match
  description: string;
  rituals: string[];
  pujasAvailable: string[]; // slug references — used to link to /pujas/[slug]
  fastingType: 'full' | 'partial' | 'none';
  significance: string;
}

export const FESTIVALS: FestivalInfo[] = [
  {
    slug: 'maha-shivratri',
    name: 'Maha Shivratri',
    sanskrit: 'महाशिवरात्रि',
    date2026: '2026-02-15',
    deity: 'Lord Shiva',
    deitySlug: 'shiva',
    description:
      'The Great Night of Shiva — observed on the 14th night of Phalguna Krishna Paksha. Devotees fast, perform Rudrabhishek, and chant ॐ नमः शिवाय through the night across four prahars.',
    rituals: [
      'Bilva patra offering',
      'Milk + honey + curd + ghee abhishek',
      'All-night jagran with mantra chanting',
      'Rudrabhishek puja',
      'Reading of Shiva Purana',
    ],
    pujasAvailable: ['rudrabhishek', 'maha-mrityunjaya'],
    fastingType: 'full',
    significance:
      'Marks the night Shiva performed the Tandava and married Parvati. Believed to absolve sins and grant moksha when observed with sincerity.',
  },
  {
    slug: 'holi',
    name: 'Holi',
    sanskrit: 'होली',
    date2026: '2026-03-04',
    deity: 'Krishna / Radha',
    deitySlug: 'krishna',
    description:
      'Festival of colours marking the triumph of good over evil and the arrival of spring. Holika Dahan on the eve, Rangwali Holi the day after.',
    rituals: [
      'Holika Dahan bonfire (eve)',
      'Color play with family + community',
      'Krishna-Radha temple visits',
      'Sweets distribution (gujiya, malpua)',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'Commemorates Prahlad rescue from Holika and the eternal love of Radha-Krishna. Symbolizes burning of ego and embracing universal brotherhood.',
  },
  {
    slug: 'ram-navami',
    name: 'Ram Navami',
    sanskrit: 'राम नवमी',
    date2026: '2026-03-27',
    deity: 'Lord Rama',
    deitySlug: 'rama',
    description:
      'Birth anniversary of Lord Rama — the seventh avatar of Vishnu. Observed on the 9th day of Chaitra Shukla Paksha with fasting, Ramayana recital, and bhajan kirtans.',
    rituals: [
      'Akhanda Ramayana path',
      'Fasting until noon (Ram\'s birth time)',
      'Bhajan kirtan at Ram mandirs',
      'Distribution of panakam (jaggery drink)',
    ],
    pujasAvailable: ['sundarkand-path', 'ramayana-path'],
    fastingType: 'partial',
    significance:
      'Birth of Maryada Purushottam Rama in Ayodhya. Especially significant after the 2024 Ram Mandir consecration.',
  },
  {
    slug: 'hanuman-jayanti',
    name: 'Hanuman Jayanti',
    sanskrit: 'हनुमान जयन्ती',
    date2026: '2026-04-12',
    deity: 'Lord Hanuman',
    deitySlug: 'hanuman',
    description:
      'Birth celebration of Hanuman ji. Observed on full moon of Chaitra. Devotees recite Hanuman Chalisa 108 times, offer sindoor and chola.',
    rituals: [
      'Sundarkand path',
      'Hanuman Chalisa 108 paath',
      'Sindoor + chola offering',
      'Boondi laddoo prasad',
    ],
    pujasAvailable: ['sundarkand-path', 'mangal-dosh'],
    fastingType: 'partial',
    significance:
      'Birth of the eternal devotee of Rama. Removes Shani and Mangal doshas, grants courage and strength.',
  },
  {
    slug: 'guru-purnima',
    name: 'Guru Purnima',
    sanskrit: 'गुरु पूर्णिमा',
    date2026: '2026-07-19',
    deity: 'Vyasa / Guru',
    description:
      'Honoring spiritual and academic teachers. Falls on the full moon of Ashadha. Marks the day Veda Vyasa was born and the day Buddha gave his first sermon.',
    rituals: [
      'Guru pujan with flowers + dakshina',
      'Recitation of Guru Stotra',
      'Visit to ashrams + math',
      'Vyasa puja',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'partial',
    significance:
      'Marks the unbroken guru-shishya parampara. Sadhakas formally accept gurus on this day.',
  },
  {
    slug: 'krishna-janmashtami',
    name: 'Krishna Janmashtami',
    sanskrit: 'कृष्ण जन्माष्टमी',
    date2026: '2026-09-04',
    deity: 'Lord Krishna',
    deitySlug: 'krishna',
    description:
      'Birth anniversary of Krishna — eighth avatar of Vishnu. Observed on the 8th day of Bhadrapada Krishna Paksha with midnight celebration, fasting, and Dahi Handi tradition.',
    rituals: [
      'Fasting until midnight (Krishna\'s birth)',
      'Bhagavad Gita path',
      'Bal Krishna abhishek with milk + honey',
      'Dahi Handi (Maharashtra)',
      'Midnight aarti at ISKCON mandirs',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'full',
    significance:
      'Krishna\'s birth in Mathura. The Bhagavad Gita giver, embodiment of divine love and leela.',
  },
  {
    slug: 'ganesh-chaturthi',
    name: 'Ganesh Chaturthi',
    sanskrit: 'गणेश चतुर्थी',
    date2026: '2026-09-15',
    deity: 'Lord Ganesha',
    deitySlug: 'ganesha',
    description:
      'Ten-day festival celebrating the arrival of Ganesha in homes and pandals. Begins on Bhadrapada Shukla Chaturthi, ends with Anant Chaturdashi visarjan.',
    rituals: [
      'Pranapratishtha (installation)',
      'Daily morning + evening aarti',
      'Modak + ladoo bhog',
      'Visarjan on day 1, 3, 5, 7, or 10',
    ],
    pujasAvailable: ['ganesh-puja'],
    fastingType: 'partial',
    significance:
      'Removes obstacles. Especially significant in Maharashtra after Lokmanya Tilak\'s revival in 1893.',
  },
  {
    slug: 'navaratri',
    name: 'Sharad Navaratri',
    sanskrit: 'शरद नवरात्रि',
    date2026: '2026-10-12',
    deity: 'Maa Durga',
    deitySlug: 'devi',
    description:
      'Nine nights of Devi worship in autumn. Begins on Ashwin Shukla Pratipada. Each day honors one of the nine forms of Durga (Nava Durga).',
    rituals: [
      'Ghatasthapana on day 1',
      'Daily Durga path',
      'Garba + dandiya raas (Gujarat)',
      'Kanya pujan on day 8/9',
      'Vijaya Dashami on day 10',
    ],
    pujasAvailable: ['durga-puja', 'navaratri-puja'],
    fastingType: 'full',
    significance:
      'Devi\'s victory over Mahishasura. Spiritual sadhana, social celebration, and seasonal transition.',
  },
  {
    slug: 'diwali',
    name: 'Diwali',
    sanskrit: 'दीपावली',
    date2026: '2026-11-08',
    deity: 'Maa Lakshmi',
    deitySlug: 'lakshmi',
    description:
      'Festival of lights — five-day celebration centered on Lakshmi puja. Marks Rama\'s return to Ayodhya and Lakshmi\'s emergence from samudra manthan.',
    rituals: [
      'Dhanteras shopping (gold, utensils)',
      'Lakshmi-Ganesh puja on amavasya night',
      'Diyas + rangoli',
      'Govardhan puja day 4',
      'Bhai dooj day 5',
    ],
    pujasAvailable: ['lakshmi-puja'],
    fastingType: 'none',
    significance:
      'Most important festival for prosperity. New beginnings — businesses open new account books.',
  },
  {
    slug: 'chhath-puja',
    name: 'Chhath Puja',
    sanskrit: 'छठ पूजा',
    date2026: '2026-11-15',
    deity: 'Surya / Chhathi Maiya',
    description:
      'Four-day festival of the Sun god. Most celebrated in Bihar, Jharkhand, eastern UP. Strict 36-hour nirjala fast culminating in arghya at sunrise.',
    rituals: [
      'Nahay Khay (day 1 ritual bath)',
      'Kharna (day 2 evening meal)',
      'Sandhya arghya at sunset (day 3)',
      'Usha arghya at sunrise (day 4)',
    ],
    pujasAvailable: ['surya-puja'],
    fastingType: 'full',
    significance:
      'Thanksgiving to Surya for sustaining life. Considered most physically demanding Hindu vrat.',
  },
  {
    slug: 'makar-sankranti',
    name: 'Makar Sankranti',
    sanskrit: 'मकर संक्रांति',
    date2026: '2026-01-14',
    deity: 'Surya',
    description:
      'Sun\'s transition into Capricorn (Makar Rashi) — first solar festival of the year. Marks end of inauspicious Dakshinayana, beginning of Uttarayana. Kite-flying, sesame sweets (til-gur), Ganga snan.',
    rituals: [
      'Holy dip in Ganga (Prayagraj, Haridwar)',
      'Til-gur ladoo sharing (forgive past disputes)',
      'Donation to brahmins and the poor',
      'Surya Namaskar at sunrise',
    ],
    pujasAvailable: ['surya-puja', 'navgraha-puja'],
    fastingType: 'partial',
    significance:
      'Kumbh Mela snan begins. Bhishma Pitamah chose this day to leave his body. Pongal in Tamil Nadu, Lohri in Punjab same week.',
  },
  {
    slug: 'vasant-panchami',
    name: 'Vasant Panchami',
    sanskrit: 'वसंत पंचमी',
    date2026: '2026-01-23',
    deity: 'Saraswati',
    deitySlug: 'saraswati',
    description:
      'Arrival of spring and birthday of Goddess Saraswati. Students place books at her feet for blessings. Wear yellow. Auspicious for vidyarambham (starting child\'s first lessons).',
    rituals: [
      'Saraswati pujan with white flowers',
      'Place books, pens, instruments at altar',
      'Vidyarambham for young children (write first alphabet)',
      'Wear yellow, eat kesari rice',
    ],
    pujasAvailable: ['saraswati-puja'],
    fastingType: 'none',
    significance:
      'Considered most auspicious day for starting any education or learning. Wedding muhurat without panchang lookup (abujh muhurat).',
  },
  {
    slug: 'maha-kumbh',
    name: 'Maha Kumbh Mela',
    sanskrit: 'महाकुंभ मेला',
    date2026: '2027-01-14',
    deity: 'Various (river deities)',
    description:
      'World\'s largest religious gathering — held every 12 years at Prayagraj, Haridwar, Ujjain, Nashik. Next Maha Kumbh Prayagraj 2027 expected to draw 40+ crore pilgrims over 45 days.',
    rituals: [
      'Shahi Snan on key tithis (Makar Sankranti, Mauni Amavasya, etc)',
      'Naga sadhu darshan',
      'Triveni Sangam dip',
      'Daan to sadhus and brahmins',
    ],
    pujasAvailable: ['ganga-snan-sankalp'],
    fastingType: 'partial',
    significance:
      'Inscribed by UNESCO 2017 as Intangible Cultural Heritage. Single snan at Sangam during Kumbh believed equivalent to a lifetime of merit.',
  },
  {
    slug: 'akshaya-tritiya',
    name: 'Akshaya Tritiya',
    sanskrit: 'अक्षय तृतीया',
    date2026: '2026-04-19',
    deity: 'Vishnu / Lakshmi',
    deitySlug: 'lakshmi',
    description:
      'Day of inexhaustible (akshaya) prosperity. Any new venture, purchase (especially gold), donation made today is believed to multiply. Treta Yuga began on this day.',
    rituals: [
      'Buy gold or silver',
      'Lakshmi-Narayan pujan',
      'Donate water pots, fans, food (summer relief)',
      'Start new business / investment',
    ],
    pujasAvailable: ['lakshmi-puja', 'satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'Char Dham yatra opens (Yamunotri, Gangotri, Kedarnath, Badrinath portals open). Ved Vyasa began dictating Mahabharata. Sudama met Krishna.',
  },
  {
    slug: 'narasimha-jayanti',
    name: 'Narasimha Jayanti',
    sanskrit: 'नृसिंह जयंती',
    date2026: '2026-05-19',
    deity: 'Lord Narasimha',
    deitySlug: 'vishnu',
    description:
      'Appearance day of Narasimha — Vishnu\'s lion-headed avatar who killed Hiranyakashipu to protect devotee Prahlad. Fast from sunrise to sunset, break at dusk.',
    rituals: [
      'Narasimha Kavach path',
      'Sankalpa for protection from enemies',
      'Til mixed with water offered at evening sandhya',
      'Donate red cloth, sweets to brahmins',
    ],
    pujasAvailable: ['narasimha-puja', 'satyanarayan-puja'],
    fastingType: 'full',
    significance:
      'Most powerful protective deity in Vaishnavism. Devotees with bhuta-pishacha doshas and enemy troubles seek refuge in Narasimha mantra.',
  },
  {
    slug: 'jagannath-rath-yatra',
    name: 'Jagannath Rath Yatra',
    sanskrit: 'रथ यात्रा',
    date2026: '2026-07-15',
    deity: 'Lord Jagannath',
    deitySlug: 'krishna',
    description:
      'Annual chariot procession at Puri — only festival where the deity comes out of the temple to meet devotees. Three massive wooden chariots pulled 3 km by lakhs of devotees.',
    rituals: [
      'Snan Yatra (ritual bath) 15 days prior',
      'Pulling the chariot ropes (any caste/creed)',
      'Mahaprasad consumption',
      'Bahuda Yatra (return journey) 9 days later',
    ],
    pujasAvailable: ['jagannath-puja', 'satyanarayan-puja'],
    fastingType: 'partial',
    significance:
      'Touching the rath rope grants liberation. ISKCON has replicated this in 100+ cities globally including London, NYC, Sydney.',
  },
  {
    slug: 'guru-poornima',
    name: 'Guru Poornima',
    sanskrit: 'गुरु पूर्णिमा',
    date2026: '2026-07-29',
    deity: 'Ved Vyasa / Guru',
    description:
      'Honors the guru who removes darkness (gu) and brings light (ru). Marks birthday of Ved Vyasa, compiler of Vedas, Mahabharata. Disciples touch guru\'s feet, offer dakshina.',
    rituals: [
      'Vyasa Puja at home or ashram',
      'Touch guru\'s feet and offer dakshina',
      'Recite Guru Stotram',
      'Chaturmas vrat begins for sadhus',
    ],
    pujasAvailable: ['satyanarayan-puja', 'guru-puja'],
    fastingType: 'partial',
    significance:
      'Buddha gave his first sermon on this day. Shiva became Adi Guru, teaching Saptarishis. Chaturmas (4-month rainy retreat) begins.',
  },
  {
    slug: 'nag-panchami',
    name: 'Nag Panchami',
    sanskrit: 'नाग पंचमी',
    date2026: '2026-08-08',
    deity: 'Sarpa (serpent deities)',
    description:
      'Worship of snake deities (Nag devta). Offer milk and turmeric at snake holes/idols. Believed to ward off snake-bite fears and dispel Kaal Sarp dosh from birth chart.',
    rituals: [
      'Offer milk to snake idol or anthill',
      'Nag stotra path',
      'No cutting/digging/cooking of bhindi (okra) — considered taboo',
      'Donate to snake-charmers or wildlife trusts',
    ],
    pujasAvailable: ['kaal-sarp-dosh', 'navgraha-puja'],
    fastingType: 'partial',
    significance:
      'Primary remedy day for Kaal Sarp dosh. Trimbakeshwar Jyotirlinga in Nashik is most powerful venue for Nag puja.',
  },
  {
    slug: 'raksha-bandhan',
    name: 'Raksha Bandhan',
    sanskrit: 'रक्षाबंधन',
    date2026: '2026-08-19',
    deity: 'None (sibling bond)',
    description:
      'Sister ties rakhi (sacred thread) on brother\'s wrist; brother vows lifelong protection. Diaspora celebration is massive — rakhis posted/couriered globally weeks in advance.',
    rituals: [
      'Aarti and tilak before tying rakhi',
      'Brother gives gift / cash to sister',
      'Family meal with sweet kheer',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'Originated from Indra-Sachi episode in Bhavishya Purana. Krishna-Draupadi rakhi narrative is most-cited example.',
  },
  {
    slug: 'onam',
    name: 'Onam',
    sanskrit: 'ओणम',
    date2026: '2026-08-26',
    deity: 'King Mahabali / Vamana',
    deitySlug: 'vishnu',
    description:
      'Kerala\'s 10-day harvest festival celebrating return of beloved king Mahabali. Floral rangoli (pookalam), 26-dish vegetarian feast (sadhya), snake-boat races, Thiruvonam climax.',
    rituals: [
      'Pookalam (flower carpet) for 10 days',
      'Sadhya feast on Thiruvonam day',
      'Vamana avatar puja',
      'Vallam Kali (snake boat race) participation',
    ],
    pujasAvailable: ['vamana-puja', 'satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'State festival of Kerala — celebrated by Hindus, Christians, Muslims alike. Diaspora Onam in Gulf, US is grand-scale community event.',
  },
  {
    slug: 'pitru-paksha',
    name: 'Pitru Paksha',
    sanskrit: 'पितृ पक्ष',
    date2026: '2026-09-26',
    deity: 'Ancestors (pitru)',
    description:
      '16-day period for ancestor (shraadh) rituals. Tarpan and pind-daan offered daily. Considered inauspicious for new ventures, weddings, purchases. Gaya is the most powerful venue.',
    rituals: [
      'Daily tarpan with til-jal at sunrise',
      'Brahmin bhojan on tithi of departed ancestor',
      'Pind-daan at Gaya (Vishnupad temple)',
      'Crow-feeding (kakabali) on shraadh tithi',
    ],
    pujasAvailable: ['pitru-paksha-shraadh', 'navgraha-puja'],
    fastingType: 'none',
    significance:
      'Three pind-daan at Gaya frees 7 generations of ancestors from pitru rin. Most-booked ritual on devotional platforms during these 16 days.',
  },
  {
    slug: 'dussehra',
    name: 'Dussehra / Vijayadashami',
    sanskrit: 'दशहरा / विजयादशमी',
    date2026: '2026-10-19',
    deity: 'Durga / Rama',
    description:
      'Celebrates Rama\'s victory over Ravana and Durga\'s victory over Mahishasura. Effigies of Ravana, Meghnath, Kumbhakarna burned at sunset. Auspicious for new beginnings (Shastra puja, vidyarambh).',
    rituals: [
      'Ravan Dahan at sunset',
      'Shastra Puja (worship of tools and weapons)',
      'Vidyarambh for children (alphabet writing)',
      'Aparajita puja for victory',
    ],
    pujasAvailable: ['durga-puja', 'shastra-puja', 'satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'Mysore Dussehra and Kullu Dussehra are GI-tagged events. Considered abujh muhurat — any work begun today succeeds.',
  },
  {
    slug: 'karwa-chauth',
    name: 'Karwa Chauth',
    sanskrit: 'करवा चौथ',
    date2026: '2026-11-01',
    deity: 'Shiva / Parvati / Moon',
    description:
      'Wives fast nirjala (no food, no water) from sunrise to moonrise, praying for husband\'s longevity. Moon sighted through a sieve before breaking fast — husband offers first water.',
    rituals: [
      'Sargi consumed before sunrise (gifted by mother-in-law)',
      'Group katha listening with karwa pot',
      'Chand darshan through sieve at moonrise',
      'Husband offers water to break fast',
    ],
    pujasAvailable: ['karwa-chauth-puja', 'satyanarayan-puja'],
    fastingType: 'full',
    significance:
      'Most-observed fast by married Hindu women in North India. Bollywood has cemented its diaspora popularity globally.',
  },
  {
    slug: 'dhanteras',
    name: 'Dhanteras',
    sanskrit: 'धनतेरस',
    date2026: '2026-11-06',
    deity: 'Dhanvantari / Lakshmi / Kubera',
    deitySlug: 'lakshmi',
    description:
      'First day of Diwali week. Worship of Dhanvantari (god of Ayurveda) and Lakshmi. Buying gold, silver, utensils, brooms today believed to multiply wealth 13-fold.',
    rituals: [
      'Buy gold, silver, or new utensil',
      'Yamadeepdan (oil lamp facing south) at sunset',
      'Lakshmi-Kubera pujan in evening',
      'Aushadhi (medicine) puja for health',
    ],
    pujasAvailable: ['lakshmi-puja', 'kubera-puja'],
    fastingType: 'none',
    significance:
      'India\'s peak retail day — single largest day of gold sales nationally. Auspicious abujh muhurat.',
  },
  {
    slug: 'govardhan-puja',
    name: 'Govardhan Puja',
    sanskrit: 'गोवर्धन पूजा',
    date2026: '2026-11-09',
    deity: 'Krishna / Govardhan',
    deitySlug: 'krishna',
    description:
      'Annakut — day after Diwali. Commemorates Krishna lifting Govardhan hill to shelter Vrindavan from Indra\'s wrath. 56-item bhog (chappan bhog) offered to Krishna; cow worship central.',
    rituals: [
      'Govardhan hill replica in cow-dung at home',
      'Chappan bhog (56-item offering) preparation',
      'Cow puja with kumkum, garlands, jaggery',
      'Parikrama of Govardhan replica',
    ],
    pujasAvailable: ['krishna-puja', 'go-puja'],
    fastingType: 'none',
    significance:
      'Vrindavan Govardhan parikrama (21 km) draws 5 lakh devotees. ISKCON Govardhan Puja serves chappan bhog at 100+ temples globally.',
  },
  {
    slug: 'bhai-dooj',
    name: 'Bhai Dooj',
    sanskrit: 'भाई दूज',
    date2026: '2026-11-10',
    deity: 'Yama / Yamuna (sibling bond)',
    description:
      'Sister applies tilak on brother\'s forehead and prays for his long life. Originates from Yama-Yamuna myth. Brother gives gifts. Marks the close of Diwali week.',
    rituals: [
      'Sister applies tilak with kumkum + akshat',
      'Aarti and sweets',
      'Brother gives money or gift',
      'Yamraj puja by women in some regions',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'Yama visited his sister Yamuna; she fed him sweets — he blessed: any brother who visits sister today gains long life.',
  },
  {
    slug: 'tulsi-vivah',
    name: 'Tulsi Vivah',
    sanskrit: 'तुलसी विवाह',
    date2026: '2026-11-21',
    deity: 'Tulsi / Vishnu (Shaligram)',
    deitySlug: 'vishnu',
    description:
      'Ceremonial wedding of Tulsi (basil plant) to Shaligram (Vishnu). Marks end of Chaturmas — wedding season can resume. Full Hindu wedding rituals performed for the plant.',
    rituals: [
      'Mandap around tulsi pot',
      'Shaligram brought as groom',
      'Phera (circumambulation) with mantras',
      'Bhog of sugarcane, amla, til',
    ],
    pujasAvailable: ['tulsi-puja', 'satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'End of Chaturmas — auspicious functions, weddings resume. Tulsi-Shaligram marriage equivalent to performing daughter\'s kanyadaan (great punya).',
  },
  {
    slug: 'kartik-purnima',
    name: 'Kartik Purnima',
    sanskrit: 'कार्तिक पूर्णिमा',
    date2026: '2026-11-24',
    deity: 'Shiva / Vishnu / Kartikeya',
    description:
      'Full moon of Kartik month. Dev Diwali — gods descend to bathe in Ganga at Varanasi. Lakhs of diyas lit on ghats. Shiva killed Tripurasura — also called Tripuri Purnima.',
    rituals: [
      'Ganga snan at Varanasi, Haridwar, Prayagraj',
      'Light 365 diyas (one per day of year)',
      'Tulsi puja and parikrama',
      'Annadaan and brahmin bhojan',
    ],
    pujasAvailable: ['ganga-snan-sankalp', 'satyanarayan-puja'],
    fastingType: 'partial',
    significance:
      'Dev Diwali at Varanasi is one of most photographed religious events globally. Sikh community marks Guru Nanak Jayanti same day.',
  },
  {
    slug: 'vivah-panchami',
    name: 'Vivah Panchami',
    sanskrit: 'विवाह पंचमी',
    date2026: '2026-11-24',
    deity: 'Rama / Sita',
    deitySlug: 'rama',
    description:
      'Wedding anniversary of Lord Rama and Sita. Massive celebrations at Janakpur (Nepal) and Ayodhya. Marriage of unmarried devotees gets a divine boost when done on or near this day.',
    rituals: [
      'Ram-Sita vivah katha recitation',
      'Sundarkand path',
      'Tilak ceremony reenactment',
      'Annadan in Rama-Sita\'s name',
    ],
    pujasAvailable: ['sundarkand-path', 'satyanarayan-puja'],
    fastingType: 'partial',
    significance:
      'Considered most auspicious day for fixing wedding date / engagement. Avoided as actual wedding day in some regions (separation theme).',
  },
  {
    slug: 'mokshada-ekadashi',
    name: 'Mokshada Ekadashi (Gita Jayanti)',
    sanskrit: 'मोक्षदा एकादशी',
    date2026: '2026-12-19',
    deity: 'Krishna',
    deitySlug: 'krishna',
    description:
      'Krishna delivered the Bhagavad Gita to Arjuna on the Kurukshetra battlefield on this day. Recitation of Gita today liberates ancestors (mokshada = bestower of moksha).',
    rituals: [
      'Full Bhagavad Gita parayan (18 chapters)',
      'Ekadashi nirjala vrat',
      'Donate Gita copies to devotees',
      'Tarpan in name of departed ancestors',
    ],
    pujasAvailable: ['gita-path', 'satyanarayan-puja'],
    fastingType: 'full',
    significance:
      'Most powerful Ekadashi for ancestor liberation. ISKCON Gita Daan campaign distributes lakhs of free Gitas globally on this day.',
  },
  {
    slug: 'gudi-padwa',
    name: 'Gudi Padwa',
    sanskrit: 'गुडी पाडवा',
    date2026: '2026-03-19',
    deity: 'Brahma / Rama',
    description:
      'Maharashtrian and Konkani New Year on Chaitra Shukla Pratipada. Households hoist the gudi (bamboo pole with silk cloth, neem-mango leaves, sugar garland, inverted copper kalash) at the entrance at sunrise as a victory standard. Marks Brahma\'s creation of the universe, Shalivahana\'s defeat of the Shakas, and Rama\'s return to Ayodhya.',
    rituals: [
      'Abhyang snan (oil bath before sunrise)',
      'Gudi hoisting on the right side of the main door',
      'Rangoli + mango toran at the threshold',
      'Panchang shravan (annual almanac reading) at temples',
      'Neem-jaggery prasad (bevu-bella) to balance bitter and sweet',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'Marks the first day of the lunisolar Hindu calendar in Maharashtra, Goa, and Konkan. The hoisted gudi symbolises Brahma\'s creative flag and Shivaji Maharaj\'s military victories. New ventures, gold purchases, and Griha Pravesh are considered auto-auspicious without separate muhurat lookup.',
  },
  {
    slug: 'ugadi',
    name: 'Ugadi',
    sanskrit: 'युगादि',
    date2026: '2026-03-19',
    deity: 'Brahma',
    description:
      'Telugu and Kannada New Year on Chaitra Shukla Pratipada (yuga + adi = beginning of a new age). Karnataka and Andhra-Telangana households prepare Ugadi Pachadi, a six-taste chutney mixing neem flowers, raw mango, jaggery, tamarind, salt, and green chilli — symbolising that the new year will hold sorrow, surprise, joy, disgust, fear, and anger in equal measure.',
    rituals: [
      'Pre-dawn oil bath and new clothes',
      'Mango-leaf toran on doorways',
      'Ugadi Pachadi shared before the first meal',
      'Panchanga Shravanam at temple or by elders',
      'Reading of the year\'s rashi-phala (zodiac forecast)',
    ],
    pujasAvailable: ['satyanarayan-puja', 'navagraha-shanti'],
    fastingType: 'none',
    significance:
      'Believed to be the day Brahma began creation. The six-taste pachadi is a uniquely Hindu acceptance-of-duality teaching — life is a balanced compound, not a single flavour. Panchanga Shravanam on this day sets the spiritual calendar for the entire year.',
  },
  {
    slug: 'baisakhi',
    name: 'Baisakhi (Vaisakhi)',
    sanskrit: 'वैशाखी',
    date2026: '2026-04-14',
    deity: 'Sun / Guru Gobind Singh',
    description:
      'Solar New Year and Punjabi harvest festival on Mesha Sankranti — when the Sun enters Aries. Also commemorates 1699 CE, when Guru Gobind Singh founded the Khalsa Panth at Anandpur Sahib, baptising the Panj Pyare with Amrit. Farmers thank the divine for the rabi harvest; Sikhs celebrate the birth of the Khalsa identity.',
    rituals: [
      'Pre-dawn bath in the Ganga, Yamuna, or local river',
      'Visit to Gurdwara for Akhand Path and Amrit Sanchar',
      'Nagar Kirtan procession led by Panj Pyare',
      'Bhangra and Gidda performances around bonfires',
      'Langar seva (community meal) at gurdwaras',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'Astronomically marks the Sun\'s entry into Mesha rashi, the start of the Hindu solar year shared with Tamil Puthandu, Vishu, Pohela Boishakh, and Bihu. Spiritually, the Khalsa foundation day for Sikhs — when Guru Gobind Singh dissolved caste through the shared Amrit ceremony.',
  },
  {
    slug: 'pongal',
    name: 'Pongal',
    sanskrit: 'पोङ्गल्',
    date2026: '2026-01-14',
    deity: 'Surya',
    deitySlug: 'surya',
    description:
      'Four-day Tamil harvest festival on Thai month sankranti, dedicated to the Sun. Day 1 Bhogi Pongal (burning old belongings), Day 2 Thai Pongal (boiling fresh rice with jaggery and milk in a new clay pot until it overflows — the auspicious "Pongalo Pongal" cry), Day 3 Mattu Pongal (worship of cattle), Day 4 Kaanum Pongal (family visits and outings).',
    rituals: [
      'Cleaning of homes and discarding old items on Bhogi eve',
      'Kolam (rice-flour rangoli) at the threshold',
      'Cooking sakkarai pongal in a new earthen pot facing east',
      'Garlanding and worship of oxen and cows on Mattu Pongal',
      'Sugarcane, turmeric, and ginger offerings to Surya',
    ],
    pujasAvailable: ['surya-arghya', 'navagraha-shanti'],
    fastingType: 'none',
    significance:
      'Thanksgiving to Surya, the cattle, and the earth for the harvest. The overflowing pot symbolises prosperity overflowing into the new year. Marks Uttarayana — the Sun\'s northward journey — considered the most auspicious half of the year per the Mahabharata (Bhishma waited for it before leaving his body).',
  },
  {
    slug: 'lohri',
    name: 'Lohri',
    sanskrit: 'लोहड़ी',
    date2026: '2026-01-13',
    deity: 'Agni / Surya',
    description:
      'Punjabi winter-solstice harvest festival on the eve of Makar Sankranti. Families and neighbourhoods gather around a bonfire at dusk, circumambulating it while tossing sesame seeds, jaggery, rewari, popcorn, and peanuts into the flames as offerings to Agni. The ballad of Dulla Bhatti — the 16th-century Punjabi Robin Hood who rescued Hindu girls from slave traders — is sung in chorus.',
    rituals: [
      'Lighting the community bonfire at sunset',
      'Parikrama around the fire with til-gud, rewari, gajak offerings',
      'Singing "Sundar mundriye ho" (Dulla Bhatti ballad)',
      'First Lohri celebration for newlyweds and newborns',
      'Sarson da saag and makki di roti community feast',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'Marks the end of the coldest fortnight (Pausha) and the lengthening of days from Uttarayana. The fire offerings symbolise the dissolution of the past year\'s negativity. Especially significant for the bride\'s first post-wedding winter and a baby\'s first Lohri — both celebrated with neighbourhood-wide invitations.',
  },
  {
    slug: 'durga-puja',
    name: 'Durga Puja',
    sanskrit: 'दुर्गा पूजा',
    date2026: '2026-10-19',
    deity: 'Goddess Durga',
    deitySlug: 'durga',
    description:
      'Five-day Bengali celebration of Goddess Durga\'s slaying of Mahishasura, peaking on Maha Ashtami of Sharada Navaratri. Artisans of Kumartuli sculpt clay murtis of ten-armed Durga flanked by Lakshmi, Saraswati, Ganesha, and Kartikeya through the year. Sarbojanin (community) pandals across Kolkata transform neighbourhoods into open-air art galleries; Bonedi Bari (aristocratic household) pujas preserve 300-year-old family rites.',
    rituals: [
      'Mahalaya invocation chanting Mahishasura Mardini stotra at dawn',
      'Bodhon (awakening of the goddess) on Shashthi',
      'Sandhi Puja at the junction of Ashtami-Navami (108 lamps + lotuses)',
      'Kumari Puja — worship of a pre-pubescent girl as living Devi',
      'Sindoor Khela and visarjan procession on Vijayadashami',
    ],
    pujasAvailable: ['durga-saptashati-path', 'chandi-homam'],
    fastingType: 'partial',
    significance:
      'Celebrates the annual visit of Durga to her maternal home (Bengal) with her children before returning to Kailash. UNESCO inscribed Kolkata Durga Puja on the Representative List of Intangible Cultural Heritage in 2021. Spiritually marks the triumph of dharma over adharmic ego — the buffalo demon being the unbridled lower nature.',
  },
  {
    slug: 'vishu',
    name: 'Vishu',
    sanskrit: 'विषु',
    date2026: '2026-04-14',
    deity: 'Vishnu / Krishna',
    deitySlug: 'krishna',
    description:
      'Malayali New Year on Medam 1 (Sun\'s entry into Mesha rashi), centred on the Vishukkani — the first auspicious sight at dawn. Elders arrange a uruli (bronze vessel) the previous night with raw rice, golden Konna (cassia fistula) flowers, fresh fruits, a mirror, gold coins, a yellow cucumber, and an image of Krishna; family members are led to it blindfolded at sunrise to ensure their first vision of the year is prosperous.',
    rituals: [
      'Vishukkani arrangement before midnight on Vishu eve',
      'Blindfolded darshan of the kani at brahma muhurta',
      'Vishukkaineetam — elders gift coins to children',
      'Visit to Guruvayur, Sabarimala, or local Krishna temple',
      'Sadya feast of 26 dishes on a banana leaf',
    ],
    pujasAvailable: ['satyanarayan-puja'],
    fastingType: 'none',
    significance:
      'The kani is a visual sankalpa — what the eye sees first sets the tone for the entire year. Konna flowers blooming yellow are considered Krishna\'s favourite. Astronomically aligned with Baisakhi, Puthandu, and Pohela Boishakh as the pan-Indian solar new year on Mesha Sankranti.',
  },
  {
    slug: 'bonalu',
    name: 'Bonalu',
    sanskrit: 'बोनालु',
    date2026: '2026-07-12',
    deity: 'Mahakali',
    deitySlug: 'kali',
    description:
      'Folk Mahakali festival of Telangana observed across the Sundays of Ashada masa, peaking at the Golconda Fort Jagadambika temple and Secunderabad Ujjaini Mahakali. Women carry "bonam" (offering) — earthen pots stacked with cooked rice, jaggery, milk, and curd, lit with a deepa and crowned with neem leaves — on their heads in procession to the Devi temple as gratitude for surviving the rainy-season epidemics.',
    rituals: [
      'Bonam pot preparation at home with new earthenware',
      'Procession to Mahakali temple with drums and Pothurajulu dancers',
      'Rangam — a woman in trance prophesies the coming year while balanced on an earthen pot',
      'Sacrifice of pumpkins as substitute for animal offering',
      'Ghatam procession on the final Sunday from Akkanna Madanna temple',
    ],
    pujasAvailable: ['kali-puja'],
    fastingType: 'partial',
    significance:
      'Originated in 1813 when a military battalion from Hyderabad prayed at Ujjaini Mahakali during a plague outbreak; on return, they installed the Devi and began the bonam tradition. Declared the state festival of Telangana after bifurcation in 2014. The Rangam prophecy is treated as binding civic forecast.',
  },
  {
    slug: 'teej-hartalika',
    name: 'Hartalika Teej',
    sanskrit: 'हरतालिका तीज',
    date2026: '2026-08-15',
    deity: 'Goddess Parvati',
    deitySlug: 'parvati',
    description:
      'Bhadrapada Shukla Tritiya nirjala vrat observed by married women and unmarried girls of north India, Nepal, Rajasthan, and Bihar for marital longevity and the boon of a Shiva-like husband. Named "Hartalika" because Parvati\'s sakhis (her female friends) abducted her to the forest to prevent her father\'s plan to marry her to Vishnu, allowing her to continue penance for Shiva.',
    rituals: [
      'Sand-clay murtis of Shiva-Parvati crafted at home',
      'Nirjala vrat — no food, no water for 24 hours',
      'Night-long jagran with Teej katha recitation',
      'Sindoor, mehndi, green bangles, and green saree (suhag shringar)',
      'Visarjan of clay murtis the next morning',
    ],
    pujasAvailable: ['parvati-puja', 'rudrabhishek'],
    fastingType: 'full',
    significance:
      'Marks Parvati\'s acceptance by Shiva after 108 lifetimes of tapasya, hence the most rigorous vrat for suhag (marital wellbeing). Considered more austere than Karva Chauth because no water is permitted. Unmarried girls observe it praying for a husband who embodies Shiva\'s qualities of detachment with devotion.',
  },
  {
    slug: 'mahalaya-amavasya',
    name: 'Mahalaya Amavasya',
    sanskrit: 'महालय अमावस्या',
    date2026: '2026-10-09',
    deity: 'Pitrs / Goddess Durga',
    description:
      'New-moon closing day of Pitru Paksha (the 16-day dark fortnight of ancestor remembrance) and the dawn-invocation that opens Devi Paksha leading to Durga Puja. Sons perform Tarpan at riverbanks — offering water, black sesame, and pinda to three generations of paternal and maternal ancestors. In Bengal, families wake before dawn to All India Radio\'s 1931 Birendra Krishna Bhadra rendition of Mahishasura Mardini, a 90-year unbroken ritual broadcast.',
    rituals: [
      'Pre-dawn Tarpan at the Ganga, Godavari, or nearest river',
      'Pinda daan with cooked rice balls, til, and darbha grass',
      'Feeding of Brahmins, cows, crows (kakabali), and dogs',
      'Listening to Mahishasura Mardini stotra at brahma muhurta',
      'Chakshu Daan — painting the eyes of Durga clay murtis',
    ],
    pujasAvailable: ['pitra-dosh-nivaran', 'tripindi-shraddha'],
    fastingType: 'partial',
    significance:
      'Sarva Pitru Amavasya — the universal shraddha day when offerings reach ancestors whose death tithi is forgotten. Per the Mahabharata, Karna\'s soul returned to earth for 16 days to complete pitru rites he had neglected, establishing the Pitru Paksha tradition. Simultaneously marks the goddess\'s descent — bridging ancestor karma resolution into Devi-shakti invocation.',
  },
  {
    slug: 'thaipusam',
    name: 'Thaipusam',
    sanskrit: 'थैपूसम्',
    date2026: '2026-02-01',
    deity: 'Lord Murugan (Kartikeya — Subrahmanya)',
    deitySlug: 'kartikeya',
    description:
      'The full-moon festival of Thai (Jan-Feb) when the Pusam nakshatra is ascendant — commemorating Parvati handing the divine vel (lance) to Murugan to destroy the asura Soorapadman. Tamil devotees worldwide undertake the kavadi-attam — bearing decorated wooden arches on the shoulders, often with skin piercings of the vel through cheek and tongue, walking barefoot up the 272 steps of Batu Caves (Kuala Lumpur, 1.6 million pilgrims), Palani Hill Temple (one of the Aaru Padai Veedu), and Murugan Temple Penang.',
    rituals: [
      'Kavadi attam — bearing the burden arches up the temple steps',
      '48-day vratham of celibacy, vegetarianism, and yellow/saffron dress prior to the day',
      'Vel kavadi with cheek/tongue piercing as a vow of austerity',
      'Paal kudam (milk pot) carried on the head as bhog',
      'Skanda Shashti Kavacham continuous recitation',
    ],
    pujasAvailable: ['murugan-archana', 'skanda-shashti-kavacham-puja'],
    fastingType: 'full',
    significance:
      'The defining festival of Tamil Shaiva Siddhanta — the day Parvati armed Murugan with the cosmic vel that pierced Krauncha mountain and slew the asura. Establishes the bhakti-tapasya path of Murugan worship — the kavadi vow is a public testament that no burden is too heavy when carried for the divine. Recognized as a federal holiday in Malaysia, Singapore, Mauritius, and parts of Sri Lanka.',
  },
  {
    slug: 'ratha-saptami',
    name: 'Ratha Saptami',
    sanskrit: 'रथ सप्तमी',
    date2026: '2026-01-24',
    deity: 'Surya (Sun)',
    deitySlug: 'surya',
    description:
      'The seventh day of the bright fortnight of Magha — marking the Sun god turning his celestial chariot (drawn by seven horses) towards the northern hemisphere (uttarayana). Considered Surya Jayanti — the symbolic birthday of the Sun. Devotees bathe at sunrise placing seven arka (calotropis) leaves on the head — one on each shoulder, both knees, both feet, and the crown — representing the sapta-ashva of the Sun’s ratha.',
    rituals: [
      'Pre-dawn snan with arka leaves placed at 7 body points',
      'Arghya (water offering) to the rising Sun facing east with Gayatri Mantra',
      'Aditya Hridayam parayana — 31 verses from Ramayana Yuddha Kanda',
      'Drawing the seven-horse ratha rangoli at the doorway',
      'Distribution of jaggery-cooked rice (chakkara-pongal) as prasad in South India',
    ],
    pujasAvailable: ['surya-archana', 'aditya-hridayam-paath'],
    fastingType: 'partial',
    significance:
      'Auspicious for any health-related sankalpa — Surya is the karaka of vitality, eyesight, bones, and the soul (atma-karaka). Major celebration at Konark Sun Temple Odisha, Suryanar Kovil Tamil Nadu, and the Modhera Sun Temple Gujarat. The day inaugurates the spring season per the Hindu lunisolar calendar.',
  },
  {
    slug: 'gangaur',
    name: 'Gangaur',
    sanskrit: 'गणगौर',
    date2026: '2026-03-21',
    deity: 'Goddess Gauri (Parvati)',
    deitySlug: 'parvati',
    description:
      'The 18-day Rajasthan festival beginning the day after Holi and culminating on Chaitra Shukla Tritiya — celebrating Parvati’s reunion with Shiva. Unmarried women observe the vrat to obtain a good husband; married women for marital harmony and the long life of their spouse. Clay murtis of Isar (Shiva) and Gangaur (Parvati) are dressed daily by women in their finest, paraded on Tritiya through the streets of Jaipur, Udaipur, and Bikaner with the queens of the erstwhile royal families leading the procession.',
    rituals: [
      'Daily worship of clay Isar-Gangaur murtis in homes for 18 days',
      'Singing of Gangaur ghoomar folk songs and dancing',
      'Wearing of new red, green, and yellow chaniya choli',
      'Royal Gangaur procession from City Palace Jaipur and Udaipur on Tritiya',
      'Immersion of Gangaur murtis in Pichola Lake or Gangaur Ghat',
    ],
    pujasAvailable: ['gauri-puja-suvasini', 'isar-gangaur-vrat'],
    fastingType: 'partial',
    significance:
      'The cultural identity-marker of Rajasthan — recognized by UNESCO as a living tradition representing the suvasini-dharma of women’s spiritual agency. Echoes the larger Parvati-Shiva mythology where Parvati performs austerity to regain Shiva after his Tandava grief. Mughal-era Jahangir reportedly halted his army to watch the Udaipur Gangaur procession.',
  },
  {
    slug: 'ananta-chaturdashi',
    name: 'Ananta Chaturdashi',
    sanskrit: 'अनन्त चतुर्दशी',
    date2026: '2026-09-26',
    deity: 'Lord Vishnu (Ananta Padmanabha)',
    deitySlug: 'vishnu',
    description:
      'The 14th day of Bhadrapada Shukla Paksha — marking the worship of Vishnu in his Ananta-Shesha reclining form, and also the immersion (visarjan) day for Ganesh murtis after 10 days of Ganesh Chaturthi. Devotees tie the sacred Ananta-sutra — a 14-knotted yellow or red cotton thread — on the right wrist (men) or left wrist (women), invoking Vishnu’s 14 lokas of protection. Mumbai sees its largest visarjan procession of the year at Girgaum Chowpatty with over 200,000 Ganesh murtis immersed.',
    rituals: [
      'Tying the 14-knotted Ananta-sutra after Vishnu puja',
      'Vishnu Sahasranama parayana',
      'Ganesh visarjan procession (final day of Ganesh Chaturthi 10-day cycle)',
      'Vrat of fasting until the puja is concluded at noon',
      'Reading of Ananta Vrat Katha from the Bhavishyottara Purana',
    ],
    pujasAvailable: ['ananta-padmanabha-vrat', 'ganesh-visarjan-puja'],
    fastingType: 'full',
    significance:
      'The Bhavishyottara Purana narrates Yudhishthira learning the Ananta Vrat from Krishna himself during the Pandavas’ vanavasa — restoring their fortunes lost at the dice game. The 14 knots symbolise the 14 manvantaras and the 14 worlds. The convergence with Ganesh visarjan makes it Mumbai and Pune’s largest single-day spiritual gathering — 1.5 million devotees on the streets.',
  },
  {
    slug: 'gita-jayanti',
    name: 'Gita Jayanti',
    sanskrit: 'गीता जयन्ती',
    date2026: '2026-12-01',
    deity: 'Lord Krishna (as Gitacharya)',
    deitySlug: 'krishna',
    description:
      'The Margashirsha Shukla Ekadashi (Mokshada Ekadashi) — the very day in Dvapara Yuga when Lord Krishna delivered the 700-verse Bhagavad Gita to Arjuna on the Kurukshetra battlefield before the Mahabharata war. Devotees undertake full parayana of all 18 chapters and 700 verses in a single day. ISKCON celebrates with continuous gita-pravachana at every centre worldwide. Kurukshetra city hosts the International Gita Mahotsav with delegations from 40+ countries.',
    rituals: [
      'Single-day full parayana of all 18 chapters and 700 verses',
      'Brahmin satkar — gifting copies of the Gita to seekers',
      'Mokshada Ekadashi vrat of fasting',
      'Recitation of Chapter 15 (Purushottama Yoga) and Chapter 18 (final liberation) at sunset',
      'Visit to Jyotisar Tirtha (the banyan tree at Kurukshetra where Krishna spoke the Gita)',
    ],
    pujasAvailable: ['gita-parayana-18-chapters', 'mokshada-ekadashi-vrat'],
    fastingType: 'full',
    significance:
      'The Gita is the only scripture whose anniversary the Hindu tradition celebrates as a Jayanti — a recognition of its status as Krishna’s direct verbal teaching (sruti through smriti). Established by the Padma Purana phala-shruti: hearing even a single verse of the Gita on this day removes the sin of countless births. Translated into 78+ languages, gifted by Indian PMs to visiting heads of state.',
  },
  {
    slug: 'karthigai-deepam',
    name: 'Karthigai Deepam',
    sanskrit: 'कार्त्तिक दीपम्',
    date2026: '2026-12-03',
    deity: 'Shiva',
    deitySlug: 'shiva',
    description:
      'Karthigai Deepam falls on the Pournami of the Tamil month Karthigai when the moon conjoins the Krittika nakshatra, observed across Tamil Nadu, Kerala and Sri Lanka. Legend recalls Shiva manifesting as an infinite jyotirlinga of fire at Tiruvannamalai, humbling Brahma and Vishnu who could not measure His ends; the Mahadeepam atop Arunachala Hill is lit at dusk and visible for miles. Homes glow with rows of agal vilakku (clay lamps) on verandahs and thresholds, while temples conduct Krittika abhisheka. The festival predates Diwali in Tamil tradition and is referenced in Tolkappiyam and Ahananuru Sangam literature.',
    rituals: [
      'Lighting rows of agal vilakku clay lamps at dusk on doorsteps and tulsi-vrindavan',
      'Witnessing or kindling the Mahadeepam cauldron atop Arunachala Hill at Tiruvannamalai',
      'Performing Krittika nakshatra abhisheka to Shiva and Murugan lingas',
      'Preparing pori urundai (puffed-rice jaggery balls) and nei appam as naivedyam',
      'Girivalam pradakshina of the 14-km Arunachala hill circuit through the night',
      'Reciting Arunachala Aksharamanamalai and Sri Rudram before the household lamp',
    ],
    pujasAvailable: ['shiva-abhisheka', 'rudrabhishek', 'deepa-aradhana'],
    fastingType: 'partial',
    significance:
      'Karthigai Deepam celebrates Shiva as the formless column of light (Arunachaleshwara) and is regarded by Tamil Shaivites as the most ancient festival of lamps. The phala-shruti promises liberation from the cycle of rebirth for devotees who witness the Mahadeepam with bhakti, and the kindling of household lamps is said to dispel inner tamas, attract Lakshmi-Saraswati, and protect lineage progeny from premature death. Lighting the deepam on this tithi is considered equal in merit to a thousand ordinary lamps offered on other days.',
  },
  {
    slug: 'skanda-shashti',
    name: 'Skanda Shashti',
    sanskrit: 'स्कन्द षष्ठी',
    date2026: '2026-10-26',
    deity: 'Murugan',
    deitySlug: 'murugan',
    description:
      'Skanda Shashti, observed on the Shukla Shashti of the Tamil month Aippasi, commemorates the day Murugan (Skanda-Kartikeya) annihilated the asura Surapadma at Tiruchendur on the Tamil coast, restoring dharma to the devas. The six-day Soorasamharam festival at the Tiruchendur Arulmigu Subramanya Swamy Temple culminates in a dramatic re-enactment where the vel pierces Surapadma, who is transformed into the peacock vahana and rooster banner of the Lord. The vratam is widely observed in Tamil Nadu, Kerala, Sri Lanka, Singapore and Malaysia, and finds scriptural sanction in the Skanda Purana and the Tamil Kanda Puranam of Kachiyappa Sivacharya.',
    rituals: [
      'Six-day nirjala or phala-ahara fast beginning on Aippasi Shukla Prathama',
      'Daily recitation of Kanda Shashti Kavacham composed by Devaraya Swamigal',
      'Witnessing the Soorasamharam vel-yudham re-enactment at Tiruchendur',
      'Offering panchamrita abhisheka and vibhuti archana to the shanmukha vigraha',
      'Lighting karpura aarti and presenting panneer (rose water) to Murugan',
      'Breaking the vratam on Sapthami after Tirukalyanam of Murugan with Devasena',
    ],
    pujasAvailable: ['murugan-archana', 'kanda-shashti-kavacham-parayanam', 'shashti-vratam'],
    fastingType: 'full',
    significance:
      'Skanda Shashti is held by Kaumara devotees to be the most potent vratam for vanquishing inner asuras of ego, lust and ignorance, mirroring the slaying of Surapadma by the vel of jnana-shakti. The phala-shruti of the Kanda Shashti Kavacham declares that those who observe the six-day fast with sincerity gain victory over enemies, freedom from graha-dosha, marital harmony, progeny, and ultimately moksha at the lotus feet of the six-faced Lord. The vratam is especially prescribed for the unmarried and for those afflicted by Mangal-dosha.',
  },
  {
    slug: 'chaitra-navaratri',
    name: 'Chaitra Navaratri',
    sanskrit: 'चैत्र नवरात्रि',
    date2026: '2026-03-19',
    deity: 'Durga',
    deitySlug: 'durga',
    description:
      'Chaitra Navaratri, also known as Vasanta Navaratri or Rama Navaratri, spans the first nine tithis of the Shukla Paksha of Chaitra and culminates on Rama Navami, the appearance day of Shri Rama. Beginning with Ugadi-Gudi Padwa pratipada ghatasthapana, devotees invoke the nine forms of Durga — Shailaputri through Siddhidatri — one each day, paralleling the autumnal Sharada Navaratri. The festival marks the Hindu New Year in much of North India, Maharashtra, Karnataka and Andhra, and is celebrated with special fervour in the Shakti peethas of Vaishno Devi, Jwalamukhi and Chintpurni. The Devi Mahatmya of Markandeya Purana is the principal liturgical text.',
    rituals: [
      'Ghatasthapana kalasha installation and akhanda-jyoti on Pratipada morning',
      'Daily parayana of Durga Saptashati (Chandi Path) — 700 verses across nine days',
      'Worship of one Navadurga form per tithi with corresponding flower and naivedya',
      'Kanya-pujan of nine pre-pubescent girls as Devi-svarupa on Ashtami or Navami',
      'Sowing barley (jayanti) seeds in the kalasha and observing daily sprout-growth',
      'Concluding with Rama Navami abhisheka and Ramayana Sundara Kanda parayanam',
    ],
    pujasAvailable: ['durga-saptashati-parayanam', 'kanya-pujan', 'chandi-homa', 'navadurga-archana'],
    fastingType: 'full',
    significance:
      'Chaitra Navaratri is regarded in the Devi Bhagavata as the spring-tide propitiation of Adi Shakti, when sattva is naturally ascendant in nature and sadhana yields manifold phala. The phala-shruti of the Durga Saptashati promises destruction of obstacles, victory over adversaries, wealth, progeny, dispelling of graha-pida and bhuta-badha, and ultimately the supreme boon of bhakti and mukti. Observing the nine-day vratam with kumari-pujan is said to confer the punya of a thousand ashvamedha yajnas and to please Devi as a mother is pleased by her child.',
  },
  {
    slug: 'ahoi-ashtami',
    name: 'Ahoi Ashtami',
    sanskrit: 'अहोई अष्टमी',
    date2026: '2026-11-02',
    deity: 'Ahoi Mata',
    deitySlug: 'parvati',
    description:
      'Ahoi Ashtami falls on the Krishna Paksha Ashtami of Kartik month, observed primarily by mothers across North India — Uttar Pradesh, Rajasthan, Haryana, Punjab, Himachal and Uttarakhand — for the long life, health and prosperity of their children. Ahoi Mata, a benevolent form of Parvati, is depicted with eight corners (ashta-koshthaka) on a wall painting or pata along with her cubs, recalling the legend of a merchant\'s wife who accidentally killed a porcupine\'s young while digging clay and lost her own seven sons until Ahoi Mata\'s grace restored them. The vrata-katha is recited in the evening before sighting stars or the moon.',
    rituals: [
      'Nirjala fast from sunrise observed by mothers until star-sighting at twilight',
      'Drawing the Ahoi Mata pata with eight corners on the northern wall using geru and rice paste',
      'Establishing a silver Syau (necklace with beads representing children) on the altar',
      'Listening to the Ahoi Ashtami vrata-katha of the saahukar and the porcupine',
      'Offering halwa-puri, sweet boiled chana, and singhare-ka-halwa as naivedya',
      'Arghya to the stars (taraon ko arghya) with water from a karwa before breaking the fast',
    ],
    pujasAvailable: ['ahoi-mata-puja', 'santan-gopal-puja', 'parvati-archana'],
    fastingType: 'full',
    significance:
      'Ahoi Ashtami is held by Smarta and Vaishnava grhasthas to be the supreme putra-praapti and putra-rakshana vrata, complementing Karwa Chauth observed eight days earlier for the husband\'s longevity. The phala-shruti of the vrata-katha promises that mothers who observe the nirjala fast with shraddha shall never witness the death of their progeny, that barren women shall conceive, and that the lineage shall be protected from akala-mrityu (untimely death) and apamrityu. The silver Syau is passed down across generations as a family heirloom of Ahoi Mata\'s blessing.',
  },
  {
    slug: 'varuthini-ekadashi',
    name: 'Varuthini Ekadashi',
    sanskrit: 'वरूथिनी एकादशी',
    date2026: '2026-05-12',
    deity: 'Vishnu',
    deitySlug: 'vishnu',
    description:
      'Varuthini Ekadashi falls on the Krishna Paksha Ekadashi of Vaishakha month and is glorified by Shri Krishna himself to Yudhishthira in the Bhavishyottara Purana as the bestower of varutha — divine armour and protection. The vrata commemorates the rescue of King Mandhata, who while performing tapasya was seized by a bear; Vishnu appeared as Varaha-rupa and not only delivered the king but, in compassion, granted moksha to the bear as well. Observed across Vaishnava sampradayas from Vrindavan to Udupi, the ekadashi is particularly associated with charitable giving of grain, gold and cow (godana) to qualified brahmanas at sunrise on dwadashi.',
    rituals: [
      'Nirjala or phala-ahara fast from dashami sunset through dwadashi parana',
      'Predawn snana and Tulsi-archana followed by Vishnu Sahasranama parayanam',
      'Jagarana through ekadashi night with bhajan, kirtan and Bhagavatam recitation',
      'Listening to the Varuthini Ekadashi mahatmya from Bhavishyottara Purana',
      'Dana of til (sesame), gold, cloth and cow to a deserving brahmana at dwadashi',
      'Parana at the prescribed dwadashi muhurta with tulsi-jal and akshata',
    ],
    pujasAvailable: ['ekadashi-vrata-puja', 'vishnu-sahasranama-parayanam', 'satyanarayana-puja'],
    fastingType: 'full',
    significance:
      'Varuthini Ekadashi is extolled in the Bhavishyottara Purana as equivalent in merit to ten thousand years of tapasya, and Krishna declares its phala superior to surya-grahana snana at Kurukshetra, horse-sacrifice, and the gifting of a thousand cows. The phala-shruti promises that observers are freed from the gravest papas including brahma-hatya and stri-hatya, are armoured (varutha) against misfortune in this life, attain beauty, fortune and progeny, and after death ascend to Vaikuntha. Even hearing the mahatmya with shraddha is said to dissolve the sins of a thousand births.',
  },
];

export function getFestival(slug: string): FestivalInfo | undefined {
  return FESTIVALS.find((f) => f.slug === slug);
}

export function festivalSlugs(): string[] {
  return FESTIVALS.map((f) => f.slug);
}

export function nextFestival(today: Date = new Date()): FestivalInfo | undefined {
  const t = today.toISOString().slice(0, 10);
  return FESTIVALS.filter((f) => f.date2026 >= t).sort((a, b) =>
    a.date2026.localeCompare(b.date2026),
  )[0];
}
