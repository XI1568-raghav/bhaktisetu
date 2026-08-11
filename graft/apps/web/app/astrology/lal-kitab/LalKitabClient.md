# apps\web\app\astrology\lal-kitab\LalKitabClient.tsx

- Mode · type · L11-L11 — Union type distinguishing the two lookup modes — diagnosing remedies by life problem versus browsing by graha.
- LalKitabClient · function · L19-L101 — Top-level client component that holds the selected mode/problem/graha state, memoizes the Lal Kitab diagnosis lookups, and switches between the problem-driven and graha-driven remedy views.
- ProblemView · function · L103-L163 — Renders the diagnosis for a chosen life problem: which grahas traditionally trigger it, each graha's universal Farman, and house-specific warnings with targeted remedies when the graha occupies a troubling house.
- GrahaView · function · L165-L209 — Renders a single graha's profile, its universal Farman, and a color-coded 12-house grid so users can find where the planet sits in their kundli and apply the matching house-specific remedy.
