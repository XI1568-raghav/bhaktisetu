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
import { useAuth } from './auth-context';
import { apiBase } from './api';
import { serverSentence } from './provider-queries';

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

// ─── admin user list ─────────────────────────────────────────────────────────
//
// `useAdminUsers` in @poojly/api-client sends `{ role, q }`. The route parses
// `userQuerySchema = { role, status, search, page, limit }` — there is no `q`,
// and zod STRIPS unknown keys, so the mobile Users screen's search box was
// silently inert: typing a name changed nothing and the same unfiltered page
// came back looking like a result.
//
// The role value was wrong too. `adminService.getUsers` matches against the
// Prisma `MarketplaceRole` enum (`DEVOTEE`, `PANDIT`, `ASTROLOGER`, `ADMIN`…)
// and returns an EMPTY page for anything it does not recognise — deliberately,
// so a bad parameter is not a 500. The screen sent the client vocabulary
// (`devotee`, `priest`, `astrologer`, `admin`), so every filter chip except
// "All" rendered "No users match these filters" against a populated table.
//
// Fixing it inside @poojly/api-client would change a signature another
// workstream owns, so the correct call lives here beside the other
// mobile-local portal queries. Response shaping stays out — the raw body goes
// to `selectAdminUsers` in ./api-contracts.

export interface AdminUserQuery {
  /** Prisma `MarketplaceRole`, upper-snake. Omit for every role. */
  role?: string;
  /** Free text matched against fullName / email / phone, server-side. */
  search?: string;
}

export function useAdminUserList(params: AdminUserQuery, options?: RawOptions) {
  const role = params.role?.trim() || undefined;
  const search = params.search?.trim() || undefined;
  return useQuery<unknown>({
    queryKey: ['admin', 'users', { role, search }],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (role) qs.set('role', role);
      if (search) qs.set('search', search);
      const suffix = qs.toString();
      return api.get<unknown>(`/api/v1/admin/users${suffix ? `?${suffix}` : ''}`);
    },
    ...options,
  });
}

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
 *
 * WHY THIS ONE DOES NOT USE `api.post`
 * ------------------------------------
 * It used to, and the sentence above was false for as long as it did.
 * `POST /payouts/request` answers `{ error: "<sentence>" }` — payout-requests.ts:68,
 * and the reasons are the ones a provider most needs
 * ("Complete KYC before requesting a payout.", "No bank account on file.",
 * "Nothing available to pay out.") — while `packages/api-client`'s error mapper
 * reads `data?.error?.message` (client.ts:210). `error` is a STRING here, so
 * `.message` is undefined and every one of those reasons was replaced with
 * "Request failed with status 400" before the screen ever saw it.
 *
 * Three provider roles render that alert (pandit, astrologer, wellness
 * instructor), plus the temple/store/gaushala payout surfaces. A provider whose
 * money will not move, told only that something failed, has nothing to act on.
 * The api-client defect is reported upstream; this is the honest call in the
 * meantime.
 */
export function useRequestPayout() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const token = session?.accessToken ?? '';
  return useMutation<unknown, Error, { method: 'upi' | 'bank' }>({
    mutationFn: async (vars) => {
      const res = await fetch(`${apiBase()}/api/v1/payouts/request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vars),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          serverSentence(payload) || `Could not request payout (${res.status}).`,
        );
      }
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: earningsQueryKeys.payoutBalance });
      queryClient.invalidateQueries({ queryKey: earningsQueryKeys.providerCommissions });
    },
  });
}
