import { generateText, MODELS, DEMO_MODE } from '../integrations/claude.js';
import { computeVedicContext, type VedicContext } from '../lib/vedic-context.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface Astrologer {
  id: string;
  name: string;
  photo: string;
  specializations: string[];
  languages: string[];
  experienceYears: number;
  rating: number;
  reviewCount: number;
  consultationCount: number;
  perMinuteRate: number;
  isOnline: boolean;
  isBusy: boolean;
  bio: string;
  verified: boolean;
  badges: string[];
}

export interface AstrologerDetail extends Astrologer {
  reviews: Review[];
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Specialization {
  name: string;
  count: number;
  icon: string;
}

export interface ConsultationSession {
  sessionId: string;
  userId: string;
  astrologerId: string;
  astrologerName: string;
  mode: 'chat' | 'call' | 'video';
  status: 'waiting' | 'active' | 'ended';
  perMinuteRate: number;
  startedAt: string;
  freeMinutes: number;
}

export interface KundliResult {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  rashi: string;
  rashiHindi: string;
  nakshatra: string;
  nakshatraHindi: string;
  ascendant: string;
  ascendantHindi: string;
  moonSign: string;
  currentDasha: string;
  dashaPeriod: string;
  planetaryPositions: { planet: string; sign: string; house: number; degree: string }[];
  houses: { house: number; sign: string; planets: string[] }[];
}

export interface DailyHoroscope {
  rashi: string;
  rashiHindi: string;
  rashiEnglish: string;
  symbol: string;
  date: string;
  prediction: string;
  career: string;
  love: string;
  health: string;
  luckyNumber: number;
  luckyColor: string;
  luckyDirection: string;
  mantra: string;
  mantraHindi: string;
  rulingPlanet: string;
  element: string;
  overallRating: number;
}

export interface CompatibilityResult {
  rashi1: string;
  rashi2: string;
  overallScore: number;
  emotional: number;
  intellectual: number;
  physical: number;
  spiritual: number;
  summary: string;
  strengths: string[];
  challenges: string[];
}

export interface AstrologersParams {
  specialization?: string;
  language?: string;
  priceRange?: string;
  isOnline?: boolean;
  sortBy?: 'rating' | 'price' | 'experience';
  page?: number;
  limit?: number;
}

// ─── Hardcoded Astrologer Data (MVP) ────────────────────────────────────────────

const ASTROLOGERS: Astrologer[] = [
  {
    id: 'astro_001',
    name: 'Pt. Raghunath Sharma',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
    specializations: ['Vedic Astrology', 'Prashna Kundli', 'Nadi Astrology'],
    languages: ['Hindi', 'English', 'Sanskrit'],
    experienceYears: 25,
    rating: 4.9,
    reviewCount: 12450,
    consultationCount: 34200,
    perMinuteRate: 50,
    isOnline: true,
    isBusy: false,
    bio: 'With 25 years of experience in Vedic Astrology, Pt. Raghunath Sharma is a renowned Jyotish Acharya who has guided over 34,000 devotees. Specializing in Prashna Kundli and Nadi Astrology, he offers precise predictions and effective remedies.',
    verified: true,
    badges: ['Top Rated', '10K+ Consults'],
  },
  {
    id: 'astro_002',
    name: 'Dr. Meera Devi',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face',
    specializations: ['Tarot Reading', 'Numerology', 'Vedic Astrology'],
    languages: ['Hindi', 'English', 'Gujarati'],
    experienceYears: 15,
    rating: 4.8,
    reviewCount: 8920,
    consultationCount: 22100,
    perMinuteRate: 40,
    isOnline: true,
    isBusy: false,
    bio: 'Dr. Meera Devi is a gifted Tarot reader and Numerologist with a PhD in Astro-Sciences. She blends ancient Vedic wisdom with modern Tarot techniques to provide holistic guidance on career, relationships, and life decisions.',
    verified: true,
    badges: ['Top Rated', 'Quick Response'],
  },
  {
    id: 'astro_003',
    name: 'Acharya Vikram Joshi',
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face',
    specializations: ['Vedic Astrology', 'Vastu', 'KP Astrology'],
    languages: ['Hindi', 'English', 'Marathi'],
    experienceYears: 20,
    rating: 4.7,
    reviewCount: 6540,
    consultationCount: 18500,
    perMinuteRate: 60,
    isOnline: true,
    isBusy: true,
    bio: 'Acharya Vikram Joshi is a master of KP Astrology and Vastu Shastra. With two decades of practice, he has helped thousands of families achieve harmony through precise Vastu corrections and astrological guidance.',
    verified: true,
    badges: ['Top Rated', '10K+ Consults'],
  },
  {
    id: 'astro_004',
    name: 'Jyotishi Sunita Patel',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=face',
    specializations: ['Palmistry', 'Numerology', 'Tarot Reading'],
    languages: ['Hindi', 'Gujarati', 'English'],
    experienceYears: 12,
    rating: 4.6,
    reviewCount: 4320,
    consultationCount: 11800,
    perMinuteRate: 25,
    isOnline: true,
    isBusy: false,
    bio: 'Jyotishi Sunita brings a unique blend of Palmistry and Numerology. Known for her accurate personality readings and future predictions, she is especially popular for career and marriage consultations.',
    verified: true,
    badges: ['Quick Response'],
  },
  {
    id: 'astro_005',
    name: 'Pt. Devendra Mishra',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face',
    specializations: ['Vedic Astrology', 'Nadi Astrology', 'Prashna Kundli'],
    languages: ['Hindi', 'English', 'Tamil'],
    experienceYears: 30,
    rating: 4.9,
    reviewCount: 15600,
    consultationCount: 41000,
    perMinuteRate: 80,
    isOnline: false,
    isBusy: false,
    bio: 'Pt. Devendra Mishra is one of India\'s most respected Nadi Astrologers with 30 years of experience. His deep knowledge of ancient palm-leaf manuscripts enables him to provide extraordinarily precise life readings.',
    verified: true,
    badges: ['Top Rated', '10K+ Consults', 'Quick Response'],
  },
  {
    id: 'astro_006',
    name: 'Tarot Priya Singh',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&h=300&fit=crop&crop=face',
    specializations: ['Tarot Reading', 'Numerology'],
    languages: ['Hindi', 'English', 'Punjabi'],
    experienceYears: 8,
    rating: 4.5,
    reviewCount: 3210,
    consultationCount: 8900,
    perMinuteRate: 20,
    isOnline: true,
    isBusy: false,
    bio: 'Tarot Priya is a young and intuitive Tarot card reader with a modern approach. She specializes in love and relationship readings and has a growing following on social media for her accurate predictions.',
    verified: true,
    badges: ['Quick Response'],
  },
  {
    id: 'astro_007',
    name: 'Acharya Ramesh Iyer',
    photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&h=300&fit=crop&crop=face',
    specializations: ['KP Astrology', 'Vedic Astrology', 'Vastu'],
    languages: ['Hindi', 'English', 'Tamil', 'Kannada'],
    experienceYears: 22,
    rating: 4.8,
    reviewCount: 9100,
    consultationCount: 25600,
    perMinuteRate: 55,
    isOnline: true,
    isBusy: false,
    bio: 'Acharya Ramesh Iyer is a KP Astrology specialist from the Vaitheeswaran Koil lineage. With expertise in both KP and traditional Vedic systems, he provides highly accurate timing predictions for major life events.',
    verified: true,
    badges: ['Top Rated', '10K+ Consults'],
  },
  {
    id: 'astro_008',
    name: 'Dr. Kavita Reddy',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face',
    specializations: ['Vastu', 'Vedic Astrology', 'Numerology'],
    languages: ['Hindi', 'English', 'Telugu'],
    experienceYears: 18,
    rating: 4.7,
    reviewCount: 5840,
    consultationCount: 15200,
    perMinuteRate: 45,
    isOnline: true,
    isBusy: true,
    bio: 'Dr. Kavita Reddy holds a doctorate in Vastu Shastra and combines it with Vedic Astrology for comprehensive life guidance. She is especially sought after for property-related consultations and business Vastu.',
    verified: true,
    badges: ['Top Rated'],
  },
  {
    id: 'astro_009',
    name: 'Pandit Suresh Kumar',
    photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&h=300&fit=crop&crop=face',
    specializations: ['Vedic Astrology', 'Palmistry', 'Prashna Kundli'],
    languages: ['Hindi', 'English'],
    experienceYears: 16,
    rating: 4.6,
    reviewCount: 4980,
    consultationCount: 13400,
    perMinuteRate: 35,
    isOnline: false,
    isBusy: false,
    bio: 'Pandit Suresh Kumar is known for his straightforward and practical astrological advice. He specializes in career guidance, marriage compatibility, and Prashna Kundli for immediate problem-solving.',
    verified: true,
    badges: ['Quick Response'],
  },
  {
    id: 'astro_010',
    name: 'Jyotish Ananya Ghosh',
    photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face',
    specializations: ['Tarot Reading', 'KP Astrology', 'Numerology'],
    languages: ['Hindi', 'English', 'Bengali'],
    experienceYears: 10,
    rating: 4.5,
    reviewCount: 3650,
    consultationCount: 9800,
    perMinuteRate: 30,
    isOnline: true,
    isBusy: false,
    bio: 'Jyotish Ananya blends the precision of KP Astrology with the intuitive power of Tarot. She is known for her compassionate approach and detailed readings that help clients navigate life\'s challenges.',
    verified: true,
    badges: ['Quick Response'],
  },
  {
    id: 'astro_011',
    name: 'Acharya Bhaskar Rao',
    photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&h=300&fit=crop&crop=face',
    specializations: ['Nadi Astrology', 'Vedic Astrology'],
    languages: ['Hindi', 'English', 'Telugu', 'Tamil'],
    experienceYears: 28,
    rating: 4.9,
    reviewCount: 11200,
    consultationCount: 32000,
    perMinuteRate: 90,
    isOnline: true,
    isBusy: false,
    bio: 'Acharya Bhaskar Rao comes from a family of Nadi astrologers in Vaitheeswaran Koil. With 28 years of expertise, he reads ancient palm-leaf manuscripts to reveal past-life karma and future destiny with remarkable accuracy.',
    verified: true,
    badges: ['Top Rated', '10K+ Consults'],
  },
  {
    id: 'astro_012',
    name: 'Vastu Expert Neha Kapoor',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face',
    specializations: ['Vastu', 'Numerology'],
    languages: ['Hindi', 'English', 'Punjabi'],
    experienceYears: 14,
    rating: 4.6,
    reviewCount: 4100,
    consultationCount: 10500,
    perMinuteRate: 35,
    isOnline: false,
    isBusy: false,
    bio: 'Neha Kapoor is a certified Vastu consultant who has transformed thousands of homes and offices. Her practical, non-demolition Vastu remedies are especially popular among urban professionals.',
    verified: true,
    badges: ['Quick Response'],
  },
  {
    id: 'astro_013',
    name: 'Pt. Harish Chandra',
    photo: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=300&h=300&fit=crop&crop=face',
    specializations: ['Vedic Astrology', 'KP Astrology', 'Prashna Kundli'],
    languages: ['Hindi', 'English', 'Rajasthani'],
    experienceYears: 35,
    rating: 5.0,
    reviewCount: 18900,
    consultationCount: 52000,
    perMinuteRate: 100,
    isOnline: true,
    isBusy: true,
    bio: 'Pt. Harish Chandra is a legendary Vedic astrologer with 35 years of unmatched experience. Featured in national media multiple times, he is known for his precise predictions and powerful remedial solutions.',
    verified: true,
    badges: ['Top Rated', '10K+ Consults', 'Quick Response'],
  },
  {
    id: 'astro_014',
    name: 'Tarot Asha Mehta',
    photo: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=300&h=300&fit=crop&crop=face',
    specializations: ['Tarot Reading', 'Palmistry'],
    languages: ['Hindi', 'English', 'Marathi'],
    experienceYears: 6,
    rating: 4.4,
    reviewCount: 2150,
    consultationCount: 5600,
    perMinuteRate: 15,
    isOnline: true,
    isBusy: false,
    bio: 'Tarot Asha is a rising star in the world of Tarot and Palmistry. Her warm, empathetic readings resonate deeply with young professionals seeking clarity on love, career, and personal growth.',
    verified: true,
    badges: [],
  },
  {
    id: 'astro_015',
    name: 'Acharya Gopal Das',
    photo: 'https://images.unsplash.com/photo-1548142813-c348350df52b?w=300&h=300&fit=crop&crop=face',
    specializations: ['Vedic Astrology', 'Vastu', 'Nadi Astrology'],
    languages: ['Hindi', 'English', 'Sanskrit', 'Bengali'],
    experienceYears: 24,
    rating: 4.8,
    reviewCount: 7650,
    consultationCount: 21000,
    perMinuteRate: 65,
    isOnline: true,
    isBusy: false,
    bio: 'Acharya Gopal Das is a scholar of Vedic sciences with deep expertise in astrology, Vastu, and Nadi reading. He holds a Jyotish Visharad degree and has authored three books on planetary remedies.',
    verified: true,
    badges: ['Top Rated', '10K+ Consults'],
  },
];

// ─── Reviews Data ────────────────────────────────────────────────────────────────

const REVIEWS: Record<string, Review[]> = {};

// Generate 5 reviews per astrologer
const reviewTemplates = [
  { userName: 'Priya M.', comment: 'Extremely accurate predictions. The remedies suggested were practical and effective. Highly recommended!', rating: 5 },
  { userName: 'Rahul K.', comment: 'Very knowledgeable and patient. Explained everything in detail. Will consult again for sure.', rating: 5 },
  { userName: 'Sneha T.', comment: 'Good consultation overall. The astrologer understood my concerns and provided helpful guidance.', rating: 4 },
  { userName: 'Amit S.', comment: 'Predictions about my career change were spot on. The timing advice was very helpful.', rating: 5 },
  { userName: 'Kavya R.', comment: 'Nice experience. Clear explanations and practical remedies. Felt very positive after the session.', rating: 4 },
  { userName: 'Deepak G.', comment: 'One of the best astrologers I have consulted. Deep knowledge and genuine concern for the client.', rating: 5 },
  { userName: 'Anjali P.', comment: 'The marriage compatibility analysis was very detailed. Helped us understand our relationship better.', rating: 5 },
  { userName: 'Vikash N.', comment: 'Very professional and to the point. No unnecessary talk, just accurate readings and practical advice.', rating: 4 },
  { userName: 'Ritu D.', comment: 'The Kundli analysis was thorough and the gemstone recommendation was helpful. Thank you!', rating: 5 },
  { userName: 'Suresh B.', comment: 'Good experience but the session felt a bit rushed. Otherwise, the predictions were accurate.', rating: 4 },
];

ASTROLOGERS.forEach((astrologer, index) => {
  REVIEWS[astrologer.id] = [];
  for (let i = 0; i < 5; i++) {
    const template = reviewTemplates[(index + i) % reviewTemplates.length]!;
    REVIEWS[astrologer.id]!.push({
      id: `review_${astrologer.id}_${i + 1}`,
      userId: `user_${100 + i}`,
      userName: template.userName,
      rating: template.rating,
      comment: template.comment,
      date: new Date(Date.now() - (i * 3 + index) * 86400000).toISOString().split('T')[0]!,
    });
  }
});

// ─── Specializations ─────────────────────────────────────────────────────────────

const SPECIALIZATIONS: Specialization[] = [
  { name: 'Vedic Astrology', count: 11, icon: 'star' },
  { name: 'Tarot Reading', count: 4, icon: 'cards' },
  { name: 'Numerology', count: 5, icon: 'hash' },
  { name: 'Palmistry', count: 3, icon: 'hand' },
  { name: 'Vastu', count: 5, icon: 'home' },
  { name: 'KP Astrology', count: 4, icon: 'compass' },
  { name: 'Prashna Kundli', count: 4, icon: 'help-circle' },
  { name: 'Nadi Astrology', count: 4, icon: 'scroll' },
];

// ─── Daily Horoscope Data ────────────────────────────────────────────────────────

const RASHIS: DailyHoroscope[] = [
  {
    rashi: 'aries',
    rashiHindi: 'मेष',
    rashiEnglish: 'Aries',
    symbol: '♈',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'A day of new beginnings and fresh energy. You will feel motivated to start new projects. Financial gains are indicated in the second half of the day. Trust your instincts when making important decisions.',
    career: 'Excellent day for career advancement. A promotion or new opportunity may come your way. Stay focused on your goals and avoid unnecessary conflicts with colleagues.',
    love: 'Singles may meet someone special today. Couples should plan a romantic evening. Communication is key to resolving any ongoing misunderstandings.',
    health: 'Good energy levels throughout the day. Avoid spicy food in the evening. A short walk or yoga session will boost your overall wellbeing.',
    luckyNumber: 9,
    luckyColor: 'Red',
    luckyDirection: 'East',
    mantra: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah',
    mantraHindi: 'ओम क्रां क्रीं क्रौं सः भौमाय नमः',
    rulingPlanet: 'Mars (Mangal)',
    element: 'Fire (Agni)',
    overallRating: 4,
  },
  {
    rashi: 'taurus',
    rashiHindi: 'वृषभ',
    rashiEnglish: 'Taurus',
    symbol: '♉',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Financial matters take center stage today. A pending payment or investment will yield good results. Family relationships bring joy and comfort. Avoid lending money to acquaintances.',
    career: 'Steady progress at work. Focus on completing pending tasks rather than starting new ones. A business meeting may bring positive outcomes.',
    love: 'Stability in relationships. Show appreciation to your partner. Singles should focus on self-improvement before seeking a new relationship.',
    health: 'Watch your diet today. Digestive issues may arise if you overeat. Drink plenty of water and get adequate rest.',
    luckyNumber: 6,
    luckyColor: 'Green',
    luckyDirection: 'Southeast',
    mantra: 'Om Draam Dreem Draum Sah Shukraya Namah',
    mantraHindi: 'ओम द्रां द्रीं द्रौं सः शुक्राय नमः',
    rulingPlanet: 'Venus (Shukra)',
    element: 'Earth (Prithvi)',
    overallRating: 3,
  },
  {
    rashi: 'gemini',
    rashiHindi: 'मिथुन',
    rashiEnglish: 'Gemini',
    symbol: '♊',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Communication skills are at their peak today. Express yourself freely in meetings and conversations. Travel plans may finalize. Be careful with written agreements and contracts.',
    career: 'A great day for presentations and networking. Your ideas will be well-received. Collaborative projects will thrive today.',
    love: 'Express your feelings openly. A heartfelt conversation can deepen your bond. Singles might find connection through social events.',
    health: 'Mental energy is high but physical energy may dip. Take breaks between tasks. Avoid screen time before bed for better sleep.',
    luckyNumber: 5,
    luckyColor: 'Yellow',
    luckyDirection: 'North',
    mantra: 'Om Braam Breem Braum Sah Budhaya Namah',
    mantraHindi: 'ओम ब्रां ब्रीं ब्रौं सः बुधाय नमः',
    rulingPlanet: 'Mercury (Budh)',
    element: 'Air (Vayu)',
    overallRating: 4,
  },
  {
    rashi: 'cancer',
    rashiHindi: 'कर्क',
    rashiEnglish: 'Cancer',
    symbol: '♋',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Home and family matters need attention today. A property-related decision may come up. Emotional sensitivity is heightened — channel it into creative pursuits. Ancestors\' blessings are with you.',
    career: 'Work from home will be more productive today. Avoid office politics. A creative solution to a long-standing problem will earn you recognition.',
    love: 'Family support strengthens your relationship. Plan a home-cooked meal with your partner. Nostalgia may bring past connections to mind.',
    health: 'Chest and stomach area need care. Avoid cold drinks and heavy meals. Evening meditation will bring peace and clarity.',
    luckyNumber: 2,
    luckyColor: 'White',
    luckyDirection: 'Northwest',
    mantra: 'Om Shraam Shreem Shraum Sah Chandraya Namah',
    mantraHindi: 'ओम श्रां श्रीं श्रौं सः चंद्राय नमः',
    rulingPlanet: 'Moon (Chandra)',
    element: 'Water (Jal)',
    overallRating: 3,
  },
  {
    rashi: 'leo',
    rashiHindi: 'सिंह',
    rashiEnglish: 'Leo',
    symbol: '♌',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Your leadership qualities shine bright today. People look up to you for guidance and direction. A celebration or social event brings happiness. Government-related work will be favourable.',
    career: 'Take charge of team projects. Your confidence and vision will inspire others. A raise or bonus may be announced soon.',
    love: 'Grand gestures in love will be appreciated. Plan something special for your loved one. Singles attract attention naturally today.',
    health: 'Heart health is in focus. Avoid excessive stress and anger. Regular exercise and a balanced diet will keep you energized.',
    luckyNumber: 1,
    luckyColor: 'Gold',
    luckyDirection: 'East',
    mantra: 'Om Hraam Hreem Hraum Sah Suryaya Namah',
    mantraHindi: 'ओम ह्रां ह्रीं ह्रौं सः सूर्याय नमः',
    rulingPlanet: 'Sun (Surya)',
    element: 'Fire (Agni)',
    overallRating: 5,
  },
  {
    rashi: 'virgo',
    rashiHindi: 'कन्या',
    rashiEnglish: 'Virgo',
    symbol: '♍',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Attention to detail pays off today. A complex problem at work finds resolution through your analytical skills. Health improvements are noticed. Be mindful of perfectionist tendencies.',
    career: 'Your meticulous approach impresses superiors. Documentation and analysis tasks go smoothly. Avoid micro-managing team members.',
    love: 'Small, thoughtful gestures mean more than grand ones. Listen actively to your partner\'s needs. Singles should lower their unrealistic expectations.',
    health: 'Digestive system needs attention. Eat fresh, home-cooked meals. An evening walk in nature will reduce stress significantly.',
    luckyNumber: 7,
    luckyColor: 'Green',
    luckyDirection: 'South',
    mantra: 'Om Braam Breem Braum Sah Budhaya Namah',
    mantraHindi: 'ओम ब्रां ब्रीं ब्रौं सः बुधाय नमः',
    rulingPlanet: 'Mercury (Budh)',
    element: 'Earth (Prithvi)',
    overallRating: 4,
  },
  {
    rashi: 'libra',
    rashiHindi: 'तुला',
    rashiEnglish: 'Libra',
    symbol: '♎',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Balance and harmony define your day. Partnerships — both business and personal — flourish. Legal matters resolve in your favour. Artistic pursuits bring satisfaction and possible recognition.',
    career: 'Negotiations and deals go smoothly. Your diplomatic skills help resolve team conflicts. A partnership opportunity may arise.',
    love: 'Harmony in relationships. A romantic surprise from your partner brightens your day. Singles should attend social gatherings.',
    health: 'Kidney and lower back need care. Stay hydrated and maintain good posture. Yoga will be especially beneficial today.',
    luckyNumber: 6,
    luckyColor: 'Pink',
    luckyDirection: 'West',
    mantra: 'Om Draam Dreem Draum Sah Shukraya Namah',
    mantraHindi: 'ओम द्रां द्रीं द्रौं सः शुक्राय नमः',
    rulingPlanet: 'Venus (Shukra)',
    element: 'Air (Vayu)',
    overallRating: 4,
  },
  {
    rashi: 'scorpio',
    rashiHindi: 'वृश्चिक',
    rashiEnglish: 'Scorpio',
    symbol: '♏',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Transformation and deep insights mark this day. Hidden truths come to light. Financial matters related to inheritance or insurance get resolved. Your intuition is extremely strong — trust it.',
    career: 'Research and investigation tasks succeed. Uncovering hidden information gives you an advantage. Avoid sharing sensitive plans with colleagues.',
    love: 'Deep emotional connections strengthen. Have an honest conversation about your feelings. Avoid jealousy and possessiveness.',
    health: 'Reproductive health needs attention. Detox your body with herbal teas. Mental health improves through journaling or therapy.',
    luckyNumber: 8,
    luckyColor: 'Maroon',
    luckyDirection: 'North',
    mantra: 'Om Kraam Kreem Kraum Sah Bhaumaya Namah',
    mantraHindi: 'ओम क्रां क्रीं क्रौं सः भौमाय नमः',
    rulingPlanet: 'Mars (Mangal)',
    element: 'Water (Jal)',
    overallRating: 3,
  },
  {
    rashi: 'sagittarius',
    rashiHindi: 'धनु',
    rashiEnglish: 'Sagittarius',
    symbol: '♐',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Adventure and learning are highlighted today. A spiritual journey or pilgrimage may be planned. Higher education or certification efforts succeed. Foreign connections bring good news.',
    career: 'International business opportunities arise. Teaching, publishing, or mentoring activities go well. Think big and aim high.',
    love: 'Long-distance relationships get a boost. Plan a trip together. Singles may find love through cultural or spiritual events.',
    health: 'Hips and thighs need attention. Stretching exercises are important. Outdoor activities boost both physical and mental health.',
    luckyNumber: 3,
    luckyColor: 'Purple',
    luckyDirection: 'Northeast',
    mantra: 'Om Graam Greem Graum Sah Gurave Namah',
    mantraHindi: 'ओम ग्रां ग्रीं ग्रौं सः गुरवे नमः',
    rulingPlanet: 'Jupiter (Guru)',
    element: 'Fire (Agni)',
    overallRating: 4,
  },
  {
    rashi: 'capricorn',
    rashiHindi: 'मकर',
    rashiEnglish: 'Capricorn',
    symbol: '♑',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Career ambitions get a major boost today. Hard work pays off with recognition from superiors. Financial discipline leads to long-term gains. A mentor figure may offer valuable guidance.',
    career: 'Promotions, raises, or new responsibilities are indicated. Your dedication and reliability are noticed. Take on challenging projects confidently.',
    love: 'Work-life balance needs attention. Make time for your partner. Practical expressions of love (acts of service) work best today.',
    health: 'Bones and joints need care. Calcium-rich foods and supplements recommended. Avoid overworking — take regular breaks.',
    luckyNumber: 10,
    luckyColor: 'Brown',
    luckyDirection: 'West',
    mantra: 'Om Praam Preem Praum Sah Shanaischaraya Namah',
    mantraHindi: 'ओम प्रां प्रीं प्रौं सः शनैश्चराय नमः',
    rulingPlanet: 'Saturn (Shani)',
    element: 'Earth (Prithvi)',
    overallRating: 5,
  },
  {
    rashi: 'aquarius',
    rashiHindi: 'कुम्भ',
    rashiEnglish: 'Aquarius',
    symbol: '♒',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Innovation and social connections thrive today. A unique idea or solution impresses everyone. Group activities and community service bring fulfillment. Technology-related investments do well.',
    career: 'Think outside the box. Your innovative ideas get green-lit. Networking events open doors to unexpected opportunities.',
    love: 'Friendship-based love deepens. Shared social causes bring you closer to your partner. Singles may find love in community gatherings.',
    health: 'Ankles and circulation need attention. Regular movement throughout the day is essential. Try a new form of exercise.',
    luckyNumber: 11,
    luckyColor: 'Electric Blue',
    luckyDirection: 'Southwest',
    mantra: 'Om Praam Preem Praum Sah Shanaischaraya Namah',
    mantraHindi: 'ओम प्रां प्रीं प्रौं सः शनैश्चराय नमः',
    rulingPlanet: 'Saturn (Shani)',
    element: 'Air (Vayu)',
    overallRating: 4,
  },
  {
    rashi: 'pisces',
    rashiHindi: 'मीन',
    rashiEnglish: 'Pisces',
    symbol: '♓',
    date: new Date().toISOString().split('T')[0]!,
    prediction: 'Spiritual awareness and creativity peak today. Dreams carry important messages — pay attention. Artistic projects receive appreciation. A charitable act brings unexpected blessings.',
    career: 'Creative fields like music, art, and writing flourish. Spiritual or healing professions bring deep satisfaction. Avoid making major financial decisions today.',
    love: 'Soulful connections deepen. Poetry, music, or art can express what words cannot. Singles may feel a karmic connection with someone new.',
    health: 'Feet and immune system need care. Rest is as important as activity today. Meditation and prayer will be deeply rejuvenating.',
    luckyNumber: 12,
    luckyColor: 'Sea Green',
    luckyDirection: 'Northeast',
    mantra: 'Om Graam Greem Graum Sah Gurave Namah',
    mantraHindi: 'ओम ग्रां ग्रीं ग्रौं सः गुरवे नमः',
    rulingPlanet: 'Jupiter (Guru)',
    element: 'Water (Jal)',
    overallRating: 4,
  },
];

// ─── Service Implementation ──────────────────────────────────────────────────────

// ─── Persisted Consultation Record (for portal listing) ────────────────────────
/**
 * AW-02 (P0) — a REAL astrologer, resolved from an approved `AstrologerProfile`
 * row, in the shape `startConsultation` needs. It is the merge input: passed in,
 * it takes precedence over the in-memory fixture; omitted, the fixture lookup
 * runs exactly as before.
 */
export interface ResolvedAstrologer {
  id: string;
  /** The astrologer's User UUID — what they authenticate as. */
  userId: string;
  name: string;
  specializations: string[];
  perMinuteRate: number;
  isOnline: boolean;
  isBusy: boolean;
}

export interface PortalConsultation {
  id: string;
  userId: string;
  astrologerId: string;
  /**
   * The astrologer's User UUID when the session was opened against a real
   * `AstrologerProfile`. `null` for legacy fixture sessions, whose
   * `astrologerId` was the only identity that ever existed.
   */
  astrologerUserId?: string | null;
  clientName: string;
  type: string;
  mode: 'video' | 'call' | 'chat';
  scheduledAt: string;
  duration: number;
  rate: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  rating?: number;
  notes?: string;
  roomUrl?: string | null;
  endedAt?: string;
}

class AstrologyService {
  // In-memory store of consultation sessions (MVP — replace with Prisma later)
  private sessions: Map<string, PortalConsultation> = new Map();

  // ── Get Astrologers (with filters) ────────────────────────────────────────
  getAstrologers(params: AstrologersParams = {}) {
    let filtered = [...ASTROLOGERS];

    // Filter by specialization
    if (params.specialization) {
      filtered = filtered.filter((a) =>
        a.specializations.some(
          (s) => s.toLowerCase() === params.specialization!.toLowerCase()
        )
      );
    }

    // Filter by language
    if (params.language) {
      filtered = filtered.filter((a) =>
        a.languages.some(
          (l) => l.toLowerCase() === params.language!.toLowerCase()
        )
      );
    }

    // Filter by price range
    if (params.priceRange) {
      const [minStr, maxStr] = params.priceRange.split('-');
      const min = Number(minStr) || 0;
      const max = Number(maxStr) || Infinity;
      filtered = filtered.filter(
        (a) => a.perMinuteRate >= min && a.perMinuteRate <= max
      );
    }

    // Filter by online status
    if (params.isOnline !== undefined) {
      filtered = filtered.filter((a) => a.isOnline === params.isOnline);
    }

    // Sort
    switch (params.sortBy) {
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'price':
        filtered.sort((a, b) => a.perMinuteRate - b.perMinuteRate);
        break;
      case 'experience':
        filtered.sort((a, b) => b.experienceYears - a.experienceYears);
        break;
      default:
        // Default: online first, then by rating
        filtered.sort((a, b) => {
          if (a.isOnline && !a.isBusy && !(b.isOnline && !b.isBusy)) return -1;
          if (b.isOnline && !b.isBusy && !(a.isOnline && !a.isBusy)) return 1;
          return b.rating - a.rating;
        });
    }

    // Pagination
    const page = params.page ?? 1;
    const limit = params.limit ?? 15;
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      astrologers: paginated,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  // ── Get Astrologer By ID ──────────────────────────────────────────────────
  getAstrologerById(id: string): AstrologerDetail | null {
    const astrologer = ASTROLOGERS.find((a) => a.id === id);
    if (!astrologer) return null;

    return {
      ...astrologer,
      reviews: REVIEWS[id] ?? [],
    };
  }

  // ── Get Astrologer By Slug Or UUID ────────────────────────────────────────
  // R-Q1-E-010 dual-lookup helper. Routes/clients may pass either the legacy
  // slug ("astro_002") or — once DB-backed astrologers ship — a UUID. Order:
  // 1. UUID regex match → attempt UUID lookup (currently no-op against the
  //    in-memory ASTROLOGERS seed; reserved for future DB-backed lookup).
  // 2. Fall back to slug lookup against the in-memory seed.
  // See docs/engineering/astrologer-slug-uuid-migration-spec.md.
  getAstrologerByIdOrSlug(idOrSlug: string): AstrologerDetail | null {
    if (!idOrSlug || typeof idOrSlug !== 'string') return null;
    const trimmed = idOrSlug.trim();
    if (!trimmed) return null;

    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmed,
      );

    // UUID path reserved for DB-backed lookup (future migration). For now the
    // in-memory seed only has slug IDs ("astro_001"..) so a UUID will never
    // resolve here. Still attempt it to keep call sites identifier-agnostic.
    if (isUuid) {
      const byUuid = ASTROLOGERS.find((a) => a.id === trimmed);
      if (byUuid) {
        return { ...byUuid, reviews: REVIEWS[byUuid.id] ?? [] };
      }
      // Intentional fallthrough — caller may have passed a UUID that maps to
      // a slug via a future mapping table. Until that table exists, return
      // null rather than 500 so the route can 404 cleanly.
      return null;
    }

    return this.getAstrologerById(trimmed);
  }

  // ── Get Specializations ───────────────────────────────────────────────────
  getSpecializations(): Specialization[] {
    return SPECIALIZATIONS;
  }

  // ── Get Reviews (paginated) ───────────────────────────────────────────────
  getReviews(astrologerId: string, page = 1, limit = 5) {
    const reviews = REVIEWS[astrologerId] ?? [];
    const start = (page - 1) * limit;
    const paginated = reviews.slice(start, start + limit);

    return {
      reviews: paginated,
      total: reviews.length,
      page,
      limit,
      totalPages: Math.ceil(reviews.length / limit),
    };
  }

  // ── Start Consultation ────────────────────────────────────────────────────
  //
  // AW-02 (P0): `resolved` is how a REAL astrologer gets in.
  //
  // The route gate above this only admits an approved `AstrologerProfile` id,
  // and a real profile UUID can never appear in the in-memory ASTROLOGERS
  // fixture (its ids are `astro_001`..`astro_015`). So the fixture lookup
  // answered 'Astrologer not found.' for every genuinely onboarded astrologer:
  // the endpoint refused the invented 15 AND the real 3 — shut in both
  // directions, which is not what "stop selling fictional astrologers" means.
  //
  // Real supply is MERGED IN AHEAD of the fixture, never in place of it. The
  // fixture is load-bearing (GET /specializations, getReviews,
  // getAstrologerByIdOrSlug all read it) and stays the fallback branch, so a
  // direct caller passing `astro_00X` behaves exactly as before.
  startConsultation(
    userId: string,
    astrologerId: string,
    mode: 'chat' | 'call' | 'video',
    resolved?: ResolvedAstrologer,
  ): ConsultationSession | { error: string } {
    const astrologer = resolved ?? ASTROLOGERS.find((a) => a.id === astrologerId);
    if (!astrologer) return { error: 'Astrologer not found.' };
    if (!astrologer.isOnline) return { error: 'Astrologer is currently offline.' };
    if (astrologer.isBusy) return { error: 'Astrologer is currently busy with another consultation.' };

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const startedAt = new Date().toISOString();

    // Persist a portal-shaped record so astrologer dashboards can list it.
    // `astrologerUserId` is the astrologer's User UUID when one is known: the
    // session is addressed by AstrologerProfile.id, but an astrologer signs in
    // as their User, so without it a real astrologer could never see the
    // consultation booked with them (see listConsultations).
    this.sessions.set(sessionId, {
      id: sessionId,
      userId,
      astrologerId,
      astrologerUserId: resolved?.userId ?? null,
      clientName: 'Devotee',
      type: astrologer.specializations[0] ?? 'General Consultation',
      mode,
      scheduledAt: startedAt,
      duration: 30,
      rate: astrologer.perMinuteRate,
      status: 'scheduled',
      roomUrl: null,
    });

    return {
      sessionId,
      userId,
      astrologerId,
      astrologerName: astrologer.name,
      mode,
      status: 'waiting',
      perMinuteRate: astrologer.perMinuteRate,
      startedAt,
      freeMinutes: 5,
    };
  }

  /**
   * Is `callerId` the astrologer on this session? A session is addressed by
   * AstrologerProfile.id but the astrologer authenticates as their User, so
   * both identities have to match. Legacy fixture sessions carry no
   * `astrologerUserId` and keep matching on the id alone.
   */
  private isSessionAstrologer(session: PortalConsultation, callerId: string): boolean {
    return session.astrologerId === callerId || session.astrologerUserId === callerId;
  }

  // ── List Consultations (for portal dashboards) ────────────────────────────
  async listConsultations({ userId, role }: { userId: string; role: string }): Promise<PortalConsultation[]> {
    const all = Array.from(this.sessions.values());
    if (role === 'astrologer') return all.filter((s) => this.isSessionAstrologer(s, userId));
    return all.filter((s) => s.userId === userId);
  }

  // ── Update Consultation Status ────────────────────────────────────────────
  // P0 #AP-03 (2026-07-09): ownership check. The old method mutated any
  // session by id — any logged-in user could complete/cancel ANY
  // consultation. Now the caller must be the devotee owner or the assigned
  // astrologer (or it throws → route 403).
  async updateConsultation(
    id: string,
    status: 'COMPLETED' | 'CANCELLED',
    caller: { userId: string; isAdmin: boolean },
  ): Promise<PortalConsultation> {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Consultation not found');
    if (
      !caller.isAdmin &&
      session.userId !== caller.userId &&
      !this.isSessionAstrologer(session, caller.userId)
    ) {
      throw new Error('Not authorized for this consultation');
    }
    session.status = status === 'COMPLETED' ? 'completed' : 'cancelled';
    if (status === 'COMPLETED') session.endedAt = new Date().toISOString();
    this.sessions.set(id, session);
    return session;
  }

  // ── Start Call (allocate Jitsi room) ──────────────────────────────────────
  // P0 #AP-03 (2026-07-09): same ownership gate as updateConsultation.
  async startCall(
    id: string,
    caller: { userId: string; isAdmin: boolean },
  ): Promise<{ roomUrl: string }> {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Consultation not found');
    if (
      !caller.isAdmin &&
      session.userId !== caller.userId &&
      !this.isSessionAstrologer(session, caller.userId)
    ) {
      throw new Error('Not authorized for this consultation');
    }
    if (!session.roomUrl) {
      session.roomUrl = `https://meet.jit.si/darshya-${id}`;
      session.status = 'in_progress';
      this.sessions.set(id, session);
    }
    return { roomUrl: session.roomUrl };
  }

  // ── Vedic compute helpers ─────────────────────────────────────────────────
  // These approximations use the tropical Sun-sign date ranges shifted
  // ~24 days for Vedic (sidereal) zodiac. Good enough for a kundli summary;
  // a real ephemeris would refine planet positions to arc-seconds.
  private rashiFromBirthDate(birthDate: string): { rashi: string; rashiHindi: string; rashiEnglish: string } {
    const d = new Date(birthDate);
    if (isNaN(d.getTime())) {
      return { rashi: 'Mesha', rashiHindi: 'मेष', rashiEnglish: 'Aries' };
    }
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    // Vedic (sidereal) zodiac dates — Lahiri ayanamsa ~24 days behind tropical
    const ranges: [number, number, number, number, string, string, string][] = [
      [4, 14, 5, 14, 'Mesha', 'मेष', 'Aries'],
      [5, 15, 6, 14, 'Vrishabha', 'वृषभ', 'Taurus'],
      [6, 15, 7, 15, 'Mithuna', 'मिथुन', 'Gemini'],
      [7, 16, 8, 16, 'Karka', 'कर्क', 'Cancer'],
      [8, 17, 9, 16, 'Simha', 'सिंह', 'Leo'],
      [9, 17, 10, 17, 'Kanya', 'कन्या', 'Virgo'],
      [10, 18, 11, 16, 'Tula', 'तुला', 'Libra'],
      [11, 17, 12, 15, 'Vrishchika', 'वृश्चिक', 'Scorpio'],
      [12, 16, 1, 14, 'Dhanu', 'धनु', 'Sagittarius'],
      [1, 15, 2, 12, 'Makara', 'मकर', 'Capricorn'],
      [2, 13, 3, 13, 'Kumbha', 'कुंभ', 'Aquarius'],
      [3, 14, 4, 13, 'Meena', 'मीन', 'Pisces'],
    ];
    for (const [m1, d1, m2, d2, rashi, hindi, english] of ranges) {
      const after = month > m1 || (month === m1 && day >= d1);
      const before = month < m2 || (month === m2 && day <= d2);
      // Handle wrap-around (Dhanu: Dec→Jan)
      const wraps = m1 > m2;
      if (wraps ? (after || before) : (after && before)) {
        return { rashi, rashiHindi: hindi, rashiEnglish: english };
      }
    }
    return { rashi: 'Mesha', rashiHindi: 'मेष', rashiEnglish: 'Aries' };
  }

  /** Approximate nakshatra from birth date — 27 nakshatras across the year */
  private nakshatraFromBirthDate(birthDate: string): { nakshatra: string; nakshatraHindi: string } {
    const NAKSHATRAS: [string, string][] = [
      ['Ashwini', 'अश्विनी'], ['Bharani', 'भरणी'], ['Krittika', 'कृत्तिका'],
      ['Rohini', 'रोहिणी'], ['Mrigashira', 'मृगशिरा'], ['Ardra', 'आर्द्रा'],
      ['Punarvasu', 'पुनर्वसु'], ['Pushya', 'पुष्य'], ['Ashlesha', 'आश्लेषा'],
      ['Magha', 'मघा'], ['Purva Phalguni', 'पूर्व फाल्गुनी'], ['Uttara Phalguni', 'उत्तर फाल्गुनी'],
      ['Hasta', 'हस्त'], ['Chitra', 'चित्रा'], ['Swati', 'स्वाति'],
      ['Vishakha', 'विशाखा'], ['Anuradha', 'अनुराधा'], ['Jyeshtha', 'ज्येष्ठा'],
      ['Mula', 'मूल'], ['Purva Ashadha', 'पूर्वाषाढ़ा'], ['Uttara Ashadha', 'उत्तराषाढ़ा'],
      ['Shravana', 'श्रवण'], ['Dhanishta', 'धनिष्ठा'], ['Shatabhisha', 'शतभिषा'],
      ['Purva Bhadrapada', 'पूर्व भाद्रपद'], ['Uttara Bhadrapada', 'उत्तर भाद्रपद'], ['Revati', 'रेवती'],
    ];
    const d = new Date(birthDate);
    const dayOfYear = isNaN(d.getTime())
      ? 0
      : Math.floor((d.getTime() - new Date(d.getUTCFullYear(), 0, 0).getTime()) / 86400000);
    const idx = Math.floor((dayOfYear / 365) * 27) % 27;
    return { nakshatra: NAKSHATRAS[idx]![0], nakshatraHindi: NAKSHATRAS[idx]![1] };
  }

  /**
   * Async kundli — uses Groq (when configured) to write a personalized
   * reading. Falls back to deterministic hardcoded values if LLM unavailable.
   */
  async getKundliAsync(
    birthDate: string,
    birthTime: string,
    birthPlace: string,
    name?: string,
  ): Promise<KundliResult & { aiReading?: string }> {
    const base = this.getKundli(birthDate, birthTime, birthPlace, name);
    // Replace the hardcoded rashi/nakshatra with date-derived ones
    const r = this.rashiFromBirthDate(birthDate);
    const n = this.nakshatraFromBirthDate(birthDate);
    const enriched: KundliResult & { aiReading?: string } = {
      ...base,
      rashi: r.rashi,
      rashiHindi: r.rashiHindi,
      nakshatra: n.nakshatra,
      nakshatraHindi: n.nakshatraHindi,
      moonSign: `${r.rashi} (${r.rashiEnglish})`,
    };

    if (DEMO_MODE) return enriched;

    try {
      const systemPrompt =
        'You are a Vedic astrologer (jyotishi). Given a birth date, time, place, ' +
        'rashi (moon sign), and nakshatra, write a brief, respectful Kundli reading ' +
        'in 4 short paragraphs covering: 1) Personality traits 2) Career & finance ' +
        '3) Relationships 4) Spiritual guidance. Keep it under 300 words. Use plain ' +
        'language; sprinkle a few Sanskrit terms with English translation in brackets.';
      const userMessage =
        `Name: ${name ?? 'Devotee'}\nBirth date: ${birthDate}\nBirth time: ${birthTime}` +
        `\nBirth place: ${birthPlace}\nRashi: ${r.rashi} (${r.rashiHindi})` +
        `\nNakshatra: ${n.nakshatra} (${n.nakshatraHindi})`;
      const aiReading = await generateText({
        systemPrompt,
        userMessage,
        maxTokens: 600,
        model: MODELS.SONNET,
      });
      enriched.aiReading = aiReading;
    } catch {
      // LLM failed — return the chart without an AI reading rather than 500
    }
    return enriched;
  }

  // ── Generate Kundli (hardcoded sample) ────────────────────────────────────
  getKundli(
    birthDate: string,
    birthTime: string,
    birthPlace: string,
    name?: string
  ): KundliResult {
    return {
      name: name || 'User',
      birthDate,
      birthTime,
      birthPlace,
      rashi: 'Simha',
      rashiHindi: 'सिंह',
      nakshatra: 'Magha',
      nakshatraHindi: 'मघा',
      ascendant: 'Mesha',
      ascendantHindi: 'मेष',
      moonSign: 'Simha (Leo)',
      currentDasha: 'Shukra Mahadasha',
      dashaPeriod: '2023-2043',
      planetaryPositions: [
        { planet: 'Sun (Surya)', sign: 'Leo', house: 5, degree: '15° 23\'' },
        { planet: 'Moon (Chandra)', sign: 'Leo', house: 5, degree: '22° 10\'' },
        { planet: 'Mars (Mangal)', sign: 'Aries', house: 1, degree: '8° 45\'' },
        { planet: 'Mercury (Budh)', sign: 'Virgo', house: 6, degree: '3° 18\'' },
        { planet: 'Jupiter (Guru)', sign: 'Sagittarius', house: 9, degree: '19° 56\'' },
        { planet: 'Venus (Shukra)', sign: 'Libra', house: 7, degree: '11° 32\'' },
        { planet: 'Saturn (Shani)', sign: 'Capricorn', house: 10, degree: '27° 05\'' },
        { planet: 'Rahu', sign: 'Gemini', house: 3, degree: '14° 41\'' },
        { planet: 'Ketu', sign: 'Sagittarius', house: 9, degree: '14° 41\'' },
      ],
      houses: [
        { house: 1, sign: 'Aries', planets: ['Mars'] },
        { house: 2, sign: 'Taurus', planets: [] },
        { house: 3, sign: 'Gemini', planets: ['Rahu'] },
        { house: 4, sign: 'Cancer', planets: [] },
        { house: 5, sign: 'Leo', planets: ['Sun', 'Moon'] },
        { house: 6, sign: 'Virgo', planets: ['Mercury'] },
        { house: 7, sign: 'Libra', planets: ['Venus'] },
        { house: 8, sign: 'Scorpio', planets: [] },
        { house: 9, sign: 'Sagittarius', planets: ['Jupiter', 'Ketu'] },
        { house: 10, sign: 'Capricorn', planets: ['Saturn'] },
        { house: 11, sign: 'Aquarius', planets: [] },
        { house: 12, sign: 'Pisces', planets: [] },
      ],
    };
  }

  // ── Daily Horoscope ───────────────────────────────────────────────────────
  getDailyHoroscope(rashi: string): DailyHoroscope | null {
    return RASHIS.find(
      (r) =>
        r.rashi.toLowerCase() === rashi.toLowerCase() ||
        r.rashiEnglish.toLowerCase() === rashi.toLowerCase() ||
        r.rashiHindi === rashi
    ) ?? null;
  }

  // ── All Horoscopes ────────────────────────────────────────────────────────
  getAllHoroscopes(): DailyHoroscope[] {
    return RASHIS;
  }

  // ── Compatibility ─────────────────────────────────────────────────────────
  getCompatibility(rashi1: string, rashi2: string): CompatibilityResult | null {
    const r1 = RASHIS.find(
      (r) =>
        r.rashi.toLowerCase() === rashi1.toLowerCase() ||
        r.rashiEnglish.toLowerCase() === rashi1.toLowerCase()
    );
    const r2 = RASHIS.find(
      (r) =>
        r.rashi.toLowerCase() === rashi2.toLowerCase() ||
        r.rashiEnglish.toLowerCase() === rashi2.toLowerCase()
    );

    if (!r1 || !r2) return null;

    // Deterministic pseudo-random scores based on rashi names
    const seed = (r1.rashi.charCodeAt(0) + r2.rashi.charCodeAt(0)) % 30;
    const overall = 55 + seed + ((r1.rashi.length + r2.rashi.length) % 20);
    const emotional = Math.min(98, 50 + seed + (r1.rashi.charCodeAt(1) ?? 10) % 30);
    const intellectual = Math.min(98, 55 + seed + (r2.rashi.charCodeAt(1) ?? 10) % 25);
    const physical = Math.min(98, 52 + seed + ((r1.rashi.length * r2.rashi.length) % 28));
    const spiritual = Math.min(98, 60 + seed + ((r1.rashi.charCodeAt(0) * 3) % 22));

    return {
      rashi1: r1.rashiEnglish,
      rashi2: r2.rashiEnglish,
      overallScore: Math.min(98, overall),
      emotional: Math.min(98, emotional),
      intellectual: Math.min(98, intellectual),
      physical: Math.min(98, physical),
      spiritual: Math.min(98, spiritual),
      summary: `${r1.rashiEnglish} and ${r2.rashiEnglish} share a ${overall > 75 ? 'highly compatible' : overall > 60 ? 'moderately compatible' : 'challenging but growth-oriented'} bond. This pairing brings together ${r1.rashiEnglish}'s strengths with ${r2.rashiEnglish}'s complementary qualities, creating a dynamic and evolving relationship.`,
      strengths: [
        'Strong emotional understanding and empathy',
        'Shared spiritual and cultural values',
        'Complementary personality traits that balance each other',
        'Natural respect for each other\'s space and independence',
      ],
      challenges: [
        'Occasional communication style differences',
        'Different approaches to financial planning',
        'Balancing social life with private time together',
      ],
    };
  }
  // ── AI Astrologer Chat ────────────────────────────────────────────────────
  async askAstrologer(
    message: string,
    birthDetails?: {
      name?: string;
      date?: string;
      time?: string;
      place?: string;
    }
  ): Promise<{ response: string; source: 'llm-grounded' | 'llm' | 'fallback-keyword' | 'fallback-default'; context?: VedicContext }> {
    const context = birthDetails?.date ? computeVedicContext(birthDetails) : null;

    const birthContext = context
      ? `\n\nUser's Vedic chart (computed from birth details — use these as ground truth, do NOT contradict):\n- ${context.summary}\n\nName: ${birthDetails?.name || 'devotee'}. Tailor every answer to this chart. Reference the actual Mahadasha, Moon sign, Lagna, and nakshatra by name. If a dosha is flagged, address it directly.`
      : birthDetails?.date
        ? `\n\nUser's birth details:\n- Name: ${birthDetails.name || 'Not provided'}\n- Date of Birth: ${birthDetails.date}\n- Time of Birth: ${birthDetails.time || 'Not provided'}\n- Place of Birth: ${birthDetails.place || 'Not provided'}`
        : '';

    const systemPrompt = `You are an expert Vedic Astrologer (Jyotishi) on the Darshya platform. You provide authentic Jyotish guidance grounded in Parashari and Jaimini systems.

Guidelines:
- Use Vedic sidereal zodiac (Lahiri ayanamsa), never Western tropical
- Reference rashis, nakshatras, Vimshottari dashas, yogas, doshas by Sanskrit name
- When a computed chart block is provided below, anchor every claim in those values
- Suggest traditional remedies: beej mantras, gemstones, pujas, donations, charity (daan)
- Include Sanskrit mantras with Devanagari + IAST transliteration
- Address user warmly (Namaste / dear devotee); keep responses focused, 250-500 words
- Marriage: 7th house, Venus karaka, Jupiter transit, Navamsa (D-9), Manglik check
- Career: 10th house, Saturn karaka, Sun for authority, Mercury for trade
- Health: 1st/6th/8th houses, planet-body correlations, Mahamrityunjaya for crisis
- Money: 2nd/11th houses, Jupiter for wealth, Venus for luxury, Lakshmi rituals
- Children: 5th house, Jupiter karaka, Santan Gopal mantra
- Education: 4th/5th houses, Mercury + Jupiter, Saraswati upasana
- Travel/foreign: 9th/12th houses, Rahu for foreign lands
- Do not provide medical, legal, or financial advice — redirect to professionals
- Mention relevant Darshya pujas (Rudrabhishek, Mahamrityunjaya Japa, Navagraha Shanti, Satyanarayan, Lakshmi Puja) when remedies fit
- Be honest about astrology's limits: planets show tendencies, karma + free will shape outcomes${birthContext}`;

    try {
      const response = await generateText({
        systemPrompt,
        userMessage: message,
        maxTokens: 1024,
        model: MODELS.HAIKU,
      });
      return {
        response,
        source: context ? 'llm-grounded' : 'llm',
        ...(context ? { context } : {}),
      };
    } catch {
      const fallback = this.getAstrologerFallback(message);
      return {
        response: fallback.text,
        source: fallback.matched ? 'fallback-keyword' : 'fallback-default',
        ...(context ? { context } : {}),
      };
    }
  }

  // ── Fallback responses for when API is unavailable ───────────────────────
  getAstrologerFallback(message: string): { text: string; matched: boolean } {
    const lower = message.toLowerCase();
    const has = (...keys: string[]) => keys.some((k) => lower.includes(k));

    if (has('marriage', 'married', 'vivah', 'shaadi', 'partner', 'love', 'relationship', 'spouse', 'divorce', 'engaged', 'breakup', 'girlfriend', 'boyfriend', 'wedding')) {
      return { matched: true, text: `Marriage in Vedic Jyotish is read from the **7th house, its lord, Venus (Shukra) as karaka, and the Navamsa (D-9) chart**.

**Timing indicators:**
- Vimshottari Mahadasha or Antardasha of Venus, 7th lord, or planets in the 7th house
- Jupiter transit (gochar) over the 7th house, 7th lord, or Moon sign's 2nd/7th/11th
- Saturn transit over Venus often delays — natural maturation phase

**Manglik check:** Mars in 1/4/7/8/12 from Lagna OR Moon. Marrying another Manglik cancels the dosha. Mangal Shanti puja (Mangalvar) is the classical remedy.

**Remedies:**
- Mondays: worship Shiva-Parvati together (Ardhanarishvara form)
- Katyayani Mantra: ॐ कात्यायनी महामाये महायोगिन्यधीश्वरि — 108 times
- Fridays: donate white items (rice, sugar, white cloth) for Venus
- Book a **Vivah Puja** or **Swayamvara Parvati Puja** on Darshya

Share your birth date + time + place for a precise Mahadasha + Navamsa reading.` };
    }

    if (has('career', 'job', 'business', 'work', 'profession', 'promotion', 'raise', 'firing', 'fired', 'colleague', 'boss', 'office')) {
      return { matched: true, text: `Career in Jyotish reads from the **10th house (Karma Bhava), its lord, and karakas Saturn (effort) + Sun (authority) + Mercury (intellect) + Jupiter (wisdom)**.

**House map:**
- **10th** — profession, public standing, dharma karma
- **6th** — service, daily work, competition won
- **2nd** — accumulated wealth from career
- **11th** — gains, bonuses, income flow

**Dasha sensitivity:** Mahadasha of 10th lord or planets aspecting 10th typically marks pivot years. Saturn return (around age 29-30 and 58-59) reshapes career identity.

**Remedies:**
- Gayatri Mantra at sunrise — mental clarity + Sun blessing
- Saturday: donate black sesame, mustard oil, iron, dark cloth for Saturn
- Chant Hanuman Chalisa on Tuesdays for courage at workplace
- Book **Navagraha Shanti** if multiple malefics afflict 10th
- Blue sapphire (Neelam) **only after chart confirms Saturn benefic** — never wear untested

Share your birth details for 10th-house lord + Mahadasha analysis.` };
    }

    if (has('money', 'wealth', 'rich', 'loan', 'debt', 'investment', 'stocks', 'savings', 'finance', 'income')) {
      return { matched: true, text: `Wealth in Vedic astrology flows from the **Dhana trikona — 2nd, 5th, 9th, 11th houses** and karaka **Jupiter (Brihaspati) + Venus (Shukra)**.

**Key reads:**
- 2nd house — accumulated wealth, family money
- 5th — speculative gains, investments, intelligence
- 9th — luck, dharma earnings
- 11th — income, gains, fulfilled desires

**Dhana Yoga:** lords of 2/5/9/11 in mutual exchange or conjunction. Lakshmi Yoga (9th lord strong + Venus in own/exalted sign) blesses sustained prosperity.

**Remedies:**
- Friday: Lakshmi Puja, light ghee diya, offer kheer
- Shri Suktam recitation on full moon (Purnima)
- Donate yellow lentils (chana dal) Thursdays for Jupiter
- Book **Mahalakshmi Yagna** during Dhanteras
- Avoid borrowing on Saturdays (Saturn's day)

For debt: Kuber mantra **ॐ यक्षाय कुबेराय वैश्रवणाय धनधान्याधिपतये धनधान्यसमृद्धिं मे देहि दापय स्वाहा** — 108 times daily.` };
    }

    if (has('health', 'disease', 'illness', 'body', 'medical', 'surgery', 'pain', 'recovery', 'hospital', 'sick')) {
      return { matched: true, text: `Health in Jyotish maps to **Lagna (1st — vitality), 6th (disease), 8th (chronic/longevity), 12th (hospitalization, mental rest)**.

**Planet-body correlations:**
- Sun: heart, bones, eyesight, vitality
- Moon: mind, blood, emotions, fluids
- Mars: muscles, blood pressure, accidents, surgery
- Mercury: nerves, skin, speech
- Jupiter: liver, fat, diabetes, growth
- Venus: kidneys, reproductive system
- Saturn: joints, chronic conditions, teeth
- Rahu: poisoning, mysterious ailments
- Ketu: viral, unexplained

**Crisis mantra — Mahamrityunjaya:**
ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् |
उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय माऽमृतात् ||

108 recitations daily, ideally on Mondays.

**Remedies:** Navagraha Shanti, Rudrabhishek for Shiva's healing grace, donate to ill on 8th-house transit days.

**Critical:** astrology complements medicine — never replace doctor's care. Book Mahamrityunjaya Japa on Darshya for chronic conditions.` };
    }

    if (has('education', 'study', 'studies', 'exam', 'college', 'admission', 'school', 'student', 'degree')) {
      return { matched: true, text: `Education in Jyotish reads from **4th house (basic education, mother's nurturing), 5th house (intellect, learning), 9th house (higher learning, dharma)** with karakas **Mercury (Budh) + Jupiter (Guru)**.

**Strong combos:**
- Jupiter aspecting 5th = wisdom, scholarship
- Mercury in own/exalted sign = sharp intellect
- 9th lord strong = post-graduate + foreign education
- Saraswati Yoga (Mercury + Jupiter + Venus in kendra) = top scholar

**Exam-time remedies:**
- Saraswati mantra: ॐ ऐं सरस्वत्यै नमः — 108 times before study
- Wear yellow on Thursdays
- Worship Ganesha before exams: ॐ गं गणपतये नमः
- Offer 21 durva to Ganesh idol

**Foreign education:** Rahu in 9th, 9th lord in 12th, or Moon-Rahu in 9th often indicate study abroad. Mahadasha of these planets activates the foreign window.

Book **Saraswati Puja** on Vasant Panchami for academic excellence.` };
    }

    if (has('child', 'children', 'santaan', 'santan', 'pregnancy', 'pregnant', 'baby', 'ivf', 'conceive', 'conception', 'putra', 'progeny')) {
      return { matched: true, text: `Children (santan) read from the **5th house (Putra Bhava), its lord, and karaka Jupiter (Guru)**.

**Indicators:**
- 5th house occupied/aspected by benefics (Jupiter, Venus, Moon waxing)
- Jupiter strong in own/exalted sign
- 5th lord in trikona (1, 5, 9) = blessed progeny
- Malefics (Saturn, Mars, Rahu) afflicting 5th + Jupiter = delays/complications

**Putra dosha** (Pitra dosha affecting children) treated via Tripindi Shradh at Gaya or Trimbakeshwar.

**Remedies for conception:**
- Santan Gopal Mantra: ॐ देवकीसुत गोविन्द वासुदेव जगत्पते | देहि मे तनयं कृष्ण त्वामहं शरणं गतः ||
- Recite Hari Vamsa Purana
- Worship Gopal Krishna on Wednesdays + Janmashtami
- Donate to children's education / orphanage
- Book **Santan Gopal Puja** on Darshya

For IVF timing: align procedure with **Chandra Bala** (favorable Moon transit from Moon sign) + benefic muhurta. Share birth details for both partners for precise window.` };
    }

    if (has('travel', 'foreign', 'abroad', 'visa', 'immigration', 'us', 'usa', 'canada', 'australia', 'uk', 'singapore', 'dubai', 'nri')) {
      return { matched: true, text: `Foreign travel + settlement in Jyotish reads from **9th house (long journeys, dharma), 12th house (foreign lands, expenditure abroad), 3rd (short trips)** with **Rahu** as the chief foreign karaka.

**Strong indicators:**
- Rahu in 9th, 12th, or Lagna
- 9th or 12th lord in mutual exchange
- Moon-Rahu / Sun-Rahu conjunctions
- Mahadasha/Antardasha of Rahu or 12th lord

**Visa muhurta:** Submit on a Wednesday (Mercury — paperwork) or Thursday (Jupiter — fortune), avoiding Rahu Kalam. Wear blue or saffron.

**Remedies:**
- Durga Saptashati for safe passage
- Hanuman Chalisa before journey
- Offer coconut + flowers to flowing water on travel-day morning
- Chant **ॐ रां राहवे नमः** for Rahu favor
- Avoid travel during Bhadra karana or Vyatipata yoga

**For NRI children/spouse abroad:** light a diya facing west at dusk on Tuesdays. Book **Sankat Mochan Hanuman Puja** for protection.` };
    }

    if (has('manglik', 'mangal', 'sade-sati', 'sade sati', 'sadesati', 'kaal-sarp', 'kaal sarp', 'kaalsarp', 'pitra', 'pitru', 'pitru dosh', 'dosha', 'dosh', 'kemadruma')) {
      return { matched: true, text: `**Doshas in Vedic astrology — diagnosis + remedy:**

**Manglik Dosha:** Mars in 1/4/7/8/12 from Lagna OR Moon. Affects marriage harmony. *Cancels* when partner also Manglik, or Mars debilitated, or after age 28. Remedies: Mangal Shanti Puja, Hanuman Chalisa Tuesdays, fast on Tuesdays, marry a tree/Vishnu idol (Kumbh Vivah) before human marriage.

**Sade-Sati:** Saturn's 7.5-year transit over 12th, 1st, 2nd house from natal Moon. Three phases: rising (12th), peak (1st), setting (2nd). Not always negative — brings maturity. Remedies: Shani Mantra **ॐ शं शनैश्चराय नमः** 108x Saturdays, donate black sesame + mustard oil, feed crows, Hanuman Chalisa daily, **Shani Shanti Puja** at Shani temples (Shingnapur, Tirunallar).

**Kaal Sarp Dosha:** All 7 planets between Rahu-Ketu axis. Twelve variations (Anant, Kulik, Vasuki...). Causes recurring obstacles. Remedy: **Kaal Sarp Shanti** at Trimbakeshwar / Kalahasti, recite Maha Mrityunjaya 108x daily.

**Pitra Dosha:** Sun + Rahu/Ketu in 9th, or 9th lord afflicted. Ancestral karma. Remedy: **Tripindi Shradh** at Gaya/Trimbakeshwar, feed brahmins on Amavasya, donate to elders.

**Kemadruma Yoga:** No planet in 2nd/12th from Moon. Isolation, financial swings. Remedy: Monday fasts, Chandra mantra **ॐ सोम सोमाय नमः**, white-colored offerings.

Share birth details to confirm which doshas (if any) apply to your chart.` };
    }

    if (has('gemstone', 'gem', 'ratna', 'ruby', 'pearl', 'coral', 'emerald', 'diamond', 'sapphire', 'topaz', 'neelam', 'pukhraj', 'manik', 'moti')) {
      return { matched: true, text: `**Vedic gemstones (Navaratna) — planet ↔ stone:**

| Planet | Gemstone | Hindi | Finger | Day | Weight |
|---|---|---|---|---|---|
| Sun | Ruby | Manik | Ring | Sunday | 3-6 carats |
| Moon | Pearl | Moti | Little | Monday | 4-6 carats |
| Mars | Red Coral | Moonga | Ring | Tuesday | 5-9 carats |
| Mercury | Emerald | Panna | Little | Wednesday | 4-6 carats |
| Jupiter | Yellow Sapphire | Pukhraj | Index | Thursday | 4-6 carats |
| Venus | Diamond | Heera | Middle | Friday | 0.5-1 carat |
| Saturn | Blue Sapphire | Neelam | Middle | Saturday | 4-7 carats |
| Rahu | Hessonite | Gomed | Middle | Wednesday | 4-6 carats |
| Ketu | Cat's Eye | Lehsuniya | Ring | Tuesday | 3-6 carats |

**CRITICAL warnings:**
- **Never wear a gemstone untested.** Wrong stone activates the planet's malefic side.
- Blue sapphire (Neelam) most powerful + most dangerous — test 3 days under pillow first.
- Yellow sapphire safest as general benefic for most charts.
- Always energise: dip in raw milk + Ganga jal, chant beej mantra 108x, wear on the planet's day at sunrise.

**Cheaper substitutes (upratna):** Garnet for ruby, moonstone for pearl, peridot for emerald, citrine for yellow sapphire.

Share your chart for personalised stone recommendation — avoid online astrology generators that ignore Dasha + house lordship.` };
    }

    if (has('mantra', 'chant', 'jaap', 'japa', 'recite')) {
      return { matched: true, text: `**Foundational Vedic mantras + their applications:**

**1. Gayatri Mantra** (universal):
ॐ भूर्भुवः स्वः | तत्सवितुर्वरेण्यं | भर्गो देवस्य धीमहि | धियो यो नः प्रचोदयात् ||
108x at sunrise — wisdom, mental clarity, Sun blessing.

**2. Mahamrityunjaya Mantra** (Shiva — healing, crisis):
ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् | उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय माऽमृतात् ||
108x daily for health, longevity, fearlessness.

**3. Ganesh Mantra** (obstacles):
ॐ गं गणपतये नमः — 108x before any new venture.

**4. Hanuman Beej** (courage, Mars protection):
ॐ हं हनुमते रुद्रात्मकाय हुं फट् — Tuesdays + Saturdays.

**5. Navagraha Beej** (planet-specific):
- Sun: ॐ ह्रां ह्रीं ह्रौं सः सूर्याय नमः
- Moon: ॐ श्रां श्रीं श्रौं सः चन्द्राय नमः
- Mars: ॐ क्रां क्रीं क्रौं सः भौमाय नमः
- Mercury: ॐ ब्रां ब्रीं ब्रौं सः बुधाय नमः
- Jupiter: ॐ ग्रां ग्रीं ग्रौं सः गुरवे नमः
- Venus: ॐ द्रां द्रीं द्रौं सः शुक्राय नमः
- Saturn: ॐ प्रां प्रीं प्रौं सः शनैश्चराय नमः
- Rahu: ॐ भ्रां भ्रीं भ्रौं सः राहवे नमः
- Ketu: ॐ स्रां स्रीं स्रौं सः केतवे नमः

**Practice rules:** rudraksha mala, east-facing, fixed time daily, focus on meaning + sound. 40-day cycle (mandala) for serious sankalpa.

Share your chart to learn which planet's mantra serves you best.` };
    }

    if (has('saturn', 'shani', 'jupiter', 'guru', 'mars', 'mangal', 'venus', 'shukra', 'mercury', 'budh', 'sun', 'surya', 'moon', 'chandra', 'rahu', 'ketu', 'transit', 'gochar')) {
      return { matched: true, text: `**Current major planetary transits (gochar) and their themes:**

**Saturn (Shani):** moves through one sign for ~2.5 years. Brings karmic correction, slow growth, discipline. Sade-Sati phases (when Saturn transits 12th/1st/2nd from your natal Moon) reshape identity over 7.5 years. Not punishment — graduation.

**Jupiter (Guru):** ~1 year per sign. Expansive, dharmic. Transits over your Moon's 2nd/5th/7th/9th/11th = expansion, marriage, children, fortune. Over 6th/8th/12th = teaching through challenge.

**Rahu/Ketu:** ~18 months per sign, retrograde always. Eclipse points. Bring unexpected change, foreign elements, spiritual restlessness. Mahadasha 18y (Rahu) + 7y (Ketu) cycles.

**Mars (Mangal):** ~45 days per sign (retrograde ~2.5 months every 2 years). Activates conflict, surgery, real estate.

**Mercury, Venus, Sun:** ~30 days per sign. Mood + speech + finance + identity rhythms.

**Reading your transit:** map current planet positions to your **Moon sign** (Chandra Lagna) and **Lagna**. Most Indian classical Jyotish reads from Moon for emotional impact, Lagna for material outcome.

Share birth date + place + time — I will map your current Mahadasha + 3 most relevant gochar effects.` };
    }

    if (has('spiritual', 'spirituality', 'sadhana', 'moksha', 'enlightenment', 'meditation', 'anxiety', 'depression', 'mental', 'mind', 'peace', 'stress')) {
      return { matched: true, text: `**Spiritual practice + mental peace in Jyotish:**

**Houses:**
- **9th** (Dharma) — guru, faith, pilgrimage
- **12th** (Moksha) — liberation, meditation, isolation, sleep, dreams
- **5th** (Purva Punya) — past-life merit, devotion, mantra-siddhi
- **4th** (Hridaya) — inner peace, mother, emotional foundation

**Strong spiritual chart:** Jupiter or Ketu in 9th/12th, Moon-Jupiter conjunction, Saturn in 12th (renunciation), Ketu strong (detachment).

**For anxiety/depression (Moon affliction):**
- Moon-Saturn / Moon-Rahu conjunctions cause cyclical low mood
- Remedy: White flowers to Shiva, Chandra mantra **ॐ सोम सोमाय नमः** 108x Mondays
- Mahamrityunjaya Japa — proven for mental fear
- Pranayama (Anulom-Vilom + Bhramari) daily 20 min
- Avoid Tamasic food (stale, processed, leftover) — Moon is highly sensitive

**Spiritual sadhana suggestions by Moon sign:**
- Fire signs (Aries, Leo, Sagittarius): karma yoga, service
- Earth signs (Taurus, Virgo, Capricorn): ritual worship, mantra
- Air signs (Gemini, Libra, Aquarius): jnana yoga, study
- Water signs (Cancer, Scorpio, Pisces): bhakti yoga, kirtan

**Critical:** clinical depression needs medical care first. Astrology + sadhana complement, never replace, professional treatment.

Book **Mahamrityunjaya Japa** or **Chandra Shanti Puja** on Darshya for mental peace support.` };
    }

    return { matched: false, text: `Namaste 🙏

I am the Darshya AI Vedic Astrologer, grounded in authentic Parashari + Jaimini Jyotish traditions. I can guide you on:

**🪔 Life questions** — marriage, career, health, money, children, education, travel/foreign settlement
**🔭 Doshas** — Manglik, Sade-Sati, Kaal Sarp, Pitra Dosh, Kemadruma
**💎 Remedies** — Vedic mantras, gemstones (Navaratna), pujas, donations, fasts
**🌌 Planetary transits** — current gochar effects on your Moon sign and Lagna
**📿 Spiritual sadhana** — meditation, mantra-siddhi, paths by Moon sign

**For precise readings, share:**
- Date of birth (YYYY-MM-DD)
- Time of birth (HH:MM, 24-hour)
- Place of birth (city)

Without time + place, I can give general guidance only. With them, I compute your Lagna, Moon Rashi, Nakshatra, current Vimshottari Mahadasha, and dosha flags — then answer with chart-grounded specifics.

**Key principle from Bhagavad Gita 4.39:**
*श्रद्धावान् लभते ज्ञानम्* — "One who has faith attains wisdom."

Ask your question — what would you like to know?` };
  }
}

export const astrologyService = new AstrologyService();
