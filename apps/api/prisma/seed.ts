import { PrismaClient } from '@prisma/client';
import { contentData } from './content-data.js';

const prisma = new PrismaClient();

// ─── TEMPLE DATA ────────────────────────────────────────────────────────────

const templesData = [
  {
    name: 'Kashi Vishwanath Temple',
    nameLocal: 'काशी विश्वनाथ मंदिर',
    slug: 'kashi-vishwanath-varanasi',
    description: `Kashi Vishwanath Temple is one of the most famous Hindu temples dedicated to Lord Shiva. It is located in Vishwanath Gali of Varanasi, Uttar Pradesh. The temple stands on the western bank of the holy river Ganga, and is one of the twelve Jyotirlingas, the holiest of Shiva temples. The main deity is Sri Vishwanath or Lord Shiva and the current temple structure was built in 1780 by Maharani Ahilyabai Holkar of Indore.

The temple has been a center of worship, pilgrimage, and mysticism for thousands of years. It has witnessed the rise and fall of civilizations, being destroyed and rebuilt multiple times throughout history. The temple town of Varanasi is considered the spiritual capital of India and is believed to be the oldest continuously inhabited city in the world.

The Kashi Vishwanath Corridor, inaugurated in 2021, has transformed the temple precinct into a world-class pilgrimage destination with modern amenities while preserving its ancient spiritual essence. The temple's golden spire (gold plating on the tower) is a distinctive landmark visible from across the ghats of Varanasi.`,
    deityPrimary: 'Lord Shiva',
    deities: ['Lord Shiva', 'Parvati', 'Nandi', 'Kaal Bhairav'],
    tradition: 'shaiva' as const,
    addressLine: 'Lahori Tola, Varanasi',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    pincode: '221001',
    lat: 25.3109,
    lng: 83.0107,
    phone: '+91-542-2392629',
    email: 'info@shrikashivishwanath.org',
    websiteUrl: 'https://shrikashivishwanath.org',
    images: [
      'https://images.poojly.com/temples/kashi-vishwanath/main.jpg',
      'https://images.poojly.com/temples/kashi-vishwanath/golden-spire.jpg',
      'https://images.poojly.com/temples/kashi-vishwanath/corridor.jpg',
      'https://images.poojly.com/temples/kashi-vishwanath/ganga-view.jpg',
    ],
    timingInfo: {
      regularHours: {
        mangalaAarti: '03:00 - 04:00',
        generalDarshan: '04:00 - 11:00',
        afternoonDarshan: '12:00 - 19:00',
        eveningAarti: '19:00 - 20:30',
        shringarAarti: '21:00 - 22:00',
      },
      specialDays: 'Mondays and Shivaratri have extended hours',
      closedOn: 'Open all days',
    },
    trustScore: 4.9,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.poojly.com/kashi-vishwanath',
  },
  {
    name: 'Tirumala Tirupati Devasthanam',
    nameLocal: 'తిరుమల తిరుపతి దేవస్థానం',
    slug: 'tirumala-tirupati',
    description: `Sri Venkateswara Temple at Tirumala is the most visited religious place in the world. Dedicated to Lord Venkateswara, a form of Lord Vishnu, it is situated on the seventh peak (Venkatadri) of Tirumala Hills in Tirupati, Andhra Pradesh.`,
    deityPrimary: 'Lord Venkateswara',
    deities: ['Lord Venkateswara', 'Padmavathi', 'Lakshmi', 'Garuda'],
    tradition: 'vaishnava' as const,
    addressLine: 'Tirumala Hills, Tirupati',
    city: 'Tirupati',
    state: 'Andhra Pradesh',
    pincode: '517504',
    lat: 13.6833,
    lng: 79.3474,
    phone: '+91-877-2277777',
    email: 'info@tirumala.org',
    websiteUrl: 'https://www.tirumala.org',
    images: [
      'https://images.poojly.com/temples/tirumala-tirupati/main.jpg',
      'https://images.poojly.com/temples/tirumala-tirupati/gopuram.jpg',
      'https://images.poojly.com/temples/tirumala-tirupati/golden-vimana.jpg',
      'https://images.poojly.com/temples/tirumala-tirupati/laddu.jpg',
    ],
    timingInfo: {
      regularHours: {
        suprabhatam: '02:30 - 03:00',
        generalDarshan: '06:30 - 19:00',
        specialDarshan: '03:00 - 06:00',
        eveningDarshan: '19:00 - 22:00',
        ekantaSeva: '23:00 - 23:30',
      },
      specialDays: 'Brahmotsavam (September), Vaikuntha Ekadashi',
      closedOn: 'Open all days',
    },
    trustScore: 5.0,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.poojly.com/tirumala-tirupati',
  },
  {
    name: 'Siddhivinayak Temple',
    nameLocal: 'सिद्धिविनायक मंदिर',
    slug: 'siddhivinayak-mumbai',
    description: `Shree Siddhivinayak Ganapati Mandir is a Hindu temple dedicated to Lord Ganesha, located at Prabhadevi in Mumbai, Maharashtra. Built in 1801, the temple is one of the richest and most visited temples in Mumbai.`,
    deityPrimary: 'Lord Ganesha',
    deities: ['Lord Ganesha', 'Riddhi', 'Siddhi'],
    tradition: 'smarta' as const,
    addressLine: 'SK Bole Marg, Prabhadevi, Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400028',
    lat: 19.0169,
    lng: 72.8306,
    phone: '+91-22-24374440',
    email: 'info@siddhivinayak.org',
    websiteUrl: 'https://www.siddhivinayak.org',
    images: [
      'https://images.poojly.com/temples/siddhivinayak/main.jpg',
      'https://images.poojly.com/temples/siddhivinayak/golden-dome.jpg',
      'https://images.poojly.com/temples/siddhivinayak/idol.jpg',
      'https://images.poojly.com/temples/siddhivinayak/entrance.jpg',
    ],
    timingInfo: {
      regularHours: {
        morningAarti: '05:30 - 06:00',
        morningDarshan: '06:00 - 12:00',
        afternoonDarshan: '12:00 - 19:30',
        eveningAarti: '19:30 - 20:00',
        nightDarshan: '20:00 - 22:00',
      },
      specialDays: 'Tuesdays have extended hours until midnight',
      closedOn: 'Open all days',
    },
    trustScore: 4.8,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.poojly.com/siddhivinayak',
  },
  {
    name: 'Somnath Temple',
    nameLocal: 'सोमनाथ मंदिर',
    slug: 'somnath-gujarat',
    description: `Somnath Temple, located at the shore of the Arabian Sea in Prabhas Patan near Veraval in Gujarat, is one of the most sacred pilgrimage sites for Hindus. It is the first among the twelve Jyotirlinga shrines of Lord Shiva.`,
    deityPrimary: 'Lord Shiva',
    deities: ['Lord Shiva', 'Parvati', 'Nandi', 'Ganesha'],
    tradition: 'shaiva' as const,
    addressLine: 'Prabhas Patan, Veraval',
    city: 'Somnath',
    state: 'Gujarat',
    pincode: '362268',
    lat: 20.8880,
    lng: 70.4014,
    phone: '+91-2876-231212',
    email: 'info@somnath.org',
    websiteUrl: 'https://somnath.org',
    images: [
      'https://images.poojly.com/temples/somnath/main.jpg',
      'https://images.poojly.com/temples/somnath/sea-view.jpg',
      'https://images.poojly.com/temples/somnath/evening.jpg',
      'https://images.poojly.com/temples/somnath/light-show.jpg',
    ],
    timingInfo: {
      regularHours: {
        morningAarti: '06:00 - 07:00',
        morningDarshan: '07:00 - 12:00',
        afternoonDarshan: '13:00 - 17:00',
        eveningAarti: '19:00 - 19:30',
        nightDarshan: '19:30 - 21:00',
      },
      lightAndSoundShow: '20:00 - 21:00 (daily)',
      closedOn: 'Open all days',
    },
    trustScore: 4.9,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Jagannath Temple',
    nameLocal: 'ଜଗନ୍ନାଥ ମନ୍ଦିର',
    slug: 'jagannath-puri',
    description: `The Jagannath Temple in Puri is one of the most sacred Hindu temples, dedicated to Lord Jagannath, a form of Lord Vishnu. Located on the eastern coast of India in Puri, Odisha, it is one of the four sacred Char Dham pilgrimage sites.`,
    deityPrimary: 'Lord Jagannath',
    deities: ['Lord Jagannath', 'Balabhadra', 'Subhadra', 'Sudarshana'],
    tradition: 'vaishnava' as const,
    addressLine: 'Grand Road, Puri',
    city: 'Puri',
    state: 'Odisha',
    pincode: '752001',
    lat: 19.8050,
    lng: 85.8181,
    phone: '+91-6752-222002',
    email: 'info@jagannath.nic.in',
    websiteUrl: 'https://jagannath.nic.in',
    images: [
      'https://images.poojly.com/temples/jagannath-puri/main.jpg',
      'https://images.poojly.com/temples/jagannath-puri/rath-yatra.jpg',
      'https://images.poojly.com/temples/jagannath-puri/nilachakra.jpg',
      'https://images.poojly.com/temples/jagannath-puri/mahaprasad.jpg',
    ],
    timingInfo: {
      regularHours: {
        mangalaAarti: '05:00 - 06:00',
        morningDarshan: '06:00 - 12:00',
        madhyahnaDhupa: '12:00 - 13:00',
        afternoonDarshan: '13:00 - 18:00',
        sandhyaAarti: '18:00 - 19:00',
        nightDarshan: '19:00 - 21:00',
      },
      specialDays: 'Rath Yatra (June/July), Snana Yatra, Chandan Yatra',
      closedOn: 'Open all days (restricted during Anasar period — 15 days before Rath Yatra)',
    },
    trustScore: 4.9,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.poojly.com/jagannath-puri',
  },
];

// ─── PUJA TYPES DATA ────────────────────────────────────────────────────────

const pujaTypesData = [
  { name: 'Rudrabhishek', nameLocal: 'रुद्राभिषेक', slug: 'rudrabhishek', description: 'Rudrabhishek is one of the most powerful Vedic rituals dedicated to Lord Shiva.', category: 'planetary' as const, deity: 'Lord Shiva', durationMinutes: 90, basePrice: 501, nriPrice: 2501, samagriIncluded: true, samagriItems: ['Bel patra', 'Dhatura', 'Milk', 'Honey', 'Curd', 'Ghee', 'Gangajal', 'Rudraksha mala'], images: ['https://images.poojly.com/pujas/rudrabhishek/main.jpg'], videoProofMandatory: true, sortOrder: 1 },
  { name: 'Ganesh Puja', nameLocal: 'गणेश पूजा', slug: 'ganesh-puja', description: 'Ganesh Puja is performed to invoke the blessings of Lord Ganesha, the remover of obstacles.', category: 'prosperity' as const, deity: 'Lord Ganesha', durationMinutes: 60, basePrice: 351, nriPrice: 1501, samagriIncluded: true, samagriItems: ['Modak', 'Durva grass', 'Red flowers', 'Sindoor', 'Coconut', 'Betel leaves', 'Jaggery'], images: ['https://images.poojly.com/pujas/ganesh-puja/main.jpg'], videoProofMandatory: true, sortOrder: 2 },
  { name: 'Satyanarayan Katha', nameLocal: 'सत्यनारायण कथा', slug: 'satyanarayan-katha', description: 'Satyanarayan Katha is a devotional ritual performed to seek the blessings of Lord Vishnu.', category: 'special_occasion' as const, deity: 'Lord Vishnu', durationMinutes: 120, basePrice: 751, nriPrice: 3001, samagriIncluded: true, samagriItems: ['Banana', 'Wheat flour', 'Sugar', 'Ghee', 'Tulsi', 'Panchamrit', 'Dry fruits', 'Yellow cloth'], images: ['https://images.poojly.com/pujas/satyanarayan-katha/main.jpg'], videoProofMandatory: true, sortOrder: 3 },
  { name: 'Maha Mrityunjay Jaap', nameLocal: 'महा मृत्युंजय जाप', slug: 'maha-mrityunjay-jaap', description: 'Maha Mrityunjay Jaap is a powerful chanting ritual dedicated to Lord Shiva as the conqueror of death.', category: 'health' as const, deity: 'Lord Shiva', durationMinutes: 180, basePrice: 1100, nriPrice: 5001, samagriIncluded: true, samagriItems: ['Rudraksha mala', 'Bel patra', 'White flowers', 'Ghee', 'Sesame seeds', 'Havan samagri', 'Camphor'], images: ['https://images.poojly.com/pujas/maha-mrityunjay/main.jpg'], videoProofMandatory: true, sortOrder: 4 },
  { name: 'Lakshmi Puja', nameLocal: 'लक्ष्मी पूजा', slug: 'lakshmi-puja', description: 'Lakshmi Puja is a sacred ritual dedicated to Goddess Lakshmi for wealth and prosperity.', category: 'prosperity' as const, deity: 'Goddess Lakshmi', durationMinutes: 60, basePrice: 451, nriPrice: 2001, samagriIncluded: true, samagriItems: ['Lotus flowers', 'Rice', 'Turmeric', 'Kumkum', 'Coins', 'Sweets', 'Red cloth', 'Kalash'], images: ['https://images.poojly.com/pujas/lakshmi-puja/main.jpg'], videoProofMandatory: true, sortOrder: 5 },
  { name: 'Navgraha Shanti Puja', nameLocal: 'नवग्रह शांति पूजा', slug: 'navgraha-shanti-puja', description: 'Navgraha Shanti Puja is performed to pacify the nine planetary deities.', category: 'planetary' as const, deity: 'Navagraha', durationMinutes: 120, basePrice: 901, nriPrice: 4001, samagriIncluded: true, samagriItems: ['Nine types of grains', 'Nine colored cloths', 'Havan samagri', 'Ghee', 'Navgraha yantra'], images: ['https://images.poojly.com/pujas/navgraha-shanti/main.jpg'], videoProofMandatory: true, sortOrder: 6 },
  { name: 'Sunderkand Path', nameLocal: 'सुंदरकांड पाठ', slug: 'sunderkand-path', description: 'Sunderkand Path is the devotional recitation of the fifth chapter of Ramcharitmanas.', category: 'daily' as const, deity: 'Lord Hanuman', durationMinutes: 150, basePrice: 501, nriPrice: 2001, samagriIncluded: true, samagriItems: ['Sindoor', 'Jasmine oil', 'Red flowers', 'Bundi laddoo', 'Betel leaves', 'Ramcharitmanas book'], images: ['https://images.poojly.com/pujas/sunderkand-path/main.jpg'], videoProofMandatory: true, sortOrder: 7 },
  { name: 'Hanuman Chalisa Path', nameLocal: 'हनुमान चालीसा पाठ', slug: 'hanuman-chalisa-path', description: 'Hanuman Chalisa Path involves the devotional recitation of the 40 verses by Goswami Tulsidas.', category: 'daily' as const, deity: 'Lord Hanuman', durationMinutes: 45, basePrice: 251, nriPrice: 1001, samagriIncluded: true, samagriItems: ['Sindoor', 'Jasmine oil', 'Red flowers', 'Bundi laddoo', 'Chola (red cloth)'], images: ['https://images.poojly.com/pujas/hanuman-chalisa/main.jpg'], videoProofMandatory: true, sortOrder: 8 },
  { name: 'Ram Charit Manas Path', nameLocal: 'रामचरित मानस पाठ', slug: 'ram-charit-manas-path', description: 'Ram Charit Manas Path is the complete recitation of the epic poem by Goswami Tulsidas.', category: 'special_occasion' as const, deity: 'Lord Ram', durationMinutes: 240, basePrice: 1501, nriPrice: 6001, samagriIncluded: true, samagriItems: ['Ramcharitmanas book', 'Tulsi mala', 'Yellow flowers', 'Fruits', 'Sweets', 'Ghee diya', 'Havan samagri'], images: ['https://images.poojly.com/pujas/ram-charit-manas/main.jpg'], videoProofMandatory: true, sortOrder: 9 },
  { name: 'Pitru Dosh Nivaran Puja', nameLocal: 'पितृ दोष निवारण पूजा', slug: 'pitru-dosh-nivaran-puja', description: 'Pitru Dosh Nivaran Puja is performed to alleviate the ancestral curse (Pitru Dosh).', category: 'memorial' as const, deity: 'Ancestors', durationMinutes: 150, basePrice: 1101, nriPrice: 5001, samagriIncluded: true, samagriItems: ['Black sesame seeds', 'Barley', 'Kusha grass', 'Rice', 'White cloth', 'Ghee', 'Havan samagri', 'Dakshina'], images: ['https://images.poojly.com/pujas/pitru-dosh-nivaran/main.jpg'], videoProofMandatory: true, sortOrder: 10 },
];

// ─── CONTENT DATA is imported from ./content-data.ts ─────────────────────────

// ─── PANCHANG DATA (7 days starting April 15, 2026) ────────────────────────

const panchangData = [
  { date: new Date('2026-04-15'), tithi: 'Krishna Dwitiya', nakshatra: 'Vishakha', yoga: 'Siddha', karana: 'Balava', sunrise: '05:58', sunset: '18:42', rahuKaal: '07:28 - 09:01', shubhMuhurat: { abhijitMuhurat: '11:54 - 12:45', brahmaMuhurta: '04:22 - 05:10', vijayMuhurat: '14:26 - 15:17' }, festivals: [], vrat: [], specialInfo: 'Good day for starting new educational ventures.', locationCity: 'Delhi' },
  { date: new Date('2026-04-16'), tithi: 'Krishna Tritiya', nakshatra: 'Anuradha', yoga: 'Vyatipata', karana: 'Taitila', sunrise: '05:57', sunset: '18:43', rahuKaal: '15:11 - 16:44', shubhMuhurat: { abhijitMuhurat: '11:54 - 12:45', brahmaMuhurta: '04:21 - 05:09', vijayMuhurat: '14:26 - 15:17' }, festivals: [], vrat: [], specialInfo: 'Anuradha nakshatra supports friendship and devotion.', locationCity: 'Delhi' },
  { date: new Date('2026-04-17'), tithi: 'Krishna Chaturthi', nakshatra: 'Jyeshtha', yoga: 'Variyan', karana: 'Garaja', sunrise: '05:56', sunset: '18:44', rahuKaal: '12:02 - 13:35', shubhMuhurat: { abhijitMuhurat: '11:54 - 12:45', brahmaMuhurta: '04:20 - 05:08', vijayMuhurat: '14:26 - 15:17' }, festivals: ['Sankashti Chaturthi'], vrat: ['Sankashti Chaturthi Vrat'], specialInfo: 'Sankashti Chaturthi — observe fast for Lord Ganesha.', locationCity: 'Delhi' },
  { date: new Date('2026-04-18'), tithi: 'Krishna Panchami', nakshatra: 'Mula', yoga: 'Parigha', karana: 'Vanija', sunrise: '05:55', sunset: '18:44', rahuKaal: '09:00 - 10:33', shubhMuhurat: { abhijitMuhurat: '11:53 - 12:44', brahmaMuhurta: '04:19 - 05:07', vijayMuhurat: '14:26 - 15:17' }, festivals: [], vrat: [], specialInfo: 'Mula nakshatra — good for research and spiritual practices.', locationCity: 'Delhi' },
  { date: new Date('2026-04-19'), tithi: 'Krishna Shashthi', nakshatra: 'Purva Ashadha', yoga: 'Shiva', karana: 'Vishti', sunrise: '05:54', sunset: '18:45', rahuKaal: '16:44 - 18:17', shubhMuhurat: { abhijitMuhurat: '11:53 - 12:44', brahmaMuhurta: '04:18 - 05:06', vijayMuhurat: '14:26 - 15:17' }, festivals: [], vrat: [], specialInfo: 'Shiva yoga is highly auspicious.', locationCity: 'Delhi' },
  { date: new Date('2026-04-20'), tithi: 'Krishna Saptami', nakshatra: 'Uttara Ashadha', yoga: 'Siddhi', karana: 'Bava', sunrise: '05:53', sunset: '18:46', rahuKaal: '07:26 - 08:59', shubhMuhurat: { abhijitMuhurat: '11:53 - 12:44', brahmaMuhurta: '04:17 - 05:05', vijayMuhurat: '14:26 - 15:17' }, festivals: [], vrat: [], specialInfo: 'Siddhi yoga is excellent for achieving long-term goals.', locationCity: 'Delhi' },
  { date: new Date('2026-04-21'), tithi: 'Krishna Ashtami', nakshatra: 'Shravana', yoga: 'Sadhya', karana: 'Balava', sunrise: '05:52', sunset: '18:46', rahuKaal: '15:13 - 16:46', shubhMuhurat: { abhijitMuhurat: '11:53 - 12:44', brahmaMuhurta: '04:16 - 05:04', vijayMuhurat: '14:26 - 15:17' }, festivals: [], vrat: ['Kalashtami Vrat'], specialInfo: 'Kalashtami — dedicated to Kaal Bhairav.', locationCity: 'Delhi' },
];

// ─── DEMO USERS (one per role) ──────────────────────────────────────────────

const demoUsers = [
  { phone: '+919000000001', email: 'devotee@demo.com',  fullName: 'Demo Devotee',  role: 'DEVOTEE' as const,             locationCity: 'Delhi',     locationState: 'Delhi' },
  { phone: '+919000000002', email: 'pandit@demo.com',   fullName: 'Demo Pandit',   role: 'PANDIT' as const,              locationCity: 'Varanasi',  locationState: 'Uttar Pradesh' },
  { phone: '+919000000003', email: 'store@demo.com',    fullName: 'Demo Store',    role: 'STORE_OWNER' as const,         locationCity: 'Jaipur',    locationState: 'Rajasthan' },
  { phone: '+919000000004', email: 'astrologer@demo.com', fullName: 'Demo Astrologer', role: 'ASTROLOGER' as const,      locationCity: 'Pune',      locationState: 'Maharashtra' },
  { phone: '+919000000005', email: 'wellness@demo.com', fullName: 'Demo Wellness', role: 'WELLNESS_INSTRUCTOR' as const, locationCity: 'Rishikesh', locationState: 'Uttarakhand' },
  { phone: '+919000000006', email: 'gaushala@demo.com', fullName: 'Demo Gaushala', role: 'GAUSHALA_MANAGER' as const,    locationCity: 'Mathura',   locationState: 'Uttar Pradesh' },
  { phone: '+919000000007', email: 'temple@demo.com',   fullName: 'Demo Temple',   role: 'TEMPLE_MANAGER' as const,      locationCity: 'Ayodhya',   locationState: 'Uttar Pradesh' },
  { phone: '+919000000008', email: 'admin@demo.com',    fullName: 'Demo Admin',    role: 'ADMIN' as const,               locationCity: 'Bengaluru', locationState: 'Karnataka' },
];

// ─── ASTROLOGERS (Vedic / Tarot / Numerology) ───────────────────────────────

const astrologersData = [
  { email: 'astro.vedic@poojly.com', phone: '+919811100001', fullName: 'Acharya Vinod Sharma', displayName: 'Acharya Vinod Sharma', specialties: ['Vedic', 'Kundali', 'Muhurat'], experience: 22, languages: ['Hindi', 'Sanskrit', 'English'], pricePerMinute: 25, bio: 'Vedic astrologer with 22 years of experience.' },
  { email: 'astro.tarot@poojly.com', phone: '+919811100002', fullName: 'Ritika Menon', displayName: 'Ritika Menon', specialties: ['Tarot', 'Angel Cards', 'Reiki'], experience: 9, languages: ['English', 'Hindi', 'Malayalam'], pricePerMinute: 18, bio: 'Certified Tarot reader and energy healer.' },
  { email: 'astro.numero@poojly.com', phone: '+919811100003', fullName: 'Dr. Mahesh Iyer', displayName: 'Dr. Mahesh Iyer', specialties: ['Numerology', 'Name Correction', 'Lo Shu Grid'], experience: 15, languages: ['English', 'Tamil', 'Hindi'], pricePerMinute: 20, bio: 'Numerology expert specializing in name corrections.' },
];

// ─── WELLNESS INSTRUCTORS ───────────────────────────────────────────────────

const wellnessData = [
  { email: 'wellness.yoga@poojly.com', phone: '+919811200001', fullName: 'Swami Atmananda', displayName: 'Swami Atmananda', specialties: ['Hatha Yoga', 'Pranayama'], certifications: ['RYT-500', 'Sivananda Certified'], experience: 20, pricePerSession: 800, bio: 'Traditional Hatha Yoga teacher from Rishikesh.' },
  { email: 'wellness.meditation@poojly.com', phone: '+919811200002', fullName: 'Ananya Desai', displayName: 'Ananya Desai', specialties: ['Vipassana', 'Mindfulness'], certifications: ['Goenka Vipassana Assistant'], experience: 11, pricePerSession: 600, bio: 'Mindfulness and Vipassana meditation guide.' },
  { email: 'wellness.ayurveda@poojly.com', phone: '+919811200003', fullName: 'Dr. Kavita Nair', displayName: 'Dr. Kavita Nair', specialties: ['Ayurveda Consultation', 'Panchakarma'], certifications: ['BAMS', 'MD Ayurveda'], experience: 17, pricePerSession: 1500, bio: 'BAMS doctor specializing in Ayurvedic consultations.' },
  { email: 'wellness.sound@poojly.com', phone: '+919811200004', fullName: 'Arjun Kapoor', displayName: 'Arjun Kapoor', specialties: ['Sound Healing', 'Mantra Chanting'], certifications: ['Himalayan Singing Bowl Cert.'], experience: 7, pricePerSession: 900, bio: 'Sound healer using Tibetan singing bowls.' },
  { email: 'wellness.breathwork@poojly.com', phone: '+919811200005', fullName: 'Neha Srinivasan', displayName: 'Neha Srinivasan', specialties: ['Breathwork', 'Kriya Yoga'], certifications: ['Isha Hatha Yoga Teacher'], experience: 6, pricePerSession: 550, bio: 'Breathwork and Kriya Yoga instructor.' },
];

// ─── GAUSHALAS ──────────────────────────────────────────────────────────────

const gaushalaData = [
  { email: 'gaushala.mathura@poojly.com', phone: '+919811300001', fullName: 'Shri Krishna Gaushala Trust', gaushalaName: 'Shri Krishna Gaushala', city: 'Mathura', address: 'Vrindavan Road, Mathura', totalCows: 420, description: 'Traditional gaushala near Vrindavan caring for indigenous breed cows.' },
  { email: 'gaushala.pathmeda@poojly.com', phone: '+919811300002', fullName: 'Pathmeda Gauseva Sansthan', gaushalaName: 'Pathmeda Gauseva Sansthan', city: 'Sanchore', address: 'Pathmeda, Jalore, Rajasthan', totalCows: 2800, description: 'One of India\'s largest gaushalas.' },
  { email: 'gaushala.hinganghat@poojly.com', phone: '+919811300003', fullName: 'Hinganghat Goseva Samiti', gaushalaName: 'Hinganghat Goseva Samiti', city: 'Wardha', address: 'Hinganghat, Wardha, Maharashtra', totalCows: 310, description: 'Community-run gaushala producing A2 milk and panchagavya products.' },
];

// ─── MAIN SEED FUNCTION ─────────────────────────────────────────────────────

const nowPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

async function main() {
  console.log('🌱 Starting Poojly database seed (idempotent)...\n');

  // ── 1. Demo users ──
  console.log('👤 Upserting demo users + role assignments + subscriptions...');
  const userByEmail: Record<string, { id: string }> = {};
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { phone: u.phone, fullName: u.fullName, locationCity: u.locationCity, locationState: u.locationState },
      create: { phone: u.phone, email: u.email, fullName: u.fullName, preferredLanguage: 'hi', locationCity: u.locationCity, locationState: u.locationState, isNri: false, subscriptionTier: 'free' },
    });
    userByEmail[u.email] = { id: user.id };
    await prisma.userRoleAssignment.upsert({
      where: { userId_role: { userId: user.id, role: u.role } },
      update: { isPrimary: true },
      create: { userId: user.id, role: u.role, isPrimary: true },
    });
    if (u.role !== 'DEVOTEE' && u.role !== 'ADMIN') {
      const existing = await prisma.marketplaceSubscription.findFirst({ where: { userId: user.id, role: u.role, plan: 'FREE' } });
      if (!existing) {
        await prisma.marketplaceSubscription.create({ data: { userId: user.id, plan: 'FREE', role: u.role, startDate: new Date(), endDate: nowPlus(365), amount: 0, status: 'ACTIVE' } });
      }
    }
  }
  console.log(`  ✅ ${demoUsers.length} demo users ready`);

  // ── 2. Sample devotees ──
  console.log('👤 Upserting sample devotees + addresses...');
  const domesticUser = await prisma.user.upsert({
    where: { email: 'ram.sharma@example.com' },
    update: {},
    create: { phone: '+919876543210', email: 'ram.sharma@example.com', fullName: 'Ram Sharma', preferredLanguage: 'hi', locationCity: 'Varanasi', locationState: 'Uttar Pradesh', isNri: false, gotra: 'Bharadwaj', nakshatra: 'Pushya', rashi: 'Karka', subscriptionTier: 'bhakti_pass' },
  });
  const nriUser = await prisma.user.upsert({
    where: { email: 'priya.patel@example.com' },
    update: {},
    create: { phone: '+14155551234', email: 'priya.patel@example.com', fullName: 'Priya Patel', preferredLanguage: 'en', locationCity: 'San Francisco', locationState: 'California', isNri: true, nriCountry: 'USA', gotra: 'Kashyap', nakshatra: 'Rohini', rashi: 'Vrishabha', subscriptionTier: 'premium' },
  });
  const domesticAddr = await prisma.userAddress.findFirst({ where: { userId: domesticUser.id, label: 'home' } });
  if (!domesticAddr) {
    await prisma.userAddress.create({ data: { userId: domesticUser.id, label: 'home', line1: '42, Assi Ghat Road', line2: 'Near Tulsi Ghat', city: 'Varanasi', state: 'Uttar Pradesh', pincode: '221005', country: 'India', isDefault: true, lat: 25.2854, lng: 83.0056 } });
  }
  const nriAddr = await prisma.userAddress.findFirst({ where: { userId: nriUser.id, label: 'home' } });
  if (!nriAddr) {
    await prisma.userAddress.create({ data: { userId: nriUser.id, label: 'home', line1: '789 Mission Street', line2: 'Apt 12B', city: 'San Francisco', state: 'California', pincode: '94103', country: 'USA', isDefault: true, lat: 37.7857, lng: -122.4011 } });
  }

  // ── 3. Priests ──
  console.log('🙏 Upserting priests (3 approved + verified)...');
  const priestSeeds = [
    { email: 'pandit.shastri@example.com', phone: '+919999888877', fullName: 'Pandit Ramesh Shastri', locationCity: 'Varanasi', locationState: 'Uttar Pradesh', gotra: 'Vasishtha', displayName: 'Pandit Ramesh Shastri', specializations: ['Rudrabhishek', 'Maha Mrityunjay Jaap', 'Navgraha Shanti', 'Satyanarayan Katha'], languages: ['Hindi', 'Sanskrit', 'English'], experienceYears: 25, ratingAvg: 4.9, ratingCount: 347, bio: 'Vedic scholar from Varanasi with 25 years of experience in Shiva rituals.', avatarUrl: 'https://images.poojly.com/priests/pandit-ramesh-shastri.jpg' },
    { email: 'pandit.trivedi@example.com', phone: '+919999777766', fullName: 'Pandit Suresh Trivedi', locationCity: 'Puri', locationState: 'Odisha', gotra: 'Bharadwaj', displayName: 'Pandit Suresh Trivedi', specializations: ['Satyanarayan Katha', 'Ram Charit Manas Path', 'Sunderkand Path', 'Ganesh Puja'], languages: ['Hindi', 'Odia', 'Sanskrit', 'English'], experienceYears: 18, ratingAvg: 4.8, ratingCount: 213, bio: 'Experienced priest from Puri, specializing in Vaishnava traditions.', avatarUrl: 'https://images.poojly.com/priests/pandit-suresh-trivedi.jpg' },
    { email: 'pandit@demo.com', phone: '+919000000002', fullName: 'Demo Pandit', locationCity: 'Varanasi', locationState: 'Uttar Pradesh', gotra: 'Kashyap', displayName: 'Demo Pandit', specializations: ['Ganesh Puja', 'Lakshmi Puja', 'Hanuman Chalisa Path'], languages: ['Hindi', 'English'], experienceYears: 8, ratingAvg: 4.6, ratingCount: 42, bio: 'Demo pandit for testing.', avatarUrl: null },
  ];
  const priests: Array<{ id: string; email: string }> = [];
  for (const p of priestSeeds) {
    const u = await prisma.user.upsert({
      where: { email: p.email },
      update: { fullName: p.fullName },
      create: { phone: p.phone, email: p.email, fullName: p.fullName, preferredLanguage: 'hi', locationCity: p.locationCity, locationState: p.locationState, isNri: false, gotra: p.gotra, subscriptionTier: 'free' },
    });
    const priest = await prisma.priest.upsert({
      where: { userId: u.id },
      update: { displayName: p.displayName, specializations: p.specializations, languages: p.languages, experienceYears: p.experienceYears, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, isVerified: true, verificationStatus: 'approved', bio: p.bio, avatarUrl: p.avatarUrl },
      create: { userId: u.id, displayName: p.displayName, specializations: p.specializations, languages: p.languages, experienceYears: p.experienceYears, aadhaarVerified: true, ratingAvg: p.ratingAvg, ratingCount: p.ratingCount, isVerified: true, verificationStatus: 'approved', bio: p.bio, avatarUrl: p.avatarUrl, commissionRate: 0.70, status: 'active' },
    });
    priests.push({ id: priest.id, email: p.email });
  }
  console.log(`  ✅ ${priests.length} priests (approved + verified)`);

  // ── 3b. PanditProfile marketplace records ──
  console.log('🪔 Upserting PanditProfile marketplace records...');
  const panditProfileSeeds = [
    { userEmail: 'pandit.shastri@example.com', templeName: 'Kashi Vishwanath', experience: 25, specialties: ['Rudrabhishek', 'Maha Mrityunjay'], languages: ['Hindi','Sanskrit','English'], pricePerPuja: 1100, city: 'Varanasi', state: 'Uttar Pradesh' },
    { userEmail: 'pandit.trivedi@example.com', templeName: 'Jagannath Puri', experience: 18, specialties: ['Satyanarayan', 'Ram Charit Manas'], languages: ['Hindi','Odia','Sanskrit'], pricePerPuja: 901, city: 'Puri', state: 'Odisha' },
    { userEmail: 'pandit@demo.com', templeName: null, experience: 8, specialties: ['Ganesh Puja','Lakshmi Puja'], languages: ['Hindi','English'], pricePerPuja: 501, city: 'Varanasi', state: 'Uttar Pradesh' },
  ];
  for (const p of panditProfileSeeds) {
    const user = await prisma.user.findUnique({ where: { email: p.userEmail } });
    if (!user) continue;
    await prisma.panditProfile.upsert({
      where: { userId: user.id },
      update: { approved: true, approvedAt: new Date(), experience: p.experience, specialties: p.specialties, languages: p.languages, pricePerPuja: p.pricePerPuja, city: p.city, state: p.state, templeName: p.templeName ?? undefined },
      create: { userId: user.id, templeName: p.templeName ?? undefined, experience: p.experience, specialties: p.specialties, languages: p.languages, aadhaarVerified: true, pricePerPuja: p.pricePerPuja, city: p.city, state: p.state, approved: true, approvedAt: new Date() },
    });
    await prisma.userRoleAssignment.upsert({
      where: { userId_role: { userId: user.id, role: 'PANDIT' } },
      update: {},
      create: { userId: user.id, role: 'PANDIT' },
    });
  }
  console.log(`  ✅ ${panditProfileSeeds.length} pandit profiles`);

  // ── 4. Temples ──
  console.log('🛕 Upserting 5 temples...');
  const templeBySlug: Record<string, { id: string }> = {};
  for (const t of templesData) {
    const temple = await prisma.temple.upsert({
      where: { slug: t.slug },
      update: { name: t.name, nameLocal: t.nameLocal, description: t.description, deityPrimary: t.deityPrimary, deities: t.deities, tradition: t.tradition, addressLine: t.addressLine, city: t.city, state: t.state, pincode: t.pincode, lat: t.lat, lng: t.lng, phone: t.phone, email: t.email, websiteUrl: t.websiteUrl, images: t.images, timingInfo: t.timingInfo, isVerified: true, trustScore: t.trustScore, liveDarshanEnabled: t.liveDarshanEnabled, streamUrl: t.streamUrl, status: 'active' },
      create: { name: t.name, nameLocal: t.nameLocal, slug: t.slug, description: t.description, deityPrimary: t.deityPrimary, deities: t.deities, tradition: t.tradition, addressLine: t.addressLine, city: t.city, state: t.state, pincode: t.pincode, lat: t.lat, lng: t.lng, phone: t.phone, email: t.email, websiteUrl: t.websiteUrl, images: t.images, timingInfo: t.timingInfo, isVerified: true, verificationDate: new Date('2025-01-15'), trustScore: t.trustScore, liveDarshanEnabled: t.liveDarshanEnabled, streamUrl: t.streamUrl, status: 'active' },
    });
    templeBySlug[t.slug] = { id: temple.id };
  }
  console.log(`  ✅ ${templesData.length} temples`);

  // ── 5. Link priests to temples ──
  console.log('🔗 Linking priests to temples...');
  const priestIdByEmail = Object.fromEntries(priests.map(p => [p.email, p.id]));
  const templeIdBySlug = (slug: string) => templeBySlug[slug]!.id;
  const priestLinks = [
    { templeSlug: 'kashi-vishwanath-varanasi', priestEmail: 'pandit.shastri@example.com', isPrimary: true },
    { templeSlug: 'somnath-gujarat', priestEmail: 'pandit.shastri@example.com', isPrimary: false },
    { templeSlug: 'jagannath-puri', priestEmail: 'pandit.trivedi@example.com', isPrimary: true },
    { templeSlug: 'tirumala-tirupati', priestEmail: 'pandit.trivedi@example.com', isPrimary: false },
    { templeSlug: 'siddhivinayak-mumbai', priestEmail: 'pandit.shastri@example.com', isPrimary: true },
    { templeSlug: 'siddhivinayak-mumbai', priestEmail: 'pandit.trivedi@example.com', isPrimary: false },
    { templeSlug: 'siddhivinayak-mumbai', priestEmail: 'pandit@demo.com', isPrimary: false },
  ];
  for (const link of priestLinks) {
    const templeId = templeIdBySlug(link.templeSlug);
    const priestId = priestIdByEmail[link.priestEmail]!;
    await prisma.templePriest.upsert({
      where: { templeId_priestId: { templeId, priestId } },
      update: { isPrimary: link.isPrimary },
      create: { templeId, priestId, isPrimary: link.isPrimary },
    });
  }
  console.log(`  ✅ ${priestLinks.length} temple-priest links`);

  // ── 6. Puja types ──
  console.log('🙏 Upserting puja types...');
  const pujaTypeBySlug: Record<string, { id: string }> = {};
  for (const p of pujaTypesData) {
    const pt = await prisma.pujaType.upsert({
      where: { slug: p.slug },
      update: { name: p.name, nameLocal: p.nameLocal, description: p.description, category: p.category, deity: p.deity, durationMinutes: p.durationMinutes, basePrice: p.basePrice, nriPrice: p.nriPrice, samagriIncluded: p.samagriIncluded, samagriItems: p.samagriItems, images: p.images, videoProofMandatory: p.videoProofMandatory, sortOrder: p.sortOrder, isActive: true },
      create: { name: p.name, nameLocal: p.nameLocal, slug: p.slug, description: p.description, category: p.category, deity: p.deity, durationMinutes: p.durationMinutes, basePrice: p.basePrice, nriPrice: p.nriPrice, samagriIncluded: p.samagriIncluded, samagriItems: p.samagriItems, images: p.images, videoProofMandatory: p.videoProofMandatory, sortOrder: p.sortOrder, isActive: true },
    });
    pujaTypeBySlug[p.slug] = { id: pt.id };
  }
  console.log(`  ✅ ${pujaTypesData.length} puja types`);

  // ── 7. Temple-puja offerings ──
  console.log('📋 Upserting temple-puja offerings...');
  const offeringPlan: Record<string, string[]> = {
    'kashi-vishwanath-varanasi': ['rudrabhishek', 'maha-mrityunjay-jaap', 'navgraha-shanti-puja', 'sunderkand-path', 'hanuman-chalisa-path'],
    'tirumala-tirupati': ['satyanarayan-katha', 'lakshmi-puja', 'ganesh-puja', 'ram-charit-manas-path', 'navgraha-shanti-puja'],
    'siddhivinayak-mumbai': ['ganesh-puja', 'lakshmi-puja', 'navgraha-shanti-puja', 'satyanarayan-katha', 'hanuman-chalisa-path'],
    'somnath-gujarat': ['rudrabhishek', 'maha-mrityunjay-jaap', 'navgraha-shanti-puja', 'pitru-dosh-nivaran-puja', 'sunderkand-path'],
    'jagannath-puri': ['satyanarayan-katha', 'sunderkand-path', 'ram-charit-manas-path', 'hanuman-chalisa-path', 'ganesh-puja'],
  };
  const slots = ['06:00', '07:00', '08:00', '12:00', '13:00', '17:00', '18:00'];
  let offeringCount = 0;
  for (const [templeSlug, pujaSlugs] of Object.entries(offeringPlan)) {
    const templeId = templeIdBySlug(templeSlug);
    for (const pujaSlug of pujaSlugs) {
      const pujaTypeId = pujaTypeBySlug[pujaSlug]!.id;
      await prisma.templePujaOffering.upsert({
        where: { templeId_pujaTypeId: { templeId, pujaTypeId } },
        update: { availableSlots: slots, maxBookingsPerSlot: 5, isActive: true },
        create: { templeId, pujaTypeId, availableSlots: slots, maxBookingsPerSlot: 5, isActive: true },
      });
      offeringCount++;
    }
  }
  console.log(`  ✅ ${offeringCount} temple-puja offerings`);

  // ── 8. Content (aartis, chalisas, mantras, articles) ──
  console.log('📖 Upserting content items...');
  for (const c of contentData) {
    await prisma.contentItem.upsert({
      where: { slug: c.slug },
      update: {
        type: c.type, title: c.title, titleLocal: c.titleLocal, body: c.body,
        deity: c.deity, language: c.language, durationSeconds: c.durationSeconds,
        tags: c.tags, isPremium: c.isPremium, status: c.status,
        imageUrl: c.imageUrl, audioUrl: c.audioUrl, sortOrder: c.sortOrder,
      },
      create: {
        type: c.type, title: c.title, titleLocal: c.titleLocal, slug: c.slug, body: c.body,
        deity: c.deity, language: c.language, durationSeconds: c.durationSeconds,
        tags: c.tags, isPremium: c.isPremium, status: c.status,
        imageUrl: c.imageUrl, audioUrl: c.audioUrl,
        viewCount: 0, likeCount: 0, sortOrder: c.sortOrder,
        publishedAt: new Date('2025-12-01'),
      },
    });
  }
  console.log(`  ✅ ${contentData.length} content items`);

  // ── 9. Panchang ──
  console.log('📅 Upserting daily panchang...');
  for (const p of panchangData) {
    await prisma.dailyPanchang.upsert({
      where: { date: p.date },
      update: { tithi: p.tithi, nakshatra: p.nakshatra, yoga: p.yoga, karana: p.karana, sunrise: p.sunrise, sunset: p.sunset, rahuKaal: p.rahuKaal, shubhMuhurat: p.shubhMuhurat, festivals: p.festivals, vrat: p.vrat, specialInfo: p.specialInfo, locationCity: p.locationCity },
      create: { date: p.date, tithi: p.tithi, nakshatra: p.nakshatra, yoga: p.yoga, karana: p.karana, sunrise: p.sunrise, sunset: p.sunset, rahuKaal: p.rahuKaal, shubhMuhurat: p.shubhMuhurat, festivals: p.festivals, vrat: p.vrat, specialInfo: p.specialInfo, locationCity: p.locationCity },
    });
  }
  console.log(`  ✅ ${panchangData.length} panchang days`);

  // ── 10. Live darshan streams ──
  console.log('📹 Upserting live darshan stream configs...');
  const streamTemples = templesData.filter(t => t.liveDarshanEnabled);
  let streamCount = 0;
  for (const t of streamTemples) {
    const templeId = templeIdBySlug(t.slug);
    const existing = await prisma.liveDarshanStream.findFirst({ where: { templeId } });
    if (!existing) {
      await prisma.liveDarshanStream.create({ data: { templeId, streamKey: `stream_${t.slug}`, playbackUrl: `https://stream.poojly.com/${t.slug}/live.m3u8`, status: 'offline', isPremium: false } });
      streamCount++;
    }
  }
  console.log(`  ✅ ${streamCount} new live darshan stream configs`);

  // ── 11. Astrologers ──
  console.log('🔮 Upserting astrologers...');
  for (const a of astrologersData) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { fullName: a.fullName, phone: a.phone },
      create: { phone: a.phone, email: a.email, fullName: a.fullName, preferredLanguage: 'hi', isNri: false, subscriptionTier: 'free' },
    });
    await prisma.userRoleAssignment.upsert({ where: { userId_role: { userId: user.id, role: 'ASTROLOGER' } }, update: {}, create: { userId: user.id, role: 'ASTROLOGER' } });
    await prisma.astrologerProfile.upsert({
      where: { userId: user.id },
      update: { displayName: a.displayName, specialties: a.specialties, experience: a.experience, languages: a.languages, pricePerMinute: a.pricePerMinute, bio: a.bio, approved: true },
      create: { userId: user.id, displayName: a.displayName, specialties: a.specialties, experience: a.experience, languages: a.languages, pricePerMinute: a.pricePerMinute, bio: a.bio, approved: true },
    });
  }
  console.log(`  ✅ ${astrologersData.length} astrologers`);

  // ── 12. Wellness instructors ──
  console.log('🧘 Upserting wellness instructors...');
  for (const w of wellnessData) {
    const user = await prisma.user.upsert({
      where: { email: w.email },
      update: { fullName: w.fullName, phone: w.phone },
      create: { phone: w.phone, email: w.email, fullName: w.fullName, preferredLanguage: 'hi', isNri: false, subscriptionTier: 'free' },
    });
    await prisma.userRoleAssignment.upsert({ where: { userId_role: { userId: user.id, role: 'WELLNESS_INSTRUCTOR' } }, update: {}, create: { userId: user.id, role: 'WELLNESS_INSTRUCTOR' } });
    await prisma.wellnessProfile.upsert({
      where: { userId: user.id },
      update: { displayName: w.displayName, specialties: w.specialties, certifications: w.certifications, experience: w.experience, pricePerSession: w.pricePerSession, bio: w.bio, approved: true },
      create: { userId: user.id, displayName: w.displayName, specialties: w.specialties, certifications: w.certifications, experience: w.experience, pricePerSession: w.pricePerSession, bio: w.bio, approved: true },
    });
  }
  console.log(`  ✅ ${wellnessData.length} wellness instructors`);

  // ── 13. Gaushalas ──
  console.log('🐄 Upserting gaushalas...');
  for (const g of gaushalaData) {
    const user = await prisma.user.upsert({
      where: { email: g.email },
      update: { fullName: g.fullName, phone: g.phone },
      create: { phone: g.phone, email: g.email, fullName: g.fullName, preferredLanguage: 'hi', isNri: false, subscriptionTier: 'free' },
    });
    await prisma.userRoleAssignment.upsert({ where: { userId_role: { userId: user.id, role: 'GAUSHALA_MANAGER' } }, update: {}, create: { userId: user.id, role: 'GAUSHALA_MANAGER' } });
    await prisma.gaushalaProfile.upsert({
      where: { userId: user.id },
      update: { gaushalaName: g.gaushalaName, address: g.address, city: g.city, totalCows: g.totalCows, description: g.description, verified: true, approved: true },
      create: { userId: user.id, gaushalaName: g.gaushalaName, address: g.address, city: g.city, totalCows: g.totalCows, description: g.description, verified: true, approved: true },
    });
  }
  console.log(`  ✅ ${gaushalaData.length} gaushalas`);

  console.log('\n🎉 Seed completed successfully.');
  console.log('\nNOTE: Products live in MedusaJS (apps/medusa-store), not in the API Prisma schema.');
  console.log('      Seed those via MedusaJS admin or the medusa-store seed script.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
