// scripts/agents/roadmap/_signal-context.mjs
// Compresses ARE state (items + kpis + queue + budgets + tripwires) into the
// Decision Agent input shape per spec §7.

function countBy(arr, key) {
  return arr.reduce((acc, x) => {
    const k = x[key];
    if (k == null) return acc;
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

// Normalize raw budget snapshot into shape tripwires expect.
// Raw: { ghMinutes: { used, cap }, cfBuilds: { used, cap }, ... }
// Out: { ghMinutesMonth: { used, cap, pct }, cfBuildsMonth: { ... }, renderHoursMonth: { ... } }
function normalizeBudget(rawBudget) {
  if (!rawBudget) return {};
  const norm = { ...rawBudget };
  if (rawBudget.ghMinutes) {
    norm.ghMinutesMonth = {
      ...rawBudget.ghMinutes,
      pct: rawBudget.ghMinutes.cap ? (rawBudget.ghMinutes.used / rawBudget.ghMinutes.cap) * 100 : 0,
    };
  }
  if (rawBudget.cfBuilds) {
    norm.cfBuildsMonth = {
      ...rawBudget.cfBuilds,
      pct: rawBudget.cfBuilds.cap ? (rawBudget.cfBuilds.used / rawBudget.cfBuilds.cap) * 100 : 0,
    };
  }
  if (rawBudget.renderHours) {
    norm.renderHoursMonth = {
      ...rawBudget.renderHours,
      pct: rawBudget.renderHours.cap ? (rawBudget.renderHours.used / rawBudget.renderHours.cap) * 100 : 0,
    };
  } else if (!norm.renderHoursMonth) {
    // Default — Render free tier 750 hrs/mo, no tracking yet
    norm.renderHoursMonth = { used: 0, cap: 750, pct: 0 };
  }
  return norm;
}

export function buildSignalContext({
  items,
  kpis,
  queue,
  tripwiresFired,
  budgets,
  founderState,
  external,
  sectorSummaries,
  now = Date.now(),
}) {
  const nowDate = new Date(now);

  const readyToShip = items
    .filter((i) => i.status === 'planned' && i.agent_assignable && !i.founder_blocker)
    .filter((i) =>
      (i.depends_on || []).every((dep) => {
        const depItem = items.find((x) => x.id === dep);
        return depItem?.status === 'verified';
      }),
    )
    .sort(
      (a, b) =>
        b.revenue_impact.amount_inr / b.est_hours -
        a.revenue_impact.amount_inr / a.est_hours,
    )
    .slice(0, 20)
    .map((i) => i.id);

  const founderBlocked = items
    .filter((i) => i.founder_blocker)
    .map((i) => ({
      itemId: i.id,
      blocker: i.founder_blocker,
      daysOpen: Math.floor((now - new Date(i.created_at).getTime()) / 86400000),
    }));

  const kpisKeyed = kpis.reduce((acc, k) => {
    acc[k.metric] = k;
    return acc;
  }, {});

  const queueOldestAgeHours = queue.length
    ? Math.max(...queue.map((q) => (now - new Date(q.emittedAt).getTime()) / 3600000))
    : 0;

  return {
    cycle: {
      ts: nowDate.toISOString(),
      dayOfMonth: nowDate.getUTCDate(),
      dayOfWeek: nowDate.getUTCDay(),
    },
    budget: normalizeBudget(budgets),
    kpis: kpisKeyed,
    items: {
      totalCount: items.length,
      byStatus: countBy(items, 'status'),
      byCategory: countBy(items, 'category'),
      byPriority: countBy(items, 'priority'),
      byOwnerRole: countBy(items, 'owner_role'),
      tripwireHits: tripwiresFired.filter((t) => t.itemId),
      readyToShip,
      founderBlocked,
    },
    queue: {
      depth: queue.length,
      oldestAgeHours: queueOldestAgeHours,
      byRole: countBy(queue, 'role'),
    },
    verticals: external?.verticals || {},
    sectorDocs: sectorSummaries || {},
    founderState: founderState || {},
    external: external || {},
    firedTripwires: tripwiresFired,
  };
}
