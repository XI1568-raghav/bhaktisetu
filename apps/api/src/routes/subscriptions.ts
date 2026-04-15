import { FastifyInstance } from 'fastify';

export async function subscriptionRoutes(server: FastifyInstance) {
  // GET /plans - List available subscription plans
  server.get('/plans', async (request, reply) => {
    // TODO: fetch subscription plans from database
    return {
      plans: [],
    };
  });

  // POST /subscribe - Subscribe to a plan
  server.post('/subscribe', async (request, reply) => {
    const body = request.body as {
      planId: string;
      paymentMethodId?: string;
    };
    // TODO: create subscription via Razorpay Subscriptions, activate plan for user
    return {
      message: 'Subscription created',
      subscription: {
        id: '',
        planId: body.planId,
        status: 'pending',
        startDate: '',
        nextBillingDate: '',
        gatewaySubscriptionId: '',
      },
    };
  });

  // POST /cancel - Cancel current subscription
  server.post('/cancel', async (request, reply) => {
    const { reason, cancelAtPeriodEnd } = request.body as {
      reason?: string;
      cancelAtPeriodEnd?: boolean;
    };
    // TODO: cancel subscription via gateway, update status
    return {
      message: 'Subscription cancellation initiated',
      cancelAtPeriodEnd: cancelAtPeriodEnd ?? true,
      reason,
      effectiveDate: '',
    };
  });

  // POST /webhook - Subscription webhook from payment gateway
  server.post('/webhook', async (request, reply) => {
    const payload = request.body as Record<string, unknown>;
    const signature = request.headers['x-razorpay-signature'] as string;
    // TODO: verify webhook signature, handle subscription events
    // (subscription.activated, subscription.charged, subscription.cancelled, etc.)
    return { received: true };
  });
}
