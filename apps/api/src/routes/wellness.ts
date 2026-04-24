import { FastifyInstance } from 'fastify';

// ─── Static Instructor Data ─────────────────────────────────────────────────

const instructors = [
  {
    id: 'inst-001',
    name: 'Aarav Sharma',
    slug: 'aarav-sharma',
    photo: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
    specialty: ['Hatha Yoga', 'Pranayama'],
    category: 'yoga',
    experience: 12,
    rating: 4.9,
    reviewCount: 342,
    pricePerSession: 599,
    bio: 'Trained at the Bihar School of Yoga under Swami Niranjanananda Saraswati, Aarav has spent 12 years teaching Hatha and Pranayama across India and Southeast Asia. His teaching philosophy emphasizes the classical eight-limbed path of Patanjali, with special focus on breath-body alignment. Classes are suitable for all levels — from complete beginners to advanced practitioners. He is known for his gentle adjustments and ability to modify poses for those with injuries or physical limitations. Aarav also conducts 200-hour Yoga Teacher Training programs twice a year in Rishikesh.',
    certifications: ['E-RYT 500', 'Bihar School of Yoga Diploma', 'Yoga Alliance India', 'Pranayama Specialist Certificate'],
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
      { author: 'Priya M.', rating: 5, text: 'Aarav sir transformed my morning routine. His pranayama guidance is exceptional — I can now do Nadi Shodhana for 20 minutes effortlessly.', date: '2026-03-12' },
      { author: 'Rohit K.', rating: 5, text: 'Best Hatha yoga teacher I have found online. Very patient, attentive, and adjusts poses with precision.', date: '2026-02-28' },
      { author: 'Sneha D.', rating: 4, text: 'Good sessions, wish they were longer. Very knowledgeable instructor with deep understanding of anatomy.', date: '2026-01-15' },
    ],
  },
  {
    id: 'inst-002',
    name: 'Meera Iyer',
    slug: 'meera-iyer',
    photo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    specialty: ['Vinyasa Flow', 'Ashtanga'],
    category: 'yoga',
    experience: 8,
    rating: 4.8,
    reviewCount: 218,
    pricePerSession: 499,
    bio: 'Meera discovered yoga during her college years in Mysore and went on to train under Sharath Jois at KPJAYI (Krishna Pattabhi Jois Ashtanga Yoga Institute). She specializes in dynamic Vinyasa flows and traditional Ashtanga sequences that build strength, flexibility, and mental focus. Her classes are energetic yet mindful, incorporating Sun Salutation variations, arm balances, and backbends progressions. Meera has completed over 3,000 teaching hours and leads annual Ashtanga intensives in Mysore.',
    certifications: ['RYT 500', 'Ashtanga Yoga Mysore Certification', 'KPJAYI Authorized Level 1'],
    languages: ['English', 'Tamil', 'Hindi'],
    availableSlots: [
      { day: 'Tue', time: '07:00 AM' },
      { day: 'Tue', time: '05:30 PM' },
      { day: 'Thu', time: '07:00 AM' },
      { day: 'Thu', time: '05:30 PM' },
      { day: 'Sat', time: '08:00 AM' },
    ],
    reviews: [
      { author: 'Ananya S.', rating: 5, text: 'Her Vinyasa flow classes are incredibly well-sequenced. I feel energized and focused after every session.', date: '2026-03-20' },
      { author: 'Dev P.', rating: 5, text: 'Meera ma\'am makes Ashtanga accessible even for beginners. She builds up to challenging poses gradually.', date: '2026-02-10' },
    ],
  },
  {
    id: 'inst-003',
    name: 'Swami Dhyanananda',
    slug: 'swami-dhyanananda',
    photo: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
    specialty: ['Guided Meditation', 'Transcendental Meditation'],
    category: 'meditation',
    experience: 20,
    rating: 4.9,
    reviewCount: 512,
    pricePerSession: 799,
    bio: 'Swami Dhyanananda spent 8 years in silent retreat at Sivananda Ashram, Rishikesh before beginning to teach. His meditation sessions draw from Vedantic traditions — Atma Vichara (self-inquiry), Trataka (candle gazing), and Yoga Nidra (yogic sleep). He is an initiated disciple of the Sivananda lineage and holds a degree from Vedanta Academy, Malavli. Swamiji has guided over 5,000 students into deeper meditation states and his guided audio meditations on the Poojly app have been listened to over 100,000 times. He is known for his profound depth, gentle voice, and ability to create spaces of deep silence.',
    certifications: ['Sivananda Yoga Vedanta', 'Transcendental Meditation Teacher', 'Vedanta Academy Graduate'],
    languages: ['Hindi', 'English', 'Sanskrit'],
    availableSlots: [
      { day: 'Mon', time: '05:30 AM' },
      { day: 'Wed', time: '05:30 AM' },
      { day: 'Fri', time: '05:30 AM' },
      { day: 'Sun', time: '06:00 AM' },
    ],
    reviews: [
      { author: 'Kavita R.', rating: 5, text: 'Swamiji\'s guided meditations have completely changed my relationship with stillness. I now meditate daily.', date: '2026-04-01' },
      { author: 'Arjun N.', rating: 5, text: 'The most peaceful meditation sessions I have experienced. His voice alone calms the mind instantly.', date: '2026-03-15' },
      { author: 'Lakshmi V.', rating: 5, text: 'After 21 days with Swamiji, my anxiety reduced significantly. Doctor confirmed lower cortisol. Truly grateful.', date: '2026-02-20' },
    ],
  },
  {
    id: 'inst-004',
    name: 'Anita Desai',
    slug: 'anita-desai',
    photo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    specialty: ['Mindfulness', 'Chakra Meditation'],
    category: 'meditation',
    experience: 10,
    rating: 4.7,
    reviewCount: 189,
    pricePerSession: 449,
    bio: 'Anita combines modern mindfulness techniques (MBSR — Mindfulness Based Stress Reduction) with traditional chakra work and Tibetan Buddhist practices. Having trained at Spirit Rock Meditation Center in California and at various ashrams in Dharamsala, she bridges Eastern wisdom with Western psychology. Her approach is secular and accessible — making meditation practical for corporate professionals, students, and anyone dealing with stress, anxiety, or burnout. She runs a popular 8-week MBSR course and conducts corporate wellness programs for companies including Infosys and TCS.',
    certifications: ['MBSR Certified (UMass Medical School)', 'Spirit Rock Teacher Training', 'Chakra Healing Diploma', 'Corporate Wellness Coach'],
    languages: ['Hindi', 'English', 'Marathi'],
    availableSlots: [
      { day: 'Mon', time: '07:00 AM' },
      { day: 'Mon', time: '07:00 PM' },
      { day: 'Tue', time: '07:00 PM' },
      { day: 'Thu', time: '07:00 AM' },
      { day: 'Sat', time: '09:00 AM' },
    ],
    reviews: [
      { author: 'Neha G.', rating: 5, text: 'Anita ma\'am explains chakras in a way that actually makes sense. No woo-woo, just clarity and practical exercises.', date: '2026-03-18' },
      { author: 'Vikram T.', rating: 4, text: 'Good mindfulness sessions, helped me focus better at work. The body scan technique is now part of my daily routine.', date: '2026-02-05' },
    ],
  },
  {
    id: 'inst-005',
    name: 'Rajesh Kulkarni',
    slug: 'rajesh-kulkarni',
    photo: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
    specialty: ['Kundalini Yoga', 'Sound Bath'],
    category: 'yoga',
    experience: 15,
    rating: 4.8,
    reviewCount: 276,
    pricePerSession: 699,
    bio: 'Rajesh trained at the Kundalini Research Institute (KRI) in New Mexico and has been teaching for 15 years. His sessions weave together breathwork (pranayama), mantra chanting, mudra, and dynamic kriyas to awaken dormant energy (Kundalini Shakti). He also conducts powerful sound bath healing sessions using Tibetan singing bowls, crystal bowls, gongs, and tanpura. Rajesh holds the unique distinction of being both a KRI Level 2 teacher and a certified Sound Healing Practitioner — combining these modalities for deeply transformative experiences. His Kundalini + Sound Bath combination sessions are consistently sold out.',
    certifications: ['KRI Level 2 Kundalini Teacher', 'Sound Healing Practitioner (ISHA)', 'Yoga Alliance E-RYT 200', 'Nada Yoga Certificate'],
    languages: ['Hindi', 'English', 'Kannada'],
    availableSlots: [
      { day: 'Tue', time: '06:00 AM' },
      { day: 'Thu', time: '06:00 AM' },
      { day: 'Sat', time: '06:00 AM' },
      { day: 'Sun', time: '07:00 AM' },
    ],
    reviews: [
      { author: 'Pooja M.', rating: 5, text: 'The sound bath was unlike anything I have experienced. I felt vibrations in every cell. Deeply healing.', date: '2026-03-25' },
      { author: 'Amit S.', rating: 5, text: 'Rajesh sir\'s Kundalini classes are intense but transformative. The Breath of Fire practice changed my energy levels.', date: '2026-02-14' },
    ],
  },
  {
    id: 'inst-006',
    name: 'Nandini Raghavan',
    slug: 'nandini-raghavan',
    photo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    specialty: ['Yin Yoga', 'Yoga Nidra'],
    category: 'yoga',
    experience: 7,
    rating: 4.6,
    reviewCount: 154,
    pricePerSession: 399,
    bio: 'Nandini specializes in slower, restorative practices that complement the busy modern lifestyle. Her Yin Yoga sessions target deep connective tissue (fascia, ligaments, joints) through long-held passive poses (3-5 minutes each), promoting deep flexibility and joint health. Her Yoga Nidra (yogic sleep) classes guide students into the hypnagogic state — the borderland between waking and sleeping — for deep restoration, emotional processing, and subconscious healing. Trained in the Paul Grilley lineage of Yin Yoga and the iRest protocol for Yoga Nidra, Nandini\'s classes are particularly beneficial for insomnia, chronic fatigue, and PTSD recovery.',
    certifications: ['RYT 200', 'Yin Yoga Teacher Training (Paul Grilley lineage)', 'iRest Yoga Nidra Level 1', 'Restorative Yoga Certificate'],
    languages: ['English', 'Tamil'],
    availableSlots: [
      { day: 'Mon', time: '08:00 PM' },
      { day: 'Wed', time: '08:00 PM' },
      { day: 'Fri', time: '08:00 PM' },
      { day: 'Sun', time: '09:00 AM' },
    ],
    reviews: [
      { author: 'Ritika J.', rating: 5, text: 'Her Yoga Nidra sessions are the best sleep medicine. I wake up feeling completely renewed after a 45-minute session.', date: '2026-04-02' },
      { author: 'Sanjay L.', rating: 4, text: 'Very calming Yin sessions. Exactly what I needed after long work days. My hip flexibility has improved dramatically.', date: '2026-03-01' },
    ],
  },
  {
    id: 'inst-007',
    name: 'Acharya Goenkaji',
    slug: 'acharya-goenkaji',
    photo: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
    specialty: ['Vipassana', 'Insight Meditation'],
    category: 'vipassana',
    experience: 25,
    rating: 4.9,
    reviewCount: 687,
    pricePerSession: 999,
    bio: 'Acharya Goenkaji has been a Vipassana teacher for over 25 years, having trained in the tradition of S.N. Goenka. He leads 10-day residential retreats, 3-day refresher courses, and online preparatory sessions that introduce the technique of observing bodily sensations with equanimity. Vipassana, meaning "to see things as they really are," is one of India\'s most ancient meditation techniques, rediscovered by Gotama Buddha 2,500 years ago. Acharyaji\'s retreats follow the strict schedule of the Goenka tradition — noble silence, no reading/writing, 4 AM wake-up, and 10+ hours of meditation daily. He has guided thousands of students through this profound practice at centers in Igatpuri, Dhamma Giri, and Dharamsala.',
    certifications: ['Vipassana Assistant Teacher (Goenka tradition)', 'Dhamma Seva Leader', 'Pali Language Scholar'],
    languages: ['Hindi', 'English', 'Gujarati'],
    availableSlots: [
      { day: 'Sat', time: '05:00 AM' },
      { day: 'Sun', time: '05:00 AM' },
    ],
    reviews: [
      { author: 'Manoj K.', rating: 5, text: 'The 10-day retreat with Acharyaji was the most profound experience of my life. I understood suffering at a cellular level.', date: '2026-03-30' },
      { author: 'Deepa B.', rating: 5, text: 'His preparatory sessions set me up perfectly for my first Vipassana retreat. The body scan technique was life-changing.', date: '2026-02-22' },
      { author: 'Suresh P.', rating: 5, text: 'Clear, patient, deeply wise. Acharyaji embodies everything he teaches. 25 years of practice shines through.', date: '2026-01-10' },
    ],
  },
  {
    id: 'inst-008',
    name: 'Kavya Menon',
    slug: 'kavya-menon',
    photo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    specialty: ['Meditation', 'Vipassana Preparation'],
    category: 'meditation',
    experience: 6,
    rating: 4.5,
    reviewCount: 98,
    pricePerSession: 299,
    bio: 'Kavya is one of the youngest meditation teachers on the platform. After completing her first Vipassana at age 18, she went on to study Contemplative Psychology at Naropa University. She now guides beginners through their first meditation experiences with warmth, humor, and clarity. Her "21-Day Meditation Kickstart" program on Poojly has helped over 2,000 people establish a daily practice. Kavya also specializes in meditation for anxiety, using a combination of MBCT (Mindfulness-Based Cognitive Therapy) and traditional breath-counting techniques from the Buddhist tradition.',
    certifications: ['Vipassana Meditator (30+ retreats)', 'MBCT Practitioner', 'Contemplative Psychology Certificate (Naropa)', 'Youth Meditation Teacher'],
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
      { author: 'Ishaan R.', rating: 5, text: 'Kavya makes meditation feel approachable. Perfect for someone like me who overthinks everything. Her 21-day program worked.', date: '2026-04-05' },
      { author: 'Megha T.', rating: 4, text: 'Good introductory sessions. She is patient and explains things clearly without being preachy.', date: '2026-03-08' },
    ],
  },
  // ── Ayurveda Instructors ──
  {
    id: 'inst-009',
    name: 'Dr. Kavita Nair',
    slug: 'dr-kavita-nair',
    photo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80',
    specialty: ['Ayurveda Consultation', 'Panchakarma', 'Dosha Assessment'],
    category: 'ayurveda',
    experience: 17,
    rating: 4.9,
    reviewCount: 324,
    pricePerSession: 1500,
    bio: 'Dr. Kavita Nair holds BAMS (Bachelor of Ayurvedic Medicine and Surgery) from Kerala University and MD (Ayurveda) in Panchakarma from Gujarat Ayurved University. With 17 years of clinical experience, she specializes in Prakriti analysis (constitutional body type assessment), dietary counseling based on dosha balance, and Panchakarma therapeutic protocols. Her online consultations include detailed pulse diagnosis (Nadi Pariksha) guidance, personalized herb prescriptions, and seasonal detox programs (Ritucharya). She has treated over 8,000 patients and authored two books on Ayurvedic lifestyle management. She consults from the Kottakkal Arya Vaidya Sala tradition.',
    certifications: ['BAMS', 'MD Ayurveda (Panchakarma)', 'Kottakkal Arya Vaidya Sala Fellowship', 'Yoga Therapy Integration'],
    languages: ['English', 'Hindi', 'Malayalam', 'Sanskrit'],
    availableSlots: [
      { day: 'Mon', time: '10:00 AM' },
      { day: 'Wed', time: '10:00 AM' },
      { day: 'Fri', time: '10:00 AM' },
      { day: 'Sat', time: '11:00 AM' },
    ],
    reviews: [
      { author: 'Deepak S.', rating: 5, text: 'Dr. Kavita identified my Pitta imbalance in the first session. Her dietary recommendations cleared my chronic acidity in 3 weeks.', date: '2026-03-28' },
      { author: 'Swati K.', rating: 5, text: 'The Panchakarma detox program she designed for me was transformative. Lost 5kg, skin cleared up, energy levels doubled.', date: '2026-02-18' },
    ],
  },
  {
    id: 'inst-010',
    name: 'Arjun Kapoor',
    slug: 'arjun-kapoor',
    photo: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80',
    specialty: ['Sound Healing', 'Mantra Chanting', 'Nada Yoga'],
    category: 'meditation',
    experience: 7,
    rating: 4.7,
    reviewCount: 156,
    pricePerSession: 599,
    bio: 'Arjun is a certified Sound Healing Practitioner trained at the Himalayan Singing Bowl Academy in Nepal. He uses a combination of Tibetan singing bowls (7 bowls tuned to the 7 chakras), crystal quartz bowls, planetary gongs, and Sanskrit mantra chanting for therapeutic sound experiences. His Nada Yoga sessions explore the ancient Indian science of sound vibration — from the Om resonance to the subtlest internal sounds (Anahata Nada). Each session is designed to induce deep relaxation, release emotional blockages, and harmonize the nervous system. Arjun also creates custom sound healing recordings for sleep and meditation.',
    certifications: ['Himalayan Singing Bowl Practitioner', 'Nada Yoga Certificate (Rishikesh)', 'Crystal Bowl Sound Therapy'],
    languages: ['Hindi', 'English'],
    availableSlots: [
      { day: 'Tue', time: '07:00 PM' },
      { day: 'Thu', time: '07:00 PM' },
      { day: 'Sat', time: '06:00 PM' },
      { day: 'Sun', time: '10:00 AM' },
    ],
    reviews: [
      { author: 'Ritu M.', rating: 5, text: 'The sound bath session was deeply moving. I could feel vibrations clearing my throat chakra. Slept like a baby after.', date: '2026-04-01' },
      { author: 'Aakash P.', rating: 4, text: 'Unique experience. The singing bowl + mantra combination is powerful. I now listen to his recordings every night.', date: '2026-03-10' },
    ],
  },
];

// ─── Programs & Retreats ────────────────────────────────────────────────────

const programs = [
  {
    id: 'prog-001',
    title: '21-Day Meditation Kickstart',
    category: 'meditation',
    instructorId: 'inst-008',
    instructorName: 'Kavya Menon',
    description: 'A structured 21-day program to build a daily meditation habit. Starts with 5 minutes and builds to 20 minutes. Includes guided audio, journaling prompts, and weekly live check-ins.',
    duration: '21 days',
    sessionsPerWeek: 7,
    price: 1999,
    level: 'beginner',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
    features: ['Daily guided audio (5-20 min)', '3 live group sessions', 'Journaling workbook', 'Community chat', 'Certificate of completion'],
    startDates: ['2026-05-01', '2026-06-01', '2026-07-01'],
    spotsTotal: 50,
    spotsLeft: 18,
  },
  {
    id: 'prog-002',
    title: 'Ashtanga Primary Series Intensive',
    category: 'yoga',
    instructorId: 'inst-002',
    instructorName: 'Meera Iyer',
    description: 'An 8-week deep dive into the Ashtanga Primary Series (Yoga Chikitsa). Learn the full sequence of 75 postures with proper vinyasa counting, drishti (gaze), and bandha (energy locks). Suitable for intermediate practitioners.',
    duration: '8 weeks',
    sessionsPerWeek: 3,
    price: 5999,
    level: 'intermediate',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
    features: ['24 live sessions (75 min each)', 'Pose-by-pose video library', 'Weekly adjustment clinics', 'Progress tracking sheet', 'Mysore-style practice tips'],
    startDates: ['2026-05-05', '2026-07-06'],
    spotsTotal: 15,
    spotsLeft: 6,
  },
  {
    id: 'prog-003',
    title: 'Vipassana 10-Day Residential Retreat',
    category: 'vipassana',
    instructorId: 'inst-007',
    instructorName: 'Acharya Goenkaji',
    description: 'A traditional 10-day Vipassana meditation retreat in the S.N. Goenka tradition. Noble silence, 4 AM start, 10+ hours of meditation daily. Includes accommodation, vegetarian meals, and instruction. This is a donation-based program (suggested contribution listed).',
    duration: '10 days',
    sessionsPerWeek: 14,
    price: 0,
    level: 'all-levels',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
    features: ['Full residential retreat', 'Vegetarian meals included', 'Personal meditation cell', 'Daily dhamma talks', 'Noble silence environment', 'Donation-based (suggested: ₹5,000)'],
    startDates: ['2026-05-15', '2026-06-20', '2026-07-15', '2026-08-20'],
    spotsTotal: 30,
    spotsLeft: 10,
  },
  {
    id: 'prog-004',
    title: 'Ayurveda Seasonal Detox (Ritucharya)',
    category: 'ayurveda',
    instructorId: 'inst-009',
    instructorName: 'Dr. Kavita Nair',
    description: 'A 14-day Ayurvedic detox program aligned with seasonal transitions (Ritu Sandhi). Includes dosha assessment, personalized dietary plan, herbal supplements, daily self-massage (Abhyanga) guidance, and home Panchakarma techniques. Designed to reset digestion, boost immunity, and restore energy.',
    duration: '14 days',
    sessionsPerWeek: 3,
    price: 4999,
    level: 'all-levels',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
    features: ['Dosha assessment consultation', 'Personalized diet chart', 'Herbal supplement prescription', 'Daily Abhyanga (self-massage) guide', 'Home Panchakarma protocols', '3 live consultations', 'Detox recipe book'],
    startDates: ['2026-05-01', '2026-06-15'],
    spotsTotal: 20,
    spotsLeft: 12,
  },
  {
    id: 'prog-005',
    title: 'Kundalini Awakening — 40-Day Sadhana',
    category: 'yoga',
    instructorId: 'inst-005',
    instructorName: 'Rajesh Kulkarni',
    description: 'A traditional 40-day Kundalini Yoga sadhana (spiritual practice). In the Kundalini tradition, 40 consecutive days of practice is believed to break old habits and establish new neural pathways. Each session includes breathwork (Breath of Fire, alternate nostril), kriyas (physical sets), mantra meditation, and deep relaxation.',
    duration: '40 days',
    sessionsPerWeek: 7,
    price: 7999,
    level: 'intermediate',
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
    features: ['Daily live sessions (60 min)', 'Personal sadhana journal', 'Mantra audio library', 'Weekly check-ins', 'Certificate on 40-day completion', 'Sound bath bonus sessions (4x)'],
    startDates: ['2026-05-10', '2026-07-01'],
    spotsTotal: 20,
    spotsLeft: 8,
  },
  {
    id: 'prog-006',
    title: 'Corporate Mindfulness — 8-Week MBSR',
    category: 'meditation',
    instructorId: 'inst-004',
    instructorName: 'Anita Desai',
    description: 'The gold-standard Mindfulness-Based Stress Reduction (MBSR) program developed by Jon Kabat-Zinn at UMass Medical School. 8 weekly sessions of 2.5 hours each, plus a full-day silent retreat. Scientifically proven to reduce stress, anxiety, chronic pain, and improve immune function. Includes body scan, sitting meditation, mindful movement, and lovingkindness practices.',
    duration: '8 weeks',
    sessionsPerWeek: 1,
    price: 6999,
    level: 'beginner',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
    features: ['8 weekly live sessions (2.5 hrs)', 'Full-day silent retreat', 'MBSR workbook', 'Guided audio recordings', 'Weekly homework assignments', 'Certificate (UMass protocol)'],
    startDates: ['2026-05-03', '2026-07-05'],
    spotsTotal: 25,
    spotsLeft: 14,
  },
];

// ─── Sessions (upcoming live sessions) ──────────────────────────────────────

const sessions = [
  { id: 'ses-001', title: 'Morning Hatha Flow', instructorId: 'inst-001', instructorName: 'Aarav Sharma', category: 'yoga', type: 'Hatha Yoga', date: '2026-04-25', time: '06:00 AM', duration: 60, spotsLeft: 8, totalSpots: 20, price: 299, isLive: true },
  { id: 'ses-002', title: 'Power Vinyasa', instructorId: 'inst-002', instructorName: 'Meera Iyer', category: 'yoga', type: 'Vinyasa', date: '2026-04-25', time: '07:00 AM', duration: 75, spotsLeft: 5, totalSpots: 15, price: 349, isLive: true },
  { id: 'ses-003', title: 'Guided Morning Meditation', instructorId: 'inst-003', instructorName: 'Swami Dhyanananda', category: 'meditation', type: 'Guided Meditation', date: '2026-04-25', time: '05:30 AM', duration: 45, spotsLeft: 20, totalSpots: 50, price: 199, isLive: true },
  { id: 'ses-004', title: 'Chakra Alignment Session', instructorId: 'inst-004', instructorName: 'Anita Desai', category: 'meditation', type: 'Chakra Meditation', date: '2026-04-26', time: '07:00 PM', duration: 60, spotsLeft: 12, totalSpots: 25, price: 249, isLive: true },
  { id: 'ses-005', title: 'Kundalini Awakening', instructorId: 'inst-005', instructorName: 'Rajesh Kulkarni', category: 'yoga', type: 'Kundalini Yoga', date: '2026-04-26', time: '06:00 AM', duration: 90, spotsLeft: 6, totalSpots: 15, price: 449, isLive: true },
  { id: 'ses-006', title: 'Yin & Restore', instructorId: 'inst-006', instructorName: 'Nandini Raghavan', category: 'yoga', type: 'Yin Yoga', date: '2026-04-27', time: '08:00 PM', duration: 60, spotsLeft: 15, totalSpots: 20, price: 249, isLive: true },
  { id: 'ses-007', title: 'Vipassana Introduction', instructorId: 'inst-007', instructorName: 'Acharya Goenkaji', category: 'vipassana', type: 'Vipassana', date: '2026-04-27', time: '05:00 AM', duration: 120, spotsLeft: 10, totalSpots: 30, price: 0, isLive: true },
  { id: 'ses-008', title: 'Mindfulness for Beginners', instructorId: 'inst-008', instructorName: 'Kavya Menon', category: 'meditation', type: 'Mindfulness', date: '2026-04-28', time: '06:30 AM', duration: 30, spotsLeft: 25, totalSpots: 40, price: 149, isLive: true },
  { id: 'ses-009', title: 'Sound Bath Healing', instructorId: 'inst-010', instructorName: 'Arjun Kapoor', category: 'meditation', type: 'Sound Bath', date: '2026-04-28', time: '07:00 PM', duration: 60, spotsLeft: 3, totalSpots: 12, price: 499, isLive: true },
  { id: 'ses-010', title: 'Ashtanga Primary Series', instructorId: 'inst-002', instructorName: 'Meera Iyer', category: 'yoga', type: 'Ashtanga', date: '2026-04-29', time: '06:00 AM', duration: 90, spotsLeft: 4, totalSpots: 10, price: 399, isLive: true },
  { id: 'ses-011', title: 'Ayurveda: Know Your Dosha', instructorId: 'inst-009', instructorName: 'Dr. Kavita Nair', category: 'ayurveda', type: 'Consultation', date: '2026-04-29', time: '10:00 AM', duration: 60, spotsLeft: 8, totalSpots: 15, price: 799, isLive: true },
  { id: 'ses-012', title: 'Pranayama Masterclass', instructorId: 'inst-001', instructorName: 'Aarav Sharma', category: 'yoga', type: 'Pranayama', date: '2026-04-30', time: '06:00 AM', duration: 45, spotsLeft: 12, totalSpots: 20, price: 349, isLive: true },
  { id: 'ses-013', title: 'Yoga Nidra — Deep Rest', instructorId: 'inst-006', instructorName: 'Nandini Raghavan', category: 'yoga', type: 'Yoga Nidra', date: '2026-04-30', time: '09:00 PM', duration: 45, spotsLeft: 18, totalSpots: 30, price: 199, isLive: true },
  { id: 'ses-014', title: 'Nada Yoga & Mantra', instructorId: 'inst-010', instructorName: 'Arjun Kapoor', category: 'meditation', type: 'Nada Yoga', date: '2026-05-01', time: '06:30 AM', duration: 60, spotsLeft: 10, totalSpots: 15, price: 399, isLive: true },
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

  // ─── GET /programs ─────────────────────────────────────────────────────────
  server.get('/programs', async (request) => {
    const { category, level } = request.query as {
      category?: string;
      level?: string;
    };

    let filtered = [...programs];

    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (level) {
      filtered = filtered.filter((p) => p.level === level);
    }

    return { programs: filtered, total: filtered.length };
  });

  // ─── GET /programs/:id ─────────────────────────────────────────────────────
  server.get('/programs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const program = programs.find((p) => p.id === id);

    if (!program) {
      return reply.code(404).send({ error: 'Program not found.' });
    }

    return { program };
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
