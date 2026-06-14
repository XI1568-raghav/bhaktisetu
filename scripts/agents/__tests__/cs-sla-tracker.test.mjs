import { describe, it, expect } from 'vitest';
import { computeSla, percentile } from '../cs-sla-tracker.mjs';

const HOUR = 60 * 60 * 1000;
const MIN = 60 * 1000;

describe('percentile', () => {
  it('returns null on empty', () => {
    expect(percentile([], 50)).toBe(null);
  });
  it('returns the single element', () => {
    expect(percentile([42], 50)).toBe(42);
  });
  it('computes p50 of [10,20,30,40,50]', () => {
    expect(percentile([10, 20, 30, 40, 50], 50)).toBe(30);
  });
  it('computes p90 of [10,20,30,40,50,60,70,80,90,100]', () => {
    expect(percentile([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 90)).toBe(91);
  });
});

describe('computeSla', () => {
  const NOW = Date.parse('2026-06-14T12:00:00Z');

  it('returns zero cohort when no tickets', () => {
    const snap = computeSla([], { nowMs: NOW });
    expect(snap.cohort).toBe(0);
    expect(snap.overall.p50).toBe(null);
    expect(snap.overall.sample).toBe(0);
  });

  it('ignores tickets older than the window', () => {
    const tickets = [
      {
        id: 'old',
        text: 'x',
        channel: 'email',
        receivedAt: new Date(NOW - 30 * 24 * HOUR).toISOString(),
        firstResponseAt: new Date(NOW - 30 * 24 * HOUR + 60 * MIN).toISOString(),
      },
    ];
    expect(computeSla(tickets, { nowMs: NOW, windowDays: 7 }).cohort).toBe(0);
  });

  it('classifies channel aliases', () => {
    const tickets = [
      { id: 'a', text: 'x', channel: 'wa', receivedAt: new Date(NOW - 2 * HOUR).toISOString(), firstResponseAt: new Date(NOW - HOUR).toISOString() },
      { id: 'b', text: 'x', channel: 'resend', receivedAt: new Date(NOW - 3 * HOUR).toISOString(), firstResponseAt: new Date(NOW - HOUR).toISOString() },
      { id: 'c', text: 'x', channel: 'livechat', receivedAt: new Date(NOW - 4 * HOUR).toISOString(), firstResponseAt: new Date(NOW - HOUR).toISOString() },
    ];
    const snap = computeSla(tickets, { nowMs: NOW });
    expect(snap.byChannel.whatsapp.sample).toBe(1);
    expect(snap.byChannel.email.sample).toBe(1);
    expect(snap.byChannel.chat.sample).toBe(1);
  });

  it('counts pending tickets when firstResponseAt missing', () => {
    const tickets = [
      { id: 'p1', text: 'x', channel: 'email', receivedAt: new Date(NOW - HOUR).toISOString() },
      { id: 'p2', text: 'x', channel: 'whatsapp', receivedAt: new Date(NOW - 30 * MIN).toISOString() },
    ];
    const snap = computeSla(tickets, { nowMs: NOW });
    expect(snap.overall.pending).toBe(2);
    expect(snap.overall.sample).toBe(0);
    expect(snap.byChannel.email.pending).toBe(1);
    expect(snap.byChannel.whatsapp.pending).toBe(1);
  });

  it('computes p50 and met_sla against the 120-minute target', () => {
    // 5 tickets responded: 30m, 60m, 90m, 180m, 240m → p50=90m (≤120 = met)
    const make = (id, recvMinAgo, respMinAfter) => ({
      id,
      text: 'x',
      channel: 'email',
      receivedAt: new Date(NOW - recvMinAgo * MIN).toISOString(),
      firstResponseAt: new Date(NOW - recvMinAgo * MIN + respMinAfter * MIN).toISOString(),
    });
    const tickets = [
      make('a', 360, 30),
      make('b', 300, 60),
      make('c', 240, 90),
      make('d', 180, 180),
      make('e', 120, 240),
    ];
    const snap = computeSla(tickets, { nowMs: NOW });
    expect(snap.overall.sample).toBe(5);
    expect(snap.overall.p50).toBe(90);
    expect(snap.overall.met_sla).toBe(3); // 30, 60, 90 ≤ 120
    expect(snap.overall.sla_target_minutes).toBe(120);
  });

  it('skips tickets with firstResponseAt before receivedAt', () => {
    const tickets = [
      {
        id: 'bad',
        text: 'x',
        channel: 'email',
        receivedAt: new Date(NOW - HOUR).toISOString(),
        firstResponseAt: new Date(NOW - 2 * HOUR).toISOString(),
      },
    ];
    const snap = computeSla(tickets, { nowMs: NOW });
    // bad timestamp -> not counted in sample, but still cohort-eligible (within window)
    expect(snap.cohort).toBe(1);
    expect(snap.overall.sample).toBe(0);
  });
});
