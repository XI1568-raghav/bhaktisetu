// Canonical city dictionary for /city/[slug] programmatic-SEO routes.
// Targets long-tail "puja in {city}", "online puja {city}", "temples in {city}" queries.

export interface CityInfo {
  slug: string;
  name: string;
  state: string;
  hindi: string;
  population: string; // metro estimate, for hero copy
  description: string;
  famousTemples: string[]; // friendly names — link out to /temples
  templeSlugs?: string[]; // matching canonical temple slugs if known
  popularDeities: string[]; // deity slugs in /deity/[slug]
  popularPujas: string[]; // puja slugs in /pujas/[slug]
  nearbyYatra?: string[]; // yatra destination slugs
  significance: string;
  pinPrefix: string; // first 3 digits of PIN range
  isNriMagnet?: boolean; // diaspora ties — bumps NRI block visibility
}

export const CITIES: CityInfo[] = [
  {
    slug: 'varanasi',
    name: 'Varanasi',
    state: 'Uttar Pradesh',
    hindi: 'वाराणसी',
    population: '1.4M',
    description:
      'The oldest continuously inhabited city on Earth. Lord Shiva\'s eternal city on the banks of the Ganga. Home to Kashi Vishwanath, one of the twelve Jyotirlingas.',
    famousTemples: ['Kashi Vishwanath', 'Sankat Mochan Hanuman', 'Durga Kund', 'Tulsi Manas'],
    templeSlugs: ['kashi-vishwanath'],
    popularDeities: ['shiva', 'hanuman', 'devi'],
    popularPujas: ['rudrabhishek', 'maha-mrityunjaya', 'sundarkand-path'],
    nearbyYatra: ['ayodhya-kashi'],
    significance: 'Mokshapuri — those who die here attain liberation. Daily Ganga Aarti at Dashashwamedh Ghat draws millions.',
    pinPrefix: '221',
    isNriMagnet: true,
  },
  {
    slug: 'mumbai',
    name: 'Mumbai',
    state: 'Maharashtra',
    hindi: 'मुंबई',
    population: '20M',
    description:
      'India\'s financial capital and home to Siddhivinayak — the wish-fulfilling Ganesha temple visited by Bollywood stars, cricketers, and millions of devotees yearly.',
    famousTemples: ['Siddhivinayak', 'Mahalaxmi', 'Mumba Devi', 'ISKCON Juhu'],
    templeSlugs: ['siddhivinayak'],
    popularDeities: ['ganesha', 'lakshmi', 'krishna'],
    popularPujas: ['ganesh-puja', 'lakshmi-puja', 'satyanarayan-puja'],
    significance: 'Ganesh Chaturthi here is the world\'s largest Hindu festival — 10 days of city-wide pandals and immersion processions.',
    pinPrefix: '400',
    isNriMagnet: true,
  },
  {
    slug: 'delhi',
    name: 'Delhi',
    state: 'Delhi NCR',
    hindi: 'दिल्ली',
    population: '32M',
    description:
      'India\'s capital with the world\'s largest Hindu temple — Akshardham. Home to ancient Chhatarpur, Birla Mandir, and the ISKCON East of Kailash complex.',
    famousTemples: ['Akshardham', 'Chhatarpur', 'Birla Mandir', 'ISKCON Delhi'],
    templeSlugs: ['akshardham'],
    popularDeities: ['krishna', 'shiva', 'devi'],
    popularPujas: ['satyanarayan-puja', 'navgraha-puja', 'griha-pravesh'],
    significance: 'Akshardham holds the Guinness record for largest comprehensive Hindu temple. Chhatarpur is North India\'s second-largest temple complex.',
    pinPrefix: '110',
    isNriMagnet: true,
  },
  {
    slug: 'tirupati',
    name: 'Tirupati',
    state: 'Andhra Pradesh',
    hindi: 'तिरुपति',
    population: '475K',
    description:
      'Home of Tirumala Venkateswara — the world\'s richest and most-visited Hindu temple. Average 60,000 darshan tokens issued daily; 75M+ pilgrims yearly.',
    famousTemples: ['Tirumala Venkateswara', 'Padmavathi Devi', 'Govindaraja Swamy'],
    templeSlugs: ['tirumala-tirupati'],
    popularDeities: ['vishnu', 'lakshmi'],
    popularPujas: ['satyanarayan-puja', 'lakshmi-puja'],
    nearbyYatra: ['tirupati-south'],
    significance: 'TTD (Tirumala Tirupati Devasthanams) is the largest temple administration in the world. Special VIP darshan, kalyanotsavam, and Suprabhata seva available.',
    pinPrefix: '517',
    isNriMagnet: true,
  },
  {
    slug: 'haridwar',
    name: 'Haridwar',
    state: 'Uttarakhand',
    hindi: 'हरिद्वार',
    population: '320K',
    description:
      'Where the Ganga enters the plains. One of seven Mokshapuris and a Kumbh Mela host city. Gateway to Char Dham yatra (Yamunotri, Gangotri, Kedarnath, Badrinath).',
    famousTemples: ['Mansa Devi', 'Chandi Devi', 'Har Ki Pauri', 'Daksh Mahadev'],
    popularDeities: ['shiva', 'devi'],
    popularPujas: ['rudrabhishek', 'navgraha-puja', 'kaal-sarp-dosh'],
    nearbyYatra: ['char-dham', 'do-dham'],
    significance: 'Ganga Aarti at Har Ki Pauri every evening. Kumbh Mela here every 12 years — the world\'s largest religious gathering.',
    pinPrefix: '249',
  },
  {
    slug: 'rishikesh',
    name: 'Rishikesh',
    state: 'Uttarakhand',
    hindi: 'ऋषिकेश',
    population: '102K',
    description:
      'Yoga capital of the world and gateway to the Himalayas. Where the Ganga meets the foothills. International ashrams, Beatles ashram, and Char Dham starting point.',
    famousTemples: ['Triyambakeshwar', 'Bharat Mandir', 'Neelkanth Mahadev', 'Parmarth Niketan'],
    popularDeities: ['shiva', 'rama'],
    popularPujas: ['rudrabhishek', 'maha-mrityunjaya'],
    nearbyYatra: ['char-dham', 'do-dham'],
    significance: 'Where Rama performed penance after the Lanka war. International yoga festival every March. Triveni Ghat aarti draws thousands nightly.',
    pinPrefix: '249',
    isNriMagnet: true,
  },
  {
    slug: 'ujjain',
    name: 'Ujjain',
    state: 'Madhya Pradesh',
    hindi: 'उज्जैन',
    population: '515K',
    description:
      'Ancient Avantika — one of seven Mokshapuris and home to Mahakaleshwar Jyotirlinga. The only Jyotirlinga facing south. Bhasma Aarti at 4 AM is one of Hinduism\'s most powerful rituals.',
    famousTemples: ['Mahakaleshwar', 'Kal Bhairav', 'Harsiddhi', 'Mangalnath'],
    templeSlugs: ['mahakaleshwar'],
    popularDeities: ['shiva', 'devi'],
    popularPujas: ['rudrabhishek', 'maha-mrityunjaya', 'kaal-sarp-dosh'],
    significance: 'Simhastha Kumbh Mela every 12 years. Bhasma Aarti uses cremation ghat ashes — performed nowhere else in the world.',
    pinPrefix: '456',
  },
  {
    slug: 'ayodhya',
    name: 'Ayodhya',
    state: 'Uttar Pradesh',
    hindi: 'अयोध्या',
    population: '256K',
    description:
      'Birthplace of Lord Rama on the banks of the Saryu. Home to the new Ram Mandir consecrated 22 Jan 2024. Receives 100K+ pilgrims daily post-consecration.',
    famousTemples: ['Ram Mandir', 'Hanuman Garhi', 'Kanak Bhavan', 'Nageshwarnath'],
    popularDeities: ['rama', 'hanuman'],
    popularPujas: ['sundarkand-path', 'satyanarayan-puja'],
    nearbyYatra: ['ayodhya-kashi'],
    significance: 'One of seven Mokshapuris. Diwali deepotsav lights 25 lakh diyas along ghats — Guinness record holder.',
    pinPrefix: '224',
    isNriMagnet: true,
  },
  {
    slug: 'dwarka',
    name: 'Dwarka',
    state: 'Gujarat',
    hindi: 'द्वारका',
    population: '38K',
    description:
      'Krishna\'s capital city on the Arabian Sea coast. One of seven Mokshapuris and a Char Dham (four sacred abodes) site. Dwarkadhish temple flag changes 5 times daily.',
    famousTemples: ['Dwarkadhish', 'Rukmini', 'Nageshwar Jyotirlinga', 'Bet Dwarka'],
    templeSlugs: ['dwarkadhish'],
    popularDeities: ['krishna', 'shiva'],
    popularPujas: ['satyanarayan-puja', 'rudrabhishek'],
    significance: 'Krishna ruled Dwarka for 100+ years. Submerged ancient Dwarka discovered off the coast by ASI in 2001 — archaeological confirmation of Mahabharata.',
    pinPrefix: '361',
  },
  {
    slug: 'puri',
    name: 'Puri',
    state: 'Odisha',
    hindi: 'पुरी',
    population: '201K',
    description:
      'Home of Jagannath Puri — one of Char Dham and a Mokshapuri. World-famous Rath Yatra in July draws millions. Mahaprasad offered to Jagannath fed 50K+ daily.',
    famousTemples: ['Jagannath', 'Lokanath', 'Sakshi Gopal', 'Konark Sun Temple'],
    templeSlugs: ['jagannath-puri'],
    popularDeities: ['krishna', 'vishnu'],
    popularPujas: ['satyanarayan-puja', 'sundarkand-path'],
    significance: 'Jagannath temple flag flies against the wind. Rath Yatra is the only festival where the deity comes out to meet devotees.',
    pinPrefix: '752',
  },
];

export function getCity(slug: string): CityInfo | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function citySlugs(): string[] {
  return CITIES.map((c) => c.slug);
}
