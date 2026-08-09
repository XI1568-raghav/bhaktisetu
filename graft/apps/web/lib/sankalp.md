# apps\web\lib\sankalp.ts

- Gotra · interface · L5-L10 — Describes a gotra (rishi lineage) option the user can select so the sankalp can name their ancestral line.
- SankalpIntent · interface · L30-L36 — Describes a selectable vow purpose, pairing its Sanskrit intent phrase with recommended pujas for that goal.
- approximateTithi · function · L124-L129 — Approximates the lunar tithi name and paksha (bright/dark fortnight) from a calendar date so the sankalp can cite the ritual time without a full ephemeris.
- approximateMasa · function · L131-L133 — Maps a date's calendar month to the approximate Hindu lunar month name used in the sankalp.
- vaaraName · function · L135-L137 — Maps a date's weekday to its Sanskrit vaara name for recitation in the sankalp.
- SankalpInput · interface · L139-L147 — Collects the user-supplied details (name, gotra, city, intent, date, optional nakshatra/rashi) needed to personalize a sankalp.
- SankalpOutput · interface · L149-L153 — Bundles the three rendered forms of a generated sankalp: full Sanskrit, IAST transliteration, and English.
- getGotra · function · L155-L157 — Looks up a gotra record by slug so the builder can insert the correct lineage name.
- getIntent · function · L159-L161 — Looks up an intent record by slug so the builder can insert the correct Sanskrit vow phrase.
- buildSankalp · function · L163-L200 — Composes the complete personalized sankalp text in Sanskrit, IAST, and English by weaving the user's identity, place, intent, and computed ritual time into the traditional recitation template.
- transliterateMasa · function · L202-L209 — Converts a Devanagari month name to its IAST transliteration for the romanized rendering.
- transliteratePaksha · function · L210-L212 — Converts a Devanagari paksha name to its IAST transliteration for the romanized rendering.
- transliterateTithi · function · L213-L221 — Converts a Devanagari tithi name to its IAST transliteration for the romanized rendering.
