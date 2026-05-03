/**
 * Seed 6 owned yatra packages (Layer AU). Standalone runner.
 *
 * Run: cd apps/api && node prisma/seed-yatra-packages.mjs
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PACKAGES = [
  {
    slug: 'vaishno-devi-3day',
    name: 'Vaishno Devi Yatra 3-Day',
    destinationSlug: 'vaishno-devi',
    durationDays: 3,
    priceInr: 12000,
    priceUsd: 145,
    maxGroupSize: 30,
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Vaishno_devi.jpg/960px-Vaishno_devi.jpg',
    shortDescription: 'Trikuta Hills darshan + Bhairavnath. Includes Katra→Bhawan helicopter, hotel, all meals.',
    includesText: ['Katra hotel 2 nights', 'Sanjichhat helicopter', 'Bhawan darshan slip', 'All vegetarian meals', 'Bhairavnath visit'],
    excludesText: ['Air/train to Jammu', 'Personal expenses', 'Photography fee'],
    itinerary: { day1: 'Arrive Katra, Banganga darshan', day2: 'Helicopter to Sanjichhat → Bhawan darshan + Bhairavnath', day3: 'Departure' },
    departureDates: ['2026-05-15', '2026-05-22', '2026-06-05', '2026-06-19'],
  },
  {
    slug: 'tirupati-2day',
    name: 'Tirupati Balaji 2-Day',
    destinationSlug: 'tirupati-balaji',
    durationDays: 2,
    priceInr: 8000,
    priceUsd: 95,
    maxGroupSize: 40,
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/960px-Tirumala_090615.jpg',
    shortDescription: 'SED darshan + Padmavathi temple + Tirupati laddu prasad. Hotel + AC bus.',
    includesText: ['Tirupati hotel 1 night', 'Special Entry Darshan ₹300 ticket', 'Tirupati laddu (2)', 'Padmavathi temple visit', 'AC bus ghat road'],
    excludesText: ['Air/train to Tirupati', 'Tonsure charges', 'Photography'],
    itinerary: { day1: 'Arrive Tirupati, hotel checkin, Padmavathi temple', day2: 'SED darshan Tirumala, laddu, departure' },
    departureDates: ['2026-05-10', '2026-05-24', '2026-06-07', '2026-06-21'],
  },
  {
    slug: 'char-dham-11day',
    name: 'Char Dham Yatra 11-Day',
    destinationSlug: 'char-dham',
    durationDays: 11,
    priceInr: 85000,
    priceUsd: 1020,
    maxGroupSize: 20,
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Badrinath_Temple_%2C_Uttarakhand.jpg/960px-Badrinath_Temple_%2C_Uttarakhand.jpg',
    shortDescription: 'Yamunotri + Gangotri + Kedarnath + Badrinath full circuit from Haridwar. Includes Kedarnath helicopter.',
    includesText: ['Hotel 10 nights (3-star)', 'Tempo Traveller AC', 'Kedarnath helicopter (Phata-Kedarnath-Phata)', 'All veg meals', 'Yatra registration', 'Pandit at each dham'],
    excludesText: ['Air to Dehradun', 'Personal pony/palki', 'Off-itinerary detours'],
    itinerary: {
      day1: 'Arrive Haridwar', day2: 'Drive Barkot', day3: 'Yamunotri trek', day4: 'Drive Uttarkashi',
      day5: 'Gangotri darshan', day6: 'Drive Guptkashi', day7: 'Kedarnath helicopter', day8: 'Drive Joshimath',
      day9: 'Badrinath darshan', day10: 'Drive Rishikesh', day11: 'Departure',
    },
    departureDates: ['2026-05-12', '2026-05-26', '2026-06-09', '2026-06-23', '2026-09-15', '2026-10-06'],
  },
  {
    slug: 'shirdi-shani-2day',
    name: 'Shirdi + Shani Shingnapur 2-Day',
    destinationSlug: 'shirdi-sai',
    durationDays: 2,
    priceInr: 6000,
    priceUsd: 72,
    maxGroupSize: 35,
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Sai_baba_samadhi_mandir_.jpg',
    shortDescription: 'Sai Baba samadhi + 4 aartis + Shani Shingnapur. Pune pickup, AC sleeper bus.',
    includesText: ['AC sleeper bus from Pune', 'Hotel 1 night', 'All 4 aartis pass', 'Free prasadalaya lunch', 'Shani Shingnapur visit'],
    excludesText: ['VIP darshan pass', 'Personal expenses'],
    itinerary: { day1: 'Pune→Shirdi via Shani Shingnapur, evening aarti', day2: 'Kakad aarti, samadhi mandir, return Pune' },
    departureDates: ['2026-05-08', '2026-05-15', '2026-05-22', '2026-05-29', '2026-06-05'],
  },
  {
    slug: 'kashi-prayag-ayodhya-5day',
    name: 'Kashi + Prayag + Ayodhya 5-Day',
    destinationSlug: 'kashi',
    durationDays: 5,
    priceInr: 22000,
    priceUsd: 265,
    maxGroupSize: 25,
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/ff/Kashi_Vishwanath.jpg/960px-Kashi_Vishwanath.jpg',
    shortDescription: 'Tri-stithi yatra: Kashi Vishwanath + Triveni Sangam + new Ram Mandir Ayodhya.',
    includesText: ['Hotel 4 nights', 'AC tempo travels', 'Vishwanath corridor darshan', 'Ganga aarti Dashashwamedh', 'Triveni Sangam boat ride', 'Ram Mandir darshan', 'Sarnath day trip', 'All meals'],
    excludesText: ['Air/train', 'Personal poori', 'Photography ticket'],
    itinerary: {
      day1: 'Arrive Varanasi, evening Ganga aarti', day2: 'Vishwanath darshan, Sankat Mochan, BHU',
      day3: 'Drive Prayagraj, Triveni Sangam', day4: 'Drive Ayodhya, Ram Mandir darshan',
      day5: 'Departure',
    },
    departureDates: ['2026-05-13', '2026-05-27', '2026-06-10', '2026-06-24'],
  },
  {
    slug: 'dwarka-somnath-4day',
    name: 'Dwarka + Somnath 4-Day',
    destinationSlug: 'dwarka-somnath',
    durationDays: 4,
    priceInr: 18000,
    priceUsd: 215,
    maxGroupSize: 30,
    heroImage: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Dwarakadheesh_Temple%2C_2014.jpg',
    shortDescription: 'Dwarkadhish + Bet Dwarka + Nageshwar Jyotirlinga + first Jyotirlinga Somnath.',
    includesText: ['Hotel 3 nights', 'AC tempo travels', 'Bet Dwarka boat', 'Nageshwar darshan', 'Somnath sound & light show', 'Bhalka teerth', 'All veg meals'],
    excludesText: ['Air to Jamnagar', 'Personal expenses'],
    itinerary: {
      day1: 'Arrive Jamnagar, drive Dwarka', day2: 'Dwarkadhish + Bet Dwarka + Nageshwar',
      day3: 'Drive Somnath, Triveni snan, sound & light', day4: 'Bhalka, departure',
    },
    departureDates: ['2026-05-11', '2026-05-25', '2026-06-08', '2026-06-22', '2026-09-12'],
  },
];

async function main() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS yatra_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    destination_slug TEXT NOT NULL,
    duration_days INT NOT NULL,
    price_inr NUMERIC(10,2) NOT NULL,
    price_usd NUMERIC(10,2),
    max_group_size INT NOT NULL DEFAULT 30,
    current_group_size INT NOT NULL DEFAULT 0,
    includes_text JSONB DEFAULT '[]'::jsonb,
    excludes_text JSONB DEFAULT '[]'::jsonb,
    itinerary JSONB DEFAULT '{}'::jsonb,
    departure_dates JSONB DEFAULT '[]'::jsonb,
    hero_image TEXT,
    short_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  );`);

  let created = 0, updated = 0;
  for (const p of PACKAGES) {
    const existing = await prisma.$queryRawUnsafe(
      `SELECT id FROM yatra_packages WHERE slug = $1 LIMIT 1`,
      p.slug,
    );
    if (existing.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE yatra_packages SET name=$2, destination_slug=$3, duration_days=$4, price_inr=$5, price_usd=$6,
         max_group_size=$7, includes_text=$8::jsonb, excludes_text=$9::jsonb, itinerary=$10::jsonb,
         departure_dates=$11::jsonb, hero_image=$12, short_description=$13 WHERE slug=$1`,
        p.slug, p.name, p.destinationSlug, p.durationDays, p.priceInr, p.priceUsd,
        p.maxGroupSize, JSON.stringify(p.includesText), JSON.stringify(p.excludesText),
        JSON.stringify(p.itinerary), JSON.stringify(p.departureDates), p.heroImage, p.shortDescription,
      );
      updated++;
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO yatra_packages (slug, name, destination_slug, duration_days, price_inr, price_usd,
         max_group_size, includes_text, excludes_text, itinerary, departure_dates, hero_image, short_description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12, $13)`,
        p.slug, p.name, p.destinationSlug, p.durationDays, p.priceInr, p.priceUsd,
        p.maxGroupSize, JSON.stringify(p.includesText), JSON.stringify(p.excludesText),
        JSON.stringify(p.itinerary), JSON.stringify(p.departureDates), p.heroImage, p.shortDescription,
      );
      created++;
    }
  }
  console.log(`Yatra packages: created=${created}, updated=${updated}, total=${PACKAGES.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
