import { describe, it, expect } from 'vitest';
import { COMPANY, operatedByLine, postalContactLine } from '../lib/company';

describe('company helpers', () => {
  it('exposes the brand name and domain', () => {
    expect(COMPANY.brand).toBe('Darshya');
    expect(COMPANY.domain).toBe('darshya.online');
  });

  it('falls back to a non-corporate operatedBy line when not incorporated', () => {
    expect(operatedByLine()).toContain('independently-operated');
    expect(operatedByLine()).toContain(COMPANY.supportEmail);
  });

  it('returns null for postal contact when not incorporated', () => {
    expect(postalContactLine()).toBeNull();
  });

  it('keeps refund policy values stable', () => {
    expect(COMPANY.refunds.freeCancellationHoursBeforeService).toBe(24);
    expect(typeof COMPANY.refunds.refundSettlementDays).toBe('string');
  });
});
