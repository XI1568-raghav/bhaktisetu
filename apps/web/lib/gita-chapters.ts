// Bhagavad Gita 18 chapters — programmatic-SEO source.
// Verse counts canonical; summaries condensed for landing pages.

export interface GitaChapter {
  number: number;
  slug: string;
  sanskrit: string;
  english: string;
  iast: string;
  verseCount: number;
  theme: string;
  yogaType: string;
  summary: string;
  keyVerses: { ref: string; sanskrit: string; translation: string }[];
  takeaway: string;
  whoSpeaks: string;
}

export const GITA_CHAPTERS: GitaChapter[] = [
  {
    number: 1, slug: 'arjuna-vishada-yoga', sanskrit: 'अर्जुनविषादयोग', english: 'Arjuna\'s Despair', iast: 'Arjuna-viṣāda-yoga', verseCount: 47, theme: 'Despondency on the battlefield',
    yogaType: 'Vishada Yoga (Yoga of Sorrow)',
    summary: 'Arjuna surveys both armies at Kurukshetra and is overwhelmed seeing his kinsmen, teachers and elders arrayed against him. He drops his bow, refuses to fight, and turns to Krishna for guidance. The chapter establishes the moral crisis that the entire Gita addresses.',
    keyVerses: [
      { ref: '1.28', sanskrit: 'सीदन्ति मम गात्राणि मुखं च परिशुष्यति', translation: 'My limbs collapse, my mouth dries up, my body trembles, my hair stands on end.' },
      { ref: '1.46', sanskrit: 'न योत्स्य इति गोविन्दमुक्त्वा तूष्णीं बभूव ह', translation: 'Saying "I will not fight" to Govinda, he fell silent.' },
    ],
    takeaway: 'When duty conflicts with attachment, seek the counsel of the wise rather than acting from emotion.',
    whoSpeaks: 'Mostly Arjuna; Sanjaya narrates',
  },
  {
    number: 2, slug: 'sankhya-yoga', sanskrit: 'सांख्ययोग', english: 'The Yoga of Knowledge', iast: 'Sāṅkhya-yoga', verseCount: 72, theme: 'Eternal soul, swadharma, equanimity',
    yogaType: 'Sankhya Yoga',
    summary: 'Krishna begins his teaching: the soul (atman) is eternal, indestructible; the body perishes. Arjuna must perform his kshatriya duty without attachment to outcomes. The Sthitaprajna verses (54-72) describe the wise person of steady wisdom — the foundational portrait of the liberated being in the Gita.',
    keyVerses: [
      { ref: '2.20', sanskrit: 'न जायते म्रियते वा कदाचिन्', translation: 'The soul is never born nor does it ever die.' },
      { ref: '2.47', sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन', translation: 'You have the right to action alone, never to its fruits.' },
      { ref: '2.48', sanskrit: 'योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय', translation: 'Established in yoga, perform action, abandoning attachment.' },
    ],
    takeaway: 'Act, but release the result. Equanimity in success and failure is yoga.',
    whoSpeaks: 'Krishna primarily; Arjuna asks the Sthitaprajna question (2.54)',
  },
  {
    number: 3, slug: 'karma-yoga', sanskrit: 'कर्मयोग', english: 'The Yoga of Action', iast: 'Karma-yoga', verseCount: 43, theme: 'Selfless action, lokasangraha',
    yogaType: 'Karma Yoga',
    summary: 'Krishna rebuts the idea that renunciation means inaction. No one can remain even for a moment without acting. Right action performed as yajna (sacrifice), without attachment, purifies and liberates. The wise act for the welfare of all (lokasangraha), as Janaka did.',
    keyVerses: [
      { ref: '3.5', sanskrit: 'न हि कश्चित्क्षणमपि जातु तिष्ठत्यकर्मकृत्', translation: 'No one can remain even for a moment without performing action.' },
      { ref: '3.21', sanskrit: 'यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः', translation: 'Whatever a great person does, others follow.' },
    ],
    takeaway: 'Action is unavoidable. Make every action a selfless offering.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 4, slug: 'jnana-karma-sannyasa-yoga', sanskrit: 'ज्ञानकर्मसन्न्यासयोग', english: 'The Yoga of Knowledge & Renunciation of Action', iast: 'Jñāna-karma-sannyāsa-yoga', verseCount: 42, theme: 'Divine descent, sacrifice, wisdom',
    yogaType: 'Jnana Yoga + Karma Sannyasa',
    summary: 'Krishna reveals he has taught this yoga across many ages and descends (avatara) whenever dharma declines (4.7-8 — paritranaya sadhunam). Different types of yajna are catalogued. Knowledge is the supreme purifier: jnanagni reduces all karma to ashes.',
    keyVerses: [
      { ref: '4.7', sanskrit: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत', translation: 'Whenever there is decline of dharma, O Bharata, I manifest myself.' },
      { ref: '4.8', sanskrit: 'परित्राणाय साधूनां विनाशाय च दुष्कृताम्', translation: 'To protect the virtuous, to destroy the wicked, to re-establish dharma — I take birth age after age.' },
      { ref: '4.38', sanskrit: 'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते', translation: 'Nothing in this world is as purifying as knowledge.' },
    ],
    takeaway: 'Knowledge converted into action becomes the highest sacrifice.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 5, slug: 'karma-sannyasa-yoga', sanskrit: 'कर्मसन्न्यासयोग', english: 'The Yoga of Renunciation of Action', iast: 'Karma-sannyāsa-yoga', verseCount: 29, theme: 'Inner renunciation while acting',
    yogaType: 'Sannyasa + Karma Yoga',
    summary: 'Arjuna asks whether renunciation or action is better. Krishna: both lead to liberation, but karma yoga is superior because it is practical. The yogi who acts without attachment, dedicating fruits to brahman, remains unstained as a lotus leaf in water.',
    keyVerses: [
      { ref: '5.10', sanskrit: 'ब्रह्मण्याधाय कर्माणि सङ्गं त्यक्त्वा करोति यः', translation: 'One who acts offering all actions to Brahman, abandoning attachment, is untouched by sin as a lotus by water.' },
    ],
    takeaway: 'True renunciation is inner, not the outer abandonment of duty.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 6, slug: 'atma-samyama-yoga', sanskrit: 'आत्मसंयमयोग', english: 'The Yoga of Self-Restraint / Meditation', iast: 'Ātma-saṁyama-yoga', verseCount: 47, theme: 'Dhyana, the meditation practice',
    yogaType: 'Dhyana Yoga',
    summary: 'Krishna lays out the meditation practice in detail: seat (a clean kusha-grass mat), posture (steady, head and neck erect), gaze (tip of the nose), diet (moderate). The mind, restless as wind (6.34), must be patiently restrained. Even the failed yogi loses nothing — picks up the practice in the next birth.',
    keyVerses: [
      { ref: '6.5', sanskrit: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत्', translation: 'Lift the self by the Self; never let the self sink.' },
      { ref: '6.35', sanskrit: 'असंशयं महाबाहो मनो दुर्निग्रहं चलम्', translation: 'Undoubtedly, O mighty-armed, the mind is restless and hard to subdue — but by practice and dispassion it can be controlled.' },
    ],
    takeaway: 'Daily meditation, moderate in food, sleep and recreation — this is yoga.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 7, slug: 'jnana-vijnana-yoga', sanskrit: 'ज्ञानविज्ञानयोग', english: 'The Yoga of Knowledge & Realization', iast: 'Jñāna-vijñāna-yoga', verseCount: 30, theme: 'Two prakritis, four types of devotees',
    yogaType: 'Jnana + Vijnana',
    summary: 'Krishna distinguishes his lower prakriti (eight-fold material nature) from his higher (the jiva). All beings come into being from these. Four types of people turn to God: the distressed, the seeker of wealth, the curious, and the wise — and the wise is dearest. Maya veils most from his true nature.',
    keyVerses: [
      { ref: '7.7', sanskrit: 'मत्तः परतरं नान्यत्किञ्चिदस्ति धनञ्जय', translation: 'There is nothing higher than Me, O Dhananjaya — all this is strung on Me like pearls on a thread.' },
    ],
    takeaway: 'All paths lead to the One; only the rare see this clearly.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 8, slug: 'akshara-brahma-yoga', sanskrit: 'अक्षरब्रह्मयोग', english: 'The Yoga of the Imperishable Brahman', iast: 'Akṣara-brahma-yoga', verseCount: 28, theme: 'The path at the time of death',
    yogaType: 'Brahma Yoga',
    summary: 'What one remembers at the final moment determines the next state. Constant practice fixes the mind on the Divine, so at death it goes naturally. The two paths after death — the bright (uttarayana) and the dark (dakshinayana) — are described. The yogi knows both and is not bound.',
    keyVerses: [
      { ref: '8.6', sanskrit: 'यं यं वापि स्मरन्भावं त्यजत्यन्ते कलेवरम्', translation: 'Whatever state of being one remembers when leaving the body, that one attains.' },
      { ref: '8.7', sanskrit: 'तस्मात्सर्वेषु कालेषु मामनुस्मर युध्य च', translation: 'Therefore, at all times, remember Me and fight.' },
    ],
    takeaway: 'Live now as you would wish to die — with the Divine remembered.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 9, slug: 'raja-vidya-raja-guhya-yoga', sanskrit: 'राजविद्याराजगुह्ययोग', english: 'The Royal Knowledge, The Royal Secret', iast: 'Rāja-vidyā-rāja-guhya-yoga', verseCount: 34, theme: 'Bhakti — the most accessible path',
    yogaType: 'Raja Vidya',
    summary: 'Krishna reveals the supreme secret: pure devotion. He is the source and dissolution of all worlds; nothing exists apart from him. Even one of low birth, woman, vaishya, shudra — all attain him through devotion. Offer Me a leaf, flower, fruit, water with love — I accept it (9.26).',
    keyVerses: [
      { ref: '9.22', sanskrit: 'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते', translation: 'Those who worship Me with undivided thought, I personally carry to them what they lack and preserve what they have.' },
      { ref: '9.26', sanskrit: 'पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति', translation: 'Whoever offers Me a leaf, a flower, a fruit, or water with devotion — I accept that offering of love.' },
    ],
    takeaway: 'Devotion is the most direct, most universal path. Offer everything with love.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 10, slug: 'vibhuti-yoga', sanskrit: 'विभूतियोग', english: 'The Yoga of Divine Manifestations', iast: 'Vibhūti-yoga', verseCount: 42, theme: 'Krishna\'s glories in creation',
    yogaType: 'Vibhuti Yoga',
    summary: 'Arjuna asks Krishna to describe his divine glories. Krishna lists them: among Adityas I am Vishnu, among lights the sun, among Maruts Marichi, among Vedas Sama Veda, among senses the mind, among rivers the Ganga, among mantras the Gayatri, among seasons spring, among lettters the letter A. He is the seed of all that exists.',
    keyVerses: [
      { ref: '10.20', sanskrit: 'अहमात्मा गुडाकेश सर्वभूताशयस्थितः', translation: 'I am the Self, O Gudakesha, seated in the hearts of all beings.' },
      { ref: '10.41', sanskrit: 'यद्यद्विभूतिमत्सत्त्वं श्रीमदूर्जितमेव वा', translation: 'Whatever is glorious, beautiful or mighty — know that it springs from a fragment of My splendor.' },
    ],
    takeaway: 'See the Divine in everything magnificent — and then beyond it.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 11, slug: 'vishvarupa-darshana-yoga', sanskrit: 'विश्वरूपदर्शनयोग', english: 'The Yoga of the Vision of the Universal Form', iast: 'Viśvarūpa-darśana-yoga', verseCount: 55, theme: 'The cosmic vision',
    yogaType: 'Vishvarupa Darshana',
    summary: 'Krishna grants Arjuna divine sight (divya chakshu) and reveals his Universal Form — infinite faces, all worlds within, time itself devouring beings into his terrible mouths. Arjuna is awestruck and terrified, begs Krishna to resume his familiar form. Krishna says: only by exclusive devotion can this form be seen (11.54).',
    keyVerses: [
      { ref: '11.32', sanskrit: 'कालोऽस्मि लोकक्षयकृत्प्रवृद्धो लोकान्समाहर्तुमिह प्रवृत्तः', translation: 'I am Time, the mighty destroyer of worlds — come here to annihilate the worlds.' },
    ],
    takeaway: 'The Divine is overwhelming. Devotion makes it bearable.',
    whoSpeaks: 'Krishna; Arjuna in awe; Sanjaya describing the vision',
  },
  {
    number: 12, slug: 'bhakti-yoga', sanskrit: 'भक्तियोग', english: 'The Yoga of Devotion', iast: 'Bhakti-yoga', verseCount: 20, theme: 'The path of love',
    yogaType: 'Bhakti Yoga',
    summary: 'Arjuna asks: who is the better yogi — the one who worships the personal form or the impersonal absolute? Krishna: both reach him, but the impersonal path is harder for embodied beings. The qualities of the true devotee are listed (12.13-20) — friendly to all, free from ego, equal in joy and sorrow, content, self-controlled.',
    keyVerses: [
      { ref: '12.8', sanskrit: 'मय्येव मन आधत्स्व मयि बुद्धिं निवेशय', translation: 'Fix your mind on Me, place your intellect in Me — thereafter you will live in Me alone.' },
      { ref: '12.13', sanskrit: 'अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च', translation: 'Friendly and compassionate to all beings, without enmity, free from ego — such a devotee is dear to Me.' },
    ],
    takeaway: 'Devotion is for everyone. Begin with love; the rest follows.',
    whoSpeaks: 'Arjuna asks; Krishna answers',
  },
  {
    number: 13, slug: 'kshetra-kshetrajna-vibhaga-yoga', sanskrit: 'क्षेत्रक्षेत्रज्ञविभागयोग', english: 'The Yoga of the Field and the Knower of the Field', iast: 'Kṣetra-kṣetrajña-vibhāga-yoga', verseCount: 35, theme: 'Body as field, soul as knower',
    yogaType: 'Kshetra-Kshetrajna Vibhaga',
    summary: 'The body is the field (kshetra); the soul is the knower of the field (kshetrajna). Krishna is the knower in all fields. The qualities of knowledge are enumerated (13.7-11): humility, non-violence, forgiveness, simplicity, self-control, equanimity. Prakriti and Purusha are eternal; the bondage of the soul is mistaking itself for the field.',
    keyVerses: [
      { ref: '13.27', sanskrit: 'समं सर्वेषु भूतेषु तिष्ठन्तं परमेश्वरम्', translation: 'One who sees the Supreme Lord dwelling equally in all beings — that one truly sees.' },
    ],
    takeaway: 'You are not the body. You are the awareness that knows the body.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 14, slug: 'guna-traya-vibhaga-yoga', sanskrit: 'गुणत्रयविभागयोग', english: 'The Yoga of the Three Gunas', iast: 'Guṇa-traya-vibhāga-yoga', verseCount: 27, theme: 'Sattva, Rajas, Tamas',
    yogaType: 'Guna Traya Vibhaga',
    summary: 'Three gunas bind the soul to the body: sattva (illuminating, peaceful), rajas (passionate, restless), tamas (dull, ignorant). The wise person sees the gunas acting, knows the Self is beyond them, and is liberated. The qualities and destinations of one dominated by each guna are described.',
    keyVerses: [
      { ref: '14.19', sanskrit: 'नान्यं गुणेभ्यः कर्तारं यदा द्रष्टानुपश्यति', translation: 'When the seer sees no agent other than the gunas, and knows what is beyond them, he attains My state.' },
    ],
    takeaway: 'Observe the gunas; do not identify with them.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 15, slug: 'purushottama-yoga', sanskrit: 'पुरुषोत्तमयोग', english: 'The Yoga of the Supreme Person', iast: 'Puruṣottama-yoga', verseCount: 20, theme: 'The Ashvattha tree, the Supreme Purusha',
    yogaType: 'Purushottama Yoga',
    summary: 'The world is an inverted Ashvattha (peepul) tree — roots above, branches below. Cut it with the axe of non-attachment. There are two Purushas — the perishable (all beings) and the imperishable (kutastha). Beyond both is the Supreme Purusha (Purushottama) who pervades and supports the universe.',
    keyVerses: [
      { ref: '15.7', sanskrit: 'ममैवांशो जीवलोके जीवभूतः सनातनः', translation: 'An eternal portion of My own self has become the living soul in the world of beings.' },
      { ref: '15.15', sanskrit: 'सर्वस्य चाहं हृदि सन्निविष्टो', translation: 'I am seated in the hearts of all; from Me come memory, knowledge and reasoning.' },
    ],
    takeaway: 'The Self in you is a portion of the Supreme. Cut attachment to know it.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 16, slug: 'daivasura-sampad-vibhaga-yoga', sanskrit: 'दैवासुरसम्पद्विभागयोग', english: 'The Yoga of the Divine & Demoniac Natures', iast: 'Daivāsura-sampad-vibhāga-yoga', verseCount: 24, theme: 'Divine vs. demoniac qualities',
    yogaType: 'Daivasura Sampad Vibhaga',
    summary: 'Two types of beings: divine (daivi) and demoniac (asuri). The divine qualities (16.1-3): fearlessness, purity, charity, self-control, study, austerity, non-violence, truthfulness, peace. The demoniac (16.4): hypocrisy, arrogance, anger, harshness, ignorance. Demoniac people hate God in themselves and others; divine ones move toward liberation.',
    keyVerses: [
      { ref: '16.21', sanskrit: 'त्रिविधं नरकस्येदं द्वारं नाशनमात्मनः', translation: 'Three are the gates to hell, ruining the soul: lust, anger, greed. Therefore abandon them.' },
    ],
    takeaway: 'Cultivate divine qualities daily; renounce lust, anger, greed.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 17, slug: 'shraddha-traya-vibhaga-yoga', sanskrit: 'श्रद्धात्रयविभागयोग', english: 'The Yoga of the Threefold Faith', iast: 'Śraddhā-traya-vibhāga-yoga', verseCount: 28, theme: 'Faith, food, sacrifice, austerity by guna',
    yogaType: 'Shraddha Traya Vibhaga',
    summary: 'Faith is of three kinds, according to the guna predominant in a person. Food (sattvic = wholesome, juicy, oily, agreeable; rajasic = bitter, sour, salty, hot; tamasic = stale, tasteless), sacrifice, austerity and charity are each analyzed in three modes. The mantra "Om Tat Sat" indicates Brahman as the source.',
    keyVerses: [
      { ref: '17.3', sanskrit: 'सत्त्वानुरूपा सर्वस्य श्रद्धा भवति भारत', translation: 'The faith of each person is according to his nature, O Bharata. A person is what his faith is.' },
    ],
    takeaway: 'What you eat, give and worship reveals what you are.',
    whoSpeaks: 'Krishna',
  },
  {
    number: 18, slug: 'moksha-sannyasa-yoga', sanskrit: 'मोक्षसन्न्यासयोग', english: 'The Yoga of Liberation by Renunciation', iast: 'Mokṣa-sannyāsa-yoga', verseCount: 78, theme: 'The summing-up, the supreme secret',
    yogaType: 'Moksha Sannyasa',
    summary: 'The longest chapter, summarizing the entire Gita. Sannyasa is the renunciation of selfish action; tyaga is the renunciation of the fruits of action. The four varnas and their svadharmas are described. The conclusion (18.66): abandon all dharmas and take refuge in Me alone — I will liberate you from all sins. Arjuna says his doubt is gone; he will fight.',
    keyVerses: [
      { ref: '18.66', sanskrit: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज', translation: 'Abandoning all dharmas, take refuge in Me alone. I will liberate you from all sins. Do not grieve.' },
      { ref: '18.78', sanskrit: 'यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः', translation: 'Wherever there is Krishna the Lord of Yoga, and Partha the wielder of the bow — there will be prosperity, victory, well-being and sound judgment. So I believe.' },
    ],
    takeaway: 'Surrender. Act. The Divine carries the rest.',
    whoSpeaks: 'Krishna concludes; Arjuna affirms; Sanjaya gives the final benediction',
  },
];

export function chapterSlugs(): string[] {
  return GITA_CHAPTERS.map((c) => c.slug);
}

export function getChapter(slug: string): GitaChapter | undefined {
  return GITA_CHAPTERS.find((c) => c.slug === slug);
}

export const TOTAL_VERSES = GITA_CHAPTERS.reduce((s, c) => s + c.verseCount, 0); // 700
