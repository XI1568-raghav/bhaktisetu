/**
 * Turns the raw result of POST /admin/outreach/run into sentences an admin can read.
 * The API returns { firstTouch: {attempted, ok, failed}, followup3day, followup7day,
 * followup14day, durationMs }; the page used to print that object as JSON.
 */
export interface OutreachStageSummary {
  stage: string;
  attempted: number;
  sent: number;
  failed: number;
}

export interface OutreachRunSummary {
  stages: OutreachStageSummary[];
  totalSent: number;
  totalFailed: number;
  durationSeconds: number | null;
  headline: string;
}

const STAGES: Array<[string, string]> = [
  ['firstTouch', 'First email'],
  ['followup3day', 'Follow-up after 3 days'],
  ['followup7day', 'Follow-up after 7 days'],
  ['followup14day', 'Follow-up after 14 days'],
];

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export function summarizeOutreachRun(result: unknown): OutreachRunSummary {
  const r = (result && typeof result === 'object' ? result : {}) as Record<string, unknown>;
  const stages: OutreachStageSummary[] = STAGES.map(([key, stage]) => {
    const s = (r[key] && typeof r[key] === 'object' ? r[key] : {}) as Record<string, unknown>;
    return { stage, attempted: num(s.attempted), sent: num(s.ok), failed: num(s.failed) };
  });
  const totalSent = stages.reduce((n, s) => n + s.sent, 0);
  const totalFailed = stages.reduce((n, s) => n + s.failed, 0);
  const attempted = stages.reduce((n, s) => n + s.attempted, 0);
  const durationSeconds = typeof r.durationMs === 'number' ? Math.round(r.durationMs / 100) / 10 : null;
  const headline =
    attempted === 0
      ? 'Outreach run finished. Nobody was due for an email right now.'
      : `Outreach run finished: ${totalSent} sent, ${totalFailed} failed.`;
  return { stages, totalSent, totalFailed, durationSeconds, headline };
}
