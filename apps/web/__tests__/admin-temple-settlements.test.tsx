/**
 * A temple's share of puja bookings and the donations made to it are collected
 * by Darshya and sent on by hand. This screen shows what each temple is owed and
 * where to send it, and records the transfer (with its UTR). It moves no money.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({ useAuth: () => ({ session: { accessToken: 't' } }) }));
import AdminTempleSettlementsPage from '../app/admin/temple-settlements/page';

const T = '56955f8d-1b90-47f5-97ea-f86560cb58fe';
const ROW = {
  templeId: T, name: 'QA Sheetla Mata Mandir',
  pujaShareOwedInr: 100, pujaShareHeldInr: 45.1, pujaShareSentInr: 20,
  donationsCount: 1, donationsPaidInr: 501, donationsSentInr: 0, donationsOwedInr: 501,
  payTo: { holderName: 'Trust', accountNumber: '123456789012', ifsc: 'HDFC0001234' },
};
const res = (b: unknown, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(b), json: async () => b }) as unknown as Response;

function mock(rows: unknown[], post?: () => Response) {
  const fn = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if ((init?.method ?? 'GET') === 'POST') return post ? post() : res({ ok: true });
    return res({ temples: rows });
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}
const posts = (fn: ReturnType<typeof mock>) => fn.mock.calls.filter((c) => (c[1] as RequestInit | undefined)?.method === 'POST');

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('admin temple settlements page', () => {
  it('shows what is owed for pujas and for donations, and where to send it', async () => {
    mock([ROW]);
    render(<AdminTempleSettlementsPage />);
    await screen.findByText('QA Sheetla Mata Mandir');
    expect(screen.getByText(/Puja share to send/i).parentElement!.textContent).toMatch(/100\.00/);
    expect(screen.getByText(/Donations to send/i).parentElement!.textContent).toMatch(/501\.00/);
    expect(screen.getByText('123456789012')).toBeTruthy();
  });

  it('says the held share is not payable until the puja is performed', async () => {
    mock([ROW]);
    render(<AdminTempleSettlementsPage />);
    await screen.findByText('QA Sheetla Mata Mandir');
    expect(screen.getByText(/45\.10 held until the puja is performed/i)).toBeTruthy();
  });

  it('warns when there are no bank details on file', async () => {
    mock([{ ...ROW, payTo: null }]);
    render(<AdminTempleSettlementsPage />);
    await screen.findByText('QA Sheetla Mata Mandir');
    expect(screen.getByText(/no bank details on file/i)).toBeTruthy();
  });

  it('only offers a button where something is owed', async () => {
    mock([{ ...ROW, pujaShareOwedInr: 0, donationsOwedInr: 0 }]);
    render(<AdminTempleSettlementsPage />);
    await screen.findByText('QA Sheetla Mata Mandir');
    expect(screen.queryAllByRole('button', { name: /record/i })).toHaveLength(0);
  });

  it('will not submit without a transfer reference', async () => {
    const fn = mock([ROW]);
    render(<AdminTempleSettlementsPage />);
    await screen.findByText('QA Sheetla Mata Mandir');
    fireEvent.click(screen.getByRole('button', { name: /record puja share transfer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /confirm transfer/i }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/reference/i);
    expect(posts(fn)).toHaveLength(0);
  });

  it('posts a puja-share transfer for the exact owed amount', async () => {
    const fn = mock([ROW]);
    render(<AdminTempleSettlementsPage />);
    await screen.findByText('QA Sheetla Mata Mandir');
    fireEvent.click(screen.getByRole('button', { name: /record puja share transfer/i }));
    fireEvent.change(await screen.findByLabelText(/reference/i), { target: { value: 'UTR998877' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm transfer/i }));
    await waitFor(() => expect(posts(fn)).toHaveLength(1));
    const call = posts(fn)[0]!;
    expect(String(call[0])).toMatch(/\/admin\/temple-settlements\/puja-share$/);
    expect(JSON.parse(String((call[1] as RequestInit).body))).toEqual({ templeId: T, amountInr: 100, reference: 'UTR998877' });
  });

  it('posts a donation transfer to the donations route', async () => {
    const fn = mock([ROW]);
    render(<AdminTempleSettlementsPage />);
    await screen.findByText('QA Sheetla Mata Mandir');
    fireEvent.click(screen.getByRole('button', { name: /record donation transfer/i }));
    fireEvent.change(await screen.findByLabelText(/reference/i), { target: { value: 'UTR554433' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm transfer/i }));
    await waitFor(() => expect(posts(fn)).toHaveLength(1));
    expect(String(posts(fn)[0]![0])).toMatch(/\/admin\/temple-settlements\/donations$/);
  });

  it('shows the server sentence when the transfer is refused', async () => {
    mock([ROW], () => res({ error: 'The puja share payable now is ₹100.00. Record that exact amount.' }, 409));
    render(<AdminTempleSettlementsPage />);
    await screen.findByText('QA Sheetla Mata Mandir');
    fireEvent.click(screen.getByRole('button', { name: /record puja share transfer/i }));
    fireEvent.change(await screen.findByLabelText(/reference/i), { target: { value: 'UTR1234' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm transfer/i }));
    expect(await screen.findByText(/payable now is ₹100\.00/)).toBeTruthy();
  });

  it('says plainly when no temple has earned or been donated anything', async () => {
    mock([]);
    render(<AdminTempleSettlementsPage />);
    expect(await screen.findByText(/no temple has earned a puja share or received a donation yet/i)).toBeTruthy();
  });
});
