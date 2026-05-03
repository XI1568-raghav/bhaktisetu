'use client';

import { useAuth } from '../lib/auth-context';

// Premium tiers that mute ad rendering. Bhakti Pass + Pro both cover M3 ₹499/mo
// and AR ₹5000/yr; the legacy "premium" string is kept for back-compat.
const PREMIUM_TIERS = new Set(['pro', 'premium', 'bhakti_pass', 'annual_ratna']);

export function useIsPremium(): boolean {
 const { user } = useAuth();
 if (!user) return false;
 if (PREMIUM_TIERS.has(user.subscriptionTier)) return true;
 const maybeNri = (user as { isNriPremium?: unknown }).isNriPremium;
 return maybeNri === true;
}
