# SEO Wave A: founder spot-check list (2026-10-09)

Enrichment text for 6 sets (deities 73 entries incl. duplicates, festivals 56, tithis 30, cities 29,
nakshatras 27, ekadashis 24) lives in `apps/web/lib/enrich/*.ts` and renders through
`components/seo/EnrichedAbout.tsx`. It was written from tradition and each entry's own data, then gated by
`__tests__/seo/enrichment-quality.test.ts` (coverage, 200+ words, banned claims, near-duplicate check).
The gates cannot check religious accuracy. Please skim the items below. To pull any set from the site
immediately, empty its object (`export const ENRICH_X: EnrichmentSet = {};`): the component renders nothing
for an entry with no text.

## Highest risk (check these first)
- Nakshatra pada naming syllables (Uttara Ashadha, Shravana, Dhanishta, Purva Ashadha, Revati); muhurat groups (is Vishakha "mixed" alongside Krittika?); Panchaka span.
- Tithi categories in the DATA, not the new text: `shukla-panchami`, `shukla-ekadashi`, `krishna-ekadashi` are labelled "bhadra" in `lib/tithis.ts`; the classical scheme differs. New text says sources differ. Consider fixing the data.
- Ekadashi stories: kamada (kept generic), varuthini (boar vs "wild animal"), devshayani, parivartini alt names, papamochani details.
- Festivals: durga-puja history claim, dhanteras Yama folk tale, bonalu origin, raksha-bandhan Karnavati/Humayun legend, tulsi-vivah version, hanuman-jayanti Tamil Nadu (Margazhi/Moola), maha-kumbh cycle description, ahoi-ashtami and thaipusam details.
- Deities: jagannath (Mahaprasad/caste, Nabakalebara), venkateshwara (Kubera loan), dattatreya chants/centres, dhanvantari Kerala shrine names (cut if unsure), narada jayanti tithi, mantras for graha deities (written from memory), Madhvacharya as Vayu's incarnation.
- Cities: Puri (non-Hindu entry hedge), Ujjain (Kal Bhairav offering, Mangalnath), Madurai (six abodes), Rameswaram (22 theerthams), Gaya (Akshayavat), Guruvayur (entry rule), Hyderabad/Pune/Indore/Bhopal/Nagpur/Patna temple details, Ahmedabad temple dates.

## Known text-length note
30 festival entries run 321-364 words (the test only requires 200+). Harmless.

## Data issue found
`lib/deities.ts` lists some slugs twice (e.g. krishna, jagannath, rama) with differing details; the page serves the first match.
