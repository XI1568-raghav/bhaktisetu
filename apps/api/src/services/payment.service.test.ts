import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

// Helper: re-import service after env mutation. Razorpay client is
// initialised at module load, but the demo proxy is selected when
// RAZORPAY_KEY_ID is empty or "rzp_test_demo" — so we always run
// against the proxy here.
async function loadService() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  return new mod.PaymentService();
}

function hmacHex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

describe('PaymentService.verifyPayment', () => {
  it('throws on invalid signature', async () => {
    const service = await loadService();
    await expect(
      service.verifyPayment('order_x', 'pay_x', 'wrong_signature')
    ).rejects.toThrow(/invalid signature/);
  });

  it('throws when no payment record found', async () => {
    const service = await loadService();
    const sig = hmacHex('test_secret_key', 'order_x|pay_x');
    prismaMock.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.verifyPayment('order_x', 'pay_x', sig)
    ).rejects.toThrow(/Payment record not found/);
  });

  it('throws when payment has no linked booking', async () => {
    const service = await loadService();
    const sig = hmacHex('test_secret_key', 'order_x|pay_x');
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      booking: null,
    });

    await expect(
      service.verifyPayment('order_x', 'pay_x', sig)
    ).rejects.toThrow(/No booking linked/);
  });

  it('captures payment + confirms pending booking on valid signature', async () => {
    const service = await loadService();
    const sig = hmacHex('test_secret_key', 'order_x|pay_x');
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      booking: { id: 'bk-1', bookingNumber: 'BS-X', status: 'pending_payment' },
    });
    prismaMock.payment.update.mockResolvedValue({});
    prismaMock.pujaBooking.update.mockResolvedValue({});

    const out = await service.verifyPayment('order_x', 'pay_x', sig);

    expect(out).toEqual({ verified: true, bookingId: 'bk-1', bookingNumber: 'BS-X' });
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pmt-1' },
        data: { status: 'captured', gatewayPaymentId: 'pay_x' },
      })
    );
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bk-1' },
        data: { status: 'confirmed' },
      })
    );
  });

  it('does not re-confirm an already-confirmed booking', async () => {
    const service = await loadService();
    const sig = hmacHex('test_secret_key', 'order_x|pay_x');
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      booking: { id: 'bk-1', bookingNumber: 'BS-X', status: 'confirmed' },
    });
    prismaMock.payment.update.mockResolvedValue({});

    await service.verifyPayment('order_x', 'pay_x', sig);

    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });
});

describe('PaymentService.handleWebhookRaw', () => {
  it('rejects when signature mismatches raw body HMAC', async () => {
    const service = await loadService();
    const rawBody = '{"event":"payment.captured"}';
    const wrong = hmacHex('different_secret', rawBody);

    await expect(
      service.handleWebhookRaw(rawBody, JSON.parse(rawBody), wrong)
    ).rejects.toThrow(/signature verification failed/);
  });

  it('rejects when signatures differ in length (timing-safe guard)', async () => {
    const service = await loadService();
    await expect(
      service.handleWebhookRaw('{}', {}, 'short')
    ).rejects.toThrow(/signature verification failed/);
  });

  it('accepts valid HMAC of raw body and dispatches event', async () => {
    const service = await loadService();
    const payload = { event: 'payment.captured', payload: { payment: { entity: { order_id: 'order_x' } } } };
    const rawBody = JSON.stringify(payload);
    const sig = hmacHex('test_webhook_secret', rawBody);
    prismaMock.payment.findFirst.mockResolvedValue(null);

    const out = await service.handleWebhookRaw(rawBody, payload, sig);

    expect(out.handled).toBeDefined();
  });
});

describe('PaymentService.handleWebhook (legacy JSON.stringify path)', () => {
  it('verifies against re-serialised JSON.stringify(payload)', async () => {
    const service = await loadService();
    const payload = { event: 'payment.captured', payload: {} };
    const sig = hmacHex('test_webhook_secret', JSON.stringify(payload));
    prismaMock.payment.findFirst.mockResolvedValue(null);

    const out = await service.handleWebhook(payload, sig);
    expect(out.handled).toBeDefined();
  });

  it('rejects bad signature', async () => {
    const service = await loadService();
    await expect(
      service.handleWebhook({ event: 'x' }, 'bad')
    ).rejects.toThrow(/signature verification failed/);
  });
});
