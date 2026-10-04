/**
 * `GET /api/v1/wellness/sessions/mine` — the instructor's OWN classes.
 *
 * WHY NOT THE PUBLIC LIST
 * -----------------------
 * `app/(wellness)/sessions.tsx` and `app/(wellness)/dashboard.tsx` both called
 * `useWellnessSessions()` → `GET /api/v1/wellness/sessions`, which is the
 * DEVOTEE catalogue:
 *
 *     where: { scheduledAt: { gte: new Date() },
 *              status: { in: ['SCHEDULED', 'LIVE'] } }
 *
 * so an instructor's completed, cancelled and simply-past classes did not exist
 * on the screen titled "My Sessions" — a class taught yesterday vanished from
 * the teacher's own record of their work the morning after. The screens then
 * narrowed the global list client-side with
 *
 *     allSessions.filter((s) => !s.instructorId || s.instructorId === user.id)
 *
 * whose first clause keeps every row whose `instructorId` is missing for any
 * reason, i.e. another instructor's class counted as one of "yours". The
 * catalogue handler also strips `roomUrl` before answering (`publicSession()`),
 * which is why the Set Room URL button could never say whether a link was
 * already set.
 *
 * `GET /sessions/mine` is the instructor-scoped read: role-gated, every status,
 * every date, `roomUrl` intact, and a real paid `enrolled` count per row. No
 * client-side ownership filter is needed or wanted — the server already did it.
 */

export interface InstructorSessionVM {
  id: string;
  title: string;
  description: string | null;
  type: string | null;
  status: string | null;
  scheduledAt: string | null;
  durationMinutes: number | null;
  capacity: number | null;
  /** Rupees. `0` is a genuinely free class, `null` is "not readable". */
  priceInr: number | null;
  /** The Jitsi/Zoom link, present only on this instructor-scoped read. */
  roomUrl: string | null;
  /** PAID + ATTENDED enrollments, counted by the server. */
  enrolled: number | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * `null` — not `[]` — when the payload is not `{data: [...]}`. "You have no
 * classes" is a claim this screen may only make when the server said so.
 */
export function selectInstructorSessions(payload: unknown): InstructorSessionVM[] | null {
  if (!isRecord(payload)) return null;
  if (!Array.isArray(payload.data)) return null;
  return payload.data
    .filter(isRecord)
    .map((s): InstructorSessionVM | null => {
      const id = str(s.id);
      const title = str(s.title);
      if (!id || !title) return null;
      return {
        id,
        title,
        description: str(s.description),
        type: str(s.type),
        status: str(s.status),
        scheduledAt: str(s.scheduledAt),
        durationMinutes: num(s.durationMinutes),
        capacity: num(s.capacity),
        priceInr: num(s.priceInr),
        roomUrl: str(s.roomUrl),
        enrolled: num(s.enrolled),
      };
    })
    .filter((s): s is InstructorSessionVM => s !== null);
}

/** Still to come: SCHEDULED or LIVE, and dated now or later. */
export function upcomingSessions(
  rows: InstructorSessionVM[],
  now: number = Date.now(),
): InstructorSessionVM[] {
  return rows
    .filter((s) => {
      const status = (s.status ?? '').toUpperCase();
      if (status === 'COMPLETED' || status === 'CANCELLED') return false;
      if (!s.scheduledAt) return true;
      const t = new Date(s.scheduledAt).getTime();
      return Number.isNaN(t) ? true : t >= now;
    })
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
}

/**
 * Seats actually sold across every listed class — the server's own `enrolled`
 * counts, summed. Rows whose count could not be read are skipped rather than
 * treated as zero, and `null` is returned when NONE could be read, so the card
 * shows a dash instead of a confident 0.
 */
export function totalEnrolled(rows: InstructorSessionVM[]): number | null {
  const known = rows.filter((s) => s.enrolled !== null);
  if (known.length === 0) return null;
  return known.reduce((a, s) => a + (s.enrolled ?? 0), 0);
}
