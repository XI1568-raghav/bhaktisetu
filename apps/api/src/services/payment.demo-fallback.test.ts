import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

// Regression lock for P0 #7. The demo Razorpay/Stripe proxies hand back
// synthetic order ids and a Payment row marked `captured` without any real
// money moving. If those proxies activate in production, the API silently
// "confirms" bookings that the user never paid for. The only signal would
// be a stream of `order_demo_*` ids in the database — easy to miss until a
// week later.
//
// The mitigation: at module load (the moment the API server boots), if
// NODE_ENV=production and the demo proxy would be selected, refuse to start.
// Operators see the crash immediately and fix the env var. The
// ALLOW_DEMO_PAYMENTS escape exists for staging environments that pin
// NODE_ENV=production for parity but legitimately can't have live keys.

describe('Razorpay demo-fallback prod hard fail (P0 #7)', () => {
  it('throws at module load when NODE_ENV=production + RAZORPAY_KEY_ID missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    delete process.env.ALLOW_DEMO_PAYMENTS;

    await expect(import('./payment.service.js')).rejects.toThrow(
      /RAZORPAY.*production|production.*RAZORPAY|demo.*payment.*production/i
    );
  });

  it('throws at module load when NODE_ENV=production + key is the rzp_test_demo placeholder', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
    process.env.RAZORPAY_KEY_SECRET = 'whatever';
    delete process.env.ALLOW_DEMO_PAYMENTS;

    await expect(import('./payment.service.js')).rejects.toThrow(
      /RAZORPAY|demo/i
    );
  });

  it('allows demo proxy in production when ALLOW_DEMO_PAYMENTS=true (staging escape)', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
    process.env.RAZORPAY_KEY_SECRET = 'whatever';
    process.env.ALLOW_DEMO_PAYMENTS = 'true';

    await expect(import('./payment.service.js')).resolves.toBeDefined();
  });

  it('allows demo proxy in non-production (development default)', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.ALLOW_DEMO_PAYMENTS;

    await expect(import('./payment.service.js')).resolves.toBeDefined();
  });

  it('allows real Razorpay creds in production', async () => {
    process.env.NODE_ENV = 'production';
    process.env.RAZORPAY_KEY_ID = 'rzp_live_real';
    process.env.RAZORPAY_KEY_SECRET = 'real_secret_value';
    delete process.env.ALLOW_DEMO_PAYMENTS;

    await expect(import('./payment.service.js')).resolves.toBeDefined();
  });
});

describe('Stripe demo-fallback prod hard fail (P0 #7)', () => {
  it('throws when getStripe() called in production without STRIPE_SECRET_KEY', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.ALLOW_DEMO_PAYMENTS;

    const { getStripe } = await import('../lib/stripe.js');
    await expect(getStripe()).rejects.toThrow(/STRIPE|demo/i);
  });

  it('returns demo stub in production when ALLOW_DEMO_PAYMENTS=true', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.STRIPE_SECRET_KEY;
    process.env.ALLOW_DEMO_PAYMENTS = 'true';

    const { getStripe } = await import('../lib/stripe.js');
    const client = await getStripe();
    expect(client.paymentIntents.create).toBeDefined();
  });

  it('returns demo stub in non-production without STRIPE_SECRET_KEY', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.ALLOW_DEMO_PAYMENTS;

    const { getStripe } = await import('../lib/stripe.js');
    const client = await getStripe();
    expect(client.paymentIntents.create).toBeDefined();
  });
});
