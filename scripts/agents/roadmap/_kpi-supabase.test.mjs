import { describe, it, expect } from 'vitest';
import { isSelectOnly, scrapeSupabase, classifyQuery, stripSqlComments } from './_kpi-supabase.mjs';

describe('isSelectOnly', () => {
  it('accepts SELECT', () => expect(isSelectOnly('SELECT COUNT(*) FROM foo')).toBe(true));
  it('accepts WITH (CTE)', () => expect(isSelectOnly('WITH x AS (SELECT 1) SELECT * FROM x')).toBe(true));
  it('rejects INSERT', () => expect(isSelectOnly('INSERT INTO foo VALUES (1)')).toBe(false));
  it('rejects DROP', () => expect(isSelectOnly('SELECT 1; DROP TABLE foo')).toBe(false));
  it('rejects DELETE inline', () => expect(isSelectOnly('SELECT * FROM (DELETE FROM foo RETURNING *) x')).toBe(false));
  it('rejects UPDATE', () => expect(isSelectOnly('UPDATE foo SET x=1')).toBe(false));
  it('rejects TRUNCATE', () => expect(isSelectOnly('TRUNCATE foo')).toBe(false));
  it('rejects ALTER', () => expect(isSelectOnly('ALTER TABLE foo ADD x INT')).toBe(false));
  it('rejects GRANT', () => expect(isSelectOnly('GRANT SELECT ON foo TO bar')).toBe(false));
});

describe('scrapeSupabase', () => {
  it('returns stale flag when pool query throws', async () => {
    const fakePool = { query: () => Promise.reject(new Error('conn refused')) };
    const items = [{ kpi: { source: 'supabase', metric: 'foo', query: 'SELECT 1' } }];
    const res = await scrapeSupabase(items, { pool: fakePool });
    expect(res[0]).toMatchObject({ metric: 'foo', stale: true, error: expect.stringMatching(/conn refused/) });
  });

  it('rejects non-SELECT-only query before reaching pool', async () => {
    const fakePool = { query: () => { throw new Error('should not be called'); } };
    const items = [{ kpi: { source: 'supabase', metric: 'bad', query: 'DELETE FROM foo' } }];
    const res = await scrapeSupabase(items, { pool: fakePool });
    expect(res[0]).toMatchObject({ metric: 'bad', stale: true, error: expect.stringMatching(/SELECT-only/) });
  });

  it('returns numeric value on successful query', async () => {
    const fakePool = { query: () => Promise.resolve({ rows: [{ count: 42 }] }) };
    const items = [{ kpi: { source: 'supabase', metric: 'pandit_count', query: 'SELECT COUNT(*) AS count FROM priest' } }];
    const res = await scrapeSupabase(items, { pool: fakePool });
    expect(res[0]).toMatchObject({ metric: 'pandit_count', value: 42, stale: false });
    expect(res[0].fetchedAt).toBeDefined();
  });
});

describe('stripSqlComments', () => {
  it('strips line comments', () => expect(stripSqlComments('SELECT 1 -- DROP TABLE x')).not.toMatch(/DROP/));
  it('strips block comments', () => expect(stripSqlComments('SELECT 1 /* CREATE INDEX */ FROM x')).not.toMatch(/CREATE/));
  it('preserves real SQL', () => expect(stripSqlComments('SELECT count(*) FROM users')).toContain('SELECT'));
});

describe('classifyQuery', () => {
  it('classifies real SELECT as sql', () => expect(classifyQuery('SELECT 1').kind).toBe('sql'));
  it('classifies TBD as unpopulated', () => {
    const c = classifyQuery('TBD-populate-before-orchestrator-go-live');
    expect(c.kind).toBe('unpopulated');
    expect(c.error).toMatch(/unpopulated/);
  });
  it('classifies TODO as unpopulated', () => expect(classifyQuery('TODO: write query').kind).toBe('unpopulated'));
  it('classifies MANUAL as unpopulated', () => expect(classifyQuery('MANUAL: count WA threads').kind).toBe('unpopulated'));
  it('classifies empty as unpopulated', () => expect(classifyQuery('').kind).toBe('unpopulated'));
  it('classifies null as unpopulated', () => expect(classifyQuery(null).kind).toBe('unpopulated'));
  it('classifies manual:docs/... as manual_ref', () => {
    const c = classifyQuery('manual:docs/marketing/csr-match.md#partners-signed');
    expect(c.kind).toBe('manual_ref');
  });
  it('classifies DML as rejected', () => expect(classifyQuery('DELETE FROM x').kind).toBe('rejected'));
  it('classifies SELECT w/ comment containing DROP as sql (comments stripped)', () => {
    expect(classifyQuery('SELECT 1 -- DROP TABLE x').kind).toBe('sql');
  });
});

describe('scrapeSupabase — TBD + manual handling', () => {
  it('emits unpopulated error for TBD query (NOT security-tone "rejected")', async () => {
    const fakePool = { query: () => { throw new Error('should not be called'); } };
    const items = [{ kpi: { source: 'supabase', metric: 'foo', query: 'TBD-populate-before-orchestrator-go-live' } }];
    const res = await scrapeSupabase(items, { pool: fakePool });
    expect(res[0]).toMatchObject({ metric: 'foo', stale: true, error: expect.stringMatching(/unpopulated/) });
    expect(res[0].error).not.toMatch(/SELECT-only/);
  });
  it('emits manual_ref error for manual:docs ref', async () => {
    const fakePool = { query: () => { throw new Error('should not be called'); } };
    const items = [{ kpi: { source: 'supabase', metric: 'bar', query: 'manual:docs/foo.md' } }];
    const res = await scrapeSupabase(items, { pool: fakePool });
    expect(res[0].error).toMatch(/manual KPI/);
  });
});
