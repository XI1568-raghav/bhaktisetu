# apps\web\lib\kaal-sarp.ts

- KaalSarpInput · type · L24-L31 — type KaalSarpInput = { dob: string; // YYYY-MM-DD time: string; // HH:MM 24h local timezoneOffset: number; // hours from UTC, e.g. 5.5 for IST latitude: number; longitude: number; placeLabel: string; };
- PlanetPlacement · type · L33-L41 — type PlanetPlacement = { name: string; longitude: number; // sidereal degrees [0,360) sign: string; // rashi label signIndex: number; // 0..11 house: number; // 1..12 insideArc: boolean; // inside Rahu→Ketu (or Ketu→Rahu) arc offsetFromRahu: number; // 0..360 measured CCW from Rahu };
- KaalSarpType · type · L43-L49 — type KaalSarpType = { house: number; name: string; sanskrit: string; theme: string; effect: string; };
- KaalSarpResult · type · L51-L68 — type KaalSarpResult = { input: KaalSarpInput; julianDay: number; ayanamsa: number; ascendantLongitude: number; ascendantSign: string; ascendantSignIndex: number; rahu: PlanetPlacement; ketu: PlanetPlacement; planets: PlanetPlacement[]; // the 7 classical doshaPresent: boolean; partial: boolean; // 1-2 planets outside arc direction: 'forward' | 'reverse' | 'none'; // anuloma / pratiloma type: KaalSarpType | null; severity: 'full' | 'partial' | 'none'; planetsOutsideArc: string[]; remedies: string[]; };
- inlineAscendant · function · L113-L126 — function inlineAscendant(jd: number, latitude: number, longitudeDeg: number): number
- houseFromSign · function · L128-L130 — function houseFromSign(planetSignIdx: number, ascSignIdx: number): number
- computeKaalSarp · function · L132-L237 — function computeKaalSarp(input: KaalSarpInput): KaalSarpResult
