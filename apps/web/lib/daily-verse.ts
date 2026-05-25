export interface Verse {
  id: string;
  sanskrit: string;
  transliteration: string;
  translation: string;
  source: string;
  reference: string;
}

const VERSES: Verse[] = [
  {
    id: 'gita-2-47',
    sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन ।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि ॥',
    transliteration: 'karmaṇy-evādhikāras te mā phaleṣu kadācana | mā karma-phala-hetur bhūr mā te saṅgo \'stv akarmaṇi ||',
    translation: 'You have a right to action alone, never to its fruits. Let not the fruits of action be your motive, nor let your attachment be to inaction.',
    source: 'Bhagavad Gita',
    reference: '2.47',
  },
  {
    id: 'isha-1',
    sanskrit: 'ईशा वास्यमिदं सर्वं यत्किञ्च जगत्यां जगत् ।\nतेन त्यक्तेन भुञ्जीथा मा गृधः कस्यस्विद्धनम् ॥',
    transliteration: 'īśā vāsyam idaṁ sarvaṁ yat kiñca jagatyāṁ jagat | tena tyaktena bhuñjīthā mā gṛdhaḥ kasyasvid dhanam ||',
    translation: 'All this — whatever moves in this moving world — is enveloped by the Lord. Enjoy by renunciation; do not covet any wealth.',
    source: 'Isha Upanishad',
    reference: '1',
  },
  {
    id: 'rigveda-1-1-1',
    sanskrit: 'अग्निमीळे पुरोहितं यज्ञस्य देवमृत्विजम् ।\nहोतारं रत्नधातमम् ॥',
    transliteration: 'agnim īḷe purohitaṁ yajñasya devam ṛtvijam | hotāraṁ ratna-dhātamam ||',
    translation: 'I praise Agni, the chosen priest, divine, minister of sacrifice, the invoker, bestower of treasure.',
    source: 'Rigveda',
    reference: '1.1.1',
  },
  {
    id: 'gita-18-66',
    sanskrit: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज ।\nअहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः ॥',
    transliteration: 'sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja | ahaṁ tvā sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ ||',
    translation: 'Abandoning all duties, take refuge in Me alone. I shall liberate you from all sins; do not grieve.',
    source: 'Bhagavad Gita',
    reference: '18.66',
  },
  {
    id: 'mundaka-3-1-1',
    sanskrit: 'द्वा सुपर्णा सयुजा सखाया समानं वृक्षं परिषस्वजाते ।\nतयोरन्यः पिप्पलं स्वाद्वत्त्यनश्नन्नन्यो अभिचाकशीति ॥',
    transliteration: 'dvā suparṇā sayujā sakhāyā samānaṁ vṛkṣaṁ pariṣasvajāte | tayor anyaḥ pippalaṁ svādv atty anaśnann anyo abhicākaśīti ||',
    translation: 'Two birds, inseparable companions, perch on the same tree. One eats the sweet fruit; the other looks on without eating.',
    source: 'Mundaka Upanishad',
    reference: '3.1.1',
  },
  {
    id: 'brihad-1-3-28',
    sanskrit: 'असतो मा सद्गमय । तमसो मा ज्योतिर्गमय । मृत्योर्मा अमृतं गमय ॥',
    transliteration: 'asato mā sad gamaya | tamaso mā jyotir gamaya | mṛtyor mā amṛtaṁ gamaya ||',
    translation: 'Lead me from the unreal to the real, from darkness to light, from death to immortality.',
    source: 'Brihadaranyaka Upanishad',
    reference: '1.3.28',
  },
  {
    id: 'gita-6-5',
    sanskrit: 'उद्धरेदात्मनाऽऽत्मानं नात्मानमवसादयेत् ।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः ॥',
    transliteration: 'uddhared ātmanātmānaṁ nātmānam avasādayet | ātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ ||',
    translation: 'Let one lift oneself by oneself; let one not degrade oneself. The self alone is the friend of the self, and the self alone is the enemy of the self.',
    source: 'Bhagavad Gita',
    reference: '6.5',
  },
  {
    id: 'gayatri',
    sanskrit: 'ॐ भूर्भुवः स्वः ।\nतत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि ।\nधियो यो नः प्रचोदयात् ॥',
    transliteration: 'oṁ bhūr bhuvaḥ svaḥ | tat savitur vareṇyaṁ bhargo devasya dhīmahi | dhiyo yo naḥ pracodayāt ||',
    translation: 'We meditate on the glorious splendour of the divine Sun; may it inspire our intellects.',
    source: 'Rigveda',
    reference: '3.62.10',
  },
  {
    id: 'shanti-mantra',
    sanskrit: 'ॐ सर्वे भवन्तु सुखिनः । सर्वे सन्तु निरामयाः ।\nसर्वे भद्राणि पश्यन्तु । मा कश्चिद्दुःखभाग्भवेत् ॥',
    transliteration: 'oṁ sarve bhavantu sukhinaḥ | sarve santu nirāmayāḥ | sarve bhadrāṇi paśyantu | mā kaścid duḥkha-bhāg bhavet ||',
    translation: 'May all be happy. May all be free from illness. May all see what is auspicious. May no one suffer.',
    source: 'Brihadaranyaka Upanishad',
    reference: 'Shanti Mantra',
  },
  {
    id: 'yoga-sutra-1-2',
    sanskrit: 'योगश्चित्तवृत्तिनिरोधः ॥',
    transliteration: 'yogaś citta-vṛtti-nirodhaḥ ||',
    translation: 'Yoga is the cessation of fluctuations of the mind.',
    source: 'Yoga Sutras of Patanjali',
    reference: '1.2',
  },
];

export function getVerseForDate(date: Date = new Date()): Verse {
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const day = Math.floor(utc / 86400000);
  return VERSES[day % VERSES.length]!;
}

export function getAllVerses(): Verse[] {
  return VERSES.slice();
}
