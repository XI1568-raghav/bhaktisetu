// ─── Scripture Corpus for RAG-based "Ask a Pandit" Chat ───────────────────────

export interface ScriptureVerse {
  source: 'gita' | 'upanishad' | 'mantra';
  chapter?: number;
  verse?: number;
  name?: string;
  sanskrit: string;
  transliteration: string;
  english: string;
  hindi: string;
  keywords: string[];
}

// ─── Bhagavad Gita Key Verses (50) ────────────────────────────────────────────

const GITA_VERSES: ScriptureVerse[] = [
  // Chapter 2 — Sankhya Yoga
  {
    source: 'gita', chapter: 2, verse: 7,
    sanskrit: 'कार्पण्यदोषोपहतस्वभावः पृच्छामि त्वां धर्मसम्मूढचेताः',
    transliteration: 'kārpaṇya-doṣopahata-svabhāvaḥ pṛcchāmi tvāṁ dharma-sammūḍha-cetāḥ',
    english: 'My nature is weighed down with weakness and confusion. I ask You: tell me what is best for me. I am Your disciple. Instruct me, who has taken refuge in You.',
    hindi: 'कायरता के दोष से मेरा स्वभाव दूषित हो गया है और मैं धर्म के विषय में मोहित हूँ। आपसे पूछता हूँ, मुझे बताइए कि मेरे लिए क्या श्रेयस्कर है।',
    keywords: ['confusion', 'guidance', 'surrender', 'disciple', 'guru', 'teacher', 'help', 'lost'],
  },
  {
    source: 'gita', chapter: 2, verse: 11,
    sanskrit: 'अशोच्यानन्वशोचस्त्वं प्रज्ञावादांश्च भाषसे',
    transliteration: 'aśocyān anvaśocas tvaṁ prajñā-vādāṁś ca bhāṣase',
    english: 'You grieve for those who should not be grieved for, yet speak words of wisdom. The wise grieve neither for the living nor for the dead.',
    hindi: 'तुम उनके लिए शोक करते हो जो शोक के योग्य नहीं हैं, और ज्ञानियों जैसी बातें करते हो। ज्ञानी न जीवितों के लिए और न मृतों के लिए शोक करते हैं।',
    keywords: ['grief', 'death', 'wisdom', 'sorrow', 'loss', 'mourning', 'sad', 'departed'],
  },
  {
    source: 'gita', chapter: 2, verse: 13,
    sanskrit: 'देहिनोऽस्मिन्यथा देहे कौमारं यौवनं जरा। तथा देहान्तरप्राप्तिर्धीरस्तत्र न मुह्यति॥',
    transliteration: 'dehino \'smin yathā dehe kaumāraṁ yauvanaṁ jarā tathā dehāntara-prāptir dhīras tatra na muhyati',
    english: 'Just as the embodied soul continuously passes from childhood to youth to old age, similarly, at the time of death, the soul passes into another body. The wise are not deluded by this.',
    hindi: 'जैसे इस देह में देही जीवात्मा की बालकपन, जवानी और वृद्धावस्था होती है, वैसे ही देहान्तर की प्राप्ति होती है। धीर पुरुष इसमें मोहित नहीं होता।',
    keywords: ['soul', 'death', 'rebirth', 'reincarnation', 'atman', 'body', 'age', 'afterlife'],
  },
  {
    source: 'gita', chapter: 2, verse: 14,
    sanskrit: 'मात्रास्पर्शास्तु कौन्तेय शीतोष्णसुखदुःखदाः। आगमापायिनोऽनित्यास्तांस्तितिक्षस्व भारत॥',
    transliteration: 'mātrā-sparśās tu kaunteya śītoṣṇa-sukha-duḥkha-dāḥ āgamāpāyino \'nityās tāṁs titikṣasva bhārata',
    english: 'The contact of the senses with their objects, O Arjuna, gives rise to cold and heat, pleasure and pain. They are transient, arising and disappearing. Bear them patiently.',
    hindi: 'हे कुन्तीपुत्र! सर्दी-गर्मी और सुख-दुःख देने वाले इन्द्रिय और विषयों के संयोग तो उत्पन्न होने और नष्ट होने वाले और अनित्य हैं। उनको सहन करो।',
    keywords: ['patience', 'suffering', 'pleasure', 'pain', 'tolerance', 'endurance', 'hardship', 'difficulty'],
  },
  {
    source: 'gita', chapter: 2, verse: 20,
    sanskrit: 'न जायते म्रियते वा कदाचिन् नायं भूत्वा भविता वा न भूयः',
    transliteration: 'na jāyate mriyate vā kadācin nāyaṁ bhūtvā bhavitā vā na bhūyaḥ',
    english: 'The soul is never born, nor does it ever die. It has no origin and is eternal. It is unborn, ever-existing, undying, and primeval.',
    hindi: 'आत्मा न कभी जन्म लेती है और न मरती है। यह एक बार होकर फिर नहीं होने वाली नहीं है। यह अजन्मा, नित्य, शाश्वत और पुरातन है।',
    keywords: ['soul', 'atman', 'immortal', 'eternal', 'death', 'birth', 'spirit', 'consciousness'],
  },
  {
    source: 'gita', chapter: 2, verse: 22,
    sanskrit: 'वासांसि जीर्णानि यथा विहाय नवानि गृह्णाति नरोऽपराणि। तथा शरीराणि विहाय जीर्णानि अन्यानि संयाति नवानि देही॥',
    transliteration: 'vāsāṁsi jīrṇāni yathā vihāya navāni gṛhṇāti naro \'parāṇi tathā śarīrāṇi vihāya jīrṇāny anyāni saṁyāti navāni dehī',
    english: 'As a person puts on new garments, giving up old ones, the soul similarly accepts new material bodies, giving up the old and useless ones.',
    hindi: 'जैसे मनुष्य पुराने वस्त्रों को त्यागकर नए वस्त्र धारण करता है, वैसे ही आत्मा पुराने शरीरों को छोड़कर नए शरीरों में जाती है।',
    keywords: ['soul', 'death', 'rebirth', 'reincarnation', 'body', 'change', 'transition', 'afterlife'],
  },
  {
    source: 'gita', chapter: 2, verse: 27,
    sanskrit: 'जातस्य हि ध्रुवो मृत्युर्ध्रुवं जन्म मृतस्य च',
    transliteration: 'jātasya hi dhruvo mṛtyur dhruvaṁ janma mṛtasya ca',
    english: 'For one who has taken birth, death is certain; and for one who has died, birth is certain.',
    hindi: 'जन्म लेने वाले की मृत्यु निश्चित है और मरने वाले का जन्म निश्चित है।',
    keywords: ['death', 'birth', 'cycle', 'inevitable', 'life', 'mortality', 'acceptance'],
  },
  {
    source: 'gita', chapter: 2, verse: 31,
    sanskrit: 'स्वधर्ममपि चावेक्ष्य न विकम्पितुमर्हसि',
    transliteration: 'sva-dharmam api cāvekṣya na vikampitum arhasi',
    english: 'Considering your specific duty as a warrior, you should know that there is no better engagement for you than fighting on religious principles.',
    hindi: 'अपने स्वधर्म को देखकर भी तुम्हें विचलित नहीं होना चाहिए, क्योंकि क्षत्रिय के लिए धर्मयुक्त युद्ध से बढ़कर और कोई कर्तव्य नहीं है।',
    keywords: ['duty', 'dharma', 'svadharma', 'responsibility', 'courage', 'warrior', 'fight'],
  },
  {
    source: 'gita', chapter: 2, verse: 47,
    sanskrit: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। मा कर्मफलहेतुर्भूर्मा ते सङ्गोऽस्त्वकर्मणि॥',
    transliteration: 'karmaṇy evādhikāras te mā phaleṣu kadācana mā karma-phala-hetur bhūr mā te saṅgo \'stv akarmaṇi',
    english: 'You have the right to perform your prescribed duties, but you are not entitled to the fruits of your actions. Never consider yourself the cause of the results, and never be attached to inaction.',
    hindi: 'कर्म करने में ही तुम्हारा अधिकार है, फलों में कभी नहीं। कर्मफल का हेतु मत बनो, और अकर्म में भी तुम्हारी आसक्ति न हो।',
    keywords: ['karma', 'action', 'duty', 'detachment', 'work', 'result', 'fruit', 'effort', 'nishkama'],
  },
  {
    source: 'gita', chapter: 2, verse: 48,
    sanskrit: 'योगस्थः कुरु कर्माणि सङ्गं त्यक्त्वा धनञ्जय। सिद्ध्यसिद्ध्योः समो भूत्वा समत्वं योग उच्यते॥',
    transliteration: 'yoga-sthaḥ kuru karmāṇi saṅgaṁ tyaktvā dhanañjaya siddhyasiddhyoḥ samo bhūtvā samatvaṁ yoga ucyate',
    english: 'Perform your duty established in yoga, O Arjuna, abandoning attachment, being indifferent to success and failure. Such equanimity is called yoga.',
    hindi: 'हे धनंजय! योग में स्थित होकर कर्म करो, आसक्ति को त्यागकर, सिद्धि और असिद्धि में समभाव रखो। समत्व ही योग कहलाता है।',
    keywords: ['yoga', 'equanimity', 'balance', 'detachment', 'action', 'success', 'failure', 'calm'],
  },
  {
    source: 'gita', chapter: 2, verse: 50,
    sanskrit: 'बुद्धियुक्तो जहातीह उभे सुकृतदुष्कृते। तस्माद्योगाय युज्यस्व योगः कर्मसु कौशलम्॥',
    transliteration: 'buddhi-yukto jahātīha ubhe sukṛta-duṣkṛte tasmād yogāya yujyasva yogaḥ karmasu kauśalam',
    english: 'A person united with the Divine Intelligence casts off both good and evil deeds. Therefore, strive for yoga. Yoga is skill in action.',
    hindi: 'बुद्धियुक्त मनुष्य इस लोक में पुण्य और पाप दोनों को त्याग देता है। इसलिए योग में लग जाओ। योग कर्मों में कुशलता है।',
    keywords: ['yoga', 'skill', 'action', 'intelligence', 'wisdom', 'karma', 'excellence'],
  },
  {
    source: 'gita', chapter: 2, verse: 55,
    sanskrit: 'प्रजहाति यदा कामान् सर्वान् पार्थ मनोगतान्। आत्मन्येवात्मना तुष्टः स्थितप्रज्ञस्तदोच्यते॥',
    transliteration: 'prajahāti yadā kāmān sarvān pārtha mano-gatān ātmany evātmanā tuṣṭaḥ sthita-prajñas tadocyate',
    english: 'When a person gives up all desires of the mind and is satisfied in the Self by the Self, then that person is said to be of steady wisdom.',
    hindi: 'जब मनुष्य मन की सभी कामनाओं को त्याग देता है और आत्मा में ही आत्मा से संतुष्ट रहता है, तब उसे स्थितप्रज्ञ कहते हैं।',
    keywords: ['desire', 'wisdom', 'self', 'contentment', 'sthitaprajna', 'satisfaction', 'mind', 'peace'],
  },
  {
    source: 'gita', chapter: 2, verse: 62,
    sanskrit: 'ध्यायतो विषयान्पुंसः सङ्गस्तेषूपजायते। सङ्गात् सञ्जायते कामः कामात्क्रोधोऽभिजायते॥',
    transliteration: 'dhyāyato viṣayān puṁsaḥ saṅgas teṣūpajāyate saṅgāt sañjāyate kāmaḥ kāmāt krodho \'bhijāyate',
    english: 'While contemplating sense objects, attachment develops. From attachment, desire is born. From desire, anger arises.',
    hindi: 'विषयों का चिंतन करने वाले पुरुष की उनमें आसक्ति हो जाती है। आसक्ति से काम उत्पन्न होता है। काम से क्रोध उत्पन्न होता है।',
    keywords: ['desire', 'anger', 'attachment', 'mind', 'senses', 'temptation', 'lust', 'control'],
  },
  {
    source: 'gita', chapter: 2, verse: 63,
    sanskrit: 'क्रोधाद्भवति सम्मोहः सम्मोहात्स्मृतिविभ्रमः। स्मृतिभ्रंशाद्बुद्धिनाशो बुद्धिनाशात्प्रणश्यति॥',
    transliteration: 'krodhād bhavati sammohaḥ sammohāt smṛti-vibhramaḥ smṛti-bhraṁśād buddhi-nāśo buddhi-nāśāt praṇaśyati',
    english: 'From anger comes delusion; from delusion, loss of memory; from loss of memory, the destruction of intelligence; and from destruction of intelligence, one perishes.',
    hindi: 'क्रोध से मोह होता है, मोह से स्मृति भ्रष्ट होती है, स्मृति भ्रष्ट होने से बुद्धि नष्ट होती है, और बुद्धि नष्ट होने से मनुष्य नष्ट हो जाता है।',
    keywords: ['anger', 'delusion', 'memory', 'intelligence', 'destruction', 'control', 'emotion'],
  },
  // Chapter 3 — Karma Yoga
  {
    source: 'gita', chapter: 3, verse: 5,
    sanskrit: 'न हि कश्चित्क्षणमपि जातु तिष्ठत्यकर्मकृत्',
    transliteration: 'na hi kaścit kṣaṇam api jātu tiṣṭhaty akarma-kṛt',
    english: 'No one can remain without action even for a moment. Everyone is driven to action helplessly by the qualities born of material nature.',
    hindi: 'कोई भी मनुष्य एक क्षण भी बिना कर्म किये नहीं रह सकता। सभी प्रकृति के गुणों द्वारा कर्म करने को विवश हैं।',
    keywords: ['action', 'karma', 'nature', 'prakriti', 'work', 'inaction', 'activity'],
  },
  {
    source: 'gita', chapter: 3, verse: 8,
    sanskrit: 'नियतं कुरु कर्म त्वं कर्म ज्यायो ह्यकर्मणः',
    transliteration: 'niyataṁ kuru karma tvaṁ karma jyāyo hy akarmaṇaḥ',
    english: 'Perform your prescribed duty, for action is better than inaction. A person cannot even maintain their body without work.',
    hindi: 'तुम नियत कर्म करो, क्योंकि कर्म न करने से कर्म करना श्रेष्ठ है। कर्म न करने से शरीर-यात्रा भी नहीं सिद्ध होगी।',
    keywords: ['duty', 'action', 'work', 'karma', 'laziness', 'inaction', 'prescribed', 'motivation'],
  },
  {
    source: 'gita', chapter: 3, verse: 19,
    sanskrit: 'तस्मादसक्तः सततं कार्यं कर्म समाचर',
    transliteration: 'tasmād asaktaḥ satataṁ kāryaṁ karma samācara',
    english: 'Therefore, without being attached to the fruits of activities, one should act as a matter of duty. By working without attachment, one attains the Supreme.',
    hindi: 'इसलिए आसक्ति रहित होकर सदा कर्तव्य-कर्म करो। बिना आसक्ति के कर्म करने से मनुष्य परमात्मा को प्राप्त होता है।',
    keywords: ['detachment', 'duty', 'selfless', 'karma', 'action', 'service', 'seva'],
  },
  {
    source: 'gita', chapter: 3, verse: 21,
    sanskrit: 'यद्यदाचरति श्रेष्ठस्तत्तदेवेतरो जनः। स यत्प्रमाणं कुरुते लोकस्तदनुवर्तते॥',
    transliteration: 'yad yad ācarati śreṣṭhas tat tad evetaro janaḥ sa yat pramāṇaṁ kurute lokas tad anuvartate',
    english: 'Whatever action a great person performs, common people follow. Whatever standards they set, all the world pursues.',
    hindi: 'श्रेष्ठ पुरुष जो-जो आचरण करता है, अन्य लोग भी वैसा ही करते हैं। वह जो प्रमाण स्थापित करता है, सारा संसार उसका अनुसरण करता है।',
    keywords: ['leadership', 'example', 'role model', 'influence', 'society', 'standard', 'responsibility'],
  },
  {
    source: 'gita', chapter: 3, verse: 27,
    sanskrit: 'प्रकृतेः क्रियमाणानि गुणैः कर्माणि सर्वशः। अहंकारविमूढात्मा कर्ताहमिति मन्यते॥',
    transliteration: 'prakṛteḥ kriyamāṇāni guṇaiḥ karmāṇi sarvaśaḥ ahaṅkāra-vimūḍhātmā kartāham iti manyate',
    english: 'All actions are performed by the gunas (qualities) of nature. But one deluded by ego thinks "I am the doer."',
    hindi: 'प्रकृति के गुणों द्वारा सभी कर्म किये जाते हैं। अहंकार से मोहित मनुष्य सोचता है "मैं कर्ता हूँ।"',
    keywords: ['ego', 'pride', 'nature', 'gunas', 'doer', 'humility', 'ahankar', 'delusion'],
  },
  // Chapter 4 — Jnana Yoga
  {
    source: 'gita', chapter: 4, verse: 7,
    sanskrit: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत। अभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥',
    transliteration: 'yadā yadā hi dharmasya glānir bhavati bhārata abhyutthānam adharmasya tadātmānaṁ sṛjāmy aham',
    english: 'Whenever there is a decline of dharma and rise of adharma, O Arjuna, then I manifest Myself.',
    hindi: 'हे भारत! जब-जब धर्म की हानि और अधर्म की वृद्धि होती है, तब-तब मैं स्वयं की रचना करता हूँ (अवतार लेता हूँ)।',
    keywords: ['avatar', 'incarnation', 'dharma', 'adharma', 'god', 'divine', 'protection', 'krishna'],
  },
  {
    source: 'gita', chapter: 4, verse: 8,
    sanskrit: 'परित्राणाय साधूनां विनाशाय च दुष्कृताम्। धर्मसंस्थापनार्थाय सम्भवामि युगे युगे॥',
    transliteration: 'paritrāṇāya sādhūnāṁ vināśāya ca duṣkṛtām dharma-saṁsthāpanārthāya sambhavāmi yuge yuge',
    english: 'To protect the righteous, to annihilate the wicked, and to reestablish dharma, I appear millennium after millennium.',
    hindi: 'साधुओं की रक्षा, दुष्टों के विनाश और धर्म की स्थापना के लिए मैं युग-युग में प्रकट होता हूँ।',
    keywords: ['avatar', 'protection', 'dharma', 'righteousness', 'evil', 'god', 'krishna', 'incarnation'],
  },
  {
    source: 'gita', chapter: 4, verse: 34,
    sanskrit: 'तद्विद्धि प्रणिपातेन परिप्रश्नेन सेवया। उपदेक्ष्यन्ति ते ज्ञानं ज्ञानिनस्तत्त्वदर्शिनः॥',
    transliteration: 'tad viddhi praṇipātena paripraśnena sevayā upadekṣyanti te jñānaṁ jñāninas tattva-darśinaḥ',
    english: 'Learn the truth by approaching a spiritual master. Inquire from them submissively and render service. The self-realized souls can impart knowledge unto you because they have seen the truth.',
    hindi: 'उस ज्ञान को तुम गुरु के पास जाकर, प्रणिपात (विनम्रता), प्रश्न और सेवा से समझो। तत्त्वदर्शी ज्ञानी तुम्हें ज्ञान का उपदेश देंगे।',
    keywords: ['guru', 'teacher', 'knowledge', 'learning', 'humility', 'service', 'wisdom', 'truth'],
  },
  {
    source: 'gita', chapter: 4, verse: 38,
    sanskrit: 'न हि ज्ञानेन सदृशं पवित्रमिह विद्यते',
    transliteration: 'na hi jñānena sadṛśaṁ pavitram iha vidyate',
    english: 'In this world, there is nothing as purifying as transcendental knowledge.',
    hindi: 'इस संसार में ज्ञान के समान पवित्र करने वाला कुछ भी नहीं है।',
    keywords: ['knowledge', 'purity', 'wisdom', 'learning', 'education', 'spiritual', 'jnana'],
  },
  {
    source: 'gita', chapter: 4, verse: 39,
    sanskrit: 'श्रद्धावाँल्लभते ज्ञानं तत्परः संयतेन्द्रियः',
    transliteration: 'śraddhāvāl labhate jñānaṁ tat-paraḥ saṁyatendriyaḥ',
    english: 'One who has faith, is devoted, and has control over the senses, attains transcendental knowledge. Having achieved this, one quickly attains supreme peace.',
    hindi: 'श्रद्धावान, तत्पर और जितेन्द्रिय मनुष्य ज्ञान प्राप्त करता है। ज्ञान प्राप्त करके वह शीघ्र ही परम शान्ति को प्राप्त होता है।',
    keywords: ['faith', 'knowledge', 'devotion', 'shraddha', 'senses', 'peace', 'control'],
  },
  // Chapter 6 — Dhyana Yoga
  {
    source: 'gita', chapter: 6, verse: 5,
    sanskrit: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत्। आत्मैव ह्यात्मनो बन्धुरात्मैव रिपुरात्मनः॥',
    transliteration: 'uddhared ātmanātmānaṁ nātmānam avasādayet ātmaiva hy ātmano bandhur ātmaiva ripur ātmanaḥ',
    english: 'One must elevate oneself by one\'s own mind, not degrade oneself. The mind is the friend of the conditioned soul, and its enemy as well.',
    hindi: 'अपने आप को उद्धार करो, अपने आप को गिराओ मत। मन ही अपना बंधु है और मन ही अपना शत्रु है।',
    keywords: ['self', 'mind', 'uplift', 'friend', 'enemy', 'self-improvement', 'discipline', 'motivation'],
  },
  {
    source: 'gita', chapter: 6, verse: 6,
    sanskrit: 'बन्धुरात्मात्मनस्तस्य येनात्मैवात्मना जितः। अनात्मनस्तु शत्रुत्वे वर्तेतात्मैव शत्रुवत्॥',
    transliteration: 'bandhur ātmātmanas tasya yenātmaivātmanā jitaḥ anātmanas tu śatrutve vartetātmaiva śatru-vat',
    english: 'For one who has conquered the mind, the mind is the best of friends; but for one who has failed to do so, the mind remains the greatest enemy.',
    hindi: 'जिसने अपने मन को जीत लिया, उसके लिए मन सबसे अच्छा मित्र है। लेकिन जो ऐसा नहीं कर पाया, उसके लिए मन शत्रु के समान है।',
    keywords: ['mind', 'control', 'friend', 'enemy', 'discipline', 'self-mastery', 'meditation'],
  },
  {
    source: 'gita', chapter: 6, verse: 17,
    sanskrit: 'युक्ताहारविहारस्य युक्तचेष्टस्य कर्मसु। युक्तस्वप्नावबोधस्य योगो भवति दुःखहा॥',
    transliteration: 'yuktāhāra-vihārasya yukta-ceṣṭasya karmasu yukta-svapnāvabodhasya yogo bhavati duḥkha-hā',
    english: 'One who is moderate in eating and recreation, moderate in work, and moderate in sleep and wakefulness — for them, yoga becomes the destroyer of sorrow.',
    hindi: 'जो आहार-विहार में, कर्मों में चेष्टा में, और सोने-जागने में नियमित है, उसके लिए योग दुःखों का नाश करने वाला होता है।',
    keywords: ['moderation', 'balance', 'yoga', 'health', 'diet', 'sleep', 'lifestyle', 'wellbeing'],
  },
  {
    source: 'gita', chapter: 6, verse: 34,
    sanskrit: 'चञ्चलं हि मनः कृष्ण प्रमाथि बलवद्दृढम्',
    transliteration: 'cañcalaṁ hi manaḥ kṛṣṇa pramāthi balavad dṛḍham',
    english: 'The mind is restless, turbulent, obstinate, and very strong, O Krishna. It is more difficult to control than the wind.',
    hindi: 'हे कृष्ण! यह मन बड़ा चंचल, प्रमथन करने वाला, बलवान और दृढ़ है। इसको वश में करना वायु को वश में करने के समान कठिन है।',
    keywords: ['mind', 'restless', 'control', 'meditation', 'concentration', 'focus', 'discipline'],
  },
  {
    source: 'gita', chapter: 6, verse: 35,
    sanskrit: 'असंशयं महाबाहो मनो दुर्निग्रहं चलम्। अभ्यासेन तु कौन्तेय वैराग्येण च गृह्यते॥',
    transliteration: 'asaṁśayaṁ mahā-bāho mano durnigrahaṁ calam abhyāsena tu kaunteya vairāgyeṇa ca gṛhyate',
    english: 'Undoubtedly, O mighty-armed Arjuna, the mind is restless and difficult to curb. But it can be controlled by practice and detachment.',
    hindi: 'निःसंदेह, हे महाबाहो! मन चंचल और कठिन है। परन्तु हे कुन्तीपुत्र! अभ्यास और वैराग्य से यह वश में किया जा सकता है।',
    keywords: ['mind', 'practice', 'detachment', 'vairagya', 'abhyasa', 'meditation', 'control', 'discipline'],
  },
  // Chapter 9 — Raja Vidya Yoga
  {
    source: 'gita', chapter: 9, verse: 22,
    sanskrit: 'अनन्याश्चिन्तयन्तो मां ये जनाः पर्युपासते। तेषां नित्याभियुक्तानां योगक्षेमं वहाम्यहम्॥',
    transliteration: 'ananyāś cintayanto māṁ ye janāḥ paryupāsate teṣāṁ nityābhiyuktānāṁ yoga-kṣemaṁ vahāmy aham',
    english: 'To those who always worship Me with exclusive devotion, meditating on My transcendental form, I carry what they lack and preserve what they have.',
    hindi: 'जो लोग अनन्य भाव से मेरा चिन्तन करते हुए मेरी उपासना करते हैं, उन नित्य-युक्त भक्तों का योगक्षेम मैं स्वयं वहन करता हूँ।',
    keywords: ['devotion', 'bhakti', 'worship', 'protection', 'god', 'krishna', 'surrender', 'faith', 'prayer'],
  },
  {
    source: 'gita', chapter: 9, verse: 26,
    sanskrit: 'पत्रं पुष्पं फलं तोयं यो मे भक्त्या प्रयच्छति। तदहं भक्त्युपहृतमश्नामि प्रयतात्मनः॥',
    transliteration: 'patraṁ puṣpaṁ phalaṁ toyaṁ yo me bhaktyā prayacchati tad ahaṁ bhakty-upahṛtam aśnāmi prayatātmanaḥ',
    english: 'If one offers Me with love and devotion a leaf, a flower, a fruit, or water, I will accept it from that pure-hearted person.',
    hindi: 'जो मुझे भक्ति से पत्ता, फूल, फल या जल अर्पित करता है, मैं उस शुद्ध हृदय वाले की भक्तिपूर्वक अर्पित वस्तु को ग्रहण करता हूँ।',
    keywords: ['devotion', 'offering', 'bhakti', 'puja', 'prayer', 'love', 'god', 'worship', 'simple', 'prasad'],
  },
  {
    source: 'gita', chapter: 9, verse: 27,
    sanskrit: 'यत्करोषि यदश्नासि यज्जुहोषि ददासि यत्। यत्तपस्यसि कौन्तेय तत्कुरुष्व मदर्पणम्॥',
    transliteration: 'yat karoṣi yad aśnāsi yaj juhoṣi dadāsi yat yat tapasyasi kaunteya tat kuruṣva mad-arpaṇam',
    english: 'Whatever you do, whatever you eat, whatever you offer, whatever you give, whatever austerities you perform — do that as an offering to Me.',
    hindi: 'तुम जो करते हो, जो खाते हो, जो हवन करते हो, जो दान देते हो, जो तप करते हो — वह सब मुझे अर्पण करो।',
    keywords: ['offering', 'surrender', 'devotion', 'action', 'karma', 'god', 'dedication', 'prayer'],
  },
  {
    source: 'gita', chapter: 9, verse: 29,
    sanskrit: 'समोऽहं सर्वभूतेषु न मे द्वेष्योऽस्ति न प्रियः',
    transliteration: 'samo \'haṁ sarva-bhūteṣu na me dveṣyo \'sti na priyaḥ',
    english: 'I envy no one, nor am I partial to anyone. I am equal to all. But whoever renders service unto Me in devotion is a friend — is in Me, and I am also a friend to them.',
    hindi: 'मैं सभी प्राणियों में समभाव रखता हूँ। न कोई मुझे अप्रिय है, न प्रिय। परन्तु जो भक्ति से मेरी उपासना करते हैं, वे मुझमें हैं और मैं उनमें हूँ।',
    keywords: ['equality', 'god', 'devotion', 'love', 'impartial', 'bhakti', 'universal'],
  },
  // Chapter 11 — Vishvarupa
  {
    source: 'gita', chapter: 11, verse: 32,
    sanskrit: 'कालोऽस्मि लोकक्षयकृत्प्रवृद्धो लोकान्समाहर्तुमिह प्रवृत्तः',
    transliteration: 'kālo \'smi loka-kṣaya-kṛt pravṛddho lokān samāhartum iha pravṛttaḥ',
    english: 'I am Time, the great destroyer of worlds, and I have come here to destroy all people.',
    hindi: 'मैं लोकों का नाश करने वाला बढ़ा हुआ काल (समय) हूँ और यहाँ सब लोकों का संहार करने आया हूँ।',
    keywords: ['time', 'death', 'destruction', 'kaal', 'cosmic', 'power', 'divine', 'vishwaroop'],
  },
  {
    source: 'gita', chapter: 11, verse: 33,
    sanskrit: 'तस्मात्त्वमुत्तिष्ठ यशो लभस्व जित्वा शत्रून् भुङ्क्ष्व राज्यं समृद्धम्',
    transliteration: 'tasmāt tvam uttiṣṭha yaśo labhasva jitvā śatrūn bhuṅkṣva rājyaṁ samṛddham',
    english: 'Therefore, arise and attain glory. Conquer your enemies and enjoy a prosperous kingdom.',
    hindi: 'इसलिए तुम उठो, यश प्राप्त करो, शत्रुओं को जीतकर समृद्ध राज्य भोगो।',
    keywords: ['courage', 'victory', 'glory', 'arise', 'conquer', 'motivation', 'strength'],
  },
  // Chapter 12 — Bhakti Yoga
  {
    source: 'gita', chapter: 12, verse: 8,
    sanskrit: 'मय्येव मन आधत्स्व मयि बुद्धिं निवेशय। निवसिष्यसि मय्येव अत ऊर्ध्वं न संशयः॥',
    transliteration: 'mayy eva mana ādhatsva mayi buddhiṁ niveśaya nivasiṣyasi mayy eva ata ūrdhvaṁ na saṁśayaḥ',
    english: 'Fix your mind on Me, place your intellect in Me. Thus you shall live in Me alone. There is no doubt about this.',
    hindi: 'मुझमें ही मन लगाओ, मुझमें ही बुद्धि स्थापित करो। इसके बाद तुम मुझमें ही निवास करोगे, इसमें कोई संदेह नहीं।',
    keywords: ['devotion', 'mind', 'god', 'faith', 'bhakti', 'focus', 'surrender', 'meditation'],
  },
  {
    source: 'gita', chapter: 12, verse: 13,
    sanskrit: 'अद्वेष्टा सर्वभूतानां मैत्रः करुण एव च। निर्ममो निरहंकारः समदुःखसुखः क्षमी॥',
    transliteration: 'adveṣṭā sarva-bhūtānāṁ maitraḥ karuṇa eva ca nirmamo nirahaṅkāraḥ sama-duḥkha-sukhaḥ kṣamī',
    english: 'One who is not envious but is a kind friend to all, who does not think of themselves as a proprietor, free from ego, equal in happiness and distress, tolerant and forgiving.',
    hindi: 'जो सभी प्राणियों से द्वेष नहीं करता, मित्रतापूर्ण और करुणामय है, ममता और अहंकार से रहित, सुख-दुःख में समान और क्षमाशील है।',
    keywords: ['compassion', 'kindness', 'forgiveness', 'ego', 'humility', 'love', 'friend', 'tolerance'],
  },
  {
    source: 'gita', chapter: 12, verse: 15,
    sanskrit: 'यस्मान्नोद्विजते लोको लोकान्नोद्विजते च यः',
    transliteration: 'yasmān nodvijate loko lokān nodvijate ca yaḥ',
    english: 'One by whom the world is not agitated and who cannot be agitated by the world, who is free from joy, envy, fear, and anxiety — such a person is dear to Me.',
    hindi: 'जिससे कोई उद्विग्न नहीं होता और जो स्वयं किसी से उद्विग्न नहीं होता, जो हर्ष, ईर्ष्या, भय और चिंता से मुक्त है — वह मुझे प्रिय है।',
    keywords: ['peace', 'calm', 'anxiety', 'fear', 'dear', 'devotee', 'equanimity'],
  },
  // Chapter 18 — Moksha Sannyasa Yoga
  {
    source: 'gita', chapter: 18, verse: 20,
    sanskrit: 'सर्वभूतेषु येनैकं भावमव्ययमीक्षते। अविभक्तं विभक्तेषु तज्ज्ञानं विद्धि सात्त्विकम्॥',
    transliteration: 'sarva-bhūteṣu yenaikaṁ bhāvam avyayam īkṣate avibhaktaṁ vibhakteṣu taj jñānaṁ viddhi sāttvikam',
    english: 'That knowledge by which one sees the one undivided, imperishable reality in all beings — know that knowledge to be sattvic (in the mode of goodness).',
    hindi: 'जिस ज्ञान से मनुष्य सभी प्राणियों में एक अविनाशी भाव को, अविभक्त को विभक्त में देखता है — उस ज्ञान को सात्त्विक जानो।',
    keywords: ['knowledge', 'unity', 'oneness', 'sattva', 'wisdom', 'spiritual', 'perception', 'universal'],
  },
  {
    source: 'gita', chapter: 18, verse: 37,
    sanskrit: 'यत्तदग्रे विषमिव परिणामेऽमृतोपमम्। तत्सुखं सात्त्विकं प्रोक्तमात्मबुद्धिप्रसादजम्॥',
    transliteration: 'yat tad agre viṣam iva pariṇāme \'mṛtopamam tat sukhaṁ sāttvikaṁ proktam ātma-buddhi-prasāda-jam',
    english: 'That happiness which is like poison at first but like nectar at the end, born from the clear understanding of the Self — that is declared to be sattvic happiness.',
    hindi: 'जो सुख प्रारम्भ में विष के समान परन्तु परिणाम में अमृत के समान है, आत्म-बुद्धि की प्रसन्नता से उत्पन्न — वह सात्त्विक सुख कहा जाता है।',
    keywords: ['happiness', 'sattva', 'discipline', 'long-term', 'spiritual', 'joy', 'wisdom', 'patience'],
  },
  {
    source: 'gita', chapter: 18, verse: 46,
    sanskrit: 'यतः प्रवृत्तिर्भूतानां येन सर्वमिदं ततम्। स्वकर्मणा तमभ्यर्च्य सिद्धिं विन्दति मानवः॥',
    transliteration: 'yataḥ pravṛttir bhūtānāṁ yena sarvam idaṁ tatam sva-karmaṇā tam abhyarcya siddhiṁ vindati mānavaḥ',
    english: 'By worshipping the Lord — from whom all beings originate and by whom all this is pervaded — through one\'s own duty, a person attains perfection.',
    hindi: 'जिससे सभी प्राणियों की उत्पत्ति होती है और जिससे यह सब व्याप्त है, उसकी अपने कर्म द्वारा पूजा करके मनुष्य सिद्धि प्राप्त करता है।',
    keywords: ['duty', 'worship', 'perfection', 'work', 'god', 'karma', 'svadharma'],
  },
  {
    source: 'gita', chapter: 18, verse: 47,
    sanskrit: 'श्रेयान्स्वधर्मो विगुणः परधर्मात्स्वनुष्ठितात्',
    transliteration: 'śreyān sva-dharmo viguṇaḥ para-dharmāt sv-anuṣṭhitāt',
    english: 'It is better to perform one\'s own dharma imperfectly than to perform another\'s dharma perfectly.',
    hindi: 'अपना धर्म गुणरहित होने पर भी दूसरे के अच्छे धर्म से श्रेष्ठ है।',
    keywords: ['duty', 'dharma', 'svadharma', 'purpose', 'calling', 'authenticity', 'identity'],
  },
  {
    source: 'gita', chapter: 18, verse: 54,
    sanskrit: 'ब्रह्मभूतः प्रसन्नात्मा न शोचति न काङ्क्षति। समः सर्वेषु भूतेषु मद्भक्तिं लभते पराम्॥',
    transliteration: 'brahma-bhūtaḥ prasannātmā na śocati na kāṅkṣati samaḥ sarveṣu bhūteṣu mad-bhaktiṁ labhate parām',
    english: 'One who is thus established in Brahman, with a joyful mind, neither grieves nor desires. Being equal to all beings, such a person attains supreme devotion to Me.',
    hindi: 'ब्रह्मभूत, प्रसन्नचित्त मनुष्य न शोक करता है न कामना। सभी प्राणियों में समभाव रखने वाला मेरी परा भक्ति को प्राप्त होता है।',
    keywords: ['brahman', 'joy', 'devotion', 'equality', 'liberation', 'peace', 'bhakti', 'moksha'],
  },
  {
    source: 'gita', chapter: 18, verse: 61,
    sanskrit: 'ईश्वरः सर्वभूतानां हृद्देशेऽर्जुन तिष्ठति। भ्रामयन्सर्वभूतानि यन्त्रारूढानि मायया॥',
    transliteration: 'īśvaraḥ sarva-bhūtānāṁ hṛd-deśe \'rjuna tiṣṭhati bhrāmayan sarva-bhūtāni yantrārūḍhāni māyayā',
    english: 'The Supreme Lord dwells in the hearts of all beings, O Arjuna, directing the wanderings of all living entities, who are seated as on a machine, by His maya.',
    hindi: 'हे अर्जुन! ईश्वर सभी प्राणियों के हृदय में स्थित है और अपनी माया से सभी प्राणियों को, जो यन्त्र पर आरूढ़ हैं, भ्रमण कराता है।',
    keywords: ['god', 'heart', 'divine', 'maya', 'soul', 'ishwar', 'supreme', 'inner'],
  },
  {
    source: 'gita', chapter: 18, verse: 65,
    sanskrit: 'मन्मना भव मद्भक्तो मद्याजी मां नमस्कुरु। मामेवैष्यसि सत्यं ते प्रतिजाने प्रियोऽसि मे॥',
    transliteration: 'man-manā bhava mad-bhakto mad-yājī māṁ namaskuru mām evaiṣyasi satyaṁ te pratijāne priyo \'si me',
    english: 'Always think of Me, become My devotee, worship Me, and offer your homage unto Me. Thus you will come to Me without fail. I promise you this because you are My very dear friend.',
    hindi: 'मुझमें मन लगाओ, मेरे भक्त बनो, मेरी पूजा करो और मुझे नमस्कार करो। तुम मुझे ही प्राप्त होगे, यह मैं तुमसे सत्य प्रतिज्ञा करता हूँ, क्योंकि तुम मुझे प्रिय हो।',
    keywords: ['devotion', 'worship', 'surrender', 'bhakti', 'love', 'promise', 'god', 'prayer'],
  },
  {
    source: 'gita', chapter: 18, verse: 66,
    sanskrit: 'सर्वधर्मान्परित्यज्य मामेकं शरणं व्रज। अहं त्वां सर्वपापेभ्यो मोक्षयिष्यामि मा शुचः॥',
    transliteration: 'sarva-dharmān parityajya mām ekaṁ śaraṇaṁ vraja ahaṁ tvāṁ sarva-pāpebhyo mokṣayiṣyāmi mā śucaḥ',
    english: 'Abandon all varieties of dharma and just surrender unto Me. I shall deliver you from all sins. Do not fear.',
    hindi: 'सभी धर्मों को त्यागकर केवल मेरी शरण में आओ। मैं तुम्हें सभी पापों से मुक्त कर दूँगा। शोक मत करो।',
    keywords: ['surrender', 'liberation', 'moksha', 'sin', 'forgiveness', 'god', 'salvation', 'fear', 'protection'],
  },
  {
    source: 'gita', chapter: 18, verse: 78,
    sanskrit: 'यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः। तत्र श्रीर्विजयो भूतिर्ध्रुवा नीतिर्मतिर्मम॥',
    transliteration: 'yatra yogeśvaraḥ kṛṣṇo yatra pārtho dhanur-dharaḥ tatra śrīr vijayo bhūtir dhruvā nītir matir mama',
    english: 'Wherever there is Krishna, the Lord of Yoga, and wherever there is Arjuna, the supreme archer, there will certainly be opulence, victory, prosperity, and morality.',
    hindi: 'जहाँ योगेश्वर कृष्ण हैं और जहाँ धनुर्धारी पार्थ हैं, वहाँ श्री, विजय, विभूति और अचल नीति है — यह मेरा मत है।',
    keywords: ['krishna', 'victory', 'prosperity', 'dharma', 'morality', 'success', 'divine', 'auspicious'],
  },
];

// ─── Upanishad Verses (20) ──────────────────────────────────────────────────

const UPANISHAD_VERSES: ScriptureVerse[] = [
  {
    source: 'upanishad', name: 'Isha Upanishad 1',
    sanskrit: 'ईशावास्यमिदं सर्वं यत्किञ्च जगत्यां जगत्। तेन त्यक्तेन भुञ्जीथा मा गृधः कस्यस्विद्धनम्॥',
    transliteration: 'īśāvāsyam idaṁ sarvaṁ yat kiñca jagatyāṁ jagat tena tyaktena bhuñjīthā mā gṛdhaḥ kasya svid dhanam',
    english: 'All this — whatever moves in this moving world — is pervaded by the Lord. Enjoy with renunciation. Do not covet anyone\'s wealth.',
    hindi: 'यह सब कुछ जो इस जगत में है, ईश्वर से व्याप्त है। त्याग भाव से भोग करो। किसी के धन का लोभ मत करो।',
    keywords: ['god', 'detachment', 'renunciation', 'contentment', 'greed', 'wealth', 'isha', 'universal'],
  },
  {
    source: 'upanishad', name: 'Kena Upanishad 1.1',
    sanskrit: 'केनेषितं पतति प्रेषितं मनः',
    transliteration: 'keneṣitaṁ patati preṣitaṁ manaḥ',
    english: 'By whom directed does the mind go towards its objects? By whom commanded does the first breath move?',
    hindi: 'किसकी प्रेरणा से मन अपने विषयों की ओर जाता है? किसकी आज्ञा से प्रथम प्राण चलता है?',
    keywords: ['mind', 'consciousness', 'god', 'inquiry', 'philosophy', 'brahman', 'question'],
  },
  {
    source: 'upanishad', name: 'Katha Upanishad 1.2.23',
    sanskrit: 'नायमात्मा प्रवचनेन लभ्यो न मेधया न बहुना श्रुतेन। यमेवैष वृणुते तेन लभ्यस्तस्यैष आत्मा विवृणुते तनूं स्वाम्॥',
    transliteration: 'nāyam ātmā pravacanena labhyo na medhayā na bahunā śrutena yam evaiṣa vṛṇute tena labhyas tasyaiṣa ātmā vivṛṇute tanūṁ svām',
    english: 'The Self cannot be attained by instruction, nor by intellect, nor by much learning. It is attained only by the one whom the Self chooses. To such a one, the Self reveals its own form.',
    hindi: 'यह आत्मा प्रवचन से, बुद्धि से या बहुत सुनने से प्राप्त नहीं होती। जिसे यह स्वयं चुनती है, उसे ही प्राप्त होती है। उसके लिए यह आत्मा अपना रूप प्रकट करती है।',
    keywords: ['atman', 'self', 'realization', 'grace', 'chosen', 'knowledge', 'revelation', 'spiritual'],
  },
  {
    source: 'upanishad', name: 'Katha Upanishad 1.3.14',
    sanskrit: 'उत्तिष्ठत जाग्रत प्राप्य वरान्निबोधत',
    transliteration: 'uttiṣṭhata jāgrata prāpya varān nibodhata',
    english: 'Arise! Awake! And stop not until the goal is reached.',
    hindi: 'उठो! जागो! और श्रेष्ठ गुरुओं के पास जाकर ज्ञान प्राप्त करो।',
    keywords: ['arise', 'awake', 'motivation', 'goal', 'determination', 'vivekananda', 'inspiration'],
  },
  {
    source: 'upanishad', name: 'Chandogya Upanishad 6.8.7',
    sanskrit: 'तत्त्वमसि',
    transliteration: 'tat tvam asi',
    english: 'Thou art That. (You are the Supreme Reality.)',
    hindi: 'तत् त्वम् असि — तुम वही (ब्रह्म) हो।',
    keywords: ['brahman', 'self', 'identity', 'atman', 'realization', 'mahavakya', 'truth', 'advaita'],
  },
  {
    source: 'upanishad', name: 'Mandukya Upanishad 1',
    sanskrit: 'ओमित्येतदक्षरमिदं सर्वं तस्योपव्याख्यानम्',
    transliteration: 'om ity etad akṣaram idaṁ sarvaṁ tasyopavyākhyānam',
    english: 'Om — this syllable is all this. Everything is a manifestation of Om.',
    hindi: 'ॐ — यह अक्षर ही सब कुछ है। इसकी व्याख्या ही सब कुछ है।',
    keywords: ['om', 'aum', 'sound', 'mantra', 'universal', 'brahman', 'sacred'],
  },
  {
    source: 'upanishad', name: 'Brihadaranyaka Upanishad 1.3.28',
    sanskrit: 'असतो मा सद्गमय। तमसो मा ज्योतिर्गमय। मृत्योर्मा अमृतं गमय।',
    transliteration: 'asato mā sad gamaya tamaso mā jyotir gamaya mṛtyor mā amṛtaṁ gamaya',
    english: 'Lead me from the unreal to the real. Lead me from darkness to light. Lead me from death to immortality.',
    hindi: 'मुझे असत्य से सत्य की ओर ले चलो। मुझे अंधकार से प्रकाश की ओर ले चलो। मुझे मृत्यु से अमरत्व की ओर ले चलो।',
    keywords: ['prayer', 'light', 'truth', 'immortality', 'darkness', 'death', 'guidance', 'famous'],
  },
  {
    source: 'upanishad', name: 'Mundaka Upanishad 3.1.6',
    sanskrit: 'सत्यमेव जयते नानृतम्',
    transliteration: 'satyam eva jayate nānṛtam',
    english: 'Truth alone triumphs, not falsehood.',
    hindi: 'सत्य ही विजयी होता है, असत्य नहीं।',
    keywords: ['truth', 'victory', 'honesty', 'righteousness', 'motto', 'india', 'dharma'],
  },
  {
    source: 'upanishad', name: 'Taittiriya Upanishad 1.11.2',
    sanskrit: 'मातृदेवो भव। पितृदेवो भव। आचार्यदेवो भव। अतिथिदेवो भव।',
    transliteration: 'mātṛdevo bhava pitṛdevo bhava ācāryadevo bhava atithidevo bhava',
    english: 'Treat your mother as God. Treat your father as God. Treat your teacher as God. Treat your guest as God.',
    hindi: 'माता को देवता मानो। पिता को देवता मानो। आचार्य को देवता मानो। अतिथि को देवता मानो।',
    keywords: ['mother', 'father', 'teacher', 'guest', 'respect', 'family', 'values', 'duty', 'parents'],
  },
  {
    source: 'upanishad', name: 'Taittiriya Upanishad 2.1',
    sanskrit: 'सत्यं ज्ञानमनन्तं ब्रह्म',
    transliteration: 'satyaṁ jñānam anantaṁ brahma',
    english: 'Brahman is Truth, Knowledge, and Infinity.',
    hindi: 'ब्रह्म सत्य है, ज्ञान है, अनन्त है।',
    keywords: ['brahman', 'truth', 'knowledge', 'infinity', 'god', 'definition', 'ultimate'],
  },
  {
    source: 'upanishad', name: 'Isha Upanishad 6',
    sanskrit: 'यस्तु सर्वाणि भूतान्यात्मन्येवानुपश्यति। सर्वभूतेषु चात्मानं ततो न विजुगुप्सते॥',
    transliteration: 'yas tu sarvāṇi bhūtāny ātmany evānupaśyati sarva-bhūteṣu cātmānaṁ tato na vijugupsate',
    english: 'One who sees all beings in the Self and the Self in all beings — such a person never turns away from anything.',
    hindi: 'जो सभी प्राणियों को आत्मा में और आत्मा को सभी प्राणियों में देखता है, वह किसी से घृणा नहीं करता।',
    keywords: ['unity', 'oneness', 'self', 'atman', 'compassion', 'equality', 'universal'],
  },
  {
    source: 'upanishad', name: 'Kena Upanishad 2.4',
    sanskrit: 'प्रतिबोधविदितं मतममृतत्वं हि विन्दते',
    transliteration: 'pratibodha-viditaṁ matam amṛtatvaṁ hi vindate',
    english: 'It is known when It is realized in every state of consciousness. Through such knowledge, one attains immortality.',
    hindi: 'प्रत्येक चेतना की अवस्था में जाना जाने पर यह ज्ञात होता है। ऐसे ज्ञान से अमृतत्व प्राप्त होता है।',
    keywords: ['consciousness', 'immortality', 'realization', 'awareness', 'spiritual', 'knowledge'],
  },
  {
    source: 'upanishad', name: 'Mundaka Upanishad 2.2.10',
    sanskrit: 'ब्रह्मैवेदममृतं पुरस्ताद्ब्रह्म पश्चाद्ब्रह्म दक्षिणतश्चोत्तरेण',
    transliteration: 'brahmaivedam amṛtaṁ purastād brahma paścād brahma dakṣiṇataś cottareṇa',
    english: 'Brahman alone is this immortal reality. Brahman is in front, behind, to the right, to the left, above, and below. Brahman alone is all this.',
    hindi: 'ब्रह्म ही यह अमृत तत्त्व है। ब्रह्म आगे है, पीछे है, दाहिने है, बाएँ है। ब्रह्म ही यह सब है।',
    keywords: ['brahman', 'omnipresent', 'god', 'universal', 'everywhere', 'divine', 'reality'],
  },
  {
    source: 'upanishad', name: 'Aitareya Upanishad 3.3',
    sanskrit: 'प्रज्ञानं ब्रह्म',
    transliteration: 'prajñānaṁ brahma',
    english: 'Consciousness is Brahman.',
    hindi: 'प्रज्ञान (चेतना) ही ब्रह्म है।',
    keywords: ['consciousness', 'brahman', 'mahavakya', 'awareness', 'self', 'advaita', 'vedanta'],
  },
  {
    source: 'upanishad', name: 'Brihadaranyaka Upanishad 4.4.5',
    sanskrit: 'अहं ब्रह्मास्मि',
    transliteration: 'ahaṁ brahmāsmi',
    english: 'I am Brahman.',
    hindi: 'मैं ब्रह्म हूँ।',
    keywords: ['brahman', 'self', 'identity', 'mahavakya', 'realization', 'advaita', 'atman'],
  },
  {
    source: 'upanishad', name: 'Chandogya Upanishad 3.14.1',
    sanskrit: 'सर्वं खल्विदं ब्रह्म',
    transliteration: 'sarvaṁ khalv idaṁ brahma',
    english: 'All this is indeed Brahman.',
    hindi: 'यह सब कुछ निश्चित रूप से ब्रह्म है।',
    keywords: ['brahman', 'universal', 'oneness', 'everything', 'god', 'reality', 'advaita'],
  },
  {
    source: 'upanishad', name: 'Mandukya Upanishad 2',
    sanskrit: 'अयमात्मा ब्रह्म',
    transliteration: 'ayam ātmā brahma',
    english: 'This Self (Atman) is Brahman.',
    hindi: 'यह आत्मा ब्रह्म है।',
    keywords: ['atman', 'brahman', 'self', 'mahavakya', 'identity', 'soul', 'advaita'],
  },
  {
    source: 'upanishad', name: 'Svetasvatara Upanishad 6.11',
    sanskrit: 'एको देवः सर्वभूतेषु गूढः सर्वव्यापी सर्वभूतान्तरात्मा',
    transliteration: 'eko devaḥ sarva-bhūteṣu gūḍhaḥ sarva-vyāpī sarva-bhūtāntarātmā',
    english: 'The one God, hidden in all beings, all-pervading, the inner Self of all creatures.',
    hindi: 'एक ही देव सभी प्राणियों में छिपा है, सर्वव्यापी है, सभी प्राणियों का अंतरात्मा है।',
    keywords: ['god', 'one', 'hidden', 'omnipresent', 'soul', 'inner', 'divine', 'universal'],
  },
  {
    source: 'upanishad', name: 'Katha Upanishad 2.1.1',
    sanskrit: 'पराञ्चि खानि व्यतृणत्स्वयम्भूस्तस्मात्पराङ्पश्यति नान्तरात्मन्',
    transliteration: 'parāñci khāni vyatṛṇat svayambhūs tasmāt parāṅ paśyati nāntarātman',
    english: 'The Self-existent created the senses outward-going; therefore one looks outward, not within. But some wise person, seeking immortality, turns the gaze inward and sees the Self.',
    hindi: 'स्वयंभू ने इन्द्रियों को बाहर की ओर बनाया, इसलिए प्राणी बाहर देखता है, अंदर नहीं। लेकिन कोई विवेकी, अमृतत्व की खोज में, दृष्टि अंदर करके आत्मा को देखता है।',
    keywords: ['senses', 'inward', 'meditation', 'self', 'introspection', 'wisdom', 'immortality'],
  },
  {
    source: 'upanishad', name: 'Kaivalya Upanishad 1.2',
    sanskrit: 'न कर्मणा न प्रजया धनेन त्यागेनैके अमृतत्वमानशुः',
    transliteration: 'na karmaṇā na prajayā dhanena tyāgenaike amṛtatvam ānaśuḥ',
    english: 'Not by works, not by offspring, not by wealth, but by renunciation alone some attained immortality.',
    hindi: 'न कर्म से, न सन्तान से, न धन से, बल्कि त्याग से ही कुछ लोगों ने अमृतत्व प्राप्त किया।',
    keywords: ['renunciation', 'immortality', 'detachment', 'wealth', 'spiritual', 'tyaga', 'moksha'],
  },
];

// ─── Popular Mantras (15) ──────────────────────────────────────────────────────

const MANTRAS: ScriptureVerse[] = [
  {
    source: 'mantra', name: 'Gayatri Mantra',
    sanskrit: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्',
    transliteration: 'oṁ bhūr bhuvaḥ svaḥ tat savitur vareṇyaṁ bhargo devasya dhīmahi dhiyo yo naḥ pracodayāt',
    english: 'We meditate on the glory of the Creator who has created the Universe, who is worthy of worship, who is the embodiment of knowledge and light. May He enlighten our intellect.',
    hindi: 'हम उस सृष्टिकर्ता के तेज का ध्यान करते हैं जिसने ब्रह्मांड की रचना की है, जो पूजनीय है, ज्ञान और प्रकाश का स्वरूप है। वह हमारी बुद्धि को प्रेरित करे।',
    keywords: ['gayatri', 'sun', 'wisdom', 'light', 'knowledge', 'meditation', 'morning', 'sandhya', 'famous', 'intellect'],
  },
  {
    source: 'mantra', name: 'Mahamrityunjaya Mantra',
    sanskrit: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्। उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्॥',
    transliteration: 'oṁ tryambakaṁ yajāmahe sugandhiṁ puṣṭi-vardhanam urvārukam iva bandhanān mṛtyor mukṣīya māmṛtāt',
    english: 'We worship the three-eyed Lord Shiva who nourishes and spreads fragrance in our lives. May He liberate us from the bondage of death, as a cucumber is released from the vine, and grant us immortality.',
    hindi: 'हम त्रिनेत्र भगवान शिव की पूजा करते हैं जो हमारे जीवन में सुगंध और पुष्टि का संचार करते हैं। जैसे ककड़ी बेल से अलग होती है, वैसे ही हमें मृत्यु के बंधन से मुक्त करें।',
    keywords: ['shiva', 'death', 'health', 'healing', 'protection', 'immortality', 'mahamrityunjaya', 'fear', 'illness', 'longevity'],
  },
  {
    source: 'mantra', name: 'Om Namah Shivaya',
    sanskrit: 'ॐ नमः शिवाय',
    transliteration: 'oṁ namaḥ śivāya',
    english: 'I bow to Lord Shiva. This panchakshari (five-syllable) mantra is the most sacred mantra of Lord Shiva.',
    hindi: 'मैं भगवान शिव को नमन करता हूँ। यह पंचाक्षरी मंत्र भगवान शिव का सबसे पवित्र मंत्र है।',
    keywords: ['shiva', 'mantra', 'devotion', 'panchakshari', 'worship', 'meditation', 'peace', 'mahadev'],
  },
  {
    source: 'mantra', name: 'Om Namo Narayanaya',
    sanskrit: 'ॐ नमो नारायणाय',
    transliteration: 'oṁ namo nārāyaṇāya',
    english: 'I bow to Lord Narayana (Vishnu). This ashtakshari (eight-syllable) mantra invokes the preserver of the universe.',
    hindi: 'मैं भगवान नारायण (विष्णु) को नमन करता हूँ। यह अष्टाक्षरी मंत्र ब्रह्मांड के पालनकर्ता का आह्वान करता है।',
    keywords: ['vishnu', 'narayana', 'mantra', 'devotion', 'preserver', 'worship', 'ashtakshari'],
  },
  {
    source: 'mantra', name: 'Ganesh Mantra',
    sanskrit: 'ॐ गं गणपतये नमः',
    transliteration: 'oṁ gaṁ gaṇapataye namaḥ',
    english: 'Salutations to Lord Ganesha, the remover of obstacles and the lord of beginnings.',
    hindi: 'भगवान गणेश को नमस्कार, जो विघ्नहर्ता और शुभारम्भ के देवता हैं।',
    keywords: ['ganesha', 'ganesh', 'obstacle', 'beginning', 'success', 'wisdom', 'new', 'start', 'vighneshwara'],
  },
  {
    source: 'mantra', name: 'Lakshmi Mantra',
    sanskrit: 'ॐ श्रीं महालक्ष्म्यै नमः',
    transliteration: 'oṁ śrīṁ mahālakṣmyai namaḥ',
    english: 'Salutations to Goddess Mahalakshmi, the bestower of wealth, prosperity, and fortune.',
    hindi: 'देवी महालक्ष्मी को नमस्कार, जो धन, समृद्धि और सौभाग्य की दात्री हैं।',
    keywords: ['lakshmi', 'wealth', 'prosperity', 'money', 'fortune', 'diwali', 'abundance', 'goddess'],
  },
  {
    source: 'mantra', name: 'Saraswati Mantra',
    sanskrit: 'ॐ ऐं सरस्वत्यै नमः',
    transliteration: 'oṁ aiṁ sarasvatyai namaḥ',
    english: 'Salutations to Goddess Saraswati, the bestower of knowledge, wisdom, and learning.',
    hindi: 'देवी सरस्वती को नमस्कार, जो ज्ञान, विद्या और कला की दात्री हैं।',
    keywords: ['saraswati', 'knowledge', 'education', 'learning', 'wisdom', 'student', 'exam', 'study', 'goddess'],
  },
  {
    source: 'mantra', name: 'Hanuman Mantra',
    sanskrit: 'ॐ हनुमते नमः',
    transliteration: 'oṁ hanumate namaḥ',
    english: 'Salutations to Lord Hanuman, the embodiment of devotion, strength, and courage.',
    hindi: 'भगवान हनुमान को नमस्कार, जो भक्ति, शक्ति और साहस के प्रतीक हैं।',
    keywords: ['hanuman', 'strength', 'courage', 'devotion', 'protection', 'rama', 'bajrang', 'power'],
  },
  {
    source: 'mantra', name: 'Durga Mantra',
    sanskrit: 'ॐ दुं दुर्गायै नमः',
    transliteration: 'oṁ duṁ durgāyai namaḥ',
    english: 'Salutations to Goddess Durga, the invincible one who destroys evil and protects the righteous.',
    hindi: 'देवी दुर्गा को नमस्कार, जो अजेय हैं, बुराई का नाश करती हैं और धर्म की रक्षा करती हैं।',
    keywords: ['durga', 'protection', 'strength', 'evil', 'goddess', 'shakti', 'navratri', 'power', 'feminine'],
  },
  {
    source: 'mantra', name: 'Shanti Mantra',
    sanskrit: 'ॐ सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः। सर्वे भद्राणि पश्यन्तु मा कश्चिद्दुःखभाग्भवेत्। ॐ शान्तिः शान्तिः शान्तिः॥',
    transliteration: 'oṁ sarve bhavantu sukhinaḥ sarve santu nirāmayāḥ sarve bhadrāṇi paśyantu mā kaścid duḥkha-bhāg bhavet oṁ śāntiḥ śāntiḥ śāntiḥ',
    english: 'May all be happy. May all be free from illness. May all see auspiciousness. May no one suffer. Om peace, peace, peace.',
    hindi: 'सभी सुखी हों। सभी निरोगी हों। सभी मंगल देखें। कोई दुःख का भागी न हो। ॐ शान्ति शान्ति शान्ति।',
    keywords: ['peace', 'shanti', 'happiness', 'health', 'wellbeing', 'universal', 'prayer', 'blessing'],
  },
  {
    source: 'mantra', name: 'Navkar Mantra (Jain)',
    sanskrit: 'णमो अरिहंताणं। णमो सिद्धाणं। णमो आयरियाणं। णमो उवज्झायाणं। णमो लोए सव्वसाहूणं।',
    transliteration: 'ṇamo arihantāṇaṁ ṇamo siddhāṇaṁ ṇamo āyariyāṇaṁ ṇamo uvajjhāyāṇaṁ ṇamo loe savvasāhūṇaṁ',
    english: 'I bow to the Arihantas (conquerors), the Siddhas (liberated), the Acharyas (teachers), the Upadhyayas (preceptors), and all Sadhus (monks) in the world.',
    hindi: 'मैं अरिहंतों, सिद्धों, आचार्यों, उपाध्यायों और सभी साधुओं को नमन करता हूँ।',
    keywords: ['jain', 'navkar', 'namokar', 'bow', 'respect', 'monk', 'teacher', 'liberation'],
  },
  {
    source: 'mantra', name: 'Mool Mantar (Sikh)',
    sanskrit: 'ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ ਨਿਰਭਉ ਨਿਰਵੈਰੁ ਅਕਾਲ ਮੂਰਤਿ ਅਜੂਨੀ ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ',
    transliteration: 'ik oaṅkār sat nām kartā purkh nirbhau nirvair akāl mūrat ajūnī saibhaṅ gur prasād',
    english: 'There is One God. His Name is Truth. He is the Creator. He is without fear. He is without enmity. He is timeless. He is beyond birth and death. He is self-illuminated. He is realized by the Guru\'s grace.',
    hindi: 'एक ईश्वर है। उसका नाम सत्य है। वह सृष्टिकर्ता है। वह निर्भय है। वह वैररहित है। वह कालातीत है। वह अजन्मा है। वह स्वयंभू है। गुरु की कृपा से प्राप्त होता है।',
    keywords: ['sikh', 'mool', 'mantar', 'one', 'god', 'truth', 'creator', 'fearless', 'guru'],
  },
  {
    source: 'mantra', name: 'Om',
    sanskrit: 'ॐ',
    transliteration: 'oṁ',
    english: 'Om is the primordial sound of the universe, representing the ultimate reality (Brahman). It encompasses all sounds and is chanted at the beginning and end of prayers.',
    hindi: 'ॐ ब्रह्मांड की मूल ध्वनि है, जो परम सत्य (ब्रह्म) का प्रतिनिधित्व करती है। यह सभी ध्वनियों को समाहित करती है और प्रार्थनाओं के आरम्भ और अंत में उच्चारित की जाती है।',
    keywords: ['om', 'aum', 'primordial', 'sound', 'meditation', 'brahman', 'universal', 'chanting', 'sacred'],
  },
  {
    source: 'mantra', name: 'Surya Mantra',
    sanskrit: 'ॐ सूर्याय नमः',
    transliteration: 'oṁ sūryāya namaḥ',
    english: 'Salutations to the Sun God, the source of light, energy, and vitality.',
    hindi: 'सूर्य देवता को नमस्कार, जो प्रकाश, ऊर्जा और जीवनशक्ति के स्रोत हैं।',
    keywords: ['surya', 'sun', 'morning', 'health', 'energy', 'vitality', 'light', 'planet', 'navagraha'],
  },
  {
    source: 'mantra', name: 'Krishna Mantra',
    sanskrit: 'हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे। हरे राम हरे राम राम राम हरे हरे॥',
    transliteration: 'hare kṛṣṇa hare kṛṣṇa kṛṣṇa kṛṣṇa hare hare hare rāma hare rāma rāma rāma hare hare',
    english: 'The Hare Krishna Maha-mantra. Chanting this mantra is considered the most effective means of self-realization in the current age (Kali Yuga).',
    hindi: 'हरे कृष्ण महामंत्र। इस मंत्र का जाप वर्तमान युग (कलियुग) में आत्म-साक्षात्कार का सबसे प्रभावी साधन माना जाता है।',
    keywords: ['krishna', 'rama', 'hare', 'mahamantra', 'chanting', 'devotion', 'iskcon', 'bhakti', 'kali yuga'],
  },
];

// ─── Combined corpus ───────────────────────────────────────────────────────────

export const ALL_VERSES: ScriptureVerse[] = [
  ...GITA_VERSES,
  ...UPANISHAD_VERSES,
  ...MANTRAS,
];

// ─── Keyword-based Search ──────────────────────────────────────────────────────

/**
 * Finds relevant scripture verses by scoring keyword overlap with the query.
 * Splits the query into individual words, matches them against each verse's keywords,
 * and returns the top N results sorted by relevance score.
 */
export function findRelevantVerses(query: string, limit: number = 5): ScriptureVerse[] {
  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2); // Skip very short words

  if (queryWords.length === 0) return [];

  const scored = ALL_VERSES.map((verse) => {
    let score = 0;

    for (const word of queryWords) {
      // Check keyword match
      for (const kw of verse.keywords) {
        if (kw === word) {
          score += 3; // Exact match
        } else if (kw.includes(word) || word.includes(kw)) {
          score += 1.5; // Partial match
        }
      }

      // Check in the English translation (lower weight)
      if (verse.english.toLowerCase().includes(word)) {
        score += 0.5;
      }

      // Check in the name or source
      if (verse.name && verse.name.toLowerCase().includes(word)) {
        score += 2;
      }
    }

    return { verse, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.verse);
}
