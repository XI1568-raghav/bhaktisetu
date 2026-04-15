import { prisma } from '../lib/prisma.js';

export class PanchangService {
  /**
   * Get today's panchang data.
   */
  async getToday(city?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const panchang = await prisma.dailyPanchang.findFirst({
      where: {
        date: today,
        ...(city ? { locationCity: { equals: city, mode: 'insensitive' } } : {}),
      },
    });

    if (!panchang) {
      // Fallback: get the closest available date's panchang
      const closest = await prisma.dailyPanchang.findFirst({
        where: city
          ? { locationCity: { equals: city, mode: 'insensitive' } }
          : {},
        orderBy: {
          date: 'desc',
        },
      });

      return closest
        ? { ...closest, note: 'Showing most recent available panchang data.' }
        : null;
    }

    return panchang;
  }

  /**
   * Get panchang for a specific date.
   */
  async getByDate(dateStr: string, city?: string) {
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);

    if (isNaN(date.getTime())) {
      return null;
    }

    const panchang = await prisma.dailyPanchang.findFirst({
      where: {
        date,
        ...(city ? { locationCity: { equals: city, mode: 'insensitive' } } : {}),
      },
    });

    return panchang;
  }

  /**
   * Get upcoming festivals in the next N days.
   */
  async getUpcomingFestivals(days: number = 30) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + days);

    const panchangEntries = await prisma.dailyPanchang.findMany({
      where: {
        date: {
          gte: today,
          lte: endDate,
        },
        festivals: {
          isEmpty: false,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Flatten festivals with their dates
    const festivals: Array<{
      date: Date;
      festival: string;
      tithi: string;
      nakshatra: string;
      specialInfo: string | null;
    }> = [];

    for (const entry of panchangEntries) {
      for (const festival of entry.festivals) {
        festivals.push({
          date: entry.date,
          festival,
          tithi: entry.tithi,
          nakshatra: entry.nakshatra,
          specialInfo: entry.specialInfo,
        });
      }
    }

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

    const panchangEntries = await prisma.dailyPanchang.findMany({
      where: {
        date: {
          gte: today,
          lte: endDate,
        },
        vrat: {
          isEmpty: false,
        },
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

    for (const entry of panchangEntries) {
      for (const v of entry.vrat) {
        vrats.push({
          date: entry.date,
          vrat: v,
          tithi: entry.tithi,
          nakshatra: entry.nakshatra,
          specialInfo: entry.specialInfo,
        });
      }
    }

    return {
      vrats,
      total: vrats.length,
    };
  }

  /**
   * Get panchang entries for a date range.
   */
  async getRange(startDate: string, endDate: string, city?: string) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const entries = await prisma.dailyPanchang.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
        ...(city ? { locationCity: { equals: city, mode: 'insensitive' } } : {}),
      },
      orderBy: { date: 'asc' },
    });

    return entries;
  }
}

export const panchangService = new PanchangService();
