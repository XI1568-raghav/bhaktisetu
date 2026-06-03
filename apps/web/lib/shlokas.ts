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
  {
    slug: 'gita-2-20',
    source: 'Bhagavad Gita 2.20',
    text: 'न जायते म्रियते वा कदाचि-\nन्नायं भूत्वा भविता वा न भूयः।\nअजो नित्यः शाश्वतोऽयं पुराणो\nन हन्यते हन्यमाने शरीरे॥',
    translit:
      'na jāyate mriyate vā kadācin\nnāyaṁ bhūtvā bhavitā vā na bhūyaḥ\najo nityaḥ śāśvato ’yaṁ purāṇo\nna hanyate hanyamāne śarīre',
    meaning:
      'The Self is never born nor dies; having been, it never ceases to be. Unborn, eternal, ever-abiding and primeval — it is not slain when the body is slain.',
    tags: ['gita', 'atman', 'immortality'],
  },
  {
    slug: 'gita-9-22',
    source: 'Bhagavad Gita 9.22',
    text: 'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।\nतेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम्॥',
    translit:
      'ananyāś cintayanto māṁ ye janāḥ paryupāsate\nteṣāṁ nityābhiyuktānāṁ yoga-kṣemaṁ vahāmy aham',
    meaning:
      'To those who worship Me with single-pointed devotion, I personally provide what they lack and preserve what they have.',
    tags: ['gita', 'devotion', 'protection'],
  },
  {
    slug: 'gita-15-7',
    source: 'Bhagavad Gita 15.7',
    text: 'ममैवांशो जीवलोके जीवभूतः सनातनः।\nमनःषष्ठानीन्द्रियाणि प्रकृतिस्थानि कर्षति॥',
    translit:
      'mamaivāṁśo jīva-loke jīva-bhūtaḥ sanātanaḥ\nmanaḥ-ṣaṣṭhānīndriyāṇi prakṛti-sthāni karṣati',
    meaning:
      'A fragment of My own eternal Self becomes the living being in this world, drawing to itself the senses, of which the mind is the sixth, rooted in material nature.',
    tags: ['gita', 'jivatma', 'wisdom'],
  },
  {
    slug: 'gita-12-13',
    source: 'Bhagavad Gita 12.13-14',
    text: 'अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च।\nनिर्ममो निरहंकारः समदुःखसुखः क्षमी॥',
    translit:
      'adveṣṭā sarva-bhūtānāṁ maitraḥ karuṇa eva ca\nnirmamo nirahaṅkāraḥ sama-duḥkha-sukhaḥ kṣamī',
    meaning:
      'One who is free from malice toward all beings, friendly and compassionate, without ego or sense of possession, equal in joy and sorrow, and forgiving — such a devotee is dear to Me.',
    tags: ['gita', 'devotee', 'qualities'],
  },
  {
    slug: 'gita-3-35',
    source: 'Bhagavad Gita 3.35',
    text: 'श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्।\nस्वधर्मे निधनं श्रेयः परधर्मो भयावहः॥',
    translit:
      'śreyān sva-dharmo viguṇaḥ para-dharmāt sv-anuṣṭhitāt\nsva-dharme nidhanaṁ śreyaḥ para-dharmo bhayāvahaḥ',
    meaning:
      'Better is one\'s own dharma, though imperfectly performed, than the dharma of another well discharged. Better death in one\'s own dharma; the dharma of another brings fear.',
    tags: ['gita', 'svadharma', 'duty'],
  },
  {
    slug: 'om-purnamadah',
    source: 'Isha Upanishad — Shanti Mantra',
    text: 'ॐ पूर्णमदः पूर्णमिदं पूर्णात्पूर्णमुदच्यते।\nपूर्णस्य पूर्णमादाय पूर्णमेवावशिष्यते॥\nॐ शान्तिः शान्तिः शान्तिः॥',
    translit:
      'oṁ pūrṇam adaḥ pūrṇam idaṁ pūrṇāt pūrṇam udacyate\npūrṇasya pūrṇam ādāya pūrṇam evāvaśiṣyate\noṁ śāntiḥ śāntiḥ śāntiḥ',
    meaning:
      'That is whole, this is whole; from the whole the whole emerges. Taking the whole from the whole, the whole alone remains. Om peace, peace, peace.',
    tags: ['upanishad', 'isha', 'shanti'],
  },
  {
    slug: 'saha-navavatu',
    source: 'Taittiriya / Katha Upanishad — Shanti Mantra',
    text: 'ॐ सह नाववतु। सह नौ भुनक्तु।\nसह वीर्यं करवावहै।\nतेजस्विनावधीतमस्तु मा विद्विषावहै॥\nॐ शान्तिः शान्तिः शान्तिः॥',
    translit:
      'oṁ saha nāv avatu. saha nau bhunaktu\nsaha vīryaṁ karavāvahai\ntejasvi nāv adhītam astu mā vidviṣāvahai\noṁ śāntiḥ śāntiḥ śāntiḥ',
    meaning:
      'May we, teacher and student, be protected together. May we be nourished together. May we work together with great vigour. May our study be enlightening; may we not have hatred for each other. Om peace, peace, peace.',
    tags: ['upanishad', 'teacher', 'shanti'],
  },
  {
    slug: 'tvameva-mata',
    source: 'Traditional Pandava Gita — Surrender prayer',
    text: 'त्वमेव माता च पिता त्वमेव।\nत्वमेव बन्धुश्च सखा त्वमेव।\nत्वमेव विद्या द्रविणं त्वमेव।\nत्वमेव सर्वं मम देव देव॥',
    translit:
      'tvam eva mātā ca pitā tvam eva\ntvam eva bandhuś ca sakhā tvam eva\ntvam eva vidyā draviṇaṁ tvam eva\ntvam eva sarvaṁ mama deva deva',
    meaning:
      'You alone are my mother and father. You alone are my kin and friend. You alone are my knowledge and wealth. You alone are everything to me, O Lord of Lords.',
    tags: ['surrender', 'prayer', 'devotion'],
  },
  {
    slug: 'guru-brahma',
    source: 'Guru Stotram — Skanda Purana',
    text: 'गुरुर्ब्रह्मा गुरुर्विष्णुः गुरुर्देवो महेश्वरः।\nगुरुः साक्षात् परं ब्रह्म तस्मै श्रीगुरवे नमः॥',
    translit:
      'gurur brahmā gurur viṣṇuḥ gurur devo maheśvaraḥ\nguruḥ sākṣāt paraṁ brahma tasmai śrī-gurave namaḥ',
    meaning:
      'The guru is Brahma, the guru is Vishnu, the guru is Lord Shiva. The guru is the Supreme Brahman directly perceived. Salutations to that revered guru.',
    tags: ['guru', 'invocation', 'reverence'],
  },
  {
    slug: 'karagre-vasate',
    source: 'Traditional Karadarshanam — Morning prayer',
    text: 'कराग्रे वसते लक्ष्मीः करमध्ये सरस्वती।\nकरमूले तु गोविन्दः प्रभाते करदर्शनम्॥',
    translit:
      'karāgre vasate lakṣmīḥ kara-madhye sarasvatī\nkara-mūle tu govindaḥ prabhāte kara-darśanam',
    meaning:
      'At the fingertips dwells Lakshmi, at the palm Saraswati, and at the wrist Govinda. So at dawn I gaze upon my hands.',
    tags: ['morning', 'prayer', 'lakshmi'],
  },
  {
    slug: 'asatoma-sadgamaya-pavamana',
    source: 'Pavamana Mantra — Brihadaranyaka 1.3.28',
    text: 'ॐ असतो मा सद्गमय।\nतमसो मा ज्योतिर्गमय।\nमृत्योर्मामृतं गमय।\nॐ शान्तिः शान्तिः शान्तिः॥',
    translit:
      'oṁ asato mā sad gamaya\ntamaso mā jyotir gamaya\nmṛtyor mā amṛtaṁ gamaya\noṁ śāntiḥ śāntiḥ śāntiḥ',
    meaning:
      'From the unreal lead me to the real. From darkness lead me to light. From death lead me to immortality. Om peace, peace, peace.',
    tags: ['pavamana', 'shanti', 'upanishad'],
  },
  {
    slug: 'gita-6-5',
    source: 'Bhagavad Gita 6.5',
    text: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।\nआत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥',
    translit:
      'uddhared ātmanātmānaṁ nātmānam avasādayet\nātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ',
    meaning:
      'Let one lift the self by the Self alone; let one not degrade the self. The self alone is the friend of the self, and the self alone is the enemy of the self.',
    tags: ['gita', 'self', 'discipline'],
  },
  {
    slug: 'gita-2-14',
    source: 'Bhagavad Gita 2.14',
    text: 'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः।\nआगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत॥',
    translit:
      'mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ\nāgamāpāyino \'nityās tāṁs titikṣasva bhārata',
    meaning:
      'O Kaunteya, contact of the senses with objects gives rise to heat and cold, pleasure and pain. They come and go, impermanent — endure them, O Bharata.',
    tags: ['gita', 'endurance', 'equanimity'],
  },
  {
    slug: 'isha-upanishad-1',
    source: 'Isha Upanishad 1',
    text: 'ॐ ईशा वास्यमिदं सर्वं यत्किञ्च जगत्यां जगत्।\nतेन त्यक्तेन भुञ्जीथा मा गृधः कस्यस्विद्धनम्॥',
    translit:
      'oṁ īśā vāsyam idaṁ sarvaṁ yat kiñca jagatyāṁ jagat\ntena tyaktena bhuñjīthā mā gṛdhaḥ kasya svid dhanam',
    meaning:
      'All this — whatever moves in this moving world — is pervaded by the Lord. Enjoy through renunciation; do not covet anyone\'s wealth.',
    tags: ['upanishad', 'isha', 'renunciation'],
  },
  {
    slug: 'kena-upanishad-1-3',
    source: 'Kena Upanishad 1.3',
    text: 'न तत्र चक्षुर्गच्छति न वाग्गच्छति नो मनो।\nन विद्मो न विजानीमो यथैतदनुशिष्यात्॥',
    translit:
      'na tatra cakṣur gacchati na vāg gacchati no mano\nna vidmo na vijānīmo yathaitad anuśiṣyāt',
    meaning:
      'There the eye does not reach, speech does not reach, nor the mind. We know not, we understand not how one can teach this.',
    tags: ['upanishad', 'kena', 'brahman'],
  },
  {
    slug: 'mundaka-3-1-1',
    source: 'Mundaka Upanishad 3.1.1',
    text: 'द्वा सुपर्णा सयुजा सखाया समानं वृक्षं परिषस्वजाते।\nतयोरन्यः पिप्पलं स्वाद्वत्त्यनश्नन्नन्यो अभिचाकशीति॥',
    translit:
      'dvā suparṇā sayujā sakhāyā samānaṁ vṛkṣaṁ pariṣasvajāte\ntayor anyaḥ pippalaṁ svādv atty anaśnann anyo abhicākaśīti',
    meaning:
      'Two birds, inseparable companions, perch on the same tree. One eats the sweet fruit; the other looks on without eating.',
    tags: ['upanishad', 'mundaka', 'jiva-paramatma'],
  },
  {
    slug: 'taittiriya-1-11-2',
    source: 'Taittiriya Upanishad 1.11.2',
    text: 'सत्यं वद। धर्मं चर। स्वाध्यायान्मा प्रमदः।\nमातृदेवो भव। पितृदेवो भव। आचार्यदेवो भव। अतिथिदेवो भव॥',
    translit:
      'satyaṁ vada | dharmaṁ cara | svādhyāyān mā pramadaḥ\nmātṛ-devo bhava | pitṛ-devo bhava | ācārya-devo bhava | atithi-devo bhava',
    meaning:
      'Speak the truth. Practice dharma. Do not neglect study. Treat your mother as God, your father as God, your teacher as God, your guest as God.',
    tags: ['upanishad', 'taittiriya', 'conduct'],
  },
  {
    slug: 'hanuman-stuti',
    source: 'Hanuman Stuti — Ramayana',
    text: 'मनोजवं मारुततुल्यवेगं जितेन्द्रियं बुद्धिमतां वरिष्ठम्।\nवातात्मजं वानरयूथमुख्यं श्रीरामदूतं शरणं प्रपद्ये॥',
    translit:
      'mano-javaṁ māruta-tulya-vegaṁ jitendriyaṁ buddhimatāṁ variṣṭham\nvātātmajaṁ vānara-yūtha-mukhyaṁ śrī-rāma-dūtaṁ śaraṇaṁ prapadye',
    meaning:
      'I take refuge in the messenger of Sri Rama — swift as the mind, fleet as the wind, master of the senses, foremost of the wise, son of the wind, chief of the vanara host.',
    tags: ['hanuman', 'stuti', 'ramayana'],
  },
  {
    slug: 'ya-devi-sarvabhuteshu',
    source: 'Devi Mahatmyam — Ya Devi Sarvabhuteshu',
    text: 'या देवी सर्वभूतेषु शक्तिरूपेण संस्थिता।\nनमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः॥',
    translit:
      'yā devī sarva-bhūteṣu śakti-rūpeṇa saṁsthitā\nnamas tasyai namas tasyai namas tasyai namo namaḥ',
    meaning:
      'To the Goddess who abides in all beings in the form of Power — salutations to Her, salutations to Her, salutations to Her, salutations again and again.',
    tags: ['durga', 'shakti', 'devi-mahatmya'],
  },
  {
    slug: 'gita-2-62-63',
    source: 'Bhagavad Gita 2.62-63',
    text: 'ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते।\nसङ्गात्सञ्जायते कामः कामात्क्रोधोऽभिजायते॥\nक्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः।\nस्मृतिभ्रंशाद् बुद्धिनाशो बुद्धिनाशात्प्रणश्यति॥',
    translit:
      'dhyāyato viṣayān puṁsaḥ saṅgas teṣūpajāyate\nsaṅgāt sañjāyate kāmaḥ kāmāt krodho \'bhijāyate\nkrodhād bhavati sammohaḥ sammohāt smṛti-vibhramaḥ\nsmṛti-bhraṁśād buddhi-nāśo buddhi-nāśāt praṇaśyati',
    meaning:
      'Brooding on sense objects breeds attachment; attachment breeds desire; desire breeds anger. Anger breeds delusion; delusion confuses memory; loss of memory destroys discrimination; with discrimination destroyed, one perishes.',
    tags: ['gita', 'mind', 'discipline'],
  },
  {
    slug: 'narayana-suktam-opening',
    source: 'Narayana Suktam — Taittiriya Aranyaka',
    text: 'सहस्रशीर्षं देवं विश्वाक्षं विश्वशम्भुवम्।\nविश्वं नारायणं देवमक्षरं परमं पदम्॥',
    translit:
      'sahasra-śīrṣaṁ devaṁ viśvākṣaṁ viśva-śambhuvam\nviśvaṁ nārāyaṇaṁ devam akṣaraṁ paramaṁ padam',
    meaning:
      'The God with a thousand heads, all-seeing, source of all welfare — the universe is Narayana, the imperishable, the supreme abode.',
    tags: ['narayana', 'vishnu', 'sukta'],
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
