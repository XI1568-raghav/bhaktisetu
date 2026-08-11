# apps\api\src\lib\darshan-schedule.ts

- istMinutes · function · L14-L17 — Converts a timestamp into minutes-since-midnight in IST so all schedule comparisons happen in temple-local time regardless of server timezone.
- parseRange · function · L19-L26 — Parses an 'HH:MM-HH:MM' string into start/end minute offsets, rejecting malformed strings and out-of-range hour/minute values.
- ScheduleSlot · type · L28-L34 — Data holder for one parsed timing window, carrying its display label and a flag marking whether it is a live-streamed aarti slot.
- keyToLabel · function · L36-L41 — Turns a camelCase timing key (e.g. 'sandhyaAarti') into a human-readable label for display in the UI.
- isAartiKey · function · L45-L48 — Classifies a timing key as a live-streamed aarti slot by matching it against known ceremony names (aarti, shej, kakad, dhup, etc.).
- parseSchedule · function · L50-L65 — Builds the sorted list of schedule slots from Temple.timingInfo.regularHours, splitting comma-separated ranges and tagging each slot as aarti or plain darshan.
- LiveStatus · type · L67-L69 — Discriminated union describing whether the temple is currently live (with the active slot and minutes remaining) or offline (with the next aarti and countdown).
- getLiveStatus · function · L71-L101 — Decides whether an aarti window is active right now and computes the next upcoming aarti, wrapping past midnight to tomorrow's first slot when none remain today.
