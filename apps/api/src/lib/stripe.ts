/**
 * Stripe singleton — gated on STRIPE_SECRET_KEY.
 *
 * Mirrors the demo-payment pattern from payment.service.ts (Razorpay):
 * when no STRIPE_SECRET_KEY is set we return a Proxy that hands back
 * synthetic order ids so the booking flow stays exercisable in dev /
 * preview without requiring a live Stripe account. Webhook verification
 * also short-circuits in demo mode (caller treats stub as already-valid).
 *
 * Stripe SDK is loaded via dynamic import so a fully missing dep (i.e.
 * `stripe` not yet installed) still allows the demo path to function.
 * In production we expect the package + env var both present.
 */

interface StripePaymentIntent {
  id: string;
  client_secret: string | null;
  amount: number;
  currency: string;
  status: string;
}

interface StripeCheckoutSession {
  id: string;
  url: string | null;
  payment_intent: string | null;
}

// Minimal surface we actually call. We avoid importing Stripe types at
// module load so the demo path works even if the SDK isn't installed.
export interface StripeClient {
  paymentIntents: {
    create: (params: {
      amount: number;
      currency: string;
      metadata?: Record<string, string>;
      automatic_payment_methods?: { enabled: boolean };
    }) => Promise<StripePaymentIntent>;
    retrieve: (id: string) => Promise<StripePaymentIntent>;
  };
  checkout: {
    sessions: {
      create: (params: Record<string, unknown>) => Promise<StripeCheckoutSession>;
    };
  };
  webhooks: {
    constructEvent: (
      payload: string | Buffer,
      signature: string,
      secret: string,
    ) => { type: string; data: { object: Record<string, any> } };
  };
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
export const isStripeDemoMode = !stripeSecretKey;

let realClient: StripeClient | null = null;

function buildDemoClient(): StripeClient {
  return {
    paymentIntents: {
      create: async (opts) => ({
        id: `pi_demo_${Date.now()}`,
        client_secret: `pi_demo_${Date.now()}_secret_demo`,
        amount: opts.amount,
        currency: opts.currency,
        status: 'requires_payment_method',
      }),
      retrieve: async (id) => ({
        id,
        client_secret: null,
        amount: 0,
        currency: 'usd',
        status: 'succeeded',
      }),
    },
    checkout: {
      sessions: {
        create: async () => ({
          id: `cs_demo_${Date.now()}`,
          url: null,
          payment_intent: `pi_demo_${Date.now()}`,
        }),
      },
    },
    webhooks: {
      constructEvent: () => {
        throw new Error('Stripe webhooks unavailable in demo mode (STRIPE_SECRET_KEY missing).');
      },
    },
  };
}

async function buildRealClient(): Promise<StripeClient> {
  // Dynamic import keeps the demo path functional even if `stripe` isn't
  // in node_modules (e.g. early boot before pnpm install on a fresh env).
  const mod = (await import('stripe').catch(() => null)) as
    | { default: new (key: string, opts?: Record<string, unknown>) => StripeClient }
    | null;
  if (!mod) {
    console.warn('[stripe] STRIPE_SECRET_KEY set but `stripe` SDK is not installed. Falling back to demo client.');
    return buildDemoClient();
  }
  return new mod.default(stripeSecretKey, { apiVersion: '2024-12-18.acacia' as unknown as undefined });
}

/**
 * Get the Stripe client. Returns a demo stub when STRIPE_SECRET_KEY is
 * absent so callers never need to branch on env.
 */
export async function getStripe(): Promise<StripeClient> {
  if (isStripeDemoMode) return buildDemoClient();
  if (!realClient) {
    realClient = await buildRealClient();
  }
  return realClient;
}
