# apps\web\lib\vastu.ts

- Direction · type · L6-L6 — Enumerates the eight compass directions (dishas) used as the placement vocabulary for all Vastu scoring.
- Disha · type · L8-L17 — Describes one compass direction's shastric attributes — deity, planet, element, and auspiciousness — used to explain why a placement scores well or badly.
- RoomType · type · L30-L45 — Enumerates the fifteen room/structure types whose placement can be evaluated for Vastu compliance.
- RoomDef · type · L47-L55 — Defines a room's placement rule: which directions are ideal, acceptable, or strictly avoided, plus the shastric justification shown to users.
- Placement · type · L75-L84 — Holds the scored outcome for one room's chosen direction, including 0–100 score, verdict tier, and human-readable reasoning.
- VastuResult · type · L86-L94 — Aggregates all room placements into an overall house Vastu verdict with mean score, strengths, and doshas needing correction.
- VastuInput · type · L96-L99 — Captures the user's house facing direction and chosen direction per room as the input to Vastu scoring.
- getDisha · function · L101-L103 — Looks up a direction's full shastric metadata, defaulting safely to North when the code is unknown.
- getRoom · function · L105-L107 — Looks up a room type's placement rules, defaulting safely to the first room when the value is unknown.
- scoreSingle · function · L109-L133 — Converts one room's chosen direction into a 0–100 score, verdict tier, and explanation by checking it against the room's ideal/acceptable/avoid lists.
- computeVastu · function · L135-L179 — Scores every placed room, then derives the whole-house verdict band, strengths list, and dosha list from the mean placement score.
- suggestIdealLayout · function · L182-L186 — Generates a textbook-perfect layout by assigning every room to its first ideal direction for the 'show ideal layout' mode.
