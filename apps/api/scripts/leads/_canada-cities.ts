/**
 * Canada lead-gen city tier. R-Q3-S-007 cycle slice.
 *
 * Brampton hard floor ≥ 2 per Statistics Canada Punjabi+Hindu density (2021 census).
 * Surrey = Vancouver-area overflow (Lower Mainland).
 */

export interface CanadaCity {
  city: string;
  province: string;
  country: 'CA';
  tier: 1 | 2;
  rationale: string;
}

export const CANADA_PANDIT_CITIES: CanadaCity[] = [
  {
    city: 'Toronto',
    province: 'ON',
    country: 'CA',
    tier: 1,
    rationale: 'Largest GTA Hindu diaspora — ISKCON, BAPS, Vishnu Mandir hubs.',
  },
  {
    city: 'Brampton',
    province: 'ON',
    country: 'CA',
    tier: 1,
    rationale:
      'Highest Punjabi+Hindu density in Canada (Stats Canada 2021). Hard floor ≥ 2 per spec.',
  },
  {
    city: 'Mississauga',
    province: 'ON',
    country: 'CA',
    tier: 1,
    rationale: 'GTA adjacent — Hindu Heritage Centre + Hindu Sabha bridge.',
  },
  {
    city: 'Vancouver',
    province: 'BC',
    country: 'CA',
    tier: 1,
    rationale: 'BC Hindu+Punjabi base, ISKCON Vancouver + Vishwa Hindu.',
  },
  {
    city: 'Surrey',
    province: 'BC',
    country: 'CA',
    tier: 2,
    rationale: 'Vancouver overflow — BAPS Surrey, Lakshmi Narayan temple.',
  },
];

export const CANADA_CITY_NAMES: ReadonlyArray<string> = CANADA_PANDIT_CITIES.map(
  (c) => c.city,
);
