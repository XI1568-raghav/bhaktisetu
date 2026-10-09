import type { EnrichmentSet } from './types';
import { ENRICH_DEITIES_A } from './deities-a';
import { ENRICH_DEITIES_B } from './deities-b';

export const ENRICH_DEITIES: EnrichmentSet = { ...ENRICH_DEITIES_A, ...ENRICH_DEITIES_B };
