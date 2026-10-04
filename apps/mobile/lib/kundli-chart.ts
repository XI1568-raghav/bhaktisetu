/**
 * Reader for the kundli `POST /api/v1/astrology/kundli` actually returns.
 *
 * THE BUG THIS MODULE EXISTS FOR
 * ------------------------------
 * `app/(devotee)/kundli.tsx` declared its own `KundliResult` interface and
 * rendered off it:
 *
 *   { signature?, ascendant?, moonSign?, sunSign?, nakshatra?, dasha?,
 *     planets?: {name, sign, house, degree}[], summary? }
 *
 * Exactly ONE of those keys — `signature` — exists on what the route sends,
 * and the screen never rendered it. `KundliPayload`
 * (apps/api/src/lib/astrology.ts:145-162) carries:
 *
 *   { source, warning?, name, dob, tob, location, ayanamsa,
 *     rashi:{english,sanskrit,hindi,symbol,lord},
 *     sunSign:{english,sanskrit,hindi},
 *     nakshatra:{name,hindi,pada},
 *     lagna:{english,sanskrit,hindi},
 *     planetaryPositions:[{planet,sign,signHindi,degree,house}],
 *     dasha:{current:{planet,planetHindi,startDate,endDate,years}|null,sequence},
 *     interpretation: string[], signature }
 *
 * So `ascendant` was `lagna`, `moonSign` was `rashi`, `planets` was
 * `planetaryPositions` with different field names, and `summary` was
 * `interpretation` (an ARRAY). Worse than blank: `sunSign`, `nakshatra` and
 * `dasha` DO exist as keys and are OBJECTS, and the screen passed each straight
 * into `<Text>{value}</Text>`. React Native throws "Objects are not valid as a
 * React child" on that, so a HEALTHY 200 took the screen down — the crash was
 * on the success path, which is why no error state ever showed it.
 *
 * The reader lives here rather than inside the screen because apps/mobile's
 * vitest runner is node-only and renders no React Native: a shape assumption
 * that lives in a .tsx screen is one nothing in this repo can check. Every
 * field below is read off the verbatim `KundliPayload` and an unrecognised
 * shape yields `null` — never a default chart.
 *
 * `degree` is a STRING on the wire (`chart.<planet>.toFixed(2)`), so it is
 * carried as one. Formatting it as a number here would be this module
 * inventing precision the server did not send.
 */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** `{english, sanskrit, hindi}` → the English name, which is what we render. */
function signName(v: unknown): string | null {
  if (!isRecord(v)) return null;
  return str(v.english) ?? str(v.sanskrit) ?? str(v.hindi);
}

export interface KundliPlanet {
  planet: string;
  sign: string | null;
  /** Degrees within the sign, as the server formatted it. Never recomputed. */
  degree: string | null;
  house: number | null;
}

export interface KundliDasha {
  planet: string;
  startDate: string | null;
  endDate: string | null;
  years: number | null;
}

export interface KundliChart {
  /** Present only when the server flagged a degraded calculation. Show it. */
  warning: string | null;
  /** 'computed' | 'vedicastroapi' | 'mock' — the server's own provenance. */
  source: string | null;
  name: string | null;
  dob: string | null;
  tob: string | null;
  location: string | null;
  ayanamsa: number | null;
  /** Lagna / ascendant. */
  lagna: string | null;
  /** Moon sign (rashi). */
  rashi: string | null;
  rashiLord: string | null;
  sunSign: string | null;
  nakshatra: string | null;
  nakshatraPada: number | null;
  currentDasha: KundliDasha | null;
  planets: KundliPlanet[];
  /** Paragraphs of the server's own interpretation. Never generated here. */
  interpretation: string[];
  signature: string | null;
}

function selectPlanet(raw: unknown): KundliPlanet | null {
  if (!isRecord(raw)) return null;
  const planet = str(raw.planet);
  // A row with no planet name cannot be labelled and must not be listed.
  if (!planet) return null;
  return {
    planet,
    sign: str(raw.sign),
    degree: str(raw.degree) ?? (num(raw.degree) !== null ? String(raw.degree) : null),
    house: num(raw.house),
  };
}

function selectDasha(raw: unknown): KundliDasha | null {
  if (!isRecord(raw)) return null;
  const planet = str(raw.planet);
  if (!planet) return null;
  return {
    planet,
    startDate: str(raw.startDate),
    endDate: str(raw.endDate),
    years: num(raw.years),
  };
}

/**
 * `POST /api/v1/astrology/kundli` -> `{ kundli }`. `null` for any other shape,
 * including the `{error}` body the route sends on a 400.
 */
export function selectKundli(payload: unknown): KundliChart | null {
  if (!isRecord(payload)) return null;
  const k = payload.kundli;
  if (!isRecord(k)) return null;

  const lagna = signName(k.lagna);
  const rashi = signName(k.rashi);
  const sunSign = signName(k.sunSign);
  const nakshatraRecord = isRecord(k.nakshatra) ? k.nakshatra : null;
  const nakshatra = nakshatraRecord ? str(nakshatraRecord.name) : null;

  // A chart with none of the four cardinal placements is not a chart. Saying
  // so beats rendering an empty card the devotee cannot tell from a bug.
  if (!lagna && !rashi && !sunSign && !nakshatra) return null;

  const positions = Array.isArray(k.planetaryPositions) ? k.planetaryPositions : [];
  const interpretation = Array.isArray(k.interpretation)
    ? k.interpretation.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
    : [];
  const dashaRecord = isRecord(k.dasha) ? k.dasha : null;

  return {
    warning: str(k.warning),
    source: str(k.source),
    name: str(k.name),
    dob: str(k.dob),
    tob: str(k.tob),
    location: str(k.location),
    ayanamsa: num(k.ayanamsa),
    lagna,
    rashi,
    rashiLord: isRecord(k.rashi) ? str(k.rashi.lord) : null,
    sunSign,
    nakshatra,
    nakshatraPada: nakshatraRecord ? num(nakshatraRecord.pada) : null,
    currentDasha: dashaRecord ? selectDasha(dashaRecord.current) : null,
    planets: positions.map(selectPlanet).filter((p): p is KundliPlanet => p !== null),
    interpretation,
    signature: str(k.signature),
  };
}
