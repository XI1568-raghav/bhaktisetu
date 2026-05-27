// Seed shloka catalogue. Each shloka has a stable slug used in
// /shlokas/<slug> share URLs and in the social-queue agent output. Kept
// small + curated so the surface is non-controversial and SEO-clean from
// day one. New shlokas can be appended; never delete or re-order (slugs
// must remain stable for backlinks).

export type Shloka = {
  slug: string;
  source: string;
  text: string;
  translit?: string;
  meaning: string;
  tags: string[];
};

export const SHLOKAS: Shloka[] = [
  {
    slug: 'gita-2-47',
    source: 'Bhagavad Gita 2.47',
    text: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।\nमा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥',
    translit:
      'karmaṇy-evādhikāras te mā phaleṣu kadācana\nmā karma-phala-hetur bhūr mā te saṅgo ’stv akarmaṇi',
    meaning:
      'You have the right to action alone, never to its fruits. Let not the fruits of action be your motive, nor let your attachment be to inaction.',
    tags: ['karma', 'gita', 'duty'],
  },
  {
    slug: 'gita-4-7',
    source: 'Bhagavad Gita 4.7',
    text: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत।\nअभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥',
    translit:
      'yadā yadā hi dharmasya glānir bhavati bhārata\nabhyutthānam adharmasya tadātmānaṁ sṛjāmy aham',
    meaning:
      'Whenever there is a decline in dharma and a rise in adharma, O Bharata, I manifest Myself.',
    tags: ['dharma', 'gita', 'avatar'],
  },
  {
    slug: 'shanti-mantra',
    source: 'Brihadaranyaka Upanishad 1.3.28',
    text: 'ॐ असतो मा सद्गमय।\nतमसो मा ज्योतिर्गमय।\nमृत्योर्मा अमृतं गमय॥',
    translit:
      'oṁ asato mā sad gamaya\ntamaso mā jyotir gamaya\nmṛtyor mā amṛtaṁ gamaya',
    meaning:
      'Lead me from the unreal to the real, from darkness to light, from death to immortality.',
    tags: ['upanishad', 'shanti', 'prayer'],
  },
  {
    slug: 'sarve-bhavantu',
    source: 'Brihadaranyaka Upanishad',
    text: 'सर्वे भवन्तु सुखिनः।\nसर्वे सन्तु निरामयाः।\nसर्वे भद्राणि पश्यन्तु।\nमा कश्चिद् दुःखभाग् भवेत्॥',
    translit:
      'sarve bhavantu sukhinaḥ\nsarve santu nirāmayāḥ\nsarve bhadrāṇi paśyantu\nmā kaścid duḥkha-bhāg bhavet',
    meaning:
      'May all beings be happy. May all be free from illness. May all see what is auspicious. May no one suffer.',
    tags: ['universal', 'prayer', 'peace'],
  },
  {
    slug: 'gayatri-mantra',
    source: 'Rigveda 3.62.10',
    text: 'ॐ भूर्भुवः स्वः।\nतत्सवितुर्वरेण्यम्।\nभर्गो देवस्य धीमहि।\nधियो यो नः प्रचोदयात्॥',
    translit:
      'oṁ bhūr bhuvaḥ svaḥ\ntat savitur vareṇyaṁ\nbhargo devasya dhīmahi\ndhiyo yo naḥ pracodayāt',
    meaning:
      'We meditate upon the radiant glory of the divine Sun; may it illumine our minds.',
    tags: ['rigveda', 'mantra', 'gayatri'],
  },
  {
    slug: 'gita-18-66',
    source: 'Bhagavad Gita 18.66',
    text: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।\nअहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥',
    translit:
      'sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja\nahaṁ tvāṁ sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ',
    meaning:
      'Abandon all varieties of dharma and surrender unto Me alone. I shall liberate you from all sins; do not grieve.',
    tags: ['gita', 'surrender', 'moksha'],
  },
  {
    slug: 'ganesh-vandana',
    source: 'Traditional invocation',
    text: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।\nनिर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥',
    translit:
      'vakratuṇḍa mahākāya sūrya-koṭi sama-prabha\nnirvighnaṁ kuru me deva sarva-kāryeṣu sarvadā',
    meaning:
      'O Lord with curved trunk and mighty form, radiant as a million suns, remove all obstacles from my endeavours, always.',
    tags: ['ganesh', 'invocation', 'beginning'],
  },
  {
    slug: 'maha-mrityunjaya',
    source: 'Rigveda 7.59.12',
    text: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्।\nउर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्॥',
    translit:
      'oṁ tryambakaṁ yajāmahe sugandhiṁ puṣṭi-vardhanam\nurvārukam iva bandhanān mṛtyor mukṣīya māmṛtāt',
    meaning:
      'We worship the three-eyed One, the fragrant, the nourisher. May He liberate us from the bondage of death, as a cucumber from its stem — granting us immortality.',
    tags: ['shiva', 'mantra', 'healing'],
  },
];

export function getShloka(slug: string): Shloka | undefined {
  return SHLOKAS.find((s) => s.slug === slug);
}

export function shlokaShareUrl(slug: string): string {
  return `https://darshya.online/shlokas/${slug}`;
}

export function shlokaOgUrl(slug: string): string {
  const s = getShloka(slug);
  if (!s) return 'https://darshya.online/og/default';
  const q = new URLSearchParams({
    text: s.text,
    ...(s.translit ? { translit: s.translit } : {}),
    meaning: s.meaning,
    source: s.source,
  });
  return `https://darshya.online/og/shloka?${q.toString()}`;
}
