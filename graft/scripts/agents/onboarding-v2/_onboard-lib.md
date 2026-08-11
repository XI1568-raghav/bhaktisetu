# scripts\agents\onboarding-v2\_onboard-lib.mjs

Shared helper library for the onboarding-fleet v2 agent scripts, providing persistent contact/touch state, day-threshold scheduling guards, role filtering, dated report writing, and template rendering.

- loadState · function · L7-L11 — Loads the persisted onboarding state from disk, falling back to an empty state when the file is missing or corrupt so runs never crash on bad state.
- saveState · function · L13-L16 — Persists onboarding state to disk while stamping lastRun with the current time so subsequent runs know when the fleet last executed.
- isoToday · function · L18-L20 — Returns today's date as an ISO YYYY-MM-DD string for naming daily report files.
- daysSince · function · L22-L25 — Computes whole days elapsed since a given ISO timestamp, used to decide whether a contact is old enough for a scheduled touch.
- shouldFire · function · L27-L31 — Decides whether a scheduled onboarding touch should fire by enforcing that it has not already fired and that the contact has passed the required day threshold.
- markTouch · function · L33-L36 — Records that a given touch has fired for a contact by timestamping it in state, preventing duplicate sends.
- filterByRole · function · L38-L42 — Selects all active contacts of a given role from state so a run only processes the relevant population.
- writeReport · function · L44-L49 — Writes a role-specific onboarding report to a date-stamped markdown file in the agent-reports directory, creating the directory if needed.
- renderTemplate · function · L51-L53 — Fills {{placeholder}} tokens in a message template with supplied variables, leaving unknown tokens intact for visibility.
