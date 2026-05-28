export interface SaptaMathruka {
  slug: string;
  number: number;
  name: string;
  sanskrit: string;
  consortDeity: string;
  emergedFrom: string;
  vahana: string;
  weapons: string[];
  numberOfHands: number;
  color: string;
  direction: string;
  beejaMantra: string;
  primaryMantra: string;
  primaryMantraEnglish: string;
  benefit: string;
  storyOrigin: string;
  vrataPractice: string;
  associatedTemple: string;
  bestDay: string;
}

export const SAPTA_MATHRUKA: SaptaMathruka[] = [
  {
    slug: 'brahmani',
    number: 1,
    name: 'Brahmani',
    sanskrit: 'ब्राह्मणी',
    consortDeity: 'Brahma',
    emergedFrom: 'The creative shakti of Brahma — emerged from his mouth as he chanted the four Vedas to fight Andhakasura',
    vahana: 'Hamsa (divine swan)',
    weapons: ['Akshamala (rosary)', 'Kamandalu (water pot)', 'Pustaka (Vedas)', 'Sruva (sacrificial ladle)'],
    numberOfHands: 4,
    color: 'Yellow (golden complexion)',
    direction: 'East',
    beejaMantra: 'ॐ ब्रां ब्राह्मण्यै नमः',
    primaryMantra: 'ॐ ब्राह्मण्यै विद्महे महाशक्त्यै धीमहि तन्नो ब्रह्माणी प्रचोदयात्',
    primaryMantraEnglish: 'Om Brahmanyai Vidmahe Mahashaktyai Dhimahi Tanno Brahmani Prachodayat',
    benefit: 'Grants wisdom, mastery of Vedas, eloquence in speech, success in education and creative endeavors. Sought by students, teachers, and seekers of jnana.',
    storyOrigin: 'When the demon Andhakasura threatened the three worlds, Shiva and the gods produced their shaktis as mother forms. Brahma emitted Brahmani who emerged seated on a swan, four-faced like her consort, holding the Vedas and akshamala. She drank the demon\'s blood alongside her sisters in the Saptamatrika battle.',
    vrataPractice: 'Vasanta Panchami and during Navaratri — devotees wear yellow, offer turmeric rice and saraswati-yantra worship at sunrise, recite Sarasvati-stotra.',
    associatedTemple: 'Sapta Matrika shrine, Aihole (Karnataka); Brahmani temple at Jajpur (Odisha) — one of the most ancient Matrika sites',
    bestDay: 'Sunday',
  },
  {
    slug: 'vaishnavi',
    number: 2,
    name: 'Vaishnavi',
    sanskrit: 'वैष्णवी',
    consortDeity: 'Vishnu',
    emergedFrom: 'The preservation shakti of Vishnu — emerged from his chest holding his attributes',
    vahana: 'Garuda (divine eagle)',
    weapons: ['Shankha (conch)', 'Chakra (discus)', 'Gada (mace)', 'Padma (lotus)'],
    numberOfHands: 4,
    color: 'Dark blue (like Vishnu)',
    direction: 'North',
    beejaMantra: 'ॐ वैं वैष्णव्यै नमः',
    primaryMantra: 'ॐ वैष्णव्यै च विद्महे वैष्णव्यै च धीमहि तन्नो दुर्गा प्रचोदयात्',
    primaryMantraEnglish: 'Om Vaishnavyai Cha Vidmahe Vaishnavyai Cha Dhimahi Tanno Durga Prachodayat',
    benefit: 'Grants wealth, victory over enemies, protection of dharma, marital harmony and the qualities of preservation — sustenance of family, kingdom, and devotion.',
    storyOrigin: 'In the Andhaka war and again during the Devi Mahatmya battles, Vishnu produced Vaishnavi who emerged from his side bearing his exact attributes — shankha, chakra, gada, padma. Mounted on Garuda, she joined her sisters to drink the asuras\' blood and prevent the multiplication of Raktabija.',
    vrataPractice: 'Ekadashi observances, Vaishakha month and Navaratri Day 6 — devotees fast, recite Vishnu Sahasranama and offer tulsi-archana.',
    associatedTemple: 'Vaishno Devi (Katra, J&K) — though primarily Mahalakshmi-Mahasaraswati-Mahakali, the Matrika form is worshipped there; also Sapta Matrika panels at Ellora caves',
    bestDay: 'Thursday',
  },
  {
    slug: 'maheshwari',
    number: 3,
    name: 'Maheshwari',
    sanskrit: 'माहेश्वरी',
    consortDeity: 'Shiva (Maheshwara)',
    emergedFrom: 'The destructive shakti of Shiva — emerged with three eyes, crescent moon and matted locks',
    vahana: 'Nandi (the divine bull)',
    weapons: ['Trishul (trident)', 'Damaru (drum)', 'Akshamala (rudraksha rosary)', 'Khatvanga (skull-staff)'],
    numberOfHands: 4,
    color: 'White (like camphor and ash)',
    direction: 'South-West',
    beejaMantra: 'ॐ मां माहेश्वर्यै नमः',
    primaryMantra: 'ॐ माहेश्वर्यै च विद्महे वृषारूढायै धीमहि तन्नो गौरी प्रचोदयात्',
    primaryMantraEnglish: 'Om Maheshwaryai Cha Vidmahe Vrisharudhayai Dhimahi Tanno Gauri Prachodayat',
    benefit: 'Destruction of ego, removal of obstacles, mastery over anger, liberation from karmic bondage. Sought by yogis, ascetics and those battling inner enemies.',
    storyOrigin: 'When Shiva produced his shakti as Maheshwari, she emerged seated on the great bull Nandi, three-eyed and crowned by the crescent moon, bearing the trishul and damaru. She matched her consort\'s ferocity and led the Saptamatrika charge against the demons, her dance shaking the battlefield.',
    vrataPractice: 'Mondays (Somavara) and during Shravana month — devotees offer abhishek with milk and bilva leaves, fast and chant Mahishasura Mardini stotra in evening.',
    associatedTemple: 'Maheshwari temple at Mansa (Gujarat); Sapta Matrika cave panels at Elephanta and Aihole',
    bestDay: 'Monday',
  },
  {
    slug: 'indrani',
    number: 4,
    name: 'Indrani',
    sanskrit: 'इन्द्राणी',
    consortDeity: 'Indra',
    emergedFrom: 'The royal shakti of Indra — emerged thousand-eyed bearing his thunderbolt',
    vahana: 'Airavata (the celestial elephant)',
    weapons: ['Vajra (thunderbolt)', 'Ankusha (elephant goad)', 'Pasha (noose)', 'Khadga (sword)'],
    numberOfHands: 4,
    color: 'Red (like the rising sun)',
    direction: 'East (along with Indra)',
    beejaMantra: 'ॐ ऐं ऐन्द्र्यै नमः',
    primaryMantra: 'ॐ ऐन्द्र्यै च विद्महे शचीदेव्यै धीमहि तन्नो इन्द्राणी प्रचोदयात्',
    primaryMantraEnglish: 'Om Aindryai Cha Vidmahe Shachidevyai Dhimahi Tanno Indrani Prachodayat',
    benefit: 'Grants royal authority, victory over enemies, sovereignty, courage in battle, success in legal and political matters. Sought by leaders and warriors.',
    storyOrigin: 'When Indra emitted his shakti for the Devi-asura battle, Aindri emerged with a thousand eyes like her consort, mounted on Airavata, bearing the vajra. In the Raktabija episode she drank streams of the demon\'s blood from mid-air alongside her sisters, denying him the chance to multiply.',
    vrataPractice: 'Indra-dhwaja festival (post-monsoon) and during Navaratri Day 4 — devotees offer red flowers, fast and recite Aindri-stotra at dawn facing east.',
    associatedTemple: 'Indrani Matrika shrine at Osian (Rajasthan); Sapta Matrika panels at Mahakuteshwara and Pattadakal',
    bestDay: 'Wednesday',
  },
  {
    slug: 'kaumari',
    number: 5,
    name: 'Kaumari',
    sanskrit: 'कौमारी',
    consortDeity: 'Kartikeya (Kumara/Skanda)',
    emergedFrom: 'The warrior shakti of Skanda — emerged six-faced bearing his spear, mounted on the peacock',
    vahana: 'Mayura (the peacock)',
    weapons: ['Shakti (lance/vel)', 'Khadga (sword)', 'Dhanus (bow)', 'Banaa (arrow)'],
    numberOfHands: 4,
    color: 'Pale red (saffron complexion)',
    direction: 'South',
    beejaMantra: 'ॐ कौं कौमार्यै नमः',
    primaryMantra: 'ॐ कौमार्यै च विद्महे शिखिवाहन्यै धीमहि तन्नो स्कन्दा प्रचोदयात्',
    primaryMantraEnglish: 'Om Kaumaryai Cha Vidmahe Shikhivahanyai Dhimahi Tanno Skanda Prachodayat',
    benefit: 'Grants courage to youth, victory in competitions and combat, removal of childhood ailments, protection of children. Sought by athletes, students before exams, and parents praying for child welfare.',
    storyOrigin: 'When Skanda emitted his shakti for the Matrika band, Kaumari appeared with the same six faces as her consort, mounted on the peacock, holding the vel spear that slew Tarakasura. She fought alongside her sisters in the Andhaka war and in the Devi Mahatmya battles.',
    vrataPractice: 'Skanda Shashthi (Kartika Shukla Shashthi) and Krittika nakshatra days — devotees fast on milk, offer kumkum and saffron rice, recite Subramanya Bhujangam.',
    associatedTemple: 'Sapta Matrika shrines at Pattadakal and Aihole (Karnataka); standalone Kaumari shrine at Tiruchendur in the Kartikeya complex',
    bestDay: 'Tuesday',
  },
  {
    slug: 'varahi',
    number: 6,
    name: 'Varahi',
    sanskrit: 'वाराही',
    consortDeity: 'Varaha (boar avatar of Vishnu)',
    emergedFrom: 'The earth-lifting shakti of Varaha — emerged with the head of a sow, holding the plough that lifts the earth',
    vahana: 'Mahishi (buffalo) or sometimes a boar',
    weapons: ['Hala (plough)', 'Musala (pestle)', 'Khadga (sword)', 'Khetaka (shield)'],
    numberOfHands: 4,
    color: 'Dark — like a thundercloud',
    direction: 'North-West',
    beejaMantra: 'ॐ वां वाराह्यै नमः',
    primaryMantra: 'ॐ वाराह्यै च विद्महे महिषारूढायै धीमहि तन्नो वाराही प्रचोदयात्',
    primaryMantraEnglish: 'Om Varahyai Cha Vidmahe Mahisharudhayai Dhimahi Tanno Varahi Prachodayat',
    benefit: 'Stambhana (paralysis of enemies), removal of black magic and abhichara, protection while traveling at night, success in tantric sadhana. Worshipped as the commander of the Lalita Tripurasundari army.',
    storyOrigin: 'Varaha produced his shakti in the form of Varahi — sow-faced, dark and powerful, holding the plough by which the earth herself is lifted. She fought in the Saptamatrika war, and later became Dandanayika — the supreme commander of the army of Lalita Devi in the Lalita Sahasranama tradition.',
    vrataPractice: 'Midnight worship on Krishna Paksha Ashtami and during Navaratri Day 8 — Sri Vidya upasakas perform Varahi-puja with red flowers, kumkum and pomegranate offerings; recite Varahi Anugrahashtaka.',
    associatedTemple: 'Varahi Deula at Chaurasi (Odisha) — one of the rare standalone Varahi temples; Sapta Matrika cave panels at Ellora',
    bestDay: 'Tuesday (midnight)',
  },
  {
    slug: 'chamunda',
    number: 7,
    name: 'Chamunda',
    sanskrit: 'चामुण्डा',
    consortDeity: 'Kali / Devi herself (no male consort — born of Devi\'s wrath)',
    emergedFrom: 'The wrath of Kausiki/Ambika — emerged from her forehead as Kali, then named Chamunda after slaying Chanda and Munda',
    vahana: 'Preta (corpse) or owl',
    weapons: ['Khadga (sword)', 'Pasha (noose)', 'Trishul (trident)', 'Kapala (skull-bowl)'],
    numberOfHands: 4,
    color: 'Black (like ink)',
    direction: 'South-East',
    beejaMantra: 'ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे',
    primaryMantra: 'ॐ चामुण्डायै च विद्महे महाशक्त्यै च धीमहि तन्नो देवी प्रचोदयात्',
    primaryMantraEnglish: 'Om Chamundayai Cha Vidmahe Mahashaktyai Cha Dhimahi Tanno Devi Prachodayat',
    benefit: 'Annihilation of all fears, victory over death, removal of grahabadha (planetary afflictions), liberation from karmic debts. The most fierce of the Matrikas, invoked at extreme need.',
    storyOrigin: 'When Chanda and Munda — generals of Shumbha — attacked Ambika, she emanated the dark goddess Kali from her brow. Kali devoured both demons, brought their heads to the Devi, who proclaimed: "Because thou hast brought to me Chanda and Munda, thou shalt be known henceforth as Chamunda." She then joined the Saptamatrika in drinking Raktabija\'s blood, ending his multiplication.',
    vrataPractice: 'Krishna Paksha Ashtami (Kalashtami) and Navaratri Day 7 (Saptami) — midnight puja with red hibiscus, kumkum, til (sesame) and offerings on a copper plate; recite Chamunda Beej and Devi Atharvashirsha.',
    associatedTemple: 'Chamunda Devi temple, Dharamshala (Himachal Pradesh); Chamundeshwari atop Chamundi Hill, Mysuru — slayer of Mahishasura',
    bestDay: 'Saturday',
  },
];

export const SAPTA_MATHRUKA_SLUGS = SAPTA_MATHRUKA.map((m) => m.slug);

export function getSaptaMathrukaBySlug(slug: string): SaptaMathruka | undefined {
  return SAPTA_MATHRUKA.find((m) => m.slug === slug);
}
