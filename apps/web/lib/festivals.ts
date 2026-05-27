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
