/**
 * Mobile-local react-query hooks for the SCOPED provider-portal endpoints.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * PAR-09 and PAR-12: the temple and gaushala portal screens called the PUBLIC
 * catalogue routes. A temple manager saw all 20 temples' streams and the global
 * puja catalogue presented as "your offerings"; a gaushala manager saw 19 cows
 * belonging to five different gaushalas, and every cow they registered — which
 * POSTed to the scoped route — was written to a collection the list never read.
 *
 * The scoped routes exist and are role-gated server-side:
 *   GET  /api/v1/temple-portal/dashboard
 *   GET  /api/v1/temple-portal/pujas      ({offerings})
 *   GET  /api/v1/temple-portal/darshan    ({streams})   ← /streams is a 404
 *   GET  /api/v1/gaushala-portal/cows     ({cows})
 *
 * @poojly/api-client has no hooks for them and is owned by another workstream,
 * so these live here. They use the shared `api` client, which injects the
 * bearer token, so auth behaviour is identical to every other mobile call.
 * Response shaping is deliberately NOT done here — the raw body goes to the
 * selectors in ./api-contracts, which are pinned to captured payloads.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { api } from '@poojly/api-client';

export const portalQueryKeys = {
  templeDashboard: ['temple-portal', 'dashboard'] as const,
  templeOfferings: ['temple-portal', 'pujas'] as const,
  templeStreams: ['temple-portal', 'darshan'] as const,
  gaushalaCows: ['gaushala-portal', 'cows'] as const,
};

type RawOptions = Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>;

export function useTemplePortalDashboard(options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: portalQueryKeys.templeDashboard,
    queryFn: () => api.get<unknown>('/api/v1/temple-portal/dashboard'),
    ...options,
  });
}

export function useTemplePortalOfferings(options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: portalQueryKeys.templeOfferings,
    queryFn: () => api.get<unknown>('/api/v1/temple-portal/pujas'),
    ...options,
  });
}

export function useTemplePortalStreams(options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: portalQueryKeys.templeStreams,
    queryFn: () => api.get<unknown>('/api/v1/temple-portal/darshan'),
    ...options,
  });
}

export function useGaushalaPortalCows(options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: portalQueryKeys.gaushalaCows,
    queryFn: () => api.get<unknown>('/api/v1/gaushala-portal/cows'),
    ...options,
  });
}

// ─── PAR-22: provider earnings + temple payouts/bookings ─────────────────────
//
// Four surfaces the web has and the app did not. Same reason these live here
// rather than in @poojly/api-client: that package is owned by another
// workstream and has no hooks for them. They use the shared `api` client, so
// the bearer token and error behaviour match every other mobile call.
//
//   GET  /api/v1/temple-portal/payouts       {payouts,total,pendingInr,paidInr}
//   GET  /api/v1/temple-portal/bookings      {bookings,total}
//   GET  /api/v1/astrologer-portal/earnings  {data,summary}
//   GET  /api/v1/payouts/commissions         {data,total,page,pageSize}
//   GET  /api/v1/payouts/balance             {availableInr,pendingInr,paidOutInr,kyc*}
//   POST /api/v1/payouts/request             {ok,payout}
//
// Shaping stays out of this file — the raw body goes to the selectors in
// ./api-contracts, which are pinned per-field to the route handlers.

export const earningsQueryKeys = {
  templePayouts: ['temple-portal', 'payouts'] as const,
  templeBookings: ['temple-portal', 'bookings'] as const,
  astrologerEarnings: ['astrologer-portal', 'earnings'] as const,
  providerCommissions: ['payouts', 'commissions'] as const,
  payoutBalance: ['payouts', 'balance'] as const,
};

export function useTemplePortalPayouts(options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: earningsQueryKeys.templePayouts,
    queryFn: () => api.get<unknown>('/api/v1/temple-portal/payouts'),
    ...options,
  });
}

export function useTemplePortalBookings(options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: earningsQueryKeys.templeBookings,
    queryFn: () => api.get<unknown>('/api/v1/temple-portal/bookings'),
    ...options,
  });
}

export function useAstrologerEarnings(options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: earningsQueryKeys.astrologerEarnings,
    queryFn: () => api.get<unknown>('/api/v1/astrologer-portal/earnings'),
    ...options,
  });
}

/**
 * The signed-in provider's OWN commission ledger. Deliberately NOT
 * /admin/commissions with a providerId filter — that route is admin-gated and
 * 403s every provider role, which is precisely why the web wellness earnings
 * page was dead before it was pointed here.
 */
export function useProviderCommissions(options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: earningsQueryKeys.providerCommissions,
    queryFn: () => api.get<unknown>('/api/v1/payouts/commissions?page=1&pageSize=100'),
    ...options,
  });
}

export function usePayoutBalance(options?: RawOptions) {
  return useQuery<unknown>({
    queryKey: earningsQueryKeys.payoutBalance,
    queryFn: () => api.get<unknown>('/api/v1/payouts/balance'),
    ...options,
  });
}

/**
 * Request a payout of the whole available balance. The server gates this on
 * verified KYC + a bank account on file and answers 400 with a reason when
 * either is missing; the screen surfaces that reason verbatim rather than
 * inventing one.
 */
export function useRequestPayout() {
  const queryClient = useQueryClient();
  return useMutation<unknown, Error, { method: 'upi' | 'bank' }>({
    mutationFn: (vars) => api.post<unknown>('/api/v1/payouts/request', vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: earningsQueryKeys.payoutBalance });
      queryClient.invalidateQueries({ queryKey: earningsQueryKeys.providerCommissions });
    },
  });
}
