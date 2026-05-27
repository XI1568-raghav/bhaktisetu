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
];

export function getChalisa(slug: string): ChalisaInfo | undefined {
  return CHALISAS.find((c) => c.slug === slug);
}

export function chalisaSlugs(): string[] {
  return CHALISAS.map((c) => c.slug);
}
