import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// QA 2026-11-02 (tester PDF 3): /upgrade offered a live "Subscribe" on plans the API reports
// `purchasable: false`, and carried developer copy about "demo mode (no Razorpay key)".

vi.mock('../lib/auth-context', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isLoading: false,
    session: { accessToken: 'test-token' },
    user: { id: 'u1', fullName: 'Test Devotee', email: 'd@x.test' },
  }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('../components/AuthGuard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const reply = (body: unknown, ok = true) => ({ ok, status: ok ? 200 : 500, json: async () => body });

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

async function renderUpgrade() {
  const { default: UpgradePage } = await import('../app/upgrade/page');
  render(<UpgradePage />);
}

describe('/upgrade paid plans the API cannot charge', () => {
  it('shows a disabled "Opens soon" on plans with purchasable:false and no env-var text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      reply({ plans: [
        { id: 'astro_session', purchasable: false },
        { id: 'astro_monthly', purchasable: false },
      ] })));
    await renderUpgrade();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Opens soon' })).toHaveLength(2));
    for (const b of screen.getAllByRole('button', { name: 'Opens soon' })) expect(b).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Subscribe' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Current plan' })).toBeDisabled();
    expect(document.body.textContent).not.toMatch(/demo mode|Razorpay key/i);
  });

  it('leaves Subscribe live when the plans lookup fails or says nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({}, false)));
    await renderUpgrade();
    expect(screen.getByRole('button', { name: 'Subscribe' })).not.toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Opens soon' })).toBeNull();
  });
});
