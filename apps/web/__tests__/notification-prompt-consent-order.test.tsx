import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({ session: { accessToken: 't' }, isAuthenticated: true }),
}));

import { NotificationPrompt } from '../components/NotificationPrompt';

const CONSENT_KEY = 'darshya_cookie_consent_v1';

describe('NotificationPrompt waits for cookie consent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
    (window as unknown as { PushManager: unknown }).PushManager = function () {};
    (globalThis as unknown as { Notification: unknown }).Notification = { permission: 'default' };
  });
  afterEach(() => vi.useRealTimers());

  it('stays hidden while the consent banner is up, then appears after a choice', () => {
    render(<NotificationPrompt />);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(screen.queryByText(/darshan & festival reminders/i)).toBeNull();

    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ version: 1, acceptedAt: new Date().toISOString() }),
    );
    act(() => {
      window.dispatchEvent(new CustomEvent('darshya:consent-changed'));
      vi.advanceTimersByTime(4100);
    });
    expect(screen.getByText(/darshan & festival reminders/i)).toBeTruthy();
  });

  it('shows after the delay when consent already exists', () => {
    localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({ version: 1, acceptedAt: new Date().toISOString() }),
    );
    render(<NotificationPrompt />);
    act(() => void vi.advanceTimersByTime(4100));
    expect(screen.getByText(/darshan & festival reminders/i)).toBeTruthy();
  });
});
