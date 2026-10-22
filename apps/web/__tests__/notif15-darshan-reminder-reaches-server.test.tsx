import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * NOTIF-15 / F347 — «"Set reminder" bell on the darshan schedule writes to
 * localStorage and nothing else.»
 *
 * The sweep's evidence: `toggle()` read and wrote `poojly_darshan_reminders`
 * and set a toast reading "Reminder set for Sandhya Aarti". There was no fetch,
 * no API_BASE_URL import and no network call of any kind in the component, and
 * a grep for the storage key across apps/ returned exactly two files, both of
 * which only read it for UI state. No server ever learned the reminder existed
 * and no job could deliver it.
 *
 * The audit gave three acceptable outcomes: a real DarshanReminder table; OR
 * «replace the bell with the AartiOptIn control that at least registers with
 * the server»; OR at minimum «do not show a confirmation toast for a preference
 * that never leaves the browser».
 *
 * An earlier pass did the third — the control is a bookmark now and says
 * "Saved … on this device". That removed the lie and left the gap: the page
 * still offered no way to be told about an aarti.
 *
 * This closes the second. `components/AartiOptIn.tsx` already did the whole
 * job — permission, PushManager subscription, POST /notifications/register-token
 * with `aartiOptIn: true` — and was imported by NOTHING under app/: a working
 * control no devotee could reach. It is now mounted on /darshan, above the
 * schedule the finding is about.
 *
 * RED BEFORE: the first test failed (app/darshan/page.tsx contained no
 * reference to AartiOptIn, and a repo-wide grep for the component under app/
 * returned zero hits). The rest are the anti-vacuity guards — mounting a
 * control that does not actually reach the server would satisfy a naive source
 * check, so the POST is asserted for real.
 */

// ─── 1. The page mounts it ───────────────────────────────────────────────────

const WEB_ROOT = path.resolve(__dirname, '..');

function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('NOTIF-15 — /darshan offers a reminder that leaves the browser', () => {
  const src = stripComments(readFileSync(path.join(WEB_ROOT, 'app/darshan/page.tsx'), 'utf8'));

  it('imports AartiOptIn', () => {
    expect(src).toMatch(/import\s+AartiOptIn\s+from\s+['"][^'"]*components\/AartiOptIn['"]/);
  });

  it('renders it, not merely imports it', () => {
    expect(src).toMatch(/<AartiOptIn\b/);
  });

  it('keeps the per-slot bookmark as well', () => {
    // Deleting the device-local shortlist would satisfy "no lying toast" while
    // removing a feature devotees use. Both controls must be on the page.
    const table = stripComments(readFileSync(path.join(WEB_ROOT, 'components/DarshanScheduleTable.tsx'), 'utf8'));
    expect(src).toMatch(/<DarshanScheduleTable\b/);
    expect(table).toMatch(/<DarshanScheduleRemindButton\b/);
  });
});

// ─── 2. The bookmark still does not claim a reminder was set ─────────────────

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Devotee', email: 'd@x.test' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

import DarshanScheduleRemindButton from '../components/DarshanScheduleRemindButton';
import AartiOptIn from '../components/AartiOptIn';

describe('NOTIF-15 — the device-local control never promises a notification', () => {
  it('says "on this device", never "Reminder set"', () => {
    render(
      <DarshanScheduleRemindButton reminderId="schedule:19:00:Kashi:Sandhya Aarti" label="Sandhya Aarti" />,
    );
    fireEvent.click(screen.getByRole('button'));
    const body = document.body.textContent ?? '';
    expect(body).toMatch(/on this device/i);
    // The exact sentence the finding quoted.
    expect(body).not.toMatch(/Reminder set for/i);
  });
});

// ─── 3. The mounted control really does register with the server ─────────────

const SUB_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123';

function stubPushStack(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('Notification', { requestPermission: async () => 'granted' });
  vi.stubGlobal('PushManager', function PushManager() {});
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: async () => ({
        pushManager: {
          subscribe: async () => ({
            toJSON: () => ({ endpoint: SUB_ENDPOINT }),
          }),
          getSubscription: async () => null,
        },
      }),
      ready: Promise.resolve({}),
      getRegistration: async () => undefined,
    },
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('NOTIF-15 — AartiOptIn registers the device with the API', () => {
  it('POSTs the push endpoint with aartiOptIn set', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/notifications/vapid-public-key')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ enabled: true, publicKey: 'AAAA' }),
        } as unknown as Response;
      }
      return { ok: true, status: 200, json: async () => ({}) } as unknown as Response;
    });
    stubPushStack(fetchMock);

    render(<AartiOptIn variant="inline" />);
    fireEvent.click(await screen.findByRole('button', { name: /notify me 15 min before aarti/i }));

    await waitFor(() => {
      const register = fetchMock.mock.calls.find((c) =>
        String(c[0]).includes('/notifications/register-token'),
      );
      expect(register, 'no POST to /notifications/register-token').toBeTruthy();
      const init = register![1] as RequestInit;
      expect(String(init.method).toUpperCase()).toBe('POST');
      const body = JSON.parse(String(init.body));
      expect(body.aartiOptIn).toBe(true);
      expect(body.deviceToken).toBe(SUB_ENDPOINT);
    });
  });

  it('does not report success when the server refuses', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/notifications/vapid-public-key')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ enabled: true, publicKey: 'AAAA' }),
        } as unknown as Response;
      }
      return { ok: false, status: 500, json: async () => ({}) } as unknown as Response;
    });
    stubPushStack(fetchMock);

    render(<AartiOptIn variant="inline" />);
    fireEvent.click(await screen.findByRole('button', { name: /notify me 15 min before aarti/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /notify me 15 min before aarti/i })).toBeTruthy(),
    );
    // Still off — and the copy is the product's, not "Server rejected token".
    expect(screen.queryByText(/aarti reminders on/i)).toBeNull();
    expect(document.body.textContent ?? '').not.toMatch(/Server rejected token|HTTP\s*500/);
  });
});
