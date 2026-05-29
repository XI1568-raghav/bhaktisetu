import { prisma } from '../lib/prisma.js';
import { cached, CACHE_TTL } from '../lib/cache.js';
import {
  julianDay,
  moonLongitudeSidereal,
  sunLongitudeSidereal,
  nakshatraFromLongitude,
} from '../lib/muhurat.js';

// ─── Dynamic Panchang Computation ──────────────────────────────────────────────
// Sidereal Lahiri-ayanamsa math via shared helpers in lib/muhurat. Matches
// drikpanchang convention used by mainstream Hindu panchangs in India.

const TITHIS = [
  'Shukla Pratipada', 'Shukla Dwitiya', 'Shukla Tritiya', 'Shukla Chaturthi', 'Shukla Panchami',
  'Shukla Shashthi', 'Shukla Saptami', 'Shukla Ashtami', 'Shukla Navami', 'Shukla Dashami',
  'Shukla Ekadashi', 'Shukla Dwadashi', 'Shukla Trayodashi', 'Shukla Chaturdashi', 'Purnima',
  'Krishna Pratipada', 'Krishna Dwitiya', 'Krishna Tritiya', 'Krishna Chaturthi', 'Krishna Panchami',
  'Krishna Shashthi', 'Krishna Saptami', 'Krishna Ashtami', 'Krishna Navami', 'Krishna Dashami',
  'Krishna Ekadashi', 'Krishna Dwadashi', 'Krishna Trayodashi', 'Krishna Chaturdashi', 'Amavasya',
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];

const YOGAS = [
  'Vishkumbha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda', 'Sukarma',
  'Dhriti', 'Shula', 'Ganda', 'Vriddhi', 'Dhruva', 'Vyaghata', 'Harshana', 'Vajra',
  'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva', 'Siddha', 'Sadhya',
  'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];

const KARANAS = [
  'Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti',
  'Shakuni', 'Chatushpada', 'Naga', 'Kimstughna',
];

// Rahu Kaal follows a fixed weekly pattern (for Delhi/North India, approximate)
// Sunday=0, Monday=1 ... Saturday=6
const RAHU_KAAL_BY_DAY: Record<number, string> = {
  0: '16:30 - 18:00', // Sunday
  1: '07:30 - 09:00', // Monday
  2: '15:00 - 16:30', // Tuesday
  3: '12:00 - 13:30', // Wednesday
  4: '13:30 - 15:00', // Thursday
  5: '10:30 - 12:00', // Friday
  6: '09:00 - 10:30', // Saturday
};

// Approximate sunrise/sunset by city and month (static lookup table)
const CITY_TIMES: Record<string, Record<number, { sunrise: string; sunset: string }>> = {
  Delhi: {
    1: { sunrise: '07:10', sunset: '17:33' }, 2: { sunrise: '06:53', sunset: '18:00' },
    3: { sunrise: '06:22', sunset: '18:22' }, 4: { sunrise: '05:52', sunset: '18:43' },
    5: { sunrise: '05:28', sunset: '19:04' }, 6: { sunrise: '05:22', sunset: '19:16' },
    7: { sunrise: '05:30', sunset: '19:14' }, 8: { sunrise: '05:45', sunset: '18:55' },
    9: { sunrise: '05:58', sunset: '18:24' }, 10: { sunrise: '06:12', sunset: '17:50' },
    11: { sunrise: '06:33', sunset: '17:26' }, 12: { sunrise: '06:57', sunset: '17:22' },
  },
  Mumbai: {
    1: { sunrise: '07:05', sunset: '18:11' }, 2: { sunrise: '06:57', sunset: '18:30' },
    3: { sunrise: '06:36', sunset: '18:42' }, 4: { sunrise: '06:13', sunset: '18:53' },
    5: { sunrise: '05:58', sunset: '19:06' }, 6: { sunrise: '05:56', sunset: '19:14' },
    7: { sunrise: '06:03', sunset: '19:13' }, 8: { sunrise: '06:12', sunset: '18:58' },
    9: { sunrise: '06:18', sunset: '18:34' }, 10: { sunrise: '06:23', sunset: '18:09' },
    11: { sunrise: '06:35', sunset: '17:53' }, 12: { sunrise: '06:55', sunset: '17:52' },
  },
  Varanasi: {
    1: { sunrise: '06:48', sunset: '17:22' }, 2: { sunrise: '06:32', sunset: '17:48' },
    3: { sunrise: '06:04', sunset: '18:08' }, 4: { sunrise: '05:34', sunset: '18:28' },
    5: { sunrise: '05:12', sunset: '18:47' }, 6: { sunrise: '05:08', sunset: '18:57' },
    7: { sunrise: '05:15', sunset: '18:55' }, 8: { sunrise: '05:28', sunset: '18:37' },
    9: { sunrise: '05:40', sunset: '18:08' }, 10: { sunrise: '05:52', sunset: '17:37' },
    11: { sunrise: '06:11', sunset: '17:15' }, 12: { sunrise: '06:35', sunset: '17:12' },
  },
  Jaipur: {
    1: { sunrise: '07:12', sunset: '17:40' }, 2: { sunrise: '06:55', sunset: '18:06' },
    3: { sunrise: '06:26', sunset: '18:27' }, 4: { sunrise: '05:56', sunset: '18:48' },
    5: { sunrise: '05:33', sunset: '19:08' }, 6: { sunrise: '05:28', sunset: '19:18' },
    7: { sunrise: '05:34', sunset: '19:17' }, 8: { sunrise: '05:48', sunset: '18:58' },
    9: { sunrise: '06:00', sunset: '18:28' }, 10: { sunrise: '06:14', sunset: '17:55' },
    11: { sunrise: '06:35', sunset: '17:32' }, 12: { sunrise: '06:58', sunset: '17:28' },
  },
  Chennai: {
    1: { sunrise: '06:27', sunset: '18:00' }, 2: { sunrise: '06:22', sunset: '18:15' },
    3: { sunrise: '06:08', sunset: '18:23' }, 4: { sunrise: '05:52', sunset: '18:28' },
    5: { sunrise: '05:42', sunset: '18:33' }, 6: { sunrise: '05:42', sunset: '18:38' },
    7: { sunrise: '05:48', sunset: '18:38' }, 8: { sunrise: '05:52', sunset: '18:27' },
    9: { sunrise: '05:52', sunset: '18:08' }, 10: { sunrise: '05:52', sunset: '17:48' },
    11: { sunrise: '06:02', sunset: '17:38' }, 12: { sunrise: '06:18', sunset: '17:40' },
  },
  Kolkata: {
    1: { sunrise: '06:18', sunset: '17:08' }, 2: { sunrise: '06:05', sunset: '17:33' },
    3: { sunrise: '05:40', sunset: '17:52' }, 4: { sunrise: '05:12', sunset: '18:12' },
    5: { sunrise: '04:52', sunset: '18:30' }, 6: { sunrise: '04:48', sunset: '18:38' },
    7: { sunrise: '04:55', sunset: '18:35' }, 8: { sunrise: '05:08', sunset: '18:17' },
    9: { sunrise: '05:18', sunset: '17:48' }, 10: { sunrise: '05:28', sunset: '17:17' },
    11: { sunrise: '05:48', sunset: '16:58' }, 12: { sunrise: '06:10', sunset: '16:55' },
  },
  Bangalore: {
    1: { sunrise: '06:40', sunset: '18:02' }, 2: { sunrise: '06:35', sunset: '18:18' },
    3: { sunrise: '06:19', sunset: '18:27' }, 4: { sunrise: '06:01', sunset: '18:33' },
    5: { sunrise: '05:50', sunset: '18:40' }, 6: { sunrise: '05:48', sunset: '18:46' },
    7: { sunrise: '05:54', sunset: '18:45' }, 8: { sunrise: '06:00', sunset: '18:33' },
    9: { sunrise: '06:03', sunset: '18:13' }, 10: { sunrise: '06:05', sunset: '17:52' },
    11: { sunrise: '06:15', sunset: '17:40' }, 12: { sunrise: '06:32', sunset: '17:42' },
  },
  Hyderabad: {
    1: { sunrise: '06:38', sunset: '17:52' }, 2: { sunrise: '06:30', sunset: '18:12' },
    3: { sunrise: '06:12', sunset: '18:26' }, 4: { sunrise: '05:52', sunset: '18:38' },
    5: { sunrise: '05:38', sunset: '18:48' }, 6: { sunrise: '05:36', sunset: '18:55' },
    7: { sunrise: '05:42', sunset: '18:52' }, 8: { sunrise: '05:50', sunset: '18:38' },
    9: { sunrise: '05:55', sunset: '18:15' }, 10: { sunrise: '06:00', sunset: '17:48' },
    11: { sunrise: '06:12', sunset: '17:32' }, 12: { sunrise: '06:32', sunset: '17:32' },
  },
  Ujjain: {
    1: { sunrise: '07:02', sunset: '17:48' }, 2: { sunrise: '06:46', sunset: '18:12' },
    3: { sunrise: '06:18', sunset: '18:32' }, 4: { sunrise: '05:48', sunset: '18:52' },
    5: { sunrise: '05:28', sunset: '19:10' }, 6: { sunrise: '05:24', sunset: '19:18' },
    7: { sunrise: '05:30', sunset: '19:16' }, 8: { sunrise: '05:42', sunset: '18:58' },
    9: { sunrise: '05:55', sunset: '18:28' }, 10: { sunrise: '06:08', sunset: '17:58' },
    11: { sunrise: '06:28', sunset: '17:35' }, 12: { sunrise: '06:50', sunset: '17:32' },
  },
  Pune: {
    1: { sunrise: '07:02', sunset: '18:08' }, 2: { sunrise: '06:52', sunset: '18:28' },
    3: { sunrise: '06:30', sunset: '18:40' }, 4: { sunrise: '06:08', sunset: '18:52' },
    5: { sunrise: '05:52', sunset: '19:04' }, 6: { sunrise: '05:50', sunset: '19:12' },
    7: { sunrise: '05:58', sunset: '19:10' }, 8: { sunrise: '06:08', sunset: '18:55' },
    9: { sunrise: '06:15', sunset: '18:32' }, 10: { sunrise: '06:20', sunset: '18:06' },
    11: { sunrise: '06:32', sunset: '17:50' }, 12: { sunrise: '06:52', sunset: '17:50' },
  },
};

// Major Hindu festivals 2025-2026 with real dates (Vikram Samvat 2082-2083)
const FESTIVALS_DB: Array<{
  date: string; // YYYY-MM-DD
  festivals: string[];
  vrat: string[];
  specialInfo: string;
}> = [
  // ── 2025 ──
  { date: '2025-01-14', festivals: ['Makar Sankranti', 'Pongal'], vrat: [], specialInfo: 'Sun enters Capricorn. Kite flying, til-gur distribution. Start of Uttarayan.' },
  { date: '2025-02-12', festivals: ['Maha Shivaratri'], vrat: ['Maha Shivaratri Vrat'], specialInfo: 'The great night of Lord Shiva. All-night jaagran. Rudrabhishek with milk, bel patra recommended.' },
  { date: '2025-02-26', festivals: ['Vasant Panchami', 'Saraswati Puja'], vrat: [], specialInfo: 'Worship of Goddess Saraswati. Yellow color auspicious. Beginning of spring season.' },
  { date: '2025-03-14', festivals: ['Holi'], vrat: [], specialInfo: 'Festival of colors. Holika Dahan on the eve. Celebrate with natural colors and sweets.' },
  { date: '2025-03-30', festivals: ['Gudi Padwa', 'Ugadi', 'Nav Samvat'], vrat: [], specialInfo: 'Hindu New Year (Vikram Samvat 2082). Auspicious for new beginnings.' },
  { date: '2025-04-02', festivals: ['Ram Navami'], vrat: ['Ram Navami Vrat'], specialInfo: 'Birth of Lord Rama. Ayodhya Ram Mandir special celebrations.' },
  { date: '2025-04-06', festivals: ['Mahavir Jayanti'], vrat: [], specialInfo: 'Birth of Lord Mahavira, 24th Tirthankara of Jainism.' },
  { date: '2025-04-10', festivals: ['Hanuman Jayanti'], vrat: ['Hanuman Jayanti Vrat'], specialInfo: 'Birth of Lord Hanuman. Sunderkand path and Hanuman Chalisa recitation recommended.' },
  { date: '2025-04-13', festivals: ['Baisakhi'], vrat: [], specialInfo: 'Sikh new year. Harvest festival of Punjab. Nagar kirtan and langars.' },
  { date: '2025-05-12', festivals: ['Buddha Purnima', 'Vesak'], vrat: [], specialInfo: 'Birth, enlightenment and death of Lord Buddha.' },
  { date: '2025-06-27', festivals: ['Rath Yatra'], vrat: [], specialInfo: 'Chariot festival of Lord Jagannath at Puri. Grand procession.' },
  { date: '2025-07-06', festivals: ['Guru Purnima'], vrat: [], specialInfo: 'Veneration of gurus and teachers. Day of Vyasa.' },
  { date: '2025-08-09', festivals: ['Nag Panchami'], vrat: ['Nag Panchami Vrat'], specialInfo: 'Worship of serpent deities. Milk offerings to Nag Devta.' },
  { date: '2025-08-16', festivals: ['Raksha Bandhan'], vrat: [], specialInfo: 'Festival of brother-sister bond. Tying of rakhi.' },
  { date: '2025-08-17', festivals: ['Kajari Teej'], vrat: ['Teej Vrat'], specialInfo: 'Women observe fast for husband\'s long life. Swing festivals.' },
  { date: '2025-08-27', festivals: ['Janmashtami'], vrat: ['Janmashtami Vrat'], specialInfo: 'Birth of Lord Krishna at midnight. Dahi Handi, jhula decoration.' },
  { date: '2025-09-05', festivals: ['Ganesh Chaturthi'], vrat: [], specialInfo: 'Installation of Ganesh idols. 10-day festival begins. Modak offerings.' },
  { date: '2025-10-02', festivals: ['Navratri Begins', 'Shardiya Navratri'], vrat: ['Navratri Vrat'], specialInfo: 'Nine nights of Goddess Durga worship begin. Ghatasthapana.' },
  { date: '2025-10-10', festivals: ['Maha Navami', 'Durga Navami'], vrat: [], specialInfo: 'Ninth day of Navratri. Maha Ashtami puja and Kanya pujan.' },
  { date: '2025-10-11', festivals: ['Dussehra', 'Vijayadashami'], vrat: [], specialInfo: 'Victory of good over evil. Ravana Dahan. Weapons puja.' },
  { date: '2025-10-20', festivals: ['Karva Chauth'], vrat: ['Karva Chauth Vrat'], specialInfo: 'Married women fast for husband\'s longevity. Moon sighting ritual.' },
  { date: '2025-10-29', festivals: ['Dhanteras'], vrat: [], specialInfo: 'Worship of Lord Dhanvantari. Auspicious for buying gold and utensils.' },
  { date: '2025-10-31', festivals: ['Diwali', 'Lakshmi Puja'], vrat: [], specialInfo: 'Festival of lights. Lakshmi-Ganesh puja. New year for merchants.' },
  { date: '2025-11-01', festivals: ['Govardhan Puja', 'Annakut'], vrat: [], specialInfo: 'Lord Krishna lifted Govardhan mountain. 56 bhog offering.' },
  { date: '2025-11-03', festivals: ['Bhai Dooj'], vrat: [], specialInfo: 'Brother-sister celebration. Tilak ceremony.' },
  { date: '2025-11-05', festivals: ['Chhath Puja'], vrat: ['Chhath Vrat'], specialInfo: 'Sun God worship. Rigorous fast with Surya Arghya at sunrise and sunset.' },
  { date: '2025-12-25', festivals: ['Christmas'], vrat: [], specialInfo: 'Celebration of the birth of Jesus Christ.' },

  // ── 2026 ──
  { date: '2026-01-14', festivals: ['Makar Sankranti', 'Pongal'], vrat: [], specialInfo: 'Sun enters Capricorn. Kite flying, til-gur distribution. Start of Uttarayan.' },
  { date: '2026-01-26', festivals: ['Republic Day', 'Basant Panchami', 'Saraswati Puja'], vrat: [], specialInfo: 'Worship Goddess Saraswati. Wear yellow. Republic Day parade.' },
  { date: '2026-02-15', festivals: ['Maha Shivaratri'], vrat: ['Maha Shivaratri Vrat'], specialInfo: 'The great night of Lord Shiva. Rudrabhishek, all-night jaagran and meditation.' },
  { date: '2026-03-04', festivals: ['Holika Dahan'], vrat: [], specialInfo: 'Burning of Holika. Signifies triumph of devotion over evil.' },
  { date: '2026-03-05', festivals: ['Holi'], vrat: [], specialInfo: 'Festival of colors celebrating spring. Mathura-Vrindavan Lathmar Holi.' },
  { date: '2026-03-19', festivals: ['Gudi Padwa', 'Ugadi', 'Nav Samvat'], vrat: [], specialInfo: 'Hindu New Year (Vikram Samvat 2083). Auspicious beginnings. Neem-jaggery consumption.' },
  { date: '2026-03-22', festivals: ['Ram Navami'], vrat: ['Ram Navami Vrat'], specialInfo: 'Birthday of Lord Rama. Ayodhya celebrations. Ram Lalla special darshan.' },
  { date: '2026-03-25', festivals: ['Mahavir Jayanti'], vrat: [], specialInfo: 'Birth anniversary of Lord Mahavira.' },
  { date: '2026-03-31', festivals: ['Hanuman Jayanti'], vrat: ['Hanuman Jayanti Vrat'], specialInfo: 'Birth of Lord Hanuman. Sunderkand path and temple visits recommended.' },
  { date: '2026-04-14', festivals: ['Baisakhi', 'Tamil New Year'], vrat: [], specialInfo: 'Sikh new year. Harvest festival. Tamil Puthandu.' },
  { date: '2026-04-24', festivals: ['Akshaya Tritiya'], vrat: [], specialInfo: 'One of the most auspicious days. Gold buying, new ventures, charity. Char Dham Yatra gates open.' },
  { date: '2026-05-01', festivals: ['Buddha Purnima', 'Vesak'], vrat: [], specialInfo: 'Triple sacred event — birth, enlightenment and Mahaparinirvana of Buddha.' },
  { date: '2026-05-14', festivals: ['Vat Savitri Purnima'], vrat: ['Vat Savitri Vrat'], specialInfo: 'Married women fast and worship the banyan tree for husband\'s longevity.' },
  { date: '2026-06-15', festivals: ['Rath Yatra'], vrat: [], specialInfo: 'Annual chariot festival of Lord Jagannath at Puri, Odisha.' },
  { date: '2026-06-24', festivals: ['Guru Purnima'], vrat: [], specialInfo: 'Day dedicated to spiritual and academic gurus. Vyasa Purnima.' },
  { date: '2026-07-29', festivals: ['Nag Panchami'], vrat: ['Nag Panchami Vrat'], specialInfo: 'Worship of serpent deities for protection and progeny.' },
  { date: '2026-08-05', festivals: ['Raksha Bandhan'], vrat: [], specialInfo: 'Festival of brother-sister bond. Rakhi tying and sweets.' },
  { date: '2026-08-14', festivals: ['Janmashtami'], vrat: ['Janmashtami Vrat'], specialInfo: 'Birth of Lord Krishna at midnight. Dahi handi, jhula, and abhishek.' },
  { date: '2026-08-25', festivals: ['Ganesh Chaturthi'], vrat: [], specialInfo: 'Ganpati Bappa Morya! 10-day Ganesh festival begins. Modak and laddoo offerings.' },
  { date: '2026-09-20', festivals: ['Navratri Begins'], vrat: ['Navratri Vrat'], specialInfo: 'Shardiya Navratri begins. Nine nights of Maa Durga worship.' },
  { date: '2026-09-28', festivals: ['Maha Navami'], vrat: [], specialInfo: 'Ninth day of Navratri. Kanya pujan and Maha Ashtami celebrations.' },
  { date: '2026-09-29', festivals: ['Dussehra', 'Vijayadashami'], vrat: [], specialInfo: 'Victory of Lord Rama over Ravana. Effigy burning celebrations.' },
  { date: '2026-10-09', festivals: ['Karva Chauth'], vrat: ['Karva Chauth Vrat'], specialInfo: 'Married women observe nirjala fast for husband\'s long life.' },
  { date: '2026-10-17', festivals: ['Dhanteras'], vrat: [], specialInfo: 'Day of wealth. Gold and silver buying auspicious. Dhanvantari puja.' },
  { date: '2026-10-19', festivals: ['Diwali', 'Lakshmi Puja'], vrat: [], specialInfo: 'Festival of lights. Lakshmi-Ganesh puja. New year of merchants (Vikram Samvat 2084).' },
  { date: '2026-10-20', festivals: ['Govardhan Puja', 'Annakut'], vrat: [], specialInfo: 'Lord Krishna lifted Govardhan. 56 bhog offering to deities.' },
  { date: '2026-10-22', festivals: ['Bhai Dooj'], vrat: [], specialInfo: 'Brother-sister festival. Tilak and sweet exchange.' },
  { date: '2026-10-24', festivals: ['Chhath Puja'], vrat: ['Chhath Vrat'], specialInfo: 'Four-day Surya worship. Rigorous fasting and Arghya.' },
  { date: '2026-12-25', festivals: ['Christmas'], vrat: [], specialInfo: 'Celebration of the birth of Jesus Christ.' },
];

// Evaluate sidereal longitudes at IST sunrise (~06:00 IST = 00:30 UTC) so the
// tithi/nakshatra reflect the day's prevailing limb at the standard panchang
// reference moment, not midnight UTC.
function jdAtIstSunrise(date: Date): number {
  const utcRef = new Date(Date.UTC(
    date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 30, 0,
  ));
  return julianDay(utcRef);
}

function computeTithiIndex(date: Date): number {
  const jd = jdAtIstSunrise(date);
  let elong = moonLongitudeSidereal(jd) - sunLongitudeSidereal(jd);
  elong = ((elong % 360) + 360) % 360;
  return Math.floor(elong / 12) % 30;
}

function computeNakshatraIndex(date: Date): number {
  const jd = jdAtIstSunrise(date);
  return nakshatraFromLongitude(moonLongitudeSidereal(jd)).index;
}

function computeYogaIndex(date: Date): number {
  const jd = jdAtIstSunrise(date);
  const sum = ((moonLongitudeSidereal(jd) + sunLongitudeSidereal(jd)) % 360 + 360) % 360;
  return Math.floor(sum / (360 / 27)) % 27;
}

// Karana sequence (drikpanchang convention).
// Karanas 1..56 cycle through Bava..Vishti (the seven movable karanas, 8x repeating).
// Karanas 57..60 are the four fixed karanas: Shakuni, Chatushpada, Naga, Kimstughna.
// Karana index 0..10 maps into KARANAS array: 0..6 movable, 7..10 fixed.
const MOVABLE_KARANA_INDICES = [0, 1, 2, 3, 4, 5, 6]; // Bava..Vishti
const FIXED_KARANA_INDICES = [7, 8, 9, 10]; // Shakuni, Chatushpada, Naga, Kimstughna

function computeKaranaIndex(date: Date): number {
  const jd = jdAtIstSunrise(date);
  let elong = moonLongitudeSidereal(jd) - sunLongitudeSidereal(jd);
  elong = ((elong % 360) + 360) % 360;
  // 60 karanas per lunar month, two per tithi (each spans 6°).
  const karanaNum = Math.floor(elong / 6); // 0..59
  // First karana of month (karanaNum===0) = Kimstughna (fixed, after Amavasya start).
  // The four fixed karanas occupy positions 0, 57, 58, 59.
  // Drikpanchang convention: Kimstughna first half of Shukla Pratipada,
  // then Bava..Vishti repeat 8 times, then Shakuni, Chatushpada, Naga at end.
  if (karanaNum === 0) return FIXED_KARANA_INDICES[3]!; // Kimstughna
  if (karanaNum === 57) return FIXED_KARANA_INDICES[0]!; // Shakuni
  if (karanaNum === 58) return FIXED_KARANA_INDICES[1]!; // Chatushpada
  if (karanaNum === 59) return FIXED_KARANA_INDICES[2]!; // Naga
  // Positions 1..56 cycle through the 7 movable karanas.
  return MOVABLE_KARANA_INDICES[(karanaNum - 1) % 7]!;
}

// Rahu Kaal segment per weekday — which of the 8 equal day-segments
// (sunrise to sunset divided by 8) is ruled by Rahu. Standard table.
// Sunday=0 → 8th, Monday=1 → 2nd, Tuesday=2 → 7th, Wednesday=3 → 5th,
// Thursday=4 → 6th, Friday=5 → 4th, Saturday=6 → 3rd.
const RAHU_KAAL_SEGMENT: Record<number, number> = {
  0: 7, 1: 1, 2: 6, 3: 4, 4: 5, 5: 3, 6: 2,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function minsToHHMM(m: number): string {
  const h = Math.floor(m / 60) % 24;
  const mm = Math.floor(m % 60);
  return `${pad2(h)}:${pad2(mm)}`;
}

function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

function computeRahuKaal(sunrise: string, sunset: string, dayOfWeek: number): string {
  const sr = parseHHMM(sunrise);
  const ss = parseHHMM(sunset);
  const segLen = (ss - sr) / 8;
  const segIdx = RAHU_KAAL_SEGMENT[dayOfWeek] ?? 0;
  const start = sr + segLen * segIdx;
  const end = start + segLen;
  return `${minsToHHMM(start)} - ${minsToHHMM(end)}`;
}

/**
 * Get sunrise/sunset for a city and month.
 */
function getSunTimes(city: string, month: number): { sunrise: string; sunset: string } {
  const normalized = Object.keys(CITY_TIMES).find(
    (k) => k.toLowerCase() === city.toLowerCase()
  );
  const cityData = normalized ? CITY_TIMES[normalized] : CITY_TIMES['Delhi'];
  return cityData![month] ?? cityData![1]!;
}

/**
 * Get festivals for a specific date from the hardcoded database.
 */
function getFestivalsForDate(date: Date): { festivals: string[]; vrat: string[]; specialInfo: string | null } {
  const dateStr = date.toISOString().split('T')[0];
  const entry = FESTIVALS_DB.find((f) => f.date === dateStr);
  if (entry) {
    return { festivals: entry.festivals, vrat: entry.vrat, specialInfo: entry.specialInfo };
  }
  return { festivals: [], vrat: [], specialInfo: null };
}

/**
 * Get special vrat info based on tithi.
 */
function getVratFromTithi(tithiName: string, dayOfWeek: number): { vrat: string[]; info: string | null } {
  const vrats: string[] = [];
  let info: string | null = null;

  if (tithiName.includes('Ekadashi')) {
    vrats.push('Ekadashi Vrat');
    info = tithiName.includes('Shukla')
      ? 'Shukla Ekadashi — auspicious fasting day dedicated to Lord Vishnu. Break fast after sunrise next day.'
      : 'Krishna Ekadashi — observe fast for spiritual purification and Lord Vishnu\'s blessings.';
  }
  if (tithiName === 'Purnima') {
    vrats.push('Purnima Vrat');
    info = 'Purnima (full moon day) — auspicious for Satyanarayan Katha, charity, and spiritual practices.';
  }
  if (tithiName === 'Amavasya') {
    vrats.push('Amavasya Tarpan');
    info = 'Amavasya (new moon day) — perform Pitru Tarpan. Avoid starting new ventures. Good for meditation.';
  }
  if (tithiName.includes('Chaturthi') && tithiName.includes('Krishna')) {
    vrats.push('Sankashti Chaturthi Vrat');
    info = 'Sankashti Chaturthi — fast for Lord Ganesha. Break fast after moonrise with modak offerings.';
  }
  if (dayOfWeek === 1) { // Monday
    info = (info ? info + ' ' : '') + 'Monday — Lord Shiva\'s day. Shiva puja and Rudrabhishek recommended.';
  }
  if (dayOfWeek === 2) { // Tuesday
    info = (info ? info + ' ' : '') + 'Tuesday — Hanuman and Mangal\'s day. Hanuman Chalisa path recommended.';
  }
  if (dayOfWeek === 4) { // Thursday
    info = (info ? info + ' ' : '') + 'Thursday — Guru\'s day. Satyanarayan Katha and yellow color auspicious.';
  }
  if (dayOfWeek === 6) { // Saturday
    info = (info ? info + ' ' : '') + 'Saturday — Shani Dev\'s day. Sesame oil and black sesame donations recommended.';
  }

  return { vrat: vrats, info };
}

/**
 * Compute a complete panchang for any date dynamically.
 */
export function computePanchang(date: Date, city: string = 'Delhi') {
  const tithiIdx = computeTithiIndex(date);
  const nakshatraIdx = computeNakshatraIndex(date);
  const yogaIdx = computeYogaIndex(date);
  const karanaIdx = computeKaranaIndex(date);
  const dayOfWeek = date.getDay();
  const month = date.getMonth() + 1;

  const tithiName = TITHIS[tithiIdx]!;
  const nakshatraName = NAKSHATRAS[nakshatraIdx]!;
  const yogaName = YOGAS[yogaIdx]!;
  const karanaName = KARANAS[karanaIdx]!;

  const sunTimes = getSunTimes(city, month);
  // Rahu Kaal = the Rahu-ruled octant of (sunset - sunrise) per weekday.
  // Replaces the prior static-per-weekday string which was off by up to 90 min
  // city-to-city and ignored seasonal day-length variation.
  const rahuKaal = computeRahuKaal(sunTimes.sunrise, sunTimes.sunset, dayOfWeek);

  // Festival lookup
  const festivalInfo = getFestivalsForDate(date);
  const vratInfo = getVratFromTithi(tithiName, dayOfWeek);

  // Merge vrat info
  const allVrat = [...new Set([...festivalInfo.vrat, ...vratInfo.vrat])];
  const specialInfo = [festivalInfo.specialInfo, vratInfo.info].filter(Boolean).join(' ') || null;

  // Muhurat windows computed from sunrise/sunset in minutes-of-day. Prior
  // naive hour arithmetic overflowed (e.g. sunriseMin+12 → "05:73") and
  // ignored day-length variation. Now derived per drikpanchang convention:
  // Brahma = 1h36m to 0h48m before sunrise; Abhijit = midday ± 24m;
  // Vijay = ~7th muhurta of the day (afternoon, 48-min duration).
  const srMin = parseHHMM(sunTimes.sunrise);
  const ssMin = parseHHMM(sunTimes.sunset);
  const dayLen = ssMin - srMin;
  const midday = (srMin + ssMin) / 2;
  const brahmaMuhurtaStart = minsToHHMM(srMin - 96);
  const brahmaMuhurtaEnd = minsToHHMM(srMin - 48);
  const abhijitStart = minsToHHMM(midday - 24);
  const abhijitEnd = minsToHHMM(midday + 24);
  // Vijay muhurat = 11th muhurta (each muhurta = dayLen/15) from sunrise.
  const muhurtaUnit = dayLen / 15;
  const vijayStart = minsToHHMM(srMin + muhurtaUnit * 10);
  const vijayEnd = minsToHHMM(srMin + muhurtaUnit * 11);

  return {
    id: `computed-${date.toISOString().split('T')[0]}-${city.toLowerCase()}`,
    date: date,
    tithi: tithiName,
    nakshatra: nakshatraName,
    yoga: yogaName,
    karana: karanaName,
    sunrise: sunTimes.sunrise,
    sunset: sunTimes.sunset,
    rahuKaal: rahuKaal,
    shubhMuhurat: {
      brahmaMuhurta: `${brahmaMuhurtaStart} - ${brahmaMuhurtaEnd}`,
      abhijitMuhurat: `${abhijitStart} - ${abhijitEnd}`,
      vijayMuhurat: `${vijayStart} - ${vijayEnd}`,
    },
    festivals: festivalInfo.festivals,
    vrat: allVrat,
    specialInfo: specialInfo,
    locationCity: city,
    computed: true,
  };
}

// ─── Panchang Service ──────────────────────────────────────────────────────────

export class PanchangService {
  /**
   * Get today's panchang data.
   * Falls back to dynamic computation if DB has no data.
   */
  async getToday(city?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cacheKey = `panchang:today:${today.toISOString().slice(0, 10)}:${city ?? 'default'}`;

    return cached(cacheKey, CACHE_TTL.PANCHANG_DAY, async () => {
      const panchang = await prisma.dailyPanchang.findFirst({
        where: {
          date: today,
          ...(city ? { locationCity: { equals: city, mode: 'insensitive' as const } } : {}),
        },
      });

      if (panchang) {
        return panchang;
      }

      // Fallback: try closest DB date
      const closest = await prisma.dailyPanchang.findFirst({
        where: city
          ? { locationCity: { equals: city, mode: 'insensitive' as const } }
          : {},
        orderBy: { date: 'desc' },
      });

      // If DB is empty or closest > 2 days old, recompute from sidereal math.
      // Prior 7-day window silently served stale data; new flag lets UI warn.
      if (!closest || Math.abs(today.getTime() - closest.date.getTime()) > 2 * 24 * 60 * 60 * 1000) {
        return computePanchang(today, city ?? 'Delhi');
      }

      return { ...closest, stale: true, note: 'Showing most recent available panchang data.' };
    });
  }

  /**
   * Get panchang for a specific date.
   * Falls back to dynamic computation if DB has no data.
   */
  async getByDate(dateStr: string, city?: string) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    if (isNaN(date.getTime())) {
      return null;
    }

    const cacheKey = `panchang:date:${date.toISOString().slice(0, 10)}:${city ?? 'default'}`;
    return cached(cacheKey, CACHE_TTL.PANCHANG_DAY, async () => {
      const panchang = await prisma.dailyPanchang.findFirst({
        where: {
          date,
          ...(city ? { locationCity: { equals: city, mode: 'insensitive' as const } } : {}),
        },
      });

      if (panchang) {
        return panchang;
      }

      // Dynamic fallback — always return computed data rather than null
      return computePanchang(date, city ?? 'Delhi');
    });
  }

  /**
   * Get upcoming festivals in the next N days.
   * Uses DB data + hardcoded festival calendar for comprehensive coverage.
   */
  async getUpcomingFestivals(days: number = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // Get from DB
    const panchangEntries = await prisma.dailyPanchang.findMany({
      where: {
        date: { gte: today, lte: endDate },
        festivals: { isEmpty: false },
      },
      orderBy: { date: 'asc' },
    });

    const festivals: Array<{
      date: Date;
      festival: string;
      tithi: string;
      nakshatra: string;
      specialInfo: string | null;
    }> = [];

    const addedDates = new Set<string>();

    for (const entry of panchangEntries) {
      for (const festival of entry.festivals) {
        const key = `${entry.date.toISOString().split('T')[0]}-${festival}`;
        if (!addedDates.has(key)) {
          festivals.push({
            date: entry.date,
            festival,
            tithi: entry.tithi,
            nakshatra: entry.nakshatra,
            specialInfo: entry.specialInfo,
          });
          addedDates.add(key);
        }
      }
    }

    // Also scan hardcoded festivals for dates not covered by DB
    const todayStr = today.toISOString().split('T')[0]!;
    const endDateStr = endDate.toISOString().split('T')[0]!;

    for (const f of FESTIVALS_DB) {
      if (f.date >= todayStr && f.date <= endDateStr && f.festivals.length > 0) {
        for (const festName of f.festivals) {
          const key = `${f.date}-${festName}`;
          if (!addedDates.has(key)) {
            const festDate = new Date(f.date);
            const computed = computePanchang(festDate);
            festivals.push({
              date: festDate,
              festival: festName,
              tithi: computed.tithi,
              nakshatra: computed.nakshatra,
              specialInfo: f.specialInfo,
            });
            addedDates.add(key);
          }
        }
      }
    }

    // Sort by date
    festivals.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      festivals,
      startDate: today.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      total: festivals.length,
    };
  }

  /**
   * Get upcoming vrat (fasting) days in the next N days.
   */
  async getUpcomingVrats(days: number = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    // Get from DB
    const panchangEntries = await prisma.dailyPanchang.findMany({
      where: {
        date: { gte: today, lte: endDate },
        vrat: { isEmpty: false },
      },
      orderBy: { date: 'asc' },
    });

    const vrats: Array<{
      date: Date;
      vrat: string;
      tithi: string;
      nakshatra: string;
      specialInfo: string | null;
    }> = [];

    const addedDates = new Set<string>();

    for (const entry of panchangEntries) {
      for (const v of entry.vrat) {
        const key = `${entry.date.toISOString().split('T')[0]}-${v}`;
        if (!addedDates.has(key)) {
          vrats.push({
            date: entry.date,
            vrat: v,
            tithi: entry.tithi,
            nakshatra: entry.nakshatra,
            specialInfo: entry.specialInfo,
          });
          addedDates.add(key);
        }
      }
    }

    // Also compute dynamic vrats for uncovered days (Ekadashi, Amavasya, Purnima, etc.)
    for (let d = new Date(today); d <= endDate; d.setDate(d.getDate() + 1)) {
      const computed = computePanchang(new Date(d));
      if (computed.vrat.length > 0) {
        for (const v of computed.vrat) {
          const key = `${d.toISOString().split('T')[0]}-${v}`;
          if (!addedDates.has(key)) {
            vrats.push({
              date: new Date(d),
              vrat: v,
              tithi: computed.tithi,
              nakshatra: computed.nakshatra,
              specialInfo: computed.specialInfo,
            });
            addedDates.add(key);
          }
        }
      }
    }

    // Sort by date
    vrats.sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      vrats,
      total: vrats.length,
    };
  }

  /**
   * Get panchang entries for a date range.
   * Fills gaps with dynamically computed data.
   */
  async getRange(startDate: string, endDate: string, city?: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    // Get DB entries
    const dbEntries = await prisma.dailyPanchang.findMany({
      where: {
        date: { gte: start, lte: end },
        ...(city ? { locationCity: { equals: city, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { date: 'asc' },
    });

    const dbDateSet = new Set(dbEntries.map((e) => e.date.toISOString().split('T')[0]));

    // Fill gaps with computed data. allEntries is a union of DB rows
    // and dynamically-computed objects (which carry an extra `computed: true`
    // marker). Callers don't distinguish by Prisma metadata, so widen here.
    type ComputedPanchang = ReturnType<typeof computePanchang>;
    const allEntries: Array<typeof dbEntries[number] | ComputedPanchang> = [...dbEntries];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]!;
      if (!dbDateSet.has(dateStr)) {
        allEntries.push(computePanchang(new Date(d), city ?? 'Delhi'));
      }
    }

    allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return allEntries;
  }
}

export const panchangService = new PanchangService();
