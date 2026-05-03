/**
 * Seed home-service puja types for Bengaluru launch (Layer AA).
 * Standalone runner — sidesteps full seed.ts User unique-violation.
 *
 * Run: cd apps/api && node prisma/seed-home-service-pujas.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const HOME_SERVICE_PUJAS = [
  {
    slug: 'satyanarayan-home-puja',
    name: 'Satyanarayan Vrat Katha at Home',
    nameLocal: 'सत्यनारायण व्रत कथा',
    deity: 'Lord Vishnu',
    description: 'Pandit performs full Satyanarayan Katha at devotee home. Includes panchamrit abhishek, prasad distribution, audio of katha. 4-hour ritual ideal for new ventures, anniversaries, gratitude offerings.',
    category: 'special_occasion',
    durationMinutes: 240,
    basePrice: 2100,
    nriPrice: 199,
    samagriIncluded: true,
  },
  {
    slug: 'griha-pravesh-home-puja',
    name: 'Griha Pravesh (House Warming)',
    nameLocal: 'गृह प्रवेश',
    deity: 'Lord Ganesha',
    description: 'Vastu-compliant house warming. Pandit performs Ganesh puja, navagraha shanti, vastu yagna, Lakshmi puja. Includes navchandi havan if requested.',
    category: 'special_occasion',
    durationMinutes: 360,
    basePrice: 4500,
    nriPrice: 449,
    samagriIncluded: true,
  },
  {
    slug: 'vastu-shanti-home-puja',
    name: 'Vastu Shanti Puja',
    nameLocal: 'वास्तु शांति',
    deity: 'Vastu Purusha',
    description: 'Corrective Vastu remediation puja for existing homes/offices with vastu doshas. Identifies + neutralises sthana dosha through targeted yagna.',
    category: 'special_occasion',
    durationMinutes: 180,
    basePrice: 3500,
    nriPrice: 349,
    samagriIncluded: true,
  },
  {
    slug: 'navagraha-shanti-home-puja',
    name: 'Navagraha Shanti Puja',
    nameLocal: 'नवग्रह शांति',
    deity: 'Navagraha',
    description: 'Pacify nine planetary deities causing dosha in birth chart. Pandit recites Navagraha Stotra + 1008 mantras per planet identified weak. Recommended after kundli reading.',
    category: 'special_occasion',
    durationMinutes: 240,
    basePrice: 2800,
    nriPrice: 279,
    samagriIncluded: true,
  },
  {
    slug: 'mundan-home-puja',
    name: 'Mundan Sanskar (First Hair Cut)',
    nameLocal: 'मुंडन संस्कार',
    deity: 'Lord Ganesha',
    description: 'Hindu samskara performed at home for child first hair tonsure (typically age 1-3). Includes Ganesh puja, sankalp, shaving by barber, post-mundan blessing.',
    category: 'special_occasion',
    durationMinutes: 120,
    basePrice: 1500,
    nriPrice: 149,
    samagriIncluded: false,
  },
  {
    slug: 'birthday-puja-home',
    name: 'Birthday / Janma Tithi Puja',
    nameLocal: 'जन्म तिथि पूजा',
    deity: 'Ishta Devata',
    description: 'Vedic birthday celebration aligned with janma nakshatra. Pandit performs ayushya homa for longevity + ishta devata puja for the birthday person. Family blessing ritual.',
    category: 'special_occasion',
    durationMinutes: 90,
    basePrice: 1800,
    nriPrice: 179,
    samagriIncluded: true,
  },
];

async function main() {
  let created = 0, updated = 0;
  for (const p of HOME_SERVICE_PUJAS) {
    const existing = await prisma.pujaType.findUnique({ where: { slug: p.slug } });
    const data = {
      ...p,
      basePrice: String(p.basePrice),
      nriPrice: String(p.nriPrice),
      isActive: true,
      // Tag in samagriItems JSON to identify home-service variants without
      // schema migration. Frontend filters where samagriItems.serviceType === 'home'.
      samagriItems: { serviceType: 'home', commissionRate: 0.20, defaultCity: 'Bengaluru' },
    };
    if (existing) {
      await prisma.pujaType.update({ where: { slug: p.slug }, data });
      updated++;
    } else {
      await prisma.pujaType.create({ data });
      created++;
    }
  }
  console.log(`Home-service pujas: created=${created}, updated=${updated}, total=${HOME_SERVICE_PUJAS.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
