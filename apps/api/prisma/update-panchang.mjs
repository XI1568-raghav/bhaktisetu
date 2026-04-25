/**
 * Generates / refreshes panchang entries for the next 90 days starting today,
 * so the /panchang page never shows stale data during a demo. Uses
 * deterministic placeholder values cycled through the canonical Hindu lunar
 * calendar terms.
 *
 * Real panchang requires astronomical computation per date. For a demo, this
 * keeps the page feeling alive; replace with a real ephemeris later.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TITHIS = [
  'Shukla Pratipada', 'Shukla Dwitiya', 'Shukla Tritiya', 'Shukla Chaturthi',
  'Shukla Panchami', 'Shukla Shashthi', 'Shukla Saptami', 'Shukla Ashtami',
  'Shukla Navami', 'Shukla Dashami', 'Shukla Ekadashi', 'Shukla Dwadashi',
  'Shukla Trayodashi', 'Shukla Chaturdashi', 'Purnima',
  'Krishna Pratipada', 'Krishna Dwitiya', 'Krishna Tritiya', 'Krishna Chaturthi',
  'Krishna Panchami', 'Krishna Shashthi', 'Krishna Saptami', 'Krishna Ashtami',
  'Krishna Navami', 'Krishna Dashami', 'Krishna Ekadashi', 'Krishna Dwadashi',
  'Krishna Trayodashi', 'Krishna Chaturdashi', 'Amavasya',
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu',
  'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta',
  'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha', 'Mula', 'Purva Ashadha',
  'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha', 'Purva Bhadrapada',
  'Uttara Bhadrapada', 'Revati',
];

const YOGAS = [
  'Vishkambha', 'Priti', 'Ayushman', 'Saubhagya', 'Shobhana', 'Atiganda',
  'Sukarma', 'Dhriti', 'Shoola', 'Ganda', 'Vridhi', 'Dhruva', 'Vyaghata',
  'Harshana', 'Vajra', 'Siddhi', 'Vyatipata', 'Variyan', 'Parigha', 'Shiva',
  'Siddha', 'Sadhya', 'Shubha', 'Shukla', 'Brahma', 'Indra', 'Vaidhriti',
];

const KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Garaja', 'Vanija', 'Vishti'];

function pad(n) { return n < 10 ? `0${n}` : `${n}`; }

function dayDelta(base, offset) {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + offset);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const today = new Date();
today.setUTCHours(0, 0, 0, 0);

const SPECIAL_INFOS = [
  'A balanced day for daily worship and meditation.',
  'Auspicious for starting new ventures and learning.',
  'Favorable for charity and seva.',
  'Best for spiritual practices and reading scripture.',
  'Good day for family gatherings and devotional singing.',
  'Suitable for vrat and fasting.',
  'Excellent for visiting temples and seeking blessings.',
];

let upserted = 0;
for (let offset = 0; offset < 90; offset += 1) {
  const date = dayDelta(today, offset);
  const tithi = TITHIS[offset % TITHIS.length];
  const nakshatra = NAKSHATRAS[offset % NAKSHATRAS.length];
  const yoga = YOGAS[offset % YOGAS.length];
  const karana = KARANAS[offset % KARANAS.length];
  const specialInfo = SPECIAL_INFOS[offset % SPECIAL_INFOS.length];

  const sunriseMin = 348 - Math.round(offset * 0.4); // ~5:48am drifting earlier toward summer
  const sunsetMin = 1124 + Math.round(offset * 0.3); // ~6:44pm drifting later
  const sunrise = `${pad(Math.floor(sunriseMin / 60))}:${pad(sunriseMin % 60)}`;
  const sunset = `${pad(Math.floor(sunsetMin / 60))}:${pad(sunsetMin % 60)}`;

  await prisma.dailyPanchang.upsert({
    where: { date },
    update: {
      tithi, nakshatra, yoga, karana,
      sunrise, sunset,
      rahuKaal: '15:11 - 16:44',
      shubhMuhurat: {
        abhijitMuhurat: '11:54 - 12:45',
        brahmaMuhurta: '04:22 - 05:10',
        vijayMuhurat: '14:26 - 15:17',
      },
      festivals: [],
      vrat: [],
      specialInfo,
      locationCity: 'Delhi',
    },
    create: {
      date,
      tithi, nakshatra, yoga, karana,
      sunrise, sunset,
      rahuKaal: '15:11 - 16:44',
      shubhMuhurat: {
        abhijitMuhurat: '11:54 - 12:45',
        brahmaMuhurta: '04:22 - 05:10',
        vijayMuhurat: '14:26 - 15:17',
      },
      festivals: [],
      vrat: [],
      specialInfo,
      locationCity: 'Delhi',
    },
  });
  upserted += 1;
}

console.log(`Upserted ${upserted} panchang days starting ${today.toISOString().slice(0, 10)}.`);
await prisma.$disconnect();
