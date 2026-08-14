/**
 * PAR-19 — what the mobile Admin > Settings screen is allowed to claim.
 *
 * THE DEFECT. The screen rendered five Switches over
 * `useState({video_proof_required:true, nri_pricing:true, razorpay:true,
 * stripe:true, ai_jyotish:false, auto_approve:true})` with a `toggle()` that
 * only called setState. No fetch, no mutation, no persistence — the values
 * were invented at mount and thrown away on unmount. An admin could believe
 * they had switched off a payment gateway, dropped the mandatory video-proof
 * requirement on payouts, or stopped auto-approving accounts, and nothing on
 * the server changed. That is a false sense of control over money and over
 * trust-and-safety.
 *
 * WHY IT IS NOT SIMPLY WIRED UP. There is no platform-flag surface in the API
 * to wire to. A repo-wide search for a settings/feature-flag table or route
 * finds nothing: `/api/v1/admin/ops` is two CRON-token-gated read-only agent
 * feeds plus an SLA bulk-resolve (routes/admin-ops.ts), and no Prisma model
 * stores a flag. Inventing a client-side "flag" would reproduce the same lie.
 *
 * WHAT THE SCREEN DOES INSTEAD. It stops pretending: no toggles, an explicit
 * statement that platform flags cannot be changed from the app, and a
 * read-only row for the ONE value that can be read from a real endpoint —
 * the Razorpay gateway, via GET /api/v1/payments/config. The dead `stripe`
 * flag is gone; that rail was removed from the API.
 */

import { isLivePaymentRail, type PaymentConfig } from './subscription-gate';

export interface ReadableFlag {
  id: string;
  label: string;
  description: string;
  /** The endpoint this row's value is read from. Read-only, by definition. */
  source: string;
}

export interface PlatformFlagSupport {
  canWrite: boolean;
  message: string;
  readableFlags: ReadableFlag[];
}

export const PLATFORM_FLAGS_READ_ONLY_MESSAGE =
  'Platform flags cannot be changed from the app — the API has no settings endpoint to save them to. ' +
  'The row below is read-only and reflects live server configuration.';

export function describePlatformFlagSupport(): PlatformFlagSupport {
  return {
    canWrite: false,
    message: PLATFORM_FLAGS_READ_ONLY_MESSAGE,
    readableFlags: [
      {
        id: 'razorpay',
        label: 'Razorpay (domestic)',
        description: 'Payment gateway key configured on the API',
        source: '/api/v1/payments/config',
      },
    ],
  };
}

export type GatewayState = 'live' | 'demo' | 'unknown';

export interface GatewayStatus {
  state: GatewayState;
  label: string;
  detail: string;
}

/**
 * Defaults to `unknown` — a failed or in-flight config request must never
 * render as a confident "Live".
 */
export function describeGatewayStatus(args: {
  config: PaymentConfig | undefined | null;
  isLoading?: boolean;
  error?: unknown;
}): GatewayStatus {
  if (args.isLoading && !args.config) {
    return { state: 'unknown', label: 'Checking…', detail: 'Reading /api/v1/payments/config' };
  }
  if (args.error || args.config == null) {
    return {
      state: 'unknown',
      label: 'Unknown',
      detail: 'Could not read the payment configuration. Pull down to retry.',
    };
  }
  if (isLivePaymentRail(args.config)) {
    return { state: 'live', label: 'Live', detail: 'A real Razorpay key is configured.' };
  }
  return {
    state: 'demo',
    label: 'Not configured',
    detail: 'The API is running on the placeholder key — no real charge can be taken.',
  };
}
