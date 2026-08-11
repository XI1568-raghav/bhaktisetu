# apps\web\components\home\StickyAartiCta.tsx

- AartiSlot · type · L7-L7 — Describes one daily aarti ceremony by its display label and IST start time.
- nowInIST · function · L19-L33 — Reconstructs the current wall-clock time in Asia/Kolkata so aarti countdowns are correct regardless of the visitor's local timezone.
- get · function · L31-L31 — Extracts a single numeric date/time field from the Intl formatter parts.
- nextAartiFrom · function · L35-L48 — Determines which aarti comes next after a given time, rolling over to tomorrow's first slot once the day's last aarti has passed.
- formatCountdown · function · L50-L57 — Converts a millisecond duration into a zero-padded HH:MM:SS countdown string for display.
- pad · function · L55-L55 — Zero-pads a number to two digits for the countdown display.
- StickyAartiCta · function · L59-L159 — Renders the sticky aarti countdown pill, recomputing the next aarti and remaining time every second while the tab is visible.
- onScroll · function · L76-L78 — Reveals the CTA only once the user has scrolled past the 800px threshold.
- start · function · L87-L90 — Starts the one-second countdown tick interval, guarding against duplicate timers.
- stop · function · L91-L96 — Clears the countdown tick interval when the tab is hidden to avoid battery drain.
- onVisibility · function · L97-L100 — Pauses the countdown timer when the tab is hidden and resumes it when visible again.
- handleDismiss · function · L117-L126 — Dismisses the CTA for the rest of the browser session by persisting a flag in sessionStorage.
