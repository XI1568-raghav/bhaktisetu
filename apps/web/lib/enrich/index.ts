import type { EnrichmentSet } from './types';
import { ENRICH_DEITIES } from './deities';
import { ENRICH_FESTIVALS } from './festivals';
import { ENRICH_TITHIS } from './tithis';
import { ENRICH_CITIES } from './cities';
import { ENRICH_NAKSHATRAS } from './nakshatras';
import { ENRICH_EKADASHIS } from './ekadashis';

export type { Enrichment, EnrichmentSet } from './types';

export const ENRICHMENT: Record<
  'deities' | 'festivals' | 'tithis' | 'cities' | 'nakshatras' | 'ekadashis',
  EnrichmentSet
> = {
  deities: ENRICH_DEITIES,
  festivals: ENRICH_FESTIVALS,
  tithis: ENRICH_TITHIS,
  cities: ENRICH_CITIES,
  nakshatras: ENRICH_NAKSHATRAS,
  ekadashis: ENRICH_EKADASHIS,
};
