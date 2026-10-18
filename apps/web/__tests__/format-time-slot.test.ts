import { describe, it, expect } from 'vitest';
import { formatTime } from '../lib/format-time-slot';

describe('formatTime', () => {
  it('formats a single time', () => {
    expect(formatTime('06:00')).toBe('6:00 AM');
    expect(formatTime('00:30')).toBe('12:30 AM');
    expect(formatTime('13:05:00')).toBe('1:05 PM');
  });
  it('shows the start of a range slot instead of 6:NaN', () => {
    expect(formatTime('06:00-08:00')).toBe('6:00 AM');
    expect(formatTime('6:00 - 8:00')).not.toContain('NaN');
  });
  it('never emits NaN for garbage', () => {
    expect(formatTime('morning')).not.toContain('NaN');
  });
});
