// Chalisa dictionary — 40-verse devotional hymns. Drives /chalisa/[slug].
// Targets massive long-tail "hanuman chalisa", "shiv chalisa", "durga chalisa".
// Full text excerpts; for liturgical precision, devotees should refer to
// printed Geeta Press editions — we link to authoritative sources.

export interface ChalisaInfo {
  slug: string;
  name: string;
  sanskrit: string;
  deity: string;
  deitySlug?: string;
  composer: string;
  composedIn: string; // language of composition
  whenRecited: string;
  description: string;
  significance: string;
  benefits: string[];
  excerpt: string[]; // 4-6 most-known opening verses in Devanagari
  excerptMeaning: string;
  durationMinutes: number;
  relatedPujas: string[];
  externalSources: { label: string; url: string }[];
}

export const CHALISAS: ChalisaInfo[] = [
  {
    slug: 'hanuman-chalisa',
    name: 'Hanuman Chalisa',
    sanskrit: 'हनुमान चालीसा',
    deity: 'Lord Hanuman',
    deitySlug: 'hanuman',
    composer: 'Goswami Tulsidas',
    composedIn: 'Awadhi (16th century)',
    whenRecited: 'Tuesdays, Saturdays, Hanuman Jayanti, daily morning',
    description:
      'The most-recited Hindu devotional hymn worldwide. 40 chaupais (quatrains) bookended by 2 dohas (couplets). Composed by Goswami Tulsidas, also author of Ramcharitmanas. Recited daily by millions across India and the diaspora.',
    significance:
      'Believed to remove fear, grant strength and courage, and protect against negative influences. Hanuman, the eternal devotee of Lord Rama, embodies devotion (bhakti), strength (shakti), and selfless service (seva). Regular recitation is said to bring peace of mind and dissolve obstacles.',
    benefits: [
      'Relief from fear, anxiety, and depression',
      'Protection from negative energies and evil eye',
      'Strength to overcome obstacles in career and personal life',
      'Better focus and discipline',
      'Said to grant Hanuman ji\'s blessings within 40 days of daily recitation',
    ],
    excerpt: [
      'श्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि।',
      'बरनउँ रघुबर बिमल जसु, जो दायकु फल चारि॥',
      'बुद्धिहीन तनु जानिकै, सुमिरौं पवन-कुमार।',
      'बल बुद्धि बिद्या देहु मोहिं, हरहु कलेस बिकार॥',
      'जय हनुमान ज्ञान गुन सागर। जय कपीस तिहुँ लोक उजागर॥',
      'राम दूत अतुलित बल धामा। अंजनि-पुत्र पवनसुत नामा॥',
      'महाबीर बिक्रम बजरंगी। कुमति निवार सुमति के संगी॥',
      'कंचन बरन बिराज सुबेसा। कानन कुंडल कुंचित केसा॥',
    ],
    excerptMeaning:
      'Cleansing the mirror of my mind with the dust of my Guru\'s lotus feet, I narrate the pure glory of Raghuvara, granter of the four fruits of life. Knowing my body to be devoid of intelligence, I remember the son of the Wind. Grant me strength, intellect, and knowledge, and remove my afflictions. Victory to Hanuman, ocean of wisdom and virtue! Victory to the Lord of monkeys, illuminator of the three worlds! Messenger of Rama, abode of immeasurable strength, son of Anjani, son of the wind. The great hero, mighty as a thunderbolt, dispeller of foolishness and companion of the wise. Golden-hued, splendidly attired, with earrings in his ears and curly hair.',
    durationMinutes: 12,
    relatedPujas: ['sundarkand-path', 'hanuman-chalisa-path'],
    externalSources: [
      { label: 'Geeta Press Gorakhpur (authoritative)', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'ganesh-chalisa',
    name: 'Ganesh Chalisa',
    sanskrit: 'गणेश चालीसा',
    deity: 'Lord Ganesha',
    deitySlug: 'ganesha',
    composer: 'Traditional',
    composedIn: 'Hindi / Sanskrit',
    whenRecited: 'Wednesdays, Ganesh Chaturthi, before starting new ventures',
    description:
      '40-verse devotional hymn to Lord Ganesha — the remover of obstacles. Recited before exams, business launches, weddings, and any auspicious new beginning.',
    significance:
      'Ganesha is invoked first in every Hindu ritual. Reciting his chalisa is said to clear obstacles (vighna), grant intelligence (buddhi), and ensure success (siddhi). Particularly powerful during Ganesh Chaturthi.',
    benefits: [
      'Removal of obstacles in business, career, education',
      'Success in new ventures',
      'Improvement in concentration and memory',
      'Harmony in family relationships',
    ],
    excerpt: [
      'जय गणपति सदगुण सदन, कविवर बदन कृपाल।',
      'विघ्न हरण मंगल करण, जय जय गिरिजालाल॥',
      'जय जय जय गणपति गणराजू। मंगल भरण करण शुभ काजू॥',
      'जय गजबदन सदन सुखदाता। विश्व विनायक बुद्धि विधाता॥',
      'वक्र तुंड शुचि शुंड सुहावन। तिलक त्रिपुंड भाल मन भावन॥',
      'राजत मणि मुक्तन उर माला। स्वर्ण मुकुट शिर नयन विशाला॥',
    ],
    excerptMeaning:
      'Victory to Ganapati, abode of virtues, merciful-faced, eloquent. Remover of obstacles, bestower of auspiciousness — hail thou son of Girija (Parvati). Victory, victory, victory to Ganapati, leader of the ganas, who blesses auspicious tasks. Elephant-faced one, abode of joy, lord of the universe and creator of intellect. With curved trunk pure and beautiful, three-lined sacred mark on the forehead. Necklace of gems and pearls upon his chest, golden crown on his head, large eyes.',
    durationMinutes: 10,
    relatedPujas: ['ganesh-puja'],
    externalSources: [
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'shiv-chalisa',
    name: 'Shiv Chalisa',
    sanskrit: 'शिव चालीसा',
    deity: 'Lord Shiva',
    deitySlug: 'shiva',
    composer: 'Ayodhyadas',
    composedIn: 'Hindi',
    whenRecited: 'Mondays, Sawan month, Maha Shivratri, Pradosh',
    description:
      '40-verse chalisa to Lord Shiva — the Destroyer in the Trimurti. Composed in Awadhi-Hindi by Ayodhyadas. Recited especially during the holy month of Sawan and on Mondays.',
    significance:
      'Shiva is the most accessible deity in Hindu tradition — said to be quickly pleased by sincere devotion. Reciting Shiv Chalisa with Bilva leaves and water offering brings peace, health, and liberation from worldly bondage.',
    benefits: [
      'Removal of doshas (Mangal, Shani, Kaal Sarp)',
      'Liberation from disease and fear of death',
      'Peace of mind and spiritual progress',
      'Marital harmony — especially when recited by women seeking a partner like Shiva',
    ],
    excerpt: [
      'जय गणेश गिरिजा सुवन, मंगल मूल सुजान।',
      'कहत अयोध्यादास तुम, देहु अभय वरदान॥',
      'जय गिरिजा पति दीन दयाला। सदा करत संतन प्रतिपाला॥',
      'भाल चन्द्रमा सोहत नीके। कानन कुंडल नागफनी के॥',
      'अंग गौर शिर गंग बहाये। मुंडमाल तन क्षार लगाये॥',
      'वस्त्र खाल बाघम्बर सोहे। छवि को देखि नाग मुनि मोहे॥',
    ],
    excerptMeaning:
      'Victory to Ganesha, son of Girija, root of all auspiciousness, all-knowing. Ayodhyadas prays — grant me your fearless boon. Victory to the husband of Girija, merciful to the meek, ever-protector of saints. Moon shines beautifully on his forehead, serpent-hooded earrings in his ears. Fair-bodied, Ganga flowing from his head, garland of skulls, ash smeared on his body. Tiger-skin robe — even nagas and sages are enchanted by his form.',
    durationMinutes: 10,
    relatedPujas: ['rudrabhishek', 'maha-mrityunjaya', 'kaal-sarp-dosh'],
    externalSources: [
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'durga-chalisa',
    name: 'Durga Chalisa',
    sanskrit: 'दुर्गा चालीसा',
    deity: 'Maa Durga',
    deitySlug: 'devi',
    composer: 'Devidas',
    composedIn: 'Hindi',
    whenRecited: 'Navaratri (both Chaitra and Sharad), Fridays, Ashtami',
    description:
      '40-verse chalisa to the Divine Mother — Maa Durga in her many forms. Composed by Devidas. The principal devotional text for Navaratri alongside Durga Saptashati.',
    significance:
      'Durga is the source of all shakti (power) and the protector against evil. Her chalisa is recited for strength, protection, removal of obstacles, and victory over enemies (both inner and outer). Especially powerful during the nine nights of Navaratri.',
    benefits: [
      'Protection from negative forces and enemies',
      'Strength to face challenges',
      'Removal of financial difficulties',
      'Blessings for marriage and progeny',
      'Victory in legal and competitive matters',
    ],
    excerpt: [
      'नमो नमो दुर्गे सुख करनी। नमो नमो अम्बे दुख हरनी॥',
      'निरंकार है ज्योति तुम्हारी। तिहूँ लोक फैली उजियारी॥',
      'शशि ललाट मुख महाविशाला। नेत्र लाल भृकुटी विकराला॥',
      'रूप मातु को अधिक सुहावे। दरश करत जन अति सुख पावे॥',
      'तुम संसार शक्ति लय कीना। पालन हेतु अन्न धन दीना॥',
      'अन्नपूर्णा हुई जग पाला। तुम ही आदि सुन्दरी बाला॥',
    ],
    excerptMeaning:
      'Salutations, salutations to Durga, granter of joy. Salutations, salutations to Amba, dispeller of sorrow. Your light is formless — its brilliance fills all three worlds. Moon on your forehead, vast face, red eyes, fierce eyebrows. The Mother\'s form is supremely beautiful — those who behold it find profound joy. You created the energy of the universe and gave food and wealth for its sustenance. As Annapurna you feed the world — you are also the primordial young maiden.',
    durationMinutes: 11,
    relatedPujas: ['durga-puja', 'navaratri-puja'],
    externalSources: [
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'sai-chalisa',
    name: 'Sai Chalisa',
    sanskrit: 'साईं चालीसा',
    deity: 'Shirdi Sai Baba',
    composer: 'Traditional',
    composedIn: 'Hindi',
    whenRecited: 'Thursdays, Gurupurnima, Sai Baba Jayanti',
    description:
      '40-verse chalisa to Shirdi Sai Baba (1838-1918) — the saint of Shirdi revered by both Hindu and Muslim devotees. Famous for his message Sabka Malik Ek — One God for all.',
    significance:
      'Sai Baba transcends religious boundaries. His chalisa is recited for solving day-to-day problems, healing, and surrendering anxieties to a higher power. Thursdays are sacred to him.',
    benefits: [
      'Resolution of long-standing problems through faith and patience',
      'Healing — physical, mental, and emotional',
      'Material needs met when surrendered with faith',
      'Spiritual progress through surrender (Shraddha) and patience (Saburi)',
    ],
    excerpt: [
      'पहले साईं के चरणों में, अपना शीश नमाऊँ।',
      'कैसे शिर्डी साईं आये, सारा हाल सुनाऊँ॥',
      'कौन है माता पिता, कौन है उनका धाम।',
      'क्या है उनका जन्म स्थल, कहो साईं का नाम॥',
      'कोई न जाने कुछ इस का, क्या साईं अवतार।',
      'क्या कारण से धरा है, उनने अवतार॥',
    ],
    excerptMeaning:
      'First I bow my head at Sai\'s feet. I shall narrate how Sai came to Shirdi. Who is his mother, who his father, what is his abode? What is his birthplace, what is Sai\'s name? No one knows any of this — what kind of avatar is Sai? For what reason did he take this incarnation?',
    durationMinutes: 9,
    relatedPujas: ['sai-baba-puja'],
    externalSources: [
      { label: 'Shri Sai Satcharitra (canonical biography)', url: 'https://www.sai.org.in' },
    ],
  },
  {
    slug: 'krishna-chalisa',
    name: 'Krishna Chalisa',
    sanskrit: 'कृष्ण चालीसा',
    deity: 'Lord Krishna',
    deitySlug: 'krishna',
    composer: 'Traditional (attributed to various 18th-19th century devotee-poets)',
    composedIn: 'Awadhi-Hindi mix',
    whenRecited: 'Janmashtami, Krishna Paksha Ashtami, Thursdays, daily for Braj devotees',
    description:
      '40-verse hymn to Lord Krishna covering his birth at Mathura, childhood leelas in Vrindavan, slaying of demons (Putana, Kaliya, Kamsa), the Bhagavad Gita discourse at Kurukshetra, and his role as the eighth avatar of Vishnu. Sung at every Krishna temple during Janmashtami midnight aarti.',
    significance:
      'Frees the devotee from the eight kinds of bondage (ashta-bandhan) and grants worldly happiness alongside the path of bhakti. Particularly powerful when recited 11 times during Krishna Janmashtami fast or before a major decision concerning love, marriage, or career change.',
    benefits: [
      'Resolves disputes in love and marriage',
      'Removes fear of enemies and litigation (per Bhagavad Gita 18.66)',
      'Grants peace of mind and clarity in confusion',
      'Believed to bring children to childless couples (per Putradayaka Krishna tradition)',
      'Aids in the cultivation of bhakti and surrender',
    ],
    excerpt: [
      'श्री गणेशाय नमः। श्री राधा-कृष्णाय नमः॥',
      'बंशी शोभित कर मधुर, नील जलज तनु श्याम।',
      'अरुण अधर जनु बिम्बफल, नयन कमल अभिराम॥',
      'पूर्ण इन्द्र, अरविन्द मुख, पीताम्बर शुभ साज।',
      'जय मनमोहन मदन छवि, कृष्णचन्द्र महाराज॥',
      'जय यदुनन्दन जय जगवन्दन। जय वसुदेव देवकी नन्दन॥',
    ],
    excerptMeaning:
      'Salutations to Ganesha. Salutations to Radha-Krishna. Holding the sweet flute in his hand, dark-bodied like the blue lotus. Lips ruddy like the bimba fruit, eyes lovely as lotuses. Face like a full moon and lotus, adorned with yellow pitambar. Glory to Manmohan, charming as Madana (Cupid) — Krishna Chandra Maharaj. Glory to the Yadu-prince, glory to the one worshipped by the world, glory to the son of Vasudeva and Devaki.',
    durationMinutes: 8,
    relatedPujas: ['janmashtami-puja', 'krishna-abhishek'],
    externalSources: [
      { label: 'Geeta Press Krishna Chalisa edition', url: 'https://gitapress.org' },
    ],
  },
  {
    slug: 'lakshmi-chalisa',
    name: 'Lakshmi Chalisa (Shri Lakshmi Chalisa)',
    sanskrit: 'श्री लक्ष्मी चालीसा',
    deity: 'Maa Lakshmi',
    deitySlug: 'lakshmi',
    composer: 'Sundardas (traditional attribution, 17th century)',
    composedIn: 'Brajbhasha-Hindi',
    whenRecited: 'Fridays, Diwali night, Akshaya Tritiya, Kojagari Purnima, before new business ventures',
    description:
      'Recited at the start of every new business, on Diwali Lakshmi Puja, and on Fridays which are sacred to the goddess. Praises Lakshmi as Vishnu’s consort, daughter of the cosmic ocean (Kshirsagar), and bestower of all eight prosperities (Ashta-Lakshmi).',
    significance:
      'The Lakshmi Chalisa is the principal hymn of the Vaishnava prosperity tradition. Recited 11 or 108 times during Diwali Mahalakshmi puja, accompanied by Sri Suktam, it is believed to invite Lakshmi to reside in the household account-books, safes and grain-stores for the new Samvat year.',
    benefits: [
      'Attracts wealth and removes debt',
      'Resolves obstacles in business and trade',
      'Brings harmony between husband and wife (Lakshmi-Narayan bhava)',
      'Grants the eight forms of prosperity — Adi, Dhana, Dhanya, Gaja, Santana, Veera, Vijaya, Vidya',
      'Recommended for women seeking auspicious married life',
    ],
    excerpt: [
      'मातु लक्ष्मी करि कृपा, करो हृदय में वास।',
      'मनोकामना सिद्ध कर, पुरवहु मेरी आस॥',
      'सिंधु सुता विष्णुप्रिये, नित नूतन सुख देहु।',
      'कमलवासिनी कमलकर, मनवांछित फल देहु॥',
      'जय जय श्री महालक्ष्मी, करूँ मातु तव ध्यान।',
      'सिद्ध बुद्धि सुख-सम्पदा, देहु तुम मातु अमान॥',
    ],
    excerptMeaning:
      'Mother Lakshmi, show your grace and dwell in my heart. Fulfil my desires and complete my hopes. Daughter of the ocean, beloved of Vishnu, grant fresh joys each day. Seated on the lotus, lotus-handed one, grant the wished-for fruit. Glory, glory to Mahalakshmi — I meditate upon you. Grant me wisdom, intelligence, happiness and wealth, O immeasurable Mother.',
    durationMinutes: 7,
    relatedPujas: ['lakshmi-puja', 'diwali-puja', 'sri-suktam-path'],
    externalSources: [
      { label: 'Geeta Press Lakshmi Chalisa', url: 'https://gitapress.org' },
    ],
  },
  {
    slug: 'saraswati-chalisa',
    name: 'Saraswati Chalisa (Shri Saraswati Chalisa)',
    sanskrit: 'श्री सरस्वती चालीसा',
    deity: 'Maa Saraswati',
    deitySlug: 'saraswati',
    composer: 'Traditional (early 20th century printed editions)',
    composedIn: 'Khari Boli Hindi',
    whenRecited: 'Basant Panchami, Vidyarambham, daily by students before study, before exams',
    description:
      '40-verse hymn invoking the goddess of learning, music and speech. Universal among Indian students preparing for board exams, JEE, NEET, UPSC and other competitive tests. Recited daily at music gurukuls before a riyaaz session begins.',
    significance:
      'Saraswati is the only one of the Tridevi (Lakshmi, Parvati, Saraswati) whose worship is uniquely tied to education and the arts. The Chalisa is given to children at the Vidyarambham (initiation into letters) ceremony, traditionally on Vijayadashami in Kerala, and recited every day thereafter through their student years.',
    benefits: [
      'Sharpens memory and concentration',
      'Removes speech impediments and stage fear',
      'Grants success in examinations and academic pursuits',
      'Develops aptitude for music, dance and the fine arts',
      'Believed to clear vak-dosha (impediments caused by harsh speech in past karma)',
    ],
    excerpt: [
      'जनक जननि पद कमल रज, निज मस्तक पर धरि।',
      'बंदहु मातु सरस्वती, बुद्धि बल दे करि॥',
      'पूर्ण जगत में व्याप्त तव, महिमा अमित अनन्तु।',
      'राम सरस मम कीजिए, हे शारदे भगवन्तु॥',
      'जय श्री सकल बुद्धि बलराशी। जय सर्वज्ञ अमर अविनाशी॥',
      'जय जय जय वीणाकर धारी। करती सदा सुहंस सवारी॥',
    ],
    excerptMeaning:
      'Placing on my own head the dust of the lotus-feet of my father and mother, I salute Mother Saraswati — grant me intelligence and strength. Your boundless and infinite glory pervades the whole universe. Make my speech sweet as Rama’s, O divine Sharada. Glory to the embodiment of all wisdom and strength, glory to the omniscient, immortal and imperishable. Glory, glory, glory to the holder of the veena who ever rides the noble swan.',
    durationMinutes: 7,
    relatedPujas: ['saraswati-puja', 'vidyarambham', 'akshara-abhyasam'],
    externalSources: [
      { label: 'Geeta Press Saraswati Chalisa', url: 'https://gitapress.org' },
    ],
  },
  {
    slug: 'vishnu-chalisa',
    name: 'Vishnu Chalisa (Shri Vishnu Chalisa)',
    sanskrit: 'श्री विष्णु चालीसा',
    deity: 'Lord Vishnu',
    deitySlug: 'vishnu',
    composer: 'Sundardas (traditional attribution)',
    composedIn: 'Brajbhasha-Hindi',
    whenRecited: 'Thursdays, Ekadashi, Vaikuntha Ekadashi, Anant Chaturdashi, after Vishnu Sahasranama path',
    description:
      '40-verse hymn praising Vishnu as the preserver of the universe, the lord who rests on the cosmic serpent Sheshanaga upon the milk-ocean, and who incarnates as the ten avatars (Dashavatara) whenever dharma declines. Recited by Vaishnava devotees on Thursdays and all Ekadashi tithis.',
    significance:
      'In the Vaishnava household, Vishnu Chalisa is recited after the heavier Vishnu Sahasranama (1000 names) to seal the path. It is also the principal hymn of the Anant Chaturdashi vrata, when devotees tie a 14-knotted thread on the arm seeking Vishnu’s protection for fourteen years.',
    benefits: [
      'Grants protection from sudden calamity and accidents',
      'Removes the effects of Pitru Dosha and Sarpa Dosha',
      'Brings peace in family and harmony between generations',
      'Believed to sustain employment and livelihood',
      'Recommended during pregnancy for safe childbirth',
    ],
    excerpt: [
      'विष्णु जी की मैं करूँ, चालीसा अब वर्णन।',
      'सुनहु प्रेम से सब जन, मनवांछित फल पावन॥',
      'जय विष्णु भगवान् की महिमा, जग में अमित अनूप।',
      'दीनदयालु कृपा निधान तुम, धर्म धुरंधर भूप॥',
      'जय जय श्री हरि नाथ कृपाला। दीनदयालु दानि दयाला॥',
      'अमित कोटि रवि की छवि न्यारी। शोभित नीलकंठ बनवारी॥',
    ],
    excerptMeaning:
      'I now narrate the Chalisa of Lord Vishnu. Listen with love, all people, and receive the wished-for fruit. Glory — the greatness of Lord Vishnu is boundless and unequalled in the world. Compassionate to the lowly, treasure-house of grace, you are the king who upholds dharma. Glory, glory to Sri Hari, gracious lord, kind to the lowly and generous in mercy. Your splendour exceeds that of countless suns; the blue-throated forester (Krishna form) shines forth.',
    durationMinutes: 8,
    relatedPujas: ['vishnu-sahasranama', 'satyanarayan-puja', 'anant-chaturdashi-vrat'],
    externalSources: [
      { label: 'Geeta Press Vishnu Chalisa', url: 'https://gitapress.org' },
    ],
  },
  {
    slug: 'ram-chalisa',
    name: 'Ram Chalisa (Shri Ram Chalisa)',
    sanskrit: 'श्री राम चालीसा',
    deity: 'Lord Rama',
    deitySlug: 'rama',
    composer: 'Traditional (Tulsidas school)',
    composedIn: 'Awadhi',
    whenRecited: 'Ram Navami, Tuesdays, Thursdays, daily by Ram bhaktas',
    description:
      '40-verse devotional hymn to Rama, the seventh avatar of Vishnu, the ideal son, husband, and king (Maryada Purushottam). Forms part of the daily Rama-bhakti tradition alongside Ramayana Path and Sundarkand. Particularly recited at the new Ram Mandir at Ayodhya and at Ram temples throughout India.',
    significance:
      'Like the Hanuman Chalisa, Ram Chalisa is a portable, recitable digest of the Ramayana’s essential teaching: that dharma succeeds, that surrender to Rama removes all sin, and that the chanting of his name (Ramanama) is itself the highest practice in the Kali Yuga.',
    benefits: [
      'Grants courage, righteousness, and patience',
      'Removes fear of enemies and legal entanglements',
      'Restores broken family relationships (Rama as ideal son and brother)',
      'Believed to expiate the gravest sins through Ramanama',
      'Bestows steady mind and equanimity (sthitaprajna)',
    ],
    excerpt: [
      'श्री रघुवीर भक्त हितकारी। सुन लीजै प्रभु अरज हमारी॥',
      'निशिदिन ध्यान धरै जो कोई। ता सम भक्त और नहिं होई॥',
      'ध्यान धरे शिवजी मन माहीं। ब्रह्म, इन्द्र, पारवै नाहीं॥',
      'जय जय जय श्री राम भवानी। चारों युग जग में हो वानी॥',
      'सोचा था मन में कई बारा। राम भजन से बेड़ा पारा॥',
      'अति विशाल नहिं नाम तिहारो। दीनबंधु भक्तन रखवारो॥',
    ],
    excerptMeaning:
      'O Sri Raghuvira, benefactor of devotees, hear our supplication, O Lord. Whoever holds your meditation day and night — there is no other devotee equal to him. Even Shiva holds your meditation in his mind; Brahma and Indra cannot fathom you. Glory, glory, glory to Sri Rama and Bhavani — through all four ages your name resounds in the world. Many times I have considered in my mind: by chanting Rama, my boat is taken across. Your name is supremely vast, friend of the lowly, protector of devotees.',
    durationMinutes: 8,
    relatedPujas: ['ram-navami-puja', 'ramayana-path', 'sundarkand-path'],
    externalSources: [
      { label: 'Geeta Press Ram Chalisa', url: 'https://gitapress.org' },
    ],
  },
  {
    slug: 'kartikeya-chalisa',
    name: 'Kartikeya Chalisa',
    sanskrit: 'कार्तिकेय चालीसा',
    deity: 'Lord Kartikeya (Skanda / Murugan)',
    deitySlug: 'kartikeya',
    composer: 'Traditional (North Indian recension)',
    composedIn: 'Hindi (with Sanskrit invocations)',
    whenRecited: 'Tuesdays, Skanda Shashthi, Thaipusam, Kartik Purnima, before facing enemies or court cases',
    description:
      '40-verse hymn to Lord Kartikeya, the warrior son of Shiva and Parvati, commander of the celestial armies (Devasenapati). Known as Murugan in the South, Skanda in scriptures, and Subrahmanya in Vedanta — six-faced slayer of the demon Tarakasura, eternal youth bearing the Vel spear.',
    significance:
      'Kartikeya embodies viveka (discrimination), valour, and the vanquishing of ego (Tarakasura symbolises ahamkara). His chalisa is invoked for victory in disputes, protection from black magic, removal of Mangal Dosha, and the awakening of fearless wisdom in spiritual seekers.',
    benefits: [
      'Victory in legal disputes, competitions, and confrontations',
      'Relief from Mangal Dosha and Mars-related afflictions in the kundli',
      'Protection from black magic, tantric attacks, and evil eye',
      'Courage to face adversity and dissolve fear of enemies',
      'Awakening of viveka — the discriminative wisdom that pierces illusion',
      'Blessings for children, especially male progeny per traditional belief',
    ],
    excerpt: [
      'जय जय जय कार्तिकेय गुसाईं। शिव-पारवती के प्यारे भाई॥',
      'षडमुख षडानन छह भुजधारी। तारकासुर के तुम संहारी॥',
      'मयूर वाहन हाथ में भाला। गले विराजे मणियन माला॥',
      'देव सेनापति शूर बलवाना। दुष्ट दलन प्रभु कृपा निधाना॥',
      'जय गिरिजा सुत परम सुजाना। ऋद्धि सिद्धि के तुम वरदाना॥',
      'क्रौंच पर्वत को चीर गिराया। तारक का तुमने मद चूर्ण कराया॥',
    ],
    excerptMeaning:
      'Victory, victory, victory to Lord Kartikeya, beloved brother in the family of Shiva and Parvati. The six-faced one with six countenances and twelve arms, you are the slayer of the demon Tarakasura. Riding the peacock, holding the spear in your hand, a garland of jewels gracing your neck. Commander of the celestial armies, hero of immense strength, destroyer of the wicked and treasury of grace. Victory to the wise son of the mountain-born Parvati, granter of prosperity and supernatural perfection. You cleaved through the Krauncha mountain and shattered the pride of Taraka. Devotees who recite these verses with sincere bhakti receive the fearless spear of viveka that cuts through the ego-demon within, just as your Vel pierced Tarakasura\'s heart on the battlefield of Devaloka.',
    durationMinutes: 10,
    relatedPujas: ['kartikeya-puja', 'mangal-dosha-nivaran', 'skanda-shashthi-vrat'],
    externalSources: [
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
      { label: 'Murugan.org (Tamil tradition)', url: 'https://murugan.org' },
    ],
  },
  {
    slug: 'bhairav-chalisa',
    name: 'Bhairav Chalisa',
    sanskrit: 'भैरव चालीसा',
    deity: 'Kala Bhairava (Bhairavnath)',
    deitySlug: 'bhairav',
    composer: 'Traditional (Kashi tradition)',
    composedIn: 'Hindi / Awadhi',
    whenRecited: 'Sundays, Tuesdays, Bhairav Ashtami, Kala Ashtami of every month, midnight tantric upasana',
    description:
      '40-verse hymn to Kala Bhairava — the fierce form of Shiva, eternal kotwal (police-chief) of Kashi, guardian of time itself. Worshipped as the dispeller of fear, remover of debts, and lord of the eight Bhairavas (Asitanga, Ruru, Chanda, Krodha, Unmatta, Kapala, Bhishana, Samhara).',
    significance:
      'No pilgrim\'s Kashi yatra is complete without seeking Kala Bhairava\'s permission first — he holds the keys to Vishwanath\'s city. His chalisa removes obstacles caused by ancestral curses (pitra dosh), Shani affliction, accumulated debts, and lingering negative entities. Tantric sadhakas invoke him as the gatekeeper of siddhi.',
    benefits: [
      'Removal of debts (rin-mochan) and chronic financial blockages',
      'Protection from accidents, sudden death, and untimely calamity',
      'Relief from Shani Dosha and Pitra Dosha',
      'Banishment of ghosts, negative entities, and tantric attacks',
      'Courage to walk the spiritual path without fear of worldly opposition',
      'Successful completion of Kashi yatra and tantric sadhana',
    ],
    excerpt: [
      'जय जय श्री काल भैरव देवा। करत सदा संतन की सेवा॥',
      'अष्ट भैरव के तुम अधिनायक। काशी पुरी के परम सहायक॥',
      'श्वान सवारी कर में डंडा। दुष्ट जनन को देत प्रचंडा॥',
      'त्रिशूल खप्पर खड्ग सुहावे। कटि करधनी घुंघरू बजावे॥',
      'भूत प्रेत पिशाच भगावे। रोग शोक संताप मिटावे॥',
      'काशी के कोतवाल कहाओ। विश्वनाथ के द्वारपाल लाओ॥',
    ],
    excerptMeaning:
      'Victory, victory to revered Kala Bhairava Deva, who eternally serves the company of saints. You are the supreme lord of the eight Bhairavas and the foremost protector of the holy city of Kashi. Riding upon the dog, wielding the staff in your hand, you unleash fierce justice upon the wicked. The trident, skull-bowl, and sword grace you splendidly; the ankle-bells upon your waist-girdle resound. You banish ghosts, spirits, and demonic possessors, and dissolve disease, grief, and torment. You are hailed as the kotwal of Kashi, the gatekeeper guarding the very threshold of Lord Vishwanath. Devotees who recite these verses with a fearless heart at midnight find their debts dissolved, their enemies silenced, and the path to liberation cleared by the dread lord who guards time itself with his loyal hound and unsheathed blade.',
    durationMinutes: 11,
    relatedPujas: ['bhairav-puja', 'rin-mochan-puja', 'pitra-dosh-shanti', 'kala-ashtami-vrat'],
    externalSources: [
      { label: 'Kashi Vishwanath Temple Trust', url: 'https://shrikashivishwanath.org' },
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'gayatri-chalisa',
    name: 'Gayatri Chalisa',
    sanskrit: 'गायत्री चालीसा',
    deity: 'Maa Gayatri (Veda Mata)',
    deitySlug: 'gayatri',
    composer: 'Traditional (Arya Samaj / Gayatri Pariwar lineage, popularised by Pt. Shriram Sharma Acharya)',
    composedIn: 'Hindi (with Vedic Sanskrit invocations)',
    whenRecited: 'Daily at sunrise (Brahma Muhurta), Gayatri Jayanti (Jyeshtha Purnima), during Sandhya Vandanam',
    description:
      '40-verse hymn extolling Maa Gayatri — the mother of the Vedas, personification of the 24-syllable Gayatri Mantra revealed to Rishi Vishwamitra. She is depicted as five-faced (representing the five pranas) and ten-armed, seated on a swan, embodying pure consciousness and the dawn of inner illumination.',
    significance:
      'Called Veda Mata (mother of the Vedas), Deva Mata (mother of the gods), and Vishwa Mata (mother of the universe). Her chalisa amplifies the power of the Gayatri Mantra — said to purify intellect, awaken intuition, and grant the seeker direct connection with Savitr (the inner Sun). Considered the highest mantra a Brahmin or sadhaka can chant.',
    benefits: [
      'Sharpening of intellect, memory, and academic performance',
      'Awakening of intuitive wisdom (ritambhara prajna)',
      'Purification of past karmas and removal of mental impurities',
      'Success in education, examinations, and intellectual pursuits',
      'Spiritual progress and direct connection to inner divine light',
      'Peace of mind, freedom from anxiety, and balanced emotions',
    ],
    excerpt: [
      'ह्रीं श्रीं क्लीं मेधा प्रभा जीवन ज्योति प्रचण्ड।',
      'शान्ति कान्ति जागृत प्रगति रचना शक्ति अखण्ड॥',
      'जय गायत्री वेद की माता। जय आनन्द सुख शान्ति विधाता॥',
      'भारत में तब अति प्रचलित था। घर घर में तेरा यश ललित था॥',
      'अक्षर चौबीस परम पुनीता। इनमें बसें शास्त्र श्रुति गीता॥',
      'शाश्वत सत्य सनातन वाणी। जो जपते वे ज्ञानी ध्यानी॥',
    ],
    excerptMeaning:
      'Hreem Shreem Kleem — invocations of wisdom, radiance, the fierce flame of life; peace, beauty, awakening, progress, and the unbroken creative shakti. Victory to Gayatri, mother of the Vedas; victory to the bestower of bliss, happiness, and peace. Once you were universally cherished throughout the land of Bharata, your glory celebrated in every household. Your twenty-four syllables are supremely sacred — within them reside all the shastras, the shrutis, and the Bhagavad Gita itself. You are the eternal truth, the timeless sanatana voice; those who chant your mantra become both jnani (wise) and dhyani (meditative). Whoever recites this chalisa with reverence at sunrise dissolves mental impurities, awakens the inner sun of consciousness, and walks the path of Vedic wisdom under the guidance of the universal Mother who illuminated the rishis themselves.',
    durationMinutes: 9,
    relatedPujas: ['gayatri-havan', 'gayatri-mantra-anushthan', 'saraswati-puja'],
    externalSources: [
      { label: 'Gayatri Pariwar (Shantikunj, Haridwar)', url: 'https://www.awgp.org' },
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'surya-chalisa',
    name: 'Surya Chalisa',
    sanskrit: 'सूर्य चालीसा',
    deity: 'Surya Bhagavan (Aditya)',
    deitySlug: 'surya',
    composer: 'Traditional',
    composedIn: 'Hindi / Sanskrit',
    whenRecited: 'Daily at sunrise during Arghya offering, Sundays, Ratha Saptami, Makar Sankranti, Chhath Puja',
    description:
      '40-verse hymn to Surya Bhagavan — the visible deity (pratyaksha devata), soul of the universe (jagatatma), and chief of the nine Navagrahas. Depicted riding a seven-horse chariot driven by Aruna, illuminating all three worlds with his thousand rays. Father of Yama, Shani, Karna, and the Ashvini Kumaras.',
    significance:
      'The only deity directly visible to the naked eye — every Vedic ritual begins with Surya Namaskar. His chalisa cures skin diseases, heart ailments, and eye disorders; strengthens a weak Sun in the kundli (low confidence, poor relationship with father, government opposition); and is the primary remedy for those born with afflicted Sun in the 1st, 5th, 9th, or 10th house.',
    benefits: [
      'Strengthening of a weak Sun in the natal kundli',
      'Cure of skin diseases, heart conditions, and eye disorders',
      'Recognition, fame, and success in government and administrative careers',
      'Improved father-son relationships and paternal blessings',
      'Boost in self-confidence, leadership ability, and personal magnetism',
      'Removal of obstacles in promotions, authority positions, and public recognition',
    ],
    excerpt: [
      'कनक बदन कुण्डल मकर, मुक्ता माला अंग।',
      'पद्मासन स्थित ध्याइए, शंख चक्र के संग॥',
      'जय सविता जय जयति दिवाकर। सहस्रांशु सप्ताश्व तिमिरहर॥',
      'भानु पतंग मरीची भास्कर। सविता हंस सुनूर प्रभाकर॥',
      'त्वष्टा अर्क अरुण भग पूषा। दिवस मणि खग दिनकर ज्योतिषा॥',
      'आदि देव सकल जग वंदित। प्रकट होत हर्षित जन मंडित॥',
    ],
    excerptMeaning:
      'Golden-hued of form, with makara-shaped earrings, a pearl garland gracing your limbs; seated in the lotus posture, meditate upon him bearing the conch and discus. Victory to Savita, victory and victory again to Divakara (maker of the day), thousand-rayed one drawn by seven horses, dispeller of darkness. Bhanu, Patanga, Marichi, Bhaskara — Savita the swan, the beautifully radiant Prabhakara. Tvashta, Arka, Aruna, Bhaga, Pushan — jewel of the day, sky-bird, light-maker, supreme luminary. Primordial deity worshipped by all the worlds, on whose rising the people are joyfully adorned. Devotees who recite these verses while offering Arghya at sunrise dissolve afflictions of the Sun in their horoscope, strengthen the heart and vital force, and receive the recognition, leadership, and paternal grace that flows from the visible witness of all creation.',
    durationMinutes: 10,
    relatedPujas: ['surya-arghya', 'navagraha-shanti', 'ratha-saptami-puja', 'chhath-puja'],
    externalSources: [
      { label: 'Konark Sun Temple (ASI)', url: 'https://asi.nic.in/konark/' },
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'navagraha-chalisa',
    name: 'Navagraha Chalisa',
    sanskrit: 'नवग्रह चालीसा',
    deity: 'Navagraha (Nine Planetary Lords)',
    deitySlug: 'navagraha',
    composer: 'Traditional (Vedic astrological tradition)',
    composedIn: 'Hindi / Sanskrit',
    whenRecited: 'During planetary transits, after kundli analysis revealing dosha, on respective weekdays of each graha, before Navagraha Shanti homa',
    description:
      '40-verse composite hymn invoking all nine planetary lords — Surya, Chandra, Mangal, Budha, Brihaspati (Guru), Shukra, Shani, Rahu, and Ketu. Each graha receives dedicated verses honouring its dignity, vahana, weapon, and the karmic dimension it governs in the human birth chart.',
    significance:
      'The Navagrahas are not malefic forces but cosmic accountants delivering the precise fruits of past karma. This chalisa is the most concise daily remedy for any unidentified planetary affliction — recommended when one cannot afford individual graha pujas or when multiple grahas are simultaneously weak. Recited at Navagraha shrines found in every South Indian temple.',
    benefits: [
      'Pacification of multiple planetary doshas in a single sitting',
      'Reduction of malefic effects during Sade Sati, Kantaka Shani, and Rahu-Ketu transits',
      'Balancing of the entire kundli without requiring nine separate pujas',
      'Protection from sudden misfortune, accidents, and karmic upheavals',
      'Cost-effective daily remedy for those unable to perform full Navagraha homa',
      'Harmony in health, wealth, relationships, and career across life domains',
    ],
    excerpt: [
      'श्री गणपति गुरु गौरी पद, प्रेम सहित धरि माथ।',
      'चालीसा वन्दौं नवग्रह, होहु सकल सुख साथ॥',
      'जय जय रवि शशि सोम बुधा। बृहस्पति शुक्र शनैश्चरा॥',
      'राहु केतु सहित नवग्रह। दीन बन्धु दुख हरण सबग्रह॥',
      'सूर्य सिंहासन स्वर्ण विराजे। मंगल भौम धरा सुत साजे॥',
      'चन्द्र दूज के दर्शन प्यारे। बुध सौम्य सब विद्या के तारे॥',
    ],
    excerptMeaning:
      'Placing upon my head with deepest love the feet of Sri Ganapati, the Guru, and Gauri, I venerate this Chalisa of the Nine Grahas — may all happiness accompany me. Victory, victory to Ravi (Sun), Shashi (Moon), Soma, Budha (Mercury), Brihaspati (Jupiter), Shukra (Venus), and Shanaishchara (Saturn). Along with Rahu and Ketu — all nine grahas, friends of the destitute, dispellers of sorrow for every devotee. Surya is enthroned upon a golden seat; Mangala, the fiery son of the Earth, is splendidly adorned. Chandra of the second-day darshan is most beloved; gentle Budha is the star of all the sciences and learning. Devotees who recite this chalisa daily, especially on the weekday assigned to a troublesome graha, find the karmic accounts of nine planetary forces simultaneously softened, the malefic transits made bearable, and the auspicious yogas of their birth chart enhanced through the grace of the cosmic accountants of dharma.',
    durationMinutes: 12,
    relatedPujas: ['navagraha-shanti-homa', 'graha-dosha-nivaran', 'sade-sati-shanti', 'rahu-ketu-puja'],
    externalSources: [
      { label: 'Suryanar Kovil (Navagraha Temple, Tamil Nadu)', url: 'https://hrce.tn.gov.in' },
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'bajrang-baan',
    name: 'Bajrang Baan',
    sanskrit: 'बजरंग बाण',
    deity: 'Lord Hanuman',
    deitySlug: 'hanuman',
    composer: 'Goswami Tulsidas',
    composedIn: 'Awadhi (16th century)',
    whenRecited: 'Tuesdays, Saturdays, midnight tantric upasana, during severe distress, after enemy attack or black magic',
    description:
      'A fierce 40-verse "arrow-prayer" (baan = arrow) to Hanuman, composed by Goswami Tulsidas as a swift weaponized invocation — distinct from his calmer Hanuman Chalisa. Each verse pierces obstacles like an arrow, commanding Hanuman to act immediately on the devotee\'s behalf. Recited when ordinary chalisa-paath feels insufficient against tantric attack, possession, or grave calamity.',
    significance:
      'Considered the most powerful emergency invocation in the Hanuman tradition. Where the Chalisa praises and meditates, the Baan commands and demands. Sadhakas traditionally recite it 7, 11, or 108 times in a single sitting facing south, with red flowers and sindoor offering, to invoke Hanuman\'s wrathful (raudra) form against malefic forces. Should not be recited casually — meant for moments of true crisis.',
    benefits: [
      'Immediate dispelling of tantric attacks, black magic, and abhichara prayoga',
      'Liberation from ghost possession (bhuta-preta-pishacha badha)',
      'Victory over implacable enemies and legal persecution',
      'Removal of severe Shani and Mangal afflictions',
      'Protection during night travel and dangerous undertakings',
      'Restoration of courage when fear has paralysed the mind',
    ],
    excerpt: [
      'निश्चय प्रेम प्रतीति ते, विनय करैं सनमान।',
      'तेहि के कारज सकल शुभ, सिद्ध करैं हनुमान॥',
      'जय हनुमंत संत हितकारी। सुनि लीजै प्रभु अरज हमारी॥',
      'जन के काज विलंब न कीजै। आतुर दौरि महा सुख दीजै॥',
      'जैसे कूदि सिंधु महि पारा। सुरसा बदन पैठि बिस्तारा॥',
      'आगे जाय लंकिनी रोका। मारेहु लात गई सुर लोका॥',
      'जय जय जय हनुमंत अगाधा। दुख पावत जन केहि अपराधा॥',
      'पूजा जप तप नेम अचारा। नहिं जानत कछु दास तुम्हारा॥',
    ],
    excerptMeaning:
      'With sincere love and faith, offering respectful supplication — for such a devotee, Hanuman accomplishes every auspicious task. Victory to Hanuman, benefactor of saints; hear, O Lord, our earnest petition. Delay not your servant\'s work — rush at once and grant supreme joy. Just as you leapt across the ocean and expanded your form inside Surasa\'s mouth, then struck down Lankini who blocked your path so that she departed to the celestial realm — Victory, victory, victory to fathomless Hanuman! For what offence does your devotee suffer? Of worship, japa, austerity, vows, or conduct — your servant knows nothing; rescue him by your grace alone, O arrow-swift son of the wind, before this very moment passes.',
    durationMinutes: 11,
    relatedPujas: ['hanuman-chalisa-path', 'sundarkand-path', 'bhuta-preta-nivaran'],
    externalSources: [
      { label: 'Geeta Press Gorakhpur (Sankat-Mochan Hanumanashtak collection)', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'narmada-chalisa',
    name: 'Narmada Chalisa',
    sanskrit: 'नर्मदा चालीसा',
    deity: 'Maa Narmada',
    deitySlug: 'narmada',
    composer: 'Traditional (Narmada parikrama tradition, Maheshwar–Omkareshwar lineage)',
    composedIn: 'Hindi / Sanskrit',
    whenRecited: 'Narmada Jayanti (Magha Shukla Saptami), during Narmada Parikrama, daily bath at Narmada ghats, Mondays at Omkareshwar',
    description:
      '40-verse hymn to Maa Narmada — the only river in Hindu tradition whose mere darshan (sight) is said to grant moksha, without the need to bathe. Born from Lord Shiva\'s sweat as he meditated on Mount Mekal, she flows westward 1312 km from Amarkantak to the Arabian Sea, her every stone (banalinga) revered as a self-manifest Shiva linga.',
    significance:
      'Narmada is the only river accorded the full 3600-km circumambulation (parikrama) — pilgrims walk both banks over 3 years 3 months 13 days. Her chalisa accompanies every step of that vow. Reciting it daily is said to grant the merit of bathing in Ganga seven times, and to dissolve the gravest sins through the cooling touch of her white waters.',
    benefits: [
      'Liberation merit equivalent to bathing in Ganga seven times',
      'Pacification of Pitra Dosha and ancestral karmic debts',
      'Cure of chronic skin diseases and inflammatory disorders',
      'Cooling of pitta-related afflictions in body and mind',
      'Successful completion of Narmada Parikrama vow',
      'Spontaneous remembrance at the moment of death (granting moksha)',
    ],
    excerpt: [
      'देवि पूजिता नर्मदा, अमरकंटका वासिनी।',
      'त्रिकाल दर्शनी पुण्या, मोक्ष दात्री नमोस्तुते॥',
      'जय जय नर्मदा भवानी। शिव की पुत्री शुभ कल्याणी॥',
      'मेकल कन्या नाम तुम्हारा। शंकर स्वेद से प्रकट उतारा॥',
      'अमरकंटक से बहती आवो। पश्चिम सागर में मिल जावो॥',
      'दर्शन मात्र से पाप विनाशे। बानलिंग रूप शिव प्रकाशे॥',
    ],
    excerptMeaning:
      'O Devi Narmada, worshipped goddess, dweller at Amarkantak, beheld in the three times of day — most sacred, bestower of liberation, salutations to you. Victory, victory to Narmada Bhavani, daughter of Shiva, auspicious and beneficent. Daughter of Mount Mekal is your name, manifested from Shankara\'s perspiration. From Amarkantak you flow forth, joining the western ocean. By darshan alone all sins are destroyed; every stone in your bed shines as a self-manifest Shiva linga (banalinga). Devotees who recite this chalisa with reverence — whether walking your 3600 km parikrama or remembering you from afar — receive the merit of liberation that you uniquely grant: moksha by sight alone, without the need to even touch your cooling waters.',
    durationMinutes: 9,
    relatedPujas: ['narmada-parikrama-sankalp', 'banalinga-puja', 'pitra-dosh-shanti'],
    externalSources: [
      { label: 'Omkareshwar Jyotirlinga Temple', url: 'https://shriomkareshwar.org' },
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'ganga-chalisa',
    name: 'Ganga Chalisa',
    sanskrit: 'गंगा चालीसा',
    deity: 'Maa Ganga',
    deitySlug: 'ganga',
    composer: 'Traditional (Kashi-Haridwar pandit tradition)',
    composedIn: 'Hindi (with Sanskrit invocations)',
    whenRecited: 'Ganga Dussehra (Jyeshtha Shukla Dashami), Ganga Saptami, daily bath at Ganga ghats, Kumbh Mela, before asthi-visarjan',
    description:
      '40-verse hymn to Maa Ganga — the celestial river brought down from Brahma\'s kamandalu by King Bhagiratha\'s 1000-year penance, descending through Shiva\'s matted locks (jata) to flow upon the earth and liberate the 60,000 sons of Sagara. Worshipped as Patita Pavani (purifier of the fallen) and Tripathaga (flowing through heaven, earth, and underworld).',
    significance:
      'No Hindu samskara is complete without Ganga jal — from birth to cremation. Her chalisa is the daily prayer of every Kashi resident, Haridwar pandit, and Allahabad Sangam priest. Recited at asthi-visarjan (immersion of ashes) to ensure the departed soul\'s liberation, and at Kumbh Mela bathing to wash away lifetimes of accumulated karma.',
    benefits: [
      'Purification of past karmas across multiple lifetimes',
      'Liberation (moksha) for deceased ancestors via asthi-visarjan',
      'Cure of chronic ailments through faith-based Ganga-jal therapy',
      'Pacification of Pitra Dosha and Kala Sarpa Dosha',
      'Spiritual merit of Kumbh-snan even when recited from a distance',
      'Final liberation if the chalisa is on one\'s lips at the moment of death',
    ],
    excerpt: [
      'जय जय जय जग पावनि गंगे। भीष्म की माता हे जग वंदे॥',
      'विष्णु पद से उद्गम पाई। ब्रह्म कमंडलु में बस आई॥',
      'शिव की जटा में सिमटी आई। भगीरथ के संग पृथ्वी आई॥',
      'सगर पुत्र सहस्र उद्धारे। पतित पावनी नाम पुकारे॥',
      'हरिद्वार से काशी प्रयागा। सागर मिलन तुम्हारा सुहागा॥',
      'त्रिपथगा त्रिलोक तारिणी। मोक्ष दायिनी पाप हारिणी॥',
    ],
    excerptMeaning:
      'Victory, victory, victory to Ganga, purifier of the world, mother of Bhishma, venerated by all creation. Originating from the feet of Vishnu, you came to dwell in Brahma\'s water-pot. You gathered into Shiva\'s matted hair, then descended to earth with Bhagiratha. You liberated the sixty thousand sons of King Sagara; you are called by the name Patita Pavani (purifier of the fallen). From Haridwar to Kashi to Prayaga, your union with the ocean is the bridal blessing of the land. Flowing through the three paths (heaven, earth, underworld), saviouress of the three worlds, bestower of liberation, dispeller of sin. Devotees who recite this chalisa with reverence at sunrise on her bank, or even from distant lands holding Ganga-jal in their palm, receive the karmic purification that has sustained Sanatana Dharma for ten thousand years.',
    durationMinutes: 9,
    relatedPujas: ['ganga-aarti', 'asthi-visarjan', 'pitra-tarpan', 'kumbh-snan-sankalp'],
    externalSources: [
      { label: 'Shri Ganga Sabha Haridwar (Har Ki Pauri)', url: 'https://shrigangasabha.org' },
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'yamuna-chalisa',
    name: 'Yamuna Chalisa',
    sanskrit: 'यमुना चालीसा',
    deity: 'Maa Yamuna',
    deitySlug: 'yamuna',
    composer: 'Traditional (Pushtimarg / Vallabh Sampradaya, popularised at Mathura-Vrindavan ghats)',
    composedIn: 'Brajbhasha-Hindi',
    whenRecited: 'Yamuna Chhath (Chaitra Shukla Shashthi), Yamuna Jayanti, daily bath at Vishram Ghat Mathura, Janmashtami midnight at Yamuna banks',
    description:
      '40-verse hymn to Maa Yamuna — daughter of Surya Bhagavan, sister of Yama (the lord of death) and Shani, beloved sakhi of Lord Krishna who sported on her banks at Vrindavan. The Pushtimarg tradition founded by Shri Vallabhacharya places Yamuna at the heart of bhakti — her dark waters mirror Krishna\'s syamala form.',
    significance:
      'Bathing in Yamuna on her sister-day to Yama frees one from Yama-yatana (the torments after death) per the bond she extracted from her brother. Her chalisa is recited daily at Vishram Ghat Mathura (where Krishna rested after slaying Kamsa) and at the 24 ghats of Vrindavan. Pushtimarg vaishnavas consider Yamuna-snan more precious than Ganga because she carries the very essence of Krishna\'s lila.',
    benefits: [
      'Freedom from fear of Yama and post-death torments (per Yama-Yamuna bond)',
      'Sweetening of the heart for Krishna bhakti and Braj-prema',
      'Cooling of pitta and emotional fevers',
      'Removal of Shani-related afflictions (her brother)',
      'Pacification of difficult relationships (sibling bond model)',
      'Direct admission into Krishna\'s nitya-lila for Pushtimarg devotees',
    ],
    excerpt: [
      'जय जय यमुना महारानी। श्रीकृष्ण की प्यारी रानी॥',
      'सूर्य पुत्री यम की बहना। शनि की भगिनी पतित उद्धरना॥',
      'श्याम वर्ण जल अति निर्मल। ब्रज मंडल में बहती चंचल॥',
      'विश्राम घाट तीर्थ पुनीता। कालिंदी जल अति शुभ शीता॥',
      'वृंदावन के निकट विराजी। कान्हा संग जल क्रीड़ा साजी॥',
      'यम द्वितीया तुम स्नान कराओ। भाई बहन का प्रेम बढ़ाओ॥',
    ],
    excerptMeaning:
      'Victory, victory to Yamuna Maharani, beloved queen of Sri Krishna. Daughter of Surya, sister of Yama, sister of Shani, uplifter of the fallen. Your waters are dark-hued and supremely pristine, flowing playfully through the Braj mandala. Vishram Ghat is your sacred pilgrimage spot, your Kalindi waters supremely auspicious and cool. You repose near Vrindavan, where you arranged water-sports with Kanha (Krishna). On Yama Dwitiya you offer the sacred bath that increases the love between brother and sister. Devotees who recite this chalisa at your banks — especially on the day after Diwali when sisters tie rakhi to brothers — receive freedom from Yama\'s rod and direct entry into the eternal love-play (nitya-lila) of your beloved Krishna, the dark youth who first composed his flute-melodies upon your shores.',
    durationMinutes: 8,
    relatedPujas: ['yamuna-aarti', 'yama-dwitiya-snan', 'krishna-janmashtami-puja'],
    externalSources: [
      { label: 'Shri Vallabhacharya Pushtimarg (Nathdwara)', url: 'https://www.pushtikulam.org' },
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'mahalakshmi-chalisa',
    name: 'Mahalakshmi Chalisa (Kolhapur)',
    sanskrit: 'महालक्ष्मी चालीसा',
    deity: 'Mahalakshmi of Kolhapur (Ambabai)',
    deitySlug: 'mahalakshmi',
    composer: 'Traditional (Karavira Mahatmya tradition, Marathi-Sanskrit lineage of Kolhapur priests)',
    composedIn: 'Hindi (with Marathi-Sanskrit invocations)',
    whenRecited: 'Navaratri (especially Sharad), Fridays, Mahalaya Amavasya, Ratha Saptami, Kiranotsav (3-day sun-ray festival in January and November)',
    description:
      '40-verse hymn to Mahalakshmi of Kolhapur (Karavira) — distinct from the household Lakshmi-Chalisa. She is one of the three-and-a-half Shakti Peethas of Maharashtra, where the eyes of Sati are said to have fallen. Locally called Ambabai, she is the kuladevi (family deity) of millions in Maharashtra and Karnataka. Her temple is celebrated for Kiranotsav — when the setting sun\'s rays pass through three doorways to illuminate her face exactly twice each year.',
    significance:
      'While the common Lakshmi-Chalisa addresses Vishnu\'s consort as the giver of wealth, the Mahalakshmi Chalisa of Kolhapur addresses her as the supreme primordial Adi Shakti — combining Lakshmi, Saraswati, and Mahakali in a single fierce-yet-benevolent form. Recited as kuladevi-smarana before family weddings, house construction, and major business launches across the Deccan.',
    benefits: [
      'Kuladevi blessings for Maharashtrian and Kannadiga families',
      'Unification of the threefold Shakti (wealth, knowledge, courage) in a single sitting',
      'Removal of family curses and ancestral kuladosha',
      'Successful completion of pilgrimage to one of the 3.5 Shakti Peethas of Maharashtra',
      'Powerful remedy for sudden financial collapse and business failure',
      'Auspicious commencement of new gold purchases, construction, and weddings',
    ],
    excerpt: [
      'जय जय अंबाबाई कोल्हापुर वासिनी। महालक्ष्मी आदि शक्ति प्रकाशिनी॥',
      'करवीर क्षेत्र में तुम विराजे। सती के नयन यहाँ गिर साजे॥',
      'त्रिगुण रूपिणी त्रिशक्ति धारी। लक्ष्मी सरस्वती काली सारी॥',
      'सिंहासन पर तुम विराजती। चतुर्भुजा शस्त्र सम्भालती॥',
      'कोटि सूर्य सम तेज तुम्हारा। किरणोत्सव में दर्शन प्यारा॥',
      'महाराष्ट्र की कुलदेवी माता। कन्नड़ देश की भी विधाता॥',
    ],
    excerptMeaning:
      'Victory, victory to Ambabai, dweller of Kolhapur, Mahalakshmi who manifests the primordial Adi Shakti. You repose in the Karavira kshetra, where the eyes of Sati fell to consecrate this site. Embodied in the three gunas, bearing the threefold Shakti — you are Lakshmi, Saraswati, and Kali all together. You are enthroned upon the lion-seat, four-armed, wielding sacred weapons. Your radiance equals ten million suns; your darshan during the Kiranotsav festival is supremely beloved. Kuladevi-Mother of Maharashtra, also the foundational goddess of the Kannada land — devotees who recite this chalisa as kuladevi-smarana before family ceremonies invoke the unified threefold Shakti that distinguishes the Karavira Mahalakshmi from the household Lakshmi, granting wealth, wisdom, and warrior-courage in a single divine descent.',
    durationMinutes: 10,
    relatedPujas: ['mahalakshmi-abhishek', 'kuladevi-puja', 'navaratri-puja', 'kiranotsav-darshan'],
    externalSources: [
      { label: 'Shree Mahalaxmi Mandir Kolhapur (official)', url: 'https://mahalaxmikolhapur.com' },
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'annapurna-chalisa',
    name: 'Annapurna Chalisa',
    sanskrit: 'अन्नपूर्णा चालीसा',
    deity: 'Annapurna Devi (Kashi)',
    deitySlug: 'annapurna',
    composer: 'Traditional (Kashi tradition, attributed to the lineage around Sri Adi Shankaracharya\'s Annapurna-Ashtakam)',
    composedIn: 'Hindi (with Sanskrit invocations from Annapurna Stotram)',
    whenRecited: 'Annapurna Jayanti (Margashirsha Purnima), Akshaya Tritiya, before starting kitchen at new home (Anna-Prashana of house), daily by householders before cooking',
    description:
      '40-verse hymn to Annapurna Devi — the goddess of food and nourishment, consort-form of Lord Vishwanath at Kashi, who once begged alms from her own husband Shiva to demonstrate that even the lord of the universe depends on the mother for sustenance. Her golden ladle (sona-karchhuli) and bowl of rice (anna-patra) symbolise the inexhaustible bounty of the householder kitchen.',
    significance:
      'Annapurna is the only goddess whose worship is mandatory before any meal in traditional Hindu households — the prayer "Annapurne sadapurne" precedes lunch in Vaishnava and Shaiva homes alike. Her chalisa is recited to ensure no family member ever sleeps hungry, to bless the kitchen as the heart of the home, and to invoke the abundance that sustained Kashi through every famine in its 3500-year history.',
    benefits: [
      'Guarantee that no family member ever lacks food (per Kashi Annapurna pledge)',
      'Blessing of the kitchen as the abundance-centre of the home',
      'Removal of poverty and chronic financial scarcity',
      'Cure of digestive ailments and eating disorders',
      'Successful Anna-Prashana of new home or restaurant',
      'Spiritual merit of feeding Brahmins and the destitute (anna-daan punya)',
    ],
    excerpt: [
      'अन्नपूर्णे सदापूर्णे शंकर प्राण वल्लभे।',
      'ज्ञान वैराग्य सिद्ध्यर्थं भिक्षां देहि च पार्वती॥',
      'जय जय अन्नपूर्णा माता। काशी पुरी में रहने वाली॥',
      'सोने की कड़छुली हाथ सजाई। चांदी की थाली में अन्न सजाई॥',
      'शिव से भिक्षा तुम मंगवाओ। जग को अन्न का महत्व बताओ॥',
      'घर घर में तुम वास करो माँ। चूल्हा कभी न ठंडा हो माँ॥',
    ],
    excerptMeaning:
      'O Annapurna, ever-full, beloved life of Shankara — for the attainment of wisdom and dispassion, grant me alms, O Parvati. (Adi Shankaracharya\'s opening verse of Annapurna Stotram.) Victory, victory to Mother Annapurna, dweller of the city of Kashi. The golden ladle graces your hand; the silver plate holds the bestowed rice. You made even Shiva beg alms from you, teaching the world the supreme importance of food. May you dwell in every home, O Mother; may the hearth never grow cold. Devotees who recite this chalisa before cooking the day\'s first meal — placing a single grain of rice and a coin in your image-niche — invoke the inexhaustible abundance that has sustained the city of light through ten million pilgrim-meals, ensuring that no member of the household sleeps with an empty stomach.',
    durationMinutes: 9,
    relatedPujas: ['annapurna-jayanti-vrat', 'anna-prashana-puja', 'akshaya-tritiya-puja', 'anna-daan-sankalp'],
    externalSources: [
      { label: 'Shri Kashi Vishwanath Trust (Annapurna Mandir adjoining)', url: 'https://shrikashivishwanath.org' },
      { label: 'Geeta Press Gorakhpur (Annapurna Stotram + Chalisa)', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'vindhyavasini-chalisa',
    name: 'Vindhyavasini Chalisa',
    sanskrit: 'विंध्यवासिनी चालीसा',
    deity: 'Vindhyavasini Devi (Mirzapur)',
    deitySlug: 'vindhyavasini',
    composer: 'Traditional (Vindhyachal Dham priest lineage, popularised in Devi Bhagavatam-aligned recensions)',
    composedIn: 'Hindi / Awadhi',
    whenRecited: 'Navaratri (both Chaitra and Sharad — Kajali Teej night especially), Krishna Janmashtami midnight, during Vindhya Parikrama (Trikon Yatra of Vindhyavasini-Kali-Ashtabhuja)',
    description:
      '40-verse hymn to Vindhyavasini Devi of Mirzapur — the goddess of the Vindhya mountains who, per the Devi Bhagavatam, was the eighth daughter exchanged for Krishna in the prison of Kamsa. When Kamsa attempted to dash her against the stone, she flew into the sky as Yogamaya and prophesied his doom from her seat in the Vindhya forests. Her temple at Vindhyachal forms one apex of the unique Trikon Yatra (triangular pilgrimage) with Maha Kali and Ashtabhuja temples.',
    significance:
      'Vindhyavasini is the supreme tantric Shakti of the eastern Gangetic plain — invoked for victory in seemingly impossible situations, since she herself escaped certain death in Kamsa\'s grip. Her chalisa is the principal text of the Vindhya Parikrama performed by tantric sadhakas, who walk the 9-km triangle linking the three Vindhya goddesses overnight on Ashtami of Sharad Navaratri.',
    benefits: [
      'Miraculous escape from certain doom and life-threatening situations',
      'Victory in cases where every visible avenue has closed',
      'Removal of black magic and abhichara from rival tantric practitioners',
      'Tantric siddhi accessible to householders (without sannyasa)',
      'Blessings for childless couples (per Krishna-Yogamaya exchange tradition)',
      'Successful completion of Vindhya Parikrama Trikon Yatra',
    ],
    excerpt: [
      'जय जय विंध्यवासिनी माता। मिर्जापुर में तुम विख्याता॥',
      'कंस के कारागार में जन्मी। आठवीं कन्या योगमाया धन्मी॥',
      'शिला पर पटकन से उड़ आई। आकाश में जा वाणी सुनाई॥',
      'कंस तेरा अंत निकट है। कृष्ण गोकुल में सुरक्षित है॥',
      'विंध्य पर्वत पर वास तुम्हारा। त्रिकोण यात्रा का धाम सारा॥',
      'महाकाली अष्टभुजा के संग। तीन शक्ति का अद्भुत रंग॥',
    ],
    excerptMeaning:
      'Victory, victory to Mother Vindhyavasini, renowned in the city of Mirzapur. Born in the prison-cell of Kamsa as the eighth daughter — blessed Yogamaya. When he attempted to dash you against the stone, you flew up into the sky and proclaimed your voice: "Kamsa, your end is near; Krishna is safe in Gokula." Your abode is upon the Vindhya mountains, the entire dham of the Trikon Yatra. With Maha Kali and Ashtabhuja goddesses, you display the wondrous interplay of the three Shaktis. Devotees who recite this chalisa during the Ashtami midnight Trikon Parikrama — walking the 9-km triangle barefoot through the Vindhya forests — invoke the goddess who herself escaped certain death in tyrant\'s hand, securing miraculous deliverance for the devotee from situations that every visible counsel has declared hopeless.',
    durationMinutes: 10,
    relatedPujas: ['vindhya-parikrama-trikon', 'navaratri-puja', 'tantric-shakti-upasana'],
    externalSources: [
      { label: 'Maa Vindhyavasini Dham (Mirzapur)', url: 'https://vindhyachaldham.com' },
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'tara-chalisa',
    name: 'Tara Chalisa',
    sanskrit: 'तारा चालीसा',
    deity: 'Tara Mahavidya',
    deitySlug: 'tara',
    composer: 'Traditional (Tarapith tantric lineage, Bama Khepa school, Bengali-Hindi recension)',
    composedIn: 'Hindi (with Sanskrit tantric beeja invocations)',
    whenRecited: 'Tara Jayanti (Chaitra Shukla Navami), Kaushiki Amavasya (no-moon night of Bhadrapada), midnight tantric upasana, before deep meditation retreat',
    description:
      '40-verse hymn to Tara — the second of the Dasha Mahavidyas (ten cosmic wisdom-goddesses), the saviouress (tarayati = she who ferries across) who rescued Lord Shiva himself by suckling him when he drank the Halahala poison at Tarapith. She is depicted standing upon a corpse, holding scissors, sword, blue lotus, and skull-bowl — a fierce yet supremely compassionate mother who grants liberation in this very lifetime to sincere tantric sadhakas.',
    significance:
      'Tara is the supreme rescue-goddess: tarayati iti Tara — she who ferries the devotee across the ocean of samsara. Her chalisa is the most concise daily recitation in the Tara-tantra tradition, recited at the Tarapith shrine in Birbhum (Bengal) where the maha-siddha Bama Khepa lived and where the third eye of Sati is said to have fallen. Particularly powerful on Kaushiki Amavasya — the no-moon night when Tara is said to be most accessible to sincere seekers.',
    benefits: [
      'Liberation (moksha) in this very lifetime through tantric sadhana',
      'Rescue from situations of seemingly inevitable destruction',
      'Awakening of the third eye and intuitive wisdom (ritambhara prajna)',
      'Powerful protection during cremation-ground meditation (shmashana sadhana)',
      'Removal of the deepest karmic obscurations (avarana)',
      'Successful tantric initiation under a Tara-sampradaya guru',
    ],
    excerpt: [
      'जय जय तारा महाविद्या। दश महाविद्या में तुम द्वितीया॥',
      'तारापीठ में वास तुम्हारा। बीरभूम बंगाल में प्यारा॥',
      'सती के नेत्र यहाँ गिर आये। शक्ति पीठ का धाम बनाये॥',
      'शिव को विष पीते देखा जब। स्तन्य पान करा बचाया तब॥',
      'श्याम वर्णा शव पर खड़ी। कैंची खड्ग नीलकमल धरी॥',
      'बामा खेपा सिद्ध पुकारे। तारिणी माँ हमें उबारे॥',
    ],
    excerptMeaning:
      'Victory, victory to Tara, the great wisdom-goddess; among the ten Mahavidyas you are the second. Tarapith is your abode, beloved in Birbhum, Bengal. The eyes of Sati fell here, consecrating this Shakti Peetha. When you saw Shiva drinking the Halahala poison, you rescued him by offering breast-milk. Dark-hued, standing upon a corpse, holding scissors, sword, and the blue lotus. Bama Khepa, the siddha, invoked you — Mother Tarini, deliver us. Devotees who recite this chalisa at the cremation-ground on Kaushiki Amavasya night — or even from afar in their own meditation seat — invoke the fierce-yet-compassionate Mother who suckled Shiva himself, securing her direct intervention to ferry the devotee across the ocean of samsara within this very lifetime, the supreme promise distinct to her tantric stream.',
    durationMinutes: 11,
    relatedPujas: ['tara-tantric-upasana', 'kaushiki-amavasya-sadhana', 'shmashana-sadhana', 'dasha-mahavidya-puja'],
    externalSources: [
      { label: 'Tarapith Mandir (Bama Khepa Samadhi Sthal)', url: 'https://tarapithtemple.org' },
      { label: 'Geeta Press Gorakhpur (Dasha Mahavidya Stotram collection)', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'dakshina-kali-chalisa',
    name: 'Dakshina Kali Chalisa',
    sanskrit: 'दक्षिणा काली चालीसा',
    deity: 'Dakshina Kali (Tantrik form)',
    deitySlug: 'kali',
    composer: 'Traditional (Bengali tantric lineage, Ramakrishna Paramahamsa Dakshineshwar school, popularised in Hindi recension)',
    composedIn: 'Hindi (with Sanskrit tantric beeja invocations — Krīṃ Krīṃ Krīṃ)',
    whenRecited: 'Kali Puja (Kartik Amavasya, the night of Diwali in Bengal), every Amavasya midnight, Phalaharini Kali Puja (Jyeshtha Amavasya), before tantric sadhana sessions',
    description:
      '40-verse hymn to Dakshina Kali — the right-foot-forward (dakshina) tantric form of Kali, distinct from the Vamachara (left-hand) Smashana Kali. She stands with her right foot upon the chest of Shiva (who reclines beneath her in his sava-rupa), her tongue extended, holding the severed head of an asura and a sword. Her name Dakshina means both "right-handed" (auspicious) and "south-facing" — she liberates devotees from the fear of Dakshina (Yama, lord of death whose direction is south).',
    significance:
      'Dakshina Kali is the principal tantric goddess of Bengal — worshipped at Dakshineshwar by Sri Ramakrishna Paramahamsa, at Kalighat by countless tantric sadhakas, and in every Bengali household during Kali Puja on Diwali night. Her chalisa is the safer, householder-accessible recitation form of the heavier tantric texts. She grants the fearlessness that comes from facing death-itself in her terrible form, dissolving the deepest existential anxieties.',
    benefits: [
      'Complete dissolution of the fear of death (mrityu-bhaya nivarana)',
      'Tantric protection accessible to householders without Vamachara initiation',
      'Removal of malefic spirit-possession and pisacha-badha',
      'Powerful remedy for chronic depression and existential despair',
      'Liberation from the fear of Yama and post-death torments',
      'Direct experiential connection with the divine Mother in her supreme tantric form',
    ],
    excerpt: [
      'जय जय दक्षिणा काली माता। तंत्र शक्ति की महाविधाता॥',
      'श्याम वर्णा रक्त नयन सोहे। मुण्ड माल कण्ठ में मोहे॥',
      'दक्षिण पद शिव हृदय धारी। जिह्वा बाहर खड्ग धारी॥',
      'दक्षिणेश्वर में रामकृष्ण ने। माँ कह कह कर तुझे ही जाना॥',
      'काली घाट के तुम अधिष्ठात्री। फलहारिणी जयेष्ठ अमावस्या॥',
      'क्रीं क्रीं क्रीं तव बीज मन्त्र। दीपावली रात्रि तव यंत्र॥',
    ],
    excerptMeaning:
      'Victory, victory to Mother Dakshina Kali, the great architect of tantric Shakti. Dark-hued, with red eyes shining; the garland of severed heads graces your neck. Your right foot rests upon the chest of Shiva, your tongue extended outward, your sword held aloft. At Dakshineshwar, Sri Ramakrishna knew you alone, calling out "Maa, Maa." You are the presiding deity of Kalighat; you are honoured on Phalaharini Jyeshtha Amavasya. Krīṃ Krīṃ Krīṃ — your seed mantra; the night of Diwali — your yantra. Devotees who recite this chalisa on Amavasya midnight, facing south with a single butter-lamp and red hibiscus offering, invoke the supreme tantric Mother in her dakshina form — accessible to householders, granting the fearlessness of one who has gazed directly upon the form of death itself and found in her terrible visage the most tender face of the universal Mother.',
    durationMinutes: 12,
    relatedPujas: ['kali-puja-diwali-bengal', 'phalaharini-kali-puja', 'tantric-shakti-upasana', 'amavasya-puja'],
    externalSources: [
      { label: 'Dakshineswar Kali Temple (Sri Ramakrishna sthal)', url: 'https://dakshineswarkalitemple.org' },
      { label: 'Kalighat Temple Kolkata', url: 'https://kalighattemple.com' },
      { label: 'Geeta Press Gorakhpur', url: 'https://www.gitapress.org' },
    ],
  },
  {
    slug: 'shitala-chalisa',
    name: 'Shitala Chalisa',
    sanskrit: 'शीतला चालीसा',
    deity: 'Shitala Mata',
    deitySlug: 'shitala',
    composer: 'Traditional (folk-Hindu tradition of Gangetic plain, popularised in printed editions from late 19th century)',
    composedIn: 'Hindi (with Sanskrit invocations from Shitala Ashtakam)',
    whenRecited: 'Shitala Ashtami (Chaitra Krishna Ashtami — Basoda festival, day after Holi traditionally), during outbreaks of smallpox/chickenpox/measles, during summer fever season, before vaccinations',
    description:
      '40-verse hymn to Shitala Mata — the "cool one" who governs poxes, fevers, and infectious diseases. Depicted riding a donkey, holding a broom (to sweep away pestilence), a winnowing fan (to purify), a pot of cool water (to soothe fever), and neem leaves (the ancient antiseptic). Worshipped on Basoda — the festival of "stale food" — when only food cooked the previous night is consumed, recognising that all food becomes shitala (cool) before her.',
    significance:
      'Shitala embodies the recognition that the very forces that bring disease can also cure it when propitiated — she rewards reverence and afflicts negligence. Her chalisa is recited by mothers during every childhood fever, by villages during pox outbreaks, and historically was the primary spiritual response to smallpox before its eradication in 1980. Modern Hindu families still recite it before vaccination drives, viewing the vaccine itself as Shitala\'s prasada.',
    benefits: [
      'Protection from smallpox, chickenpox, measles, mumps, and rubella',
      'Cure of chronic skin diseases (psoriasis, eczema, vitiligo)',
      'Relief from summer fevers and heat-related afflictions (pitta jvara)',
      'Childhood disease prevention when recited daily by mothers',
      'Safe and effective response to vaccines (modern reinterpretation)',
      'Cooling of inflammatory disorders and chronic infections',
    ],
    excerpt: [
      'जय जय शीतला माता। रोग नाशिनी सुख दाता॥',
      'गर्दभ वाहन हाथ में झाड़ू। सूप कलश नीम पात साजू॥',
      'चेचक माता तुम कहलाओ। शीतल जल से ज्वर मिटाओ॥',
      'बासोडा के दिन तुम पूजी जाओ। बासी अन्न का भोग चढ़ाओ॥',
      'जो भी श्रद्धा से चालीसा गाये। चेचक उसके घर नहिं आये॥',
      'बच्चों की रक्षा करो माँ। ज्वर ताप से बचाओ माँ॥',
    ],
    excerptMeaning:
      'Victory, victory to Mother Shitala, destroyer of disease, bestower of joy. Riding the donkey, broom in hand, with winnowing fan, water-pot, and neem leaves gracing your form. You are called the Mother of the Pox; with cool water you extinguish the fever. On the day of Basoda you are worshipped, offered the bhog of food cooked the previous night. Whoever sings this chalisa with reverence — chicken-pox shall not enter his home. Protect the children, O Mother; save them from fever and heat-stroke. Devotees who recite this chalisa daily during the summer fever season, or specifically during outbreaks of childhood infectious disease, invoke the cooling protection of the goddess who acknowledges that the very forces of pestilence become her instruments of grace when met with reverence — a wisdom that sustained Indian villages through ten thousand years of disease cycles and continues to guide household ritual response to childhood illness today.',
    durationMinutes: 9,
    relatedPujas: ['shitala-ashtami-vrat', 'basoda-puja', 'childhood-disease-shanti'],
    externalSources: [
      { label: 'Shri Shitala Mata Mandir (multiple regional sthals)', url: 'https://www.gitapress.org' },
      { label: 'Geeta Press Gorakhpur (Shitala Ashtakam + Chalisa)', url: 'https://www.gitapress.org' },
    ],
  },
];

export function getChalisa(slug: string): ChalisaInfo | undefined {
  return CHALISAS.find((c) => c.slug === slug);
}

export function chalisaSlugs(): string[] {
  return CHALISAS.map((c) => c.slug);
}
