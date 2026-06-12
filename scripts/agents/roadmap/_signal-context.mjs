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

  const fullContext = {
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
      itemIds: queue.map((q) => q.itemId).filter(Boolean),
      queueIds: queue.map((q) => q.queueId).filter(Boolean),
    },
    verticals: external?.verticals || {},
    sectorDocs: sectorSummaries || {},
    founderState: founderState || {},
    external: external || {},
    firedTripwires: tripwiresFired,
  };

  // Fix D: trim when serialized JSON exceeds threshold.
  // Token cost approximation: 1 token ~= 4 chars JSON. Threshold 100KB JSON
  // = ~25k tokens = comfortably under Decision Agent 16k output + 200k input.
  // Drops in priority order:
  //   1. sectorDocs.bySector excerpts (largest contributor, 28 agents × ~2KB)
  //   2. external.experiments.results detail (keep counts only)
  //   3. external.lastAnthropicError truncated to 500 chars
  return trimSignalContext(fullContext);
}

const TRIM_THRESHOLD_BYTES = 100 * 1024;
const TRIM_HARD_CEILING_BYTES = 180 * 1024;

export function trimSignalContext(ctx) {
  let size = JSON.stringify(ctx).length;
  if (size <= TRIM_THRESHOLD_BYTES) return { ...ctx, _trim: { applied: false, originalBytes: size } };

  const trimmed = { ...ctx };
  const trimsApplied = [];

  // Pass 1: drop sectorDocs.bySector excerpts (keep summary counts)
  if (trimmed.sectorDocs?.bySector) {
    const sectorKeys = Object.keys(trimmed.sectorDocs.bySector);
    trimmed.sectorDocs = {
      agentCount: trimmed.sectorDocs.agentCount,
      bySector: sectorKeys.reduce((acc, k) => {
        const v = trimmed.sectorDocs.bySector[k];
        acc[k] = { agentCount: v.agentCount || 0, _excerptDropped: true };
        return acc;
      }, {}),
      _excerptsDropped: true,
    };
    trimsApplied.push('sectorDocs.excerpts');
  }

  size = JSON.stringify(trimmed).length;
  if (size <= TRIM_THRESHOLD_BYTES) {
    return { ...trimmed, _trim: { applied: true, originalBytes: JSON.stringify(ctx).length, trimmedBytes: size, drops: trimsApplied } };
  }

  // Pass 2: drop external.experiments.results detail, keep counts
  if (trimmed.external?.experiments?.results) {
    trimmed.external = {
      ...trimmed.external,
      experiments: {
        experimentCount: trimmed.external.experiments.experimentCount,
        decided: trimmed.external.experiments.decided,
        _resultsDropped: true,
      },
    };
    trimsApplied.push('external.experiments.results');
  }

  // Pass 3: truncate lastAnthropicError to 500 chars
  if (trimmed.external?.lastAnthropicError && typeof trimmed.external.lastAnthropicError === 'string') {
    trimmed.external = {
      ...trimmed.external,
      lastAnthropicError: trimmed.external.lastAnthropicError.slice(0, 500),
    };
    trimsApplied.push('external.lastAnthropicError');
  }

  size = JSON.stringify(trimmed).length;

  // Pass 4 (emergency): drop verticals + founderState if still over hard ceiling
  if (size > TRIM_HARD_CEILING_BYTES) {
    delete trimmed.verticals;
    delete trimmed.founderState;
    trimsApplied.push('verticals+founderState');
    size = JSON.stringify(trimmed).length;
  }

  return {
    ...trimmed,
    _trim: {
      applied: true,
      originalBytes: JSON.stringify(ctx).length,
      trimmedBytes: size,
      drops: trimsApplied,
    },
  };
}
