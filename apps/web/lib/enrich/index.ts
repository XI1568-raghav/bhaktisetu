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
import { ENRICH_PURANAS } from './puranas';
import { ENRICH_ASHTALAKSHMI } from './ashtalakshmi';
import { ENRICH_ADITYAS } from './adityas';
import { ENRICH_MOUNTAINS } from './mountains';
import { ENRICH_JYOTIRLINGAS } from './jyotirlingas';
import { ENRICH_NAVADURGA } from './navadurga';
import { ENRICH_PHILOSOPHIES } from './philosophies';
import { ENRICH_MATRUKA } from './matruka';
import { ENRICH_TREES } from './trees';
import { ENRICH_RIVERS } from './rivers';
import { ENRICH_BHOOTA } from './bhoota';

export type { Enrichment, EnrichmentSet } from './types';

export const ENRICHMENT: Record<
  'deities' | 'festivals' | 'tithis' | 'cities' | 'nakshatras' | 'ekadashis' | 'shaktipeeths' | 'yogas' | 'karanas' | 'shlokas' | 'masas' | 'samskaras' | 'rudrakshas' | 'puranas' | 'ashtalakshmi' | 'adityas' | 'mountains' | 'jyotirlingas' | 'navadurga' | 'philosophies' | 'matruka' | 'trees' | 'rivers' | 'bhoota',
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
  puranas: ENRICH_PURANAS,
  ashtalakshmi: ENRICH_ASHTALAKSHMI,
  adityas: ENRICH_ADITYAS,
  mountains: ENRICH_MOUNTAINS,
  jyotirlingas: ENRICH_JYOTIRLINGAS,
  navadurga: ENRICH_NAVADURGA,
  philosophies: ENRICH_PHILOSOPHIES,
  matruka: ENRICH_MATRUKA,
  trees: ENRICH_TREES,
  rivers: ENRICH_RIVERS,
  bhoota: ENRICH_BHOOTA,
};
