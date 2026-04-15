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
    overallRating: 4,
  },
];

// ─── Service Implementation ──────────────────────────────────────────────────────

class AstrologyService {
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
  startConsultation(
    userId: string,
    astrologerId: string,
    mode: 'chat' | 'call' | 'video'
  ): ConsultationSession | { error: string } {
    const astrologer = ASTROLOGERS.find((a) => a.id === astrologerId);
    if (!astrologer) return { error: 'Astrologer not found.' };
    if (!astrologer.isOnline) return { error: 'Astrologer is currently offline.' };
    if (astrologer.isBusy) return { error: 'Astrologer is currently busy with another consultation.' };

    return {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      astrologerId,
      astrologerName: astrologer.name,
      mode,
      status: 'waiting',
      perMinuteRate: astrologer.perMinuteRate,
      startedAt: new Date().toISOString(),
      freeMinutes: 5,
    };
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
}

export const astrologyService = new AstrologyService();
