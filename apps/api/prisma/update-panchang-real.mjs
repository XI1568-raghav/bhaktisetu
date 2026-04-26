/**
 * Loads 90 days of accurate panchang data (computed via mhah-panchang,
 * cross-verified against drikpanchang.com) into the production DB.
 *
 * Replaces the previous placeholder data that used cycled tithi/nakshatra
 * arrays without astronomical accuracy.
 *
 * Usage: cd apps/api && node prisma/update-panchang-real.mjs
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(here, 'panchang-90.json'), 'utf8'));

// Romanization fixups: mhah-panchang uses some non-standard spellings;
// align them with the canonical Vedic forms users expect.
const TITHI_FIXUPS = {
  'Dasami': 'Dashami',
  'Ekadasi': 'Ekadashi',
  'Dvadasi': 'Dwadashi',
  'Saptami': 'Saptami',
};
const YOGA_FIXUPS = {
  'Vridhi': 'Vriddhi',
  'Vyatipata': 'Vyatipata',
};
const KARANA_FIXUPS = {
  'Taitula': 'Taitila',
};

function normalize(value, fixups) {
  if (!value) return value;
  // Replace any token that has a fixup
  let out = value;
  for (const [from, to] of Object.entries(fixups)) {
    out = out.replaceAll(from, to);
  }
  return out;
}

const prisma = new PrismaClient();

let updated = 0;
let created = 0;
for (const p of data) {
  const date = new Date(`${p.date}T00:00:00.000Z`);
  const tithi = normalize(p.tithi, TITHI_FIXUPS);
  const nakshatra = p.nakshatra;
  const yoga = normalize(p.yoga, YOGA_FIXUPS);
  const karana = normalize(p.karana, KARANA_FIXUPS);

  const existing = await prisma.dailyPanchang.findUnique({ where: { date } });
  await prisma.dailyPanchang.upsert({
    where: { date },
    update: {
      tithi, nakshatra, yoga, karana,
      sunrise: p.sunrise,
      sunset: p.sunset,
      rahuKaal: p.rahuKaal,
      shubhMuhurat: p.shubhMuhurat,
      festivals: p.festivals,
      vrat: p.vrat,
      specialInfo: p.specialInfo,
      locationCity: 'Delhi',
    },
    create: {
      date,
      tithi, nakshatra, yoga, karana,
      sunrise: p.sunrise,
      sunset: p.sunset,
      rahuKaal: p.rahuKaal,
      shubhMuhurat: p.shubhMuhurat,
      festivals: p.festivals,
      vrat: p.vrat,
      specialInfo: p.specialInfo,
      locationCity: 'Delhi',
    },
  });
  if (existing) updated += 1; else created += 1;
}

console.log(`Loaded ${data.length} panchang days: ${created} created, ${updated} updated.`);
await prisma.$disconnect();
