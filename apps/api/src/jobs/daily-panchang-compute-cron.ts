import { prisma } from '../lib/prisma.js';
import { computePanchang } from '../services/panchang.service.js';

// Computes panchang for today + next 6 days for Delhi and upserts into
// DailyPanchang. Keeps the freshness gate in panchang.service.ts:getToday
// (2-day stale window) green so no request ever falls through to dynamic
// compute on the hot path. DailyPanchang.date is @unique, so single-city
// per date — Delhi is the canonical reference per existing data model.
//
// Safe to run hourly: upsert is idempotent + only writes 7 rows/run.
// Free-tier impact: negligible (7 writes * 24 runs = 168 writes/day on
// Supabase free 500 MB, well under quota).

const HORIZON_DAYS = 7;
const CITY = 'Delhi';

interface ComputeResult {
  written: number;
  skipped: number;
  errors: number;
}

export async function runDailyPanchangCompute(): Promise<ComputeResult> {
  let written = 0;
  let skipped = 0;
  let errors = 0;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const target = new Date(today);
    target.setUTCDate(target.getUTCDate() + i);

    try {
      const computed = computePanchang(target, CITY);
      await prisma.dailyPanchang.upsert({
        where: { date: target },
        update: {
          tithi: computed.tithi,
          nakshatra: computed.nakshatra,
          yoga: computed.yoga,
          karana: computed.karana,
          sunrise: computed.sunrise,
          sunset: computed.sunset,
          rahuKaal: computed.rahuKaal,
          shubhMuhurat: computed.shubhMuhurat,
          festivals: computed.festivals,
          vrat: computed.vrat,
          specialInfo: computed.specialInfo,
          locationCity: CITY,
        },
        create: {
          date: target,
          tithi: computed.tithi,
          nakshatra: computed.nakshatra,
          yoga: computed.yoga,
          karana: computed.karana,
          sunrise: computed.sunrise,
          sunset: computed.sunset,
          rahuKaal: computed.rahuKaal,
          shubhMuhurat: computed.shubhMuhurat,
          festivals: computed.festivals,
          vrat: computed.vrat,
          specialInfo: computed.specialInfo,
          locationCity: CITY,
        },
      });
      written++;
    } catch (err) {
      errors++;
      // eslint-disable-next-line no-console
      console.error(`[daily-panchang-compute] ${target.toISOString().slice(0, 10)} failed:`, err);
    }
  }

  return { written, skipped, errors };
}
