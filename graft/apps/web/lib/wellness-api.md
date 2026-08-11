# apps\web\lib\wellness-api.ts

- WellnessStudentSession · interface · L8-L12 — Shape of the most recent session embedded in a student row, with scheduledAt as an ISO string because Prisma DateTimes serialize to JSON strings.
- WellnessStudent · interface · L14-L23 — One row of the teacher-facing student roster: contact info, enrollment count, last session, and an attendance flag collapsed from raw enrollments by the backend.
- authHeaders · function · L27-L29 — Builds the Authorization bearer header only when a token exists, so callers can pass an optional token without branching themselves.
- describeFailure · function · L31-L39 — Turns a failed HTTP response into a useful error message by pulling the server's `message`/`error` detail out of the body, degrading gracefully to just the status code when the body isn't JSON.
- getMyStudents · function · L43-L52 — Fetches the authenticated teacher's wellness student roster from /wellness-portal/students, throwing a described error on failure and defaulting to an empty list.
- WellnessSessionType · type · L59-L59 — Enumerates the wellness disciplines a session can be categorized under (yoga, meditation, vipassana, pranayama, other).
- WellnessSessionStatus · type · L60-L60 — Enumerates the lifecycle states of a wellness session from scheduled through live to completed or cancelled.
- WellnessSession · interface · L62-L77 — Client mirror of a wellness session record; notably priceInr is a string because Prisma Decimals serialize as strings and must be Number()-ed before arithmetic.
- CreateWellnessSessionInput · interface · L79-L87 — Fields required to schedule a new wellness session, with priceInr as a number on input even though it comes back as a string.
- UpdateWellnessSessionInput · type · L89-L91 — Patch payload for a session: any subset of the create fields plus an optional status transition.
- listMySessions · function · L93-L100 — Fetches the sessions owned by the authenticated instructor from /wellness/sessions/mine.
- createWellnessSession · function · L102-L114 — POSTs a new wellness session and returns the created record, surfacing server error detail on failure.
- updateWellnessSession · function · L116-L129 — PATCHes arbitrary fields (including status) on an existing session and returns the updated record.
- deleteWellnessSession · function · L131-L140 — DELETEs a session by id, throwing a described error if the server rejects it.
- setWellnessSessionRoom · function · L145-L158 — Wires the previously unreachable /sessions/:id/room endpoint so an instructor can attach a Jitsi live-class room URL to a session from the UI.
