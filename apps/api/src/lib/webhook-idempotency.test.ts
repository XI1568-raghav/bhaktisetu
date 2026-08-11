import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory simulator for the webhook_replay table. Lives at module scope
// so the mocked prisma can mutate it across calls. resetTable() is invoked
// in beforeEach to keep cases isolated.
interface Row {
  id: number;
  provider: string;
  event_id: string;
  processed_at: Date;
}
const table: { rows: Row[]; nextId: number } = { rows: [], nextId: 1 };
function resetTable() {
  table.rows = [];
  table.nextId = 1;
}

const executeRawUnsafe = vi.fn(async (sql: string) => {
  const lowered = sql.toLowerCase();
  if (lowered.includes('create table') || lowered.includes('create index')) {
    return 0;
  }
  // DELETE webhook_replay WHERE processed_at < now() - interval '30 days'
  if (lowered.includes('delete from webhook_replay')) {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const before = table.rows.length;
    table.rows = table.rows.filter((r) => r.processed_at.getTime() >= cutoff);
    return before - table.rows.length;
  }
  return 0;
});

const queryRawUnsafe = vi.fn(async (sql: string, ...params: unknown[]) => {
  const lowered = sql.toLowerCase();
  if (lowered.includes('insert into webhook_replay')) {
    const provider = params[0] as string;
    const eventId = params[1] as string;
    const exists = table.rows.find(
      (r) => r.provider === provider && r.event_id === eventId,
    );
    if (exists) return [];
    const row: Row = {
      id: table.nextId++,
      provider,
      event_id: eventId,
      processed_at: new Date(),
    };
    table.rows.push(row);
    return [{ id: row.id }];
  }
  return [];
});

vi.mock('./prisma.js', () => ({
  prisma: {
    $executeRawUnsafe: executeRawUnsafe,
    $queryRawUnsafe: queryRawUnsafe,
  },
}));

async function loadFresh() {
  vi.resetModules();
  return await import('./webhook-idempotency.js');
}

describe('webhook-idempotency', () => {
  beforeEach(() => {
    resetTable();
    executeRawUnsafe.mockClear();
    queryRawUnsafe.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('first call for a (provider, eventId) returns alreadyProcessed=false', async () => {
    const { checkAndRecord, _resetTableEnsuredForTests } = await loadFresh();
    _resetTableEnsuredForTests();
    const result = await checkAndRecord('razorpay', 'evt_abc');
    expect(result.alreadyProcessed).toBe(false);
    expect(table.rows.length).toBe(1);
  });

  it('second call for same (provider, eventId) returns alreadyProcessed=true', async () => {
    const { checkAndRecord, _resetTableEnsuredForTests } = await loadFresh();
    _resetTableEnsuredForTests();
    await checkAndRecord('razorpay', 'evt_abc');
    const second = await checkAndRecord('razorpay', 'evt_abc');
    expect(second.alreadyProcessed).toBe(true);
    expect(table.rows.length).toBe(1);
  });

  it('different providers with the same id are independent', async () => {
    const { checkAndRecord, _resetTableEnsuredForTests } = await loadFresh();
    _resetTableEnsuredForTests();
    // The dedupe key is (provider, eventId), not eventId alone. Razorpay is the
    // only provider in the union since Stripe was removed (2026-08-11), so the
    // second provider is cast — this asserts the composite key still holds for
    // whichever gateway is added next, which is the property worth locking.
    const r1 = await checkAndRecord('razorpay', 'evt_shared');
    const r2 = await checkAndRecord('future_gateway' as never, 'evt_shared');
    expect(r1.alreadyProcessed).toBe(false);
    expect(r2.alreadyProcessed).toBe(false);
    expect(table.rows.length).toBe(2);
  });

  it('different ids for the same provider are independent', async () => {
    const { checkAndRecord, _resetTableEnsuredForTests } = await loadFresh();
    _resetTableEnsuredForTests();
    const r1 = await checkAndRecord('razorpay', 'evt_one');
    const r2 = await checkAndRecord('razorpay', 'evt_two');
    expect(r1.alreadyProcessed).toBe(false);
    expect(r2.alreadyProcessed).toBe(false);
    expect(table.rows.length).toBe(2);
  });

  it('sweep deletes rows older than 30 days, keeps fresh rows', async () => {
    const { checkAndRecord, sweepOldRows, _resetTableEnsuredForTests } = await loadFresh();
    _resetTableEnsuredForTests();

    // Insert two rows, one fresh, one stale.
    await checkAndRecord('razorpay', 'evt_fresh');
    await checkAndRecord('razorpay', 'evt_stale');
    expect(table.rows.length).toBe(2);

    // Backdate one row to 31 days ago.
    const stale = table.rows.find((r) => r.event_id === 'evt_stale');
    expect(stale).toBeDefined();
    if (stale) {
      stale.processed_at = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    }

    const result = await sweepOldRows();
    expect(result.deleted).toBe(1);
    expect(table.rows.length).toBe(1);
    expect(table.rows[0]?.event_id).toBe('evt_fresh');
  });
});
