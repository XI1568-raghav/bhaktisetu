/**
 * Gaushala donations are collected by Darshya and sent on by hand. This screen
 * shows what each gaushala is owed and records the transfer (with its UTR).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({ useAuth: () => ({ session: { accessToken: 't' } }) }));
import AdminGaushalaDisbursementsPage from '../app/admin/gaushala-disbursements/page';

const U = '96fcee5a-a89f-434b-8905-14a484a62f02';
const ROW = {
  gaushalaUserId: U, name: 'Ram Gaushala', donationsCount: 2, paidInr: 1002, disbursedInr: 500, owedInr: 502,
  payTo: { holderName: 'Ram Trust', accountNumber: '123456789012', ifsc: 'HDFC0001234' },
};
const SETTLED = { ...ROW, gaushalaUserId: 'other', name: 'Paid Up Gaushala', disbursedInr: 1002, owedInr: 0 };
const res = (b: unknown, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(b), json: async () => b }) as unknown as Response;

function mock(rows: unknown[], post?: () => Response) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if ((init?.method ?? 'GET') === 'POST') return post ? post() : res({ ok: true, id: 'd1', owedInr: 0 });
    return res({ gaushalas: rows });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}
beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('admin gaushala disbursements page', () => {
  it('shows each gaushala with what is owed and where to send it', async () => {
    mock([ROW]);
    render(<AdminGaushalaDisbursementsPage />);
    await screen.findByText('Ram Gaushala');
    expect(screen.getByText(/502\.00/)).toBeTruthy();
    expect(screen.getByText('123456789012')).toBeTruthy();
    expect(screen.getByText('HDFC0001234')).toBeTruthy();
  });

  it('warns when there are no bank details on file', async () => {
    mock([{ ...ROW, payTo: null }]);
    render(<AdminGaushalaDisbursementsPage />);
    await screen.findByText('Ram Gaushala');
    expect(screen.getByText(/no bank details on file/i)).toBeTruthy();
  });

  it('only offers to record a transfer where something is owed', async () => {
    mock([ROW, SETTLED]);
    render(<AdminGaushalaDisbursementsPage />);
    await screen.findByText('Paid Up Gaushala');
    expect(screen.getAllByRole('button', { name: /record transfer/i })).toHaveLength(1);
  });

  it('will not submit without a transfer reference', async () => {
    const fn = mock([ROW]);
    render(<AdminGaushalaDisbursementsPage />);
    await screen.findByText('Ram Gaushala');
    fireEvent.click(screen.getByRole('button', { name: /record transfer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /confirm transfer/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/reference/i);
    expect(fn.mock.calls.some((c) => (c[1] as RequestInit | undefined)?.method === 'POST')).toBe(false);
  });

  it('posts the owed amount and reference, then refreshes', async () => {
    const fn = mock([ROW]);
    render(<AdminGaushalaDisbursementsPage />);
    await screen.findByText('Ram Gaushala');
    fireEvent.click(screen.getByRole('button', { name: /record transfer/i }));
    fireEvent.change(await screen.findByLabelText(/reference/i), { target: { value: 'UTR998877' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm transfer/i }));
    await waitFor(() => expect(fn.mock.calls.some((c) => (c[1] as RequestInit | undefined)?.method === 'POST')).toBe(true));
    const call = fn.mock.calls.find((c) => (c[1] as RequestInit | undefined)?.method === 'POST')!;
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ gaushalaUserId: U, amountInr: 502, reference: 'UTR998877' });
  });

  it('shows the server sentence when the transfer is refused', async () => {
    mock([ROW], () => res({ error: 'Only ₹102.00 is owed to this gaushala; that is more than was received in donations.' }, 409));
    render(<AdminGaushalaDisbursementsPage />);
    await screen.findByText('Ram Gaushala');
    fireEvent.click(screen.getByRole('button', { name: /record transfer/i }));
    fireEvent.change(await screen.findByLabelText(/reference/i), { target: { value: 'UTR1234' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm transfer/i }));
    expect(await screen.findByText(/Only ₹102\.00 is owed/)).toBeTruthy();
  });

  it('says plainly when nothing has been donated yet', async () => {
    mock([]);
    render(<AdminGaushalaDisbursementsPage />);
    expect(await screen.findByText(/no gaushala donations yet/i)).toBeTruthy();
  });
});
