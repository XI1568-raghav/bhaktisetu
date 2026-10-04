// ──────────────────────────────────────────────────────────────────────────
// The 27 nakshatras — COMPUTATIONAL fields only.
//
// This is the single source of truth for every attribute an astrology
// calculation reads: gana (Gana koota), rashi (Varna / Vashya / Graha Maitri /
// Bhakoot kootas), lord (Vimshottari dasha), plus the display names.
//
// It deliberately does NOT carry the editorial prose that
// apps/web/lib/nakshatras.ts adds on top (meaning, qualities, career,
// compatibility, spiritualPractice). Those power web-only SEO pages; the
// numbers below power both clients. apps/web/__tests__/nakshatra-core-parity
// .test.ts asserts the two agree field-for-field, so the web dataset cannot
// drift away from what the calculators read.
//
// Values were extracted mechanically from apps/web/lib/nakshatras.ts rather
// than retyped.
// ──────────────────────────────────────────────────────────────────────────

export type Gana = 'Deva' | 'Manushya' | 'Rakshasa';

export interface NakshatraCore {
 /** Stable url-safe id, shared with apps/web/app/nakshatra/[slug]. */
 slug: string;
 /** Common transliterated name, e.g. "Purva Phalguni". */
 name: string;
 /** Devanagari. */
 sanskritName: string;
 /** Ruling graha — also the Vimshottari dasha lord. */
 lord: string;
 deity: string;
 symbol: string;
 gana: Gana;
 /** Primary rashi. Straddling nakshatras read "Aries-Taurus". */
 rashi: string;
 /** Degrees on the sidereal zodiac. */
 range: string;
}

export const NAKSHATRA_CORE: NakshatraCore[] = [
 { slug: 'ashwini', name: 'Ashwini', sanskritName: 'अश्विनी', lord: 'Ketu', deity: 'Ashwini Kumaras', symbol: 'Horse head', gana: 'Deva', rashi: 'Aries', range: '0°00\'-13°20\' Aries' },
 { slug: 'bharani', name: 'Bharani', sanskritName: 'भरणी', lord: 'Venus', deity: 'Yama', symbol: 'Yoni (creative organ)', gana: 'Manushya', rashi: 'Aries', range: '13°20\'-26°40\' Aries' },
 { slug: 'krittika', name: 'Krittika', sanskritName: 'कृत्तिका', lord: 'Sun', deity: 'Agni', symbol: 'Razor / flame', gana: 'Rakshasa', rashi: 'Aries-Taurus', range: '26°40\' Aries - 10°00\' Taurus' },
 { slug: 'rohini', name: 'Rohini', sanskritName: 'रोहिणी', lord: 'Moon', deity: 'Brahma', symbol: 'Chariot / ox cart', gana: 'Manushya', rashi: 'Taurus', range: '10°00\'-23°20\' Taurus' },
 { slug: 'mrigashira', name: 'Mrigashira', sanskritName: 'मृगशीर्ष', lord: 'Mars', deity: 'Soma', symbol: 'Deer head', gana: 'Deva', rashi: 'Taurus-Gemini', range: '23°20\' Taurus - 6°40\' Gemini' },
 { slug: 'ardra', name: 'Ardra', sanskritName: 'आर्द्रा', lord: 'Rahu', deity: 'Rudra', symbol: 'Teardrop / diamond', gana: 'Manushya', rashi: 'Gemini', range: '6°40\'-20°00\' Gemini' },
 { slug: 'punarvasu', name: 'Punarvasu', sanskritName: 'पुनर्वसु', lord: 'Jupiter', deity: 'Aditi', symbol: 'Quiver of arrows / bow', gana: 'Deva', rashi: 'Gemini-Cancer', range: '20°00\' Gemini - 3°20\' Cancer' },
 { slug: 'pushya', name: 'Pushya', sanskritName: 'पुष्य', lord: 'Saturn', deity: 'Brihaspati', symbol: 'Cow udder / flower', gana: 'Deva', rashi: 'Cancer', range: '3°20\'-16°40\' Cancer' },
 { slug: 'ashlesha', name: 'Ashlesha', sanskritName: 'आश्लेषा', lord: 'Mercury', deity: 'Nagas (serpents)', symbol: 'Coiled serpent', gana: 'Rakshasa', rashi: 'Cancer', range: '16°40\'-30°00\' Cancer' },
 { slug: 'magha', name: 'Magha', sanskritName: 'मघा', lord: 'Ketu', deity: 'Pitris (ancestors)', symbol: 'Royal throne', gana: 'Rakshasa', rashi: 'Leo', range: '0°00\'-13°20\' Leo' },
 { slug: 'purva-phalguni', name: 'Purva Phalguni', sanskritName: 'पूर्व फाल्गुनी', lord: 'Venus', deity: 'Bhaga', symbol: 'Front legs of bed / fig tree', gana: 'Manushya', rashi: 'Leo', range: '13°20\'-26°40\' Leo' },
 { slug: 'uttara-phalguni', name: 'Uttara Phalguni', sanskritName: 'उत्तर फाल्गुनी', lord: 'Sun', deity: 'Aryaman', symbol: 'Rear legs of bed', gana: 'Manushya', rashi: 'Leo-Virgo', range: '26°40\' Leo - 10°00\' Virgo' },
 { slug: 'hasta', name: 'Hasta', sanskritName: 'हस्त', lord: 'Moon', deity: 'Savitar', symbol: 'Hand / fist', gana: 'Deva', rashi: 'Virgo', range: '10°00\'-23°20\' Virgo' },
 { slug: 'chitra', name: 'Chitra', sanskritName: 'चित्रा', lord: 'Mars', deity: 'Tvashtar (Vishvakarma)', symbol: 'Bright jewel / pearl', gana: 'Rakshasa', rashi: 'Virgo-Libra', range: '23°20\' Virgo - 6°40\' Libra' },
 { slug: 'swati', name: 'Swati', sanskritName: 'स्वाती', lord: 'Rahu', deity: 'Vayu', symbol: 'Young sprout in wind', gana: 'Deva', rashi: 'Libra', range: '6°40\'-20°00\' Libra' },
 { slug: 'vishakha', name: 'Vishakha', sanskritName: 'विशाखा', lord: 'Jupiter', deity: 'Indra-Agni', symbol: 'Triumphal archway / potter\'s wheel', gana: 'Rakshasa', rashi: 'Libra-Scorpio', range: '20°00\' Libra - 3°20\' Scorpio' },
 { slug: 'anuradha', name: 'Anuradha', sanskritName: 'अनुराधा', lord: 'Saturn', deity: 'Mitra', symbol: 'Lotus / staff', gana: 'Deva', rashi: 'Scorpio', range: '3°20\'-16°40\' Scorpio' },
 { slug: 'jyeshtha', name: 'Jyeshtha', sanskritName: 'ज्येष्ठा', lord: 'Mercury', deity: 'Indra', symbol: 'Earring / umbrella', gana: 'Rakshasa', rashi: 'Scorpio', range: '16°40\'-30°00\' Scorpio' },
 { slug: 'mula', name: 'Mula', sanskritName: 'मूल', lord: 'Ketu', deity: 'Nirriti', symbol: 'Bunch of roots / tied roots', gana: 'Rakshasa', rashi: 'Sagittarius', range: '0°00\'-13°20\' Sagittarius' },
 { slug: 'purva-ashadha', name: 'Purva Ashadha', sanskritName: 'पूर्व आषाढ़ा', lord: 'Venus', deity: 'Apah (waters)', symbol: 'Elephant tusk / fan', gana: 'Manushya', rashi: 'Sagittarius', range: '13°20\'-26°40\' Sagittarius' },
 { slug: 'uttara-ashadha', name: 'Uttara Ashadha', sanskritName: 'उत्तर आषाढ़ा', lord: 'Sun', deity: 'Vishvadevas', symbol: 'Elephant tusk / planks of bed', gana: 'Manushya', rashi: 'Sagittarius-Capricorn', range: '26°40\' Sag - 10°00\' Cap' },
 { slug: 'shravana', name: 'Shravana', sanskritName: 'श्रवण', lord: 'Moon', deity: 'Vishnu', symbol: 'Ear / three footprints', gana: 'Deva', rashi: 'Capricorn', range: '10°00\'-23°20\' Capricorn' },
 { slug: 'dhanishta', name: 'Dhanishta', sanskritName: 'धनिष्ठा', lord: 'Mars', deity: 'Eight Vasus', symbol: 'Drum / flute', gana: 'Rakshasa', rashi: 'Capricorn-Aquarius', range: '23°20\' Cap - 6°40\' Aqu' },
 { slug: 'shatabhisha', name: 'Shatabhisha', sanskritName: 'शतभिषा', lord: 'Rahu', deity: 'Varuna', symbol: 'Empty circle / 100 healers', gana: 'Rakshasa', rashi: 'Aquarius', range: '6°40\'-20°00\' Aquarius' },
 { slug: 'purva-bhadrapada', name: 'Purva Bhadrapada', sanskritName: 'पूर्व भाद्रपद', lord: 'Jupiter', deity: 'Aja Ekapada', symbol: 'Two-faced man / sword', gana: 'Manushya', rashi: 'Aquarius-Pisces', range: '20°00\' Aqu - 3°20\' Pis' },
 { slug: 'uttara-bhadrapada', name: 'Uttara Bhadrapada', sanskritName: 'उत्तर भाद्रपद', lord: 'Saturn', deity: 'Ahir Budhnya', symbol: 'Twin / serpent in deep water', gana: 'Manushya', rashi: 'Pisces', range: '3°20\'-16°40\' Pisces' },
 { slug: 'revati', name: 'Revati', sanskritName: 'रेवती', lord: 'Mercury', deity: 'Pushan', symbol: 'Fish / drum', gana: 'Deva', rashi: 'Pisces', range: '16°40\'-30°00\' Pisces' },];

/** 12 rashis in canonical (Mesha-first) order, English names. */
export const RASHI_NAMES = [
 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

export type RashiName = (typeof RASHI_NAMES)[number];

/** The same 12 with their Sanskrit names, as the calculators print them. */
export const RASHI_LABELS = [
 'Mesha (Aries)',
 'Vrishabha (Taurus)',
 'Mithuna (Gemini)',
 'Karka (Cancer)',
 'Simha (Leo)',
 'Kanya (Virgo)',
 'Tula (Libra)',
 'Vrischika (Scorpio)',
 'Dhanu (Sagittarius)',
 'Makara (Capricorn)',
 'Kumbha (Aquarius)',
 'Meena (Pisces)',
] as const;

export function getNakshatraCore(slug: string): NakshatraCore | undefined {
 return NAKSHATRA_CORE.find((n) => n.slug === slug);
}

export function nakshatraCoreIndex(slug: string): number {
 return NAKSHATRA_CORE.findIndex((n) => n.slug === slug);
}

/**
 * PRIMARY rashi of a nakshatra — the rashi its first pada falls in. Nine of
 * the 27 straddle two rashis and store "Aries-Taurus"; koota scoring uses the
 * first, per the nakshatra-based (rather than pada-precise) milan convention.
 */
export function primaryRashiOf(nak: NakshatraCore): RashiName {
 const first = nak.rashi.split('-')[0];
 return ((first ?? nak.rashi).trim()) as RashiName;
}

export function rashiIndexOf(r: RashiName): number {
 return (RASHI_NAMES as readonly string[]).indexOf(r);
}

/** Dropdown options for both clients — one list, one order. */
export function allNakshatraOptions(): Array<{ slug: string; label: string }> {
 return NAKSHATRA_CORE.map((n) => ({ slug: n.slug, label: `${n.name} (${n.sanskritName})` }));
}
