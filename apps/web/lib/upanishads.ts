// 10 principal Upanishads (Dashopanishads) commented on by Adi Shankaracharya.
// Programmatic-SEO source — same pattern as gita-chapters.ts / ramayana-kandas.ts.

export interface UpanishadInfo {
  slug: string;
  name: string;
  sanskrit: string;
  iast: string;
  veda: 'Rig' | 'Sama' | 'Yajur' | 'Atharva';
  vedaShakha: string; // recensional branch
  mantraCount: number;
  centralTheme: string;
  mahavakya?: { sanskrit: string; iast: string; translation: string; reference: string };
  summary: string;
  keyConcepts: string[];
  famousVerse: { sanskrit: string; iast: string; translation: string; reference: string };
  takeaway: string;
}

export const UPANISHADS: UpanishadInfo[] = [
  {
    slug: 'isha-upanishad', name: 'Isha Upanishad', sanskrit: 'ईशोपनिषद्', iast: 'Īśopaniṣad',
    veda: 'Yajur', vedaShakha: 'Shukla Yajur Veda (40th adhyaya of Vajasaneyi Samhita)',
    mantraCount: 18,
    centralTheme: 'The Lord pervades all; renunciation in the midst of action',
    summary:
      'The shortest principal Upanishad, embedded as the 40th adhyaya of the Vajasaneyi Samhita itself (rare — Upanishads usually sit at the end of Brahmanas/Aranyakas). Opens with the famous "Isha vasyam idam sarvam" — all this is enveloped by the Lord. Reconciles action and knowledge, the manifest and the unmanifest, and ends with the dying person\'s prayer "lead me from the unreal to the real, from darkness to light, from death to immortality" (asato ma sadgamaya).',
    keyConcepts: ['Ishavasya — pervasion by the Lord', 'Tena tyaktena bhunjitha — enjoy through renunciation', 'Vidya-Avidya unity', 'Asato Ma Sadgamaya prayer'],
    famousVerse: {
      sanskrit: 'ईशा वास्यमिदं सर्वं यत्किञ्च जगत्यां जगत्',
      iast: 'Īśā vāsyamidaṁ sarvaṁ yatkiñca jagatyāṁ jagat',
      translation: 'All this — whatever moves in this moving world — is enveloped by the Lord. Enjoy through renunciation; covet no one\'s wealth.',
      reference: 'Isha 1',
    },
    takeaway: 'Possession is illusion; enjoyment is a gift held in trust.',
  },
  {
    slug: 'kena-upanishad', name: 'Kena Upanishad', sanskrit: 'केनोपनिषद्', iast: 'Kenopaniṣad',
    veda: 'Sama', vedaShakha: 'Talavakara Brahmana of the Sama Veda',
    mantraCount: 34,
    centralTheme: 'That by which the mind thinks — Brahman as the prior consciousness',
    summary:
      'Opens with the disciple\'s question: "By whom (kena) is the mind directed? By whose will does prana move? Who makes the eye see, the ear hear?" The answer: the Self is the Ear of the ear, the Mind of the mind — it cannot be known by what it makes known. The second half tells the story of the devas\' pride after defeating the asuras; Brahman appears as a yaksha and humbles Agni, Vayu and Indra in turn.',
    keyConcepts: ['Prior consciousness (sa srota srotrasya)', 'Knowable vs. knower', 'Yaksha episode — devas humbled', 'Para vidya'],
    famousVerse: {
      sanskrit: 'यन्मनसा न मनुते येनाहुर्मनो मतम् । तदेव ब्रह्म त्वं विद्धि नेदं यदिदमुपासते',
      iast: 'Yan-manasā na manute yenāhur mano matam, tadeva brahma tvaṁ viddhi nedaṁ yad-idamupāsate',
      translation: 'That which the mind cannot think but by which the mind itself is thought — know that alone as Brahman, not what people worship as this.',
      reference: 'Kena 1.5',
    },
    takeaway: 'The seer cannot be seen, the knower cannot be known — you are That.',
  },
  {
    slug: 'katha-upanishad', name: 'Katha Upanishad', sanskrit: 'कठोपनिषद्', iast: 'Kaṭhopaniṣad',
    veda: 'Yajur', vedaShakha: 'Krishna Yajur Veda (Katha shakha)',
    mantraCount: 119,
    centralTheme: 'Nachiketa\'s three boons from Yama; the chariot of the body',
    summary:
      'The boy Nachiketa, sent by his angry father to Yama (Death), waits three nights at Yama\'s door. Yama grants three boons. The third — "What happens after death? Does the Self survive?" — Yama tries to deflect with wealth, kingdoms, celestial pleasures; Nachiketa refuses. Yama then teaches: the Self is uncreated, eternal, beyond cause and effect. The famous chariot analogy (3.3-9): body=chariot, intellect=charioteer, mind=reins, senses=horses, the Self is the passenger.',
    keyConcepts: ['Three boons of Nachiketa', 'Shreyas (the good) vs. preyas (the pleasant)', 'Chariot of the body', 'Self beyond grammar and sense', 'Razor\'s edge of the path'],
    famousVerse: {
      sanskrit: 'उत्तिष्ठत जाग्रत प्राप्य वरान्निबोधत । क्षुरस्य धारा निशिता दुरत्यया',
      iast: 'Uttiṣṭhata jāgrata prāpya varān nibodhata, kṣurasya dhārā niśitā duratyayā',
      translation: 'Arise, awake; having reached the wise, learn. The path is sharp as the razor\'s edge — hard to cross, the poets say.',
      reference: 'Katha 1.3.14',
    },
    takeaway: 'Choose the good (shreyas) over the pleasant (preyas). The Self is the only inheritance.',
  },
  {
    slug: 'prashna-upanishad', name: 'Prashna Upanishad', sanskrit: 'प्रश्नोपनिषद्', iast: 'Praśnopaniṣad',
    veda: 'Atharva', vedaShakha: 'Atharva Veda (Pippalada shakha)',
    mantraCount: 67,
    centralTheme: 'Six questions answered by sage Pippalada',
    summary:
      'Six seekers approach the rishi Pippalada with six questions: (1) Origin of beings? (2) What sustains the body? (3) Whence does prana arise? (4) What sleeps and dreams in us? (5) On what does meditation on Om rest? (6) Who is the person with sixteen parts? Each question becomes one prashna (section). The teaching unfolds prana-vidya, om-upasana, and purusha-vidya.',
    keyConcepts: ['Rayi-Prana cosmology', 'Five pranas and their stations', 'Three states (waking, dream, sushupti)', 'Om as the bridge', 'Shodasha-kala purusha (16-part person)'],
    famousVerse: {
      sanskrit: 'सत्येन लभ्यस्तपसा ह्येष आत्मा सम्यग्ज्ञानेन ब्रह्मचर्येण नित्यम्',
      iast: 'Satyena labhyas tapasā hyeṣa ātmā samyag-jñānena brahmacaryeṇa nityam',
      translation: 'This Self is attained by truth, by austerity, by right knowledge, and by constant brahmacharya.',
      reference: 'Prashna 1.15 (also Mundaka 3.1.5)',
    },
    takeaway: 'Truth + tapas + knowledge + brahmacharya is the only formula.',
  },
  {
    slug: 'mundaka-upanishad', name: 'Mundaka Upanishad', sanskrit: 'मुण्डकोपनिषद्', iast: 'Muṇḍakopaniṣad',
    veda: 'Atharva', vedaShakha: 'Atharva Veda',
    mantraCount: 64,
    centralTheme: 'Para vidya and Apara vidya — higher vs. lower knowledge',
    summary:
      'Distinguishes apara vidya (the four Vedas, grammar, etymology, prosody, ritual, astronomy) from para vidya (knowledge of the imperishable Brahman). Sources the national motto "Satyameva jayate" (3.1.6). Famous two-bird allegory (3.1.1-2): two birds, friends, on the same tree — one eats the sweet fruit, the other watches without eating. The watcher is the Self. The Mundaka is widely quoted and considered one of the most poetic Upanishads.',
    keyConcepts: ['Para vs. Apara vidya', 'Two birds on the same tree', 'Satyameva jayate — truth alone triumphs', 'Brahman as the bow, the Self as the arrow'],
    famousVerse: {
      sanskrit: 'सत्यमेव जयते नानृतं सत्येन पन्था विततो देवयानः',
      iast: 'Satyameva jayate nānṛtaṁ satyena panthā vitato devayānaḥ',
      translation: 'Truth alone triumphs, not falsehood; by truth the divine path is spread out, by which the seers of fulfilled desire reach the supreme treasury of truth.',
      reference: 'Mundaka 3.1.6',
    },
    takeaway: 'Lower knowledge ends in fatigue. Higher knowledge ends in freedom.',
  },
  {
    slug: 'mandukya-upanishad', name: 'Mandukya Upanishad', sanskrit: 'माण्डूक्योपनिषद्', iast: 'Māṇḍūkyopaniṣad',
    veda: 'Atharva', vedaShakha: 'Atharva Veda',
    mantraCount: 12,
    centralTheme: 'Om and the four states of consciousness',
    summary:
      'In just 12 mantras, the entire teaching of Vedanta. All this is Aum. Aum has four parts: A (waking, vaishvanara), U (dream, taijasa), M (deep sleep, prajna), and the silent fourth (turiya) — pure consciousness, the Self. Gaudapada\'s Karika expanded this into the foundational ajatavada (non-origination) doctrine that became the seed of Advaita Vedanta. The Muktika Upanishad declares that the Mandukya alone is enough for liberation.',
    mahavakya: { sanskrit: 'अयमात्मा ब्रह्म', iast: 'Ayam ātmā brahma', translation: 'This Self is Brahman.', reference: 'Mandukya 2' },
    keyConcepts: ['Om = A + U + M + silence', 'Four states: jagrat, svapna, sushupti, turiya', 'Mahavakya: Ayam Atma Brahma', 'Gaudapada Karika'],
    famousVerse: {
      sanskrit: 'ओमित्येतदक्षरमिदं सर्वं तस्योपव्याख्यानम्',
      iast: 'Om ityetad-akṣaram idaṁ sarvaṁ tasyopavyākhyānam',
      translation: 'Aum — this syllable is all this. Its explanation: what was, what is, what will be — all is Aum.',
      reference: 'Mandukya 1',
    },
    takeaway: '12 mantras, all Vedanta. Sit with the silent fourth.',
  },
  {
    slug: 'taittiriya-upanishad', name: 'Taittiriya Upanishad', sanskrit: 'तैत्तिरीयोपनिषद्', iast: 'Taittirīyopaniṣad',
    veda: 'Yajur', vedaShakha: 'Krishna Yajur Veda (Taittiriya shakha)',
    mantraCount: 0,
    centralTheme: 'The five koshas; Brahman as Anandamaya',
    summary:
      'Three valli (chapters): Shiksha Valli (pronunciation, ethics — "satyam vada, dharmam chara"), Brahmananda Valli (the five sheaths: annamaya, pranamaya, manomaya, vijnanamaya, anandamaya — and the Brahmananda calculation), and Bhrigu Valli (the boy Bhrigu\'s progressive realisation that Brahman is matter, life, mind, knowledge, and finally bliss). The famous convocation address ("Satyam vada, dharmam chara, swadhyayan ma pramada") is from the Shiksha Valli.',
    mahavakya: { sanskrit: 'आनन्दो ब्रह्मेति व्यजानात्', iast: 'Ānando brahmeti vyajānāt', translation: 'He realised that bliss is Brahman.', reference: 'Taittiriya Bhrigu 3.6' },
    keyConcepts: ['Five koshas', 'Satyam Jnanam Anantam Brahma', 'Bhrigu\'s five-fold inquiry', 'Annam Brahmeti — food is Brahman', 'Convocation address'],
    famousVerse: {
      sanskrit: 'सत्यं वद । धर्मं चर । स्वाध्यायान्मा प्रमदः',
      iast: 'Satyaṁ vada, dharmaṁ cara, svādhyāyān mā pramadaḥ',
      translation: 'Speak truth, walk dharma, do not neglect study.',
      reference: 'Taittiriya Shiksha 1.11',
    },
    takeaway: 'Move inward through the koshas — bliss is the final layer and the only ground.',
  },
  {
    slug: 'aitareya-upanishad', name: 'Aitareya Upanishad', sanskrit: 'ऐतरेयोपनिषद्', iast: 'Aitareyopaniṣad',
    veda: 'Rig', vedaShakha: 'Aitareya Aranyaka of the Rig Veda',
    mantraCount: 33,
    centralTheme: 'Creation, the Self that became all',
    summary:
      'Three short chapters from the Aitareya Aranyaka. The first describes creation: in the beginning the Self alone existed; it brought forth the worlds and the cosmic being (purusha). The second describes the three births of the Self (semen, in the womb, in the world). The third concludes with the mahavakya "Prajnanam Brahma" — consciousness is Brahman. Compact and dense.',
    mahavakya: { sanskrit: 'प्रज्ञानं ब्रह्म', iast: 'Prajñānaṁ brahma', translation: 'Consciousness is Brahman.', reference: 'Aitareya 3.1.3' },
    keyConcepts: ['Cosmogony — the Self alone', 'Three births of the Self', 'Prajnanam Brahma mahavakya'],
    famousVerse: {
      sanskrit: 'प्रज्ञानं ब्रह्म',
      iast: 'Prajñānaṁ brahma',
      translation: 'Consciousness is Brahman.',
      reference: 'Aitareya 3.1.3',
    },
    takeaway: 'Consciousness is not in you. You are in it.',
  },
  {
    slug: 'chandogya-upanishad', name: 'Chandogya Upanishad', sanskrit: 'छान्दोग्योपनिषद्', iast: 'Chāndogyopaniṣad',
    veda: 'Sama', vedaShakha: 'Chandogya Brahmana of the Sama Veda',
    mantraCount: 627,
    centralTheme: 'Tat Tvam Asi; the Self at the heart of all',
    summary:
      'One of the two longest principal Upanishads. Eight chapters covering Om-upasana, the panchagni-vidya (five-fire doctrine of rebirth), the Sandilya-vidya, the dialogue of Uddalaka Aruni and his son Shvetaketu (the source of the mahavakya "Tat Tvam Asi" — That Thou Art — repeated nine times), the dialogue of Narada and Sanatkumara, and the Indra-Virochana story (the discovery that the body is not the Self). The salt-in-water and seed-of-the-banyan demonstrations are here.',
    mahavakya: { sanskrit: 'तत्त्वमसि', iast: 'Tat tvam asi', translation: 'That thou art.', reference: 'Chandogya 6.8.7 (repeated 9x)' },
    keyConcepts: ['Tat Tvam Asi — That Thou Art', 'Panchagni vidya', 'Sandilya vidya', 'Narada-Sanatkumara dialogue (bhuma)', 'Salt-in-water analogy', 'Banyan seed analogy'],
    famousVerse: {
      sanskrit: 'स य एषोऽणिमैतदात्म्यमिदं सर्वं तत्सत्यं स आत्मा तत्त्वमसि श्वेतकेतो',
      iast: 'Sa ya eṣo\'ṇimaitadātmyamidaṁ sarvaṁ tat satyaṁ sa ātmā tat tvam asi śvetaketo',
      translation: 'That which is the subtle essence — in it all that exists has its self. That is the truth, that is the Self. That thou art, O Shvetaketu.',
      reference: 'Chandogya 6.8.7',
    },
    takeaway: 'The same essence in salt-water, the same in the banyan seed, the same in you.',
  },
  {
    slug: 'brihadaranyaka-upanishad', name: 'Brihadaranyaka Upanishad', sanskrit: 'बृहदारण्यकोपनिषद्', iast: 'Bṛhadāraṇyakopaniṣad',
    veda: 'Yajur', vedaShakha: 'Shatapatha Brahmana of the Shukla Yajur Veda',
    mantraCount: 435,
    centralTheme: 'Aham Brahmasmi; the great dialogues of Yajnavalkya',
    summary:
      'The longest Upanishad. Six chapters of cosmology, ritual mysticism, and the great Yajnavalkya dialogues: with Janaka, with Maitreyi (his wife — "by what shall one know the knower?"), with Gargi Vachaknavi (the woman philosopher whose questions reduce all elements to akasha and beyond), and the brahmodya at Janaka\'s court where Yajnavalkya wins a thousand cows. The mahavakya "Aham Brahmasmi" (I am Brahman) and the prayer "Asato Ma Sadgamaya" both appear here.',
    mahavakya: { sanskrit: 'अहं ब्रह्मास्मि', iast: 'Ahaṁ brahmāsmi', translation: 'I am Brahman.', reference: 'Brihadaranyaka 1.4.10' },
    keyConcepts: ['Aham Brahmasmi mahavakya', 'Yajnavalkya-Maitreyi dialogue', 'Yajnavalkya-Gargi (akasha-brahmana)', 'Neti neti — not this, not this', 'Asato Ma Sadgamaya prayer'],
    famousVerse: {
      sanskrit: 'असतो मा सद्गमय । तमसो मा ज्योतिर्गमय । मृत्योर्मा अमृतं गमय',
      iast: 'Asato mā sad-gamaya, tamaso mā jyotir-gamaya, mṛtyor mā amṛtaṁ gamaya',
      translation: 'From the unreal lead me to the real, from darkness lead me to light, from death lead me to immortality.',
      reference: 'Brihadaranyaka 1.3.28',
    },
    takeaway: 'Neti, neti — not this, not this — until only the witness remains.',
  },
  {
    slug: 'svetasvatara-upanishad', name: 'Svetasvatara Upanishad', sanskrit: 'श्वेताश्वतरोपनिषद्', iast: 'Śvetāśvataropaniṣad',
    veda: 'Yajur', vedaShakha: 'Krishna Yajur Veda (Taittiriya shakha — appended to its Aranyaka)',
    mantraCount: 113,
    centralTheme: 'The first theistic Upanishad — Rudra-Shiva as the one God hidden in all beings',
    mahavakya: { sanskrit: 'एको देवः सर्वभूतेषु गूढः', iast: 'Eko devaḥ sarva-bhūteṣu gūḍhaḥ', translation: 'One God hidden in all beings.', reference: 'Svetasvatara 6.11' },
    summary:
      'Named after the sage Svetasvatara ("of the white mule"), this is the earliest Upanishad to openly worship a personal deity — Rudra-Shiva — as the Supreme Brahman. Six adhyayas of 113 mantras synthesise Samkhya cosmology (purusha + prakriti + three gunas), early Yoga (posture, breath, withdrawal), and Vedanta non-duality into a devotional theism. Sources the iconic verses "yo brahmāṇaṁ vidadhāti pūrvam" and "tam īśvarāṇāṁ paramaṁ maheśvaram". Often called the seed-text of bhakti within the shruti canon.',
    keyConcepts: ['Eka deva — one God in all beings', 'Rudra as Brahman + Ishvara', 'Samkhya purusha-prakriti + three gunas absorbed into Vedanta', 'Early astanga-yoga seed (2.8-15 posture, prana, dharana)', 'Maya as the Lord\'s power (māyāṁ tu prakṛtiṁ vidyāt māyinaṁ tu maheśvaram)', 'Two birds verse re-quoted (4.6-7)'],
    famousVerse: {
      sanskrit: 'एको देवः सर्वभूतेषु गूढः सर्वव्यापी सर्वभूतान्तरात्मा । कर्माध्यक्षः सर्वभूताधिवासः साक्षी चेता केवलो निर्गुणश्च',
      iast: 'Eko devaḥ sarva-bhūteṣu gūḍhaḥ sarva-vyāpī sarva-bhūtāntarātmā, karmādhyakṣaḥ sarva-bhūtādhivāsaḥ sākṣī cetā kevalo nirguṇaśca',
      translation: 'One God, hidden in all beings, all-pervading, the inner Self of all — overseer of all action, dwelling in all beings, the witness, the knower, alone and beyond the gunas.',
      reference: 'Svetasvatara 6.11',
    },
    takeaway: 'The impersonal Brahman of the early Upanishads here puts on a face — and that face is Shiva-as-Ishvara, lovable as well as knowable.',
  },
  {
    slug: 'kaushitaki-upanishad', name: 'Kaushitaki Upanishad', sanskrit: 'कौषीतक्युपनिषद्', iast: 'Kauṣītaki-upaniṣad',
    veda: 'Rig', vedaShakha: 'Kaushitaki Brahmana of the Rig Veda (Kaushitaki / Shankhayana shakha)',
    mantraCount: 49,
    centralTheme: 'Prana as Brahman; the post-mortem path to the world of Brahma',
    mahavakya: { sanskrit: 'प्राणो ब्रह्म', iast: 'Prāṇo brahma', translation: 'Prana is Brahman.', reference: 'Kaushitaki 2.1' },
    summary:
      'Four adhyayas, 49 mantras. Chapter 1 narrates Chitra Gangyayani\'s teaching to Aruni on the two post-mortem paths — devayana (the way of the gods, no return) and pitriyana (the way of the ancestors, return through the moon). Chapter 2 is the great prana-vidya: prana is the conscious Self, the breath that holds the senses, the immortal in the mortal. Chapter 3 records Indra\'s self-disclosure to Pratardana: "I am prana, I am the conscious Self — meditate on me as life, as immortality." Chapter 4 is the Balaki-Ajatashatru dialogue (paralleled in Brihadaranyaka 2.1) where 16 partial definitions of Brahman are corrected to the one Self.',
    keyConcepts: ['Prana-vidya — breath as the conscious Self', 'Devayana vs. pitriyana — two post-mortem paths', 'Indra-Pratardana dialogue ("aham asmi prajñātmā")', 'Balaki-Ajatashatru — 16 false Brahmans corrected', 'Paryanka-vidya — the cosmic couch of Brahma'],
    famousVerse: {
      sanskrit: 'प्राणोऽस्मि प्रज्ञात्मा तं मामायुरमृतमित्युपास्स्व',
      iast: 'Prāṇo\'smi prajñātmā taṁ mām āyur amṛtam ity upāssva',
      translation: 'I am prana, the conscious Self — meditate on me as life, as immortality.',
      reference: 'Kaushitaki 3.2',
    },
    takeaway: 'Breath is not a function of the Self; the Self is the breath that breathes the breath.',
  },
  {
    slug: 'maitri-upanishad', name: 'Maitri Upanishad', sanskrit: 'मैत्र्युपनिषद्', iast: 'Maitry-upaniṣad',
    veda: 'Yajur', vedaShakha: 'Krishna Yajur Veda (Maitrayaniya shakha)',
    mantraCount: 107,
    centralTheme: 'Six-limbed yoga (shadanga-yoga) and the two-fold Brahman (shabda + ashabda)',
    summary:
      'Also called Maitrayaniya. Opens with King Brihadratha renouncing his kingdom and asking the sage Shakayanya the existential question: "In this body, foul-smelling and pithless — heap of bone, skin, marrow, flesh, semen, blood, mucus, tears, faeces, urine, wind, bile and phlegm — what is the use of enjoyment?" The reply unfolds across seven prapathakas the doctrine of two Brahmans (the sound-Brahman Om → the soundless Brahman beyond), the six-limbed yoga of pranayama, pratyahara, dhyana, dharana, tarka and samadhi (the earliest shadanga-yoga schema, predating Patanjali\'s ashtanga), and an extended teaching on time (kala) as the form of the Lord.',
    keyConcepts: ['Brihadratha\'s body-renunciation prashna', 'Two Brahmans — shabda (Om) and ashabda (silent)', 'Shadanga-yoga: pranayama, pratyahara, dhyana, dharana, tarka, samadhi', 'Kala-vada — time as the Lord\'s form', 'Five gross + five subtle elements + the absorber'],
    famousVerse: {
      sanskrit: 'प्राणायामः प्रत्याहारो ध्यानं धारणा तर्कः समाधिः षडङ्ग इत्युच्यते योगः',
      iast: 'Prāṇāyāmaḥ pratyāhāro dhyānaṁ dhāraṇā tarkaḥ samādhiḥ ṣaḍaṅga ity ucyate yogaḥ',
      translation: 'Breath-control, withdrawal of the senses, meditation, concentration, inquiry, and absorption — this six-limbed yoga is so declared.',
      reference: 'Maitri 6.18',
    },
    takeaway: 'The body is a leaking pot; the only worthwhile use of the years left is the six-limbed climb from Om to silence.',
  },
  {
    slug: 'yoga-tattva-upanishad', name: 'Yoga Tattva Upanishad', sanskrit: 'योगतत्त्वोपनिषद्', iast: 'Yoga-tattva-upaniṣad',
    veda: 'Yajur', vedaShakha: 'Krishna Yajur Veda (Yoga Upanishad group)',
    mantraCount: 142,
    centralTheme: 'The four yogas — mantra, laya, hatha, raja — taught by Vishnu to Brahma',
    summary:
      'A minor (sāmānya-yoga) Upanishad of 142 mantras opening with Brahma\'s prostration before Vishnu and the question: "Teach me the science of yoga (yoga-tattvam) by which the jiva is freed from samsara." Vishnu replies with the classical four-fold yoga taxonomy: mantra-yoga (japa of an ishta-mantra for 12 years), laya-yoga (dissolution through the chitta\'s absorption in the object of meditation), hatha-yoga (the eight angas with detailed asana, eight kumbhakas and three bandhas), and raja-yoga (the highest, leading to kevala-kumbhaka and samadhi). Lists the obstacles (vighna), the four awakening stages (arambha, ghata, parichaya, nishpatti) and the eight siddhis with their grave dangers.',
    keyConcepts: ['Four yogas — mantra, laya, hatha, raja', 'Four stages — arambha → ghata → parichaya → nishpatti', 'Eight kumbhakas + three bandhas (mula, uddiyana, jalandhara)', 'Kevala-kumbhaka as the doorway to raja-yoga', 'Eight siddhis and the warning against attachment to them'],
    famousVerse: {
      sanskrit: 'मन्त्रो लयो हठो राजयोगोऽन्तर्भूमिकाः क्रमात् । एक एव चतुर्धाऽयं महायोग इति स्मृतः',
      iast: 'Mantro layo haṭho rāja-yogo\'ntar-bhūmikāḥ kramāt, eka eva caturdhā\'yaṁ mahā-yoga iti smṛtaḥ',
      translation: 'Mantra, laya, hatha and raja are the progressive inner stages — though four, this is remembered as the one Maha-Yoga.',
      reference: 'Yoga Tattva 19-20',
    },
    takeaway: 'Mantra is the doorway, laya the corridor, hatha the staircase, raja the throne room — and all four are one yoga.',
  },
  {
    slug: 'yoga-kundalini-upanishad', name: 'Yoga Kundalini Upanishad', sanskrit: 'योगकुण्डल्युपनिषद्', iast: 'Yoga-kuṇḍaly-upaniṣad',
    veda: 'Yajur', vedaShakha: 'Krishna Yajur Veda (Yoga Upanishad group)',
    mantraCount: 171,
    centralTheme: 'Awakening kundalini through pranayama, mudras and khechari',
    summary:
      'Three chapters, 171 mantras. The most technical of the kundalini-yoga Upanishads. Chapter 1 details saraswati-chalana (the "stirring of Saraswati" — a manipulation of the sushumna at the navel) and the pranayama-mudra combinations (especially shakti-chalana with the four bhutas) that rouse the coiled serpent-power at the muladhara and drive her up the central channel through the six chakras to the sahasrara. Chapter 2 is a complete manual of khechari-mudra — the lengthening, milking and severance of the frenulum until the tongue reverses into the nasopharynx and drinks the amrita of the lunar plexus, conferring physical immortality. Chapter 3 closes with the description of the three avasthas culminating in videha-mukti and the soundless turiya.',
    keyConcepts: ['Kundalini — the coiled shakti at muladhara', 'Saraswati-chalana + shakti-chalana mudras', 'Khechari-mudra — tongue lock for amrita-pana', 'Six chakras and their piercing', 'Three avasthas: arambha, pichu-pichu, vaja', 'Videha-mukti and the soundless turiya'],
    famousVerse: {
      sanskrit: 'कुण्डलिन्याः समुद्भूतां गायत्रीं प्राणसंयुताम् । ज्ञानमुद्रां च मां प्राप्य संसारं तरते नरः',
      iast: 'Kuṇḍalinyāḥ samudbhūtāṁ gāyatrīṁ prāṇa-saṁyutām, jñāna-mudrāṁ ca māṁ prāpya saṁsāraṁ tarate naraḥ',
      translation: 'Reaching the Gayatri risen from Kundalini, joined with prana, and the jnana-mudra — that I am — a man crosses samsara.',
      reference: 'Yoga Kundalini 1.86',
    },
    takeaway: 'The serpent is not a metaphor — she sleeps until prana drives her up the spine.',
  },
  {
    slug: 'dhyana-bindu-upanishad', name: 'Dhyana Bindu Upanishad', sanskrit: 'ध्यानबिन्दूपनिषद्', iast: 'Dhyāna-bindūpaniṣad',
    veda: 'Yajur', vedaShakha: 'Krishna Yajur Veda (Yoga Upanishad group)',
    mantraCount: 106,
    centralTheme: 'The bindu (drop) at the heart of Om — meditation on the seed-point',
    summary:
      'A 106-mantra yoga-Upanishad teaching pranava-upasana and bindu-dhyana. Opens with the famous declaration: "Even if a mountain of sin as large as Meru extends for many leagues, it is destroyed by dhyana-yoga — no other means is known to break it." Lays out the six-anga yoga (asana, prana-samrodha, pratyahara, dharana, dhyana, samadhi), the AUM-tri-matra meditation with each matra mapped to a deity (Brahma-Vishnu-Rudra) and a guna (rajas-sattva-tamas), and the bindu as the half-matra (ardha-matra) above the M — the silent dot of the chandra-bindu where the meditator is absorbed. Closes with the lotus-of-the-heart visualisation and the nine chakras (extending the standard six with manas, soma and lalata).',
    keyConcepts: ['Bindu — the seed-point above Om', 'AUM tri-matra → Brahma-Vishnu-Rudra mapping', 'Ardha-matra — the silent half-measure', 'Six-anga yoga (variant — drops tarka, keeps asana)', 'Nine chakras (six + manas + soma + lalata)', 'Hamsa-mantra (so\'ham japa) on inhale-exhale'],
    famousVerse: {
      sanskrit: 'यदि शैलसमं पापं विस्तीर्णं बहुयोजनम् । भिद्यते ध्यानयोगेन नान्यो भेदः कदाचन',
      iast: 'Yadi śaila-samaṁ pāpaṁ vistīrṇaṁ bahu-yojanam, bhidyate dhyāna-yogena nānyo bhedaḥ kadācana',
      translation: 'Even sin as vast as a mountain, extending many leagues, is shattered by dhyana-yoga — no other means is ever known.',
      reference: 'Dhyana Bindu 1',
    },
    takeaway: 'Past the A, past the U, past the M — sit with the silent dot above the moon.',
  },
  {
    slug: 'advaya-taraka-upanishad', name: 'Advaya Taraka Upanishad', sanskrit: 'अद्वयतारकोपनिषद्', iast: 'Advaya-tārakopaniṣad',
    veda: 'Yajur', vedaShakha: 'Shukla Yajur Veda (Sannyasa / Yoga Upanishad group)',
    mantraCount: 19,
    centralTheme: 'Taraka-brahma-yoga — the saviour Brahman + the famous gu-ru etymology',
    summary:
      'Just 19 mantras of dense yoga-Vedanta. "Taraka" — "that which ferries across" — names the inner light meditated upon between the eyebrows or at the heart-cave; the meditator becomes one with the saviour Brahman that ferries the jiva over samsara. Distinguishes purva-taraka (the prior, sa-vishaya — with object: trataka on inner stars, lights, suns) from uttara-taraka (the higher, nir-vishaya — objectless, manonmani, the unmesha of pure awareness). Lists the five-fold tri-lakshya-yoga (gazing at the tip of nose, midway, etc) and seals with the iconic guru-etymology: "gu means darkness, ru means its remover; the guru is so called because he removes the darkness."',
    keyConcepts: ['Taraka — the saviour Brahman that ferries across', 'Purva-taraka (with object) vs. uttara-taraka (objectless / manonmani)', 'Tri-lakshya-yoga — three meditation points', 'Shambhavi mudra and amanaska state', 'Gu-Ru etymology: darkness → its remover'],
    famousVerse: {
      sanskrit: 'गुशब्दस्त्वन्धकारः स्यात् रुशब्दस्तन्निरोधकः । अन्धकारनिरोधित्वात् गुरुरित्यभिधीयते',
      iast: 'Gu-śabdas tv andhakāraḥ syāt ru-śabdas tan-nirodhakaḥ, andhakāra-nirodhitvāt gurur ity abhidhīyate',
      translation: 'The syllable "gu" denotes darkness; the syllable "ru" denotes its remover. Because he removes the darkness, he is called guru.',
      reference: 'Advaya Taraka 16',
    },
    takeaway: 'The guru is not a person but the function of darkness-removal — wherever that happens, there the guru is.',
  },
  {
    slug: 'narayana-upanishad', name: 'Narayana Upanishad', sanskrit: 'नारायणोपनिषद्', iast: 'Nārāyaṇopaniṣad',
    veda: 'Yajur', vedaShakha: 'Krishna Yajur Veda (Taittiriya shakha — Vaishnava Upanishad group)',
    mantraCount: 13,
    centralTheme: 'Narayana as the All — source, substance and goal of the cosmos',
    mahavakya: { sanskrit: 'नारायण एवेदं सर्वम्', iast: 'Nārāyaṇa evedaṁ sarvam', translation: 'Narayana alone is all this.', reference: 'Narayana Upanishad 2' },
    summary:
      'A short Vaishnava Upanishad of 13 mantras, recited daily by Sri-Vaishnavas as part of the Narayana-anuvaka. Declares that Narayana alone existed before creation — not Brahma, not Shiva, not the dyaus or earth — and that from his contemplation arose Brahma, the senses, the elements, the worlds, the Vedas, even Rudra and Indra. Embeds the ashtakshara mantra "om namo nārāyaṇāya" with the assurance that whoever recites it gains the heaven of Vaikuntha. Frequently chanted with the Purusha-sukta, Sri-sukta and Bhu-sukta as part of the Narayana-Upanishad bundle in Vaishnava sandhya.',
    keyConcepts: ['Narayana as the pre-cosmic One', 'Cosmogony — Brahma + senses + elements + Vedas from Narayana', 'Ashtakshara mantra — om namo nārāyaṇāya', 'Daily liturgical use in Sri-Vaishnava sandhya', 'Identity of Narayana with Brahman, Shiva, Indra, kala and the Vedas'],
    famousVerse: {
      sanskrit: 'नारायण एवेदं सर्वं यद्भूतं यच्च भव्यम् । निष्कलङ्को निरञ्जनो निर्विकल्पो निराख्यातः शुद्धो देव एको नारायणः',
      iast: 'Nārāyaṇa evedaṁ sarvaṁ yad-bhūtaṁ yac ca bhavyam, niṣkalaṅko nirañjano nirvikalpo nirākhyātaḥ śuddho deva eko nārāyaṇaḥ',
      translation: 'Narayana alone is all this — what has been and what shall be. Spotless, untainted, beyond change, beyond name, pure — the one God is Narayana.',
      reference: 'Narayana Upanishad 2',
    },
    takeaway: 'Past, present, future — one name covers it: Narayana.',
  },
  {
    slug: 'paingala-upanishad', name: 'Paingala Upanishad', sanskrit: 'पैङ्गलोपनिषद्', iast: 'Paiṅgalopaniṣad',
    veda: 'Yajur', vedaShakha: 'Shukla Yajur Veda (Sāmānya-Vedānta Upanishad group)',
    mantraCount: 52,
    centralTheme: 'Atman-Brahman identity unfolded through Yajnavalkya\'s instruction to Paingala',
    mahavakya: { sanskrit: 'तत्त्वमसि', iast: 'Tat tvam asi', translation: 'That thou art.', reference: 'Paingala 2.6' },
    summary:
      'Four chapters recording the disciple Paingala\'s twelve-year inquiry under Yajnavalkya. Chapter 1 lays out the cosmogony — the pre-cosmic Brahman, its reflection in maya, the unfolding of the five elements, the three bodies (sthula, sukshma, karana) and the three avasthas. Chapter 2 takes the mahavakya "Tat tvam asi" apart pada-by-pada — tat (lakshyartha = pure Brahman), tvam (jiva minus upadhis), asi (the indivisible identity) — the classic Advaita jahad-ajahal-lakshana exegesis later codified by Shankara and Sureshvara. Chapter 3 is the jivanmukti / videhamukti distinction; Chapter 4 closes with the post-realisation conduct of the knower.',
    keyConcepts: ['Pada-by-pada exegesis of Tat Tvam Asi', 'Three bodies + three states framework', 'Jahad-ajahal-lakshana (the Advaita method of mahavakya interpretation)', 'Jivanmukti vs. videhamukti distinction', 'Twelve-year tapas of Paingala before instruction was given'],
    famousVerse: {
      sanskrit: 'तत्पदं लक्ष्यते ब्रह्म त्वंपदं जीव उच्यते । असिपदैक्यसम्बन्धस्तत्त्वमस्यादिवाक्यतः',
      iast: 'Tat-padaṁ lakṣyate brahma tvaṁ-padaṁ jīva ucyate, asi-padaikya-sambandhas tat-tvam-asy-ādi-vākyataḥ',
      translation: 'The word "tat" indicates Brahman, the word "tvam" the jiva; the word "asi" establishes their identity — this is the import of "Tat tvam asi" and the great sayings.',
      reference: 'Paingala 2.6',
    },
    takeaway: 'Strip tat of cosmic upadhi, strip tvam of personal upadhi — what remains in both is one.',
  },
  {
    slug: 'ganapati-upanishad', name: 'Ganapati Upanishad', sanskrit: 'गणपत्युपनिषद्', iast: 'Gaṇapaty-upaniṣad',
    veda: 'Atharva', vedaShakha: 'Atharva Veda (also called Ganapati Atharvashirsha)',
    mantraCount: 14,
    centralTheme: 'Ganesha as Brahman — the elephant-headed One identical with Om and the supreme Self',
    mahavakya: { sanskrit: 'त्वमेव प्रत्यक्षं तत्त्वमसि', iast: 'Tvameva pratyakṣaṁ tat-tvam-asi', translation: 'You alone are the visible "That thou art."', reference: 'Ganapati Upanishad 1' },
    summary:
      'Also called Ganapati Atharvashirsha or Sri Ganapati Atharvashirsha Upanishad. Opens with the iconic prostration "Om Namaste Ganapataye" and the eight-fold identification: "You alone are the visible Tattva, you alone are the creator, you alone are the sustainer, you alone are the destroyer, you alone are all this, you alone are Brahman, you alone are the Atman." Embeds the ganesha-gayatri ("ekadantāya vidmahe, vakratuṇḍāya dhīmahi") and the seed-mantra "gaṁ" with its full nyasa procedure. Recited daily by Ganapatya sect and by all who begin any auspicious undertaking. Promises removal of obstacles, mastery of the eight siddhis and ultimate liberation to its daily reciter.',
    keyConcepts: ['Ganesha = Brahman = Atman identity', 'Ekakshara mantra "gaṁ" + ganesha-gayatri', 'Eight-fold identification (creator/sustainer/destroyer/all/Brahman/Atman/visible-Tattva/Aum)', 'Phalashruti — eight siddhis + mukti for daily recitation', 'Used as obstacle-removal invocation before every Vedic ritual'],
    famousVerse: {
      sanskrit: 'त्वं ब्रह्मा त्वं विष्णुस्त्वं रुद्रस्त्वमिन्द्रस्त्वमग्निस्त्वं वायुस्त्वं सूर्यस्त्वं चन्द्रमास्त्वं ब्रह्म भूर्भुवः स्वरोम्',
      iast: 'Tvaṁ brahmā tvaṁ viṣṇus tvaṁ rudras tvam indras tvam agnis tvaṁ vāyus tvaṁ sūryas tvaṁ candramās tvaṁ brahma bhūr bhuvaḥ svar oṁ',
      translation: 'You are Brahma, you are Vishnu, you are Rudra, you are Indra, you are Agni, you are Vayu, you are Surya, you are Chandra — you are Brahman, the three worlds, you are Om.',
      reference: 'Ganapati Upanishad 8',
    },
    takeaway: 'The remover of obstacles is not a deva among devas — he is the One the devas themselves are.',
  },
  {
    slug: 'devi-upanishad', name: 'Devi Upanishad', sanskrit: 'देव्युपनिषद्', iast: 'Devy-upaniṣad',
    veda: 'Atharva', vedaShakha: 'Atharva Veda (Shakta Upanishad group)',
    mantraCount: 32,
    centralTheme: 'The Goddess as Brahman — Devi\'s self-disclosure of her own supreme nature to the devas',
    mahavakya: { sanskrit: 'अहं ब्रह्मस्वरूपिणी', iast: 'Ahaṁ brahma-svarūpiṇī', translation: 'I am of the form of Brahman.', reference: 'Devi Upanishad 2' },
    summary:
      'A Shakta Upanishad of 32 mantras. Opens with the devas approaching the Great Goddess and asking "Who are you, Mahadevi?" Her reply — the Devi-pratyabhijna — is one of the most powerful first-person self-disclosures in shruti: "I am of the form of Brahman; from me proceeds prakriti-purusha; I am the void and the non-void; I am bliss and non-bliss; I am the Vedas and the non-Vedas; I am born and unborn; I am below and above and around." Embeds the Navakshari mantra of Durga and the dhyana-shloka visualising her as red-hued, three-eyed, smiling, holding noose and goad. Closes with the celebrated assurance that the daily reciter is purified of every sin and gains union with the Devi.',
    keyConcepts: ['Devi-pratyabhijna — Goddess\'s first-person Brahma-statement', 'Navakshari mantra of Durga embedded', 'Dhyana of Devi as Mahatripurasundari', 'Identity of Devi with Vac, Lakshmi, Sarasvati, Mahamaya', 'Phalashruti for daily Shakta recitation'],
    famousVerse: {
      sanskrit: 'अहं ब्रह्मस्वरूपिणी । मत्तः प्रकृतिपुरुषात्मकं जगत् । शून्यं चाशून्यं च',
      iast: 'Ahaṁ brahma-svarūpiṇī, mattaḥ prakṛti-puruṣātmakaṁ jagat, śūnyaṁ cāśūnyaṁ ca',
      translation: 'I am of the very form of Brahman. From me proceeds the world of prakriti and purusha. I am the void and the non-void.',
      reference: 'Devi Upanishad 2',
    },
    takeaway: 'When the Goddess names herself, the answer is not "consort of" — the answer is Brahman.',
  },
  {
    slug: 'garbha-upanishad', name: 'Garbha Upanishad', sanskrit: 'गर्भोपनिषद्', iast: 'Garbhopaniṣad',
    veda: 'Yajur', vedaShakha: 'Krishna Yajur Veda',
    mantraCount: 5,
    centralTheme: 'Embryology and gestation as a vehicle for non-dual teaching on the embodied Self',
    summary:
      'Five long mantras (often divided into prose paragraphs) presenting a remarkably detailed pre-modern embryology alongside Vedanta. Catalogues the human body — five elements, six tastes, seven dhatus, ten doors, three humours, 180 joints, 107 marmas, 900 sinews, four-and-a-half crore hairs — then walks month-by-month through gestation: liquefaction in the first month, hardening into a lump in the second, limb-budding in the third, bones in the fourth, skin in the fifth, mouth/nose/eyes/ears in the sixth, jiva-entry in the seventh, completion in the eighth, descent in the ninth. The seventh-month foetus, conscious in the womb, recollects past lives and resolves to seek liberation; at birth the maya of Vaishnavi obliterates the memory. The closing teaching: this body, however constructed, is not the Self.',
    keyConcepts: ['Month-by-month gestational stages (1-9)', 'Body inventory — dhatus, marmas, joints, doors', 'Seventh-month jiva-entry + past-life recall in the womb', 'Vaishnavi maya erases memory at birth', 'Pancha-bhuta and tri-dosha enumeration', 'The body as anatma'],
    famousVerse: {
      sanskrit: 'सप्तमे मासि जीवेन संयुक्तो भवति । अष्टमे मासि सर्वसंपूर्णो भवति',
      iast: 'Saptame māsi jīvena saṁyukto bhavati, aṣṭame māsi sarva-sampūrṇo bhavati',
      translation: 'In the seventh month it becomes united with the jiva; in the eighth month it becomes complete in every respect.',
      reference: 'Garbha Upanishad 3',
    },
    takeaway: 'The Self that resolved liberation in the womb is the same Self reading these words — only the maya is thicker now.',
  },
  {
    slug: 'jabala-darshana-upanishad', name: 'Jabala Darshana Upanishad', sanskrit: 'जाबालदर्शनोपनिषद्', iast: 'Jābāla-darśanopaniṣad',
    veda: 'Sama', vedaShakha: 'Sama Veda (Yoga Upanishad group)',
    mantraCount: 113,
    centralTheme: 'The Atman realised through ashtanga-yoga as taught by Dattatreya to Sankriti',
    summary:
      'A 113-mantra yoga-Upanishad in ten chapters cast as a dialogue between Lord Dattatreya and his disciple Sankriti. Lays out a full Patanjala-style ashtanga-yoga (yama, niyama, asana, pranayama, pratyahara, dharana, dhyana, samadhi) but recast in advaita-vedanta terms: each anga becomes a meditation on the Self. Distinctive contributions: the nine chakra schema (extends the standard six with talu, ajna and brahmarandhra), the seventy-two thousand nadis with sushumna-pingala-ida central, the ten pranas, and a detailed kundalini ascent. Closes by declaring that the eight angas are not eight separate disciplines but one continuous awakening of the inner light. Dattatreya-Sankriti dialogue makes this one of the foundational texts of the Avadhuta tradition.',
    keyConcepts: ['Ashtanga-yoga recast in advaita terms', 'Dattatreya-Sankriti dialogue (Avadhuta lineage source)', 'Nine chakras + 72,000 nadis schema', 'Ten pranas and their stations', 'Kundalini-jagarana via prana + bandha + mudra', 'Yama-niyama as continuous Self-meditation'],
    famousVerse: {
      sanskrit: 'यमश्च नियमश्चैव आसनं प्राणसंयमः । प्रत्याहारो धारणा च ध्यानं समाधिरेव च',
      iast: 'Yamaś ca niyamaś caiva āsanaṁ prāṇa-saṁyamaḥ, pratyāhāro dhāraṇā ca dhyānaṁ samādhir eva ca',
      translation: 'Yama, niyama, asana, breath-control, withdrawal, concentration, meditation and absorption — these are the eight limbs of yoga.',
      reference: 'Jabala Darshana 1.1',
    },
    takeaway: 'Patanjali\'s eight limbs become Vedanta when each limb is meditation on "I am That."',
  },
  {
    slug: 'tripura-upanishad', name: 'Tripura Upanishad', sanskrit: 'त्रिपुरोपनिषद्', iast: 'Tripuropaniṣad',
    veda: 'Rig', vedaShakha: 'Rig Veda (Shakta Upanishad group)',
    mantraCount: 16,
    centralTheme: 'Tripura Sundari and the Shodashi mantra — the cornerstone of the Sri Vidya tradition',
    summary:
      'A compact but exceptionally dense Shakta Upanishad of 16 mantras — one of the three foundational shruti texts of the Sri Vidya tradition (alongside the Tripuratapini and Bhavana Upanishads). Each of the 16 mantras is held to correspond to one of the 16 kalas of the moon and to one of the 16 syllables of the Shri Shodashi mantra, the most secret form of the Pancadashi addressing Tripura Sundari, the Goddess of the three cities (waking/dream/sushupti, or the three bindus of the Sri Yantra). Encodes the Sri Chakra geometry — nine interlocking triangles, the bindu at the centre as Maha Tripura Sundari — and the kamakala visualisation. Heavily commented by Bhaskararaya in his Saubhagya-bhaskara. Considered the most concentrated tantra within the orthodox Vedic canon.',
    keyConcepts: ['Sri Vidya foundational shruti', 'Shodashi mantra (16 syllables = 16 mantras = 16 kalas)', 'Sri Chakra / Sri Yantra geometry', 'Tripura = three cities = three states / three bindus', 'Kamakala visualisation', 'Bhaskararaya\'s Saubhagya-bhaskara commentary'],
    famousVerse: {
      sanskrit: 'त्रिपुरा परमेशानी जयति त्रिजगन्मयी । आदिमध्यान्तरहिता सच्चिदानन्दविग्रहा',
      iast: 'Tripurā parameśānī jayati tri-jagan-mayī, ādi-madhyānta-rahitā sac-cid-ānanda-vigrahā',
      translation: 'Victory to Tripura, the Supreme Sovereign, who is the form of the three worlds — without beginning, middle or end, whose body is being-consciousness-bliss.',
      reference: 'Tripura Upanishad 1',
    },
    takeaway: 'The three cities are the three states of your own consciousness — Tripura Sundari sits as the bindu at their centre.',
  },
  {
    slug: 'atma-upanishad', name: 'Atma Upanishad', sanskrit: 'आत्मोपनिषद्', iast: 'Ātmopaniṣad',
    veda: 'Atharva', vedaShakha: 'Atharva Veda (Sāmānya-Vedānta Upanishad group)',
    mantraCount: 3,
    centralTheme: 'The threefold Atman — bahyatman (gross body), antaratman (subtle/jiva) and paramatman (causal/supreme Self)',
    summary:
      'A miniature Upanishad of just three mantras attributed to the sage Angiras. Despite its brevity it lays out a complete Vedantic anthropology by distinguishing three meanings of the word "atman" — bahyatman (the outer self = the gross body with its skin, bones, marrow, nerves, hair, nails, hunger, sleep, fear, decay and death), antaratman (the inner self = the subtle body of intellect, manas, ahamkara and the ten organs, the experiencer of waking, dream and deep sleep, of the eight prakritis and the three gunas) and paramatman (the supreme Self = the pure consciousness adored with Om, beyond the three states, beyond the three bodies, beyond birth and death, the witness of all). Maps directly onto the later panchakosha-viveka and the karana-sukshma-sthula trilogy that became the staple of every Vedantic primer.',
    keyConcepts: ['Three Atmans: bahya (gross body), antara (subtle/jiva), parama (causal/Brahman)', 'Body inventory parallel to Garbha Upanishad', 'Antaratman = experiencer of jagrat-svapna-sushupti', 'Paramatman = pure consciousness adored by Om', 'Source-text for Vedantasara\'s sthula-sukshma-karana sharira-traya'],
    famousVerse: {
      sanskrit: 'अथ परमात्मा यथाक्षरमुपासनीयः । ओमित्येतस्याक्षरस्य पादाश्चतुर्थः शान्त आत्मा',
      iast: 'Atha paramātmā yathākṣaram upāsanīyaḥ, om ity-etasyākṣarasya pādāś caturthaḥ śānta ātmā',
      translation: 'Now the supreme Self is to be meditated upon as the imperishable — the fourth quarter of the syllable Om, the silent and peaceful Self.',
      reference: 'Atma Upanishad 3',
    },
    takeaway: 'Three things call themselves "I" — the body, the mind, and the silence behind both. Only the third is the Atman.',
  },
  {
    slug: 'amritabindu-upanishad', name: 'Amritabindu Upanishad', sanskrit: 'अमृतबिन्दूपनिषद्', iast: 'Amṛtabindūpaniṣad',
    veda: 'Krishna Yajur', vedaShakha: 'Krishna Yajur Veda (Yoga Upanishad group)',
    mantraCount: 22,
    centralTheme: 'The "drop of immortality" — the silent bindu of consciousness reached by withholding mind from objects',
    summary:
      'A short Yoga Upanishad of 22 mantras that distils the entire Vedantic-yogic project into a single image — the amrita-bindu, the imperishable drop at the centre of awareness. Famously opens with the declaration that the mind alone is the cause of bondage and liberation — "मन एव मनुष्याणां कारणं बन्धमोक्षयोः" — a sloka quoted in nearly every later Advaita and Tantric manual. Distinguishes the two minds (shuddha = pure, ashuddha = stained), prescribes pranava-japa with the four matras of Om as the ladder to nirvikalpa, and ends with the recognition that the one Atman appears as many only because of the upadhi of the bodies, as a single moon appears multiplied in many pots of water.',
    keyConcepts: ['Mind = sole cause of bondage and moksha (mana eva manushyanam karanam bandha-mokshayoh)', 'Shuddha-manas / ashuddha-manas distinction', 'Four matras of Om as graduated absorption', 'One Atman appearing as many (moon-in-pots simile)', 'Amrita-bindu = silent fourth state (turiya)'],
    famousVerse: {
      sanskrit: 'मन एव मनुष्याणां कारणं बन्धमोक्षयोः । बन्धाय विषयासक्तं मुक्त्यै निर्विषयं स्मृतम्',
      iast: 'Mana eva manuṣyāṇāṁ kāraṇaṁ bandha-mokṣayoḥ, bandhāya viṣayāsaktaṁ muktyai nirviṣayaṁ smṛtam',
      translation: 'The mind alone is the cause of bondage and liberation for human beings — attached to objects, it binds; freed from objects, it liberates.',
      reference: 'Amritabindu Upanishad 2',
    },
    takeaway: 'You are bound by the mind attached to objects; you are freed by the mind withdrawn from objects. The Self never moved.',
  },
  {
    slug: 'paramahamsa-upanishad', name: 'Paramahamsa Upanishad', sanskrit: 'परमहंसोपनिषद्', iast: 'Paramahaṁsopaniṣad',
    veda: 'Shukla Yajur', vedaShakha: 'Shukla Yajur Veda (Sannyasa Upanishad group)',
    mantraCount: 4,
    centralTheme: 'Marks of the Paramahamsa — the highest-stage renunciate who has dropped staff, kamandalu, sacred thread and even the will to renounce',
    summary:
      'A foundational Sannyasa Upanishad describing the four progressive stages of the renouncer (kutichaka → bahudaka → hamsa → paramahamsa) and the unique outward marks of the paramahamsa — no staff (danda), no water-pot (kamandalu), no shikha, no yajnopavita, no clothing prescriptions, only the recognition "aham brahmasmi." His begging-bowl is his belly, his clothing is the four directions (digambara), his meditation is the seamless flow of the Self thinking the Self. Quoted by Sri Ramakrishna and by every later Sannyasa Paddhati for the dictum that the paramahamsa has no external dharma left because he has become dharma itself.',
    keyConcepts: ['Four stages of sannyasa: kutichaka, bahudaka, hamsa, paramahamsa', 'Dropping of all external markers (danda, kamandalu, shikha, yajnopavita)', 'Digambara (clothed by the four directions)', '"aham brahmasmi" as sole meditation', 'Begging belly + Self-as-Self meditation'],
    famousVerse: {
      sanskrit: 'न दण्डं न शिखां न यज्ञोपवीतं न च कन्थां धारयेत् । शीतोष्णसुखदुःखमानावमानांश्च त्यक्त्वा',
      iast: 'Na daṇḍaṁ na śikhāṁ na yajñopavītaṁ na ca kanthāṁ dhārayet, śītoṣṇa-sukha-duḥkha-mānāvamānāṁś ca tyaktvā',
      translation: 'He should bear no staff, no tuft, no sacred thread, no patched garment — having abandoned cold and heat, pleasure and pain, honour and dishonour.',
      reference: 'Paramahamsa Upanishad 1',
    },
    takeaway: 'The highest renunciation is the renunciation even of the marks of renunciation.',
  },
  {
    slug: 'tejobindu-upanishad', name: 'Tejobindu Upanishad', sanskrit: 'तेजोबिन्दूपनिषद्', iast: 'Tejobindūpaniṣad',
    veda: 'Krishna Yajur', vedaShakha: 'Krishna Yajur Veda (Yoga Upanishad group)',
    mantraCount: 465,
    centralTheme: 'The "drop of radiance" — the longest of the Bindu Upanishads, mapping fifteen limbs of Advaita-yoga onto Patanjali\'s eight',
    summary:
      'A six-chapter Yoga Upanishad of 465 mantras, far longer than its Bindu cousins. Expands the eight limbs of Patanjali into fifteen Advaita limbs by inserting tyaga (renunciation), mauna (silence), desha (right place), kala (right time), mulabandha and dehasamya among others, and reinterprets each limb purely as a meditation on "I am Brahman." Chapter 1 is the most-quoted: the upadesha of Kumara to Shiva on the difficulty of nirvikalpa samadhi. Chapter 6 ("Atmanubhuti") is the longest Advaita poem in the entire Upanishadic corpus — almost three hundred verses of "neti, neti" culminating in "I am the Brahman alone." Beloved of Ramana Maharshi and translated by Pujyapada Swami Chinmayananda.',
    keyConcepts: ['Fifteen Advaita limbs (extends Patanjali\'s eight)', 'Each limb reinterpreted as meditation on "I am Brahman"', 'Chapter 6 Atmanubhuti — the longest Advaita poem in shruti', 'Difficulty of nirvikalpa samadhi (upadesha of Kumara to Shiva)', 'Mulabandha + mauna + tyaga as inner limbs'],
    famousVerse: {
      sanskrit: 'अहं ब्रह्मेति निश्चयः । अनात्मन्यात्मविज्ञानं नात्मा बुद्धिः शरीरकम्',
      iast: 'Ahaṁ brahmeti niścayaḥ, anātmany ātma-vijñānaṁ nātmā buddhiḥ śarīrakam',
      translation: '"I am Brahman" — this is the firm conviction. Knowing the Self in what is not-Self is bondage; the body and intellect are not the Atman.',
      reference: 'Tejobindu Upanishad 1.32',
    },
    takeaway: 'Every limb of yoga is the same limb — the recognition "I am Brahman," held under fifteen disguises.',
  },
  {
    slug: 'varaha-upanishad', name: 'Varaha Upanishad', sanskrit: 'वराहोपनिषद्', iast: 'Varāhopaniṣad',
    veda: 'Krishna Yajur', vedaShakha: 'Krishna Yajur Veda (Vaishnava Upanishad group)',
    mantraCount: 263,
    centralTheme: 'The dialogue of Lord Varaha with the sage Ribhu — the most complete Vaishnava-Advaita synthesis among the minor Upanishads',
    summary:
      'A five-chapter Vaishnava Upanishad of 263 mantras structured as the upadesha of the boar-incarnation Vishnu to the sage Ribhu. Uniquely synthesises three streams: (1) Sri Vidya-influenced Vaishnava tantric meditation (Vishnu as the bindu within the heart-lotus); (2) Patanjala yoga (the full eight limbs and the seven stages of jnana — shubhechha, vicharana, tanumanasa, sattvapatti, asamsakti, padarthabhavini, turyaga); and (3) classical Advaita ("Brahman alone is real, world is mithya, the jiva is Brahman itself"). Chapter 4 contains the famous "jivanmukta-gita" describing the marks of the liberated-while-living. Chapter 5 ends with Ribhu attaining sayujya-mukti directly in Varaha\'s presence — held by the Sri Vaishnava tradition as proof that bhakti and jnana converge at the summit.',
    keyConcepts: ['Vishnu (Varaha) as Brahman teaching Ribhu', 'Seven stages of jnana (sapta-jnana-bhumika)', 'Jivanmukta-gita (Chapter 4) — marks of the liberated-while-living', 'Sri Vidya-style heart-lotus Vishnu visualisation', 'Synthesis of Vaishnava bhakti + Patanjala yoga + Advaita jnana'],
    famousVerse: {
      sanskrit: 'जीवन्मुक्तपदं त्यक्त्वा स्वदेहे कालसात्कृते । विशत्यदेहमुक्तत्वं पवनोऽस्पन्दतामिव',
      iast: 'Jīvan-mukta-padaṁ tyaktvā sva-dehe kāla-sāt-kṛte, viśaty adeha-muktatvaṁ pavano \'spandatām iva',
      translation: 'Leaving behind even the state of liberation-while-living when his body falls in due course, he enters bodiless liberation — as the wind enters stillness.',
      reference: 'Varaha Upanishad 4.39',
    },
    takeaway: 'Bhakti to Vishnu and jnana of Brahman are the same path seen from two faces — both end in Ribhu\'s silence.',
  },
  {
    slug: 'ramatapaniya-upanishad', name: 'Rama Tapaniya Upanishad', sanskrit: 'रामतापनीयोपनिषद्', iast: 'Rāma-tāpanīyopaniṣad',
    veda: 'Atharva', vedaShakha: 'Atharva Veda (Vaishnava Upanishad group)',
    mantraCount: 95,
    centralTheme: 'The esoteric meaning of Rama — split into Purva-tapaniya (mantra-shastra of "Ram") and Uttara-tapaniya (Advaita identity of Rama with Brahman)',
    summary:
      'A two-part Vaishnava Upanishad of the Ramaite tradition, paralleling the Krishna-side Gopala Tapaniya. The Purva-tapaniya (5 chapters) explains the syllable "Ram" as the Rama-bija and unpacks the Rama Shadakshari ("Shri Rama Jaya Rama") mantra — the source-text quoted by Tulsidas in his Vinaya Patrika and by every Rama-bhakta lineage from Ramananda onward. The Uttara-tapaniya (5 chapters) is pure Advaita: Rama is none other than Brahman, Sita is none other than Maya/Prakriti, Lakshmana is the jiva, Bharata is dharma, Shatrughna is the destruction of nescience, the Ramayana itself is the soul\'s journey home. The text\'s reading of "Ram" as the union of "ra" (fire = burning of sins) and "m" (water = washing of sins) became the standard etymology in every later Rama-katha.',
    keyConcepts: ['"Ram" etymology: ra (fire/burns sins) + m (water/washes sins)', 'Rama Shadakshari mantra (Shri Rama Jaya Rama)', 'Allegorical Ramayana: Rama=Brahman, Sita=Maya, Lakshmana=jiva, Bharata=dharma', 'Source for Tulsidas + Ramananda sampradaya', 'Purva (mantra-shastra) + Uttara (Advaita) structure'],
    famousVerse: {
      sanskrit: 'रामो राजमणिः सदा विजयते रामं रमेशं भजे । रामेणाभिहता निशाचरचमू रामाय तस्मै नमः',
      iast: 'Rāmo rāja-maṇiḥ sadā vijayate rāmaṁ rameśaṁ bhaje, rāmeṇābhihatā niśācara-camū rāmāya tasmai namaḥ',
      translation: 'Rama, the jewel of kings, ever conquers; I worship Rama, the Lord of Lakshmi. By Rama the demon hosts are slain — to that Rama, salutations.',
      reference: 'Rama Tapaniya Upanishad (Rama Stuti)',
    },
    takeaway: 'The name "Ram" itself is fire-and-water — it burns what binds and washes what stains. There is no other tapasya for kali-yuga.',
  },
  {
    slug: 'nrisimha-tapaniya-upanishad', name: 'Nrisimha Tapaniya Upanishad', sanskrit: 'नृसिंहतापनीयोपनिषद्', iast: 'Nṛsiṁha-tāpanīyopaniṣad',
    veda: 'Atharva', vedaShakha: 'Atharva Veda (Vaishnava Upanishad group)',
    mantraCount: 138,
    centralTheme: 'The esoteric meaning of Narasimha — Purva-tapaniya unpacks the 32-syllable Narasimha Anushtubh mantra, Uttara-tapaniya identifies Narasimha with the non-dual Brahman',
    summary:
      'The most authoritative Upanishadic source on the Narasimha tradition, split (like the Rama and Krishna Tapaniyas) into two halves. The Purva-tapaniya (5 prashnas) gives the ritual unfolding of the Mantra-raja — the 32-syllable Anushtubh-meter Narasimha mantra "Ugram Veeram Mahaa-Vishnum Jvalantam Sarvato Mukham Nrsimham Bheeshanam Bhadram Mrityu-mrityum Namaamy aham" — which is regarded by the Sri Vaishnava and Madhva sampradayas as the supreme tantric vidya. It explains each syllable as a bija, prescribes the yantra, and gives the dhyana mantra. The Uttara-tapaniya (9 prashnas) is pure Advaita: Narasimha is Pranava (Om), the man-lion form is the union of jivatma (lion = chit) and ishvara (man = sat), and the destruction of Hiranyakashipu is the destruction of the ahamkara (ego) of the seeker. Adi Shankara wrote a famous bhashya on this Upanishad.',
    keyConcepts: ['Narasimha Mantra-raja (32-syllable Anushtubh)', 'Mantra-vidya + yantra-vidya integration', 'Narasimha as Pranava (Om)', 'Hiranyakashipu = ahamkara symbolism', 'Bhashya by Adi Shankara', 'Source authority for Sri Narasimha sampradayas'],
    famousVerse: {
      sanskrit: 'उग्रं वीरं महाविष्णुं ज्वलन्तं सर्वतोमुखम्। नृसिंहं भीषणं भद्रं मृत्युमृत्युं नमाम्यहम्॥',
      iast: 'Ugraṁ vīraṁ mahā-viṣṇuṁ jvalantaṁ sarvato-mukham, nṛsiṁhaṁ bhīṣaṇaṁ bhadraṁ mṛtyu-mṛtyuṁ namāmy aham',
      translation: 'I bow to Narasimha, the fierce, the heroic, the great Vishnu, blazing, with faces in every direction, terrible yet auspicious — the death of death itself.',
      reference: 'Nrisimha Tapaniya Upanishad — Mantra-raja (also Bhagavata 5.18.8)',
    },
    takeaway: 'The man-lion is the seeker himself: human reason united with the lion of pure consciousness tears the heart of the ego at twilight, on the threshold of all categories.',
  },
  {
    slug: 'gopala-tapaniya-upanishad', name: 'Gopala Tapaniya Upanishad', sanskrit: 'गोपालतापनीयोपनिषद्', iast: 'Gopāla-tāpanīyopaniṣad',
    veda: 'Atharva', vedaShakha: 'Atharva Veda (Vaishnava Upanishad group)',
    mantraCount: 96,
    centralTheme: 'The esoteric meaning of Krishna-Gopala — Purva-tapaniya unpacks the Krishna Ashtadasakshari (18-syllable) and Gopala Mantra-raja, Uttara-tapaniya gives the Brahma-Krishna identity',
    summary:
      'The foundational Upanishadic source for the Gaudiya, Nimbarka, Vallabha, and Pushti sampradayas. The Purva-tapaniya (4 chapters) describes the Gopala-yantra of Vrindavan, unfolds the famous 18-syllable mantra "Klim Krishnaya Govindaya Gopijana-vallabhaya Svaha", and identifies the Gopis as the supreme exemplars of bhakti (the gopis-rasa-leela is not erotic but is the eternal play of jivas with Paramatma). The Uttara-tapaniya (4 chapters) frames the conversation between Brahma and the Gopas: Krishna is Para-Brahman, Vrindavan is the eternal Goloka transposed onto earth, the flute is the call of grace, the Yamuna is the river of consciousness. This Upanishad is the primary scriptural justification cited by Chaitanya Mahaprabhu for treating Krishna (not Vishnu, not Narayana) as Svayam Bhagavan — the original source.',
    keyConcepts: ['Klim Krishnaya Govindaya Gopijana-vallabhaya Svaha (18-syllable)', 'Vrindavan as Goloka', 'Gopi-bhava as supreme bhakti', 'Krishna as Svayam Bhagavan (source of all avatars)', 'Authority for Gaudiya/Nimbarka/Pushti', 'Rasa-leela as Paramatma-jivatma play'],
    famousVerse: {
      sanskrit: 'क्लीं कृष्णाय गोविन्दाय गोपीजनवल्लभाय स्वाहा',
      iast: 'Klīṁ Kṛṣṇāya Govindāya Gopījana-vallabhāya Svāhā',
      translation: 'Klim, salutations to Krishna, to Govinda, beloved of the gopis — svaha.',
      reference: 'Gopala Tapaniya Upanishad — Ashtadasakshari Mantra',
    },
    takeaway: 'Krishna is not an avatar — he is the source of all avatars. The flute he plays is the call you have been hearing your whole life.',
  },
  {
    slug: 'shandilya-upanishad', name: 'Shandilya Upanishad', sanskrit: 'शाण्डिल्योपनिषद्', iast: 'Śāṇḍilyopaniṣad',
    veda: 'Atharva', vedaShakha: 'Atharva Veda (Yoga Upanishad group)',
    mantraCount: 108,
    centralTheme: 'A complete yoga manual structured around Patanjali\'s eight limbs but expanded into ten — including the ten yamas, ten niyamas, eight asanas, three bandhas, three mudras, and detailed nadi-shodhana pranayama',
    summary:
      'Named after Sage Shandilya (the author of the famous Shandilya Bhakti Sutras), this Upanishad is one of the most comprehensive yoga texts in the entire Upanishadic corpus — predating Hatha Yoga Pradipika by centuries yet covering nearly all the same techniques. It enumerates ten yamas (vs Patanjali\'s five): ahimsa, satya, asteya, brahmacharya, daya (compassion), arjava (sincerity), kshama (forgiveness), dhriti (steadiness), mitahara (moderate eating), shaucha (purity). It enumerates ten niyamas: tapas, santosha, astikya, dana, ishvara-pujana, siddhanta-shravana, hri (modesty), mati, japa, vrata. It describes eight asanas (svastika, gomukha, padma, vira, simha, bhadra, mukta, mayura), three bandhas (mula, uddiyana, jalandhara), three mudras, and prescribes the complete nadi-shodhana sequence with ratios 1:4:2 (puraka:kumbhaka:rechaka). The text also contains a remarkable cosmology: the body is the brahmanda, sushumna is Mount Meru, ida and pingala are the rivers Ganga and Yamuna, the chakras are the lokas.',
    keyConcepts: ['Ten yamas + ten niyamas (vs Patanjali\'s five)', 'Eight classical asanas described', 'Three bandhas + three mudras (pre-Hatha Yoga Pradipika)', 'Nadi-shodhana pranayama (1:4:2 ratio)', 'Body as brahmanda — sushumna as Meru, ida/pingala as Ganga/Yamuna', 'Brahma-jnana through ashtanga + kundalini integration'],
    famousVerse: {
      sanskrit: 'अहिंसा सत्यमस्तेयं ब्रह्मचर्यं दया तथा। आर्जवं क्षान्तिर्धृतिर्मिताहारः शौचमेव च॥',
      iast: 'Ahiṁsā satyam asteyaṁ brahmacaryaṁ dayā tathā, ārjavaṁ kṣāntir dhṛtir mitāhāraḥ śaucam eva ca',
      translation: 'Non-violence, truthfulness, non-stealing, celibacy, compassion, sincerity, forgiveness, steadiness, moderate eating, and purity — these are the ten yamas.',
      reference: 'Shandilya Upanishad 1.1.1',
    },
    takeaway: 'Yoga begins not with posture but with ten yamas — and only ten. Until those ten are alive in the body, the asana is a stretch and the pranayama is a breath exercise.',
  },
  {
    slug: 'nada-bindu-upanishad', name: 'Nada Bindu Upanishad', sanskrit: 'नादबिन्दूपनिषद्', iast: 'Nāda-bindūpaniṣad',
    veda: 'Rig', vedaShakha: 'Rig Veda (Yoga Upanishad group)',
    mantraCount: 56,
    centralTheme: 'The yoga of inner sound — meditation on the unstruck cosmic vibration (nada) heard within, leading from gross sound through subtle to the soundless Brahman',
    summary:
      'A specialised yoga Upanishad devoted entirely to nada-anusandhana (the inquiry into inner sound) — the technique of closing the external ears and listening to the spontaneous unstruck sound (anahata nada) within. The text describes ten progressively subtler stages of inner sound: chini (like the sound of "chin"), chini-chini (more refined), bell (ghanta), conch (shankha), tantri (lute), tala (cymbals), venu (flute), bheri (drum), mridanga, and finally the soundless meghadhwani (cloud-thunder dissolving into silence). Each stage corresponds to a deeper layer of the mind: the lute-stage steadies the prana, the flute-stage absorbs the chitta, the thunder-stage dissolves the manas itself. The Upanishad opens with a remarkable Vedic cosmology — the Pranava (Om) is the swan whose feet are the four states (waking-dream-sleep-turiya), whose body is the three matras (a-u-m), and whose flight is the upward journey of consciousness from the muladhara to the sahasrara. This Upanishad is the primary scriptural source for the Nada Yoga of the Hatha Yoga Pradipika (Chapter 4) and for the entire Sant tradition (Kabir, Nanak, Dadu — all reference inner sound as the surest path to liberation).',
    keyConcepts: ['Anahata nada (unstruck inner sound)', 'Ten progressive sound stages (chini → meghadhwani)', 'Pranava swan cosmology (4 states + 3 matras + sahasrara flight)', 'Source for Hatha Yoga Pradipika Chapter 4', 'Foundation of Sant tradition shabad/surat-shabd yoga', 'Sound as the most direct samadhi technique'],
    famousVerse: {
      sanskrit: 'अन्तःस्थं मनसा पश्येद्ब्रह्माणं निष्कलं ध्रुवम्। नादे लीनं मनो यस्य स याति परमां गतिम्॥',
      iast: 'Antaḥsthaṁ manasā paśyed brahmāṇaṁ niṣkalaṁ dhruvam, nāde līnaṁ mano yasya sa yāti paramāṁ gatim',
      translation: 'One should see within, by the mind, the partless and changeless Brahman. He whose mind is absorbed in the inner sound — he attains the supreme goal.',
      reference: 'Nada Bindu Upanishad — Mantra 51',
    },
    takeaway: 'Close the ears and listen. The bell, the conch, the flute, the thunder — and then silence. The shortest road home is the unstruck sound.',
  },
  {
    slug: 'brahma-upanishad', name: 'Brahma Upanishad', sanskrit: 'ब्रह्मोपनिषद्', iast: 'Brahmopaniṣad',
    veda: 'Krishna Yajur', vedaShakha: 'Krishna Yajur Veda (Sannyasa Upanishad group)',
    mantraCount: 41,
    centralTheme: 'The four states of consciousness located in four bodily centres — and the renunciate\'s vow of the sacred thread of pure knowledge (brahma-sutra)',
    summary:
      'A core Sannyasa Upanishad teaching that the four states of consciousness (jagrat, svapna, sushupti, turiya) are not merely temporal sequences but are spatially located in four centres of the body: jagrat-purusha resides in the eye, svapna-purusha in the throat, sushupti-purusha in the heart, and turiya-purusha in the crown (murdha). This four-fold scheme became the foundational anatomy of every later Vedanta meditation manual. The text also redefines the sacred thread (yajnopavita): for the householder it is the visible cotton thread, but for the sannyasi it becomes the antar-yajnopavita — the inner thread of self-knowledge that he wears even after relinquishing the external thread at the time of taking sannyasa. The Upanishad gives the famous Pippalada-Shaunaka dialogue: when Shaunaka asks "what is this Brahman that is the foundation of all?" Pippalada answers in two words — Tat tvam asi — and then unfolds the implications across the remaining 40 mantras. Vidyaranya, the founder of the Vijayanagara Empire and codifier of the Smarta order, draws extensively on this Upanishad in his Panchadashi.',
    keyConcepts: ['Four states in four bodily centres (eye → throat → heart → crown)', 'Inner sacred thread (antar-yajnopavita) for sannyasis', 'Tat tvam asi as the foundational answer', 'Pippalada-Shaunaka dialogue', 'Source for Vidyaranya\'s Panchadashi', 'Anatomy of the four purushas (jagrat → turiya)'],
    famousVerse: {
      sanskrit: 'चत्वारः पुरुषाश्चत्वारो वेदाश्चत्वार आश्रमाः। चतुर्धा भिद्यते देहश्चत्वारः पुरुषाः स्मृताः॥',
      iast: 'Catvāraḥ puruṣāś catvāro vedāś catvāra āśramāḥ, caturdhā bhidyate dehaś catvāraḥ puruṣāḥ smṛtāḥ',
      translation: 'Four are the purushas (states of consciousness), four the Vedas, four the ashramas; the body is divided in four — the four purushas are remembered.',
      reference: 'Brahma Upanishad — Mantra 5',
    },
    takeaway: 'Every body is a four-storeyed temple. Walk up from the eye to the crown — the four states are not in time, they are in space.',
  },
];

export function upanishadSlugs(): string[] {
  return UPANISHADS.map((u) => u.slug);
}

export function getUpanishad(slug: string): UpanishadInfo | undefined {
  return UPANISHADS.find((u) => u.slug === slug);
}
