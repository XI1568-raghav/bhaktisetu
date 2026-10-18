import { describe, expect, it, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';

const auth = { isAuthenticated: false, isLoading: false, user: null as unknown };
vi.mock('../lib/auth-context', () => ({
  useAuth: () => auth,
  getRoleDashboardPath: () => '/dashboard',
}));

import AuthGuard from '../components/AuthGuard';
import { redirectToSuspendedLogin, isSuspendedRedirectPending } from '../lib/suspended-notice';

describe('AuthGuard vs the suspended-account redirect', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not replace a pending suspended navigation with a plain login redirect', () => {
    const assign = vi.fn();
    const loc = { pathname: '/profile', href: '', assign } as unknown as Location;
    vi.spyOn(window, 'location', 'get').mockReturnValue(loc);
    redirectToSuspendedLogin('fraud');
    expect(isSuspendedRedirectPending()).toBe(true);
    expect(assign).toHaveBeenCalledWith('/auth/login?suspended=1&reason=fraud');
    render(<AuthGuard><div>secret</div></AuthGuard>);
    expect(loc.href).toBe('');
  });
});
