// Devotional aarti dictionary — drives /aarti/[slug] programmatic SEO.
// Targets long-tail "shiv aarti lyrics", "om jai jagdish lyrics", "ganesh aarti".
// All texts are well-known public-domain devotional compositions.

export interface AartiInfo {
  slug: string;
  name: string;
  sanskrit: string;
  deity: string;
  deitySlug?: string;
  whenSung: string;
  description: string;
  lyricsHindi: string[]; // verses in Devanagari
  lyricsTransliteration: string[]; // matched verses in Roman
  meaning: string;
  durationMinutes: number;
  relatedPujas: string[];
}

export const AARTIS: AartiInfo[] = [
  {
    slug: 'om-jai-jagdish-hare',
    name: 'Om Jai Jagdish Hare',
    sanskrit: 'ॐ जय जगदीश हरे',
    deity: 'Lord Vishnu',
    deitySlug: 'vishnu',
    whenSung: 'At end of every Hindu puja, daily morning and evening',
    description:
      'The universal aarti sung at the conclusion of nearly every Hindu puja across India. Composed by Pandit Shardha Ram Phillauri in the 1870s. Praises Lord Vishnu as the lord of the universe who removes the suffering of his devotees.',
    lyricsHindi: [
      'ॐ जय जगदीश हरे, स्वामी जय जगदीश हरे।',
      'भक्त जनों के संकट, क्षण में दूर करे॥',
      'जो ध्यावे फल पावे, दुख बिनसे मन का।',
      'सुख-संपत्ति घर आवे, कष्ट मिटे तन का॥',
      'मात-पिता तुम मेरे, शरण गहूं किसकी।',
      'तुम बिन और न दूजा, आस करूं जिसकी॥',
      'तुम पूरण परमात्मा, तुम अन्तर्यामी।',
      'पारब्रह्म परमेश्वर, तुम सबके स्वामी॥',
    ],
    lyricsTransliteration: [
      'Om Jai Jagdish Hare, Swami Jai Jagdish Hare',
      'Bhakta janon ke sankat, kshan mein door kare',
      'Jo dhyaave phal paave, dukh binase man ka',
      'Sukh-sampatti ghar aave, kashta mite tan ka',
      'Maat-pita tum mere, sharan gahoon kiski',
      'Tum bin aur na dooja, aas karoon jiski',
      'Tum poorna paramatma, tum antaryami',
      'Parabrahm parameshwar, tum sabke swami',
    ],
    meaning:
      'O Lord of the Universe, Master of all, victory be to you. You remove the troubles of your devotees in an instant. Those who meditate on you find their wishes fulfilled and sorrows of mind dispelled. You are mother, father, and the only refuge.',
    durationMinutes: 5,
    relatedPujas: ['satyanarayan-puja', 'navgraha-puja'],
  },
  {
    slug: 'shiv-aarti',
    name: 'Shiv Aarti (Om Jai Shiv Omkara)',
    sanskrit: 'ॐ जय शिव ओंकारा',
    deity: 'Lord Shiva',
    deitySlug: 'shiva',
    whenSung: 'Monday evenings, Maha Shivratri, after Rudrabhishek',
    description:
      'The most widely sung aarti to Lord Shiva. Praises the three forms of the Trimurti (Brahma, Vishnu, Shiva) united in Shiva as Omkara — the cosmic sound. Sung at all Shiva temples and during Sawan month.',
    lyricsHindi: [
      'ॐ जय शिव ओंकारा, स्वामी जय शिव ओंकारा।',
      'ब्रह्मा, विष्णु, सदाशिव, अर्द्धांगी धारा॥',
      'एकानन चतुरानन पंचानन राजे।',
      'हंसासन गरुड़ासन वृषवाहन साजे॥',
      'दो भुज चार चतुर्भुज दशभुज ते सोहे।',
      'तीनों रूप निरखता त्रिभुवन जन मोहे॥',
      'अक्षमाला वनमाला रुण्डमाला धारी।',
      'चन्दन मृगमद सोहै, भाले शशिधारी॥',
    ],
    lyricsTransliteration: [
      'Om Jai Shiv Omkara, Swami Jai Shiv Omkara',
      'Brahma, Vishnu, Sadashiva, ardhangi dhara',
      'Ekanan chaturanan panchanan raaje',
      'Hansaasan garudaasan vrishavaahan saaje',
      'Do bhuj chaar chaturbhuj dashbhuj te sohe',
      'Teenon roop nirakhata tribhuvan jan mohe',
      'Akshamala vanmala rundmala dhari',
      'Chandan mrigamada sohe, bhale shashidhari',
    ],
    meaning:
      'Victory to Lord Shiva, the primordial Omkara — the unity of Brahma the creator, Vishnu the preserver, and Shiva the destroyer. He appears with one, four, or five faces — riding the swan, eagle, or bull. His three forms enchant all three worlds.',
    durationMinutes: 6,
    relatedPujas: ['rudrabhishek', 'maha-mrityunjaya'],
  },
  {
    slug: 'ganesh-aarti',
    name: 'Ganesh Aarti (Jai Ganesh Deva)',
    sanskrit: 'जय गणेश जय गणेश देवा',
    deity: 'Lord Ganesha',
    deitySlug: 'ganesha',
    whenSung: 'Before every Hindu ritual, Ganesh Chaturthi, Wednesdays',
    description:
      'Sung at the start of any auspicious occasion to invoke the blessings of Lord Ganesha, the remover of obstacles. Composed by Pandit Shardha Ram Phillauri. Universally known across India.',
    lyricsHindi: [
      'जय गणेश, जय गणेश, जय गणेश देवा।',
      'माता जाकी पार्वती, पिता महादेवा॥',
      'एकदन्त दयावन्त, चार भुजा धारी।',
      'माथे सिंदूर सोहे, मूसे की सवारी॥',
      'अंधन को आँख देत, कोढ़िन को काया।',
      'बांझन को पुत्र देत, निर्धन को माया॥',
      'सूर श्याम शरण आए, सफल कीजे सेवा।',
      'माता जाकी पार्वती, पिता महादेवा॥',
    ],
    lyricsTransliteration: [
      'Jai Ganesh, Jai Ganesh, Jai Ganesh Deva',
      'Maata jaaki Parvati, pita Mahadeva',
      'Ekadant dayavant, chaar bhuja dhari',
      'Maathe sindoor sohe, moose ki sawari',
      'Andhan ko aankh det, kodhin ko kaaya',
      'Banjhan ko putra det, nirdhan ko maaya',
      'Soor Shyam sharan aaye, saphal keeje seva',
      'Maata jaaki Parvati, pita Mahadeva',
    ],
    meaning:
      'Victory to Lord Ganesha, son of Parvati and Mahadeva. The single-tusked compassionate one with four arms, vermilion on his forehead, riding his mouse. Grants sight to the blind, healing to the leprous, sons to the childless, wealth to the poor.',
    durationMinutes: 4,
    relatedPujas: ['ganesh-puja'],
  },
  {
    slug: 'lakshmi-aarti',
    name: 'Lakshmi Aarti (Om Jai Lakshmi Mata)',
    sanskrit: 'ॐ जय लक्ष्मी माता',
    deity: 'Maa Lakshmi',
    deitySlug: 'lakshmi',
    whenSung: 'Diwali, Fridays, Lakshmi Puja, Varalakshmi Vratam',
    description:
      'Sung during Diwali Lakshmi Puja and every Friday. Invokes Maa Lakshmi — goddess of wealth, prosperity, and good fortune. Composed in the same Aarti style as Om Jai Jagdish.',
    lyricsHindi: [
      'ॐ जय लक्ष्मी माता, मैया जय लक्ष्मी माता।',
      'तुमको निसदिन ध्यावत, हरि विष्णु विधाता॥',
      'उमा, रमा, ब्रह्माणी, तुम ही जग माता।',
      'सूर्य चन्द्रमा ध्यावत, नारद ऋषि गाता॥',
      'दुर्गा रूप निरंजनी, सुख सम्पत्ति दाता।',
      'जो कोई तुमको ध्यावत, ऋद्धि-सिद्धि धन पाता॥',
      'तुम पाताल निवासिनी, तुम ही शुभदाता।',
      'कर्म प्रभाव प्रकाशिनी, भवनिधि की त्राता॥',
    ],
    lyricsTransliteration: [
      'Om Jai Lakshmi Mata, Maiyya Jai Lakshmi Mata',
      'Tumko nisdin dhyavat, Hari Vishnu vidhaata',
      'Uma, Rama, Brahmaani, tum hi jag maata',
      'Soorya Chandrama dhyavat, Naarad rishi gaata',
      'Durga roop niranjani, sukh sampatti daata',
      'Jo koi tumko dhyavat, riddhi-siddhi dhan paata',
      'Tum paataal nivaasini, tum hi shubhdaata',
      'Karma prabhaav prakaashini, bhavnidhi ki traata',
    ],
    meaning:
      'Victory to Mother Lakshmi, contemplated day and night by Lord Vishnu himself. You are Uma, Rama, Brahmani — mother of the worlds. Goddess of wealth and prosperity, you grant siddhis and treasures to your devotees. You illuminate the law of karma and rescue souls from worldly ocean.',
    durationMinutes: 5,
    relatedPujas: ['lakshmi-puja', 'diwali-puja'],
  },
  {
    slug: 'durga-aarti',
    name: 'Durga Aarti (Jai Ambe Gauri)',
    sanskrit: 'जय अम्बे गौरी',
    deity: 'Maa Durga',
    deitySlug: 'devi',
    whenSung: 'Navaratri, Durga Puja, Tuesdays and Fridays',
    description:
      'The principal aarti of Maa Durga sung during Navaratri across India. Praises the nine forms of the goddess. Sung after Durga Saptashati path and at all Devi temples.',
    lyricsHindi: [
      'जय अम्बे गौरी, मैया जय श्यामा गौरी।',
      'तुमको निसदिन ध्यावत, हरि ब्रह्मा शिवरी॥',
      'मांग सिन्दूर विराजत, टीको मृगमद को।',
      'उज्ज्वल से दोउ नैना, चन्द्रवदन नीको॥',
      'कनक समान कलेवर, रक्ताम्बर राजै।',
      'रक्तपुष्प गल माला, कण्ठन पर साजै॥',
      'केहरि वाहन राजत, खड्ग खप्पर धारी।',
      'सुर-नर-मुनि-जन सेवत, तिनके दुख हारी॥',
    ],
    lyricsTransliteration: [
      'Jai Ambe Gauri, Maiyya Jai Shyama Gauri',
      'Tumko nisdin dhyavat, Hari Brahma Shivari',
      'Maang sindoor viraajat, teeko mrigamad ko',
      'Ujjwal se dou naina, chandravadan neeko',
      'Kanak samaan kalevar, raktambar raajai',
      'Raktapushpa gala mala, kanthan par saajai',
      'Kehari vaahan raajat, khadga khappar dhari',
      'Sur-nar-muni-jan sevat, tinke dukh haari',
    ],
    meaning:
      'Victory to Mother Amba, the fair goddess, dark goddess. Meditated upon by Vishnu, Brahma, and Shiva. With vermilion on her forehead, bright eyes, moon-like face, golden form draped in red. Riding the lion, wielding sword and skull-bowl, she destroys the sorrows of gods, sages, and humans alike.',
    durationMinutes: 6,
    relatedPujas: ['durga-puja', 'navaratri-puja'],
  },
  {
    slug: 'hanuman-aarti',
    name: 'Hanuman Aarti (Aarti Kije Hanuman Lala Ki)',
    sanskrit: 'आरती कीजै हनुमान लला की',
    deity: 'Lord Hanuman',
    deitySlug: 'hanuman',
    whenSung: 'Tuesdays, Saturdays, Hanuman Jayanti, after Hanuman Chalisa',
    description:
      'Sung after recitation of Hanuman Chalisa, especially on Tuesdays and Saturdays. Praises the mighty devotee of Lord Rama — destroyer of demons, granter of strength and courage.',
    lyricsHindi: [
      'आरती कीजै हनुमान लला की। दुष्ट दलन रघुनाथ कला की॥',
      'जाके बल से गिरिवर कांपे। रोग दोष जाके निकट न झांपे॥',
      'अंजनि पुत्र महा बलदाई। सन्तन के प्रभु सदा सहाई॥',
      'दे बीरा रघुनाथ पठाए। लंका जारि सिया सुधि लाए॥',
      'लंका सो कोट समुद्र-सी खाई। जात पवनसुत बार न लाई॥',
      'लंका जारि असुर संहारे। सियारामजी के काज सँवारे॥',
    ],
    lyricsTransliteration: [
      'Aarti keeje Hanuman lala ki, Dushta dalan Raghunath kala ki',
      'Jaake bal se girivar kaampe, Rog dosh jaake nikat na jhampe',
      'Anjani putra maha baldai, Santan ke prabhu sada sahai',
      'De beera Raghunath pathaye, Lanka jaari Siya sudhi laaye',
      'Lanka so kot samudra-si khaai, Jaat Pawansuta baar na laai',
      'Lanka jaari asura sanhaare, Siyaramji ke kaaj sanwaare',
    ],
    meaning:
      'Let us perform aarti to dear Hanuman, the destroyer of evil and ray of Lord Rama. Mountains tremble at his strength; disease and faults dare not approach him. Son of Anjani, mighty as a thunderbolt, ever-protector of saints. He burned Lanka and brought news of Sita.',
    durationMinutes: 5,
    relatedPujas: ['sundarkand-path', 'hanuman-chalisa-path'],
  },
  {
    slug: 'sai-baba-aarti',
    name: 'Sai Baba Aarti (Aarti Sai Baba)',
    sanskrit: 'आरती साईं बाबा',
    deity: 'Shirdi Sai Baba',
    whenSung: 'Daily at Shirdi temple (4 times: Kakad, Madhyahna, Dhoop, Shej)',
    description:
      'The four daily aartis performed at Shirdi Sai Baba temple. Composed by Madhav Adkar in Marathi. Sung at every Sai temple across India and worldwide diaspora.',
    lyricsHindi: [
      'आरती साईं बाबा, सौख्यदातार जीवा।',
      'चरणरजातली, द्यावा दासां विसावा॥',
      'जाळुनियां अनंग, स्वस्वरूपीं राहे दंग।',
      'मुमुक्षु जनां दावी, निज डोळां श्रीरंग॥',
      'जया मनीं जैसा भाव, तया तैसा अनुभव।',
      'दाविसी दयाघना, ऐसी तुझी ही माव॥',
    ],
    lyricsTransliteration: [
      'Aarti Sai Baba, saukhyadaataara jeeva',
      'Charanarajaatalee, dyaava daasaan visaava',
      'Jaaluniyaan ananga, svasvaroopeen raahe danga',
      'Mumukshu janaan daavi, nija dolaan Shrirang',
      'Jaya maneen jaisaa bhaava, tayaa taisaa anubhava',
      'Daavisi dayaaghanaa, aisi tujhi hee maava',
    ],
    meaning:
      'O Sai Baba, granter of joy and life, may your servants find rest at the dust of your feet. Having burnt desire, you remain absorbed in your true Self. To seekers of liberation, you reveal Shrirang in their own vision. As one feels in heart, so one experiences — such is your compassionate divine play.',
    durationMinutes: 7,
    relatedPujas: ['sai-baba-puja', 'navgraha-puja'],
  },
];

export function getAarti(slug: string): AartiInfo | undefined {
  return AARTIS.find((a) => a.slug === slug);
}

export function aartiSlugs(): string[] {
  return AARTIS.map((a) => a.slug);
}

export function aartisByDeitySlug(deitySlug: string): AartiInfo[] {
  return AARTIS.filter((a) => a.deitySlug === deitySlug);
}
