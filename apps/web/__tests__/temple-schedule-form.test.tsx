import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 'test-token' }, user: { id: 'u1' } }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/temple-portal/schedule',
  useSearchParams: () => new URLSearchParams(),
}));

import TempleScheduleEditor from '../app/temple-portal/schedule/page';
import {
  keyToSlotName,
  parseRange,
  regularHoursFromRows,
  rowsFromRegularHours,
  slotNameToKey,
  validateRows,
} from '../lib/temple-schedule';

describe('temple-schedule helpers', () => {
  it('turns a friendly name into the camelCase key the API stores', () => {
    expect(slotNameToKey('Mangala Aarti')).toBe('mangalaAarti');
    expect(slotNameToKey('  shringar   aarti ')).toBe('shringarAarti');
    expect(slotNameToKey('MANGALA AARTI')).toBe('mangalaAarti');
    expect(slotNameToKey('mangalaAarti')).toBe('mangalaAarti');
    expect(slotNameToKey('Aarti #2!')).toBe('aarti2');
    expect(slotNameToKey('!!!')).toBe('');
  });

  it('turns a stored key back into a readable name', () => {
    expect(keyToSlotName('mangalaAarti')).toBe('Mangala Aarti');
    expect(keyToSlotName('darshan')).toBe('Darshan');
  });

  it('reads and normalises a stored range', () => {
    expect(parseRange('4:00 - 05:30')).toEqual({ start: '04:00', end: '05:30' });
    expect(parseRange('25:00 - 26:00')).toBeNull();
    expect(parseRange('06:00 - 12:00, 16:00 - 21:00')).toBeNull();
  });

  it('keeps a legacy key unchanged while its name is untouched', () => {
    const rows = rowsFromRegularHours({ open_hours: '06:00 - 21:00' });
    expect(regularHoursFromRows(rows)).toEqual({ open_hours: '06:00 - 21:00' });
    rows[0]!.name = 'Open Hours';
    expect(regularHoursFromRows(rows)).toEqual({ openHours: '06:00 - 21:00' });
  });

  it('validates names, duplicates and time order', () => {
    const v = validateRows([
      { name: '', start: '04:00', end: '05:00' },
      { name: 'Mangala Aarti', start: '', end: '05:00' },
      { name: 'mangala aarti', start: '06:00', end: '05:00' },
      { name: 'Darshan', start: '06:00', end: '21:00' },
    ]);
    expect(v.ok).toBe(false);
    expect(v.errors[0]!.name).toMatch(/name/i);
    expect(v.errors[1]!.time).toMatch(/both/i);
    expect(v.errors[2]!.name).toMatch(/Already used in row 2/);
    expect(v.errors[2]!.time).toMatch(/after the start/i);
    expect(v.errors[3]!.note).toMatch(/Aarti/);
    expect(v.errors[3]!.name).toBeUndefined();
  });
});

function stubFetch(timingInfo: unknown) {
  const fn = vi.fn(async (_url: string, init?: RequestInit): Promise<Response> => {
    const body = init?.method === 'PATCH' ? {} : { id: 't1', slug: 'somnath', name: 'Somnath Temple', timingInfo };
    return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) } as unknown as Response;
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/temple-portal/schedule');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('temple schedule editor form', () => {
  it('shows friendly names and time pickers for stored hours', async () => {
    stubFetch({ regularHours: { mangalaAarti: '04:00 - 05:00' } });
    render(<TempleScheduleEditor />);
    const name = (await screen.findByLabelText('Slot 1 name')) as HTMLInputElement;
    expect(name.value).toBe('Mangala Aarti');
    expect((screen.getByLabelText('Slot 1 start time') as HTMLInputElement).type).toBe('time');
    expect((screen.getByLabelText('Slot 1 start time') as HTMLInputElement).value).toBe('04:00');
    expect((screen.getByLabelText('Slot 1 end time') as HTMLInputElement).value).toBe('05:00');
  });

  it('guides an empty schedule and adds a suggested slot', async () => {
    stubFetch({});
    render(<TempleScheduleEditor />);
    expect(await screen.findByTestId('schedule-empty')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+ Mangala Aarti' }));
    expect(((await screen.findByLabelText('Slot 1 name')) as HTMLInputElement).value).toBe('Mangala Aarti');
  });

  it('blocks a bad row with an inline message and does not call the API', async () => {
    const fetchFn = stubFetch({ regularHours: { mangalaAarti: '04:00 - 05:00' } });
    render(<TempleScheduleEditor />);
    const end = await screen.findByLabelText('Slot 1 end time');
    fireEvent.change(end, { target: { value: '03:00' } });
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    expect(await screen.findByText(/end time must be after the start time/i)).toBeTruthy();
    expect(fetchFn.mock.calls.some((c) => c[1]?.method === 'PATCH')).toBe(false);
  });

  it('saves the camelCase key and HH:MM - HH:MM value the API expects', async () => {
    const fetchFn = stubFetch({});
    render(<TempleScheduleEditor />);
    fireEvent.click(await screen.findByRole('button', { name: '+ Sandhya Aarti' }));
    fireEvent.change(screen.getByLabelText('Slot 1 start time'), { target: { value: '18:30' } });
    fireEvent.change(screen.getByLabelText('Slot 1 end time'), { target: { value: '19:15' } });
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    await waitFor(() => expect(fetchFn.mock.calls.some((c) => c[1]?.method === 'PATCH')).toBe(true));
    const patch = fetchFn.mock.calls.find((c) => c[1]?.method === 'PATCH')!;
    expect(JSON.parse(String(patch[1]!.body)).regularHours).toEqual({ sandhyaAarti: '18:30 - 19:15' });
  });
});
