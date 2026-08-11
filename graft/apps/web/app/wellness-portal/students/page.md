# apps\web\app\wellness-portal\students\page.tsx

Wellness portal page that lists a teacher's enrolled students with search, attendance-status filtering, and per-student contact/session details.

- formatDate · function · L23-L30 — Formats an ISO date string into a short Indian-locale display date for enrollment timestamps.
- WellnessStudentsPage · function · L34-L245 — Fetches the authenticated wellness teacher's students and renders them as a searchable list filterable by attendance status (all / attended / enrolled-only).
