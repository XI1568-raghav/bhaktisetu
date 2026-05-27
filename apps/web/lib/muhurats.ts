// Canonical Vedic muhurats (auspicious time windows). Powers /muhurat/[slug]
// programmatic SEO targeting "rahu kalam today", "abhijit muhurta time",
// "brahma muhurta benefits", "vivah muhurta 2026" long-tail queries.

export interface Muhurat {
  slug: string;
  name: string;
  sanskritName: string;
  category: 'daily' | 'inauspicious' | 'planning';
  shortDesc: string;        // 1-line essence
  timing: string;           // When it occurs (descriptive)
  duration: string;         // Typical duration
  ruledBy: string;          // Planet / deity / element
  bestFor: string[];        // Activities suited (or to avoid for inauspicious)
  avoid: string[];          // Activities to avoid
  spiritualSignificance: string;
  howToCalculate: string;
  modernApplication: string;
}

export const MUHURATS: Muhurat[] = [
  {
    slug: 'brahma-muhurta',
    name: 'Brahma Muhurta',
    sanskritName: 'ब्रह्म मुहूर्त',
    category: 'daily',
    shortDesc: 'Pre-dawn 96 minutes — the creator\'s hour, peak time for sadhana.',
    timing: '1 hour 36 minutes before sunrise (96 minutes before sunrise to 48 minutes before sunrise)',
    duration: '96 minutes (48 minutes per half — 2 muhurats)',
    ruledBy: 'Brahma (creator)',
    bestFor: ['Meditation', 'Pranayama', 'Yoga sadhana', 'Mantra japa', 'Scripture study', 'Creative writing', 'Decision making', 'Memorization'],
    avoid: ['Sleeping', 'Sexual activity', 'Heavy meals', 'Worldly business'],
    spiritualSignificance: 'Atmosphere is sattvic — minimal rajas and tamas. Mind is freshly emerging from deep sleep, perception is clear, environment quiet. Yogic texts call this period prajnakala (time of wisdom). Said to be when sleeping atman touches divine consciousness most easily.',
    howToCalculate: 'Sunrise time − 96 min = Brahma Muhurta start. Sunrise time − 48 min = Brahma Muhurta end. Example: sunrise 6:00 AM → Brahma Muhurta 4:24 AM to 5:12 AM.',
    modernApplication: 'Modern neuroscience confirms cortisol levels naturally rise before dawn, brain is in theta-to-alpha transition (optimal learning + creativity state). Used by Steve Jobs, Tim Cook, top CEOs for deep work. Aligns with Ayurveda\'s vata-dominant kala — best for spiritual work.',
  },
  {
    slug: 'abhijit-muhurta',
    name: 'Abhijit Muhurta',
    sanskritName: 'अभिजित मुहूर्त',
    category: 'daily',
    shortDesc: 'The victorious hour around solar noon — auspicious for new beginnings.',
    timing: '24 minutes before to 24 minutes after local solar noon',
    duration: '48 minutes',
    ruledBy: 'Lord Vishnu / Sun at zenith',
    bestFor: ['Starting new ventures', 'Important meetings', 'Job interviews', 'Court cases', 'Travel commencement', 'Signing contracts', 'Coronations/inaugurations', 'Battle commencement (historical)'],
    avoid: ['Funeral rites (do not do shradh in Abhijit on most days)'],
    spiritualSignificance: 'Most auspicious daily muhurat. Cancels weak planetary positions. Considered "swayam siddha" — self-empowered, requires no further muhurat checks. Lord Rama was born during Abhijit Muhurta (per some traditions). Sun at zenith represents maximum solar energy and divine attention.',
    howToCalculate: 'Local solar noon ± 24 min. Solar noon ≠ clock noon — varies by longitude and season. Use sunrise + (day length / 2). Example: sunrise 6:30 AM, sunset 6:30 PM → solar noon 12:30 PM → Abhijit 12:06 PM to 12:54 PM.',
    modernApplication: 'Many Indian businesses still consult Abhijit for product launches, office openings, signing major deals. Modi government has used Abhijit Muhurta for parliamentary sessions and major announcements. Easy to apply — falls in workday window.',
  },
  {
    slug: 'rahu-kalam',
    name: 'Rahu Kalam',
    sanskritName: 'राहु कालम्',
    category: 'inauspicious',
    shortDesc: 'Daily 90-minute window ruled by Rahu — avoid new ventures.',
    timing: 'Varies by day of week (1.5-hour window between sunrise and sunset)',
    duration: '90 minutes',
    ruledBy: 'Rahu (north node of Moon)',
    bestFor: ['Rahu remedies', 'Snake worship', 'Mystical research', 'Letting energy settle'],
    avoid: ['Starting new ventures', 'Important meetings', 'Travel commencement', 'Marriage rituals', 'Buying property', 'Investments', 'Signing contracts'],
    spiritualSignificance: 'Rahu is the shadow planet, deceiver and confuser. Activities started during Rahu Kalam are believed to face obstacles, deception, delays, or unexpected reversals. Particularly important in South Indian tradition — most Tamil/Telugu/Kannada/Malayalam households check Rahu Kalam daily.',
    howToCalculate: 'Divide daytime (sunrise to sunset) into 8 equal parts. Rahu Kalam falls in: Monday-2nd part, Tuesday-7th, Wednesday-5th, Thursday-6th, Friday-4th, Saturday-3rd, Sunday-8th. Mnemonic: "Mother Saw Father Wearing The Turban Sunday" (M-Sa-F-W-Th-Tu-Sun = 2,7,5,6,4,3,8 wrong — verify with panchang).',
    modernApplication: 'Avoid scheduling product launches, exam start, contract signing, or wedding muhurat during Rahu Kalam. Most muhurat apps (including Darshya panchang) show daily Rahu Kalam in your local time. Tamil weddings still strictly avoid this window.',
  },
  {
    slug: 'yamaganda-kalam',
    name: 'Yamaganda Kalam',
    sanskritName: 'यमगण्ड कालम्',
    category: 'inauspicious',
    shortDesc: 'Daily 90-minute window ruled by Yama — avoid travel commencement.',
    timing: 'Varies by day (1.5-hour window between sunrise and sunset)',
    duration: '90 minutes',
    ruledBy: 'Yama (god of death/dharma)',
    bestFor: ['Pitru karma', 'Yama remedies', 'Reflection on mortality'],
    avoid: ['Travel commencement', 'New ventures', 'Marriage', 'Important journeys', 'Surgery (when avoidable)'],
    spiritualSignificance: 'Yama presides over endings and judgements. Activities started in Yamaganda often hit unexpected endings, delays, or dharmic complications. Particularly avoided for travel — historically associated with road accidents. Less strict than Rahu Kalam in popular practice.',
    howToCalculate: 'Divide daytime into 8 parts. Yamaganda: Monday-4th, Tuesday-3rd, Wednesday-2nd, Thursday-1st, Friday-5th, Saturday-6th, Sunday-7th part. Check daily panchang for local time.',
    modernApplication: 'Most strictly observed for vehicle purchase, long journey start, and surgery scheduling. South Indian families plan road trips around this window. Modern panchang apps surface this automatically.',
  },
  {
    slug: 'gulika-kalam',
    name: 'Gulika Kalam',
    sanskritName: 'गुलिक कालम्',
    category: 'inauspicious',
    shortDesc: 'Daily window of Gulika (Saturn\'s son) — avoid permanent commitments.',
    timing: 'Varies by day',
    duration: '90 minutes',
    ruledBy: 'Gulika (son of Saturn, also Mandi)',
    bestFor: ['Saturn remedies', 'Settling permanent matters that are intended to last'],
    avoid: ['New ventures', 'Travel', 'Investments', 'Job change'],
    spiritualSignificance: 'Gulika is a sub-planet associated with bondage and permanence. Activities started here tend to become "stuck" — long-lasting in their state. Useful for things you WANT permanent (laying foundation stone), avoided for changing situations (job change).',
    howToCalculate: 'Divide daytime into 8 parts. Gulika: Monday-6th, Tuesday-5th, Wednesday-4th, Thursday-3rd, Friday-2nd, Saturday-1st, Sunday-7th part.',
    modernApplication: 'Less popularly observed than Rahu Kalam. Astrologers still check it for major life decisions. Foundation-laying ceremonies for temples and homes sometimes deliberately use Gulika for "permanence" symbolism.',
  },
  {
    slug: 'pradosh-kalam',
    name: 'Pradosh Kalam',
    sanskritName: 'प्रदोष कालम्',
    category: 'daily',
    shortDesc: 'Twilight window sacred to Lord Shiva — peak time for Shiva worship.',
    timing: '1 hour 12 minutes before sunset to 1 hour 12 minutes after sunset',
    duration: '2 hours 24 minutes (3 muhurats)',
    ruledBy: 'Lord Shiva',
    bestFor: ['Shiva worship', 'Pradosh vrat', 'Shiv Abhishekam', 'Bilva offering', 'Mahamrityunjaya Mantra', 'Trayambakeshvar worship'],
    avoid: ['Heavy meals', 'Anger', 'Negative thoughts (which carry deeper karmic weight in this twilight zone)'],
    spiritualSignificance: 'Twilight is sandhya — neither day nor night, neither rajas nor tamas. Highly sattvic moment. Shiva is said to dance Tandava on Mount Kailash during Pradosh, especially Trayodashi Pradosh (every 13th lunar day). Worship now multiplies merit many-fold.',
    howToCalculate: 'Sunset time ± 1h 12min. Trayodashi Pradosh is the highest — when 13th lunar day overlaps with Pradosh Kalam. Saturday Pradosh (Shani Pradosh) is also special.',
    modernApplication: 'Visit Shiva temples during this window. Light a diya at home Shiva altar. Recite Mahamrityunjaya 108 times during Pradosh. Particularly observed during Shivratri month (Phalguna). Most Hindu households still light the evening lamp during this window.',
  },
  {
    slug: 'amrit-kaal',
    name: 'Amrit Kaal',
    sanskritName: 'अमृत काल',
    category: 'daily',
    shortDesc: 'Window of nectar — most auspicious 96-minute span of the day.',
    timing: 'Varies daily based on nakshatra of the Moon (panchang-derived)',
    duration: '~96 minutes',
    ruledBy: 'Devas (immortality nectar)',
    bestFor: ['Starting new ventures', 'Marriage', 'Buying property', 'Investments', 'Major decisions', 'Initiations (diksha)', 'Spiritual practice'],
    avoid: ['Wasting it on mundane tasks'],
    spiritualSignificance: 'Considered the "nectar window" — actions started bear sweet fruit. Most auspicious of all daily windows when it can be found. Particularly empowering for spiritual initiations. Combined with Abhijit Muhurta, considered virtually guaranteed for success.',
    howToCalculate: 'Complex calculation based on the Moon\'s nakshatra and weekday combination. Each nakshatra has a specific time-segment marked Amrit. Use Darshya panchang or consult a Vedic astrologer for accurate daily timing.',
    modernApplication: 'PM Modi has popularized the term "Amrit Kaal" for India\'s 2022-2047 development period (centenary of independence). For personal life — schedule major life events in Amrit Kaal when possible. Check daily panchang.',
  },
  {
    slug: 'vivah-muhurta',
    name: 'Vivah Muhurta',
    sanskritName: 'विवाह मुहूर्त',
    category: 'planning',
    shortDesc: 'Auspicious wedding dates — calculated from both partners\' charts.',
    timing: 'Specific dates in months: Magha, Phalguna, Vaisakha, Jyeshtha, and parts of Ashadha + Margashirsha',
    duration: 'Full day or specific lagna window within day',
    ruledBy: 'Jupiter (Guru), Venus, Moon',
    bestFor: ['Hindu weddings', 'Engagement', 'Roka ceremony', 'Wedding date selection'],
    avoid: ['Chaturmas months (Ashadha-Kartika partial avoidance)', 'Holashtak (8 days before Holi)', 'Pitru Paksha', 'When Jupiter/Venus combust'],
    spiritualSignificance: 'Marriage is a sacred samskara binding two souls across multiple lifetimes. Vivah muhurta ensures planetary energies support harmony, fertility, longevity, and prosperity. Mahurat avoids periods when Guru (Jupiter — preceptor of devas, planet of marriage) is weak.',
    howToCalculate: 'Match both partners\' birth charts (gun milan, ashtakoot — 36 points). Find dates when Moon, Jupiter, Venus are strong. Check Tithi (avoid 4/9/14), Nakshatra (Rohini/Mrigashira/Magha/Uttara Phalguni/Hasta/Swati/Anuradha/Mula/Uttara Ashadha/Uttara Bhadrapada/Revati are best). Avoid Bhadra Karana.',
    modernApplication: 'Indian wedding industry still 90%+ panchang-driven. Wedding venues fully booked on Vivah Muhurta dates 1+ year in advance. Most families consult both family pandits + bride/groom horoscope matches. Darshya offers Vivah Muhurta consultation via /ask-pandit.',
  },
  {
    slug: 'griha-pravesh-muhurta',
    name: 'Griha Pravesh Muhurta',
    sanskritName: 'गृह प्रवेश मुहूर्त',
    category: 'planning',
    shortDesc: 'Auspicious dates for entering a new home.',
    timing: 'Specific dates in months: Magha, Phalguna, Vaisakha, Jyeshtha',
    duration: 'Full day, with specific lagna window for actual entry',
    ruledBy: 'Vastu Purusha, Lord Ganesha',
    bestFor: ['First entry into new home', 'Renovated home re-entry', 'Vastu shanti puja', 'Satyanarayan katha at new home'],
    avoid: ['Chaturmas (Ashadha Shukla Ekadashi to Kartik Shukla Ekadashi)', 'Pitru Paksha', 'Eclipse days', 'Tuesday/Saturday for entry'],
    spiritualSignificance: 'House is more than walls — it\'s a living energy field. Griha Pravesh consecrates the space, invokes Vastu Purusha (the deity of the dwelling), establishes deity altar, and protects from negative energies. Three types: Apoorva (new home), Sapoorva (after long absence), Dwandwa (after renovation/repair).',
    howToCalculate: 'Best months: Magha, Phalguna, Vaisakha, Jyeshtha. Best tithis: 2, 3, 5, 7, 10, 11, 13. Best nakshatras: Rohini, Mrigashira, Anuradha, Chitra, Revati, Uttara Phalguni/Ashadha/Bhadrapada. Avoid: Bhadra Karana, Vyatipata, Vaidhriti yogas.',
    modernApplication: 'Real estate possession dates increasingly coordinated with Griha Pravesh muhurat. Builders schedule key handovers on auspicious dates. Insurance start date for new home often coincides. Even apartment moves now include this samskara.',
  },
  {
    slug: 'mundan-muhurta',
    name: 'Mundan Muhurta',
    sanskritName: 'मुण्डन मुहूर्त',
    category: 'planning',
    shortDesc: 'Auspicious dates for child\'s first hair-cutting ceremony (chudakarana).',
    timing: 'Performed in 1st, 3rd, 5th, or 7th year (odd years)',
    duration: 'Single muhurat within selected day',
    ruledBy: 'Lord Shiva, family kuldevi',
    bestFor: ['Chudakarana samskara', 'Cleansing past-life karmic residues from hair', 'Tirupati/Tirumala/Palani offerings'],
    avoid: ['Even years (2, 4, 6, 8)', 'Solar month of child\'s birth', 'Month of child\'s janma nakshatra', 'Pitru Paksha'],
    spiritualSignificance: 'Hair is believed to carry karmic impressions from past lives. Mundan removes those impressions and starts the child fresh. Also believed to strengthen new hair growth, balance vata dosha, and support brain development. Tirupati pilgrimage tradition offers hair at the temple.',
    howToCalculate: 'Best months: Magha, Phalguna, Chaitra, Vaisakha, Jyeshtha. Best tithis: 2, 3, 5, 7, 10, 11, 13. Best nakshatras: Pushya, Mrigashira, Punarvasu, Hasta, Chitra, Swati, Jyeshtha, Shravana, Dhanishta, Shatabhisha, Revati.',
    modernApplication: 'Still 80%+ observed in Hindu households. Combined with first pilgrimage. Many families do Mundan at Tirupati, Palani, Vaishno Devi, or Pashupatinath. Photo-op and family gathering — birthday-equivalent for first decade.',
  },
];

export function muhuratSlugs(): string[] {
  return MUHURATS.map((m) => m.slug);
}

export function getMuhurat(slug: string): Muhurat | undefined {
  return MUHURATS.find((m) => m.slug === slug);
}

export function muhuratsByCategory(cat: Muhurat['category']): Muhurat[] {
  return MUHURATS.filter((m) => m.category === cat);
}
