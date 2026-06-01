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
];

export function getChalisa(slug: string): ChalisaInfo | undefined {
  return CHALISAS.find((c) => c.slug === slug);
}

export function chalisaSlugs(): string[] {
  return CHALISAS.map((c) => c.slug);
}
