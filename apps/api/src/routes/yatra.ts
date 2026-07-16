import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

/**
 * Dharmic Yatra — Pilgrimage routes
 * Yatra + companion bookings are persisted to the yatra_user_bookings table
 * (runtime CREATE-IF-NOT-EXISTS, mirrors yatra-inquiry.ts pattern) so they
 * survive process restarts. The previous in-memory Map lost every booking on
 * each Render free-tier recycle.
 */

let schemaReady: Promise<void> | null = null;
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS yatra_user_bookings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          booking_number TEXT UNIQUE NOT NULL,
          user_id UUID NOT NULL,
          booking_type TEXT NOT NULL CHECK (booking_type IN ('yatra','companion')),
          yatra_slug TEXT,
          companion_id TEXT,
          payload JSONB NOT NULL,
          status TEXT NOT NULL DEFAULT 'confirmed',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS yatra_user_bookings_user_idx ON yatra_user_bookings (user_id);`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS yatra_user_bookings_status_idx ON yatra_user_bookings (status);`,
      );
    })();
  }
  return schemaReady;
}

// Full yatra data with real descriptions, images, and details.
const YATRAS = [
  {
    slug: 'char-dham',
    title: 'Char Dham Yatra',
    subtitle: 'Yamunotri, Gangotri, Kedarnath & Badrinath',
    description:
      'The most revered Himalayan pilgrimage covering the four sacred abodes in Uttarakhand — Yamunotri (source of Yamuna), Gangotri (source of Ganga), Kedarnath (Lord Shiva Jyotirlinga) and Badrinath (Lord Vishnu). A journey every Hindu aspires to complete once in their lifetime. Our curated yatra includes permits, VIP darshan, comfortable stays, and helicopter options for Kedarnath.',
    durationDays: 11,
    startingPrice: 38500,
    region: 'himalayas',
    helicopterAvailable: true,
    heroImage: 'https://images.unsplash.com/photo-1626621331169-5f34be280ed9?w=800&q=80',
    places: ['Haridwar', 'Yamunotri', 'Gangotri', 'Kedarnath', 'Badrinath', 'Rishikesh'],
    highlights: [
      'Complete Char Dham circuit with all permits',
      'Helicopter option to Kedarnath',
      'Ganga Aarti at Haridwar',
      'Sunrise darshan at Badrinath',
      'Sattvic meals throughout',
    ],
    difficulty: 'challenging',
    bestTime: 'May-June & Sep-Oct',
  },
  {
    slug: 'do-dham',
    title: 'Do Dham Yatra',
    subtitle: 'Kedarnath & Badrinath — Shiva-Vishnu circuit',
    description:
      'The shorter Himalayan pilgrimage covering Kedarnath Jyotirlinga (Lord Shiva) and Badrinath Dham (Lord Vishnu). A 7-day circuit delivering the full spiritual depth of the Himalayan pilgrimage. Ideal for those with limited time or first-time Himalayan yatris.',
    durationDays: 7,
    startingPrice: 24500,
    region: 'himalayas',
    helicopterAvailable: true,
    heroImage: 'https://images.unsplash.com/photo-1626621331169-5f34be280ed9?w=800&q=80',
    places: ['Haridwar', 'Guptkashi', 'Kedarnath', 'Joshimath', 'Badrinath', 'Rishikesh'],
    highlights: [
      'Kedarnath helicopter option',
      'Tapt Kund holy bath at Badrinath',
      'Mana Village visit',
      'Ganga Aarti at Haridwar',
    ],
    difficulty: 'moderate',
    bestTime: 'May-June & Sep-Oct',
  },
  {
    slug: 'jyotirlinga-yatra',
    title: '12 Jyotirlingas Yatra',
    subtitle: 'All twelve self-manifested Shiva shrines across India',
    description:
      'A once-in-a-lifetime 16-day pilgrimage covering all 12 Jyotirlingas across 9 states — from Somnath in Gujarat to Ramanathaswamy in Tamil Nadu. Includes internal flights between distant shrines, Bhasma Aarti at Mahakaleshwar, VIP darshan at Kashi Vishwanath, and personalized Rudrabhishek at select temples.',
    durationDays: 16,
    startingPrice: 72500,
    region: 'north',
    helicopterAvailable: false,
    heroImage: 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800&q=80',
    places: [
      'Somnath',
      'Dwarka',
      'Ujjain',
      'Omkareshwar',
      'Nashik',
      'Pune',
      'Aurangabad',
      'Varanasi',
      'Deoghar',
      'Srisailam',
      'Rameswaram',
    ],
    highlights: [
      'All 12 Jyotirlingas in one curated circuit',
      'Bhasma Aarti at Mahakaleshwar',
      'Kashi Vishwanath VIP darshan',
      '4 domestic flights included',
    ],
    difficulty: 'moderate',
    bestTime: 'Oct-Mar',
  },
  {
    slug: 'four-dhams-india',
    title: '4 Dhams of India',
    subtitle: 'Badrinath, Dwarka, Puri, Rameswaram — four corners of India',
    description:
      'The four cardinal abodes of Lord Vishnu established by Adi Shankaracharya in the 8th century. A 14-day pan-India pilgrimage spanning North (Badrinath), West (Dwarka), East (Puri) and South (Rameswaram). Completing this circuit is believed to grant moksha.',
    durationDays: 14,
    startingPrice: 58000,
    region: 'north',
    helicopterAvailable: false,
    heroImage: 'https://images.unsplash.com/photo-1590766940554-634ee71ed937?w=800&q=80',
    places: [
      'Badrinath',
      'Dwarka',
      'Puri',
      'Rameswaram',
      'Haridwar',
      'Ahmedabad',
      'Bhubaneswar',
      'Madurai',
    ],
    highlights: [
      'All 4 Adi Shankaracharya dhams',
      'Jagannath Mahaprasad',
      'Dwarkadhish + Bet Dwarka',
      'Ramanathaswamy 22-well snan',
    ],
    difficulty: 'moderate',
    bestTime: 'Oct-Mar',
  },
  {
    slug: 'amarnath',
    title: 'Amarnath Yatra',
    subtitle: 'The sacred ice Shiva Lingam of Kashmir',
    description:
      'The Amarnath Cave shrine at 3,888m in the Kashmir Himalayas houses a naturally-formed ice stalagmite worshipped as Lord Shiva. Accessible only July-August via Pahalgam (traditional 36km trek) or Baltal (shorter 14km route). Our package handles Shrine Board registration, medical certificates, and provides helicopter options.',
    durationDays: 6,
    startingPrice: 32000,
    region: 'himalayas',
    helicopterAvailable: true,
    heroImage: 'https://images.unsplash.com/photo-1589308078059-be1415eab4c3?w=800&q=80',
    places: ['Srinagar', 'Pahalgam', 'Amarnath Cave', 'Sonmarg'],
    highlights: [
      'Ice Shiva Lingam darshan',
      'Helicopter from Pahalgam',
      'Pahalgam Valley stay',
      'Medical support throughout',
    ],
    difficulty: 'extreme',
    bestTime: 'Jul-Aug only',
  },
  {
    slug: 'vaishno-devi',
    title: 'Vaishno Devi Yatra',
    subtitle: 'The holy cave shrine of Mata Rani at Trikuta Hills',
    description:
      'Pilgrimage to Mata Vaishno Devi at Trikuta Hills (5,200 ft), Jammu — visited by 10 million devotees annually. The 13km trek from Katra to Bhawan passes through Banganga and Ardhkuwari. Helicopter, battery car, pony and palki options available for elderly devotees.',
    durationDays: 3,
    startingPrice: 8500,
    region: 'north',
    helicopterAvailable: true,
    heroImage: 'https://images.unsplash.com/photo-1600100397608-24dae0a3ce7f?w=800&q=80',
    places: ['Jammu', 'Katra', 'Ardhkuwari', 'Bhawan', 'Bhairavnath'],
    highlights: [
      'VIP darshan at Bhawan',
      'Helicopter from Katra',
      'Bhairavnath temple',
      'Pre-booked yatra slip',
    ],
    difficulty: 'moderate',
    bestTime: 'Sep-Apr',
  },
  {
    slug: 'shirdi-sai',
    title: 'Shirdi Sai + Shani Shingnapur',
    subtitle: 'Sai Baba samadhi, Shani Dev & Trimbakeshwar Jyotirlinga',
    description:
      "A spiritually dense 4-day yatra covering Shirdi (Sai Baba's samadhi and Dwarkamai), Shani Shingnapur (unique roofless Shani shrine), and Trimbakeshwar (Jyotirlinga). Includes Kakad Aarti at 4:30 AM, VIP darshan passes, and optional Ashtavinayak extension.",
    durationDays: 4,
    startingPrice: 15500,
    region: 'west',
    helicopterAvailable: false,
    heroImage: 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800&q=80',
    places: ['Mumbai/Pune', 'Shirdi', 'Shani Shingnapur', 'Trimbakeshwar', 'Nashik'],
    highlights: [
      'Shirdi Kakad Aarti',
      'Dwarkamai & Chavadi',
      'Shani Shingnapur oil abhishek',
      'Trimbakeshwar Jyotirlinga',
    ],
    difficulty: 'easy',
    bestTime: 'Oct-Mar',
  },
  {
    slug: 'tirupati-south',
    title: 'Tirupati + South India Temples',
    subtitle: 'Balaji darshan + Meenakshi, Rameswaram, Padmanabhaswamy & more',
    description:
      'A 9-day grand South Indian temple yatra covering Tirupati Balaji, Meenakshi Amman, Ramanathaswamy, Padmanabhaswamy, and Udupi Krishna. Seeghra darshan pre-arranged at Tirupati to avoid 8-hour queues.',
    durationDays: 9,
    startingPrice: 38500,
    region: 'south',
    helicopterAvailable: false,
    heroImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80',
    places: [
      'Chennai',
      'Tirupati',
      'Kanchipuram',
      'Madurai',
      'Rameswaram',
      'Kanyakumari',
      'Trivandrum',
      'Udupi',
    ],
    highlights: [
      'Tirupati Seeghra darshan',
      'Meenakshi Amman',
      'Ramanathaswamy 22-well snan',
      'Padmanabhaswamy darshan',
    ],
    difficulty: 'moderate',
    bestTime: 'Oct-Mar',
  },
  {
    slug: 'ayodhya-kashi',
    title: 'Ayodhya Ram Mandir + Kashi + Prayagraj',
    subtitle: 'Ram Lalla darshan, Kashi Vishwanath corridor & Triveni Sangam',
    description:
      'The holiest Vaishnava-Shaiva circuit of North India. Visit Ram Lalla at the magnificent new Ram Mandir, experience the Kashi Vishwanath corridor, and take a holy dip at the Triveni Sangam in Prayagraj. Includes Ganga Aarti at Dashashwamedh Ghat and Sarnath Buddhist circuit.',
    durationDays: 6,
    startingPrice: 22500,
    region: 'north',
    helicopterAvailable: false,
    heroImage: 'https://images.unsplash.com/photo-1561361058-c24cecae35ca?w=800&q=80',
    places: ['Lucknow', 'Ayodhya', 'Prayagraj', 'Varanasi', 'Sarnath'],
    highlights: [
      'Ram Lalla darshan at new Mandir',
      'Kashi Vishwanath VIP darshan',
      'Triveni Sangam snan',
      'Ganga Aarti',
    ],
    difficulty: 'easy',
    bestTime: 'Oct-Mar',
  },
  // ── Additional Yatras ──
  {
    slug: 'rameshwaram-madurai',
    title: 'Rameshwaram & Madurai Temple Trail',
    subtitle: 'Ramanathaswamy, Meenakshi Amman & Dhanushkodi',
    description:
      'A 5-day yatra to the southernmost Jyotirlinga at Rameswaram and the magnificent Meenakshi Amman Temple at Madurai. Experience the sacred 22-well snan at Ramanathaswamy temple, visit Dhanushkodi where Lord Rama built the bridge to Lanka, and witness the spectacular Meenakshi Amman temple with its 14 gopurams.',
    durationDays: 5,
    startingPrice: 18500,
    region: 'south',
    helicopterAvailable: false,
    heroImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80',
    places: ['Madurai', 'Rameswaram', 'Dhanushkodi', 'Ramanathapuram'],
    highlights: [
      'Ramanathaswamy 22-well snan',
      'Dhanushkodi — tip of India',
      'Meenakshi Amman 1000-pillar hall',
      'Pamban Bridge crossing',
    ],
    difficulty: 'easy',
    bestTime: 'Oct-Mar',
  },
  {
    slug: 'dwarka-somnath',
    title: 'Dwarka & Somnath Yatra',
    subtitle: "Lord Krishna's kingdom + first Jyotirlinga",
    description:
      "A 5-day Gujarat pilgrimage covering Dwarkadhish (Lord Krishna's legendary kingdom), Bet Dwarka (original settlement accessible by boat), Nageshwar Jyotirlinga, and Somnath — the first among the twelve Jyotirlingas. Witness the spectacular Sound & Light show at Somnath depicting its tumultuous history.",
    durationDays: 5,
    startingPrice: 21000,
    region: 'west',
    helicopterAvailable: false,
    heroImage: 'https://images.unsplash.com/photo-1590766940554-634ee71ed937?w=800&q=80',
    places: ['Ahmedabad', 'Dwarka', 'Bet Dwarka', 'Nageshwar', 'Somnath', 'Junagadh'],
    highlights: [
      'Dwarkadhish darshan',
      'Bet Dwarka boat ride',
      'Nageshwar Jyotirlinga',
      'Somnath Sound & Light show',
    ],
    difficulty: 'easy',
    bestTime: 'Oct-Mar',
  },
  {
    slug: 'haridwar-rishikesh',
    title: 'Haridwar & Rishikesh Spiritual Retreat',
    subtitle: 'Ganga Aarti, yoga ashrams & Himalayan foothills',
    description:
      'A 4-day immersive retreat in the twin holy cities at the foothills of the Himalayas. Experience the world-famous Ganga Aarti at Har Ki Pauri in Haridwar, visit ancient temples, explore yoga ashrams in Rishikesh (Yoga Capital of the World), and take a holy dip at the Triveni Ghat.',
    durationDays: 4,
    startingPrice: 12500,
    region: 'himalayas',
    helicopterAvailable: false,
    heroImage: 'https://images.unsplash.com/photo-1626621331169-5f34be280ed9?w=800&q=80',
    places: ['Haridwar', 'Rishikesh', 'Neelkanth Mahadev'],
    highlights: [
      'Ganga Aarti at Har Ki Pauri',
      'Triveni Ghat snan',
      'Yoga ashram visit',
      'Neelkanth Mahadev darshan',
    ],
    difficulty: 'easy',
    bestTime: 'Sep-May',
  },
  {
    slug: 'mathura-vrindavan',
    title: 'Mathura-Vrindavan Krishna Yatra',
    subtitle: 'Krishna Janmabhoomi, Banke Bihari & Govardhan Parikrama',
    description:
      'A 3-day pilgrimage to the birthplace and childhood playground of Lord Krishna. Visit Krishna Janmabhoomi in Mathura, the mesmerizing Banke Bihari Temple in Vrindavan, ISKCON temple, and the Govardhan Hill that Lord Krishna lifted. Experience the divine evening aarti at Yamuna ghat.',
    durationDays: 3,
    startingPrice: 9500,
    region: 'north',
    helicopterAvailable: false,
    heroImage: 'https://images.unsplash.com/photo-1600100397608-24dae0a3ce7f?w=800&q=80',
    places: ['Mathura', 'Vrindavan', 'Govardhan', 'Barsana', 'Gokul'],
    highlights: [
      'Krishna Janmabhoomi darshan',
      'Banke Bihari Temple',
      'Govardhan Parikrama',
      'Yamuna Aarti',
      'ISKCON Vrindavan',
    ],
    difficulty: 'easy',
    bestTime: 'Oct-Mar & Holi season',
  },
  {
    slug: 'south-india-grand',
    title: 'Grand South India Temple Circuit',
    subtitle: 'Tirupati, Meenakshi, Thanjavur, Guruvayur & more — 12 days',
    description:
      'The most comprehensive South Indian temple yatra covering the great Dravidian shrines across Tamil Nadu, Kerala, Karnataka and Andhra Pradesh. From Tirupati Balaji to Brihadeeswarar (Thanjavur), Guruvayur Krishna, and Padmanabhaswamy. Experience architectural grandeur and ancient rituals.',
    durationDays: 12,
    startingPrice: 52000,
    region: 'south',
    helicopterAvailable: false,
    heroImage: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80',
    places: [
      'Chennai',
      'Tirupati',
      'Kanchipuram',
      'Thanjavur',
      'Madurai',
      'Rameswaram',
      'Kanyakumari',
      'Trivandrum',
      'Guruvayur',
      'Udupi',
    ],
    highlights: [
      'Tirupati Seeghra darshan',
      'Brihadeeswarar Big Temple',
      'Meenakshi Amman',
      'Guruvayur Krishna',
      'Kanyakumari sunrise',
    ],
    difficulty: 'moderate',
    bestTime: 'Oct-Mar',
  },
];

const COMPANIONS = [
  {
    id: 'rajesh-kumar',
    name: 'Rajesh Kumar',
    city: 'Haridwar',
    pricePerDay: 3500,
    yatrasCompleted: 187,
    rating: 4.9,
    availability: 'available',
    languages: ['Hindi', 'English', 'Garhwali'],
    specialization: 'Char Dham specialist, Elderly care, Medical first-aid',
    bio: 'Born and raised in Haridwar, Rajesh has been guiding Char Dham yatris for 16 years. Certified in Wilderness First Aid. Carries BP monitor, oximeter and emergency medicines.',
  },
  {
    id: 'priya-sharma',
    name: 'Priya Sharma',
    city: 'Varanasi',
    pricePerDay: 3200,
    yatrasCompleted: 142,
    rating: 5.0,
    availability: 'available',
    languages: ['Hindi', 'English', 'Sanskrit'],
    specialization: 'Women-only groups, Kashi corridor expert, Widow tirth yatra',
    bio: 'Sanskrit degree from BHU. Specializes in women-only groups and elderly ladies. Trained in basic nursing.',
  },
  {
    id: 'mohammed-aslam',
    name: 'Mohammed Aslam',
    city: 'Srinagar',
    pricePerDay: 4500,
    yatrasCompleted: 156,
    rating: 4.8,
    availability: 'limited',
    languages: ['Hindi', 'English', 'Urdu', 'Kashmiri'],
    specialization: 'Amarnath specialist, High-altitude medicine, Weather judgment',
    bio: 'Born in Srinagar, led 156 Amarnath yatras. AMRI-certified in High Altitude Medicine. His weather judgment has avoided multiple helicopter cancellations.',
  },
  {
    id: 'lakshmi-iyer',
    name: 'Lakshmi Iyer',
    city: 'Madurai',
    pricePerDay: 3000,
    yatrasCompleted: 112,
    rating: 4.9,
    availability: 'available',
    languages: ['Tamil', 'English', 'Hindi', 'Malayalam'],
    specialization: 'South India routes, Agama shastra knowledge, Elderly care',
    bio: 'Sanskrit scholar and Agama shastra expert. Go-to companion for North Indian devotees doing South India circuits. Vegetarian cook by training.',
  },
  {
    id: 'vikram-nayar',
    name: 'Vikram Nayar',
    city: 'Pune',
    pricePerDay: 4000,
    yatrasCompleted: 201,
    rating: 4.9,
    availability: 'busy',
    languages: ['Marathi', 'Hindi', 'English'],
    specialization: 'Ashtavinayak expert, 12 Jyotirlingas, Ex-Army medic',
    bio: 'Temple circuit specialist for 18 years. Completed 58 full 12-Jyotirlinga yatras. Ex-Army medic with advanced first-aid training.',
  },
  {
    id: 'anita-deshmukh',
    name: 'Anita Deshmukh',
    city: 'Nashik',
    pricePerDay: 2800,
    yatrasCompleted: 78,
    rating: 4.7,
    availability: 'available',
    languages: ['Marathi', 'Hindi'],
    specialization: 'Hindi-only comfort, Shirdi Sai routes, Elderly with mobility issues',
    bio: 'Certified elder-care specialist with 8 years of experience. Diploma in gerontology. Preferred by Hindi-speaking elderly devotees.',
  },
  {
    id: 'suresh-nair',
    name: 'Suresh Nair',
    city: 'Thiruvananthapuram',
    pricePerDay: 3500,
    yatrasCompleted: 94,
    rating: 4.8,
    availability: 'available',
    languages: ['Malayalam', 'Tamil', 'English', 'Hindi'],
    specialization: 'Kerala temples, Sabarimala specialist, Padmanabhaswamy protocol',
    bio: "Expert in Kerala temple protocols. 18 Sabarimala seasons as guide. Knows strict dress codes and rituals of Kerala's ancient shrines.",
  },
  {
    id: 'meena-agarwal',
    name: 'Meena Agarwal',
    city: 'Ayodhya',
    pricePerDay: 3000,
    yatrasCompleted: 89,
    rating: 5.0,
    availability: 'limited',
    languages: ['Hindi', 'English', 'Awadhi'],
    specialization: 'Ayodhya Ram Mandir expert, Kashi Vishwanath corridor, Saryu tarpan',
    bio: "Deeply involved in Ayodhya's rise post-Ram Mandir inauguration. Coordinates directly with Shri Ram Janmabhoomi Teerth Kshetra Trust for suvidha passes.",
  },
];

function makeBookingNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 90000 + 10000);
  return `BS-${ymd}-${rand}`;
}

export async function yatraRoutes(server: FastifyInstance) {
  // ─── GET /list — all yatras ───────────────────────────────────────────────
  server.get('/list', async () => {
    return { yatras: YATRAS, total: YATRAS.length };
  });

  // ─── GET /:slug — single yatra ────────────────────────────────────────────
  server.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const yatra = YATRAS.find((y) => y.slug === slug);
    if (!yatra) return reply.code(404).send({ error: 'Yatra not found.' });
    return { yatra };
  });

  // ─── POST /:slug/book — create a yatra booking (auth) ─────────────────────
  server.post('/:slug/book', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const { slug } = request.params as { slug: string };
    const body = request.body as {
      startDate: string;
      travelers: number;
      packageTier: 'economy' | 'standard' | 'premium';
      pickupCity: string;
      addOns?: {
        helicopter?: boolean;
        specialPuja?: boolean;
        companion?: boolean;
        insurance?: boolean;
      };
      total: number;
      travelerDetails?: Array<{ name: string; age: number; gender: string }>;
    };

    const yatra = YATRAS.find((y) => y.slug === slug);
    if (!yatra) return reply.code(404).send({ error: 'Yatra not found.' });

    if (!body?.startDate || !body?.travelers || !body?.packageTier || !body?.total) {
      return reply
        .code(400)
        .send({ error: 'Missing required fields: startDate, travelers, packageTier, total.' });
    }
    if (body.travelers < 1 || body.travelers > 12) {
      return reply.code(400).send({ error: 'Travelers must be between 1 and 12.' });
    }

    const booking = {
      bookingNumber: makeBookingNumber(),
      userId,
      yatraSlug: slug,
      yatraTitle: yatra.title,
      startDate: body.startDate,
      travelers: body.travelers,
      packageTier: body.packageTier,
      pickupCity: body.pickupCity,
      addOns: body.addOns ?? {},
      total: body.total,
      travelerDetails: body.travelerDetails ?? [],
      status: 'confirmed' as const,
      createdAt: new Date().toISOString(),
    };

    try {
      await ensureSchema();
      await prisma.$executeRawUnsafe(
        `INSERT INTO yatra_user_bookings (booking_number, user_id, booking_type, yatra_slug, payload, status)
         VALUES ($1, $2::uuid, 'yatra', $3, $4::jsonb, $5)`,
        booking.bookingNumber,
        userId,
        slug,
        JSON.stringify(booking),
        booking.status,
      );
    } catch (err) {
      request.log.error({ err, slug, userId }, 'yatra booking persist failed');
      return reply.code(500).send({ error: 'Booking failed.' });
    }

    return { message: 'Yatra booked successfully.', booking };
  });

  // ─── GET /bookings — my bookings (auth) ───────────────────────────────────
  server.get('/bookings', { preHandler: [authenticateUser] }, async (request) => {
    const userId = request.currentUser!.id;
    try {
      await ensureSchema();
      const rows = await prisma.$queryRawUnsafe<{ payload: unknown }[]>(
        `SELECT payload FROM yatra_user_bookings WHERE user_id = $1::uuid ORDER BY created_at DESC`,
        userId,
      );
      const list = rows.map((r) => r.payload);
      return { bookings: list, total: list.length };
    } catch (err) {
      request.log.error({ err, userId }, 'yatra bookings list failed');
      return { bookings: [], total: 0 };
    }
  });

  // ─── GET /companions — list all travel companions ─────────────────────────
  server.get('/companions', async (request) => {
    const { language, availability } = request.query as {
      language?: string;
      availability?: string;
    };
    let list = COMPANIONS;
    if (language) {
      list = list.filter((c) =>
        c.languages.some((l) => l.toLowerCase().includes(language.toLowerCase())),
      );
    }
    if (availability) {
      list = list.filter((c) => c.availability === availability);
    }
    return { companions: list, total: list.length };
  });

  // ─── GET /companions/:id — single companion ───────────────────────────────
  server.get('/companions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const companion = COMPANIONS.find((c) => c.id === id);
    if (!companion) return reply.code(404).send({ error: 'Companion not found.' });
    return { companion };
  });

  // ─── POST /companion/:id/book — book a companion (auth) ──────────────────
  server.post('/companion/:id/book', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const { id } = request.params as { id: string };
    const body = request.body as {
      startDate: string;
      endDate: string;
      days: number;
      yatraSlug?: string;
      notes?: string;
    };

    const companion = COMPANIONS.find((c) => c.id === id);
    if (!companion) return reply.code(404).send({ error: 'Companion not found.' });
    if (companion.availability === 'busy') {
      return reply
        .code(409)
        .send({ error: 'Companion fully booked. Try another date or companion.' });
    }
    if (!body?.startDate || !body?.days || body.days < 1) {
      return reply.code(400).send({ error: 'Missing/invalid fields: startDate, days.' });
    }

    const total = companion.pricePerDay * body.days;
    const booking = {
      bookingNumber: makeBookingNumber(),
      userId,
      type: 'companion',
      companionId: id,
      companionName: companion.name,
      startDate: body.startDate,
      endDate: body.endDate,
      days: body.days,
      yatraSlug: body.yatraSlug ?? null,
      notes: body.notes ?? '',
      total,
      status: 'confirmed' as const,
      createdAt: new Date().toISOString(),
    };

    try {
      await ensureSchema();
      await prisma.$executeRawUnsafe(
        `INSERT INTO yatra_user_bookings (booking_number, user_id, booking_type, companion_id, yatra_slug, payload, status)
         VALUES ($1, $2::uuid, 'companion', $3, $4, $5::jsonb, $6)`,
        booking.bookingNumber,
        userId,
        id,
        booking.yatraSlug,
        JSON.stringify(booking),
        booking.status,
      );
    } catch (err) {
      request.log.error({ err, companionId: id, userId }, 'companion booking persist failed');
      return reply.code(500).send({ error: 'Booking failed.' });
    }

    return {
      message: 'Companion booked. Payment released in advance per Darshya policy.',
      booking,
    };
  });
}
