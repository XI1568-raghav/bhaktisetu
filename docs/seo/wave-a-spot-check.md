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

---

# Wave B (added 2026-10-09)

Sets: shakti peeths (51), shlokas (54), panchang yogas (27), karanas (11), masas (12), samskaras (16), rudrakshas (18).
Sets are removable one by one: empty `ENRICH_*` in `apps/web/lib/enrich/<set>.ts`.
A test now also bans internal-framing phrases ("the data", "this page", "the catalogue") in this text.

## Highest risk
- Shakti peeths: lists of 51 differ across texts; local legends (Tarapith/Bamakhepa, Srisailam, Harsiddhi, Kanyakumari, Vakreshwar); sites outside India described only factually; Ramgiri is described as identified with the Chitrakoot tradition.
- Shlokas: attributions where the source is loose (Sarve Bhavantu, Tvameva Mata, Hanuman Stuti); Sanskrit word glosses; Shankara authorship notes; the Oppenheimer and LIC-motto mentions (from memory).
- Yogas: Sanskrit name meanings are hedged glosses; Shiva yoga (deity Mitra), Indra yoga (deity Pitr), Brahma yoga (deity Ashvini Kumars) have deities differing from the name; rewrites now say "almanacs"/"tradition" in places.
- Karanas: fixed-karana positions (Kintughna in the first half of Shukla Pratipada); word meanings hedged.
- Masas: month-to-nakshatra names, Amanta/Purnimanta placement of Pitru Paksha, Karwa Chauth, Maha Shivaratri, Diwali.
- Samskaras: regional wedding customs; antyeshti and garbhadhana wording (needs a respectful read); pumsavana.
- Rudrakshas: origin legends are folk accounts; no health or outcome claims by design; "sawar means rider" gloss.
- Tithis: the three tithis labelled "bhadra" in lib/tithis.ts; text says classifications differ.

---

# Wave C (added 2026-10-09)

Sets: puranas (18), jyotirlingas (12), sacred mountains (10), navadurga (9), ashta lakshmi (8), sapta matrika (7),
dwadasha adityas (12), pancha bhoota temples (5), hindu philosophies (10), sacred trees (12), sacred rivers (10).
Each set is removable by emptying its `ENRICH_*` object in `apps/web/lib/enrich/<set>.ts`.
Not done (already 170+ words per page or different page shape): chants, upanishads, muhurats, aartis, chalisas, vrats,
tirthas, yatra pages, gita/ramayana/mahabharata chapter pages, vipassana centres, rashi profiles.

## Highest risk
- Jyotirlingas: rival claimants named for Vaidyanath (Parli/Baijnath), Nageshwar (Aundha/Jageshwar), Bhimashankar; Grishneshwar story details; Rameshwar customs.
- Mountains: Mahendragiri lists Parashurama's pupils; Vindhya/Narmada source wording; Meru-bead custom; Palani/Bogar link.
- Puranas: Adi Purana for Brahma; Garuda and Shiva Purana details beyond the fields; Skanda verse count wording.
- Navadurga: the verse naming the nine forms is placed in the Devi Kavacha (hedged); Devi Purana / Siddhidatri claim; Katyayani and the Bhagavata Purana.
- Ashta Lakshmi: list variants (Dhairya/Veera, Jaya/Vijaya, Vidya naming); Veera Lakshmi and Vijayanagara link.
- Adityas: lists of twelve vary; several fields in the source data look dubious (Vivasvan beeja mantra, a "6th century" date, some temple attributions) - consider fixing `lib/dwadasha-aditya.ts`.
- Philosophies: Mimamsa/Dvaita simplifications; Advaita dating avoided.
- Pancha Bhoota: Srikalahasti Kannappa and Rahu-Ketu rites; Jambukeshwarar and Chidambaram legends.
- Rivers: Brahmaputra's mythic parentage; Sindhu/Jhulelal line; Pushkaram cycles.
- Trees: Palash and coconut origin legends flagged as legend; no medicinal or planting claims by design.
