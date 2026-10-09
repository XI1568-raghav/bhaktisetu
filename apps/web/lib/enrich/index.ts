import type { EnrichmentSet } from './types';
import { ENRICH_DEITIES } from './deities';
import { ENRICH_FESTIVALS } from './festivals';
import { ENRICH_TITHIS } from './tithis';
import { ENRICH_CITIES } from './cities';
import { ENRICH_NAKSHATRAS } from './nakshatras';
import { ENRICH_EKADASHIS } from './ekadashis';
import { ENRICH_SHAKTIPEETHS } from './shaktipeeths';
import { ENRICH_YOGAS } from './yogas';
import { ENRICH_KARANAS } from './karanas';
import { ENRICH_SHLOKAS } from './shlokas';
import { ENRICH_MASAS } from './masas';
import { ENRICH_SAMSKARAS } from './samskaras';
import { ENRICH_RUDRAKSHAS } from './rudrakshas';

export type { Enrichment, EnrichmentSet } from './types';

export const ENRICHMENT: Record<
  'deities' | 'festivals' | 'tithis' | 'cities' | 'nakshatras' | 'ekadashis' | 'shaktipeeths' | 'yogas' | 'karanas' | 'shlokas' | 'masas' | 'samskaras' | 'rudrakshas',
  EnrichmentSet
> = {
  deities: ENRICH_DEITIES,
  festivals: ENRICH_FESTIVALS,
  tithis: ENRICH_TITHIS,
  cities: ENRICH_CITIES,
  nakshatras: ENRICH_NAKSHATRAS,
  ekadashis: ENRICH_EKADASHIS,
  shaktipeeths: ENRICH_SHAKTIPEETHS,
  yogas: ENRICH_YOGAS,
  karanas: ENRICH_KARANAS,
  shlokas: ENRICH_SHLOKAS,
  masas: ENRICH_MASAS,
  samskaras: ENRICH_SAMSKARAS,
  rudrakshas: ENRICH_RUDRAKSHAS,
};
