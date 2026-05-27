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
];

export function upanishadSlugs(): string[] {
  return UPANISHADS.map((u) => u.slug);
}

export function getUpanishad(slug: string): UpanishadInfo | undefined {
  return UPANISHADS.find((u) => u.slug === slug);
}
