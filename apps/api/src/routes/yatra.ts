import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';

/**
 * Dharmic Yatra — Pilgrimage routes
 * In-memory data (MVP). Move to Prisma models in Phase 2.
 */

// Mirrors web/lib/yatra-data.ts (trimmed). Keep slugs in sync.
const YATRAS = [
  { slug: 'char-dham', title: 'Char Dham Yatra', durationDays: 11, startingPrice: 38500, region: 'himalayas', helicopterAvailable: true },
  { slug: 'do-dham', title: 'Do Dham Yatra', durationDays: 7, startingPrice: 24500, region: 'himalayas', helicopterAvailable: true },
  { slug: 'jyotirlinga-yatra', title: '12 Jyotirlingas Yatra', durationDays: 16, startingPrice: 72500, region: 'north', helicopterAvailable: false },
  { slug: 'four-dhams-india', title: '4 Dhams of India', durationDays: 14, startingPrice: 58000, region: 'north', helicopterAvailable: false },
  { slug: 'amarnath', title: 'Amarnath Yatra', durationDays: 6, startingPrice: 32000, region: 'himalayas', helicopterAvailable: true },
  { slug: 'vaishno-devi', title: 'Vaishno Devi Yatra', durationDays: 3, startingPrice: 8500, region: 'north', helicopterAvailable: true },
  { slug: 'shirdi-sai', title: 'Shirdi Sai + Shani Shingnapur', durationDays: 4, startingPrice: 15500, region: 'west', helicopterAvailable: false },
  { slug: 'tirupati-south', title: 'Tirupati + South India Temples', durationDays: 9, startingPrice: 38500, region: 'south', helicopterAvailable: false },
  { slug: 'ayodhya-kashi', title: 'Ayodhya + Kashi + Prayagraj', durationDays: 6, startingPrice: 22500, region: 'north', helicopterAvailable: false },
];

const COMPANIONS = [
  { id: 'rajesh-kumar', name: 'Rajesh Kumar', city: 'Haridwar', pricePerDay: 3500, yatrasCompleted: 187, rating: 4.9, availability: 'available', languages: ['Hindi', 'English', 'Garhwali'] },
  { id: 'priya-sharma', name: 'Priya Sharma', city: 'Varanasi', pricePerDay: 3200, yatrasCompleted: 142, rating: 5.0, availability: 'available', languages: ['Hindi', 'English', 'Sanskrit'] },
  { id: 'mohammed-aslam', name: 'Mohammed Aslam', city: 'Srinagar', pricePerDay: 4500, yatrasCompleted: 156, rating: 4.8, availability: 'limited', languages: ['Hindi', 'English', 'Urdu'] },
  { id: 'lakshmi-iyer', name: 'Lakshmi Iyer', city: 'Madurai', pricePerDay: 3000, yatrasCompleted: 112, rating: 4.9, availability: 'available', languages: ['Tamil', 'English', 'Hindi'] },
  { id: 'vikram-nayar', name: 'Vikram Nayar', city: 'Pune', pricePerDay: 4000, yatrasCompleted: 201, rating: 4.9, availability: 'busy', languages: ['Marathi', 'Hindi', 'English'] },
  { id: 'anita-deshmukh', name: 'Anita Deshmukh', city: 'Nashik', pricePerDay: 2800, yatrasCompleted: 78, rating: 4.7, availability: 'available', languages: ['Marathi', 'Hindi'] },
  { id: 'suresh-nair', name: 'Suresh Nair', city: 'Thiruvananthapuram', pricePerDay: 3500, yatrasCompleted: 94, rating: 4.8, availability: 'available', languages: ['Malayalam', 'Tamil', 'English'] },
  { id: 'meena-agarwal', name: 'Meena Agarwal', city: 'Ayodhya', pricePerDay: 3000, yatrasCompleted: 89, rating: 5.0, availability: 'limited', languages: ['Hindi', 'English', 'Awadhi'] },
];

// In-memory bookings store (per-user)
const bookings = new Map<string, Array<Record<string, unknown>>>();

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
      addOns?: { helicopter?: boolean; specialPuja?: boolean; companion?: boolean; insurance?: boolean };
      total: number;
      travelerDetails?: Array<{ name: string; age: number; gender: string }>;
    };

    const yatra = YATRAS.find((y) => y.slug === slug);
    if (!yatra) return reply.code(404).send({ error: 'Yatra not found.' });

    if (!body?.startDate || !body?.travelers || !body?.packageTier || !body?.total) {
      return reply.code(400).send({ error: 'Missing required fields: startDate, travelers, packageTier, total.' });
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

    const userBookings = bookings.get(userId) ?? [];
    userBookings.push(booking);
    bookings.set(userId, userBookings);

    return { message: 'Yatra booked successfully.', booking };
  });

  // ─── GET /bookings — my bookings (auth) ───────────────────────────────────
  server.get('/bookings', { preHandler: [authenticateUser] }, async (request) => {
    const userId = request.currentUser!.id;
    const list = bookings.get(userId) ?? [];
    return { bookings: list, total: list.length };
  });

  // ─── GET /companions — list all travel companions ─────────────────────────
  server.get('/companions', async (request) => {
    const { language, availability } = request.query as { language?: string; availability?: string };
    let list = COMPANIONS;
    if (language) {
      list = list.filter((c) => c.languages.some((l) => l.toLowerCase().includes(language.toLowerCase())));
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
      return reply.code(409).send({ error: 'Companion fully booked. Try another date or companion.' });
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

    const userBookings = bookings.get(userId) ?? [];
    userBookings.push(booking);
    bookings.set(userId, userBookings);

    return { message: 'Companion booked. Payment released in advance per Poojly policy.', booking };
  });
}
