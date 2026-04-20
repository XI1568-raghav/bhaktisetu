import { FastifyInstance } from 'fastify';

// ─── Static Instructor Data ─────────────────────────────────────────────────

const instructors = [
  {
    id: 'inst-001',
    name: 'Aarav Sharma',
    slug: 'aarav-sharma',
    photo: '/images/wellness/instructors/aarav.jpg',
    specialty: ['Hatha Yoga', 'Pranayama'],
    category: 'yoga',
    experience: 12,
    rating: 4.9,
    reviewCount: 342,
    pricePerSession: 599,
    bio: 'Trained at the Bihar School of Yoga, Aarav has spent 12 years teaching Hatha and Pranayama across India and Southeast Asia. His classes emphasize breath-body alignment and are suitable for all levels.',
    certifications: ['E-RYT 500', 'Bihar School of Yoga Diploma', 'Yoga Alliance India'],
    languages: ['Hindi', 'English'],
    availableSlots: [
      { day: 'Mon', time: '06:00 AM' },
      { day: 'Mon', time: '06:00 PM' },
      { day: 'Wed', time: '06:00 AM' },
      { day: 'Wed', time: '06:00 PM' },
      { day: 'Fri', time: '06:00 AM' },
      { day: 'Sat', time: '07:00 AM' },
    ],
    reviews: [
      { author: 'Priya M.', rating: 5, text: 'Aarav sir transformed my morning routine. His pranayama guidance is exceptional.', date: '2026-03-12' },
      { author: 'Rohit K.', rating: 5, text: 'Best Hatha yoga teacher I have found online. Very patient and attentive.', date: '2026-02-28' },
      { author: 'Sneha D.', rating: 4, text: 'Good sessions, wish they were longer. Very knowledgeable instructor.', date: '2026-01-15' },
    ],
  },
  {
    id: 'inst-002',
    name: 'Meera Iyer',
    slug: 'meera-iyer',
    photo: '/images/wellness/instructors/meera.jpg',
    specialty: ['Vinyasa Flow', 'Ashtanga'],
    category: 'yoga',
    experience: 8,
    rating: 4.8,
    reviewCount: 218,
    pricePerSession: 499,
    bio: 'Meera discovered yoga during her college years in Mysore and went on to train under Sharath Jois. She specializes in dynamic Vinyasa flows and traditional Ashtanga sequences that build strength and flexibility.',
    certifications: ['RYT 500', 'Ashtanga Yoga Mysore Certification', 'KPJAYI Authorized'],
    languages: ['English', 'Tamil', 'Hindi'],
    availableSlots: [
      { day: 'Tue', time: '07:00 AM' },
      { day: 'Tue', time: '05:30 PM' },
      { day: 'Thu', time: '07:00 AM' },
      { day: 'Thu', time: '05:30 PM' },
      { day: 'Sat', time: '08:00 AM' },
    ],
    reviews: [
      { author: 'Ananya S.', rating: 5, text: 'Her Vinyasa flow classes are incredibly well-sequenced. I feel energized after every session.', date: '2026-03-20' },
      { author: 'Dev P.', rating: 5, text: 'Meera ma\'am makes Ashtanga accessible even for beginners.', date: '2026-02-10' },
    ],
  },
  {
    id: 'inst-003',
    name: 'Swami Dhyanananda',
    slug: 'swami-dhyanananda',
    photo: '/images/wellness/instructors/dhyanananda.jpg',
    specialty: ['Guided Meditation', 'Transcendental Meditation'],
    category: 'meditation',
    experience: 20,
    rating: 4.9,
    reviewCount: 512,
    pricePerSession: 799,
    bio: 'Swami Dhyanananda spent 8 years in silent retreat at Rishikesh ashrams before beginning to teach. His meditation sessions draw from Vedantic traditions and are known for their profound depth and transformative effect.',
    certifications: ['Sivananda Yoga Vedanta', 'Transcendental Meditation Teacher', 'Vedanta Academy Graduate'],
    languages: ['Hindi', 'English', 'Sanskrit'],
    availableSlots: [
      { day: 'Mon', time: '05:30 AM' },
      { day: 'Wed', time: '05:30 AM' },
      { day: 'Fri', time: '05:30 AM' },
      { day: 'Sun', time: '06:00 AM' },
    ],
    reviews: [
      { author: 'Kavita R.', rating: 5, text: 'Swamiji\'s guided meditations have completely changed my relationship with stillness.', date: '2026-04-01' },
      { author: 'Arjun N.', rating: 5, text: 'The most peaceful meditation sessions I have experienced. His voice alone calms the mind.', date: '2026-03-15' },
      { author: 'Lakshmi V.', rating: 5, text: 'After 21 days with Swamiji, my anxiety reduced significantly. Truly grateful.', date: '2026-02-20' },
    ],
  },
  {
    id: 'inst-004',
    name: 'Anita Desai',
    slug: 'anita-desai',
    photo: '/images/wellness/instructors/anita.jpg',
    specialty: ['Mindfulness', 'Chakra Meditation'],
    category: 'meditation',
    experience: 10,
    rating: 4.7,
    reviewCount: 189,
    pricePerSession: 449,
    bio: 'Anita combines modern mindfulness techniques with traditional chakra work. Having trained at Spirit Rock and in India, she bridges Eastern wisdom with Western psychology to make meditation accessible to everyone.',
    certifications: ['MBSR Certified', 'Spirit Rock Teacher Training', 'Chakra Healing Diploma'],
    languages: ['Hindi', 'English', 'Marathi'],
    availableSlots: [
      { day: 'Mon', time: '07:00 AM' },
      { day: 'Mon', time: '07:00 PM' },
      { day: 'Tue', time: '07:00 PM' },
      { day: 'Thu', time: '07:00 AM' },
      { day: 'Sat', time: '09:00 AM' },
    ],
    reviews: [
      { author: 'Neha G.', rating: 5, text: 'Anita ma\'am explains chakras in a way that actually makes sense. No woo-woo, just clarity.', date: '2026-03-18' },
      { author: 'Vikram T.', rating: 4, text: 'Good mindfulness sessions, helped me focus better at work.', date: '2026-02-05' },
    ],
  },
  {
    id: 'inst-005',
    name: 'Rajesh Kulkarni',
    slug: 'rajesh-kulkarni',
    photo: '/images/wellness/instructors/rajesh.jpg',
    specialty: ['Kundalini Yoga', 'Sound Bath'],
    category: 'yoga',
    experience: 15,
    rating: 4.8,
    reviewCount: 276,
    pricePerSession: 699,
    bio: 'Rajesh trained at the Kundalini Research Institute and has been teaching for 15 years. His sessions weave together breathwork, mantra, and movement to awaken dormant energy. He also conducts powerful sound bath healing sessions.',
    certifications: ['KRI Level 2', 'Sound Healing Practitioner', 'Yoga Alliance E-RYT 200'],
    languages: ['Hindi', 'English', 'Kannada'],
    availableSlots: [
      { day: 'Tue', time: '06:00 AM' },
      { day: 'Thu', time: '06:00 AM' },
      { day: 'Sat', time: '06:00 AM' },
      { day: 'Sun', time: '07:00 AM' },
    ],
    reviews: [
      { author: 'Pooja M.', rating: 5, text: 'The sound bath was unlike anything I have experienced. Deeply healing.', date: '2026-03-25' },
      { author: 'Amit S.', rating: 5, text: 'Rajesh sir\'s Kundalini classes are intense but transformative. Highly recommend.', date: '2026-02-14' },
    ],
  },
  {
    id: 'inst-006',
    name: 'Nandini Raghavan',
    slug: 'nandini-raghavan',
    photo: '/images/wellness/instructors/nandini.jpg',
    specialty: ['Yin Yoga', 'Yoga Nidra'],
    category: 'yoga',
    experience: 7,
    rating: 4.6,
    reviewCount: 154,
    pricePerSession: 399,
    bio: 'Nandini specializes in slower, restorative practices. Her Yin Yoga sessions target deep connective tissue while Yoga Nidra classes guide students into conscious sleep states for deep restoration and healing.',
    certifications: ['RYT 200', 'Yin Yoga Teacher Training (Paul Grilley lineage)', 'iRest Yoga Nidra Level 1'],
    languages: ['English', 'Tamil'],
    availableSlots: [
      { day: 'Mon', time: '08:00 PM' },
      { day: 'Wed', time: '08:00 PM' },
      { day: 'Fri', time: '08:00 PM' },
      { day: 'Sun', time: '09:00 AM' },
    ],
    reviews: [
      { author: 'Ritika J.', rating: 5, text: 'Her Yoga Nidra sessions are the best sleep medicine. I wake up feeling completely renewed.', date: '2026-04-02' },
      { author: 'Sanjay L.', rating: 4, text: 'Very calming Yin sessions. Exactly what I needed after long work days.', date: '2026-03-01' },
    ],
  },
  {
    id: 'inst-007',
    name: 'Acharya Goenkaji',
    slug: 'acharya-goenkaji',
    photo: '/images/wellness/instructors/goenkaji.jpg',
    specialty: ['Vipassana', 'Insight Meditation'],
    category: 'vipassana',
    experience: 25,
    rating: 4.9,
    reviewCount: 687,
    pricePerSession: 999,
    bio: 'Acharya Goenkaji has been a Vipassana teacher for over 25 years, having trained in the tradition of S.N. Goenka. He leads 10-day residential retreats and preparatory courses, helping thousands of students discover the art of living through self-observation.',
    certifications: ['Vipassana Assistant Teacher (Goenka tradition)', 'Dhamma Seva Leader'],
    languages: ['Hindi', 'English', 'Gujarati'],
    availableSlots: [
      { day: 'Sat', time: '05:00 AM' },
      { day: 'Sun', time: '05:00 AM' },
    ],
    reviews: [
      { author: 'Manoj K.', rating: 5, text: 'The 10-day retreat with Acharyaji was the most profound experience of my life.', date: '2026-03-30' },
      { author: 'Deepa B.', rating: 5, text: 'His preparatory sessions set me up perfectly for my first Vipassana retreat.', date: '2026-02-22' },
      { author: 'Suresh P.', rating: 5, text: 'Clear, patient, deeply wise. Acharyaji embodies everything he teaches.', date: '2026-01-10' },
    ],
  },
  {
    id: 'inst-008',
    name: 'Kavya Menon',
    slug: 'kavya-menon',
    photo: '/images/wellness/instructors/kavya.jpg',
    specialty: ['Meditation', 'Vipassana Preparation'],
    category: 'meditation',
    experience: 6,
    rating: 4.5,
    reviewCount: 98,
    pricePerSession: 299,
    bio: 'Kavya is one of the youngest meditation teachers on the platform. After completing her first Vipassana at age 18, she went on to study contemplative psychology. She now guides beginners through their first meditation experiences with warmth and clarity.',
    certifications: ['Vipassana Meditator (30+ retreats)', 'MBCT Practitioner', 'Contemplative Psychology Certificate'],
    languages: ['Hindi', 'English', 'Malayalam'],
    availableSlots: [
      { day: 'Mon', time: '06:30 AM' },
      { day: 'Tue', time: '06:30 AM' },
      { day: 'Wed', time: '06:30 AM' },
      { day: 'Thu', time: '06:30 AM' },
      { day: 'Fri', time: '06:30 AM' },
      { day: 'Sat', time: '08:00 AM' },
    ],
    reviews: [
      { author: 'Ishaan R.', rating: 5, text: 'Kavya makes meditation feel approachable. Perfect for someone like me who overthinks everything.', date: '2026-04-05' },
      { author: 'Megha T.', rating: 4, text: 'Good introductory sessions. She is patient and explains things clearly.', date: '2026-03-08' },
    ],
  },
];

const sessions = [
  { id: 'ses-001', title: 'Morning Hatha Flow', instructorId: 'inst-001', instructorName: 'Aarav Sharma', category: 'yoga', type: 'Hatha Yoga', date: '2026-04-18', time: '06:00 AM', duration: 60, spotsLeft: 8, totalSpots: 20, price: 299, isLive: true },
  { id: 'ses-002', title: 'Power Vinyasa', instructorId: 'inst-002', instructorName: 'Meera Iyer', category: 'yoga', type: 'Vinyasa', date: '2026-04-18', time: '07:00 AM', duration: 75, spotsLeft: 5, totalSpots: 15, price: 349, isLive: true },
  { id: 'ses-003', title: 'Guided Morning Meditation', instructorId: 'inst-003', instructorName: 'Swami Dhyanananda', category: 'meditation', type: 'Guided Meditation', date: '2026-04-18', time: '05:30 AM', duration: 45, spotsLeft: 20, totalSpots: 50, price: 199, isLive: true },
  { id: 'ses-004', title: 'Chakra Alignment Session', instructorId: 'inst-004', instructorName: 'Anita Desai', category: 'meditation', type: 'Chakra Meditation', date: '2026-04-19', time: '07:00 PM', duration: 60, spotsLeft: 12, totalSpots: 25, price: 249, isLive: true },
  { id: 'ses-005', title: 'Kundalini Awakening', instructorId: 'inst-005', instructorName: 'Rajesh Kulkarni', category: 'yoga', type: 'Kundalini Yoga', date: '2026-04-19', time: '06:00 AM', duration: 90, spotsLeft: 6, totalSpots: 15, price: 449, isLive: true },
  { id: 'ses-006', title: 'Yin & Restore', instructorId: 'inst-006', instructorName: 'Nandini Raghavan', category: 'yoga', type: 'Yin Yoga', date: '2026-04-20', time: '08:00 PM', duration: 60, spotsLeft: 15, totalSpots: 20, price: 249, isLive: true },
  { id: 'ses-007', title: 'Vipassana Introduction', instructorId: 'inst-007', instructorName: 'Acharya Goenkaji', category: 'vipassana', type: 'Vipassana', date: '2026-04-20', time: '05:00 AM', duration: 120, spotsLeft: 10, totalSpots: 30, price: 0, isLive: true },
  { id: 'ses-008', title: 'Mindfulness for Beginners', instructorId: 'inst-008', instructorName: 'Kavya Menon', category: 'meditation', type: 'Mindfulness', date: '2026-04-21', time: '06:30 AM', duration: 30, spotsLeft: 25, totalSpots: 40, price: 149, isLive: true },
  { id: 'ses-009', title: 'Sound Bath Healing', instructorId: 'inst-005', instructorName: 'Rajesh Kulkarni', category: 'meditation', type: 'Sound Bath', date: '2026-04-21', time: '07:00 PM', duration: 60, spotsLeft: 3, totalSpots: 12, price: 499, isLive: true },
  { id: 'ses-010', title: 'Ashtanga Primary Series', instructorId: 'inst-002', instructorName: 'Meera Iyer', category: 'yoga', type: 'Ashtanga', date: '2026-04-22', time: '06:00 AM', duration: 90, spotsLeft: 4, totalSpots: 10, price: 399, isLive: true },
];

const bookings: Array<{ id: string; sessionId: string; userId: string; status: string; bookedAt: string }> = [];

export async function wellnessRoutes(server: FastifyInstance) {
  // ─── GET /instructors ──────────────────────────────────────────────────────
  server.get('/instructors', async (request) => {
    const { category, specialty } = request.query as {
      category?: string;
      specialty?: string;
    };

    let filtered = [...instructors];

    if (category) {
      filtered = filtered.filter((i) => i.category === category);
    }
    if (specialty) {
      filtered = filtered.filter((i) =>
        i.specialty.some((s) => s.toLowerCase().includes(specialty.toLowerCase()))
      );
    }

    return {
      instructors: filtered.map(({ reviews, ...rest }) => rest),
      total: filtered.length,
    };
  });

  // ─── GET /instructors/:id ──────────────────────────────────────────────────
  server.get('/instructors/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const instructor = instructors.find((i) => i.id === id || i.slug === id);

    if (!instructor) {
      return reply.code(404).send({ error: 'Instructor not found.' });
    }

    return { instructor };
  });

  // ─── GET /sessions ─────────────────────────────────────────────────────────
  server.get('/sessions', async (request) => {
    const { category, date } = request.query as {
      category?: string;
      date?: string;
    };

    let filtered = [...sessions];

    if (category) {
      filtered = filtered.filter((s) => s.category === category);
    }
    if (date) {
      filtered = filtered.filter((s) => s.date === date);
    }

    return { sessions: filtered, total: filtered.length };
  });

  // ─── POST /book ────────────────────────────────────────────────────────────
  server.post('/book', async (request, reply) => {
    const { sessionId, userId, name, email } = request.body as {
      sessionId: string;
      userId?: string;
      name?: string;
      email?: string;
    };

    if (!sessionId) {
      return reply.code(400).send({ error: 'sessionId is required.' });
    }

    const session = sessions.find((s) => s.id === sessionId);
    if (!session) {
      return reply.code(404).send({ error: 'Session not found.' });
    }

    if (session.spotsLeft <= 0) {
      return reply.code(400).send({ error: 'Session is fully booked.' });
    }

    session.spotsLeft -= 1;

    const booking = {
      id: `bk-${Date.now()}`,
      sessionId,
      userId: userId || 'guest',
      status: 'confirmed',
      bookedAt: new Date().toISOString(),
    };

    bookings.push(booking);

    return {
      booking,
      session: {
        title: session.title,
        date: session.date,
        time: session.time,
        instructor: session.instructorName,
      },
      message: 'Session booked successfully.',
    };
  });
}
