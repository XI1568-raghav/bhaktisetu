# apps\web\app\astrology\kundli-milan\KundliMilanClient.tsx

- Option · type · L7-L7 — Describes a selectable nakshatra entry (slug value plus display label) used to populate the partner dropdowns.
- Props · type · L8-L8 — Declares the component's input: the list of nakshatra options supplied by the server-rendered parent page.
- KundliMilanClient · function · L18-L301 — Interactive form-and-result component that collects both partners' nakshatras and Manglik status, runs the Ashtakoot guna matching calculation, and presents the score, verdict level, koota table, and dosha (Nadi/Bhakoot/Gana/Manglik) explanations.
- onSubmit · function · L28-L39 — Validates that both nakshatras are chosen, computes the Milan report from the selections, stores it in state, and smooth-scrolls the result panel into view.
- onReset · function · L41-L48 — Clears all form selections, the computed report, and the touched flag so the user can start a fresh match.
- copySummary · function · L58-L61 — Copies a one-line shareable summary of the match result (score, verdict, and site URL) to the user's clipboard.
