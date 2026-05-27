// Per-deity mantra collections — drives /deity/[slug]/mantras sub-page.
// Targets "shiva mantras", "ganesh mantras", "lakshmi beej mantra".

export interface MantraEntry {
  sanskrit: string;
  transliteration: string;
  meaning: string;
  benefit: string;
  type: 'beej' | 'gayatri' | 'moola' | 'panchakshari' | 'ashtakshari' | 'invocation' | 'sahasranama' | 'praise';
  recommendedRepetitions: number;
}

export const DEITY_MANTRAS: Record<string, MantraEntry[]> = {
  shiva: [
    {
      sanskrit: 'ॐ नमः शिवाय',
      transliteration: 'Om Namah Shivaya',
      meaning: 'I bow to Shiva, the auspicious one.',
      benefit: 'Panchakshari mantra — the five-syllable mantra grants peace, removes negativity, leads to moksha. Most fundamental Shiva mantra.',
      type: 'panchakshari',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्।\nउर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्॥',
      transliteration: 'Om Tryambakam Yajamahe Sugandhim Pushti-vardhanam | Urvarukamiva Bandhanan Mrityormukshiya Maamritat',
      meaning: 'We worship the three-eyed Lord Shiva who is fragrant and nourishes well. Liberate me from death, like a cucumber from the vine, but not from immortality.',
      benefit: 'Maha Mrityunjaya Mantra — heals serious illness, protects from accidents, grants longevity. From Rig Veda 7.59.12.',
      type: 'invocation',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ ह्रौं जूं सः',
      transliteration: 'Om Hroum Joom Sah',
      meaning: 'Beej-mantra invocation of Mrityunjaya Shiva.',
      benefit: 'Mrityunjaya Beej Mantra — quick beej form for healing and protection.',
      type: 'beej',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ तत्पुरुषाय विद्महे महादेवाय धीमहि। तन्नो रुद्रः प्रचोदयात्॥',
      transliteration: 'Om Tatpurushaaya Vidmahe Mahaadevaaya Dhimahi | Tanno Rudrah Prachodayaat',
      meaning: 'May we know that Supreme Person; may we meditate upon Mahadeva. May Rudra inspire us.',
      benefit: 'Rudra Gayatri Mantra — invokes Shiva\'s wisdom and dispels darkness from the intellect.',
      type: 'gayatri',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ ह्रीं नमः शिवाय ह्रीं ॐ',
      transliteration: 'Om Hreem Namah Shivaya Hreem Om',
      meaning: 'Beej-enhanced salutation to Shiva.',
      benefit: 'Tantric form combining Hreem beej with Panchakshari — used in Sri Vidya tradition for spiritual awakening.',
      type: 'moola',
      recommendedRepetitions: 108,
    },
  ],
  vishnu: [
    {
      sanskrit: 'ॐ नमो भगवते वासुदेवाय',
      transliteration: 'Om Namo Bhagavate Vasudevaya',
      meaning: 'I bow to the divine Vasudeva (Krishna/Vishnu).',
      benefit: 'Dvadashakshari (twelve-syllable) mantra — grants liberation, protects from sin, foundational Vaishnava mantra.',
      type: 'ashtakshari',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ नारायणाय नमः',
      transliteration: 'Om Narayanaya Namah',
      meaning: 'I bow to Narayana (the resting place of all beings).',
      benefit: 'Ashtakshari (eight-syllable) Narayana mantra — grants peace and spiritual elevation.',
      type: 'ashtakshari',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ श्रीं ह्रीं क्लीं ग्लौं देवकीसुत गोविन्द वासुदेव जगत्पते। देहि मे तनयं कृष्ण त्वामहं शरणं गतः॥',
      transliteration: 'Om Shreem Hreem Kleem Glaum Devakisuta Govinda Vasudeva Jagatpate | Dehi Me Tanayam Krishna Tvaamaham Sharanam Gatah',
      meaning: 'Beej-enhanced invocation to Krishna for protection and progeny.',
      benefit: 'Santan Gopala Mantra — recited by couples seeking children.',
      type: 'beej',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ नारायणाय विद्महे वासुदेवाय धीमहि। तन्नो विष्णुः प्रचोदयात्॥',
      transliteration: 'Om Narayanaya Vidmahe Vasudevaya Dhimahi | Tanno Vishnuh Prachodayaat',
      meaning: 'May we know Narayana; may we meditate on Vasudeva. May Vishnu inspire us.',
      benefit: 'Vishnu Gayatri Mantra — for dharma and right action.',
      type: 'gayatri',
      recommendedRepetitions: 108,
    },
  ],
  ganesha: [
    {
      sanskrit: 'ॐ गं गणपतये नमः',
      transliteration: 'Om Gam Ganapataye Namah',
      meaning: 'I bow to Lord Ganapati. (Gam is his beej.)',
      benefit: 'Ganesha moola mantra — removes obstacles, recited first before any new venture, ritual, or important task.',
      type: 'moola',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ। निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥',
      transliteration: 'Vakratunda Mahakaya Suryakoti Samaprabha | Nirvighnam Kuru Me Deva Sarva-karyeshu Sarvada',
      meaning: 'O curved-trunked, vast-bodied Lord, brilliant as a million suns — remove all obstacles from my works always.',
      benefit: 'Vakratunda mantra — universal obstacle-removal shloka, recited before starting new work.',
      type: 'invocation',
      recommendedRepetitions: 21,
    },
    {
      sanskrit: 'ॐ श्रीं ह्रीं क्लीं ग्लौं गं गणपतये वर वरद सर्वजनं मे वशमानय स्वाहा',
      transliteration: 'Om Shreem Hreem Kleem Glaum Gam Ganapataye Vara Varada Sarvajanam Me Vashamaanaya Svaha',
      meaning: 'Tantric Ganesha mantra invoking attraction and success.',
      benefit: 'Ganesha attraction mantra — for business success and influence over others (used positively).',
      type: 'beej',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ एकदन्ताय विद्महे वक्रतुण्डाय धीमहि। तन्नो दन्तिः प्रचोदयात्॥',
      transliteration: 'Om Ekadantaaya Vidmahe Vakratundaaya Dhimahi | Tanno Dantih Prachodayaat',
      meaning: 'May we know the single-tusked one; may we meditate on the curved-trunk one. May the tusked one inspire us.',
      benefit: 'Ganesha Gayatri — for intellectual clarity and removal of mental obstacles.',
      type: 'gayatri',
      recommendedRepetitions: 108,
    },
  ],
  devi: [
    {
      sanskrit: 'ॐ दुं दुर्गायै नमः',
      transliteration: 'Om Dum Durgayai Namah',
      meaning: 'I bow to Durga. (Dum is her beej.)',
      benefit: 'Durga moola mantra — protection from negative forces and enemies.',
      type: 'moola',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे',
      transliteration: 'Om Aim Hreem Kleem Chamundaayai Vicche',
      meaning: 'Salutations to Chamunda, the fierce form of Durga.',
      benefit: 'Navarna Mantra — central mantra of Durga Saptashati. Recited during Navaratri for victory over inner and outer enemies.',
      type: 'beej',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'या देवी सर्वभूतेषु शक्तिरूपेण संस्थिता। नमस्तस्यै नमस्तस्यै नमस्तस्यै नमो नमः॥',
      transliteration: 'Ya Devi Sarvabhuteshu Shakti-roopena Sansthitaa | Namastasyai Namastasyai Namastasyai Namo Namah',
      meaning: 'To that Devi who abides in all beings as Shakti — salutations, salutations, salutations again and again.',
      benefit: 'From Durga Saptashati — sung in praise of Devi\'s omnipresence. Recited daily for protection.',
      type: 'praise',
      recommendedRepetitions: 11,
    },
    {
      sanskrit: 'ॐ कात्यायनी महामाये महायोगिन्यधीश्वरी। नन्दगोपसुतं देवि पतिं मे कुरु ते नमः॥',
      transliteration: 'Om Kaatyaayani Mahaamaaye Mahaayogini Adheeshvari | Nandagopa-sutam Devi Patim Me Kuru Te Namah',
      meaning: 'O Katyayani, great illusion, mistress of yogis — grant me a husband like the son of Nanda. Salutations.',
      benefit: 'Katyayani Mantra — recited by unmarried women seeking a suitable life partner.',
      type: 'invocation',
      recommendedRepetitions: 108,
    },
  ],
  hanuman: [
    {
      sanskrit: 'ॐ हं हनुमते नमः',
      transliteration: 'Om Hum Hanumate Namah',
      meaning: 'I bow to Hanuman.',
      benefit: 'Hanuman beej mantra — strength, courage, removal of fear.',
      type: 'beej',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'मनोजवं मारुततुल्यवेगं जितेन्द्रियं बुद्धिमतां वरिष्ठम्। वातात्मजं वानरयूथमुख्यं श्रीरामदूतं शरणं प्रपद्ये॥',
      transliteration: 'Manojavam Maaruta-tulya-vegam Jitendriyam Buddhimataam Varishtham | Vaataatmajam Vaanara-yootha-mukhyam Shri-Raamadootam Sharanam Prapadye',
      meaning: 'Swift as mind, equal in speed to the wind, master of senses, foremost among the wise, son of the wind, leader of the monkey army, messenger of Sri Rama — I take refuge in him.',
      benefit: 'Hanuman dhyana shloka — recited at start of Hanuman Chalisa for protection.',
      type: 'invocation',
      recommendedRepetitions: 11,
    },
    {
      sanskrit: 'ॐ हनुमते रुद्रात्मकाय हुं फट्',
      transliteration: 'Om Hanumate Rudraatmakaaya Hum Phat',
      meaning: 'To Hanuman, whose essence is Rudra-Shiva — Hum Phat.',
      benefit: 'Rudra-Hanuman tantric mantra — for warding off black magic and severe negative influences.',
      type: 'beej',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ आञ्जनेयाय विद्महे वायुपुत्राय धीमहि। तन्नो हनुमत् प्रचोदयात्॥',
      transliteration: 'Om Aanjaneyaaya Vidmahe Vaayuputraaya Dhimahi | Tanno Hanumat Prachodayaat',
      meaning: 'May we know the son of Anjani; may we meditate on the son of the Wind. May Hanuman inspire us.',
      benefit: 'Hanuman Gayatri Mantra — for strength of body, mind, and devotion.',
      type: 'gayatri',
      recommendedRepetitions: 108,
    },
  ],
  krishna: [
    {
      sanskrit: 'हरे कृष्ण हरे कृष्ण, कृष्ण कृष्ण हरे हरे। हरे राम हरे राम, राम राम हरे हरे॥',
      transliteration: 'Hare Krishna Hare Krishna, Krishna Krishna Hare Hare | Hare Rama Hare Rama, Rama Rama Hare Hare',
      meaning: 'O energy of the Lord (Hare), O Krishna, O Rama — please engage me in your service.',
      benefit: 'Maha Mantra — recommended in Kali Yuga for direct God-realization. Central to Gaudiya Vaishnava tradition.',
      type: 'invocation',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ क्लीं कृष्णाय गोविन्दाय गोपीजनवल्लभाय स्वाहा',
      transliteration: 'Om Kleem Krishnaaya Govindaaya Gopijana-vallabhaaya Svaha',
      meaning: 'Salutations to Krishna, Govinda, beloved of the gopis. (Kleem is Krishna\'s beej.)',
      benefit: 'Krishna 18-syllable mantra — said to grant the closest divine love (madhura bhava).',
      type: 'beej',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ दामोदराय विद्महे वासुदेवाय धीमहि। तन्नो कृष्णः प्रचोदयात्॥',
      transliteration: 'Om Daamodaraaya Vidmahe Vaasudevaaya Dhimahi | Tanno Krishnah Prachodayaat',
      meaning: 'May we know Damodara; may we meditate on Vasudeva. May Krishna inspire us.',
      benefit: 'Krishna Gayatri Mantra — for devotion and divine love.',
      type: 'gayatri',
      recommendedRepetitions: 108,
    },
  ],
  rama: [
    {
      sanskrit: 'ॐ श्री रामाय नमः',
      transliteration: 'Om Shri Ramaaya Namah',
      meaning: 'I bow to Sri Rama.',
      benefit: 'Rama moola mantra — peace, righteousness, family harmony.',
      type: 'moola',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'श्री राम जय राम जय जय राम',
      transliteration: 'Shri Ram Jai Ram Jai Jai Ram',
      meaning: 'Glory to Sri Rama, victory to Rama, victory victory to Rama.',
      benefit: 'Rama Taraka Mantra — the redeeming mantra. Said by Tulsidas to liberate from the ocean of worldly existence.',
      type: 'invocation',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ दशरथाय विद्महे सीतावल्लभाय धीमहि। तन्नो रामः प्रचोदयात्॥',
      transliteration: 'Om Daasharathaaya Vidmahe Seetaavallabhaaya Dhimahi | Tanno Raamah Prachodayaat',
      meaning: 'May we know the son of Dasharatha; may we meditate on the beloved of Sita. May Rama inspire us.',
      benefit: 'Rama Gayatri Mantra — for dharma and noble character.',
      type: 'gayatri',
      recommendedRepetitions: 108,
    },
  ],
  lakshmi: [
    {
      sanskrit: 'ॐ श्रीं महालक्ष्म्यै नमः',
      transliteration: 'Om Shreem Mahaalakshmyai Namah',
      meaning: 'I bow to the great Lakshmi.',
      benefit: 'Mahalakshmi moola mantra — wealth, prosperity, abundance. Recited on Fridays and during Diwali.',
      type: 'moola',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ श्रीं ह्रीं श्रीं कमले कमलालये प्रसीद प्रसीद, श्रीं ह्रीं श्रीं ॐ महालक्ष्म्यै नमः',
      transliteration: 'Om Shreem Hreem Shreem Kamale Kamalaalaye Praseeda Praseeda, Shreem Hreem Shreem Om Mahaalakshmyai Namah',
      meaning: 'O Kamala, dweller in the lotus, be pleased, be pleased. Salutations to the great Lakshmi.',
      benefit: 'Sri Mahalakshmi mantra — full beej-enhanced form. Used in Lakshmi Sadhana for sustained wealth.',
      type: 'beej',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'ॐ महादेव्यै च विद्महे विष्णुपत्न्यै च धीमहि। तन्नो लक्ष्मीः प्रचोदयात्॥',
      transliteration: 'Om Mahaadevyai Cha Vidmahe Vishnu-patnyai Cha Dhimahi | Tanno Lakshmih Prachodayaat',
      meaning: 'May we know the great goddess; may we meditate on the wife of Vishnu. May Lakshmi inspire us.',
      benefit: 'Lakshmi Gayatri Mantra — for sustained prosperity and Lakshmi\'s grace in the home.',
      type: 'gayatri',
      recommendedRepetitions: 108,
    },
  ],
  saraswati: [
    {
      sanskrit: 'ॐ ऐं सरस्वत्यै नमः',
      transliteration: 'Om Aim Saraswatyai Namah',
      meaning: 'I bow to Saraswati. (Aim is her beej.)',
      benefit: 'Saraswati moola mantra — knowledge, learning, memory, eloquence.',
      type: 'moola',
      recommendedRepetitions: 108,
    },
    {
      sanskrit: 'या कुन्देन्दुतुषारहारधवला या शुभ्रवस्त्रावृता। या वीणावरदण्डमण्डितकरा या श्वेतपद्मासना॥',
      transliteration: 'Yaa Kundendu-tushaara-haara-dhavalaa Yaa Shubhra-vastraavritaa | Yaa Veenaa-vara-danda-manditakaraa Yaa Shveta-padmaasanaa',
      meaning: 'She who is white as jasmine, the moon, snow, or pearls; clad in pure white garments; whose hand is adorned with the veena; who sits on a white lotus.',
      benefit: 'Saraswati Dhyana Shloka — recited by students before study; invokes the goddess\'s presence for clarity of mind.',
      type: 'praise',
      recommendedRepetitions: 11,
    },
    {
      sanskrit: 'ॐ वाग्देव्यै च विद्महे कामराजाय धीमहि। तन्नो देवी प्रचोदयात्॥',
      transliteration: 'Om Vaagdevyai Cha Vidmahe Kaamaraajaaya Dhimahi | Tanno Devi Prachodayaat',
      meaning: 'May we know the goddess of speech; may we meditate on the king of desire. May the goddess inspire us.',
      benefit: 'Saraswati Gayatri Mantra — for eloquence and inspiration in creative work.',
      type: 'gayatri',
      recommendedRepetitions: 108,
    },
  ],
};

export function getMantrasForDeity(slug: string): MantraEntry[] {
  return DEITY_MANTRAS[slug] || [];
}

export function deitiesWithMantras(): string[] {
  return Object.keys(DEITY_MANTRAS);
}
