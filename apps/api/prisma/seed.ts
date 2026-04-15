import { PrismaClient, Language, Tradition, TempleStatus, PujaCategory, ContentType, ContentStatus, PriestVerificationStatus, PriestStatus } from '@prisma/client';

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
      'https://images.bhaktisetu.com/temples/kashi-vishwanath/main.jpg',
      'https://images.bhaktisetu.com/temples/kashi-vishwanath/golden-spire.jpg',
      'https://images.bhaktisetu.com/temples/kashi-vishwanath/corridor.jpg',
      'https://images.bhaktisetu.com/temples/kashi-vishwanath/ganga-view.jpg',
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
    streamUrl: 'https://stream.bhaktisetu.com/kashi-vishwanath',
  },
  {
    name: 'Tirumala Tirupati Devasthanam',
    nameLocal: 'తిరుమల తిరుపతి దేవస్థానం',
    slug: 'tirumala-tirupati',
    description: `Sri Venkateswara Temple at Tirumala is the most visited religious place in the world. Dedicated to Lord Venkateswara, a form of Lord Vishnu, it is situated on the seventh peak (Venkatadri) of Tirumala Hills in Tirupati, Andhra Pradesh. The temple is also known as the "Temple of Seven Hills" and is the richest temple in the world by donations received.

The temple's history dates back over 2,000 years, with the earliest references found in Tamil Sangam literature. The main idol of Lord Venkateswara, also called Balaji, is believed to be self-manifested (Swayambhu). The deity is adorned with priceless jewels, and the famous Laddu prasadam of Tirupati is known worldwide for its unique taste and divine significance.

Millions of devotees visit the temple each year, with the Tirumala Tirupati Devasthanams (TTD) trust managing the temple operations. The temple is renowned for its elaborate rituals, the famous hair-offering tradition (tonsuring), and the Brahmotsavam festival celebrated annually. The Suprabhatam (morning prayer) sung at 3 AM daily is one of the most sacred rituals.`,
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
      'https://images.bhaktisetu.com/temples/tirumala-tirupati/main.jpg',
      'https://images.bhaktisetu.com/temples/tirumala-tirupati/gopuram.jpg',
      'https://images.bhaktisetu.com/temples/tirumala-tirupati/golden-vimana.jpg',
      'https://images.bhaktisetu.com/temples/tirumala-tirupati/laddu.jpg',
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
    streamUrl: 'https://stream.bhaktisetu.com/tirumala-tirupati',
  },
  {
    name: 'Siddhivinayak Temple',
    nameLocal: 'सिद्धिविनायक मंदिर',
    slug: 'siddhivinayak-mumbai',
    description: `Shree Siddhivinayak Ganapati Mandir is a Hindu temple dedicated to Lord Ganesha, located at Prabhadevi in Mumbai, Maharashtra. Built in 1801 by Laxman Vithu and Deubai Patil, the temple is one of the richest and most visited temples in Mumbai. The deity is referred to as "Navasacha Ganpati" (the Ganesh who fulfills wishes), drawing millions of devotees seeking blessings for new beginnings.

The original temple was a small 15x15 feet structure with a dome-shaped shikhara. Over the years, it has been renovated and expanded significantly. The inner roof of the sanctum is gold-plated, and the wooden doors are carved with images of the Ashtavinayak (eight manifestations of Ganesha). The idol of Siddhivinayak is unique because the trunk of the elephant god turns to the right, unlike most Ganesha idols where it turns left.

The temple witnesses especially heavy footfall on Tuesdays, which is considered auspicious for Ganesha worship. Celebrities, politicians, and common devotees alike throng the temple for blessings. The temple trust runs several charitable activities and the Siddhivinayak temple has become a cultural landmark of Mumbai, symbolizing the city's deep spiritual roots amidst its modern cosmopolitan character.`,
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
      'https://images.bhaktisetu.com/temples/siddhivinayak/main.jpg',
      'https://images.bhaktisetu.com/temples/siddhivinayak/golden-dome.jpg',
      'https://images.bhaktisetu.com/temples/siddhivinayak/idol.jpg',
      'https://images.bhaktisetu.com/temples/siddhivinayak/entrance.jpg',
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
    streamUrl: 'https://stream.bhaktisetu.com/siddhivinayak',
  },
  {
    name: 'Somnath Temple',
    nameLocal: 'सोमनाथ मंदिर',
    slug: 'somnath-gujarat',
    description: `Somnath Temple, located at the shore of the Arabian Sea in Prabhas Patan near Veraval in Gujarat, is one of the most sacred pilgrimage sites for Hindus. It is the first among the twelve Jyotirlinga shrines of Lord Shiva. The name Somnath means "Lord of the Moon" — referring to the legend where the Moon God Chandra prayed to Lord Shiva here to be freed from a curse.

The temple has a tumultuous history of being destroyed and rebuilt multiple times. It was attacked and plundered by Mahmud of Ghazni in 1024 CE, and subsequently destroyed several more times by various invaders. Each time, it was rebuilt by devoted Hindu kings and communities. The current temple was reconstructed in the Chalukya style of architecture in 1951, championed by Sardar Vallabhbhai Patel and K. M. Munshi after India's independence.

The temple stands majestically by the sea, and a notable feature is the "Baan Stambh" (arrow pillar) at the temple, which states that there is no landmass between the temple's coast and Antarctica in a straight line. The Sound and Light show in the evening narrates the glorious and turbulent history of the temple. Somnath represents the indomitable spirit of faith and rebuilding, making it a symbol of resilience for the Hindu community.`,
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
      'https://images.bhaktisetu.com/temples/somnath/main.jpg',
      'https://images.bhaktisetu.com/temples/somnath/sea-view.jpg',
      'https://images.bhaktisetu.com/temples/somnath/evening.jpg',
      'https://images.bhaktisetu.com/temples/somnath/light-show.jpg',
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
    description: `The Jagannath Temple in Puri is one of the most sacred Hindu temples, dedicated to Lord Jagannath, a form of Lord Vishnu. Located on the eastern coast of India in Puri, Odisha, it is one of the four sacred Char Dham pilgrimage sites. The temple was built by King Anantavarman Chodaganga Deva in the 12th century CE and stands at a height of 214 feet (65 m), dominating the skyline of Puri.

The temple is famous for its annual Rath Yatra (chariot festival), during which the three principal deities — Lord Jagannath, Lord Balabhadra, and Devi Subhadra — are placed on gigantic chariots and pulled through the streets by thousands of devotees. This festival is the origin of the English word "Juggernaut." The temple's kitchen, known as the largest kitchen in the world, feeds up to 100,000 people daily with the Mahaprasad.

A remarkable feature of the temple is the Nilachakra (Blue Wheel) atop the main dome and the flag that always flutters in the opposite direction of the wind. The temple flag (Patitapabana) is changed daily by a priest who climbs the dome — a tradition maintained for centuries. Unlike many other major temples, Jagannath Temple is known for its egalitarian philosophy where caste distinctions dissolve in the sharing of Mahaprasad.`,
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
      'https://images.bhaktisetu.com/temples/jagannath-puri/main.jpg',
      'https://images.bhaktisetu.com/temples/jagannath-puri/rath-yatra.jpg',
      'https://images.bhaktisetu.com/temples/jagannath-puri/nilachakra.jpg',
      'https://images.bhaktisetu.com/temples/jagannath-puri/mahaprasad.jpg',
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
    streamUrl: 'https://stream.bhaktisetu.com/jagannath-puri',
  },
];

// ─── PUJA TYPES DATA ────────────────────────────────────────────────────────

const pujaTypesData = [
  {
    name: 'Rudrabhishek',
    nameLocal: 'रुद्राभिषेक',
    slug: 'rudrabhishek',
    description: 'Rudrabhishek is one of the most powerful Vedic rituals dedicated to Lord Shiva. In this puja, the Shiva Lingam is bathed (Abhishek) with sacred offerings including milk, curd, honey, ghee, sugarcane juice, and holy water while chanting the Sri Rudram from the Yajurveda. It is performed to seek blessings for removal of negative planetary influences, health, prosperity, and spiritual growth.',
    category: 'planetary' as const,
    deity: 'Lord Shiva',
    durationMinutes: 90,
    basePrice: 501,
    nriPrice: 2501,
    samagriIncluded: true,
    samagriItems: ['Bel patra', 'Dhatura', 'Milk', 'Honey', 'Curd', 'Ghee', 'Gangajal', 'Rudraksha mala'],
    images: ['https://images.bhaktisetu.com/pujas/rudrabhishek/main.jpg'],
    videoProofMandatory: true,
    sortOrder: 1,
  },
  {
    name: 'Ganesh Puja',
    nameLocal: 'गणेश पूजा',
    slug: 'ganesh-puja',
    description: 'Ganesh Puja is performed to invoke the blessings of Lord Ganesha, the remover of obstacles and the god of beginnings. This puja is especially recommended before starting any new venture, business, education, or important life event. The ritual includes Ganesh Sthapana, Shodashopachara (sixteen-step worship), and concludes with Aarti and Prasad distribution.',
    category: 'prosperity' as const,
    deity: 'Lord Ganesha',
    durationMinutes: 60,
    basePrice: 351,
    nriPrice: 1501,
    samagriIncluded: true,
    samagriItems: ['Modak', 'Durva grass', 'Red flowers', 'Sindoor', 'Coconut', 'Betel leaves', 'Jaggery'],
    images: ['https://images.bhaktisetu.com/pujas/ganesh-puja/main.jpg'],
    videoProofMandatory: true,
    sortOrder: 2,
  },
  {
    name: 'Satyanarayan Katha',
    nameLocal: 'सत्यनारायण कथा',
    slug: 'satyanarayan-katha',
    description: 'Satyanarayan Katha is a devotional ritual performed to seek the blessings of Lord Vishnu in his form as Satyanarayan. This puja involves reading of the Satyanarayan Katha (five chapters narrating divine stories), followed by Aarti and Prasad. It is commonly performed on Purnima (full moon day) and on auspicious occasions like housewarmings, weddings, and festivals.',
    category: 'special_occasion' as const,
    deity: 'Lord Vishnu',
    durationMinutes: 120,
    basePrice: 751,
    nriPrice: 3001,
    samagriIncluded: true,
    samagriItems: ['Banana', 'Wheat flour', 'Sugar', 'Ghee', 'Tulsi', 'Panchamrit', 'Dry fruits', 'Yellow cloth'],
    images: ['https://images.bhaktisetu.com/pujas/satyanarayan-katha/main.jpg'],
    videoProofMandatory: true,
    sortOrder: 3,
  },
  {
    name: 'Maha Mrityunjay Jaap',
    nameLocal: 'महा मृत्युंजय जाप',
    slug: 'maha-mrityunjay-jaap',
    description: 'Maha Mrityunjay Jaap is a powerful chanting ritual of the Maha Mrityunjay Mantra dedicated to Lord Shiva in his form as the conqueror of death. This puja involves the recitation of the mantra 1,25,000 times (Sava Lakh Jaap) and is performed for health recovery, longevity, protection from accidents, and overcoming fear. It is especially recommended for those facing severe health issues or Shani/Rahu dasha.',
    category: 'health' as const,
    deity: 'Lord Shiva',
    durationMinutes: 180,
    basePrice: 1100,
    nriPrice: 5001,
    samagriIncluded: true,
    samagriItems: ['Rudraksha mala', 'Bel patra', 'White flowers', 'Ghee', 'Sesame seeds', 'Havan samagri', 'Camphor'],
    images: ['https://images.bhaktisetu.com/pujas/maha-mrityunjay/main.jpg'],
    videoProofMandatory: true,
    sortOrder: 4,
  },
  {
    name: 'Lakshmi Puja',
    nameLocal: 'लक्ष्मी पूजा',
    slug: 'lakshmi-puja',
    description: 'Lakshmi Puja is a sacred ritual dedicated to Goddess Lakshmi, the deity of wealth, fortune, and prosperity. This puja invokes the blessings of Maa Lakshmi for financial stability, business success, and material abundance. The ritual includes Kalash Sthapana, Lakshmi Sahasranamam recitation, and Shree Sukta chanting, concluded with Aarti and Prasad.',
    category: 'prosperity' as const,
    deity: 'Goddess Lakshmi',
    durationMinutes: 60,
    basePrice: 451,
    nriPrice: 2001,
    samagriIncluded: true,
    samagriItems: ['Lotus flowers', 'Rice', 'Turmeric', 'Kumkum', 'Coins', 'Sweets', 'Red cloth', 'Kalash'],
    images: ['https://images.bhaktisetu.com/pujas/lakshmi-puja/main.jpg'],
    videoProofMandatory: true,
    sortOrder: 5,
  },
  {
    name: 'Navgraha Shanti Puja',
    nameLocal: 'नवग्रह शांति पूजा',
    slug: 'navgraha-shanti-puja',
    description: 'Navgraha Shanti Puja is performed to pacify the nine planetary deities (Surya, Chandra, Mangal, Budh, Guru, Shukra, Shani, Rahu, and Ketu) and mitigate their malefic effects in one\'s horoscope. This elaborate ritual involves individual worship of each planet with specific mantras, offerings, and a Havan (fire ritual). It is highly recommended during planetary transits, Sade Sati, or dasha periods.',
    category: 'planetary' as const,
    deity: 'Navagraha',
    durationMinutes: 120,
    basePrice: 901,
    nriPrice: 4001,
    samagriIncluded: true,
    samagriItems: ['Nine types of grains', 'Nine colored cloths', 'Havan samagri', 'Ghee', 'Navgraha yantra', 'Specific flowers for each planet'],
    images: ['https://images.bhaktisetu.com/pujas/navgraha-shanti/main.jpg'],
    videoProofMandatory: true,
    sortOrder: 6,
  },
  {
    name: 'Sunderkand Path',
    nameLocal: 'सुंदरकांड पाठ',
    slug: 'sunderkand-path',
    description: 'Sunderkand Path is the devotional recitation of the fifth chapter (Kand) of the Ramcharitmanas, composed by Goswami Tulsidas. This chapter describes Lord Hanuman\'s journey to Lanka in search of Mata Sita. Reciting Sunderkand is believed to remove obstacles, bring courage, and fulfill wishes. It is especially powerful when performed on Tuesdays or Saturdays.',
    category: 'daily' as const,
    deity: 'Lord Hanuman',
    durationMinutes: 150,
    basePrice: 501,
    nriPrice: 2001,
    samagriIncluded: true,
    samagriItems: ['Sindoor', 'Jasmine oil', 'Red flowers', 'Bundi laddoo', 'Betel leaves', 'Ramcharitmanas book'],
    images: ['https://images.bhaktisetu.com/pujas/sunderkand-path/main.jpg'],
    videoProofMandatory: true,
    sortOrder: 7,
  },
  {
    name: 'Hanuman Chalisa Path',
    nameLocal: 'हनुमान चालीसा पाठ',
    slug: 'hanuman-chalisa-path',
    description: 'Hanuman Chalisa Path involves the devotional recitation of the 40 verses composed by Goswami Tulsidas in praise of Lord Hanuman. This is one of the most popular prayers in Hinduism and is recited for strength, courage, protection from evil, and removal of Saturn\'s malefic effects. The puja includes Hanuman Stuti, 11 recitations of Hanuman Chalisa, and Aarti.',
    category: 'daily' as const,
    deity: 'Lord Hanuman',
    durationMinutes: 45,
    basePrice: 251,
    nriPrice: 1001,
    samagriIncluded: true,
    samagriItems: ['Sindoor', 'Jasmine oil', 'Red flowers', 'Bundi laddoo', 'Chola (red cloth)'],
    images: ['https://images.bhaktisetu.com/pujas/hanuman-chalisa/main.jpg'],
    videoProofMandatory: true,
    sortOrder: 8,
  },
  {
    name: 'Ram Charit Manas Path',
    nameLocal: 'रामचरित मानस पाठ',
    slug: 'ram-charit-manas-path',
    description: 'Ram Charit Manas Path is the complete recitation of the epic poem by Goswami Tulsidas that narrates the life and deeds of Lord Ram. This extensive puja covers all seven chapters (Kands) and is performed for overall well-being, family harmony, and spiritual merit. The full path traditionally takes nine days (Navaha Parayana), but this offering covers the condensed single-day version with key chapters.',
    category: 'special_occasion' as const,
    deity: 'Lord Ram',
    durationMinutes: 240,
    basePrice: 1501,
    nriPrice: 6001,
    samagriIncluded: true,
    samagriItems: ['Ramcharitmanas book', 'Tulsi mala', 'Yellow flowers', 'Fruits', 'Sweets', 'Ghee diya', 'Havan samagri'],
    images: ['https://images.bhaktisetu.com/pujas/ram-charit-manas/main.jpg'],
    videoProofMandatory: true,
    sortOrder: 9,
  },
  {
    name: 'Pitru Dosh Nivaran Puja',
    nameLocal: 'पितृ दोष निवारण पूजा',
    slug: 'pitru-dosh-nivaran-puja',
    description: 'Pitru Dosh Nivaran Puja is performed to alleviate the ancestral curse (Pitru Dosh) that is indicated in one\'s horoscope when Rahu or Ketu are placed with the Sun or Moon. This dosh is believed to cause delays in marriage, financial difficulties, family conflicts, and health issues. The puja involves Pitru Tarpan, Pind Daan mantras, and Havan to seek forgiveness and blessings of ancestors.',
    category: 'memorial' as const,
    deity: 'Ancestors',
    durationMinutes: 150,
    basePrice: 1101,
    nriPrice: 5001,
    samagriIncluded: true,
    samagriItems: ['Black sesame seeds', 'Barley', 'Kusha grass', 'Rice', 'White cloth', 'Ghee', 'Havan samagri', 'Dakshina'],
    images: ['https://images.bhaktisetu.com/pujas/pitru-dosh-nivaran/main.jpg'],
    videoProofMandatory: true,
    sortOrder: 10,
  },
];

// ─── CONTENT DATA ───────────────────────────────────────────────────────────

const contentData = [
  // Aartis
  {
    type: 'aarti' as const,
    title: 'Om Jai Jagdish Hare',
    titleLocal: 'ॐ जय जगदीश हरे',
    slug: 'om-jai-jagdish-hare-aarti',
    body: `ॐ जय जगदीश हरे, स्वामी जय जगदीश हरे
भक्त जनों के संकट, दास जनों के संकट
क्षण में दूर करे ॥ ॐ जय जगदीश हरे ॥

जो ध्यावे फल पावे, दुख बिनसे मन का
स्वामी दुख बिनसे मन का
सुख संपत्ति घर आवे, सुख संपत्ति घर आवे
कष्ट मिटे तन का ॥ ॐ जय जगदीश हरे ॥

मात पिता तुम मेरे, शरण गहूँ मैं किसकी
स्वामी शरण गहूँ मैं किसकी
तुम बिन और न दूजा, तुम बिन और न दूजा
आस करूँ मैं जिसकी ॥ ॐ जय जगदीश हरे ॥

तुम पूरण परमात्मा, तुम अंतर्यामी
स्वामी तुम अंतर्यामी
पारब्रह्म परमेश्वर, पारब्रह्म परमेश्वर
तुम सबके स्वामी ॥ ॐ जय जगदीश हरे ॥

तुम करुणा के सागर, तुम पालनकर्ता
स्वामी तुम पालनकर्ता
मैं मूरख खल कामी, मैं सेवक तुम स्वामी
कृपा करो भर्ता ॥ ॐ जय जगदीश हरे ॥`,
    deity: 'Lord Vishnu',
    language: 'hi' as const,
    durationSeconds: 300,
    tags: ['aarti', 'vishnu', 'evening', 'universal'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/om-jai-jagdish.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/aartis/om-jai-jagdish-hare.mp3',
    sortOrder: 1,
  },
  {
    type: 'aarti' as const,
    title: 'Aarti Kunj Bihari Ki',
    titleLocal: 'आरती कुंज बिहारी की',
    slug: 'aarti-kunj-bihari-ki',
    body: `आरती कुंजबिहारी की,
श्री गिरिधर कृष्ण मुरारी की ॥

गले में बैजंती माला, बजावे मुरली मधुर बाला ।
श्रवन में कुंडल झलकाला, नन्द के आनन्द नंदलाला ।
गगन सम अंग कांति काली, राधिका चमक रही आली ।
लतन में ठाढ़े बनमाली ॥ आरती कुंजबिहारी की ॥

कनकमय मोर मुकुट बिलसे, देवता दर्शन को तरसे ।
गगन सों सुमन रासि बरसे ।
हाथन में वेणु विराजे, और रसिकन की मन धुन पे साजे ।
मोर मुकुट शिर पर रहत राजे ॥ आरती कुंजबिहारी की ॥`,
    deity: 'Lord Krishna',
    language: 'hi' as const,
    durationSeconds: 240,
    tags: ['aarti', 'krishna', 'evening', 'vrindavan'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/aarti-kunj-bihari.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/aartis/aarti-kunj-bihari.mp3',
    sortOrder: 2,
  },
  {
    type: 'aarti' as const,
    title: 'Ganesh Aarti - Jai Ganesh Deva',
    titleLocal: 'जय गणेश जय गणेश देवा',
    slug: 'jai-ganesh-deva-aarti',
    body: `जय गणेश जय गणेश जय गणेश देवा ।
माता जाकी पार्वती पिता महादेवा ॥

एक दंत दयावंत, चार भुजा धारी ।
माथे सिंदूर सोहे, मूसे की सवारी ॥ जय गणेश ॥

पान चढ़े फूल चढ़े, और चढ़े मेवा ।
लड्डुअन का भोग लगे, संत करें सेवा ॥ जय गणेश ॥

अंधन को आँख देत, कोढ़िन को काया ।
बांझन को पुत्र देत, निर्धन को माया ॥ जय गणेश ॥

हार चढ़े फूल चढ़े, और चढ़े मेवा ।
सुर श्याम शरण आये, सफल कीजे सेवा ॥ जय गणेश ॥`,
    deity: 'Lord Ganesha',
    language: 'hi' as const,
    durationSeconds: 270,
    tags: ['aarti', 'ganesha', 'evening', 'universal'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/ganesh-aarti.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/aartis/jai-ganesh-deva.mp3',
    sortOrder: 3,
  },
  {
    type: 'aarti' as const,
    title: 'Om Jai Shiv Omkara - Shiv Aarti',
    titleLocal: 'ॐ जय शिव ओमकारा',
    slug: 'om-jai-shiv-omkara-aarti',
    body: `ॐ जय शिव ओमकारा, स्वामी जय शिव ओमकारा ।
ब्रह्मा विष्णु सदाशिव, अर्द्धांगी धारा ॥ ॐ जय शिव ओमकारा ॥

एकानन चतुरानन पंचानन राजे ।
हंसानन गरुड़ासन वृषवाहन साजे ॥ ॐ जय शिव ओमकारा ॥

दो भुज चार चतुर्भुज दश भुज अति सोहे ।
तीनों रूप निरखता त्रिभुवन जन मोहे ॥ ॐ जय शिव ओमकारा ॥

अक्षमाला वनमाला मुंडमाला धारी ।
त्रिपुरारी कंसारी कर माला धारी ॥ ॐ जय शिव ओमकारा ॥`,
    deity: 'Lord Shiva',
    language: 'hi' as const,
    durationSeconds: 300,
    tags: ['aarti', 'shiva', 'evening', 'mahadev'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/shiv-aarti.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/aartis/om-jai-shiv-omkara.mp3',
    sortOrder: 4,
  },
  {
    type: 'aarti' as const,
    title: 'Om Jai Lakshmi Mata - Lakshmi Aarti',
    titleLocal: 'ॐ जय लक्ष्मी माता',
    slug: 'om-jai-lakshmi-mata-aarti',
    body: `ॐ जय लक्ष्मी माता, मैया जय लक्ष्मी माता ।
तुमको निशदिन सेवत, हरि विष्णु विधाता ॥ ॐ जय लक्ष्मी माता ॥

उमा रमा ब्रह्माणी, तुम ही जग माता ।
सूर्य चन्द्रमा ध्यावत, नारद ऋषि गाता ॥ ॐ जय लक्ष्मी माता ॥

दुर्गा रूप निरंजनी, सुख सम्पत्ति दाता ।
जो कोई तुमको ध्यावे, ऋद्धि सिद्धि धन पाता ॥ ॐ जय लक्ष्मी माता ॥

तुम ही पाताल निवासिनी, तुम ही शुभ दाता ।
कर्म प्रभाव प्रकाशिनी, भवनिधि की त्राता ॥ ॐ जय लक्ष्मी माता ॥`,
    deity: 'Goddess Lakshmi',
    language: 'hi' as const,
    durationSeconds: 280,
    tags: ['aarti', 'lakshmi', 'evening', 'diwali', 'prosperity'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/lakshmi-aarti.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/aartis/om-jai-lakshmi-mata.mp3',
    sortOrder: 5,
  },

  // Chalisas
  {
    type: 'chalisa' as const,
    title: 'Hanuman Chalisa',
    titleLocal: 'हनुमान चालीसा',
    slug: 'hanuman-chalisa',
    body: `दोहा:
श्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि ।
बरनउँ रघुबर बिमल जसु, जो दायकु फल चारि ॥
बुद्धिहीन तनु जानिके, सुमिरौं पवन-कुमार ।
बल बुद्धि विद्या देहु मोहिं, हरहु कलेस विकार ॥

चौपाई:
जय हनुमान ज्ञान गुन सागर ।
जय कपीस तिहुँ लोक उजागर ॥१॥
राम दूत अतुलित बल धामा ।
अंजनि-पुत्र पवनसुत नामा ॥२॥
महाबीर बिक्रम बजरंगी ।
कुमति निवार सुमति के संगी ॥३॥
कंचन बरन बिराज सुबेसा ।
कानन कुंडल कुंचित केसा ॥४॥
हाथ बज्र औ ध्वजा बिराजे ।
काँधे मूँज जनेऊ साजे ॥५॥
शंकर सुवन केसरीनंदन ।
तेज प्रताप महा जग बन्दन ॥६॥
विद्यावान गुनी अति चातुर ।
राम काज करिबे को आतुर ॥७॥
प्रभु चरित्र सुनिबे को रसिया ।
राम लखन सीता मन बसिया ॥८॥
सूक्ष्म रूप धरि सियहिं दिखावा ।
बिकट रूप धरि लंक जरावा ॥९॥
भीम रूप धरि असुर सँहारे ।
रामचंद्र के काज सँवारे ॥१०॥

... (complete 40 chaupais and concluding doha)

दोहा:
पवन तनय संकट हरन, मंगल मूरति रूप ।
राम लखन सीता सहित, हृदय बसहु सुर भूप ॥`,
    deity: 'Lord Hanuman',
    language: 'hi' as const,
    durationSeconds: 600,
    tags: ['chalisa', 'hanuman', 'tuesday', 'saturday', 'protection'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/hanuman-chalisa.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/chalisas/hanuman-chalisa.mp3',
    sortOrder: 10,
  },
  {
    type: 'chalisa' as const,
    title: 'Shiv Chalisa',
    titleLocal: 'शिव चालीसा',
    slug: 'shiv-chalisa',
    body: `दोहा:
जय गणेश गिरिजा सुवन, मंगल मूल सुजान ।
कहत अयोध्यादास तुम, देहु अभय वरदान ॥

चौपाई:
जय गिरिजा पति दीनदयाला ।
सदा करत संतन प्रतिपाला ॥१॥
भाल चंद्रमा सोहत नीके ।
कानन कुंडल नागफनी के ॥२॥
अंग गौर शिर गंग बहाये ।
मुंडमाल तन छार लगाये ॥३॥
वस्त्र खाल बाघम्बर सोहे ।
छवि को देख नाग मुनि मोहे ॥४॥

... (complete chalisa text)

दोहा:
नित नेम करि प्रातः ही, पाठ करौं चालीसा ।
तुम मेरी मनोकामना, पूर्ण करो जगदीशा ॥`,
    deity: 'Lord Shiva',
    language: 'hi' as const,
    durationSeconds: 540,
    tags: ['chalisa', 'shiva', 'monday', 'mahadev'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/shiv-chalisa.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/chalisas/shiv-chalisa.mp3',
    sortOrder: 11,
  },
  {
    type: 'chalisa' as const,
    title: 'Ganesh Chalisa',
    titleLocal: 'गणेश चालीसा',
    slug: 'ganesh-chalisa',
    body: `दोहा:
जय गणपति सदगुणसदन, कविवर बदन कृपाल ।
विघ्न हरण मंगल करण, जय जय गिरिजालाल ॥

चौपाई:
जय जय जय गणपति गणराजू ।
मंगल भरण करण शुभ काजू ॥१॥
जय गजबदन सदन सुखदाता ।
विश्व विनायक बुद्धि विधाता ॥२॥
वक्र तुण्ड शुचि शुण्ड सुहावन ।
तिलक त्रिपुंड भाल मन भावन ॥३॥
राजत मणि मुक्तन उर माला ।
स्वर्ण मुकुट शिर नयन विशाला ॥४॥

... (complete chalisa text)

दोहा:
सुमिरि के गणनायक, करिये सदा गुण गान ।
सकल सिद्धि के दाता, जय जय श्री भगवान ॥`,
    deity: 'Lord Ganesha',
    language: 'hi' as const,
    durationSeconds: 480,
    tags: ['chalisa', 'ganesha', 'wednesday', 'new-beginnings'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/ganesh-chalisa.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/chalisas/ganesh-chalisa.mp3',
    sortOrder: 12,
  },
  {
    type: 'chalisa' as const,
    title: 'Durga Chalisa',
    titleLocal: 'दुर्गा चालीसा',
    slug: 'durga-chalisa',
    body: `दोहा:
नमो नमो दुर्गे सुख करनी ।
नमो नमो अम्बे दुख हरनी ॥

चौपाई:
निरंकार है ज्योति तुम्हारी ।
तिहूँ लोक फैली उजियारी ॥१॥
शशि ललाट मुख महाविशाला ।
नेत्र लाल भृकुटि विकराला ॥२॥
रूप मातु को अधिक सुहावे ।
दरश करत जन अति सुख पावे ॥३॥
तुम संसार शक्ति लय कीना ।
तिहूँ लोक में तू ही है बीना ॥४॥

... (complete chalisa text)

दोहा:
अम्बे तेरी आरती, जो कोई नित गावे ।
कहत शिवानंद स्वामी, मनवांछित फल पावे ॥`,
    deity: 'Goddess Durga',
    language: 'hi' as const,
    durationSeconds: 520,
    tags: ['chalisa', 'durga', 'navratri', 'shakti', 'friday'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/durga-chalisa.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/chalisas/durga-chalisa.mp3',
    sortOrder: 13,
  },
  {
    type: 'chalisa' as const,
    title: 'Lakshmi Chalisa',
    titleLocal: 'लक्ष्मी चालीसा',
    slug: 'lakshmi-chalisa',
    body: `दोहा:
माता लक्ष्मी करि कृपा, करो हृदय में वास ।
मनोकामना सिद्ध करि, पूरण करो मन आस ॥

चौपाई:
सिंधु सुता मैं सुमिरौं तोही ।
ज्ञान बुद्धि विद्या दो मोही ॥१॥
तुम समान नहिं कोई उपकारी ।
सब विधि पुराहु मंगलकारी ॥२॥
जय जय जगत जननि जगदम्बा ।
सबके तुम ही हो अवलम्बा ॥३॥
तुम ही हो घर घर की ज्योती ।
तुम्हीं सत्य हो सब जग मोती ॥४॥

... (complete chalisa text)

दोहा:
लक्ष्मी चालीसा पढ़े, जो कोई शुद्ध मन लाय ।
लक्ष्मी होवे कृपा तब, आकर मिले सहाय ॥`,
    deity: 'Goddess Lakshmi',
    language: 'hi' as const,
    durationSeconds: 500,
    tags: ['chalisa', 'lakshmi', 'friday', 'diwali', 'prosperity'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/lakshmi-chalisa.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/chalisas/lakshmi-chalisa.mp3',
    sortOrder: 14,
  },

  // Mantras
  {
    type: 'mantra' as const,
    title: 'Gayatri Mantra',
    titleLocal: 'गायत्री मंत्र',
    slug: 'gayatri-mantra',
    body: `ॐ भूर्भुवः स्वः
तत्सवितुर्वरेण्यं
भर्गो देवस्य धीमहि
धियो यो नः प्रचोदयात् ॥

Transliteration:
Om Bhur Bhuvah Svah
Tat Savitur Varenyam
Bhargo Devasya Dhimahi
Dhiyo Yo Nah Prachodayat

Meaning:
We meditate on the glory of that Being who has produced this universe; may He enlighten our minds.

The Gayatri Mantra is one of the most universal and oldest mantras from the Rig Veda (3.62.10). It is dedicated to Savitar, the Sun deity, and is considered the essence of all Vedic wisdom. Regular recitation enhances intellect, removes ignorance, and brings spiritual illumination.

Best Time: Sandhya Vandana (sunrise, noon, sunset)
Recommended: 108 times daily`,
    deity: 'Savitar (Sun)',
    language: 'hi' as const,
    durationSeconds: 30,
    tags: ['mantra', 'vedic', 'gayatri', 'daily', 'universal', 'sunrise'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/gayatri-mantra.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/mantras/gayatri-mantra.mp3',
    sortOrder: 20,
  },
  {
    type: 'mantra' as const,
    title: 'Mahamrityunjay Mantra',
    titleLocal: 'महामृत्युंजय मंत्र',
    slug: 'mahamrityunjay-mantra',
    body: `ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् ।
उर्वारुकमिव बन्धनान् मृत्योर्मुक्षीय मामृतात् ॥

Transliteration:
Om Tryambakam Yajamahe Sugandhim Pushtivardhanam
Urvarukamiva Bandhanan Mrityor Mukshiya Maamritat

Meaning:
We worship the three-eyed Lord Shiva who is fragrant and who nourishes all beings. May He liberate us from death for the sake of immortality, even as a cucumber is severed from its bondage to the creeper.

This is one of the most powerful mantras from the Rig Veda (7.59.12), dedicated to Lord Shiva as Mrityunjaya — the conqueror of death. It is chanted for health, longevity, and protection from untimely death.

Best Time: Early morning or during Pradosh Kaal
Recommended: 108 times daily or 1,25,000 for complete Jaap`,
    deity: 'Lord Shiva',
    language: 'hi' as const,
    durationSeconds: 25,
    tags: ['mantra', 'shiva', 'health', 'protection', 'longevity'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/mahamrityunjay-mantra.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/mantras/mahamrityunjay-mantra.mp3',
    sortOrder: 21,
  },
  {
    type: 'mantra' as const,
    title: 'Om Namah Shivaya',
    titleLocal: 'ॐ नमः शिवाय',
    slug: 'om-namah-shivaya-mantra',
    body: `ॐ नमः शिवाय

Transliteration: Om Namah Shivaya

Meaning: I bow to Lord Shiva.

Om Namah Shivaya is the Panchakshari (five-syllable) mantra dedicated to Lord Shiva. It is one of the most popular and widely chanted mantras in Hinduism. The five syllables — Na, Ma, Shi, Va, Ya — represent the five elements: earth, water, fire, air, and ether.

This mantra is the core of the Shiva tradition and appears in the Sri Rudram hymn of the Yajurveda. It is believed to purify the mind, destroy negative karma, and lead to liberation (Moksha). The mantra can be chanted by anyone, at any time, without any ritual requirements.

Best Time: Anytime, especially Monday mornings and Pradosh Kaal
Recommended: 108 times on a Rudraksha mala`,
    deity: 'Lord Shiva',
    language: 'hi' as const,
    durationSeconds: 10,
    tags: ['mantra', 'shiva', 'panchakshari', 'daily', 'universal'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/om-namah-shivaya.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/mantras/om-namah-shivaya.mp3',
    sortOrder: 22,
  },
  {
    type: 'mantra' as const,
    title: 'Hare Krishna Maha Mantra',
    titleLocal: 'हरे कृष्ण महामंत्र',
    slug: 'hare-krishna-maha-mantra',
    body: `हरे कृष्ण हरे कृष्ण, कृष्ण कृष्ण हरे हरे ।
हरे राम हरे राम, राम राम हरे हरे ॥

Transliteration:
Hare Krishna Hare Krishna, Krishna Krishna Hare Hare
Hare Rama Hare Rama, Rama Rama Hare Hare

Meaning:
O Lord Krishna, O energy of the Lord (Hare), O Lord Rama — please engage me in your devotional service.

The Hare Krishna Maha Mantra is the supreme mantra for this age (Kali Yuga) as mentioned in the Kali-Santarana Upanishad. It contains three divine names — Hare (the divine energy/Radha), Krishna (the all-attractive), and Rama (the source of all pleasure). Chanting this mantra cleanses the heart, awakens dormant love for God, and brings peace to the mind.

Best Time: Brahma Muhurta (4:00 AM - 6:00 AM)
Recommended: 16 rounds on a Tulsi mala (1,728 times daily)`,
    deity: 'Lord Krishna',
    language: 'hi' as const,
    durationSeconds: 20,
    tags: ['mantra', 'krishna', 'rama', 'vaishnava', 'daily', 'iskcon'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/hare-krishna-mantra.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/mantras/hare-krishna-maha-mantra.mp3',
    sortOrder: 23,
  },
  {
    type: 'mantra' as const,
    title: 'Ganesh Mantra - Om Gam Ganapataye Namaha',
    titleLocal: 'ॐ गं गणपतये नमः',
    slug: 'ganesh-mantra-om-gam',
    body: `ॐ गं गणपतये नमः

Transliteration: Om Gam Ganapataye Namaha

Meaning: Salutations to Lord Ganesha, the remover of obstacles.

This is the most popular Ganesha Beej Mantra where "Gam" is the seed (beej) syllable of Lord Ganesha. It is chanted before starting any new venture, before beginning other prayers, or at the start of any auspicious activity.

Additional Ganesha Mantras:

1. Vakratunda Mahakaya:
वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ ।
निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा ॥

2. Ganesh Gayatri:
ॐ एकदंताय विद्महे वक्रतुण्डाय धीमहि ।
तन्नो दंती प्रचोदयात् ॥

Best Time: Early morning, especially on Wednesdays and Chaturthi
Recommended: 108 times daily for 21 days for wish fulfillment`,
    deity: 'Lord Ganesha',
    language: 'hi' as const,
    durationSeconds: 15,
    tags: ['mantra', 'ganesha', 'beej-mantra', 'new-beginnings', 'wednesday'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/ganesh-mantra.jpg',
    audioUrl: 'https://audio.bhaktisetu.com/mantras/om-gam-ganapataye.mp3',
    sortOrder: 24,
  },

  // Articles
  {
    type: 'article' as const,
    title: 'The Twelve Jyotirlingas: A Complete Pilgrimage Guide',
    titleLocal: 'बारह ज्योतिर्लिंग: संपूर्ण तीर्थयात्रा गाइड',
    slug: 'twelve-jyotirlingas-pilgrimage-guide',
    body: `The twelve Jyotirlingas are the most sacred abodes of Lord Shiva, where he is worshipped in the form of a "lingam of light." These temples are spread across India and are considered the holiest Shiva temples. Visiting all twelve Jyotirlingas is believed to free a devotee from the cycle of birth and death.

**1. Somnath (Gujarat)** — The first Jyotirlinga, located on the shores of the Arabian Sea. Destroyed and rebuilt multiple times, it stands as a symbol of resilience.

**2. Mallikarjuna (Andhra Pradesh)** — Located on Shrisailam hill on the banks of River Krishna. Also called the "Kailash of the South."

**3. Mahakaleshwar (Madhya Pradesh)** — The only south-facing Jyotirlinga, located in Ujjain. Famous for the Bhasma Aarti performed with sacred ash.

**4. Omkareshwar (Madhya Pradesh)** — Situated on an island in the Narmada River that naturally forms the shape of Om.

**5. Kedarnath (Uttarakhand)** — The highest Jyotirlinga at 11,755 feet in the Himalayas. Accessible only 6 months a year.

**6. Bhimashankar (Maharashtra)** — Set amidst the lush Western Ghats, also a wildlife sanctuary.

**7. Kashi Vishwanath (Uttar Pradesh)** — Located in the holy city of Varanasi, the spiritual capital of India.

**8. Trimbakeshwar (Maharashtra)** — Near the origin of the Godavari River in Nashik. Unique for its three-faced lingam.

**9. Vaidyanath (Jharkhand)** — Also known as Baidyanath Dham, located in Deoghar.

**10. Nageshwar (Gujarat)** — Located near Dwarka, associated with the legend of Daruka demon.

**11. Ramanathaswamy (Tamil Nadu)** — Located on Rameswaram Island, one of the Char Dham sites established by Lord Rama.

**12. Grishneshwar (Maharashtra)** — The last Jyotirlinga, located near the Ellora Caves in Aurangabad.

Each Jyotirlinga has a unique legend and significance. Pilgrims traditionally visit them in a specific order, though modern devotees may visit in any sequence they find convenient.`,
    deity: 'Lord Shiva',
    language: 'en' as const,
    durationSeconds: null,
    tags: ['article', 'jyotirlinga', 'shiva', 'pilgrimage', 'guide'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/jyotirlingas-guide.jpg',
    audioUrl: null,
    sortOrder: 30,
  },
  {
    type: 'article' as const,
    title: 'Navratri: Nine Nights of Divine Feminine Power',
    titleLocal: 'नवरात्रि: देवी शक्ति की नौ रातें',
    slug: 'navratri-festival-guide',
    body: `Navratri, meaning "nine nights," is one of the most significant Hindu festivals celebrating the divine feminine energy (Shakti). Observed twice a year — Chaitra Navratri (March/April) and Sharad Navratri (September/October) — this festival honors the nine forms of Goddess Durga.

**Day 1 - Shailputri**: The daughter of the mountains, riding a bull with a trident and lotus.
**Day 2 - Brahmacharini**: The ascetic form, carrying a rosary and water vessel.
**Day 3 - Chandraghanta**: The fierce protector, with a half-moon on her forehead.
**Day 4 - Kushmanda**: Creator of the universe, riding a lion with eight arms.
**Day 5 - Skandamata**: Mother of Kartikeya, sitting on a lotus.
**Day 6 - Katyayani**: The warrior goddess who destroyed Mahishasura.
**Day 7 - Kaalratri**: The fierce dark form that destroys ignorance and evil.
**Day 8 - Mahagauri**: The fair and radiant form symbolizing purity and peace.
**Day 9 - Siddhidatri**: The granter of supernatural powers and wisdom.

**Navratri Colors**: Each day is associated with a specific color that devotees wear:
Day 1: Orange, Day 2: White, Day 3: Red, Day 4: Royal Blue, Day 5: Yellow,
Day 6: Green, Day 7: Grey, Day 8: Purple, Day 9: Peacock Green.

**Fasting Traditions**: Many devotees observe a strict fast during Navratri, consuming only fruits, milk, and specific foods like Kuttu ka Atta (buckwheat flour) and Singhara Atta (water chestnut flour).

**Regional Celebrations**: Gujarat is famous for Garba and Dandiya Raas dances. West Bengal celebrates Durga Puja with elaborate pandals. South India observes Golu (display of dolls). Each region brings its unique cultural flavor to this pan-Indian festival.`,
    deity: 'Goddess Durga',
    language: 'en' as const,
    durationSeconds: null,
    tags: ['article', 'navratri', 'durga', 'festival', 'guide', 'shakti'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/navratri-guide.jpg',
    audioUrl: null,
    sortOrder: 31,
  },
  {
    type: 'article' as const,
    title: 'Understanding Panchang: The Hindu Almanac Explained',
    titleLocal: 'पंचांग को समझें: हिंदू कैलेंडर की पूरी जानकारी',
    slug: 'understanding-panchang-hindu-almanac',
    body: `The Panchang (literally "five limbs") is the Hindu calendar and almanac that provides essential information for determining auspicious times, festivals, and daily spiritual activities. Every Hindu household traditionally consults the Panchang for important decisions.

**The Five Elements (Panch-Ang):**

1. **Tithi (Lunar Day)**: There are 30 tithis in a lunar month — 15 in the waxing phase (Shukla Paksha) and 15 in the waning phase (Krishna Paksha). Key tithis include Ekadashi (11th, sacred to Vishnu), Chaturthi (4th, sacred to Ganesha), and Purnima/Amavasya (Full Moon/New Moon).

2. **Nakshatra (Lunar Mansion)**: The 27 nakshatras are constellations through which the Moon passes. Each nakshatra has unique characteristics and ruling deities. Your birth nakshatra determines many aspects of your spiritual practice.

3. **Yoga**: There are 27 yogas formed by the combined motion of the Sun and Moon. Yogas like Siddha, Amrit, and Shubh are considered auspicious, while Vishkumbh and Vaidhriti are inauspicious.

4. **Karana**: Half of a tithi is a Karana. There are 11 Karanas, and they influence the success of activities started during that period.

5. **Var (Weekday)**: Each day is ruled by a planet — Ravi (Sun/Sunday), Soma (Moon/Monday), Mangal (Mars/Tuesday), Budh (Mercury/Wednesday), Guru (Jupiter/Thursday), Shukra (Venus/Friday), Shani (Saturn/Saturday).

**Important Daily Timings:**
- **Rahu Kaal**: An inauspicious period ruled by Rahu, lasting approximately 1.5 hours daily. No new activities should be started.
- **Brahma Muhurta**: The most auspicious time, 1 hour 36 minutes before sunrise. Ideal for meditation and prayer.
- **Abhijit Muhurat**: A universally auspicious time around midday, good for starting any activity.

Understanding the Panchang helps align our activities with cosmic rhythms, leading to more harmonious and successful outcomes.`,
    deity: null,
    language: 'en' as const,
    durationSeconds: null,
    tags: ['article', 'panchang', 'guide', 'almanac', 'astrology', 'education'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/panchang-guide.jpg',
    audioUrl: null,
    sortOrder: 32,
  },
  {
    type: 'article' as const,
    title: 'Char Dham Yatra: The Ultimate Hindu Pilgrimage',
    titleLocal: 'चार धाम यात्रा: सम्पूर्ण मार्गदर्शिका',
    slug: 'char-dham-yatra-guide',
    body: `The Char Dham (Four Abodes) pilgrimage is considered the most sacred journey in Hinduism. Established by Adi Shankaracharya in the 8th century, these four temples are located at the four cardinal points of India, symbolizing the spiritual unity of the subcontinent.

**1. Badrinath (North) — Uttarakhand**
Dedicated to Lord Vishnu, Badrinath Temple is located at an altitude of 10,279 feet in the Garhwal Himalayas. The temple is believed to be the place where Lord Vishnu meditated under a Badri tree. Open from May to November, the temple is set against the majestic Neelkanth peak. The hot springs of Tapt Kund near the temple are considered sacred.

**2. Jagannath Puri (East) — Odisha**
Home to Lord Jagannath, a form of Lord Vishnu, the temple at Puri is famous for its annual Rath Yatra. The massive kitchen serves Mahaprasad to thousands daily. The temple's unique architectural features and ancient traditions make it a must-visit destination.

**3. Rameswaram (South) — Tamil Nadu**
The Ramanathaswamy Temple is where Lord Rama is believed to have worshipped Lord Shiva after returning from Lanka. Famous for its 22 sacred wells (theerthams) and the longest temple corridor in the world, Rameswaram connects to the mainland via the Pamban Bridge.

**4. Dwarka (West) — Gujarat**
Dwarkadhish Temple marks the ancient kingdom of Lord Krishna. Submerged ruins discovered offshore by marine archaeologists lend credence to legends about the original Dwarka. The Nageshwar Jyotirlinga is nearby.

**Planning Your Yatra:**
The traditional circuit begins at Puri and moves clockwise — Puri → Rameswaram → Dwarka → Badrinath. Modern pilgrims often customize their route based on seasonal accessibility. The best time varies by destination, but October-November allows visits to all four sites.`,
    deity: 'Lord Vishnu',
    language: 'en' as const,
    durationSeconds: null,
    tags: ['article', 'char-dham', 'pilgrimage', 'guide', 'badrinath', 'puri', 'rameswaram', 'dwarka'],
    isPremium: false,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/char-dham-guide.jpg',
    audioUrl: null,
    sortOrder: 33,
  },
  {
    type: 'article' as const,
    title: 'The Science and Spirituality Behind Temple Architecture',
    titleLocal: 'मंदिर वास्तुकला का विज्ञान और आध्यात्म',
    slug: 'temple-architecture-science-spirituality',
    body: `Hindu temple architecture is not merely an art form — it is a profound science that combines sacred geometry, astronomy, Vastu Shastra, and spiritual symbolism to create spaces that facilitate the connection between the human and the divine.

**The Temple as a Cosmic Body:**
A Hindu temple (Mandir) is designed as a representation of the cosmic being (Purusha). The Garbhagriha (sanctum sanctorum) represents the head, the Mandapa (hall) represents the body, and the Gopuram (tower) connects earth to the heavens. The entire structure follows the Vastu Purusha Mandala — a sacred geometric grid.

**Key Architectural Elements:**

1. **Garbhagriha**: The innermost sanctum, always dark and enclosed, representing the cave of the heart where the divine resides. The idol is placed at the exact geometric center (Brahmasthana).

2. **Shikhara/Vimana**: The temple tower directly above the sanctum. Its shape channels cosmic energy downward into the sanctum. North Indian temples have a curvilinear Nagara style, while South Indian temples feature the pyramidal Dravida style.

3. **Mandapa**: The pillared hall for congregational worship. Often featuring intricate carvings depicting stories from scriptures.

4. **Pradakshina Path**: The circumambulatory path around the sanctum. Walking clockwise (Parikrama) keeps the deity on the right side, symbolizing respect.

**Scientific Principles:**
- Temples are often built over underground water streams, creating a natural electromagnetic field.
- The copper plates (Kalasha) atop temples act as energy conductors.
- The granite and marble used in construction are excellent at absorbing and radiating energy.
- The bell's vibration at a temple entrance is designed to activate the brain's left and right hemispheres simultaneously.

Understanding temple architecture deepens our appreciation of the ancient wisdom embedded in these sacred spaces.`,
    deity: null,
    language: 'en' as const,
    durationSeconds: null,
    tags: ['article', 'architecture', 'temple', 'vastu', 'science', 'education'],
    isPremium: true,
    status: 'published' as const,
    imageUrl: 'https://images.bhaktisetu.com/content/temple-architecture.jpg',
    audioUrl: null,
    sortOrder: 34,
  },
];

// ─── PANCHANG DATA (7 days starting April 15, 2026) ────────────────────────

const panchangData = [
  {
    date: new Date('2026-04-15'),
    tithi: 'Krishna Dwitiya',
    nakshatra: 'Vishakha',
    yoga: 'Siddha',
    karana: 'Balava',
    sunrise: '05:58',
    sunset: '18:42',
    rahuKaal: '07:28 - 09:01',
    shubhMuhurat: {
      abhijitMuhurat: '11:54 - 12:45',
      brahmaMuhurta: '04:22 - 05:10',
      vijayMuhurat: '14:26 - 15:17',
    },
    festivals: [],
    vrat: [],
    specialInfo: 'Good day for starting new educational ventures. Vishakha nakshatra favors determination and goal-setting.',
    locationCity: 'Delhi',
  },
  {
    date: new Date('2026-04-16'),
    tithi: 'Krishna Tritiya',
    nakshatra: 'Anuradha',
    yoga: 'Vyatipata',
    karana: 'Taitila',
    sunrise: '05:57',
    sunset: '18:43',
    rahuKaal: '15:11 - 16:44',
    shubhMuhurat: {
      abhijitMuhurat: '11:54 - 12:45',
      brahmaMuhurta: '04:21 - 05:09',
      vijayMuhurat: '14:26 - 15:17',
    },
    festivals: [],
    vrat: [],
    specialInfo: 'Anuradha nakshatra supports friendship and devotion. Avoid new beginnings during Vyatipata yoga.',
    locationCity: 'Delhi',
  },
  {
    date: new Date('2026-04-17'),
    tithi: 'Krishna Chaturthi',
    nakshatra: 'Jyeshtha',
    yoga: 'Variyan',
    karana: 'Garaja',
    sunrise: '05:56',
    sunset: '18:44',
    rahuKaal: '12:02 - 13:35',
    shubhMuhurat: {
      abhijitMuhurat: '11:54 - 12:45',
      brahmaMuhurta: '04:20 - 05:08',
      vijayMuhurat: '14:26 - 15:17',
    },
    festivals: ['Sankashti Chaturthi'],
    vrat: ['Sankashti Chaturthi Vrat'],
    specialInfo: 'Sankashti Chaturthi — observe fast for Lord Ganesha. Break fast after moonrise. Special Ganesh Puja recommended.',
    locationCity: 'Delhi',
  },
  {
    date: new Date('2026-04-18'),
    tithi: 'Krishna Panchami',
    nakshatra: 'Mula',
    yoga: 'Parigha',
    karana: 'Vanija',
    sunrise: '05:55',
    sunset: '18:44',
    rahuKaal: '09:00 - 10:33',
    shubhMuhurat: {
      abhijitMuhurat: '11:53 - 12:44',
      brahmaMuhurta: '04:19 - 05:07',
      vijayMuhurat: '14:26 - 15:17',
    },
    festivals: [],
    vrat: [],
    specialInfo: 'Mula nakshatra — good for research, investigation, and spiritual practices. Avoid travel.',
    locationCity: 'Delhi',
  },
  {
    date: new Date('2026-04-19'),
    tithi: 'Krishna Shashthi',
    nakshatra: 'Purva Ashadha',
    yoga: 'Shiva',
    karana: 'Vishti',
    sunrise: '05:54',
    sunset: '18:45',
    rahuKaal: '16:44 - 18:17',
    shubhMuhurat: {
      abhijitMuhurat: '11:53 - 12:44',
      brahmaMuhurta: '04:18 - 05:06',
      vijayMuhurat: '14:26 - 15:17',
    },
    festivals: [],
    vrat: [],
    specialInfo: 'Shiva yoga is highly auspicious. Combined with Purva Ashadha nakshatra, it favors new initiatives and courage.',
    locationCity: 'Delhi',
  },
  {
    date: new Date('2026-04-20'),
    tithi: 'Krishna Saptami',
    nakshatra: 'Uttara Ashadha',
    yoga: 'Siddhi',
    karana: 'Bava',
    sunrise: '05:53',
    sunset: '18:46',
    rahuKaal: '07:26 - 08:59',
    shubhMuhurat: {
      abhijitMuhurat: '11:53 - 12:44',
      brahmaMuhurta: '04:17 - 05:05',
      vijayMuhurat: '14:26 - 15:17',
    },
    festivals: [],
    vrat: [],
    specialInfo: 'Siddhi yoga with Uttara Ashadha nakshatra is excellent for achieving long-term goals and government-related work.',
    locationCity: 'Delhi',
  },
  {
    date: new Date('2026-04-21'),
    tithi: 'Krishna Ashtami',
    nakshatra: 'Shravana',
    yoga: 'Sadhya',
    karana: 'Balava',
    sunrise: '05:52',
    sunset: '18:46',
    rahuKaal: '15:13 - 16:46',
    shubhMuhurat: {
      abhijitMuhurat: '11:53 - 12:44',
      brahmaMuhurta: '04:16 - 05:04',
      vijayMuhurat: '14:26 - 15:17',
    },
    festivals: [],
    vrat: ['Kalashtami Vrat'],
    specialInfo: 'Kalashtami — dedicated to Kaal Bhairav, a fierce form of Lord Shiva. Shravana nakshatra favors learning and listening to spiritual discourses.',
    locationCity: 'Delhi',
  },
];

// ─── MAIN SEED FUNCTION ─────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting Bhaktisetu database seed...\n');

  await prisma.$transaction(async (tx) => {
    // ── Clean existing data in reverse dependency order ──
    console.log('🧹 Cleaning existing seed data...');
    await tx.priestPayout.deleteMany();
    await tx.payment.deleteMany();
    await tx.pujaBooking.deleteMany();
    await tx.templePujaOffering.deleteMany();
    await tx.templePriest.deleteMany();
    await tx.liveDarshanStream.deleteMany();
    await tx.pujaType.deleteMany();
    await tx.priest.deleteMany();
    await tx.temple.deleteMany();
    await tx.contentItem.deleteMany();
    await tx.dailyPanchang.deleteMany();
    await tx.subscription.deleteMany();
    await tx.userAddress.deleteMany();
    await tx.user.deleteMany();

    // ── 1. Create Users ──
    console.log('👤 Creating users...');

    const domesticUser = await tx.user.create({
      data: {
        phone: '+919876543210',
        email: 'ram.sharma@example.com',
        fullName: 'Ram Sharma',
        preferredLanguage: 'hi',
        locationCity: 'Varanasi',
        locationState: 'Uttar Pradesh',
        isNri: false,
        gotra: 'Bharadwaj',
        nakshatra: 'Pushya',
        rashi: 'Karka',
        subscriptionTier: 'bhakti_pass',
      },
    });

    const nriUser = await tx.user.create({
      data: {
        phone: '+14155551234',
        email: 'priya.patel@example.com',
        fullName: 'Priya Patel',
        preferredLanguage: 'en',
        locationCity: 'San Francisco',
        locationState: 'California',
        isNri: true,
        nriCountry: 'USA',
        gotra: 'Kashyap',
        nakshatra: 'Rohini',
        rashi: 'Vrishabha',
        subscriptionTier: 'premium',
      },
    });

    // Create addresses
    await tx.userAddress.create({
      data: {
        userId: domesticUser.id,
        label: 'home',
        line1: '42, Assi Ghat Road',
        line2: 'Near Tulsi Ghat',
        city: 'Varanasi',
        state: 'Uttar Pradesh',
        pincode: '221005',
        country: 'India',
        isDefault: true,
        lat: 25.2854,
        lng: 83.0056,
      },
    });

    await tx.userAddress.create({
      data: {
        userId: nriUser.id,
        label: 'home',
        line1: '789 Mission Street',
        line2: 'Apt 12B',
        city: 'San Francisco',
        state: 'California',
        pincode: '94103',
        country: 'USA',
        isDefault: true,
        lat: 37.7857,
        lng: -122.4011,
      },
    });

    console.log(`  ✅ Created ${domesticUser.fullName} (domestic) and ${nriUser.fullName} (NRI)`);

    // ── 2. Create Priests ──
    console.log('🙏 Creating priests...');

    const priestUser1 = await tx.user.create({
      data: {
        phone: '+919999888877',
        email: 'pandit.shastri@example.com',
        fullName: 'Pandit Ramesh Shastri',
        preferredLanguage: 'hi',
        locationCity: 'Varanasi',
        locationState: 'Uttar Pradesh',
        isNri: false,
        gotra: 'Vasishtha',
        subscriptionTier: 'free',
      },
    });

    const priestUser2 = await tx.user.create({
      data: {
        phone: '+919999777766',
        email: 'pandit.trivedi@example.com',
        fullName: 'Pandit Suresh Trivedi',
        preferredLanguage: 'hi',
        locationCity: 'Puri',
        locationState: 'Odisha',
        isNri: false,
        gotra: 'Bharadwaj',
        subscriptionTier: 'free',
      },
    });

    const priest1 = await tx.priest.create({
      data: {
        userId: priestUser1.id,
        displayName: 'Pandit Ramesh Shastri',
        specializations: ['Rudrabhishek', 'Maha Mrityunjay Jaap', 'Navgraha Shanti', 'Satyanarayan Katha'],
        languages: ['Hindi', 'Sanskrit', 'English'],
        experienceYears: 25,
        aadhaarVerified: true,
        ratingAvg: 4.9,
        ratingCount: 347,
        isVerified: true,
        verificationStatus: 'approved',
        bio: 'Pandit Ramesh Shastri is a renowned Vedic scholar from Varanasi with over 25 years of experience in performing Shiva-related pujas and Vedic rituals. He is a graduate of Sampurnanand Sanskrit University and has performed thousands of pujas for devotees worldwide.',
        avatarUrl: 'https://images.bhaktisetu.com/priests/pandit-ramesh-shastri.jpg',
        commissionRate: 0.70,
        status: 'active',
      },
    });

    const priest2 = await tx.priest.create({
      data: {
        userId: priestUser2.id,
        displayName: 'Pandit Suresh Trivedi',
        specializations: ['Satyanarayan Katha', 'Ram Charit Manas Path', 'Sunderkand Path', 'Ganesh Puja'],
        languages: ['Hindi', 'Odia', 'Sanskrit', 'English'],
        experienceYears: 18,
        aadhaarVerified: true,
        ratingAvg: 4.8,
        ratingCount: 213,
        isVerified: true,
        verificationStatus: 'approved',
        bio: 'Pandit Suresh Trivedi is an experienced priest from Puri, Odisha, specializing in Vaishnava traditions and elaborate katha recitations. He has been serving at the Jagannath Temple and other major temples in eastern India for 18 years.',
        avatarUrl: 'https://images.bhaktisetu.com/priests/pandit-suresh-trivedi.jpg',
        commissionRate: 0.70,
        status: 'active',
      },
    });

    console.log(`  ✅ Created priests: ${priest1.displayName}, ${priest2.displayName}`);

    // ── 3. Create Temples ──
    console.log('🛕 Creating temples...');

    const temples = [];
    for (const t of templesData) {
      const temple = await tx.temple.create({
        data: {
          name: t.name,
          nameLocal: t.nameLocal,
          slug: t.slug,
          description: t.description,
          deityPrimary: t.deityPrimary,
          deities: t.deities,
          tradition: t.tradition,
          addressLine: t.addressLine,
          city: t.city,
          state: t.state,
          pincode: t.pincode,
          lat: t.lat,
          lng: t.lng,
          phone: t.phone,
          email: t.email,
          websiteUrl: t.websiteUrl,
          images: t.images,
          timingInfo: t.timingInfo,
          isVerified: true,
          verificationDate: new Date('2025-01-15'),
          trustScore: t.trustScore,
          liveDarshanEnabled: t.liveDarshanEnabled,
          streamUrl: t.streamUrl,
          status: 'active',
        },
      });
      temples.push(temple);
    }

    console.log(`  ✅ Created ${temples.length} verified temples`);

    // ── 4. Create Temple-Priest Associations ──
    console.log('🔗 Linking priests to temples...');

    // Priest 1 (Shastri) associated with Kashi Vishwanath and Somnath (Shaiva temples)
    await tx.templePriest.create({
      data: { templeId: temples[0]!.id, priestId: priest1.id, isPrimary: true },
    });
    await tx.templePriest.create({
      data: { templeId: temples[3]!.id, priestId: priest1.id, isPrimary: false },
    });

    // Priest 2 (Trivedi) associated with Jagannath Puri and Tirumala (Vaishnava temples)
    await tx.templePriest.create({
      data: { templeId: temples[4]!.id, priestId: priest2.id, isPrimary: true },
    });
    await tx.templePriest.create({
      data: { templeId: temples[1]!.id, priestId: priest2.id, isPrimary: false },
    });

    // Both priests at Siddhivinayak
    await tx.templePriest.create({
      data: { templeId: temples[2]!.id, priestId: priest1.id, isPrimary: true },
    });
    await tx.templePriest.create({
      data: { templeId: temples[2]!.id, priestId: priest2.id, isPrimary: false },
    });

    console.log('  ✅ Linked priests to temples');

    // ── 5. Create Puja Types ──
    console.log('🙏 Creating puja types...');

    const pujaTypes = [];
    for (const p of pujaTypesData) {
      const pujaType = await tx.pujaType.create({
        data: {
          name: p.name,
          nameLocal: p.nameLocal,
          slug: p.slug,
          description: p.description,
          category: p.category,
          deity: p.deity,
          durationMinutes: p.durationMinutes,
          basePrice: p.basePrice,
          nriPrice: p.nriPrice,
          samagriIncluded: p.samagriIncluded,
          samagriItems: p.samagriItems,
          images: p.images,
          videoProofMandatory: p.videoProofMandatory,
          sortOrder: p.sortOrder,
          isActive: true,
        },
      });
      pujaTypes.push(pujaType);
    }

    console.log(`  ✅ Created ${pujaTypes.length} puja types`);

    // ── 6. Create Temple-Puja Offerings ──
    console.log('📋 Creating temple-puja offerings...');

    const timeSlots = {
      morning: ['06:00', '07:00', '08:00', '09:00', '10:00'],
      afternoon: ['12:00', '13:00', '14:00', '15:00'],
      evening: ['17:00', '18:00', '19:00'],
    };

    // Mapping: which pujas are offered at which temples
    // Kashi Vishwanath (Shiva): Rudrabhishek, Maha Mrityunjay, Navgraha, Sunderkand, Hanuman Chalisa
    const kashiPujas = [0, 3, 5, 6, 7]; // indices into pujaTypes
    // Tirumala (Venkateswara): Satyanarayan, Lakshmi Puja, Ganesh Puja
    const tirumalaPujas = [2, 4, 1];
    // Siddhivinayak (Ganesha): Ganesh Puja, Lakshmi Puja, Navgraha
    const siddhivinayakPujas = [1, 4, 5];
    // Somnath (Shiva): Rudrabhishek, Maha Mrityunjay, Navgraha, Pitru Dosh
    const somnathPujas = [0, 3, 5, 9];
    // Jagannath (Vaishnava): Satyanarayan, Sunderkand, Ram Charit Manas, Hanuman Chalisa
    const jagannathPujas = [2, 6, 8, 7];

    const allTempleOfferings = [
      { templeIndex: 0, pujaIndices: kashiPujas },
      { templeIndex: 1, pujaIndices: tirumalaPujas },
      { templeIndex: 2, pujaIndices: siddhivinayakPujas },
      { templeIndex: 3, pujaIndices: somnathPujas },
      { templeIndex: 4, pujaIndices: jagannathPujas },
    ];

    let offeringCount = 0;
    for (const mapping of allTempleOfferings) {
      for (const pujaIndex of mapping.pujaIndices) {
        await tx.templePujaOffering.create({
          data: {
            templeId: temples[mapping.templeIndex]!.id,
            pujaTypeId: pujaTypes[pujaIndex]!.id,
            availableSlots: [
              ...timeSlots.morning.slice(0, 3),
              ...timeSlots.afternoon.slice(0, 2),
              ...timeSlots.evening.slice(0, 2),
            ],
            maxBookingsPerSlot: 5,
            isActive: true,
          },
        });
        offeringCount++;
      }
    }

    console.log(`  ✅ Created ${offeringCount} temple-puja offerings`);

    // ── 7. Create Content ──
    console.log('📖 Creating content items...');

    for (const c of contentData) {
      await tx.contentItem.create({
        data: {
          type: c.type,
          title: c.title,
          titleLocal: c.titleLocal,
          slug: c.slug,
          body: c.body,
          deity: c.deity,
          language: c.language,
          durationSeconds: c.durationSeconds,
          tags: c.tags,
          isPremium: c.isPremium,
          status: c.status,
          imageUrl: c.imageUrl,
          audioUrl: c.audioUrl,
          viewCount: Math.floor(Math.random() * 10000) + 500,
          likeCount: Math.floor(Math.random() * 2000) + 100,
          sortOrder: c.sortOrder,
          publishedAt: new Date('2025-12-01'),
        },
      });
    }

    console.log(`  ✅ Created ${contentData.length} content items`);

    // ── 8. Create Panchang Data ──
    console.log('📅 Creating panchang data...');

    for (const p of panchangData) {
      await tx.dailyPanchang.create({
        data: {
          date: p.date,
          tithi: p.tithi,
          nakshatra: p.nakshatra,
          yoga: p.yoga,
          karana: p.karana,
          sunrise: p.sunrise,
          sunset: p.sunset,
          rahuKaal: p.rahuKaal,
          shubhMuhurat: p.shubhMuhurat,
          festivals: p.festivals,
          vrat: p.vrat,
          specialInfo: p.specialInfo,
          locationCity: p.locationCity,
        },
      });
    }

    console.log(`  ✅ Created ${panchangData.length} days of panchang data`);

    // ── 9. Create Live Darshan Streams for enabled temples ──
    console.log('📹 Creating live darshan streams...');

    const streamEnabledTemples = temples.filter(t => {
      const data = templesData.find(td => td.slug === t.slug);
      return data?.liveDarshanEnabled;
    });

    for (const temple of streamEnabledTemples) {
      await tx.liveDarshanStream.create({
        data: {
          templeId: temple.id,
          streamKey: `stream_${temple.slug}_${Date.now()}`,
          playbackUrl: `https://stream.bhaktisetu.com/${temple.slug}/live.m3u8`,
          status: 'offline',
          isPremium: false,
        },
      });
    }

    console.log(`  ✅ Created ${streamEnabledTemples.length} live darshan stream configs`);
  });

  console.log('\n🎉 Seed completed successfully!');
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
