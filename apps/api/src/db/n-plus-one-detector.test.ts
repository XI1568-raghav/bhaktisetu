// RED: N+1 detector flags > 5 identical SQL templates within single request context.
import { describe, it, expect, vi } from 'vitest';
import {
  runWithRequestScope,
  recordQueryForNPlusOne,
  reportNPlusOne,
  normalizeSql,
} from './n-plus-one-detector.js';

describe('n-plus-one-detector', () => {
  it('normalizeSql strips integer + string params', () => {
    expect(normalizeSql("SELECT * FROM users WHERE id = 42")).toBe(
      'SELECT * FROM users WHERE id = ?',
    );
    expect(normalizeSql("SELECT * FROM x WHERE name = 'alice'")).toBe(
      'SELECT * FROM x WHERE name = ?',
    );
    expect(normalizeSql('SELECT * FROM x WHERE id IN (1, 2, 3)')).toBe(
      'SELECT * FROM x WHERE id IN (?, ?, ?)',
    );
  });

  it('reports nothing when no scope active', () => {
    const warn = vi.fn();
    recordQueryForNPlusOne('SELECT 1');
    reportNPlusOne('/x', { warn });
    expect(warn).not.toHaveBeenCalled();
  });

  it('does NOT warn at 5 or fewer identical templates', async () => {
    const warn = vi.fn();
    await runWithRequestScope(async () => {
      for (let i = 0; i < 5; i++) {
        recordQueryForNPlusOne(`SELECT * FROM users WHERE id = ${i}`);
      }
      reportNPlusOne('/api/v1/foo', { warn });
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns when > 5 identical SQL templates in single request scope', async () => {
    const warn = vi.fn();
    await runWithRequestScope(async () => {
      for (let i = 0; i < 6; i++) {
        recordQueryForNPlusOne(`SELECT * FROM users WHERE id = ${i}`);
      }
      reportNPlusOne('/api/v1/bookings', { warn });
    });
    expect(warn).toHaveBeenCalledTimes(1);
    const [obj, msg] = warn.mock.calls[0]!;
    expect(msg).toBe('n_plus_one_detected');
    expect(obj).toMatchObject({
      route: '/api/v1/bookings',
      template: 'SELECT * FROM users WHERE id = ?',
      count: 6,
    });
  });

  it('scopes are isolated between concurrent requests', async () => {
    const warn = vi.fn();
    await Promise.all([
      runWithRequestScope(async () => {
        for (let i = 0; i < 3; i++) recordQueryForNPlusOne(`SELECT * FROM a WHERE id = ${i}`);
        reportNPlusOne('/a', { warn });
      }),
      runWithRequestScope(async () => {
        for (let i = 0; i < 3; i++) recordQueryForNPlusOne(`SELECT * FROM a WHERE id = ${i}`);
        reportNPlusOne('/b', { warn });
      }),
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('flags multiple templates that each exceed threshold', async () => {
    const warn = vi.fn();
    await runWithRequestScope(async () => {
      for (let i = 0; i < 6; i++) recordQueryForNPlusOne(`SELECT * FROM users WHERE id = ${i}`);
      for (let i = 0; i < 7; i++) recordQueryForNPlusOne(`SELECT * FROM temples WHERE id = ${i}`);
      reportNPlusOne('/api/v1/x', { warn });
    });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
