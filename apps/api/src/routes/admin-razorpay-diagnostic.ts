import type { FastifyInstance } from 'fastify';
import Razorpay from 'razorpay';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { describeGatewayFailure } from '../lib/payment-gateway-error.js';
import { withGatewayTimeout } from '../lib/razorpay-timeout.js';

type Probe = { ok: true } | { ok: false; status?: number; code?: string; reason?: string };

async function probe(run: () => Promise<unknown>): Promise<Probe> {
  try {
    await run();
    return { ok: true };
  } catch (err) {
    const f = describeGatewayFailure(err);
    return { ok: false, status: f.status, code: f.code, reason: f.reason };
  }
}

/**
 * Admin-only answer to "why does opening a payment page fail?" without needing the Render
 * logs. It asks Razorpay directly and reports the gateway's own status, code and description.
 * Never returns a key or secret (only whether the key id is live or test).
 * `?probe=order` additionally creates ONE unpaid order of Rs 1 (nothing is charged).
 */
export async function adminRazorpayDiagnosticRoutes(server: FastifyInstance) {
  server.get('/razorpay', { preHandler: [authenticateUser, requireRole('admin')] }, async (request) => {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const mode = !keyId ? 'missing' : keyId === 'rzp_test_demo' ? 'demo' : keyId.startsWith('rzp_live_') ? 'live' : keyId.startsWith('rzp_test_') ? 'test' : 'unknown';
    if (mode === 'missing' || mode === 'demo' || !keySecret) {
      return { mode, secretPresent: !!keySecret, read: null, orderProbe: null };
    }
    const rzp = withGatewayTimeout(new Razorpay({ key_id: keyId, key_secret: keySecret }));
    const read = await probe(() => rzp.orders.all({ count: 1 }));
    const wantOrder = (request.query as { probe?: string } | undefined)?.probe === 'order';
    const orderProbe = wantOrder
      ? await probe(() => rzp.orders.create({ amount: 100, currency: 'INR', receipt: `diag-${Date.now()}`, notes: { diagnostic: 'true' } }))
      : null;
    return { mode, secretPresent: true, read, orderProbe };
  });
}
