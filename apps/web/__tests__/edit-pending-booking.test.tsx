import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BOOKING_DRAFT_KEY, loadBookingDraft } from '../lib/booking-draft';
import { buildDraftFromBooking, prepareEditPendingBooking, wizardHref, EDIT_UNAVAILABLE } from '../lib/edit-pending-booking';

const pending = {
  id: 'b1',
  status: 'pending_payment',
  scheduledDate: '2026-10-12T00:00:00.000Z',
  scheduledTimeSlot: '06:00',
  templePujaOfferingId: 'off-1',
  devoteeNames: [{ name: 'Nalluru', gotra: 'Kashyapa', nakshatra: 'Rohini' }, 'Second Person'],
  sankalpDetails: 'For health',
  specialInstructions: 'Morning please',
  prasadDeliveryRequested: false,
  temple: { slug: 'iskcon-bangalore' },
  pujaType: { slug: 'rudrabhishek' },
};

const jsonRes = (ok: boolean, body: unknown, status = ok ? 200 : 500) =>
  ({ ok, status, json: async () => body }) as unknown as Response;

beforeEach(() => { window.sessionStorage.clear(); });

describe('buildDraftFromBooking', () => {
  it('rebuilds the wizard draft from an unpaid booking', () => {
    const d = buildDraftFromBooking(pending)!;
    expect(d.slug).toBe('rudrabhishek');
    expect(d.selectedTempleId).toBe('off-1');
    expect(d.selectedDate).toBe('2026-10-12');
    expect(d.selectedSlot).toBe('06:00');
    expect(d.devotees).toEqual([
      { name: 'Nalluru', gotra: 'Kashyapa', nakshatra: 'Rohini' },
      { name: 'Second Person', gotra: '', nakshatra: '' },
    ]);
    expect(d.sankalp).toBe('For health');
    expect(d.currentStep).toBe(0);
    expect(d.agreedTerms).toBe(false); // terms are re-accepted, never carried over
  });
  it('refuses anything that is not unpaid, or that lacks the ids the wizard needs', () => {
    expect(buildDraftFromBooking({ ...pending, status: 'confirmed' })).toBeNull();
    expect(buildDraftFromBooking({ ...pending, templePujaOfferingId: null })).toBeNull();
    expect(buildDraftFromBooking({ ...pending, pujaType: null })).toBeNull();
  });
  it('wizardHref keeps the puja and temple', () => {
    expect(wizardHref('rudrabhishek', 'iskcon-bangalore')).toBe('/pujas/book?slug=rudrabhishek&temple=iskcon-bangalore');
    expect(wizardHref('rudrabhishek')).toBe('/pujas/book?slug=rudrabhishek');
  });
});

describe('prepareEditPendingBooking', () => {
  it('parks the draft, THEN releases the unpaid hold, then returns the wizard link', async () => {
    const calls: string[] = [];
    const f = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? 'GET'} ${url}`);
      if ((init?.method ?? 'GET') === 'GET') {
        return jsonRes(true, { booking: pending });
      }
      // by the time the cancel is sent, the draft must already be saved
      expect(loadBookingDraft('rudrabhishek')).not.toBeNull();
      return jsonRes(true, {});
    });
    const r = await prepareEditPendingBooking('b1', 'tok', 'https://api.test/api/v1', f as unknown as typeof fetch);
    expect(r).toEqual({ ok: true, href: '/pujas/book?slug=rudrabhishek&temple=iskcon-bangalore' });
    expect(calls).toEqual(['GET https://api.test/api/v1/bookings/b1', 'POST https://api.test/api/v1/bookings/b1/cancel']);
  });
  it('does not cancel anything when the booking is not editable', async () => {
    const f = vi.fn(async () => jsonRes(true, { booking: { ...pending, status: 'confirmed' } }));
    const r = await prepareEditPendingBooking('b1', 'tok', 'https://api.test', f as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, message: EDIT_UNAVAILABLE });
    expect(f).toHaveBeenCalledTimes(1);
  });
  it('leaves the booking alone and drops the draft when the release fails', async () => {
    const f = vi.fn(async (_u: string, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'GET' ? jsonRes(true, { booking: pending }) : jsonRes(false, { error: 'nope' }, 409));
    const r = await prepareEditPendingBooking('b1', 'tok', 'https://api.test', f as unknown as typeof fetch);
    expect(r.ok).toBe(false);
    expect(window.sessionStorage.getItem(BOOKING_DRAFT_KEY)).toBeNull();
  });
  it('reports an expired session on 401', async () => {
    const f = vi.fn(async () => jsonRes(false, {}, 401));
    const r = await prepareEditPendingBooking('b1', 'tok', 'https://api.test', f as unknown as typeof fetch);
    expect(r).toEqual({ ok: false, message: 'Your session has expired. Please sign in again.' });
  });
});

vi.mock('../lib/auth-context', () => ({ useAuth: () => ({ session: { accessToken: 'tok' } }) }));

describe('<PendingBookingActions>', () => {
  it('shows Complete payment and Edit details only for an unpaid booking', async () => {
    const { PendingBookingActions } = await import('../components/bookings/PendingBookingActions');
    const { rerender, container } = render(<PendingBookingActions bookingId="b1" status="pending_payment" />);
    expect(screen.getByText('Complete payment').closest('a')!.getAttribute('href')).toBe('/bookings/pay?id=b1');
    expect(screen.getByRole('button', { name: /Edit details/ })).toBeTruthy();
    rerender(<PendingBookingActions bookingId="b1" status="confirmed" />);
    expect(container.textContent).toBe('');
  });
  it('shows the reason when editing is not possible', async () => {
    const { PendingBookingActions } = await import('../components/bookings/PendingBookingActions');
    vi.stubGlobal('fetch', vi.fn(async () => jsonRes(false, {}, 404)));
    render(<PendingBookingActions bookingId="b1" status="pending_payment" />);
    fireEvent.click(screen.getByRole('button', { name: /Edit details/ }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(EDIT_UNAVAILABLE));
    vi.unstubAllGlobals();
  });
});

describe('wiring', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');
  it('the dashboard card renders the actions and the wizard handles a gateway failure', () => {
    expect(read('app/dashboard/page.tsx')).toContain('<PendingBookingActions bookingId={booking.id} status={booking.status} />');
    const wiz = read('app/pujas/book/page.tsx');
    expect(wiz).toContain("PAYMENT_GATEWAY_UNAVAILABLE");
    expect(wiz).toContain('/bookings/pay?id=');
  });
});
