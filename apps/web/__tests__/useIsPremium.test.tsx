import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const useAuthMock = vi.fn();

vi.mock('../lib/auth-context', () => ({
  useAuth: () => useAuthMock(),
}));

import { useIsPremium } from '../components/useIsPremium';

describe('useIsPremium', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it('returns false when no user is signed in', () => {
    useAuthMock.mockReturnValue({ user: null });
    const { result } = renderHook(() => useIsPremium());
    expect(result.current).toBe(false);
  });

  it('returns true for pro tier', () => {
    useAuthMock.mockReturnValue({ user: { subscriptionTier: 'pro' } });
    expect(renderHook(() => useIsPremium()).result.current).toBe(true);
  });

  it('returns true for bhakti_pass tier', () => {
    useAuthMock.mockReturnValue({ user: { subscriptionTier: 'bhakti_pass' } });
    expect(renderHook(() => useIsPremium()).result.current).toBe(true);
  });

  it('returns true for legacy "premium" tier', () => {
    useAuthMock.mockReturnValue({ user: { subscriptionTier: 'premium' } });
    expect(renderHook(() => useIsPremium()).result.current).toBe(true);
  });

  it('returns true for annual_ratna tier', () => {
    useAuthMock.mockReturnValue({ user: { subscriptionTier: 'annual_ratna' } });
    expect(renderHook(() => useIsPremium()).result.current).toBe(true);
  });

  it('returns false for free tier', () => {
    useAuthMock.mockReturnValue({ user: { subscriptionTier: 'free' } });
    expect(renderHook(() => useIsPremium()).result.current).toBe(false);
  });

  it('returns true when user has isNriPremium flag', () => {
    useAuthMock.mockReturnValue({
      user: { subscriptionTier: 'free', isNriPremium: true },
    });
    expect(renderHook(() => useIsPremium()).result.current).toBe(true);
  });

  it('returns false when isNriPremium is anything other than true', () => {
    useAuthMock.mockReturnValue({
      user: { subscriptionTier: 'free', isNriPremium: 'true' },
    });
    expect(renderHook(() => useIsPremium()).result.current).toBe(false);
  });
});
