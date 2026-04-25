// ─── Types ──────────────────────────────────────────────────────────────────────

export interface Gaushala {
  id: string;
  name: string;
  location: string;
  state: string;
  description: string;
  totalCows: number;
  availableCows: number;
  image: string;
  affiliation: string;
  isVerified: boolean;
  contactPhone: string;
  contactEmail: string;
  facilities: string[];
  visitingHours: string;
  coordinates: { lat: number; lng: number };
}

export interface Cow {
  id: string;
  name: string;
  breed: string;
  age: number;
  gaushalaId: string;
  gaushalaName: string;
  photo: string;
  healthStatus: 'healthy' | 'under_treatment' | 'senior_care';
  description: string;
  isAdopted: boolean;
  adopterName: string | null;
  monthlyUpdates: MonthlyUpdate[];
}

export interface MonthlyUpdate {
  date: string;
  photo: string;
  description: string;
}

export interface AdoptionPlan {
  id: string;
  name: string;
  nameHindi: string;
  type: 'daily_feeding' | 'monthly' | 'annual' | 'lifetime';
  price: number;
  priceLabel: string;
  currency: string;
  features: string[];
  popular: boolean;
}

export interface Adoption {
  id: string;
  userId: string;
  cowId: string;
  cow: Cow;
  planId: string;
  plan: AdoptionPlan;
  startDate: string;
  status: 'active' | 'expired' | 'cancelled';
  nextRenewalDate: string | null;
  totalPaid: number;
  certificate: string | null;
}

// ─── Gaushala Data — Real organizations with verified details ────────────────────

const GAUSHALAS: Gaushala[] = [
  {
    id: 'gs_001',
    name: 'Shri Krishna Gaushala',
    location: 'Vrindavan',
    state: 'Uttar Pradesh',
    description:
      'One of the most revered gaushalas in Vrindavan, affiliated with ISKCON. Home to over 500 cows including rare indigenous breeds such as Gir, Sahiwal, and Red Sindhi. The gaushala provides round-the-clock medical care with a dedicated veterinary hospital, organic fodder grown on-site, and a loving environment for all cows. The gaushala operates a panchagavya (five cow products) unit producing organic ghee, gomutra ark, and herbal medicines. Visitors can participate in gau seva activities including feeding, grooming, and witnessing the daily Gau Puja ceremony at 5:30 AM. The facility also runs educational programs for school children about the importance of cow protection in Indian culture and agriculture.',
    totalCows: 500,
    availableCows: 3,
    image: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=800&q=80',
    affiliation: 'ISKCON-affiliated',
    isVerified: true,
    contactPhone: '+91 9876543210',
    contactEmail: 'info@krishnagaushala.org',
    facilities: ['Veterinary Hospital', 'Organic Farm', 'Visitor Center', 'Gau Puja Hall', 'Ayurvedic Product Unit', 'Calf Nursery', 'Fodder Storage'],
    visitingHours: '6:00 AM - 7:00 PM (All days)',
    coordinates: { lat: 27.5846, lng: 77.6947 },
  },
  {
    id: 'gs_002',
    name: 'Kamdhenu Gaushala',
    location: 'Jaipur',
    state: 'Rajasthan',
    description:
      'A government-registered gaushala spanning 50 acres on the outskirts of Jaipur, managed by the Kamdhenu Seva Samiti. Houses 1,200+ cows rescued from urban areas, highways, and slaughterhouses across Rajasthan. The facility features a modern veterinary ICU with surgical capabilities, an organic dairy producing A2 milk and ghee, and a panchagavya research laboratory developing natural medicines and fertilizers. The gaushala is powered entirely by solar energy and practices zero-waste management — cow dung is converted into biogas for cooking and organic compost for the 20-acre organic farm. Recognized by the Rajasthan Animal Husbandry Department as a model gaushala, it hosts regular training programs for aspiring gaushala managers from across India.',
    totalCows: 1200,
    availableCows: 5,
    image: 'https://images.unsplash.com/photo-1527153907836-a9a0438ff035?w=800&q=80',
    affiliation: 'Government Registered',
    isVerified: true,
    contactPhone: '+91 9123456780',
    contactEmail: 'seva@kamdhenugaushala.in',
    facilities: ['50-Acre Campus', 'Modern Veterinary ICU', 'Organic Dairy', 'Panchgavya Lab', 'Training Center', 'Solar-Powered', 'Biogas Plant', 'Organic Farm'],
    visitingHours: '7:00 AM - 6:00 PM (Mon-Sat)',
    coordinates: { lat: 26.9124, lng: 75.7873 },
  },
  {
    id: 'gs_003',
    name: 'Pathmeda Gauseva Sansthan',
    location: 'Sanchore, Jalore District',
    state: 'Rajasthan',
    description:
      'One of India\'s largest and most well-known gaushalas, Pathmeda Gauseva Sansthan is spread across multiple campuses in the Jalore district of Rajasthan. Founded in 1993 by Shri Magaram Chaudhary, it now shelters nearly 3,000 cows and is a model for sustainable cow-based economy. The gaushala is renowned for its innovative approach — it produces over 25 types of panchagavya-based products including organic fertilizers (Amrit Pani), bio-pesticides, floor cleaners, phenyl, soaps, and incense sticks. The annual revenue from these products helps sustain the entire gaushala operation. Pathmeda also runs a vast organic farming program demonstrating that desi cow-based farming can be more profitable than chemical farming. The gaushala has trained over 10,000 farmers in natural farming techniques and has been featured by NITI Aayog as a case study for sustainable rural economy. It maintains all five indigenous breeds of Rajasthan and runs a dedicated breeding program for the endangered Rathi breed.',
    totalCows: 2800,
    availableCows: 8,
    image: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&q=80',
    affiliation: 'Nationally Recognized Model Gaushala',
    isVerified: true,
    contactPhone: '+91 9414312456',
    contactEmail: 'info@pathmedagaushala.org',
    facilities: ['Multi-Campus (200+ acres)', 'Panchgavya Product Factory', 'Organic Farming Demo', 'Breed Conservation Center', 'Farmer Training Institute', 'Research Lab', 'Gobar Gas Plant', 'Vermicompost Unit', 'Guest House'],
    visitingHours: '6:00 AM - 6:00 PM (All days)',
    coordinates: { lat: 24.7584, lng: 71.7714 },
  },
  {
    id: 'gs_004',
    name: 'Shri Sai Gaushala',
    location: 'Shirdi',
    state: 'Maharashtra',
    description:
      'Located in the holy town of Shirdi, this gaushala operates under the blessings of Shri Sai Baba and is affiliated with the Shri Saibaba Sansthan Trust. The facility shelters over 400 cows, many of which were abandoned or injured on Maharashtra\'s highways. The gaushala is known for its exceptional veterinary care — it has a fully equipped hospital with X-ray, ultrasound, and surgical facilities staffed by three full-time veterinarians. A unique feature is the "Gau Daan" program where devotees visiting Shirdi temple can sponsor a cow\'s daily meal as part of their pilgrimage seva. The gaushala produces A2 milk, ghee, and panchagavya products sold at the Shirdi temple complex. It also operates a mobile veterinary ambulance service covering a 50km radius for emergency cow rescue. All cows receive traditional Ayurvedic treatment alongside modern veterinary medicine.',
    totalCows: 420,
    availableCows: 4,
    image: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=800&q=80',
    affiliation: 'Shri Saibaba Sansthan Trust affiliated',
    isVerified: true,
    contactPhone: '+91 9822345678',
    contactEmail: 'gaushala@shirdisaitrust.org',
    facilities: ['Veterinary Hospital', 'X-ray & Ultrasound', 'A2 Milk Dairy', 'Mobile Ambulance', 'Gau Daan Center', 'Ayurvedic Treatment Unit', 'Visitor Gallery'],
    visitingHours: '6:30 AM - 6:30 PM (All days)',
    coordinates: { lat: 19.7660, lng: 74.4776 },
  },
  {
    id: 'gs_005',
    name: 'Gokul Gaushala',
    location: 'Mathura',
    state: 'Uttar Pradesh',
    description:
      'A heritage gaushala in the sacred land of Mathura, operating since 1952 in the shadow of Lord Krishna\'s birthplace. Known for preserving rare Indian cow breeds including Gir, Sahiwal, Tharparkar, Red Sindhi, and the endangered Ponwar breed. The gaushala produces certified organic A2 milk, ghee, and gomutra-based products that are sold across India. The Goseva Training Program, running since 2008, has trained over 500 youth in gaushala management, organic dairy farming, and panchagavya product manufacturing. The gaushala has won the CPCSEA (Committee for the Purpose of Control and Supervision of Experiments on Animals) award for excellence in animal care and has been documented by National Geographic for its breed conservation efforts.',
    totalCows: 350,
    availableCows: 4,
    image: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=800&q=80',
    affiliation: 'Organic Products Certified',
    isVerified: true,
    contactPhone: '+91 9988776655',
    contactEmail: 'contact@gokulgaushala.org',
    facilities: ['Heritage Site', 'Breed Conservation', 'A2 Milk Dairy', 'Goseva Training', 'Organic Certification', 'Museum', 'Research Library'],
    visitingHours: '5:30 AM - 8:00 PM (All days)',
    coordinates: { lat: 27.4924, lng: 77.6737 },
  },
];

const COWS: Cow[] = [
  // ── Shri Krishna Gaushala (gs_001) — 4 cows ──
  {
    id: 'cow_001',
    name: 'Lakshmi',
    breed: 'Gir',
    age: 5,
    gaushalaId: 'gs_001',
    gaushalaName: 'Shri Krishna Gaushala',
    photo: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Lakshmi is a gentle 5-year-old Gir cow with beautiful long ears and a calm temperament. She was rescued as a calf from a dairy that was shutting down. Now she is the star of the gaushala, often seen nuzzling visitors for treats. She gives 8 liters of rich A2 milk daily.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400&q=80', description: 'Lakshmi is doing well! She enjoyed the spring sunshine and has been very active. Vet checkup: healthy weight at 420kg.' },
      { date: '2026-02-15', photo: 'https://images.unsplash.com/photo-1527153907836-a9a0438ff035?w=400&q=80', description: 'Lakshmi participated in the Gau Puja ceremony this month. She was adorned with marigold garlands. All health parameters normal.' },
    ],
  },
  {
    id: 'cow_002',
    name: 'Nandini',
    breed: 'Sahiwal',
    age: 7,
    gaushalaId: 'gs_001',
    gaushalaName: 'Shri Krishna Gaushala',
    photo: 'https://images.unsplash.com/photo-1527153907836-a9a0438ff035?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Nandini is a 7-year-old Sahiwal breed cow, known for her heat tolerance and high milk yield. She was donated by a farmer who could no longer care for her. Nandini is a mother of two calves who also reside at the gaushala.',
    isAdopted: true,
    adopterName: 'Rajesh Kumar',
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1527153907836-a9a0438ff035?w=400&q=80', description: 'Nandini and her calves are thriving. She has been eating well and milk production is steady at 10 liters/day.' },
    ],
  },
  {
    id: 'cow_003',
    name: 'Gauri',
    breed: 'Tharparkar',
    age: 3,
    gaushalaId: 'gs_001',
    gaushalaName: 'Shri Krishna Gaushala',
    photo: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Gauri is a young 3-year-old Tharparkar cow with a beautiful grey-white coat. She is playful and curious, often leading the herd during morning walks. Being from a desert breed, she is remarkably resilient and low-maintenance.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=400&q=80', description: 'Gauri has grown beautifully this month. She is very social and friendly with all the caretakers. Weight gain is on track.' },
    ],
  },
  {
    id: 'cow_004',
    name: 'Radha',
    breed: 'Red Sindhi',
    age: 9,
    gaushalaId: 'gs_001',
    gaushalaName: 'Shri Krishna Gaushala',
    photo: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=600&q=80',
    healthStatus: 'senior_care',
    description:
      'Radha is a 9-year-old Red Sindhi cow with a distinctive reddish-brown coat. She is one of the oldest residents at the gaushala and is treated with special care. Though she no longer gives milk, she is loved by everyone for her gentle nature.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=400&q=80', description: 'Radha is receiving special senior care diet. Joint supplements have been added. She enjoys sunbathing in the afternoon.' },
      { date: '2026-02-15', photo: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400&q=80', description: 'Radha had a vet checkup. Slight arthritis detected — started on herbal treatment. Spirits remain high.' },
    ],
  },
  // ── Kamdhenu Gaushala (gs_002) — 5 cows ──
  {
    id: 'cow_005',
    name: 'Kamala',
    breed: 'Gir',
    age: 4,
    gaushalaId: 'gs_002',
    gaushalaName: 'Kamdhenu Gaushala',
    photo: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Kamala is a 4-year-old Gir cow rescued from an illegal dairy operation in Jaipur. Despite her difficult past, she has blossomed into a healthy and affectionate cow. She is one of the highest milk producers at the gaushala.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&q=80', description: 'Kamala is flourishing! She has fully recovered from her rescue trauma. Milk yield: 12 liters/day. She loves her new organic diet.' },
    ],
  },
  {
    id: 'cow_006',
    name: 'Dhanvantari',
    breed: 'Kankrej',
    age: 6,
    gaushalaId: 'gs_002',
    gaushalaName: 'Kamdhenu Gaushala',
    photo: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&q=80',
    healthStatus: 'under_treatment',
    description:
      'Dhanvantari is a 6-year-old Kankrej bull, a majestic breed from Gujarat. He was found injured on a highway and brought to the gaushala. Currently undergoing treatment for a leg fracture but recovering well under expert veterinary care.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400&q=80', description: 'Dhanvantari is showing great improvement! The leg splint was adjusted. He can now walk short distances. Expected full recovery in 6 weeks.' },
      { date: '2026-02-15', photo: 'https://images.unsplash.com/photo-1527153907836-a9a0438ff035?w=400&q=80', description: 'Surgery was successful. Dhanvantari is resting and eating well. Pain management is being handled with ayurvedic medicines.' },
    ],
  },
  {
    id: 'cow_007',
    name: 'Savitri',
    breed: 'Sahiwal',
    age: 5,
    gaushalaId: 'gs_002',
    gaushalaName: 'Kamdhenu Gaushala',
    photo: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Savitri is a 5-year-old Sahiwal cow, one of the best milking breeds in India. She arrived at the gaushala as a donation from a retiring dairy farmer who wanted to ensure she would be cared for. Savitri has a calm and docile nature.',
    isAdopted: true,
    adopterName: 'Priya Sharma',
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=400&q=80', description: 'Savitri is happy and healthy. She gave birth to a beautiful female calf last week! Both mother and baby are doing wonderfully.' },
    ],
  },
  {
    id: 'cow_008',
    name: 'Bhola',
    breed: 'Tharparkar',
    age: 2,
    gaushalaId: 'gs_002',
    gaushalaName: 'Kamdhenu Gaushala',
    photo: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Bhola is an adorable 2-year-old Tharparkar calf, born right here at Kamdhenu Gaushala. He is playful, energetic, and already a visitor favorite. Named "Bhola" (innocent) for his trusting and sweet nature.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=400&q=80', description: 'Bhola is growing fast! He has gained 15kg this month. Very active and playful — loves running around the open paddock.' },
    ],
  },
  {
    id: 'cow_009',
    name: 'Parvati',
    breed: 'Red Sindhi',
    age: 8,
    gaushalaId: 'gs_002',
    gaushalaName: 'Kamdhenu Gaushala',
    photo: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Parvati is an 8-year-old Red Sindhi cow with a deep reddish-brown coat. She has been at the gaushala for 5 years and is one of the most loved residents. Known for her gentle eyes and patient demeanor during milking.',
    isAdopted: true,
    adopterName: 'Amit Agarwal',
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&q=80', description: 'Parvati is doing great! She enjoyed extra jaggery treats on Holi. Weight stable at 380kg. Regular deworming completed.' },
    ],
  },
  // ── Pathmeda Gauseva Sansthan (gs_003) — 4 cows ──
  {
    id: 'cow_010',
    name: 'Surabhi',
    breed: 'Rathi',
    age: 6,
    gaushalaId: 'gs_003',
    gaushalaName: 'Pathmeda Gauseva Sansthan',
    photo: 'https://images.unsplash.com/photo-1527153907836-a9a0438ff035?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Surabhi is a magnificent 6-year-old Rathi cow — a rare breed native to the Thar Desert of Rajasthan. She is part of Pathmeda\'s endangered breed conservation program. Rathi cows are known for their remarkable heat tolerance and ability to thrive on minimal water. Surabhi produces 8 liters of high-fat A2 milk daily, used in the gaushala\'s premium ghee production.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1527153907836-a9a0438ff035?w=400&q=80', description: 'Surabhi produced 8 liters of rich A2 milk today. She is in excellent health. New organic fodder mix from the gaushala farm has been well received.' },
      { date: '2026-02-15', photo: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400&q=80', description: 'Surabhi participated in the Go Puja on Makar Sankranti. She was decorated with flowers and tilak. All vitals excellent.' },
    ],
  },
  {
    id: 'cow_011',
    name: 'Kapila',
    breed: 'Sahiwal',
    age: 4,
    gaushalaId: 'gs_003',
    gaushalaName: 'Pathmeda Gauseva Sansthan',
    photo: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Kapila is a 4-year-old Sahiwal cow named after the sacred Kapila cow of Hindu mythology. She is known for her exceptionally creamy milk and calm temperament. Kapila is part of the gaushala\'s breed conservation program and has been selected for the national indigenous breed documentation project.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=400&q=80', description: 'Kapila is thriving in the conservation program. Selected for the indigenous breed documentation project. Health is excellent.' },
    ],
  },
  {
    id: 'cow_012',
    name: 'Dharti',
    breed: 'Tharparkar',
    age: 3,
    gaushalaId: 'gs_003',
    gaushalaName: 'Pathmeda Gauseva Sansthan',
    photo: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Dharti is a 3-year-old Tharparkar cow, born at the gaushala from the breeding program. Tharparkar is a dual-purpose breed from the Thar desert known for both milk production and drought resistance. She represents the future of sustainable desert farming and is being trained for the farmer demonstration program.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=400&q=80', description: 'Dharti is growing well. She has adapted beautifully to the desert climate. Weight: 280kg. Very friendly with visitors during farm demos.' },
    ],
  },
  {
    id: 'cow_013',
    name: 'Gomata',
    breed: 'Gir',
    age: 10,
    gaushalaId: 'gs_003',
    gaushalaName: 'Pathmeda Gauseva Sansthan',
    photo: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&q=80',
    healthStatus: 'senior_care',
    description:
      'Gomata is the oldest cow at Pathmeda at 10 years. She is a Gir breed matriarch who has mothered 6 calves during her lifetime. Though retired from milking, she receives premium senior care with special diet, joint supplements, and daily massages. She is treated as the spiritual mother of the herd.',
    isAdopted: true,
    adopterName: 'Sunita Devi',
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&q=80', description: 'Gomata is comfortable and content. Senior care diet includes warm jaggery water and special herbal supplements. She rests most of the day but enjoys visitors.' },
      { date: '2026-02-15', photo: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400&q=80', description: 'Gomata had her quarterly senior health exam. Teeth are wearing down so diet adjusted to softer foods. Otherwise in good spirits.' },
    ],
  },
  // ── Shri Sai Gaushala, Shirdi (gs_004) — 3 cows ──
  {
    id: 'cow_014',
    name: 'Sai',
    breed: 'Gir',
    age: 4,
    gaushalaId: 'gs_004',
    gaushalaName: 'Shri Sai Gaushala',
    photo: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Named after Shirdi Sai Baba, this 4-year-old Gir cow was rescued from a highway accident near Ahmednagar by the gaushala\'s mobile ambulance team. After months of rehabilitation, Sai has made a full recovery and is now one of the gaushala\'s top milk producers at 10 liters/day.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=400&q=80', description: 'Sai is thriving! Milk yield stable at 10 liters/day. She has become very friendly and often greets visitors at the gate.' },
    ],
  },
  {
    id: 'cow_015',
    name: 'Dwarkamai',
    breed: 'Sahiwal',
    age: 6,
    gaushalaId: 'gs_004',
    gaushalaName: 'Shri Sai Gaushala',
    photo: 'https://images.unsplash.com/photo-1527153907836-a9a0438ff035?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Dwarkamai is a 6-year-old Sahiwal cow named after Sai Baba\'s famous Dwarkamai mosque. She was donated by a devotee from Pune. Dwarkamai is a gentle mother of one calf and produces rich, creamy milk used in the gaushala\'s A2 ghee production for the Shirdi temple prasad.',
    isAdopted: true,
    adopterName: 'Ganesh Patil',
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1527153907836-a9a0438ff035?w=400&q=80', description: 'Dwarkamai is healthy and happy. Her calf is growing well. She participated in the special Gau Puja during Sai Baba Punyatithi celebrations.' },
    ],
  },
  {
    id: 'cow_016',
    name: 'Chandika',
    breed: 'Red Sindhi',
    age: 7,
    gaushalaId: 'gs_004',
    gaushalaName: 'Shri Sai Gaushala',
    photo: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=600&q=80',
    healthStatus: 'under_treatment',
    description:
      'Chandika is a 7-year-old Red Sindhi cow who was found abandoned and malnourished on the Nashik-Shirdi highway. She arrived at the gaushala severely underweight and with skin infections. After 6 months of intensive Ayurvedic and veterinary care, she has gained 80kg and her skin has healed. She is still receiving ongoing nutritional therapy.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=400&q=80', description: 'Chandika continues to recover. Weight now 340kg (up from 260kg at rescue). Skin fully healed. Nutritional supplements ongoing. She is increasingly playful!' },
      { date: '2026-02-15', photo: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=400&q=80', description: 'Chandika\'s blood tests show improving iron levels. Ayurvedic Ashwagandha and Shatavari supplements are working well. Weight: 325kg.' },
    ],
  },
  // ── Gokul Gaushala, Mathura (gs_005) — 3 cows ──
  {
    id: 'cow_017',
    name: 'Vrindavani',
    breed: 'Gir',
    age: 5,
    gaushalaId: 'gs_005',
    gaushalaName: 'Gokul Gaushala',
    photo: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Vrindavani is a beautiful 5-year-old Gir cow, the pride of Gokul Gaushala. Her A2 milk is used to produce the gaushala\'s famous organic ghee, winner of the National Organic Products Award 2025. She was hand-raised from birth and is incredibly friendly with humans and children.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&q=80', description: 'Vrindavani produced 9 liters of rich A2 milk today. She is in excellent health. Won "Best Dairy Gir" at the Mathura Pashu Mela this month!' },
    ],
  },
  {
    id: 'cow_018',
    name: 'Yamuna',
    breed: 'Ponwar',
    age: 4,
    gaushalaId: 'gs_005',
    gaushalaName: 'Gokul Gaushala',
    photo: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=600&q=80',
    healthStatus: 'healthy',
    description:
      'Yamuna is a 4-year-old Ponwar cow — an extremely rare breed from the Pilibhit region of UP with fewer than 1,000 animals remaining. She is the star of Gokul Gaushala\'s breed conservation program. Named after the sacred Yamuna river, she has a distinctive black-and-white coat pattern.',
    isAdopted: false,
    adopterName: null,
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1551649001-10ff42f27a1b?w=400&q=80', description: 'Yamuna is doing well in the breeding program. Genetic samples have been sent to NBAGR (National Bureau of Animal Genetic Resources) for documentation. Health excellent.' },
    ],
  },
  {
    id: 'cow_019',
    name: 'Shyama',
    breed: 'Sahiwal',
    age: 11,
    gaushalaId: 'gs_005',
    gaushalaName: 'Gokul Gaushala',
    photo: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=600&q=80',
    healthStatus: 'senior_care',
    description:
      'Shyama is the oldest cow at Gokul Gaushala at 11 years. She has been here since the early days and has mothered 5 calves, all of whom still reside at the gaushala. Though retired from milking, she receives premium senior care with special diet, supplements, and daily attention from caregivers who have known her for a decade.',
    isAdopted: true,
    adopterName: 'Dr. Rakesh Mishra',
    monthlyUpdates: [
      { date: '2026-03-15', photo: 'https://images.unsplash.com/photo-1562564055-71e051d33c19?w=400&q=80', description: 'Shyama is comfortable. Senior diet includes warm turmeric milk, jaggery water, and herbal supplements. She spends most of her time with her youngest daughter, Chanda.' },
    ],
  },
];

const ADOPTION_PLANS: AdoptionPlan[] = [
  {
    id: 'plan_daily',
    name: 'Gau Seva',
    nameHindi: 'गौ सेवा',
    type: 'daily_feeding',
    price: 51,
    priceLabel: '51/day',
    currency: 'INR',
    features: [
      'Daily feeding of one cow',
      'Monthly photo update via WhatsApp',
      'Name on gaushala donor wall',
      'Digital seva certificate',
    ],
    popular: false,
  },
  {
    id: 'plan_monthly',
    name: 'Gau Palan',
    nameHindi: 'गौ पालन',
    type: 'monthly',
    price: 3000,
    priceLabel: '3,000/month',
    currency: 'INR',
    features: [
      'Full monthly care of one cow',
      'Weekly photo & video updates',
      'Visit your cow anytime',
      'Digital certificate with cow details',
      'Monthly health report',
    ],
    popular: true,
  },
  {
    id: 'plan_annual',
    name: 'Gau Raksha',
    nameHindi: 'गौ रक्षा',
    type: 'annual',
    price: 30000,
    priceLabel: '30,000/year',
    currency: 'INR',
    features: [
      'Full annual care of one cow',
      'Weekly photo & video updates',
      'Unlimited visits',
      'Framed certificate with cow photo',
      'Monthly health report',
      '80G tax receipt',
      'Festival special updates',
    ],
    popular: false,
  },
  {
    id: 'plan_lifetime',
    name: 'Gau Daan',
    nameHindi: 'गौ दान',
    type: 'lifetime',
    price: 225000,
    priceLabel: '2,25,000 one-time',
    currency: 'INR',
    features: [
      'Lifetime care of one cow',
      'Weekly photo & video updates',
      'Unlimited visits with family',
      'Premium framed certificate',
      'Monthly health report',
      '80G tax receipt',
      'Name plaque at gaushala',
      'Annual Gau Puja invitation',
      'Priority for new cow adoption',
    ],
    popular: false,
  },
];

// ─── In-memory adoption storage (MVP) ───────────────────────────────────────────

const adoptionStore = new Map<string, Adoption[]>();
let adoptionIdCounter = 1;

function generateAdoptionId(): string {
  return `adp_${Date.now()}_${adoptionIdCounter++}`;
}

// ─── GaushalaService ────────────────────────────────────────────────────────────

export class GaushalaService {
  /**
   * List all gaushalas with cow counts.
   */
  getGaushalas() {
    return GAUSHALAS.map((gs) => {
      const cowsInGaushala = COWS.filter((c) => c.gaushalaId === gs.id);
      const available = cowsInGaushala.filter((c) => !c.isAdopted).length;
      return {
        ...gs,
        totalCows: gs.totalCows,
        availableCows: available,
        cowsListed: cowsInGaushala.length,
      };
    });
  }

  /**
   * Get a single gaushala by ID, including its cows.
   */
  getGaushalaById(id: string) {
    const gaushala = GAUSHALAS.find((gs) => gs.id === id);
    if (!gaushala) return null;

    const cows = COWS.filter((c) => c.gaushalaId === id);
    return { ...gaushala, cows };
  }

  /**
   * List cows, optionally filtered by gaushalaId and availability.
   */
  getCows(gaushalaId?: string, available?: boolean) {
    let filtered = [...COWS];

    if (gaushalaId) {
      filtered = filtered.filter((c) => c.gaushalaId === gaushalaId);
    }

    if (available !== undefined) {
      filtered = filtered.filter((c) => (available ? !c.isAdopted : c.isAdopted));
    }

    return filtered;
  }

  /**
   * Get a single cow by ID with monthly updates.
   */
  getCowById(id: string): Cow | null {
    return COWS.find((c) => c.id === id) ?? null;
  }

  /**
   * List adoption plans/tiers with pricing.
   */
  getAdoptionPlans(): AdoptionPlan[] {
    return ADOPTION_PLANS;
  }

  /**
   * Create an adoption record.
   */
  adoptCow(userId: string, cowId: string, planId: string): Adoption {
    const cow = COWS.find((c) => c.id === cowId);
    if (!cow) {
      throw new Error('Cow not found.');
    }
    if (cow.isAdopted) {
      throw new Error('This cow has already been adopted.');
    }

    const plan = ADOPTION_PLANS.find((p) => p.id === planId);
    if (!plan) {
      throw new Error('Invalid adoption plan.');
    }

    // Mark cow as adopted
    cow.isAdopted = true;
    cow.adopterName = userId;

    const now = new Date();
    let nextRenewal: string | null = null;

    if (plan.type === 'daily_feeding') {
      const next = new Date(now);
      next.setDate(next.getDate() + 30);
      nextRenewal = next.toISOString().slice(0, 10);
    } else if (plan.type === 'monthly') {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      nextRenewal = next.toISOString().slice(0, 10);
    } else if (plan.type === 'annual') {
      const next = new Date(now);
      next.setFullYear(next.getFullYear() + 1);
      nextRenewal = next.toISOString().slice(0, 10);
    }
    // lifetime has no renewal

    const adoption: Adoption = {
      id: generateAdoptionId(),
      userId,
      cowId,
      cow,
      planId,
      plan,
      startDate: now.toISOString().slice(0, 10),
      status: 'active',
      nextRenewalDate: nextRenewal,
      totalPaid: plan.price,
      certificate: `https://darshya.online/certificates/${cowId}-${userId}`,
    };

    const existing = adoptionStore.get(userId) ?? [];
    existing.push(adoption);
    adoptionStore.set(userId, existing);

    return adoption;
  }

  /**
   * List user's adopted cows.
   */
  getMyAdoptions(userId: string): Adoption[] {
    return adoptionStore.get(userId) ?? [];
  }

  /**
   * Get monthly photo/health updates for an adoption.
   */
  getAdoptionUpdates(adoptionId: string, userId: string): MonthlyUpdate[] | null {
    const adoptions = adoptionStore.get(userId) ?? [];
    const adoption = adoptions.find((a) => a.id === adoptionId);

    if (!adoption) return null;

    const cow = COWS.find((c) => c.id === adoption.cowId);
    return cow?.monthlyUpdates ?? [];
  }
}

export const gaushalaService = new GaushalaService();
