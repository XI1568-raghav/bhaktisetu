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

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
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
