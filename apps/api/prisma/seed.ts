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
      'https://images.darshya.online/temples/kashi-vishwanath/main.jpg',
      'https://images.darshya.online/temples/kashi-vishwanath/golden-spire.jpg',
      'https://images.darshya.online/temples/kashi-vishwanath/corridor.jpg',
      'https://images.darshya.online/temples/kashi-vishwanath/ganga-view.jpg',
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
    streamUrl: 'https://stream.darshya.online/kashi-vishwanath',
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
      'https://images.darshya.online/temples/tirumala-tirupati/main.jpg',
      'https://images.darshya.online/temples/tirumala-tirupati/gopuram.jpg',
      'https://images.darshya.online/temples/tirumala-tirupati/golden-vimana.jpg',
      'https://images.darshya.online/temples/tirumala-tirupati/laddu.jpg',
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
    streamUrl: 'https://stream.darshya.online/tirumala-tirupati',
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
      'https://images.darshya.online/temples/siddhivinayak/main.jpg',
      'https://images.darshya.online/temples/siddhivinayak/golden-dome.jpg',
      'https://images.darshya.online/temples/siddhivinayak/idol.jpg',
      'https://images.darshya.online/temples/siddhivinayak/entrance.jpg',
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
    streamUrl: 'https://stream.darshya.online/siddhivinayak',
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
      'https://images.darshya.online/temples/somnath/main.jpg',
      'https://images.darshya.online/temples/somnath/sea-view.jpg',
      'https://images.darshya.online/temples/somnath/evening.jpg',
      'https://images.darshya.online/temples/somnath/light-show.jpg',
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
      'https://images.darshya.online/temples/jagannath-puri/main.jpg',
      'https://images.darshya.online/temples/jagannath-puri/rath-yatra.jpg',
      'https://images.darshya.online/temples/jagannath-puri/nilachakra.jpg',
      'https://images.darshya.online/temples/jagannath-puri/mahaprasad.jpg',
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
    streamUrl: 'https://stream.darshya.online/jagannath-puri',
  },
  {
    name: 'Akshardham Temple',
    nameLocal: 'अक्षरधाम मंदिर',
    slug: 'akshardham-delhi',
    description: `Swaminarayan Akshardham in New Delhi is a Hindu mandir and spiritual-cultural campus on the banks of the Yamuna. Inaugurated in 2005, it showcases millennia of traditional Hindu and Indian culture, spirituality, and architecture.`,
    deityPrimary: 'Bhagwan Swaminarayan',
    deities: ['Bhagwan Swaminarayan', 'Radha-Krishna', 'Sita-Ram', 'Shiv-Parvati', 'Lakshmi-Narayan'],
    tradition: 'vaishnava' as const,
    addressLine: 'NH 24, Akshardham Setu, New Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110092',
    lat: 28.6127,
    lng: 77.2773,
    phone: '+91-11-43442344',
    email: 'info@akshardham.com',
    websiteUrl: 'https://akshardham.com',
    images: ['https://images.darshya.online/temples/akshardham-delhi/main.jpg'],
    timingInfo: { regularHours: { mandirOpen: '09:30 - 18:30', exhibitions: '10:00 - 18:00', musicalFountain: '19:15 - 19:45' }, closedOn: 'Mondays' },
    trustScore: 4.9,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'ISKCON Bangalore (Sri Radha Krishna-Chandra Mandir)',
    nameLocal: 'ಇಸ್ಕಾನ್ ದೇವಾಲಯ',
    slug: 'iskcon-bangalore',
    description: `Sri Radha Krishna-Chandra Mandir in Rajajinagar is one of the largest ISKCON temples in the world. Inaugurated in 1997, the temple is renowned for its grand architecture, devotional culture, and free Akshaya Patra mid-day meal program.`,
    deityPrimary: 'Lord Krishna',
    deities: ['Radha', 'Krishna', 'Lakshmi-Narasimha', 'Srinivasa Govinda', 'Prahlada-Narasimha'],
    tradition: 'vaishnava' as const,
    addressLine: 'Hare Krishna Hill, Chord Road, Rajajinagar, Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560010',
    lat: 13.0098,
    lng: 77.5511,
    phone: '+91-80-23471956',
    email: 'info@iskconbangalore.org',
    websiteUrl: 'https://iskconbangalore.org',
    images: ['https://images.darshya.online/temples/iskcon-bangalore/main.jpg'],
    timingInfo: { regularHours: { mangalaArati: '04:15 - 04:45', morningDarshan: '07:15 - 13:00', eveningDarshan: '16:15 - 20:30' }, closedOn: 'Open all days' },
    trustScore: 4.8,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.darshya.online/iskcon-bangalore',
  },
  {
    name: 'Kapaleeshwarar Temple',
    nameLocal: 'கபாலீஸ்வரர் கோயில்',
    slug: 'kapaleeshwarar-chennai',
    description: `Kapaleeshwarar Temple in Mylapore is a 7th-century Dravidian-style temple dedicated to Lord Shiva. It is one of the most revered Shiva temples in Tamil Nadu and a centerpiece of Mylapore's cultural and religious life.`,
    deityPrimary: 'Lord Shiva',
    deities: ['Lord Shiva (Kapaleeshwarar)', 'Karpagambal (Parvati)', 'Murugan', 'Ganesha'],
    tradition: 'shaiva' as const,
    addressLine: 'V Mada Street, Mylapore, Chennai',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600004',
    lat: 13.0339,
    lng: 80.2697,
    phone: '+91-44-24641670',
    email: null,
    websiteUrl: null,
    images: ['https://images.darshya.online/temples/kapaleeshwarar-chennai/main.jpg'],
    timingInfo: { regularHours: { morning: '05:30 - 12:00', evening: '16:00 - 22:00' }, specialDays: 'Arupathimoovar Festival in March-April', closedOn: 'Open all days' },
    trustScore: 4.7,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Dakshineswar Kali Temple',
    nameLocal: 'দক্ষিণেশ্বর কালীবাড়ি',
    slug: 'dakshineswar-kolkata',
    description: `Dakshineswar Kali Temple, founded in 1855 by Rani Rashmoni, sits on the eastern bank of the Hooghly. It is famed as the place where Sri Ramakrishna Paramahamsa attained his mystical visions of Goddess Kali.`,
    deityPrimary: 'Goddess Kali',
    deities: ['Goddess Kali (Bhavatarini)', 'Lord Shiva', 'Radha-Krishna'],
    tradition: 'shakta' as const,
    addressLine: 'Dakshineswar, Kolkata',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700076',
    lat: 22.6550,
    lng: 88.3578,
    phone: '+91-33-25645222',
    email: null,
    websiteUrl: 'https://dakshineswarkalitemple.org',
    images: ['https://images.darshya.online/temples/dakshineswar-kolkata/main.jpg'],
    timingInfo: { regularHours: { summer: '06:00 - 12:30, 15:00 - 20:30', winter: '06:30 - 12:30, 15:00 - 20:30' }, closedOn: 'Open all days' },
    trustScore: 4.8,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Birla Mandir Hyderabad',
    nameLocal: 'బిర్లా మందిర్',
    slug: 'birla-mandir-hyderabad',
    description: `Birla Mandir, built in 1976 entirely from white Rajasthani marble, stands atop the 280-foot Naubath Pahad in Hyderabad. The temple is dedicated to Lord Venkateswara and offers panoramic views of the twin cities.`,
    deityPrimary: 'Lord Venkateswara',
    deities: ['Lord Venkateswara', 'Padmavathi', 'Brahma', 'Saraswati'],
    tradition: 'vaishnava' as const,
    addressLine: 'Hill Fort Road, Khairatabad, Hyderabad',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500004',
    lat: 17.4062,
    lng: 78.4691,
    phone: '+91-40-23230203',
    email: null,
    websiteUrl: null,
    images: ['https://images.darshya.online/temples/birla-mandir-hyderabad/main.jpg'],
    timingInfo: { regularHours: { morning: '07:00 - 12:00', evening: '15:00 - 21:00' }, closedOn: 'Open all days' },
    trustScore: 4.6,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Dagdusheth Halwai Ganpati Temple',
    nameLocal: 'दगडूशेठ हलवाई गणपती मंदिर',
    slug: 'dagdusheth-pune',
    description: `Shrimant Dagdusheth Halwai Ganpati Mandir is one of the most revered Ganesh temples in India, founded in 1893. The 7.5-foot tall main idol is gilded with nearly 8 kg of gold and draws lakhs of devotees during Ganesh Chaturthi.`,
    deityPrimary: 'Lord Ganesha',
    deities: ['Lord Ganesha', 'Riddhi', 'Siddhi'],
    tradition: 'smarta' as const,
    addressLine: 'Budhwar Peth, Pune',
    city: 'Pune',
    state: 'Maharashtra',
    pincode: '411002',
    lat: 18.5167,
    lng: 73.8567,
    phone: '+91-20-24472448',
    email: 'info@dagdushethganpati.com',
    websiteUrl: 'https://dagdushethganpati.com',
    images: ['https://images.darshya.online/temples/dagdusheth-pune/main.jpg'],
    timingInfo: { regularHours: { open: '06:00 - 23:30' }, specialDays: 'Ganesh Chaturthi 10-day festival (Aug-Sep)', closedOn: 'Open all days' },
    trustScore: 4.9,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.darshya.online/dagdusheth-pune',
  },
  {
    name: 'Swaminarayan Akshardham Gandhinagar',
    nameLocal: 'સ્વામિનારાયણ અક્ષરધામ',
    slug: 'akshardham-gandhinagar',
    description: `Akshardham Gandhinagar, inaugurated in 1992, is a 23-acre cultural-spiritual complex dedicated to Bhagwan Swaminarayan. The 7-storey monument is built from 6,000 tonnes of pink Rajasthani sandstone without using steel.`,
    deityPrimary: 'Bhagwan Swaminarayan',
    deities: ['Bhagwan Swaminarayan', 'Aksharbrahma Gunatitanand Swami'],
    tradition: 'vaishnava' as const,
    addressLine: 'J Road, Sector 20, Gandhinagar (near Ahmedabad)',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382020',
    lat: 23.2375,
    lng: 72.6722,
    phone: '+91-79-23260001',
    email: 'info@akshardham.com',
    websiteUrl: 'https://akshardham.com/gujarat',
    images: ['https://images.darshya.online/temples/akshardham-gandhinagar/main.jpg'],
    timingInfo: { regularHours: { mandir: '09:30 - 18:30', sahajanandWaterShow: '19:15 - 20:00' }, closedOn: 'Mondays' },
    trustScore: 4.8,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Govind Dev Ji Temple',
    nameLocal: 'गोविंद देव जी मंदिर',
    slug: 'govind-dev-ji-jaipur',
    description: `Govind Dev Ji Temple inside the Jaipur City Palace complex enshrines a deity of Lord Krishna brought from Vrindavan in the late 17th century. Seven aartis a day are performed and the deity is regarded as the Ishta Devata of the erstwhile royal family of Jaipur.`,
    deityPrimary: 'Lord Krishna',
    deities: ['Govind Dev Ji (Krishna)', 'Radha'],
    tradition: 'vaishnava' as const,
    addressLine: 'Jalebi Chowk, City Palace, Jaipur',
    city: 'Jaipur',
    state: 'Rajasthan',
    pincode: '302002',
    lat: 26.9276,
    lng: 75.8243,
    phone: null,
    email: null,
    websiteUrl: 'https://govinddevji.net',
    images: ['https://images.darshya.online/temples/govind-dev-ji-jaipur/main.jpg'],
    timingInfo: { regularHours: { mangalaAarti: '04:30 - 05:00', dhupAarti: '07:45 - 09:00', shringarAarti: '09:30 - 10:30', rajbhog: '11:00 - 11:30', sandhyaAarti: '17:30 - 19:30', shayanAarti: '20:30 - 21:15' }, closedOn: 'Open all days' },
    trustScore: 4.8,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.darshya.online/govind-dev-ji-jaipur',
  },
  {
    name: 'Vaishno Devi Bhawan',
    nameLocal: 'माता वैष्णो देवी भवन',
    slug: 'vaishno-devi-katra',
    description: `Mata Vaishno Devi Bhawan, perched at 5,200 ft on the Trikuta Hills, is one of the most visited Hindu shrines in the world. Devotees trek 12 km from Katra to receive darshan of the three pindis representing Maha Kali, Maha Lakshmi, and Maha Saraswati.`,
    deityPrimary: 'Mata Vaishno Devi',
    deities: ['Maha Kali', 'Maha Lakshmi', 'Maha Saraswati'],
    tradition: 'shakta' as const,
    addressLine: 'Trikuta Hills, Katra',
    city: 'Katra',
    state: 'Jammu and Kashmir',
    pincode: '182301',
    lat: 33.0303,
    lng: 74.9489,
    phone: '+91-1991-234804',
    email: 'info@maavaishnodevi.org',
    websiteUrl: 'https://www.maavaishnodevi.org',
    images: ['https://images.darshya.online/temples/vaishno-devi-katra/main.jpg'],
    timingInfo: { regularHours: { yatra: '24x7 (subject to weather)' }, specialDays: 'Navratri (Mar-Apr & Sep-Oct)', closedOn: 'Open all days' },
    trustScore: 4.9,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.darshya.online/vaishno-devi-katra',
  },
  {
    name: 'Shirdi Sai Baba Samadhi Temple',
    nameLocal: 'श्री साईबाबा समाधी मंदिर',
    slug: 'shirdi-sai-baba',
    description: `Shri Saibaba Sansthan Trust at Shirdi houses the samadhi (final resting place) of Sai Baba of Shirdi, who lived from c.1838 to 1918. The temple draws over 60,000 devotees every day.`,
    deityPrimary: 'Sai Baba',
    deities: ['Sai Baba'],
    tradition: 'smarta' as const,
    addressLine: 'Sansthan Bhakta Nivasthan Road, Shirdi',
    city: 'Shirdi',
    state: 'Maharashtra',
    pincode: '423109',
    lat: 19.7645,
    lng: 74.4769,
    phone: '+91-2423-258500',
    email: 'helpdesk@sai.org.in',
    websiteUrl: 'https://www.sai.org.in',
    images: ['https://images.darshya.online/temples/shirdi-sai-baba/main.jpg'],
    timingInfo: { regularHours: { open: '04:00 - 23:15', kakad: '04:30 - 05:00', madhyana: '12:00 - 12:30', dhoop: '18:30 - 19:00', shej: '22:30 - 23:00' }, closedOn: 'Open all days' },
    trustScore: 4.9,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.darshya.online/shirdi-sai-baba',
  },
  {
    name: 'Ramanathaswamy Temple',
    nameLocal: 'ராமநாதசுவாமி கோயில்',
    slug: 'ramanathaswamy-rameshwaram',
    description: `Ramanathaswamy Temple on Rameshwaram island is one of the twelve Jyotirlinga shrines and one of the four Char Dham. The temple is famed for its 1,212-metre-long corridor — the longest in any Hindu temple — and 22 sacred theerthams (wells).`,
    deityPrimary: 'Lord Shiva',
    deities: ['Lord Shiva (Ramanathaswamy)', 'Parvathavardhini'],
    tradition: 'shaiva' as const,
    addressLine: 'East Car Street, Rameshwaram',
    city: 'Rameshwaram',
    state: 'Tamil Nadu',
    pincode: '623526',
    lat: 9.2881,
    lng: 79.3174,
    phone: '+91-4573-221343',
    email: null,
    websiteUrl: null,
    images: ['https://images.darshya.online/temples/ramanathaswamy-rameshwaram/main.jpg'],
    timingInfo: { regularHours: { morning: '05:00 - 13:00', evening: '15:00 - 21:00' }, closedOn: 'Open all days' },
    trustScore: 4.8,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Meenakshi Amman Temple',
    nameLocal: 'மீனாட்சி அம்மன் கோயில்',
    slug: 'meenakshi-madurai',
    description: `Arulmigu Meenakshi Sundareshwarar Temple in Madurai is a sprawling Dravidian temple complex dedicated to Goddess Meenakshi (Parvati) and her consort Sundareswarar (Shiva). Its 14 gopurams, including the 170-foot southern gopuram, are covered with thousands of vivid sculptures.`,
    deityPrimary: 'Goddess Meenakshi',
    deities: ['Meenakshi (Parvati)', 'Sundareshwarar (Shiva)'],
    tradition: 'shakta' as const,
    addressLine: 'Madurai Main, Madurai',
    city: 'Madurai',
    state: 'Tamil Nadu',
    pincode: '625001',
    lat: 9.9195,
    lng: 78.1194,
    phone: '+91-452-2344360',
    email: null,
    websiteUrl: 'https://maduraimeenakshi.org',
    images: ['https://images.darshya.online/temples/meenakshi-madurai/main.jpg'],
    timingInfo: { regularHours: { morning: '05:00 - 12:30', evening: '16:00 - 22:00' }, specialDays: 'Chithirai Festival (Apr-May)', closedOn: 'Open all days' },
    trustScore: 4.9,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Dwarkadhish Temple',
    nameLocal: 'દ્વારકાધીશ મંદિર',
    slug: 'dwarkadhish-dwarka',
    description: `Dwarkadhish Temple, also called Jagat Mandir, is a 5-storied 2,500-year-old shrine dedicated to Lord Krishna in his form as the King of Dwarka. It is one of the four Char Dham and one of the seven Sapta Puri sacred cities.`,
    deityPrimary: 'Lord Krishna',
    deities: ['Lord Krishna (Dwarkadhish)', 'Devaki', 'Vasudeva', 'Balarama', 'Subhadra'],
    tradition: 'vaishnava' as const,
    addressLine: 'Devbhoomi Dwarka',
    city: 'Dwarka',
    state: 'Gujarat',
    pincode: '361335',
    lat: 22.2380,
    lng: 68.9678,
    phone: null,
    email: null,
    websiteUrl: null,
    images: ['https://images.darshya.online/temples/dwarkadhish-dwarka/main.jpg'],
    timingInfo: { regularHours: { morning: '06:30 - 13:00', evening: '17:00 - 21:30' }, specialDays: 'Janmashtami (Aug-Sep)', closedOn: 'Open all days' },
    trustScore: 4.8,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Badrinath Temple',
    nameLocal: 'बद्रीनाथ मंदिर',
    slug: 'badrinath-uttarakhand',
    description: `Shri Badrinath Dham, situated at 3,133 m on the banks of the Alaknanda in the Garhwal Himalayas, is one of the four Char Dham and one of the 108 Divya Desams of Vaishnavism. The temple is open only six months a year (typically May to November) due to extreme winter conditions.`,
    deityPrimary: 'Lord Vishnu (Badrinarayan)',
    deities: ['Badrinarayan (Vishnu)', 'Nara-Narayan', 'Lakshmi', 'Garuda'],
    tradition: 'vaishnava' as const,
    addressLine: 'Badrinath, Chamoli district',
    city: 'Badrinath',
    state: 'Uttarakhand',
    pincode: '246422',
    lat: 30.7433,
    lng: 79.4938,
    phone: '+91-1389-222083',
    email: null,
    websiteUrl: 'https://badrinath-kedarnath.gov.in',
    images: ['https://images.darshya.online/temples/badrinath-uttarakhand/main.jpg'],
    timingInfo: { regularHours: { morning: '04:30 - 13:00', evening: '16:00 - 21:00' }, specialDays: 'Open May to November only; closed Nov to Apr (Akhand Jyoti during winter at Pandukeshwar)', closedOn: 'Closed in winter (approx Nov-Apr)' },
    trustScore: 4.9,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Lingaraj Temple',
    nameLocal: 'ଲିଙ୍ଗରାଜ ମନ୍ଦିର',
    slug: 'lingaraj-bhubaneswar',
    description: `Lingaraj Temple, built in the 11th century in the Kalinga style, is the largest temple in Bhubaneswar. The 180-foot vimana enshrines Harihara — a syncretic form of Vishnu and Shiva — and is the heart of Ekamra Kshetra.`,
    deityPrimary: 'Harihara',
    deities: ['Lingaraj (Shiva)', 'Vishnu', 'Parvati'],
    tradition: 'shaiva' as const,
    addressLine: 'Old Town, Lingaraj Nagar, Bhubaneswar',
    city: 'Bhubaneswar',
    state: 'Odisha',
    pincode: '751002',
    lat: 20.2381,
    lng: 85.8336,
    phone: null,
    email: null,
    websiteUrl: null,
    images: ['https://images.darshya.online/temples/lingaraj-bhubaneswar/main.jpg'],
    timingInfo: { regularHours: { morning: '05:00 - 12:30', evening: '15:30 - 21:30' }, specialDays: 'Shivaratri, Ashokashtami (Apr)', closedOn: 'Open all days (non-Hindus not permitted inside main sanctum)' },
    trustScore: 4.7,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
];

// ─── PUJA TYPES DATA ────────────────────────────────────────────────────────

const pujaTypesData = [
  { name: 'Rudrabhishek', nameLocal: 'रुद्राभिषेक', slug: 'rudrabhishek', description: 'Rudrabhishek is one of the most powerful Vedic rituals dedicated to Lord Shiva.', category: 'planetary' as const, deity: 'Lord Shiva', durationMinutes: 90, basePrice: 501, nriPrice: 2501, samagriIncluded: true, samagriItems: ['Bel patra', 'Dhatura', 'Milk', 'Honey', 'Curd', 'Ghee', 'Gangajal', 'Rudraksha mala'], images: ['https://images.darshya.online/pujas/rudrabhishek/main.jpg'], videoProofMandatory: true, sortOrder: 1 },
  { name: 'Ganesh Puja', nameLocal: 'गणेश पूजा', slug: 'ganesh-puja', description: 'Ganesh Puja is performed to invoke the blessings of Lord Ganesha, the remover of obstacles.', category: 'prosperity' as const, deity: 'Lord Ganesha', durationMinutes: 60, basePrice: 351, nriPrice: 1501, samagriIncluded: true, samagriItems: ['Modak', 'Durva grass', 'Red flowers', 'Sindoor', 'Coconut', 'Betel leaves', 'Jaggery'], images: ['https://images.darshya.online/pujas/ganesh-puja/main.jpg'], videoProofMandatory: true, sortOrder: 2 },
  { name: 'Satyanarayan Katha', nameLocal: 'सत्यनारायण कथा', slug: 'satyanarayan-katha', description: 'Satyanarayan Katha is a devotional ritual performed to seek the blessings of Lord Vishnu.', category: 'special_occasion' as const, deity: 'Lord Vishnu', durationMinutes: 120, basePrice: 751, nriPrice: 3001, samagriIncluded: true, samagriItems: ['Banana', 'Wheat flour', 'Sugar', 'Ghee', 'Tulsi', 'Panchamrit', 'Dry fruits', 'Yellow cloth'], images: ['https://images.darshya.online/pujas/satyanarayan-katha/main.jpg'], videoProofMandatory: true, sortOrder: 3 },
  { name: 'Maha Mrityunjay Jaap', nameLocal: 'महा मृत्युंजय जाप', slug: 'maha-mrityunjay-jaap', description: 'Maha Mrityunjay Jaap is a powerful chanting ritual dedicated to Lord Shiva as the conqueror of death.', category: 'health' as const, deity: 'Lord Shiva', durationMinutes: 180, basePrice: 1100, nriPrice: 5001, samagriIncluded: true, samagriItems: ['Rudraksha mala', 'Bel patra', 'White flowers', 'Ghee', 'Sesame seeds', 'Havan samagri', 'Camphor'], images: ['https://images.darshya.online/pujas/maha-mrityunjay/main.jpg'], videoProofMandatory: true, sortOrder: 4 },
  { name: 'Lakshmi Puja', nameLocal: 'लक्ष्मी पूजा', slug: 'lakshmi-puja', description: 'Lakshmi Puja is a sacred ritual dedicated to Goddess Lakshmi for wealth and prosperity.', category: 'prosperity' as const, deity: 'Goddess Lakshmi', durationMinutes: 60, basePrice: 451, nriPrice: 2001, samagriIncluded: true, samagriItems: ['Lotus flowers', 'Rice', 'Turmeric', 'Kumkum', 'Coins', 'Sweets', 'Red cloth', 'Kalash'], images: ['https://images.darshya.online/pujas/lakshmi-puja/main.jpg'], videoProofMandatory: true, sortOrder: 5 },
  { name: 'Navgraha Shanti Puja', nameLocal: 'नवग्रह शांति पूजा', slug: 'navgraha-shanti-puja', description: 'Navgraha Shanti Puja is performed to pacify the nine planetary deities.', category: 'planetary' as const, deity: 'Navagraha', durationMinutes: 120, basePrice: 901, nriPrice: 4001, samagriIncluded: true, samagriItems: ['Nine types of grains', 'Nine colored cloths', 'Havan samagri', 'Ghee', 'Navgraha yantra'], images: ['https://images.darshya.online/pujas/navgraha-shanti/main.jpg'], videoProofMandatory: true, sortOrder: 6 },
  { name: 'Sunderkand Path', nameLocal: 'सुंदरकांड पाठ', slug: 'sunderkand-path', description: 'Sunderkand Path is the devotional recitation of the fifth chapter of Ramcharitmanas.', category: 'daily' as const, deity: 'Lord Hanuman', durationMinutes: 150, basePrice: 501, nriPrice: 2001, samagriIncluded: true, samagriItems: ['Sindoor', 'Jasmine oil', 'Red flowers', 'Bundi laddoo', 'Betel leaves', 'Ramcharitmanas book'], images: ['https://images.darshya.online/pujas/sunderkand-path/main.jpg'], videoProofMandatory: true, sortOrder: 7 },
  { name: 'Hanuman Chalisa Path', nameLocal: 'हनुमान चालीसा पाठ', slug: 'hanuman-chalisa-path', description: 'Hanuman Chalisa Path involves the devotional recitation of the 40 verses by Goswami Tulsidas.', category: 'daily' as const, deity: 'Lord Hanuman', durationMinutes: 45, basePrice: 251, nriPrice: 1001, samagriIncluded: true, samagriItems: ['Sindoor', 'Jasmine oil', 'Red flowers', 'Bundi laddoo', 'Chola (red cloth)'], images: ['https://images.darshya.online/pujas/hanuman-chalisa/main.jpg'], videoProofMandatory: true, sortOrder: 8 },
  { name: 'Ram Charit Manas Path', nameLocal: 'रामचरित मानस पाठ', slug: 'ram-charit-manas-path', description: 'Ram Charit Manas Path is the complete recitation of the epic poem by Goswami Tulsidas.', category: 'special_occasion' as const, deity: 'Lord Ram', durationMinutes: 240, basePrice: 1501, nriPrice: 6001, samagriIncluded: true, samagriItems: ['Ramcharitmanas book', 'Tulsi mala', 'Yellow flowers', 'Fruits', 'Sweets', 'Ghee diya', 'Havan samagri'], images: ['https://images.darshya.online/pujas/ram-charit-manas/main.jpg'], videoProofMandatory: true, sortOrder: 9 },
  { name: 'Pitru Dosh Nivaran Puja', nameLocal: 'पितृ दोष निवारण पूजा', slug: 'pitru-dosh-nivaran-puja', description: 'Pitru Dosh Nivaran Puja is performed to alleviate the ancestral curse (Pitru Dosh).', category: 'memorial' as const, deity: 'Ancestors', durationMinutes: 150, basePrice: 1101, nriPrice: 5001, samagriIncluded: true, samagriItems: ['Black sesame seeds', 'Barley', 'Kusha grass', 'Rice', 'White cloth', 'Ghee', 'Havan samagri', 'Dakshina'], images: ['https://images.darshya.online/pujas/pitru-dosh-nivaran/main.jpg'], videoProofMandatory: true, sortOrder: 10 },
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
  { email: 'astro.vedic@darshya.online', phone: '+919811100001', fullName: 'Acharya Vinod Sharma', displayName: 'Acharya Vinod Sharma', specialties: ['Vedic', 'Kundali', 'Muhurat'], experience: 22, languages: ['Hindi', 'Sanskrit', 'English'], pricePerMinute: 25, bio: 'Vedic astrologer with 22 years of experience.' },
  { email: 'astro.tarot@darshya.online', phone: '+919811100002', fullName: 'Ritika Menon', displayName: 'Ritika Menon', specialties: ['Tarot', 'Angel Cards', 'Reiki'], experience: 9, languages: ['English', 'Hindi', 'Malayalam'], pricePerMinute: 18, bio: 'Certified Tarot reader and energy healer.' },
  { email: 'astro.numero@darshya.online', phone: '+919811100003', fullName: 'Dr. Mahesh Iyer', displayName: 'Dr. Mahesh Iyer', specialties: ['Numerology', 'Name Correction', 'Lo Shu Grid'], experience: 15, languages: ['English', 'Tamil', 'Hindi'], pricePerMinute: 20, bio: 'Numerology expert specializing in name corrections.' },
];

// ─── WELLNESS INSTRUCTORS ───────────────────────────────────────────────────

const wellnessData = [
  { email: 'wellness.yoga@darshya.online', phone: '+919811200001', fullName: 'Swami Atmananda', displayName: 'Swami Atmananda', specialties: ['Hatha Yoga', 'Pranayama'], certifications: ['RYT-500', 'Sivananda Certified'], experience: 20, pricePerSession: 800, bio: 'Traditional Hatha Yoga teacher from Rishikesh.' },
  { email: 'wellness.meditation@darshya.online', phone: '+919811200002', fullName: 'Ananya Desai', displayName: 'Ananya Desai', specialties: ['Vipassana', 'Mindfulness'], certifications: ['Goenka Vipassana Assistant'], experience: 11, pricePerSession: 600, bio: 'Mindfulness and Vipassana meditation guide.' },
  { email: 'wellness.ayurveda@darshya.online', phone: '+919811200003', fullName: 'Dr. Kavita Nair', displayName: 'Dr. Kavita Nair', specialties: ['Ayurveda Consultation', 'Panchakarma'], certifications: ['BAMS', 'MD Ayurveda'], experience: 17, pricePerSession: 1500, bio: 'BAMS doctor specializing in Ayurvedic consultations.' },
  { email: 'wellness.sound@darshya.online', phone: '+919811200004', fullName: 'Arjun Kapoor', displayName: 'Arjun Kapoor', specialties: ['Sound Healing', 'Mantra Chanting'], certifications: ['Himalayan Singing Bowl Cert.'], experience: 7, pricePerSession: 900, bio: 'Sound healer using Tibetan singing bowls.' },
  { email: 'wellness.breathwork@darshya.online', phone: '+919811200005', fullName: 'Neha Srinivasan', displayName: 'Neha Srinivasan', specialties: ['Breathwork', 'Kriya Yoga'], certifications: ['Isha Hatha Yoga Teacher'], experience: 6, pricePerSession: 550, bio: 'Breathwork and Kriya Yoga instructor.' },
];

// ─── GAUSHALAS ──────────────────────────────────────────────────────────────

const gaushalaData = [
  { email: 'gaushala.mathura@darshya.online', phone: '+919811300001', fullName: 'Shri Krishna Gaushala Trust', gaushalaName: 'Shri Krishna Gaushala', city: 'Mathura', address: 'Vrindavan Road, Mathura', totalCows: 420, description: 'Traditional gaushala near Vrindavan caring for indigenous breed cows.' },
  { email: 'gaushala.pathmeda@darshya.online', phone: '+919811300002', fullName: 'Pathmeda Gauseva Sansthan', gaushalaName: 'Pathmeda Gauseva Sansthan', city: 'Sanchore', address: 'Pathmeda, Jalore, Rajasthan', totalCows: 2800, description: 'One of India\'s largest gaushalas.' },
  { email: 'gaushala.hinganghat@darshya.online', phone: '+919811300003', fullName: 'Hinganghat Goseva Samiti', gaushalaName: 'Hinganghat Goseva Samiti', city: 'Wardha', address: 'Hinganghat, Wardha, Maharashtra', totalCows: 310, description: 'Community-run gaushala producing A2 milk and panchagavya products.' },
];

// ─── MAIN SEED FUNCTION ─────────────────────────────────────────────────────

const nowPlus = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

async function main() {
  console.log('🌱 Starting Darshya database seed (idempotent)...\n');

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
    { email: 'pandit.shastri@example.com', phone: '+919999888877', fullName: 'Pandit Ramesh Shastri', locationCity: 'Varanasi', locationState: 'Uttar Pradesh', gotra: 'Vasishtha', displayName: 'Pandit Ramesh Shastri', specializations: ['Rudrabhishek', 'Maha Mrityunjay Jaap', 'Navgraha Shanti', 'Satyanarayan Katha'], languages: ['Hindi', 'Sanskrit', 'English'], experienceYears: 25, ratingAvg: 4.9, ratingCount: 347, bio: 'Vedic scholar from Varanasi with 25 years of experience in Shiva rituals.', avatarUrl: 'https://images.darshya.online/priests/pandit-ramesh-shastri.jpg' },
    { email: 'pandit.trivedi@example.com', phone: '+919999777766', fullName: 'Pandit Suresh Trivedi', locationCity: 'Puri', locationState: 'Odisha', gotra: 'Bharadwaj', displayName: 'Pandit Suresh Trivedi', specializations: ['Satyanarayan Katha', 'Ram Charit Manas Path', 'Sunderkand Path', 'Ganesh Puja'], languages: ['Hindi', 'Odia', 'Sanskrit', 'English'], experienceYears: 18, ratingAvg: 4.8, ratingCount: 213, bio: 'Experienced priest from Puri, specializing in Vaishnava traditions.', avatarUrl: 'https://images.darshya.online/priests/pandit-suresh-trivedi.jpg' },
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
  console.log(`🛕 Upserting ${templesData.length} temples...`);
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
        imageUrl: c.imageUrl, audioUrl: c.audioUrl, videoUrl: c.videoUrl ?? null,
        sortOrder: c.sortOrder,
      },
      create: {
        type: c.type, title: c.title, titleLocal: c.titleLocal, slug: c.slug, body: c.body,
        deity: c.deity, language: c.language, durationSeconds: c.durationSeconds,
        tags: c.tags, isPremium: c.isPremium, status: c.status,
        imageUrl: c.imageUrl, audioUrl: c.audioUrl, videoUrl: c.videoUrl ?? null,
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
      await prisma.liveDarshanStream.create({ data: { templeId, streamKey: `stream_${t.slug}`, playbackUrl: `https://stream.darshya.online/${t.slug}/live.m3u8`, status: 'offline', isPremium: false } });
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
