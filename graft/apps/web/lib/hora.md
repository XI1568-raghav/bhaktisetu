# apps\web\lib\hora.ts

- Planet · type · L11-L11 — Enumerates the seven Vedic planets that can rule a hora.
- HoraQuality · type · L20-L20 — Classifies a hora as auspicious, neutral, or inauspicious for activity planning.
- Hora · type · L22-L34 — Describes a single planetary hour with its ruling planet, time bounds, auspiciousness, and recommended activities.
- HoraDay · type · L36-L48 — Bundles a full day's 24 horas with sunrise/sunset context and pointers to the current and next auspicious hora.
- parseHHMM · function · L80-L83 — Converts an HH:MM string to minutes-since-midnight for time arithmetic.
- minutesToHHMM · function · L85-L90 — Formats minutes-since-midnight back to HH:MM, wrapping values that spill past midnight (e.g. night horas ending after 24:00).
- HoraInput · type · L92-L98 — Specifies the date, coordinates, timezone, and city needed to compute a day's horas.
- computeHora · function · L100-L175 — Builds all 24 horas for a day by dividing the day and night arcs into twelfths and cycling planets through Chaldean order from the weekday lord, flagging the current hora and the next auspicious one.
