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
      'https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/4/47/Annapurna_Entrance_of_kashi_vishwanath_temple.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/b/b0/Ganga_Dwar%2C_Gateway_of_Corridor_of_Kashi_Vishwanath_Temple%2C_Varanasi_2.webp',
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
    description: `Sri Venkateswara Swamy Temple at Tirumala is one of the most visited Hindu pilgrimage sites in the world, drawing an average of 50,000 to 100,000 devotees daily. Dedicated to Lord Venkateswara — a form of Vishnu who, according to scripture, descended on the Tirumala hills to redeem mankind in the Kali Yuga — the shrine is situated on the seventh peak (Venkatadri) of the Seshachalam Range at an altitude of 853 metres in Tirupati district, Andhra Pradesh.

The temple is built in Dravidian style and is believed to have existed since at least the 9th century, with successive Pallava, Chola, Pandya, and Vijayanagara rulers contributing to its expansion. The main deity is a self-manifested (svayambhu) idol of Lord Venkateswara standing in the Garbhagriha; the inner sanctum, the Ananda Nilayam, is crowned with a gilded vimana plated in pure gold. The temple's hereditary archakas perform six daily sevas in strict accordance with the Vaikhanasa Agama tradition.

The shrine is administered by Tirumala Tirupati Devasthanams (TTD), an independent trust under the Andhra Pradesh government. TTD operates an extensive online sevas booking system, free Annaprasadam halls (Matrusri Tarigonda Vengamamba Annaprasadam Complex) serving meals to all pilgrims, and the famed Tirupati Laddu prasadam, which holds a Geographical Indication tag. The Brahmotsavam in September–October and Vaikuntha Ekadashi (December–January) are the most attended festivals, when special "Vaikuntha Dwaram" darshan is offered.`,
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
      'https://upload.wikimedia.org/wikipedia/commons/4/4e/Tirumala_090615.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/d/d9/Tirumala_Venkateswara_temple_entrance_09062015.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/4/4a/Tirumala_View_from_srivari_padalu.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/5/5a/Sri_vari_swarana_radham879.jpg',
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
    description: `Shree Siddhivinayak Ganapati Mandir at Prabhadevi in Mumbai, Maharashtra is one of the most visited Hindu temples in India and one of the wealthiest religious institutions in Mumbai. The original small shrine was built on 19 November 1801 by Laxman Vithu Patil and Deubai Patil; the current sanctum and multi-storey structure date from a 1990s rebuilding by architect Sharad Athale.

The temple enshrines a 2.5-foot-tall black-stone idol of Ganesha carved from a single rock, with the trunk turned to the right — making it a "Siddhi-pith" (a seat where prayers are believed to be granted). The idol is flanked by Riddhi and Siddhi (consorts representing prosperity and fulfilment), and the sanctum's wooden doors and ceiling are inlaid with gold. The temple's distinctive five-tiered shikhara, painted in saffron and topped with a gilded kalash, is a Mumbai landmark.

The shrine is administered by the Shree Siddhivinayak Ganapati Mandir Trust (Prabhadevi), constituted in 1980, which channels surplus offerings into hospitals, schools, and disaster relief. Tuesdays — considered Ganesha's day — see the heaviest crowds, with queues stretching for hours; the temple operates a free online "Atithi Darshan" pass system and a paid VIP darshan to ease access. Ganesh Chaturthi (August–September) and Maghi Ganesh Jayanti (January–February) are observed with special abhishekam, processions, and round-the-clock darshan.`,
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
      'https://upload.wikimedia.org/wikipedia/commons/b/b9/Shree_Siddhivinayak_Temple_Mumbai.jpg',
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
    description: `Somnath Temple at Prabhas Patan near Veraval, Gujarat, sits on the western shore of the Arabian Sea and is revered as the first (Adi) among the twelve Jyotirlinga shrines of Lord Shiva. The current Chalukya-style structure was completed in 1951 under the supervision of Sardar Vallabhbhai Patel and K. M. Munshi, after the Government of Saurashtra acquired the site following Independence; it was consecrated by President Rajendra Prasad on 11 May 1951.

The temple's history stretches back to antiquity — references to Soma (the moon god) building a golden shrine here appear in the Skanda Purana and Shivapurana. It was repeatedly destroyed and rebuilt: most famously sacked by Mahmud of Ghazni in 1026, and again by armies of Alauddin Khalji, Muzaffar Shah I, Mahmud Begada, and Aurangzeb. The 1951 reconstruction in the Maru-Gurjara style features a 50-metre shikhara crowned with an 8.2-metre flagpole, the Nij Mandir housing the Jyotirlinga, and a Sabha Mandap supported by 50 ornate pillars.

Somnath is one of the four Dhams of Saurashtra and a Tirth Kshetra. A line on the temple's south wall indicates that there is no land between the shrine and Antarctica directly south. The temple administration is the Shree Somnath Trust, chaired by trustees including the Prime Minister of India. A Sound and Light Show ("Jay Somnath") is staged daily after sunset on the temple plinth, and Mahashivaratri and Karthik Purnima draw massive pilgrim gatherings.`,
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
      'https://upload.wikimedia.org/wikipedia/commons/1/10/Somanath_mandir_%28cropped%29.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/a/ac/Somanath_Temple.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/7/78/Ancient_Somnath_temple%2C_Veraval_Gujarat.jpg',
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
    description: `Shree Jagannath Temple in Puri, Odisha, is one of the four Char Dham pilgrimage sites established by Adi Shankaracharya in the 8th century, alongside Badrinath, Dwarka and Rameshwaram. Dedicated to Lord Jagannath ("Lord of the Universe"), a form of Vishnu worshipped together with his elder brother Balabhadra, sister Subhadra, and the Sudarshana Chakra, the present temple was built in the 12th century by King Anantavarman Chodaganga Deva of the Eastern Ganga dynasty and completed under his successor Anangabhima Deva III.

The temple is built in Kalinga architectural style on a raised platform on Nilachala (the Blue Mountain). Its 65-metre tall Vimana (deul) is one of the tallest in India and is crowned by the Nilachakra — an 8-spoked wheel of an alloy of eight metals — and a flag (patita pavana) that is hand-changed every evening by a hereditary climber. The Meghanada Pachira (compound wall) measures roughly 200 by 192 metres and encloses the main shrine, the Bhog Mandap, the Nata Mandir and the Jagamohan, plus over 30 subsidiary shrines.

The temple's three deities are uniquely carved from neem wood and are ritually re-made every 8, 12 or 19 years in a ceremony called Nabakalebara. The annual Rath Yatra (June–July) sees the deities drawn through Puri's streets in three colossal wooden chariots, an event that draws millions of devotees. The kitchen is one of the largest in the world, preparing Mahaprasad — 56 dishes (Chappan Bhog) cooked daily on wood fires in earthen pots and offered first to Jagannath. Non-Hindus are not permitted inside the main precinct; they may view the temple from the roof of nearby Raghunandan Library.`,
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
      'https://upload.wikimedia.org/wikipedia/commons/b/b7/Shri_Jagannath_temple.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/9/90/Bird_view_of_Jagannath_Temple%2C_Puri.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/a/ae/Singhadwara.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/2/20/Rath_Yatra_Puri_07-11027.jpg',
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/e/e9/Swaminarayan_Akshardham%2C_Delhi.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/3/33/Akshardham_Dome.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/9/98/Akshardham_Delhi_Ricky_W.jpg',
    ],
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/1/11/ISKCON_Banglaore_Temple.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/7/7f/Iskon_temple.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/6/61/Entrance_of_Iskcon_temple.jpg',
    ],
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/9/99/Kapaleeswarar1.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/e/eb/Mylapore_Kapaleeshwarar_temple_facade.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/f/f3/Kapaleeshwarar_Temple._Chennai._2010.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/0/00/Mylapore_tank_at_dawn_panorama.jpg',
    ],
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/3/32/Dakhineshwar_Temple_beside_the_Hoogly%2C_West_Bengal.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/b/b4/Dakshineswar_Kali_Temple_on_the_bank_River_Ganges.jpg',
    ],
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/3/3c/Birla_Mandir%2C_Hyderabad.png',
      'https://upload.wikimedia.org/wikipedia/commons/4/47/Birla_Temple_no_1.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/d/d8/BirlaMandir.jpg',
    ],
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/3/3d/Dagadusheth_Halwai_Ganpati_Temple_illuminated_2.jpg',
    ],
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/7/77/Akshardham_Gandhinagar_Gujarat.jpg',
    ],
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/7/74/Govind_dev_ji.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/7/7c/Govind_Dev_Ji_Temple_Inner_Side.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/5/54/Govind_Dev_Ji_Temple%2C_Jaipur%2C_20191218_1059_9091.jpg',
    ],
    timingInfo: { regularHours: { mangalaAarti: '04:30 - 05:00', dhupAarti: '07:45 - 09:00', shringarAarti: '09:30 - 10:30', rajbhog: '11:00 - 11:30', sandhyaAarti: '17:30 - 19:30', shayanAarti: '20:30 - 21:15' }, closedOn: 'Open all days' },
    trustScore: 4.8,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.darshya.online/govind-dev-ji-jaipur',
  },
  {
    name: 'Vaishno Devi Bhawan',
    nameLocal: 'माता वैष्णो देवी भवन',
    slug: 'vaishno-devi-katra',
    description: `Mata Vaishno Devi Bhawan, perched at an altitude of 5,200 feet (1,584 m) on the Trikuta Hills in the Reasi district of Jammu and Kashmir, is one of the most visited Hindu shrines in the world, drawing more than 8 million pilgrims annually. The shrine is dedicated to the goddess Vaishnavi, an aspect of Adi Shakti, who is worshipped in the form of three natural rock outcrops — pindis — representing Maha Kali, Maha Lakshmi, and Maha Saraswati housed inside a small holy cave (Garbhajun).

Pilgrims undertake a 13-kilometre uphill trek from the base camp at Katra, passing the way-station of Banganga (where the goddess is said to have shot an arrow into the earth to slake her thirst), the Charan Paduka (where she rested), and the Ardhkuwari cave (where she meditated for nine months). Onward routes include the older Himkoti track and the newer, gentler Tarakote Marg, opened in 2018 to ease congestion. Helicopter services from Katra to Sanjichhat and battery-operated cars and pony rides supplement the trek.

The shrine and its yatra are administered by the Shri Mata Vaishno Devi Shrine Board (SMVDSB), set up by an Act of the J&K Legislature in 1986. The board operates pilgrim accommodations at Katra, Adkuwari and the Bhawan, runs a yatra-registration counter (mandatory RFID slip), maintains skywalks and grills along the route, and funds hospitals and the Shri Mata Vaishno Devi University. Navratri (March–April and September–October) sees record footfalls; the cave's natural mouth is open year-round but yatra timings can be curtailed by snow or landslides.`,
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/c/c8/Vaishno_devi.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/d/d7/Vaishno_Devi_Bhawan_Facade_Lighting.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/b/b0/Snowfall_in_Vaishno_Devi.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/c/c2/Vaishno_Devi_Navratras.jpg',
    ],
    timingInfo: { regularHours: { yatra: '24x7 (subject to weather)' }, specialDays: 'Navratri (Mar-Apr & Sep-Oct)', closedOn: 'Open all days' },
    trustScore: 4.9,
    liveDarshanEnabled: true,
    streamUrl: 'https://stream.darshya.online/vaishno-devi-katra',
  },
  {
    name: 'Shirdi Sai Baba Samadhi Temple',
    nameLocal: 'श्री साईबाबा समाधी मंदिर',
    slug: 'shirdi-sai-baba',
    description: `The Samadhi Mandir at Shirdi, in the Ahmednagar district of Maharashtra, enshrines the burial place of Sai Baba of Shirdi (c. 1838 – 15 October 1918), the saint revered by both Hindus and Muslims and known for his teachings of "Shraddha" (faith) and "Saburi" (patience). Sai Baba lived for over six decades in a dilapidated mosque he called Dwarkamai and took mahasamadhi on Vijayadashami day in 1918; his body was interred in the Buty Wada — originally being built as a Krishna temple by the wealthy devotee Bapusaheb Buty — which was then re-consecrated as the Samadhi Mandir.

The temple complex covers over 200 acres and includes the Samadhi Mandir (housing Sai Baba's tomb and a 1.5-metre tall white-marble idol sculpted by Balaji Vasant Talim and installed in 1954), the Dwarkamai mosque, the Chavadi (where Baba slept on alternate nights), the Gurusthan (the neem tree under which he first appeared in Shirdi), Lendi Bagh (his garden), and the Khandoba Mandir. The mandir's silver-railed sanctum, gold-plated throne and main hall accommodating roughly 600 seated devotees were added in successive renovations.

The shrine and the village are administered by the Shri Saibaba Sansthan Trust (Shirdi), constituted in 1922 and reorganised under a 2004 Maharashtra Act. The trust runs free Prasadalaya meals, the Sai Baba Hospital, two pilgrim accommodation complexes, an online darshan-pass and aarti-booking system, and funds charitable programmes across Maharashtra. Daily attendance averages 60,000 and rises to over 300,000 on Ramnavami, Gurupurnima and Vijayadashami (Punyatithi). The four daily aartis — Kakad, Madhyana, Dhoop and Shej — are televised live and streamed online.`,
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/e/e4/Sai_baba_samadhi_mandir_.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/b/b1/Sai_gold_full.jpg',
    ],
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/8/84/Ramanathaswamy_temple7.JPG',
      'https://upload.wikimedia.org/wikipedia/commons/3/3e/Rameswaram_temple_%2811%29.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/0/06/43Rameswaram_The_Great_Corridor.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/a/a3/East_Gopura_of_Rameswaram_Temple.jpg',
    ],
    timingInfo: { regularHours: { morning: '05:00 - 13:00', evening: '15:00 - 21:00' }, closedOn: 'Open all days' },
    trustScore: 4.8,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Meenakshi Amman Temple',
    nameLocal: 'மீனாட்சி அம்மன் கோயில்',
    slug: 'meenakshi-madurai',
    description: `Arulmigu Meenakshi Sundareshwarar Temple in Madurai, Tamil Nadu, is a sprawling Dravidian temple complex dedicated to Goddess Meenakshi (a form of Parvati) and her consort Sundareshwarar (Shiva). The temple stands on the southern bank of the Vaigai River and forms the geographic and ritual heart of the old city, with the streets of Madurai laid out in concentric squares around it. The current structure was largely commissioned by the Nayak ruler Tirumalai Nayak (r. 1623–1659), although portions of the complex predate the 12th century.

The temple covers approximately 14 acres and is enclosed by high outer walls, pierced by 14 gopurams (gateway towers); the four outer rajagopurams rise to between 49 and 52 metres, with the South Gopuram (170 ft / 51.9 m) the tallest. Each gopuram is encrusted with thousands of brightly painted stucco sculptures of deities, demons, mythological scenes and animals — repainted and re-consecrated every 12 years in the Kumbabhishekam ceremony. Within the walls are two main shrines (Meenakshi and Sundareshwarar), the Golden Lotus Tank (Porthamarai Kulam), the famed 1,000-Pillar Hall (Aayiram Kaal Mandapam, now an art museum) and the Kambathadi Mandapam.

Daily worship follows the Shaiva Agama tradition, with six pujas a day; the night-time Palli Arai Pujai sees the deities ceremonially "put to bed" together. The 12-day Chithirai Festival in April–May, which re-enacts the celestial wedding of Meenakshi and Sundareshwarar, is the temple's largest annual event and draws over a million devotees. The temple is administered by the Hindu Religious and Charitable Endowments Department of the Tamil Nadu government. Non-Hindus are not permitted into the inner sanctums but may visit the outer prakarams and the museum.`,
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/6/65/India_Meenakshi_Temple.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/f/f4/Meenakshi_Amman_West_Tower.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/6/60/Madurai_Meenakshi_temple_shikhara.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg',
    ],
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/0/0c/Dwarakadheesh_Temple%2C_2014.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/9/90/Dwarakadheesh_temple%2C_Dwaraka.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/f/f2/Dwarka_Mandir.jpg',
    ],
    timingInfo: { regularHours: { morning: '06:30 - 13:00', evening: '17:00 - 21:30' }, specialDays: 'Janmashtami (Aug-Sep)', closedOn: 'Open all days' },
    trustScore: 4.8,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Badrinath Temple',
    nameLocal: 'बद्रीनाथ मंदिर',
    slug: 'badrinath-uttarakhand',
    description: `Shri Badrinath Dham, situated at an altitude of 3,133 m on the left bank of the Alaknanda river in Chamoli district of Uttarakhand's Garhwal Himalayas, is one of the four Char Dham pilgrimage sites of India and one of the 108 Divya Desams of the Sri Vaishnava tradition. The shrine is dedicated to Lord Badrinarayan — Vishnu seated in the Padmasana posture — and is flanked on either side by the twin peaks of Nar and Narayan, with the 6,560 m Neelkanth Parvat ("Garhwal Queen") as a backdrop.

According to the Bhagavata Purana, Vishnu performed severe penance at this site under a Badri (jujube) tree, while Lakshmi sheltered him from the sun in the form of the tree itself — hence the name "Badri-nath". The 1-metre-tall black stone (Shaligram) idol of Badrinarayan is said to have been recovered from the Alaknanda by Adi Shankaracharya in the 8th century and re-installed in the present three-storeyed temple, which was rebuilt by King Pradip Shah of Garhwal in the 17th century after damage by avalanches and rebuilt again after the 1803 Himalayan earthquake.

The temple opens annually in late April or early May (on a date set by the Tehri royal house) and closes in mid-November after Vijaya Dashami; during the six-month winter closure the deity is symbolically worshipped at Joshimath's Narsingh Temple, while an akhand jyoti (everlasting lamp) is left burning inside the main shrine. The site is administered by the Shri Badarinath–Shri Kedarnath Temple Committee under an Uttarakhand state Act. Pilgrims also bathe in the natural hot-water spring of Tapt Kund at the temple's base before darshan. The shrine is connected by NH-7 via Joshimath; the nearest railhead is Rishikesh (295 km) and helicopter services run from Dehradun in season.`,
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/f/f9/Badrinath_Temple_%2C_Uttarakhand.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/c/c4/Badri_Night.JPG',
    ],
    timingInfo: { regularHours: { morning: '04:30 - 13:00', evening: '16:00 - 21:00' }, specialDays: 'Open May to November only; closed Nov to Apr (Akhand Jyoti during winter at Pandukeshwar)', closedOn: 'Closed in winter (approx Nov-Apr)' },
    trustScore: 4.9,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
  {
    name: 'Lingaraj Temple',
    nameLocal: 'ଲିଙ୍ଗରାଜ ମନ୍ଦିର',
    slug: 'lingaraj-bhubaneswar',
    description: `Lingaraj Temple, built largely in the late 11th century during the reign of the Somavamsi king Jajati Keshari and completed under the Eastern Gangas, is the largest and most prominent temple in the old town of Bhubaneswar, Odisha. It marks the spiritual centre of Ekamra Kshetra — the ancient sacred precinct described in the Brahma Purana as one of the four chief Shaiva Tirthas of India alongside Kashi, Ujjain, and Pashupatinath.

The temple is a textbook example of Kalinga architecture, with its four classical components arranged on a single east–west axis: the Vimana (sanctum tower), the Jagamohana (assembly hall), the Nata Mandir (festival hall) and the Bhog Mandap (offering hall). The rekha-deul Vimana rises to roughly 55 metres (180 ft) and is intricately carved with miniature shikharas, narrative panels, and erotic figures characteristic of the Kalinga school. The presiding deity is a 2.5-metre-wide self-manifested rough-hewn stone — worshipped as Harihara, the syncretic union of Shiva ("Hari" being a Shaiva epithet here, despite its more common Vaishnava use) and Vishnu — bathed daily with water, milk and bhang.

The compound covers 250,000 sq ft, is enclosed by a 7-metre laterite wall, and houses over 50 minor shrines. The temple's Bindu Sagar tank, just to the north, plays a central role in the annual Ashokashtami festival in March–April when the deity Lingaraj is taken in procession to the Rameshwar Temple. The temple is administered by the Lingaraj Temple Trust under the Odisha government's Endowments Department. As at Jagannath Puri, non-Hindus are not allowed inside the precinct but may view the temple from a viewing platform on the outer compound wall, set up by the Archaeological Survey of India.`,
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
    images: [
      'https://upload.wikimedia.org/wikipedia/commons/8/88/Lingaraj_Temple%2C_Bhubaneswar.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/0/0b/Lingaraj_Temple_Complex.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/f/f3/11th_century_Lingaraja_temple%2C_Bhubaneswar_Odisha_India.jpg',
      'https://upload.wikimedia.org/wikipedia/commons/d/dc/Lingaraj_Temple_complex_at_dusk_during_Shivratri_2020.jpg',
    ],
    timingInfo: { regularHours: { morning: '05:00 - 12:30', evening: '15:30 - 21:30' }, specialDays: 'Shivaratri, Ashokashtami (Apr)', closedOn: 'Open all days (non-Hindus not permitted inside main sanctum)' },
    trustScore: 4.7,
    liveDarshanEnabled: false,
    streamUrl: null,
  },
];

// ─── PUJA TYPES DATA ────────────────────────────────────────────────────────

// Image sources: each main.jpg below points to a Wikimedia Commons image whose
// HTTP 200 was verified at seed-authoring time. Replace with R2-hosted assets
// once a curated stock library is signed off (see docs/launch-state.md).
const pujaTypesData = [
  {
    name: 'Rudrabhishek',
    nameLocal: 'रुद्राभिषेक',
    slug: 'rudrabhishek',
    description: 'Rudrabhishek is the ceremonial bathing of a Shiva linga performed while reciting the Shri Rudram and Chamakam hymns from the Krishna Yajurveda (Taittiriya Samhita 4.5 and 4.7). Composed of 11 anuvakas, the Shri Rudram invokes Rudra as Shiva — the auspicious one — and is traditionally chanted with Sanskrit svaras as the linga is bathed in eight liquids known together as Panchamrit Abhishek: Gangajal (Ganga water), milk, curd, ghee, honey, sugar-water, coconut water, and finally pure water. Devotees offer Bel patra (Aegle marmelos leaves) and Dhatura flowers — items considered most dear to Shiva according to the Shiva Purana, Vidyeshwara Samhita. Performed primarily on Mondays, Pradosham (13th tithi of every paksha), Maha Shivaratri, and during Shravan month, Rudrabhishek is undertaken to seek protection, dissolve negative karma, ease Mangal/Shani planetary afflictions in the natal chart, and cultivate inner steadiness. Our priests perform it traditionally from the Kashi Vishwanath sanctum tradition. The booking includes complete samagri, sankalp (intention-setting in your name and gotra), live abhishek with Sanskrit chanting, aarti, and a tamper-proof video of the entire ritual.',
    category: 'planetary' as const,
    deity: 'Lord Shiva',
    durationMinutes: 90,
    basePrice: 1100,
    nriPrice: 9999,
    samagriIncluded: true,
    samagriItems: ['Bel patra (Aegle marmelos)', 'Dhatura flowers', 'Cow milk (500ml)', 'Pure honey', 'Fresh curd', 'Cow ghee', 'Gangajal from Haridwar', 'Rudraksha mala (5 mukhi)', 'White and blue flowers', 'Sandalwood paste', 'Bhasma (sacred ash)', 'Camphor for aarti'],
    images: ['https://upload.wikimedia.org/wikipedia/commons/3/36/From_Abhisheka_To_Panchamrutha.jpg'],
    videoProofMandatory: true,
    sortOrder: 1,
  },
  {
    name: 'Ganesh Puja',
    nameLocal: 'गणेश पूजा',
    slug: 'ganesh-puja',
    description: 'Ganesh Puja invokes Lord Ganesha — Vighneshwara, the remover of obstacles, and Buddhipriya, lover of intellect — before any new venture, marriage, housewarming (griha pravesh), examinations, or business launch. The ritual follows the Shodashopachara (sixteen-step) sequence detailed in the Ganesha Purana and Mudgala Purana: avahana (invocation), asana (offering of seat), padya, arghya, achamana, snanam, vastra, yajnopavita, gandha (sandalwood), pushpa (red and yellow flowers), dhupa, deepa, naivedya (modak and laddoo), tambula (betel), pradakshina, and mantra-pushpanjali. The 21 Durva grass blades — a herb sacred to Ganesha — are offered with the 21 names from the Sankashtanasaka Stotra. Devotees recite the Ganapati Atharvashirsha 11 times during the puja for fulfilment of desires and removal of vighnas (obstacles). Auspicious dates include Ganesh Chaturthi, every Chaturthi tithi (4th lunar day), Wednesdays, and the start of any new endeavour. The booking covers full Shodashopachara, Sankalp in your name and gotra, recitation of 108 Ganesha names, aarti, and live HD video proof.',
    category: 'special_occasion' as const,
    deity: 'Lord Ganesha',
    durationMinutes: 60,
    basePrice: 751,
    nriPrice: 6999,
    samagriIncluded: true,
    samagriItems: ['Fresh Modak (21 pieces)', 'Durva grass (21 blades)', 'Red hibiscus flowers', 'Sindoor (vermillion)', 'Coconut with husk', 'Betel leaves and nuts', 'Jaggery and roasted gram', 'Janeu (sacred thread)', 'Yellow chandan paste', 'Camphor and incense', 'Ghee diya'],
    images: ['https://upload.wikimedia.org/wikipedia/commons/6/64/Ganesha_Basohli_miniature_circa_1730_Dubost_p73.jpg'],
    videoProofMandatory: true,
    sortOrder: 2,
  },
  {
    name: 'Satyanarayan Katha',
    nameLocal: 'सत्यनारायण कथा',
    slug: 'satyanarayan-katha',
    description: 'Satyanarayan Katha is the recitation of five chapters from the Skanda Purana, Reva Khanda, in which Sage Suta narrates how Lord Vishnu, in his form as Satya (Truth) Narayan, fulfils the genuine vows of devotees. The katha is structured as five adhyayas: (1) the merits of the vrat as taught by Narada, (2) the story of the poor Brahmin and the woodcutter, (3) the merchant Sadhu Vaishya and his daughter Kalavati, (4) the king Tungadhwaja, and (5) the cowherds of Vana. Each chapter ends with the punishment for forgetting the offered prasad and the restoration of fortune upon remembrance — a teaching on the gravity of vows kept and broken. The puja is traditionally performed on Purnima (full moon), Sankashti, after housewarming, weddings, business launches, or upon fulfilment of a vow. The Banana-leaf mandap (chhatra) houses a kalash, Lord Satyanarayan murti, Tulsi, and panchamrit. Sapatashati panchamrit prasad — wheat flour, sugar, ghee, banana, and milk in equal parts — is offered. The booking covers complete katha narration in Hindi/Sanskrit, full sankalp, prasad preparation, and certified video.',
    category: 'special_occasion' as const,
    deity: 'Lord Vishnu (Satyanarayan)',
    durationMinutes: 120,
    basePrice: 1501,
    nriPrice: 13999,
    samagriIncluded: true,
    samagriItems: ['Ripe bananas (5)', 'Wheat flour (500g)', 'Sugar (500g)', 'Cow ghee (250g)', 'Tulsi leaves', 'Panchamrit (5-nectar mix)', 'Mixed dry fruits', 'Yellow silk cloth', 'Banana leaves and stems for mandap', 'Coconut and kalash', 'Yellow flowers', 'Roli, Akshat, Janeu'],
    images: ['https://upload.wikimedia.org/wikipedia/commons/9/9f/Devotees.jpg'],
    videoProofMandatory: true,
    sortOrder: 3,
  },
  {
    name: 'Maha Mrityunjay Jaap',
    nameLocal: 'महा मृत्युंजय जाप',
    slug: 'maha-mrityunjay-jaap',
    description: 'The Maha Mrityunjaya Mantra — "Om Tryambakam Yajamahe Sugandhim Pushtivardhanam, Urvarukamiva Bandhanan Mrityor Mukshiya Mamritat" — is one of the oldest and most sacred mantras in Hinduism, occurring in the Rigveda (7.59.12), Yajurveda (3.60), and Atharvaveda (14.1.17). Attributed to Sage Markandeya and Rishi Vasishtha, it addresses Tryambaka — the three-eyed Rudra/Shiva — invoking liberation from the bondage of mrityu (mortality, illness, accident) just as a ripe cucumber is freed from its vine. A complete anushthan involves 1,25,000 (sava lakh) repetitions, traditionally performed over multiple days; our 3-hour booking covers a structured 11,000 jaap (one round) which is the prescribed sankhya for ailment-relief, recovery from prolonged illness, removal of premature-death yogas in the natal chart (especially Markesh dasha), and protection from chronic Saturn-Rahu afflictions. Recitation is done with a Rudraksha mala, with sankalp in the patient/devotee\'s name, gotra, nakshatra, and rashi, followed by Havan with til (sesame), bilva, and ghee, concluding with aarti and prasad distribution. Full HD video proof is provided.',
    category: 'health' as const,
    deity: 'Lord Shiva (Tryambaka)',
    durationMinutes: 180,
    basePrice: 2501,
    nriPrice: 22999,
    samagriIncluded: true,
    samagriItems: ['Rudraksha mala (108 beads, 5-mukhi)', 'Bel patra (108 leaves)', 'White lotus and chameli flowers', 'Cow ghee (500g)', 'Black and white sesame seeds (til)', 'Havan samagri mix (250g)', 'Camphor', 'Mahamrityunjaya yantra (copper)', 'Bhasma', 'Gangajal'],
    images: ['https://upload.wikimedia.org/wikipedia/commons/3/30/1_Om.svg'],
    videoProofMandatory: true,
    sortOrder: 4,
  },
  {
    name: 'Lakshmi Puja',
    nameLocal: 'लक्ष्मी पूजा',
    slug: 'lakshmi-puja',
    description: 'Lakshmi Puja invokes Goddess Mahalakshmi, consort of Lord Vishnu, who manifests in eight forms (Ashta Lakshmi): Adi, Dhana, Dhanya, Gaja, Santana, Veera, Vijaya, and Vidya Lakshmi — described in the Sri Suktam (Rigveda Khilani 5.87) and Lakshmi Tantra. The puja involves invocation of the Goddess into a kalash (water-pot) decorated with mango leaves and topped with a coconut, recitation of the Sri Suktam (16 hymns), Kanakadhara Stotram by Adi Shankaracharya, the Ashtalakshmi Stotram, and 108 chants of "Om Shreem Mahalakshmaye Namah". Traditionally performed on Diwali Amavasya (Lakshmi Pujan night), Akshaya Tritiya, Varalakshmi Vratam Friday in Shravan, and on Fridays generally. The Goddess is offered lotus flowers (her favourite), kheer, makhana, and yellow rice. Coins, account books, and new utensils are placed before her for blessing. The booking includes Shri Suktam recitation, Kanakadhara Stotram, full Shodashopachara puja, prasad, and verified video proof. Pairs well with Kuber Puja for business prosperity, debt removal, and stable cash-flow.',
    category: 'prosperity' as const,
    deity: 'Goddess Lakshmi',
    durationMinutes: 75,
    basePrice: 901,
    nriPrice: 8499,
    samagriIncluded: true,
    samagriItems: ['Pink lotus flowers (5)', 'Akshat (unbroken rice)', 'Turmeric powder', 'Kumkum (red sindoor)', 'Silver coins (5)', 'Pedha and kheer', 'Red silk cloth', 'Brass kalash with coconut', 'Mango leaves', 'Cowries (kaudi)', 'Dhoop, deep, agarbatti'],
    images: ['https://upload.wikimedia.org/wikipedia/commons/a/a6/Raja_Ravi_Varma%2C_Goddess_Lakshmi%2C_1896.jpg'],
    videoProofMandatory: true,
    sortOrder: 5,
  },
  {
    name: 'Navgraha Shanti Puja',
    nameLocal: 'नवग्रह शांति पूजा',
    slug: 'navgraha-shanti-puja',
    description: 'Navgraha Shanti Puja is the comprehensive ritual to pacify the nine planetary deities — Surya (Sun), Chandra (Moon), Mangal (Mars), Budh (Mercury), Brihaspati (Jupiter), Shukra (Venus), Shani (Saturn), Rahu (north node), and Ketu (south node) — described in the Brihat Parashara Hora Shastra and Yajnavalkya Smriti. Each graha is invoked into its prescribed metal-yantra, dressed in its prescribed colour, fed its prescribed grain, and pacified with its prescribed beej mantra (108 times each, totalling 972 chants), wood-samidha for havan, and dakshina. This puja is recommended after a Vedic kundli analysis reveals dosha (Mangal/Shani/Kaal Sarp/Sade Sati), or as preventive shanti during sub-period (antardasha) transitions. Performed across 2 hours, it includes Sankalp in the devotee\'s name, gotra, nakshatra, and rashi; recitation of Navgraha Stotram (Vyasa); 108 beej-mantra chants per planet; havan with the nine prescribed samidhas; and concluding aarti. The booking includes full materials, certified Vedic priest, Navgraha yantra (which the devotee may install at home), and HD video. Best results when performed during Sankashti, Purnima, or one\'s own birth nakshatra.',
    category: 'planetary' as const,
    deity: 'Navagraha (Nine Planets)',
    durationMinutes: 120,
    basePrice: 2101,
    nriPrice: 18999,
    samagriIncluded: true,
    samagriItems: ['Nine grains (wheat, rice, toor, mung, chana, urad, sesame, horsegram, kulthi)', 'Nine coloured cloths', 'Nine samidha woods (arka, palash, khadir, apamarga, peepal, audumbara, shami, doob, kusha)', 'Havan samagri', 'Cow ghee (500g)', 'Navgraha copper yantra', 'Camphor and dhoop', 'Roli, akshat, kalava', 'Coconut and kalash'],
    images: ['https://upload.wikimedia.org/wikipedia/commons/9/92/Navagraha.jpg'],
    videoProofMandatory: true,
    sortOrder: 6,
  },
  {
    name: 'Sunderkand Path',
    nameLocal: 'सुंदरकांड पाठ',
    slug: 'sunderkand-path',
    description: 'Sunderkand is the fifth and most beloved kanda (book) of Goswami Tulsidas\'s Ramcharitmanas (composed 1574 CE in Awadhi), narrating Hanuman\'s heroic journey across the ocean to Lanka, his discovery of Sita in the Ashok Vatika, the burning of Lanka, and his return to Lord Rama. Of the seven kandas, Sunderkand is the only one named for its inherent beauty (sundara) rather than for plot or place — and it is the only kanda traditionally read independently for results. Comprising 60 dohas, 504 chaupais, and 5 chhands, a complete recitation takes approximately 2.5 hours when chanted with proper laya and bhava. Tulsidas himself promised that those who recite Sunderkand "with love" gain courage in adversity, removal of fear, success in pending matters, deliverance from Sade Sati and Shani Dhaiya, marital harmony, and freedom from black-magic afflictions — for Hanuman is the kalyug-jagrut deity and Sunderkand is his charit. Traditionally performed on Tuesdays, Saturdays, on Hanuman Jayanti, and during the 41-day Mangalwar anushthan. The booking covers complete recitation, Hanuman aarti, prasad, and HD video.',
    category: 'special_occasion' as const,
    deity: 'Lord Hanuman',
    durationMinutes: 150,
    basePrice: 1101,
    nriPrice: 9999,
    samagriIncluded: true,
    samagriItems: ['Sindoor (chola material)', 'Jasmine (chameli) oil', 'Red roses and gendha flowers', 'Bundi laddoo (boondi)', 'Betel leaves and nuts', 'Ramcharitmanas (Sunderkand) book', 'Red cloth', 'Ghee diya and dhoop', 'Tulsi mala', 'Camphor'],
    images: ['https://upload.wikimedia.org/wikipedia/commons/7/7e/Hanuman%27s_visit%2C_in_bazaar_art_with_a_Marathi_caption%2C_early_1900s.jpg'],
    videoProofMandatory: true,
    sortOrder: 7,
  },
  {
    name: 'Hanuman Chalisa Path',
    nameLocal: 'हनुमान चालीसा पाठ',
    slug: 'hanuman-chalisa-path',
    description: 'The Hanuman Chalisa is a 40-verse Awadhi devotional poem composed by Goswami Tulsidas (c. 1532-1623 CE), arguably the most-recited Hindu devotional text in the world today. The composition consists of 2 introductory dohas, 40 chaupais (the chalisa proper), and 1 concluding doha, totalling 43 verses. Each chaupai praises an aspect of Hanuman ji — his strength (verses 7, 25), wisdom (3, 22), devotion to Rama (8, 9), service to Sita (16), valour at Lanka (17-19), and his unique role as kaliyug ke sankat-mochan — the remover of distress in the present age. The Chalisa is famously cited in verse 36: "Sankat te Hanuman chhudave, mana, krama, vachan dhyana jo lave" — "Hanuman delivers from all distress one who remembers him in thought, deed, and word". A standard 11-paath anushthan takes 45 minutes and is recommended on Tuesdays, Saturdays, Hanuman Jayanti, during Sade Sati or Shani Dhaiya, before exams, court hearings, or any significant undertaking. The booking includes 11 paaths with proper laya, Bajrang Baan, Hanuman aarti, prasad of bundi laddoo, and certified HD video.',
    category: 'daily' as const,
    deity: 'Lord Hanuman',
    durationMinutes: 45,
    basePrice: 451,
    nriPrice: 3999,
    samagriIncluded: true,
    samagriItems: ['Sindoor (vermilion)', 'Jasmine oil', 'Red flowers (rose, gendha)', 'Bundi laddoo', 'Red chola cloth', 'Tulsi mala', 'Ghee diya', 'Camphor', 'Hanuman Chalisa printed copy'],
    images: ['https://upload.wikimedia.org/wikipedia/commons/7/70/Hanuman_Chalisa_img.jpg'],
    videoProofMandatory: true,
    sortOrder: 8,
  },
  {
    name: 'Ram Charit Manas Path',
    nameLocal: 'रामचरित मानस पाठ',
    slug: 'ram-charit-manas-path',
    description: 'Ramcharitmanas — "the lake of the deeds of Rama" — is the magnum opus of Goswami Tulsidas, composed in Awadhi at Varanasi between 1574 and 1577 CE. Spanning seven kandas (Bal, Ayodhya, Aranya, Kishkindha, Sundar, Lanka, and Uttar), the work contains approximately 12,800 verses across 1073 dohas, 4608 chaupais, and 86 chhands. While a full Akhand Path requires 9 days (Navah-paray) of continuous recitation, our 4-hour booking covers a Sankshipt (abridged) Sampurna Path that recites the principal dohas and chaupais of all seven kandas with sankalp, mangalacharan, beej-mantra of each kanda, kanda-end aarti, and concluding pushpanjali. This puja is traditionally undertaken on Ram Navami, during Chaitra Navratri, on the anniversary of a deceased family member as paap-prayaschitta, before major life transitions, or as a 9-day household anushthan during Magha or Shravan. Tulsidas himself stated in the Bal Kanda that this Manas removes the threefold afflictions (taap-traya) and grants Rama-bhakti — the supreme goal. The booking includes full sankalp, abridged sampurna path, havan, aarti, prasad of fruits and panjiri, and HD video.',
    category: 'special_occasion' as const,
    deity: 'Lord Rama',
    durationMinutes: 240,
    basePrice: 3501,
    nriPrice: 31999,
    samagriIncluded: true,
    samagriItems: ['Ramcharitmanas full edition (Gita Press)', 'Tulsi mala (108 beads)', 'Yellow marigold and tulsi flowers', 'Mixed seasonal fruits (5kg)', 'Pedha, panjiri, kheer', 'Cow ghee diya', 'Havan samagri (1kg)', 'Yellow silk cloth', 'Coconut and kalash', 'Camphor and dhoop'],
    images: ['https://upload.wikimedia.org/wikipedia/commons/7/7f/R%C4%81macaritam%C4%81nasa_manuscript_%2819th_century%29.png'],
    videoProofMandatory: true,
    sortOrder: 9,
  },
  {
    name: 'Pitru Dosh Nivaran Puja',
    nameLocal: 'पितृ दोष निवारण पूजा',
    slug: 'pitru-dosh-nivaran-puja',
    description: 'Pitru Dosh Nivaran Puja relieves the karmic affliction (dosha) caused by unfulfilled obligations to departed ancestors — known as Pitru Rin (ancestral debt) and detailed in the Garuda Purana, Pretakanda. Astrologically, Pitru Dosh manifests when Surya (representing the father), the 9th house, or Rahu/Ketu in the natal chart fall under specific affliction patterns; symptomatically, it can present as repeated obstacles in marriage, childbirth difficulties, recurring family quarrels, ancestral property disputes, and unexplained career setbacks. The remedy combines Tarpan (water-libation with black sesame, barley, and kusha grass), Pinda Daan (offering of cooked-rice balls), Tripindi Shraddh (for three generations of forgotten ancestors), Brahmin bhojan, and havan with Pitru Sukta from the Rigveda Mandala 10.15. Traditionally performed at recognised tirthas — Gaya (the supreme tirtha for shraddh as per Vayu Purana), Trimbakeshwar, Pushkar, or the Ganga ghats of Varanasi — and timed to Pitru Paksha (15-day Krishna Paksha of Bhadrapada), the deceased\'s death-tithi, Mahalaya Amavasya, or solar/lunar eclipses. Our booking is performed at Gaya by qualified Gayawal pandas, covers full Tripindi Shraddh, Pinda Daan, brahmin bhojan, and HD video proof.',
    category: 'memorial' as const,
    deity: 'Pitru Devata (Ancestors)',
    durationMinutes: 180,
    basePrice: 2501,
    nriPrice: 22999,
    samagriIncluded: true,
    samagriItems: ['Black sesame seeds (til)', 'Barley (jau)', 'Kusha grass', 'Rice (akshat) for pinda', 'White cotton cloth', 'Cow ghee', 'Havan samagri', 'Brahmin dakshina', 'Banana leaves', 'Earthen lamps and pots', 'Gangajal', 'Crow/cow food (offerings)'],
    images: ['https://upload.wikimedia.org/wikipedia/commons/9/96/Pinda_Daan_-_Jagannath_Ghat_-_Kolkata_2012-10-15_0701.JPG'],
    videoProofMandatory: true,
    sortOrder: 10,
  },
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
