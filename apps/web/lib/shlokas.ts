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
  {
    slug: 'gita-9-22',
    source: 'Bhagavad Gita 9.22',
    text: 'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते।\nतेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम्॥',
    translit:
      'ananyāś cintayanto māṁ ye janāḥ paryupāsate\nteṣāṁ nityābhiyuktānāṁ yoga-kṣemaṁ vahāmy aham',
    meaning:
      'To those who worship Me with single-minded devotion and ever remain steadfast, I personally carry what they lack and preserve what they have.',
    tags: ['gita', 'devotion', 'surrender'],
  },
  {
    slug: 'gita-18-66',
    source: 'Bhagavad Gita 18.66 — Charama Shloka',
    text: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज।\nअहं त्वा सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥',
    translit:
      'sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja\nahaṁ tvā sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ',
    meaning:
      'Abandon all varieties of dharma and simply surrender unto Me alone. I shall liberate you from all sins; do not grieve.',
    tags: ['gita', 'surrender', 'liberation', 'charama'],
  },
  {
    slug: 'gita-7-7',
    source: 'Bhagavad Gita 7.7',
    text: 'मत्तः परतरं नान्यत्किञ्चिदस्ति धनञ्जय।\nमयि सर्वमिदं प्रोतं सूत्रे मणिगणा इव॥',
    translit:
      'mattaḥ parataraṁ nānyat kiñcid asti dhanañjaya\nmayi sarvam idaṁ protaṁ sūtre maṇi-gaṇā iva',
    meaning:
      'There is nothing higher than Me, O Arjuna. Everything rests upon Me as pearls strung upon a thread.',
    tags: ['gita', 'oneness', 'krishna'],
  },
  {
    slug: 'katha-upanishad-1-3-14',
    source: 'Katha Upanishad 1.3.14',
    text: 'उत्तिष्ठत जाग्रत प्राप्य वरान्निबोधत।\nक्षुरस्य धारा निशिता दुरत्यया दुर्गं पथस्तत्कवयो वदन्ति॥',
    translit:
      'uttiṣṭhata jāgrata prāpya varān nibodhata\nkṣurasya dhārā niśitā duratyayā durgaṁ pathas tat kavayo vadanti',
    meaning:
      'Arise! Awake! Approach the great teachers and learn. The path is sharp as a razor\'s edge, hard to traverse — so the wise declare.',
    tags: ['upanishad', 'awakening', 'effort'],
  },
  {
    slug: 'mundaka-3-2-3',
    source: 'Mundaka Upanishad 3.2.3',
    text: 'नायमात्मा प्रवचनेन लभ्यो न मेधया न बहुना श्रुतेन।\nयमेवैष वृणुते तेन लभ्यस्तस्यैष आत्मा विवृणुते तनूं स्वाम्॥',
    translit:
      'nāyam ātmā pravacanena labhyo na medhayā na bahunā śrutena\nyam evaiṣa vṛṇute tena labhyas tasyaiṣa ātmā vivṛṇute tanūṁ svām',
    meaning:
      'The Self cannot be attained by discourse, nor by intellect, nor by much learning. He whom the Self chooses — by him alone is It attained; to him the Self reveals Its own nature.',
    tags: ['upanishad', 'self', 'grace'],
  },
  {
    slug: 'durga-saptashati-ya-devi-shanti',
    source: 'Durga Saptashati 5.20 (Ya Devi — Shanti form)',
    text: 'या देवी सर्वभूतेषु शान्तिरूपेण संस्थिता।\nनमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः॥',
    translit:
      'yā devī sarva-bhūteṣu śānti-rūpeṇa saṁsthitā\nnamas tasyai namas tasyai namas tasyai namo namaḥ',
    meaning:
      'To that Goddess who dwells in all beings as Peace — salutations again and again unto Her.',
    tags: ['devi', 'shanti', 'saptashati'],
  },
  {
    slug: 'rudram-namakam-opening',
    source: 'Sri Rudram — Namakam, Yajurveda',
    text: 'नमस्ते रुद्र मन्यव उतो त इषवे नमः।\nनमस्ते अस्तु धन्वने बाहुभ्यामुत ते नमः॥',
    translit:
      'namas te rudra manyava uto ta iṣave namaḥ\nnamas te astu dhanvane bāhubhyām uta te namaḥ',
    meaning:
      'Salutations to your wrath, O Rudra, and salutations to your arrow. Salutations to your bow, and salutations to your two arms.',
    tags: ['rudra', 'shiva', 'veda', 'rudram'],
  },
  {
    slug: 'yoga-sutra-1-2',
    source: 'Patanjali Yoga Sutra 1.2',
    text: 'योगश्चित्तवृत्तिनिरोधः॥',
    translit: 'yogaś-citta-vṛtti-nirodhaḥ',
    meaning:
      'Yoga is the cessation of the modifications of the mind. The definitional sutra of all Yoga — Patanjali frames yoga not as posture or breath but as the stilling of the whirlpools (vrittis) of consciousness so the seer may rest in his own true nature (1.3).',
    tags: ['yoga-sutra', 'patanjali', 'definition', 'meditation'],
  },
  {
    slug: 'tat-tvam-asi',
    source: 'Chandogya Upanishad 6.8.7 (Sama Veda)',
    text: 'स य एषोऽणिमा ऐतदात्म्यमिदं सर्वं तत्सत्यं स आत्मा तत्त्वमसि श्वेतकेतो॥',
    translit:
      'sa ya eṣo’ṇimā aitad-ātmyam idaṁ sarvaṁ tat satyaṁ sa ātmā tat tvam asi śvetaketo',
    meaning:
      'That which is this subtle essence — all this has its self in it. That alone is the Real. That is the Self. That thou art, O Shvetaketu. The supreme Mahavakya of the Sama Veda — Uddalaka Aruni’s instruction to his son Shvetaketu, equating the individual atman with the cosmic Brahman.',
    tags: ['mahavakya', 'upanishad', 'chandogya', 'advaita', 'sama-veda'],
  },
  {
    slug: 'purusha-suktam-opening',
    source: 'Rigveda 10.90.1 (Purusha Suktam)',
    text: 'सहस्रशीर्षा पुरुषः सहस्राक्षः सहस्रपात्।\nस भूमिं विश्वतो वृत्वात्यतिष्ठद्दशाङ्गुलम्॥',
    translit:
      'sahasra-śīrṣā puruṣaḥ sahasrākṣaḥ sahasra-pāt\nsa bhūmiṁ viśvato vṛtvāty-atiṣṭhad daśāṅgulam',
    meaning:
      'The Cosmic Person has a thousand heads, a thousand eyes, a thousand feet. Pervading the earth on all sides, he extends beyond it by the measure of ten fingers. The opening verse of the Purusha Suktam — recited in every major Vedic puja, abhisheka and yajna across India.',
    tags: ['rigveda', 'purusha-suktam', 'yajna', 'cosmology', 'veda'],
  },
  {
    slug: 'sri-suktam-opening',
    source: 'Sri Suktam — Khila Rigveda',
    text: 'हिरण्यवर्णां हरिणीं सुवर्णरजतस्रजाम्।\nचन्द्रां हिरण्मयीं लक्ष्मीं जातवेदो म आ वह॥',
    translit:
      'hiraṇya-varṇāṁ hariṇīṁ suvarṇa-rajata-srajām\ncandrāṁ hiraṇmayīṁ lakṣmīṁ jātavedo ma ā vaha',
    meaning:
      'O Jataveda (Agni), bring to me that Lakshmi of golden hue, deer-eyed, adorned with garlands of gold and silver, moon-bright, made of gold. The opening verse of Sri Suktam — chanted during Lakshmi Puja, Diwali, Varalakshmi Vratam and Kanakadhara Stotra recitations.',
    tags: ['lakshmi', 'rigveda', 'sri-suktam', 'diwali', 'wealth'],
  },
  {
    slug: 'nirvana-shatakam-1',
    source: 'Adi Shankara — Nirvana Shatakam / Atma Shatakam, verse 1',
    text: 'मनोबुद्ध्यहङ्कारचित्तानि नाहं\nन च श्रोत्रजिह्वे न च घ्राणनेत्रे।\nन च व्योमभूमिर्न तेजो न वायुः\nचिदानन्दरूपः शिवोऽहं शिवोऽहम्॥',
    translit:
      'mano-buddhy-ahaṅkāra-cittāni nāhaṁ\nna ca śrotra-jihve na ca ghrāṇa-netre\nna ca vyoma-bhūmir na tejo na vāyuḥ\ncidānanda-rūpaḥ śivo’haṁ śivo’ham',
    meaning:
      'I am not the mind, intellect, ego, or memory; I am not the ears, tongue, nose or eyes; I am not space, earth, fire or wind. I am the form of pure consciousness and bliss — I am Shiva, I am Shiva. The opening of Adi Shankaracharya’s six-verse Nirvana Shatakam, the foundational chant of Advaita Vedanta self-negation leading to Brahman-identification.',
    tags: ['shankara', 'advaita', 'nirvana-shatakam', 'shivoham', 'vedanta'],
  },
  {
    slug: 'gita-2-48',
    source: 'Bhagavad Gita 2.48 — Sankhya Yoga',
    text: 'योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय।\nसिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥',
    translit:
      'yogasthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya\nsiddhyasiddhyoḥ samo bhūtvā samatvaṁ yoga ucyate',
    meaning:
      'Established in yoga, O Dhananjaya, perform your duties having abandoned attachment, remaining equipoised in success and failure alike — this evenness of mind is called yoga. Krishna here distills Karma Yoga into a single sutra: action is unavoidable, but bondage arises only from the ego\'s craving for a particular fruit. By surrendering the result while sincerely discharging svadharma, the seeker dissolves the dvandvas (pleasure-pain, gain-loss) that otherwise churn the chitta. Samatva — equanimity rooted in the Atman — is itself defined as yoga, the prerequisite to jnana and the gateway to nishkama karma that purifies the heart.',
    tags: ['bhagavad-gita', 'karma-yoga', 'samatvam', 'krishna', 'arjuna'],
  },
  {
    slug: 'bhaja-govindam-1',
    source: 'Bhaja Govindam (Moha Mudgara) Verse 1 — Adi Shankaracharya',
    text: 'भज गोविन्दं भज गोविन्दं गोविन्दं भज मूढमते।\nसम्प्राप्ते सन्निहिते काले न हि न हि रक्षति डुकृञ्करणे॥',
    translit:
      'bhaja govindaṁ bhaja govindaṁ govindaṁ bhaja mūḍhamate\nsamprāpte sannihite kāle na hi na hi rakṣati ḍukṛñkaraṇe',
    meaning:
      'Worship Govinda, worship Govinda, worship Govinda, O deluded mind — when the appointed hour of death draws near, the rules of grammar (ḍukṛñ-karaṇe) will certainly not save you. Shankaracharya composed this on the ghats of Kashi after rebuking an aged pandit drilling Panini\'s sutras while life ebbed away. The verse is the bija of the entire Moha-Mudgara: dry scholarship divorced from bhakti and Atma-vichara cannot ferry the jiva across samsara. Only constant remembrance of Govinda — the Lord who is sat-chit-ananda — dissolves moha and grants liberation when Yama arrives.',
    tags: ['bhaja-govindam', 'shankaracharya', 'bhakti', 'vairagya', 'govinda'],
  },
  {
    slug: 'shiva-mahimna-1',
    source: 'Shiva Mahimna Stotra Verse 1 — Pushpadanta',
    text: 'महिम्नः पारं ते परमविदुषो यद्यसदृशी\nस्तुतिर्ब्रह्मादीनामपि तदवसन्नास्त्वयि गिरः।\nअथावाच्यः सर्वः स्वमतिपरिणामावधि गृणन्\nममाप्येष स्तोत्रे हर निरपवादः परिकरः॥',
    translit:
      'mahimnaḥ pāraṁ te paramaviduṣo yadyasadṛśī\nstutirbrahmādīnāmapi tadavasannāstvayi giraḥ\nathāvācyaḥ sarvaḥ svamatipariṇāmāvadhi gṛṇan\nmamāpyeṣa stotre hara nirapavādaḥ parikaraḥ',
    meaning:
      'O Hara, if praise offered by one ignorant of the farther shore of Thy greatness be unworthy, then even the hymns of Brahma and the gods fall short, for words falter before Thee. Yet since every devotee may extol the Lord to the limit of his own understanding without blame, this stotra of mine too is a faultless offering. The Gandharva king Pushpadanta, cursed for trampling Shiva\'s flowers, sings this opening to acknowledge that the Mahadeva\'s mahima is anirvachaniya — beyond speech and mind. Sincere bhakti, not eloquence, sanctifies stuti; the Lord receives the bhava, not the polish.',
    tags: ['shiva', 'mahimna-stotra', 'pushpadanta', 'stotra', 'bhakti'],
  },
  {
    slug: 'lalita-sahasranama-opening',
    source: 'Lalita Sahasranama Dhyanam — Brahmanda Purana, Uttara Khanda',
    text: 'सिन्दूरारुणविग्रहां त्रिनयनां माणिक्यमौलिस्फुरत्\nतारानायकशेखरां स्मितमुखीमापीनवक्षोरुहाम्।\nपाणिभ्यामलिपूर्णरत्नचषकं रक्तोत्पलं बिभ्रतीं\nसौम्यां रत्नघटस्थरक्तचरणां ध्यायेत्परामम्बिकाम्॥',
    translit:
      'sindūrāruṇa-vigrahāṁ trinayanāṁ māṇikya-mauli-sphurat\ntārā-nāyaka-śekharāṁ smita-mukhīm-āpīna-vakṣoruhām\npāṇibhyām-ali-pūrṇa-ratna-caṣakaṁ raktotpalaṁ bibhratīṁ\nsaumyāṁ ratna-ghaṭa-stha-rakta-caraṇāṁ dhyāyet-parām-ambikām',
    meaning:
      'Let one meditate on the Supreme Mother Lalita-Tripurasundari whose form glows vermilion like the dawn, who bears three eyes, whose ruby crown sparkles with the crescent moon as a diadem, whose face is gently smiling and whose bosom is full; in her two hands she holds a jewelled cup brimming with mead and a red lotus; serene of mien, her crimson feet rest upon a jewel-studded pot. This dhyana sloka opens the Sri Lalita Sahasranama recited by Hayagriva to Agastya, fixing the upasaka\'s chitta on the Devi\'s saguna form before invoking the thousand names. The vermilion hue signifies pure rajas wielded for grace; the cup and lotus are bhoga and moksha bestowed simultaneously upon the sincere sadhaka.',
    tags: ['lalita-sahasranama', 'devi', 'tripurasundari', 'dhyanam', 'sri-vidya'],
  },
  {
    slug: 'narayaniyam-1-1',
    source: 'Narayaniyam Dashaka 1, Verse 1 — Melpathur Narayana Bhattathiri',
    text: 'साद्रानन्दावबोधात्मकमनुपमितं कालदेशावधिभ्यां\nनिर्मुक्तं नित्यमुक्तं निगमशतसहस्रेण निर्भास्यमानम्।\nअस्पष्टं दृष्टमात्रे पुनरुरुपुरुषार्थात्मकं ब्रह्म तत्त्वं\nतत्तावद्भाति साक्षाद् गुरुपवनपुरे हन्त भाग्यं जनानाम्॥',
    translit:
      'sāndrānandāvabodhātmakam-anupamitaṁ kāla-deśāvadhibhyāṁ\nnirmuktaṁ nitya-muktaṁ nigama-śata-sahasreṇa nirbhāsyamānam\naspaṣṭaṁ dṛṣṭa-mātre punar-uru-puruṣārthātmakaṁ brahma tattvaṁ\ntat-tāvad-bhāti sākṣād guru-pavana-pure hanta bhāgyaṁ janānām',
    meaning:
      'That Brahman — whose very nature is dense bliss and pure consciousness, beyond compare, free from the limits of time and space, eternally liberated, illumined by hundreds of thousands of Vedic utterances, indistinct yet the embodiment of the four purusharthas the moment it is glimpsed — that selfsame Tattva shines visibly in Guruvayur. Alas, what fortune is this of the people! Bhattathiri opens the Narayaniyam by declaring that the nirguna Para-Brahman of the Upanishads has, out of grace, assumed saguna form as Guruvayurappan. Composed in 1586 CE as a cure for the poet\'s paralysis through Krishna-bhakti, this mangala-shloka fuses Advaitic jnana with Vaishnava prema, asserting that darshan at Guruvayur grants what shastras struggle to describe.',
    tags: ['narayaniyam', 'guruvayur', 'krishna', 'bhattathiri', 'brahman'],
  },
  {
    slug: 'bhagavad-gita-9-26',
    source: 'Bhagavad Gita — Chapter 9, Verse 26',
    text: 'पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति।\nतदहं भक्त्युपहृतमश्नामि प्रयतात्मनः॥',
    translit: 'patram puspam phalam toyam yo me bhaktya prayacchati\ntad aham bhakty-upahrtam asnami prayatatmanah',
    meaning: 'In this beloved verse Krishna assures Arjuna that the path of devotion is open to every soul regardless of birth, wealth, learning, or capacity for elaborate ritual. He declares that whoever offers him a leaf, a flower, a fruit, or even a little water with sincere love, that offering, presented by a pure-hearted devotee, he accepts and indeed enjoys. The verse dismantles the assumption that god requires lavish sacrifice or costly ornament; what truly reaches the divine is the bhava, the loving disposition behind the gesture. Three Sanskrit words carry the weight of the teaching: bhaktya, with devotion, prayatatmanah, by one whose inner being is purified, and asnami, I eat or partake, suggesting an intimate personal acceptance rather than impersonal grace. Commentators across traditions celebrate this verse as the charter of bhakti yoga. Ramanuja reads it as proof that the lord makes himself accessible to the lowliest, while Madhusudana Sarasvati emphasizes that the smallest token offered with love outweighs mountains of ritual gold offered without it. The verse is recited daily before meals in countless homes as the bhojana mantra, transforming each act of eating into an offering and a remembrance.',
    tags: ['bhakti', 'devotion', 'simplicity', 'offering', 'krishna', 'bhojana-mantra', 'gita'],
  },
  {
    slug: 'bhagavad-gita-11-32',
    source: 'Bhagavad Gita — Chapter 11, Verse 32',
    text: 'कालोऽस्मि लोकक्षयकृत्प्रवृद्धो लोकान्समाहर्तुमिह प्रवृत्तः।\nऋतेऽपि त्वां न भविष्यन्ति सर्वे येऽवस्थिताः प्रत्यनीकेषु योधाः॥',
    translit: 'kalo asmi loka-ksaya-krt pravrddho lokan samahartum iha pravrttah\nrte api tvam na bhavisyanti sarve ye avasthitah pratyanikesu yodhah',
    meaning: 'Spoken in the cosmic eleventh chapter during the vision of the universal form, this verse contains Krishna self-revelation as Time itself, mighty and unstoppable, engaged in the dissolution of worlds. The image is at once terrifying and liberating. To Arjuna trembling on the chariot, Krishna declares that the warriors arrayed for battle have in truth already been struck down by time; Arjuna is merely the instrument through which an inevitability will manifest. The Sanskrit phrase kalo asmi, I am time, became one of the most quoted lines of the entire Mahabharata, summarizing the Hindu intuition that creation, sustenance, and dissolution are not three accidents but three faces of one supreme reality. The verse does not advocate violence; it dissolves the warrior delusion of personal agency. By recognizing that all action unfolds within a vaster pattern, Arjuna is freed from both pride in victory and guilt in destruction. Commentators caution that the teaching is meant for one already established in dharma, not as a license for indifference, but as the inner clarity that allows the dharmic actor to perform his duty without anxiety over results.',
    tags: ['time', 'cosmic-form', 'kala', 'dharma', 'detachment', 'arjuna', 'vishvarupa'],
  },
  {
    slug: 'bhagavad-gita-2-22',
    source: 'Bhagavad Gita — Chapter 2, Verse 22',
    text: 'वासांसि जीर्णानि यथा विहाय नवानि गृह्णाति नरोऽपराणि।\nतथा शरीराणि विहाय जीर्णान्यन्यानि संयाति नवानि देही॥',
    translit: 'vasamsi jirnani yatha vihaya navani grhnati naro aparani\ntatha sarirani vihaya jirnany anyani samyati navani dehi',
    meaning: 'Krishna offers Arjuna one of the most evocative images of the Gita to convey the indestructibility of the atman. Just as a person discards worn-out garments and accepts new ones in their place, so the embodied self lays aside aged or broken bodies and enters fresh ones. The simile makes a metaphysical doctrine intimate; clothing is something we change daily without grief, and the verse invites us to look upon birth and death with the same equanimity. The choice of the word dehi, the one who possesses a body, is deliberate: it distinguishes the wearer from the worn, the conscious witness from the temporary form. By relocating identity from the body to the deathless self, the verse undercuts the principal source of fear that paralyzes Arjuna and that grips ordinary human life. Sankara emphasizes that the analogy holds only at the level of the embodied jiva caught in samsara; the underlying Brahman neither comes nor goes. Ramanuja stresses that the journey from body to body proceeds under the guidance of the lord and according to karma, which is why right action and devotion remain urgent.',
    tags: ['atman', 'rebirth', 'death', 'detachment', 'consolation', 'samsara', 'gita'],
  },
  {
    slug: 'aditya-hridayam-opening',
    source: 'Aditya Hridayam — Valmiki Ramayana, Yuddha Kanda 105, Opening',
    text: 'ततो युद्धपरिश्रान्तं समरे चिन्तया स्थितम्।\nरावणं चाग्रतो दृष्ट्वा युद्धाय समुपस्थितम्॥\nदैवतैश्च समागम्य द्रष्टुमभ्यागतो रणम्।\nउपागम्याब्रवीद्राममगस्त्यो भगवांस्तदा॥',
    translit: 'tato yuddha-parisrantam samare cintaya sthitam\nravanam cagrato drstva yuddhaya samupasthitam\ndaivatais ca samagamya drastum abhyagato ranam\nupagamya abravid ramam agastyo bhagavams tada',
    meaning: 'The Aditya Hridayam begins on the battlefield of Lanka, where Rama stands exhausted after relentless combat, contemplating the fearsome Ravana arrayed once more before him. At this critical moment, the sage Agastya, who had come with the gods to witness the war, approaches Rama and prepares to bestow upon him the secret hymn of the Sun. The opening verses establish a powerful narrative frame: even the avatar incarnate, in the depths of human fatigue, is granted divine instruction by a sage rather than acting from unsupported strength. The teaching that follows in the full hymn praises Surya as the dispeller of all enemies, the source of victory, the destroyer of darkness within and without, and the indwelling soul of every creature. By beginning with this scene, the text underscores a profound spiritual principle: when worldly effort reaches its limit, surrender to the light of the supreme yields strength beyond ordinary capacity. The Aditya Hridayam is recited at dawn for clarity, health, and courage; warriors, students, and seekers across India have turned to it for over two millennia.',
    tags: ['surya', 'aditya', 'ramayana', 'agastya', 'victory', 'morning-prayer', 'stotra'],
  },
  {
    slug: 'bilvashtakam-1',
    source: 'Bilvashtakam — Verse 1',
    text: 'त्रिदलं त्रिगुणाकारं त्रिनेत्रं च त्रियायुधम्।\nत्रिजन्मपापसंहारमेकबिल्वं शिवार्पणम्॥',
    translit: 'tri-dalam tri-gunakaram tri-netram ca tri-yayudham\ntri-janma-papa-samharam eka-bilvam sivarpanam',
    meaning: 'The Bilvashtakam, composed in praise of the bilva or wood-apple leaf that is the favorite offering of Lord Shiva, opens with a verse that uncovers layer upon layer of symbolism in the three-pointed leaf. The leaf has three lobes, mirrors the three gunas of sattva, rajas, and tamas, recalls the three eyes of Shiva, and recalls his three weapons, the trident, the bow, and the goad. Most importantly the verse declares that a single bilva leaf, offered with devotion, destroys the accumulated sins of three lifetimes. The repetition of the syllable tri builds a rhythmic intensity that mirrors the ringing of the bell during Shiva worship, and the closing words eka bilvam sivarpanam, one bilva leaf is offered to Shiva, become the refrain of the entire ashtakam. The teaching is twofold. First, every natural object can be read as a scripture; the same leaf the gardener tramples becomes, in the eye of the devotee, a complete cosmology. Second, the spiritual power of an offering lies not in its quantity but in the consciousness behind it. A single leaf, placed at the feet of Shiva with concentrated love, accomplishes what mountains of unmindful ritual cannot.',
    tags: ['shiva', 'bilva', 'stotra', 'three-gunas', 'pradosha', 'shivaratri', 'shaiva'],
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
