/**
 * The payment gateway refused or could not be reached while opening an order.
 *
 * Razorpay's SDK rejects with a plain object (`{ statusCode, error: { code,
 * description } }`), not an Error, so `error.message` is undefined and the route
 * used to fall through to the generic "Failed to create booking order": the
 * devotee saw a dead end and the real reason (rejected credentials, an account
 * that is not live, a network fault) was only in a log line nobody read. This
 * wraps it: the devotee gets a message that says the booking is saved and
 * nothing was charged, and the operator gets a structured log with the gateway's
 * own status, code and description (never the keys).
 */
export class PaymentGatewayError extends Error {
  readonly code = 'PAYMENT_GATEWAY_UNAVAILABLE' as const;
  constructor(
    message: string,
    readonly gatewayStatus?: number,
    readonly gatewayCode?: string,
    readonly gatewayReason?: string,
  ) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}

export const PAYMENT_GATEWAY_USER_MESSAGE =
  'We could not open the payment page right now. Your booking is saved and nothing has been charged. ' +
  'Please try again in a few minutes from your dashboard (Recent Bookings > Complete payment).';

/** Pull the safe, loggable facts out of whatever the gateway threw. Never reads keys. */
export function describeGatewayFailure(err: unknown): { status?: number; code?: string; reason?: string } {
  const e = err as {
    statusCode?: number;
    error?: { code?: string; description?: string };
    message?: string;
    code?: string;
  } | null;
  return {
    status: typeof e?.statusCode === 'number' ? e.statusCode : undefined,
    code: e?.error?.code ?? e?.code,
    reason: e?.error?.description ?? e?.message,
  };
}
