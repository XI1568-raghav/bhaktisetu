export type MahavidyaSlug =
 | 'kali'
 | 'tara'
 | 'tripura-sundari'
 | 'bhuvaneshwari'
 | 'bhairavi'
 | 'chinnamasta'
 | 'dhumavati'
 | 'bagalamukhi'
 | 'matangi'
 | 'kamala';

export interface Mahavidya {
 slug: MahavidyaSlug;
 order: number;
 name: string;
 sanskrit: string;
 epithet: string;
 colorHex: string;
 colorName: string;
 element: string;
 direction: string;
 consort: string;
 cosmicFunction: string;
 mantra: string;
 mantraEnglish: string;
 beejMantra: string;
 mool: string;
 worshipDay: string;
 origin: string;
 iconography: string;
 sadhanaGoal: string;
 grants: string[];
 cautions: string[];
 famousShrines: string[];
 connection: string;
}

export const MAHAVIDYAS: Mahavidya[] = [
 {
  slug: 'kali',
  order: 1,
  name: 'Kali',
  sanskrit: 'काली',
  epithet: 'The Black One / Mother of Time',
  colorHex: '#0f172a',
  colorName: 'Deep black',
  element: 'Akasha (space) — beyond time',
  direction: 'All directions (omnidirectional)',
  consort: 'Mahakala (Shiva as Time)',
  cosmicFunction: 'Destruction of ego, time, illusion. The first and supreme Mahavidya.',
  mantra: 'ॐ क्रीं कालिकायै नमः',
  mantraEnglish: 'Om Krim Kalikayai Namah',
  beejMantra: 'क्रीं (Krim)',
  mool: 'क्रीं क्रीं क्रीं ह्रीं ह्रीं ह्रूं ह्रूं दक्षिणे कालिके क्रीं क्रीं क्रीं ह्रीं ह्रीं ह्रूं ह्रूं स्वाहा',
  worshipDay: 'Amavasya (new moon), especially Kali Chaudas (Diwali eve)',
  origin:
   'Emerged from the third eye of Durga to slay Raktabija the demon whose every blood-drop spawned a clone. Kali drank his blood mid-air, ending the cycle. The original archetype of time devouring itself.',
  iconography:
   'Four-armed, deep blue-black, three eyes, tongue out, garland of 51 severed heads (alphabet), skirt of severed arms, stands on prostrate Shiva. Right hands: sword + severed head; left hands: abhaya + varada. The destroyer who is also the supreme mother.',
  sadhanaGoal:
   'Destruction of ego, transcendence of time and fear of death, direct realization of the Void from which creation emerges. Highest non-dual sadhana.',
  grants: [
   'Sudden destruction of long-standing obstacles',
   'Liberation from fear of death',
   'Removal of black magic / negative entities',
   'Quick siddhi to advanced sadhakas',
  ],
  cautions: [
   'Not for casual worship — initiation by qualified guru recommended',
   'Vegetarian diet, celibacy, midnight sadhana standard',
   'Householders may safely chant the Krim beej + namah-mantra only',
  ],
  famousShrines: ['Kalighat (Kolkata)', 'Dakshineswar (Kolkata)', 'Kamakhya (Assam)', 'Tarapith (Bengal)'],
  connection: 'Connects to Navadurga form Kalaratri (Day 7) and Bhairava worship.',
 },
 {
  slug: 'tara',
  order: 2,
  name: 'Tara',
  sanskrit: 'तारा',
  epithet: 'The Saviouress / Star Goddess',
  colorHex: '#1e40af',
  colorName: 'Sapphire blue',
  element: 'Jala (water)',
  direction: 'West',
  consort: 'Akshobhya (unshakeable Shiva)',
  cosmicFunction: 'Crosses devotees over the ocean of samsara. Goddess of speech and salvation.',
  mantra: 'ॐ ह्रीं स्त्रीं हुं फट्',
  mantraEnglish: 'Om Hrim Strim Hum Phat',
  beejMantra: 'स्त्रीं (Strim)',
  mool: 'ॐ ह्रीं स्त्रीं हूं फट् स्वाहा',
  worshipDay: 'Chaitra Shukla Navami; Tara Jayanti (April-May)',
  origin:
   'When Shiva drank the poison Halahala that emerged from the cosmic ocean churning, he fell unconscious. Tara appeared as the saviour-mother, nursed him back to consciousness. Hence she is the rescuer in moments of greatest crisis. Worshipped equally by Hindus, Buddhists (Green/White Tara), and Jains.',
  iconography:
   'Four-armed, blue complexion, standing in pratyalidha posture on a corpse. Hands hold: sword, severed head, scissors, lotus. Garland of skulls, tiger-skin skirt. Tongue out, three eyes, fierce yet maternal.',
  sadhanaGoal:
   'Rescue from sudden crisis, mastery of speech (vak siddhi), eloquence, success in writing/teaching/research/translation/inter-religious work.',
  grants: [
   'Saves from sudden catastrophe — accident, illness, financial crash',
   'Eloquence and mastery of language',
   'Knowledge across religions and traditions',
   'Special protection on dangerous journeys',
  ],
  cautions: [
   'Sadhana traditionally done at cremation grounds — householders restrict to mantra japa',
   'Tantric initiation needed for kavacha and yantra',
  ],
  famousShrines: ['Tarapith (Bengal)', 'Tara Devi Shimla (HP)', 'Bisaul Tara Mandir (Bihar)'],
  connection: 'Buddhist Tara (Green Tara, White Tara) is the same archetype across traditions.',
 },
 {
  slug: 'tripura-sundari',
  order: 3,
  name: 'Tripura Sundari (Shodashi)',
  sanskrit: 'त्रिपुर सुन्दरी / षोडशी',
  epithet: 'Beauty of the Three Worlds / The Sixteen-Year-Old',
  colorHex: '#dc2626',
  colorName: 'Crimson red',
  element: 'Tejas (fire) — radiant beauty',
  direction: 'Center (Sri Yantra)',
  consort: 'Kameshwara (Shiva as desire)',
  cosmicFunction: 'Cosmic beauty, attraction, love. The Sri Vidya supreme — heart of Devi worship.',
  mantra: 'ॐ ऐं ह्रीं श्रीं श्रीं ह्रीं ऐं नमः',
  mantraEnglish: 'Om Aim Hrim Shrim Shrim Hrim Aim Namah',
  beejMantra: 'श्रीं (Shrim) + 15-syllable Panchadashi mantra',
  mool: 'क ए ई ल ह्रीं ह स क ह ल ह्रीं स क ल ह्रीं (Panchadashi)',
  worshipDay: 'Full moon (Purnima), especially Magha & Chaitra Purnima',
  origin:
   'Manifested from the union of pure consciousness (Shiva) and pure energy (Shakti) — the cosmic feminine in her most beautiful 16-year-old form. The third Mahavidya, supreme of the auspicious-line (Saumya) goddesses. Her yantra is the Sri Chakra — most sacred geometric meditation device in Tantra.',
  iconography:
   'Four-armed, red complexion, seated on a lotus on Shiva who lies on a couch supported by 4 gods (Brahma, Vishnu, Rudra, Ishvara). Hands hold: noose, goad, bow, arrows (of love). Crowned with crescent moon, three eyes, eternal sixteen-year-old beauty.',
  sadhanaGoal:
   'Sri Vidya — the supreme householder-friendly tantric path. All material + spiritual abundance, beauty, harmony, fulfilment of dharmic desires, eventual moksha through prema (love).',
  grants: [
   'All abundance — wealth, beauty, fame, love',
   'Harmonious marriage and family',
   'Spiritual progress through bhakti and Sri Yantra worship',
   'Eligibility for Bhagavan-realization',
  ],
  cautions: [
   'Sri Vidya path requires initiation (diksha) into the Panchadashi mantra',
   'Householders may safely worship Lalita Sahasranama daily without initiation',
  ],
  famousShrines: ['Tripura Sundari Temple Udaipur (Tripura)', 'Kanchi Kamakshi (TN)', 'Madurai Meenakshi (TN — same archetype)'],
  connection: 'Same as Lalita Tripurasundari / Rajarajeshwari / Kamakshi / Meenakshi across regions.',
 },
 {
  slug: 'bhuvaneshwari',
  order: 4,
  name: 'Bhuvaneshwari',
  sanskrit: 'भुवनेश्वरी',
  epithet: 'Queen of the Universe / She whose body is the Cosmos',
  colorHex: '#f59e0b',
  colorName: 'Golden dawn',
  element: 'Prithvi (earth) — manifest cosmos',
  direction: 'Above (sovereign of all)',
  consort: 'Trayambakeshwara (3-eyed Shiva)',
  cosmicFunction: 'The cosmic queen who pervades all 14 lokas. The visible universe is her body.',
  mantra: 'ॐ ह्रीं भुवनेश्वर्यै नमः',
  mantraEnglish: 'Om Hrim Bhuvaneshwaryai Namah',
  beejMantra: 'ह्रीं (Hrim)',
  mool: 'ह्रीं भुवनेश्वर्यै ह्रीं फट् स्वाहा',
  worshipDay: 'Tuesday & Friday; Bhuvaneshwari Jayanti (Bhadrapada Shukla Ashtami)',
  origin:
   'After creation, the Adi-Shakti took this form — the cosmic queen who governs all 14 lokas (worlds) including all gods, demons, humans, beasts. Brahma, Vishnu, Shiva are aspects of her play. The fourth Mahavidya, supreme sovereign goddess.',
  iconography:
   'Four-armed, golden complexion like rising sun, seated on a lotus throne. Hands hold: noose, goad, abhaya, varada. Crowned, three eyes, smiling, full breasts indicating cosmic mother. Wears red sari, much ornamentation.',
  sadhanaGoal:
   'Sovereign mastery over one\'s world — career, family, kingdom, business. Cosmic queenly authority. The path of householder-king-ruler.',
  grants: [
   'Authority and leadership in chosen domain',
   'Mastery over staff, employees, students, subjects',
   'Recovery of lost kingdom / business / status',
   'Worldly success without spiritual loss',
  ],
  cautions: [
   'Mantra-only sadhana safe for all householders',
   'Yantra worship (Bhuvaneshwari Yantra) needs initiation',
  ],
  famousShrines: ['Bhuvaneshwari Mandir Pushkar (Raj)', 'Bhuvaneshwar Lingaraj area (Odisha)', 'Bhuvaneshwari Mandir Gauhati (Assam)'],
  connection: 'Considered the manifest-form of Adi-Shakti — closely related to Annapurna.',
 },
 {
  slug: 'bhairavi',
  order: 5,
  name: 'Bhairavi',
  sanskrit: 'भैरवी',
  epithet: 'The Fierce / Goddess of Tapas',
  colorHex: '#7c2d12',
  colorName: 'Smouldering red-brown',
  element: 'Tejas (fire) — austerity heat',
  direction: 'South',
  consort: 'Kala Bhairava (terrible form of Shiva)',
  cosmicFunction: 'Destruction through tapas-fire. Withdrawal of universe at pralaya. Patron of tantric sadhakas.',
  mantra: 'ॐ ह्रीं भैरव्यै नमः',
  mantraEnglish: 'Om Hrim Bhairavyai Namah',
  beejMantra: 'ह्स्रैं ह्स्क्ल्रीं ह्स्रौः (advanced)',
  mool: 'ह्स्रैं ह्स्क्ल्रीं ह्स्रौः भैरव्यै नमः',
  worshipDay: 'Krishna paksha (waning fortnight) Ashtami; Kalashtami',
  origin:
   'Emerged when tapas of accumulated saints required a personification of inner heat. Patron of fierce tantric sadhana, austerity, withdrawal of universe at pralaya. Fifth Mahavidya, fiercest after Kali.',
  iconography:
   'Four-armed, smouldering crimson body like 10,000 rising suns, seated on a lotus on a corpse. Hands hold: japa mala, book (Vedas), abhaya, varada. Crescent moon, three eyes, garland of severed heads. Both terrifying and compassionate to her devotee.',
  sadhanaGoal:
   'Mastery of tapas, withdrawal of senses (pratyahara), spiritual purification through fire. Reaches moksha by burning all sanskaras.',
  grants: [
   'Power to complete severe vows and fasts',
   'Tapas-shakti (austerity strength)',
   'Burning away of past sins',
   'Mastery of one\'s senses',
  ],
  cautions: [
   'Fierce sadhana — householders restrict to mantra & namaskar',
   'Tantric kavacha and yantra need guru initiation',
  ],
  famousShrines: ['Bhairavi Mandir Pushkar (Raj)', 'Bhairavi Mandir Varanasi (UP)'],
  connection: 'Paired with Kala Bhairava — both worshipped on Kalashtami.',
 },
 {
  slug: 'chinnamasta',
  order: 6,
  name: 'Chinnamasta',
  sanskrit: 'छिन्नमस्ता',
  epithet: 'The Self-Decapitated Goddess',
  colorHex: '#be185d',
  colorName: 'Blood crimson',
  element: 'Tejas (sacrificial fire)',
  direction: 'South',
  consort: 'Chhinna-mastaka (decapitated Shiva)',
  cosmicFunction: 'Self-sacrifice. The cycle of creation-feeding-destruction in one image. Supreme symbol of egoless giving.',
  mantra: 'श्रीं ह्रीं क्लीं ऐं वज्रवैरोचनीये ह्रूं ह्रूं फट् स्वाहा',
  mantraEnglish: 'Shrim Hrim Klim Aim Vajravairochaniye Hum Hum Phat Svaha',
  beejMantra: 'ह्रीं (Hrim)',
  mool: 'ॐ श्रीं ह्रीं क्लीं ऐं वज्रवैरोचनीये ह्रूं ह्रूं फट् स्वाहा',
  worshipDay: 'Vaishakha Shukla Chaturdashi (Chinnamasta Jayanti)',
  origin:
   'Once she went bathing with her two attendant yoginis (Dakini and Varnini). When they became unbearably hungry, the compassionate goddess severed her own head with her own sword. Three streams of blood spurted from her neck — one fed each yogini, the third her own severed mouth. The supreme symbol of egoless self-sacrifice.',
  iconography:
   'Three-figured: Chinnamasta stands on a copulating couple (Kama + Rati), beheading her own head with a sword in her right hand, holding her severed head in her left. Three streams of blood — feeding her two yoginis and her own mouth. Garland of skulls. Fierce, naked, blood-crimson.',
  sadhanaGoal:
   'Awakening of Kundalini, breakthrough of ego, courage to give until depletion, fearless self-sacrifice for higher cause.',
  grants: [
   'Awakening of Kundalini Shakti',
   'Courage for radical self-sacrifice',
   'Ability to give without remainder',
   'Sudden quantum spiritual leap',
  ],
  cautions: [
   'Most esoteric Mahavidya — never worshipped casually',
   'Sadhana strictly with qualified Shakta guru',
   'Householders worship only via 108× japa of mool mantra',
  ],
  famousShrines: ['Chintpurni (HP) — local form', 'Rajrappa Chhinnamasta (Jharkhand)'],
  connection: 'Iconography overlaps with Vajrayana Buddhist Vajrayogini.',
 },
 {
  slug: 'dhumavati',
  order: 7,
  name: 'Dhumavati',
  sanskrit: 'धूमावती',
  epithet: 'The Smoky One / The Widow / Void Goddess',
  colorHex: '#475569',
  colorName: 'Smoke grey',
  element: 'Vayu (wind, breath)',
  direction: 'South-west',
  consort: 'None (the only widowed Mahavidya — beyond all dualities)',
  cosmicFunction: 'The void from which creation emerges and into which it dissolves. Pralaya state.',
  mantra: 'ॐ धूं धूं धूमावत्यै स्वाहा',
  mantraEnglish: 'Om Dhum Dhum Dhumavatyai Svaha',
  beejMantra: 'धूं (Dhum)',
  mool: 'धूं धूं धूमावती देव्यै स्वाहा',
  worshipDay: 'Jyestha Shukla Ashtami (Dhumavati Jayanti)',
  origin:
   'When Sati was insulted by her father Daksha she devoured her own husband Shiva from intense hunger — then realised her error and vomited him back. From that moment she became Dhumavati — widowed, smoke-emerged, beyond all auspiciousness. The void state of cosmos at pralaya. Seventh Mahavidya.',
  iconography:
   'Old widow, smoky pale grey body, dishevelled hair, missing teeth, long crooked nose, pendulous breasts, riding a horseless chariot bearing a crow banner. Holds winnowing basket. Always hungry, always smoking. The most inauspicious-looking yet liberating Mahavidya.',
  sadhanaGoal:
   'Realisation of void (shunyata), detachment from all forms, freedom from desire. Path of renunciate / widow / sannyasi.',
  grants: [
   'Freedom from desire and attachment',
   'Protection during dangerous times',
   'Removal of enemies through their own karma',
   'Liberation through detachment',
  ],
  cautions: [
   'Married women & children traditionally do NOT worship Dhumavati',
   'Reserved for widows, sannyasis, and advanced sadhakas',
   'Worshipped outside the home, never in domestic shrine',
  ],
  famousShrines: ['Dhumavati Mandir Varanasi (UP) — only major shrine'],
  connection: 'Cosmic complement to Tripura Sundari (form vs formless).',
 },
 {
  slug: 'bagalamukhi',
  order: 8,
  name: 'Bagalamukhi',
  sanskrit: 'बगलामुखी',
  epithet: 'The Crane-faced / Paralyzer of Enemies',
  colorHex: '#eab308',
  colorName: 'Brilliant yellow',
  element: 'Akasha (subtle space — sound)',
  direction: 'North',
  consort: 'Maharudra (Shiva as roar)',
  cosmicFunction: 'Stambhana — paralysis of motion, speech, intention. Stops enemies and ego-pulse alike.',
  mantra: 'ॐ ह्लीं बगलामुखी सर्वदुष्टानां वाचं मुखं पदं स्तम्भय जिह्वां कीलय बुद्धिं विनाशय ह्लीं ॐ स्वाहा',
  mantraEnglish: 'Om Hlim Bagalamukhi sarvadushtanam vacham mukham padam stambhaya jihvam kilaya buddhim vinashaya Hlim Om Svaha',
  beejMantra: 'ह्लीं (Hlim)',
  mool: 'ह्लीं बगलामुखी देव्यै नमः',
  worshipDay: 'Tuesday; Bagalamukhi Jayanti (Vaishakha Shukla Ashtami)',
  origin:
   'When the universe faced annihilation by a destructive storm, the gods invoked the goddess. She arose from a golden lotus in the Haridra-sarovar (turmeric lake), with crane-face and golden body. She seized the demon\'s tongue and paralyzed his speech — halting destruction. Eighth Mahavidya, ultimate stambhana shakti.',
  iconography:
   'Two-armed, brilliant yellow body, seated on a golden throne in the midst of a lake of nectar. Right hand grips an enemy\'s tongue, left hand strikes him with a mace. Crane-face (bagala). Yellow sari, yellow lotus. Three eyes, smiling.',
  sadhanaGoal:
   'Stambhana — power to paralyze enemies, win lawsuits, defeat opposition in debate, stop slander, freeze hostile action. Inwardly: stilling mental chatter.',
  grants: [
   'Victory in lawsuits and disputes',
   'Defeat of slanderers',
   'Mastery over speech and debate',
   'Stilling of obsessive thought',
  ],
  cautions: [
   'Must not be worshipped to harm innocents — karmic backlash severe',
   'Yellow clothes, turmeric water, yellow flowers, yellow food during sadhana',
   'Initiation recommended for full mool mantra',
  ],
  famousShrines: ['Bagalamukhi Datia (MP)', 'Bagalamukhi Nalkheda (MP)', 'Bagalamukhi Kangra (HP)'],
  connection: 'Most-invoked Mahavidya by lawyers, politicians, debaters.',
 },
 {
  slug: 'matangi',
  order: 9,
  name: 'Matangi',
  sanskrit: 'मातङ्गी',
  epithet: 'The Outcaste / Goddess of Speech',
  colorHex: '#15803d',
  colorName: 'Deep emerald',
  element: 'Akasha (subtle space)',
  direction: 'South-east',
  consort: 'Matanga Shiva',
  cosmicFunction: 'Pollution-transcending speech-shakti. Patroness of music, dance, art, outsiders.',
  mantra: 'ॐ ह्रीं ऐं श्रीं नमो भगवती उच्छिष्ट चाण्डालि श्री मातङ्गेश्वरी सर्वजन वशङ्करि स्वाहा',
  mantraEnglish: 'Om Hrim Aim Shrim namo bhagavati ucchishta chandali Sri Matangeshwari sarvajana vashankari svaha',
  beejMantra: 'ऐं (Aim)',
  mool: 'ऐं श्रीं ह्रीं मातङ्ग्यै नमः',
  worshipDay: 'Chaitra Shukla Tritiya (Matangi Jayanti)',
  origin:
   'Once Vishnu and Lakshmi visited Shiva with food offerings. The crumbs that fell to the ground transformed into a beautiful dark-emerald maiden — the outcaste goddess Matangi. She accepted the leftover (ucchishta) food — the food considered impure. Hence she is the goddess who transcends caste, ritual purity, and social hierarchy. Patroness of music, art, speech, and all those born outside the conventional order. Ninth Mahavidya.',
  iconography:
   'Four-armed, dark emerald complexion, seated on a corpse or lotus. Hands hold: noose, sword, goad, club. Crown adorned with crescent moon, parrot on her shoulder (speech), garlanded with red flowers. Smiling, sensuous, in dancing posture.',
  sadhanaGoal:
   'Vak siddhi — mastery of speech, music, poetry. Crossing social and ritual barriers. Patroness of art, performance, language.',
  grants: [
   'Mastery of music, poetry, public speaking',
   'Power over those who speak against you',
   'Freedom from caste / class restriction (inner)',
   'Success in artistic profession',
  ],
  cautions: [
   'Worshipped with leftover food (ucchishta) — opposite of normal ritual purity',
   'Sadhana style very different from Vedic — householders use mantra-only path',
  ],
  famousShrines: ['Matangi Mandir Varanasi', 'Tiruvannamalai Matangi shrine (TN)'],
  connection: 'Considered tantric form of Saraswati — speech goddess outside Vedic frame.',
 },
 {
  slug: 'kamala',
  order: 10,
  name: 'Kamala',
  sanskrit: 'कमला',
  epithet: 'The Lotus Goddess / Tantric Lakshmi',
  colorHex: '#ec4899',
  colorName: 'Lotus pink',
  element: 'Jala (water)',
  direction: 'East',
  consort: 'Vishnu (in tantric form)',
  cosmicFunction: 'All abundance — material, sensual, spiritual. The tenth and final Mahavidya, closing the circle with auspiciousness.',
  mantra: 'ॐ श्रीं ह्रीं श्रीं कमले कमलालये प्रसीद प्रसीद श्रीं ह्रीं श्रीं ॐ महालक्ष्म्यै नमः',
  mantraEnglish: 'Om Shrim Hrim Shrim Kamale Kamalalaye prasida prasida Shrim Hrim Shrim Om Mahalakshmyai Namah',
  beejMantra: 'श्रीं (Shrim)',
  mool: 'ॐ श्रीं ह्रीं श्रीं कमले कमलालये प्रसीद प्रसीद श्रीं ह्रीं श्रीं ॐ',
  worshipDay: 'Friday; Bhadrapada Shukla Ashtami (Kamala Jayanti); Diwali',
  origin:
   'When Vishnu took avatara as Krishna, the goddess Lakshmi descended in her tantric form as Kamala to enrich the cosmos with material and spiritual abundance simultaneously. Tenth and final Mahavidya — closing the cycle that began with fierce Kali. From void to fullness.',
  iconography:
   'Four-armed, pink-gold complexion, seated on a lotus throne in the midst of a lake of lotuses. Two upper hands hold lotuses, two lower hands give abhaya and varada. Four elephants pour amrita over her head from gold pots. Crown, ornaments, eternal smile.',
  sadhanaGoal:
   'Material and spiritual abundance through dharmic effort. Householder path of righteous wealth, beauty, harmony, fertility — without sacrificing moksha-orientation.',
  grants: [
   'All abundance — wealth, fertility, beauty',
   'Harmony in family and marriage',
   'Success in business and agriculture',
   'Eventual liberation through dharmic prosperity',
  ],
  cautions: [
   'Safest Mahavidya for all householders — no special restrictions',
   'Pink/red flowers, lotus offerings, white sweets standard',
  ],
  famousShrines: ['Mahalakshmi Kolhapur (Maharashtra)', 'Padmavati Tirupati', 'Kamala Mandir Varanasi'],
  connection: 'Tantric counterpart of Vaidik Mahalakshmi — same energy, esoteric form.',
 },
];

export function getMahavidya(slug: string): Mahavidya | undefined {
 return MAHAVIDYAS.find((m) => m.slug === slug);
}

export const MAHAVIDYA_GROUPS = [
 {
  name: 'Ugra / Krodha (Fierce-line)',
  forms: ['kali', 'tara', 'bhairavi', 'chinnamasta', 'dhumavati'] as MahavidyaSlug[],
  description:
   'Fierce, tantric, transformative through destruction of ego. Sadhana traditionally for sannyasis and initiated sadhakas.',
 },
 {
  name: 'Saumya / Shanti (Auspicious-line)',
  forms: ['tripura-sundari', 'bhuvaneshwari', 'bagalamukhi', 'matangi', 'kamala'] as MahavidyaSlug[],
  description:
   'Beautiful, householder-friendly, transformative through love and abundance. Suitable for grihastha sadhana.',
 },
] as const;
