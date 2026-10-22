/**
 * Coordinates for the yatra-planner towns that lib/indian-cities.ts (a birth-place
 * picker table) does not carry. Kept separate so the city picker is unchanged.
 * Each value is the "Coordinates" figure printed on the cited English Wikipedia
 * article (fetched 2026-10-22), converted to decimal degrees. Wikipedia gives
 * these to about 1 arc-minute, so they are good to a few km; the planner rounds
 * to the nearest 10 km, which is the precision we claim.
 */
export interface TownCoord {
  lat: number;
  lng: number;
  source: string;
}

export const YATRA_TOWN_COORDS: Record<string, TownCoord> = {
  veraval: { lat: 20.915889, lng: 70.362889, source: 'https://en.wikipedia.org/wiki/Veraval' },
  srisailam: { lat: 16.0833, lng: 78.8667, source: 'https://en.wikipedia.org/wiki/Srisailam' },
  // Mookambika temple town, Udupi district (Wikipedia: Kollur, Udupi district; temple article gives 13.8638, 74.8145).
  kollur: { lat: 13.86389, lng: 74.81389, source: 'https://en.wikipedia.org/wiki/Kollur,_Udupi_district' },
  khandwa: { lat: 21.82, lng: 76.35, source: 'https://en.wikipedia.org/wiki/Khandwa' },
  rudraprayag: { lat: 30.28, lng: 78.98, source: 'https://en.wikipedia.org/wiki/Rudraprayag' },
  uttarkashi: { lat: 30.73, lng: 78.45, source: 'https://en.wikipedia.org/wiki/Uttarkashi' },
  // "Chamoli" in the planner is the district seat Chamoli Gopeshwar (Badrinath's district).
  chamoli: { lat: 30.42, lng: 79.33, source: 'https://en.wikipedia.org/wiki/Gopeshwar' },
  pahalgam: { lat: 34.01, lng: 75.19, source: 'https://en.wikipedia.org/wiki/Pahalgam' },
  pathanamthitta: { lat: 9.2648, lng: 76.787, source: 'https://en.wikipedia.org/wiki/Pathanamthitta' },
  tirumala: { lat: 13.680916, lng: 79.3506, source: 'https://en.wikipedia.org/wiki/Tirumala' },
  chitrakoot: { lat: 25.0, lng: 80.83, source: 'https://en.wikipedia.org/wiki/Chitrakoot,_Madhya_Pradesh' },
};
