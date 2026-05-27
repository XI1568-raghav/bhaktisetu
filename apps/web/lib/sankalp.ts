// sankalp.ts — data + template builders for /sankalp interactive vow tool.
// Sankalp = formal Sanskrit declaration of intent before any puja/vrat/donation.
// Traditionally recited with water in right palm, naming time/place/gotra/intent.

export interface Gotra {
  slug: string;
  name: string;
  rishi: string;
  description: string;
}

export const GOTRAS: Gotra[] = [
  { slug: 'bhardwaj', name: 'Bharadwaj', rishi: 'Maharishi Bharadwaja', description: 'One of the saptarishis; teacher of Drona.' },
  { slug: 'kashyap', name: 'Kashyap', rishi: 'Maharishi Kashyapa', description: 'Father of devas, asuras, and many beings; major saptarishi lineage.' },
  { slug: 'vasishtha', name: 'Vasishtha', rishi: 'Maharishi Vasishtha', description: 'Royal preceptor of Ikshvaku dynasty including Rama.' },
  { slug: 'gautam', name: 'Gautam', rishi: 'Maharishi Gautama', description: 'Composer of Nyaya Sutras; husband of Ahalya.' },
  { slug: 'atri', name: 'Atri', rishi: 'Maharishi Atri', description: 'Saptarishi; father of Dattatreya.' },
  { slug: 'vishvamitra', name: 'Vishwamitra', rishi: 'Maharishi Vishwamitra', description: 'King-turned-rishi; revealer of Gayatri Mantra.' },
  { slug: 'jamadagni', name: 'Jamadagni', rishi: 'Maharishi Jamadagni', description: 'Father of Parashurama.' },
  { slug: 'agastya', name: 'Agastya', rishi: 'Maharishi Agastya', description: 'Tamil tradition founder; carried Vedas south.' },
  { slug: 'angiras', name: 'Angiras', rishi: 'Maharishi Angiras', description: 'Father of Brihaspati (Jupiter); primal teacher.' },
  { slug: 'shandilya', name: 'Shandilya', rishi: 'Maharishi Shandilya', description: 'Author of Bhakti Sutras.' },
  { slug: 'parashar', name: 'Parashar', rishi: 'Maharishi Parashara', description: 'Author of Brihat Parashara Hora Shastra (Vedic astrology foundation).' },
  { slug: 'vatsa', name: 'Vatsa', rishi: 'Maharishi Vatsa', description: 'Lineage of Bhrigu descendants.' },
  { slug: 'kaushik', name: 'Kaushik', rishi: 'Maharishi Kaushika', description: 'Earlier name of Vishwamitra; royal-warrior lineage.' },
  { slug: 'garga', name: 'Garga', rishi: 'Maharishi Garga', description: 'Astrologer to Yadavas; named Krishna and Balarama.' },
  { slug: 'mudgal', name: 'Mudgal', rishi: 'Maharishi Mudgala', description: 'Composer of Mudgala Purana on Ganesha.' },
];

export interface SankalpIntent {
  slug: string;
  label: string;
  sanskritIntent: string;
  english: string;
  recommendedPujas: string[];
}

export const INTENTS: SankalpIntent[] = [
  {
    slug: 'health',
    label: 'Good health & long life',
    sanskritIntent: 'मम सकुटुम्बस्य आरोग्यप्राप्तये दीर्घायुष्यप्राप्तये च',
    english: 'For health and long life for me and my family',
    recommendedPujas: ['Mahamrityunjaya Jaap', 'Rudrabhishek', 'Dhanvantari Homam'],
  },
  {
    slug: 'wealth',
    label: 'Wealth & prosperity',
    sanskritIntent: 'मम सकुटुम्बस्य धनधान्यसमृद्धिप्राप्तये',
    english: 'For wealth, grain, and prosperity for me and my family',
    recommendedPujas: ['Lakshmi Kubera Puja', 'Sudarshana Homam', 'Lakshmi Hridayam'],
  },
  {
    slug: 'marriage',
    label: 'Suitable marriage / harmony',
    sanskritIntent: 'मम योग्यविवाहप्राप्तये दाम्पत्यसौख्यप्राप्तये च',
    english: 'For a suitable marriage and marital harmony',
    recommendedPujas: ['Swayamvara Parvati Puja', 'Uma Maheshwara Puja', 'Mangal Dosh Nivaran'],
  },
  {
    slug: 'progeny',
    label: 'Healthy progeny',
    sanskritIntent: 'सत्सन्तानप्राप्तये',
    english: 'For righteous and healthy progeny',
    recommendedPujas: ['Santana Gopala Homam', 'Putra Kameshti Yagya', 'Garbhadhana Sanskar'],
  },
  {
    slug: 'education',
    label: 'Education & wisdom',
    sanskritIntent: 'विद्याबुद्धिप्राप्तये',
    english: 'For learning, intelligence, and wisdom',
    recommendedPujas: ['Saraswati Puja', 'Hayagriva Homam', 'Medha Sukta Parayan'],
  },
  {
    slug: 'career',
    label: 'Career success',
    sanskritIntent: 'व्यवसायाभिवृद्धये कर्मसिद्धये च',
    english: 'For growth in work and success in actions',
    recommendedPujas: ['Ganapati Homam', 'Sudarshana Homam', 'Karya Siddhi Hanuman Puja'],
  },
  {
    slug: 'obstacles',
    label: 'Removal of obstacles',
    sanskritIntent: 'सर्वविघ्ननाशनार्थम्',
    english: 'For removal of all obstacles',
    recommendedPujas: ['Ganapati Homam', 'Sankashti Chaturthi Vrat', 'Vighnaraja Puja'],
  },
  {
    slug: 'grah-dosha',
    label: 'Planetary affliction relief',
    sanskritIntent: 'सर्वग्रहदोषनिवारणार्थम्',
    english: 'For removal of all planetary afflictions',
    recommendedPujas: ['Navagraha Shanti', 'Rahu Ketu Puja', 'Shani Shanti Puja'],
  },
  {
    slug: 'pitru',
    label: 'Peace of ancestors',
    sanskritIntent: 'पितृणां सद्गतिप्राप्तये पितृदोषनिवारणार्थं च',
    english: 'For peaceful onward journey of ancestors and removal of pitru dosha',
    recommendedPujas: ['Tarpanam', 'Pitru Paksha Shraddha', 'Tripindi Shraddha'],
  },
  {
    slug: 'moksha',
    label: 'Spiritual liberation',
    sanskritIntent: 'भगवत्प्रीत्यर्थं मोक्षप्राप्तये',
    english: 'For the pleasure of the Divine and ultimate liberation',
    recommendedPujas: ['Maha Mrityunjaya Mantra', 'Vishnu Sahasranama Parayan', 'Bhagavad Gita Parayan'],
  },
];

const TITHI_NAMES = [
  'प्रतिपदा', 'द्वितीया', 'तृतीया', 'चतुर्थी', 'पञ्चमी',
  'षष्ठी', 'सप्तमी', 'अष्टमी', 'नवमी', 'दशमी',
  'एकादशी', 'द्वादशी', 'त्रयोदशी', 'चतुर्दशी', 'पूर्णिमा / अमावस्या',
];

const MASA_NAMES = [
  'पौष', 'माघ', 'फाल्गुन', 'चैत्र', 'वैशाख', 'ज्येष्ठ',
  'आषाढ', 'श्रावण', 'भाद्रपद', 'आश्विन', 'कार्तिक', 'मार्गशीर्ष',
];

const VAARA_NAMES = ['भानुवासर', 'सोमवासर', 'भौमवासर', 'सौम्यवासर', 'गुरुवासर', 'भृगुवासर', 'स्थिरवासर'];

export function approximateTithi(date: Date): { name: string; paksha: string } {
  const day = date.getDate();
  const paksha = day <= 15 ? 'शुक्लपक्ष' : 'कृष्णपक्ष';
  const tIdx = (day <= 15 ? day - 1 : day - 16);
  return { name: TITHI_NAMES[Math.min(tIdx, 14)] || TITHI_NAMES[0]!, paksha };
}

export function approximateMasa(date: Date): string {
  return MASA_NAMES[date.getMonth()] || MASA_NAMES[0]!;
}

export function vaaraName(date: Date): string {
  return VAARA_NAMES[date.getDay()] || VAARA_NAMES[0]!;
}

export interface SankalpInput {
  yajamana: string;
  gotraSlug: string;
  nakshatraName?: string;
  rashiName?: string;
  city: string;
  intentSlug: string;
  date: Date;
}

export interface SankalpOutput {
  sanskritFull: string;
  iastFull: string;
  englishFull: string;
}

export function getGotra(slug: string): Gotra | undefined {
  return GOTRAS.find((g) => g.slug === slug);
}

export function getIntent(slug: string): SankalpIntent | undefined {
  return INTENTS.find((i) => i.slug === slug);
}

export function buildSankalp(input: SankalpInput): SankalpOutput {
  const gotra = getGotra(input.gotraSlug);
  const intent = getIntent(input.intentSlug);
  const tithi = approximateTithi(input.date);
  const masa = approximateMasa(input.date);
  const vaara = vaaraName(input.date);
  const year = input.date.getFullYear() + 57; // approx Vikram Samvat

  const gotraSans = gotra ? `${gotra.name}गोत्रोत्पन्न` : 'गोत्रोत्पन्न';
  const nakSans = input.nakshatraName ? `${input.nakshatraName}नक्षत्रे` : '';
  const rashiSans = input.rashiName ? `${input.rashiName}राशिस्थिते` : '';

  const sanskritFull = [
    'ॐ विष्णुर्विष्णुर्विष्णुः।',
    `अद्य श्री विक्रम संवत्सरे ${year}, ${masa}मासे, ${tithi.paksha}े, ${tithi.name}तिथौ, ${vaara}युक्तायाम् ${nakSans ? nakSans + ',' : ''} ${rashiSans ? rashiSans + ',' : ''} शुभमुहूर्ते,`,
    `${input.city}क्षेत्रे स्थितः ${gotraSans} ${input.yajamana} नामधेयः अहं,`,
    `${intent ? intent.sanskritIntent : 'श्रीपरमेश्वरप्रीत्यर्थम्'} सङ्कल्पमहं करिष्ये।`,
    'ॐ तत्सत् श्री ब्रह्मार्पणमस्तु।',
  ].join('\n');

  const iastFull = [
    'oṁ viṣṇur viṣṇur viṣṇuḥ |',
    `adya śrī vikrama saṁvatsare ${year}, ${transliterateMasa(masa)} māse, ${transliteratePaksha(tithi.paksha)}e, ${transliterateTithi(tithi.name)} tithau,`,
    `${input.city} kṣetre sthitaḥ ${gotra ? gotra.name : ''} gotrotpanna ${input.yajamana} nāmadheyaḥ ahaṁ,`,
    `${intent ? intent.english + ' (resolve)' : 'for the pleasure of the Supreme'},`,
    'saṅkalpam ahaṁ kariṣye | oṁ tat sat śrī brahmārpaṇam astu |',
  ].join('\n');

  const englishFull = [
    'Om, Vishnu, Vishnu, Vishnu.',
    `On this day in Vikram Samvat ${year}, in the month of ${transliterateMasa(masa)}, on the ${tithi.paksha === 'शुक्लपक्ष' ? 'bright' : 'dark'} fortnight, ${tithi.name === 'पूर्णिमा / अमावस्या' ? '(full / new moon)' : 'tithi'}, on the day of ${vaara.replace('वासर', '')},${input.nakshatraName ? ' under ' + input.nakshatraName + ' nakshatra,' : ''}${input.rashiName ? ' in ' + input.rashiName + ' rashi,' : ''} at an auspicious moment,`,
    `I, ${input.yajamana}, born in the ${gotra ? gotra.name : '____'} gotra (lineage of ${gotra ? gotra.rishi : 'the rishis'}), residing in ${input.city},`,
    `do hereby resolve and undertake this sankalp ${intent ? intent.english.toLowerCase() : 'for spiritual merit'}.`,
    'Om Tat Sat. May this offering reach Brahman.',
  ].join('\n');

  return { sanskritFull, iastFull, englishFull };
}

function transliterateMasa(m: string): string {
  const map: Record<string, string> = {
    'पौष': 'Pausha', 'माघ': 'Magha', 'फाल्गुन': 'Phalguna', 'चैत्र': 'Chaitra',
    'वैशाख': 'Vaishakha', 'ज्येष्ठ': 'Jyeshtha', 'आषाढ': 'Ashadha', 'श्रावण': 'Shravana',
    'भाद्रपद': 'Bhadrapada', 'आश्विन': 'Ashwina', 'कार्तिक': 'Kartika', 'मार्गशीर्ष': 'Margashirsha',
  };
  return map[m] || m;
}
function transliteratePaksha(p: string): string {
  return p === 'शुक्लपक्ष' ? 'shukla pakṣa' : 'kṛṣṇa pakṣa';
}
function transliterateTithi(t: string): string {
  const map: Record<string, string> = {
    'प्रतिपदा': 'pratipadā', 'द्वितीया': 'dvitīyā', 'तृतीया': 'tṛtīyā', 'चतुर्थी': 'caturthī',
    'पञ्चमी': 'pañcamī', 'षष्ठी': 'ṣaṣṭhī', 'सप्तमी': 'saptamī', 'अष्टमी': 'aṣṭamī',
    'नवमी': 'navamī', 'दशमी': 'daśamī', 'एकादशी': 'ekādaśī', 'द्वादशी': 'dvādaśī',
    'त्रयोदशी': 'trayodaśī', 'चतुर्दशी': 'caturdaśī', 'पूर्णिमा / अमावस्या': 'pūrṇimā/amāvāsyā',
  };
  return map[t] || t;
}
