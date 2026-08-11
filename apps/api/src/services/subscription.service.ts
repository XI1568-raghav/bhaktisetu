import Razorpay from 'razorpay';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { assertNotProductionDemo } from '../lib/payment-mode.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface PlanDefinition {
  id: string;
  name: string;
  plan: string;
  roles: string[];
  price: number;
  currency: string;
  interval: string;
  // Optional explicit duration (overrides interval-based math). Used by
  // short-window plans like the AI astro single-session pass (1 day).
  durationDays?: number;
  // Optional USD price, retained for display and for the future
  // PayPal-via-Razorpay international rail. Nothing charges against it today —
  // the Stripe checkout that did was removed 2026-08-11.
  priceUsd?: number;
  features: string[];
  popular: boolean;
}

interface SubscriptionResult {
  id: string;
  userId: string;
  plan: string;
  role: string;
  startDate: string;
  endDate: string;
  amount: number;
  status: string;
}

// ─── Plan Definitions ───────────────────────────────────────────────────────────

const PLANS: PlanDefinition[] = [
  // Pandit plans
  {
    id: 'plan-pandit-free',
    name: 'Pandit Starter',
    plan: 'FREE',
    roles: ['PANDIT'],
    price: 0,
    currency: 'INR',
    interval: 'forever',
    features: ['5 bookings/month', 'Basic profile listing', 'Standard support'],
    popular: false,
  },
  {
    id: 'plan-pandit-basic',
    name: 'Pandit Basic',
    plan: 'BASIC',
    roles: ['PANDIT'],
    price: 999,
    currency: 'INR',
    interval: 'month',
    features: ['Unlimited bookings', 'Priority listing', 'Profile badge', 'Chat support'],
    popular: true,
  },
  {
    id: 'plan-pandit-pro',
    name: 'Pandit Pro',
    plan: 'PRO',
    roles: ['PANDIT'],
    price: 2999,
    currency: 'INR',
    interval: 'month',
    features: ['Unlimited bookings', 'Top listing', 'Verified badge', 'Video consultation', 'Dedicated support', '15% lower commission'],
    popular: false,
  },
  // Astrologer plans
  {
    id: 'plan-astro-free',
    name: 'Astrologer Starter',
    plan: 'FREE',
    roles: ['ASTROLOGER'],
    price: 0,
    currency: 'INR',
    interval: 'forever',
    features: ['10 consultations/month', 'Basic profile', 'Chat only'],
    popular: false,
  },
  {
    id: 'plan-astro-basic',
    name: 'Astrologer Basic',
    plan: 'BASIC',
    roles: ['ASTROLOGER'],
    price: 799,
    currency: 'INR',
    interval: 'month',
    features: ['Unlimited consultations', 'Voice calls', 'Priority listing'],
    popular: true,
  },
  {
    id: 'plan-astro-pro',
    name: 'Astrologer Pro',
    plan: 'PRO',
    roles: ['ASTROLOGER'],
    price: 1999,
    currency: 'INR',
    interval: 'month',
    features: ['Unlimited everything', 'Video calls', 'Top listing', 'Verified badge', '10% lower commission'],
    popular: false,
  },
  // Store Owner plans
  {
    id: 'plan-store-free',
    name: 'Store Starter',
    plan: 'FREE',
    roles: ['STORE_OWNER'],
    price: 0,
    currency: 'INR',
    interval: 'forever',
    features: ['10 product listings', 'Standard commission', 'Basic analytics'],
    popular: false,
  },
  {
    id: 'plan-store-basic',
    name: 'Store Basic',
    plan: 'BASIC',
    roles: ['STORE_OWNER'],
    price: 1499,
    currency: 'INR',
    interval: 'month',
    features: ['100 product listings', 'Lower commission', 'Advanced analytics', 'Priority support'],
    popular: true,
  },
  {
    id: 'plan-store-pro',
    name: 'Store Pro',
    plan: 'PRO',
    roles: ['STORE_OWNER'],
    price: 3999,
    currency: 'INR',
    interval: 'month',
    features: ['Unlimited listings', 'Lowest commission', 'Featured placement', 'Dedicated account manager'],
    popular: false,
  },
  // Wellness plans
  {
    id: 'plan-wellness-free',
    name: 'Instructor Starter',
    plan: 'FREE',
    roles: ['WELLNESS_INSTRUCTOR'],
    price: 0,
    currency: 'INR',
    interval: 'forever',
    features: ['5 sessions/month', 'Basic profile', 'Standard commission'],
    popular: false,
  },
  {
    id: 'plan-wellness-basic',
    name: 'Instructor Basic',
    plan: 'BASIC',
    roles: ['WELLNESS_INSTRUCTOR'],
    price: 699,
    currency: 'INR',
    interval: 'month',
    features: ['Unlimited sessions', 'Video sessions', 'Priority listing'],
    popular: true,
  },
  // Temple/Gaushala plans
  {
    id: 'plan-temple-free',
    name: 'Temple Starter',
    plan: 'FREE',
    roles: ['TEMPLE_MANAGER', 'GAUSHALA_MANAGER'],
    price: 0,
    currency: 'INR',
    interval: 'forever',
    features: ['Basic listing', 'Profile page', 'Standard support'],
    popular: false,
  },
  {
    id: 'plan-temple-pro',
    name: 'Temple Pro',
    plan: 'PRO',
    roles: ['TEMPLE_MANAGER', 'GAUSHALA_MANAGER'],
    price: 4999,
    currency: 'INR',
    interval: 'month',
    features: ['Live darshan streaming', 'Donation management', 'Featured placement', 'Analytics dashboard', 'Priority support'],
    popular: true,
  },
  // ─── AI Astrologer paywall plans (Layer M3) ──────────────────────────────
  // These are devotee-side plans. They reuse MarketplacePlan codes:
  //   BASIC -> single-session pass (24h, 30 messages)
  //   PRO   -> monthly unlimited (30d)
  // No new enum value required.
  {
    id: 'astro_session',
    name: 'Single Astro Session',
    plan: 'BASIC',
    roles: ['DEVOTEE'],
    price: 99,
    currency: 'INR',
    interval: 'day',
    durationDays: 1,
    features: ['30 AI Pandit messages', 'Valid for 24 hours', 'Personalized guidance'],
    popular: false,
  },
  {
    id: 'astro_monthly',
    name: 'Astro Monthly Unlimited',
    plan: 'PRO',
    roles: ['DEVOTEE'],
    price: 499,
    currency: 'INR',
    interval: 'month',
    durationDays: 30,
    features: ['Unlimited AI Pandit chat', 'Priority responses', 'Cancel anytime'],
    popular: true,
  },
  // ─── NRI Premium yearly tier (Layer AR) ──────────────────────────────────
  // Annual subscription, ₹5000/yr (~$60). Billed in INR via Razorpay; the USD
  // Stripe checkout was removed 2026-08-11. Maps to
  // ENTERPRISE so isPremium() can branch off the marketplace plan code
  // without inventing a new enum value.
  {
    id: 'nri_premium_yearly',
    name: 'NRI Premium',
    plan: 'ENTERPRISE',
    roles: ['DEVOTEE'],
    price: 5000,
    currency: 'INR',
    priceUsd: 60,
    interval: 'year',
    durationDays: 365,
    features: [
      'No ads anywhere on Darshya',
      'No NRI surcharge on bookings',
      'Priority booking 7 days early',
      'Weekly 1:1 call with priest (Jitsi)',
      'Free 80G receipt PDF for any donation',
      'Unlimited AI astro chat',
    ],
    popular: false,
  },
];

// In-memory subscriptions for demo
const mockSubscriptions = new Map<string, SubscriptionResult>();

// ─── Service ────────────────────────────────────────────────────────────────────

export class SubscriptionService {
  getPlans(role?: string): PlanDefinition[] {
    if (!role) return PLANS;
    return PLANS.filter((p) => p.roles.includes(role));
  }

  async subscribe(userId: string, planId: string, role: string): Promise<SubscriptionResult> {
    const plan = PLANS.find((p) => p.id === planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    if (!plan.roles.includes(role)) {
      throw new Error(`Plan ${planId} is not available for role ${role}`);
    }

    const now = new Date();
    const endDate = new Date(now);
    if (typeof plan.durationDays === 'number' && plan.durationDays > 0) {
      // Explicit short-duration plan (e.g. 1-day astro session pass)
      endDate.setDate(endDate.getDate() + plan.durationDays);
    } else if (plan.interval === 'month') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.interval === 'year') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 100); // "forever" for free plans
    }

    try {
      // Cancel existing active subscription for this role
      await prisma.marketplaceSubscription.updateMany({
        where: { userId, role: role as 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER' | 'ADMIN' | 'DEVOTEE', status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      });

      const subscription = await prisma.marketplaceSubscription.create({
        data: {
          userId,
          plan: plan.plan as 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE',
          role: role as 'PANDIT' | 'STORE_OWNER' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA_MANAGER' | 'TEMPLE_MANAGER' | 'ADMIN' | 'DEVOTEE',
          startDate: now,
          endDate,
          amount: plan.price,
          status: 'ACTIVE',
        },
      });

      // Create transaction record
      if (plan.price > 0) {
        await prisma.transaction.create({
          data: {
            userId,
            type: 'SUBSCRIPTION',
            amount: plan.price,
            status: 'COMPLETED',
            metadata: { planId, role, interval: plan.interval },
          },
        });
      }

      return {
        id: subscription.id,
        userId: subscription.userId,
        plan: subscription.plan,
        role: subscription.role,
        startDate: subscription.startDate.toISOString(),
        endDate: subscription.endDate.toISOString(),
        amount: Number(subscription.amount),
        status: subscription.status,
      };
    } catch {
      // Mock fallback
      const sub: SubscriptionResult = {
        id: `sub-${Date.now()}`,
        userId,
        plan: plan.plan,
        role,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        amount: plan.price,
        status: 'ACTIVE',
      };
      mockSubscriptions.set(userId, sub);
      return sub;
    }
  }

  async getMySubscription(userId: string): Promise<SubscriptionResult | null> {
    try {
      const subscription = await prisma.marketplaceSubscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) return null;

      return {
        id: subscription.id,
        userId: subscription.userId,
        plan: subscription.plan,
        role: subscription.role,
        startDate: subscription.startDate.toISOString(),
        endDate: subscription.endDate.toISOString(),
        amount: Number(subscription.amount),
        status: subscription.status,
      };
    } catch {
      return mockSubscriptions.get(userId) ?? null;
    }
  }

  // ─── Razorpay Subscriptions API (auto-renewal) ─────────────────────────────
  // Strategy: only the ₹499 monthly plan auto-renews. The ₹99 single-session
  // pass remains one-shot via the existing /subscribe path. Razorpay
  // subscription IDs are stored in Transaction.metadata so no schema change
  // is needed; lookups during webhooks key on metadata.razorpaySubscriptionId.

  async createRazorpaySubscription(args: {
    userId: string;
    planId: string;
    role: string;
  }): Promise<{
    subscriptionId: string;
    shortUrl: string | null;
    status: string;
    skipped?: boolean;
    reason?: string;
  }> {
    const plan = PLANS.find((p) => p.id === args.planId);
    if (!plan) throw new Error(`Plan not found: ${args.planId}`);
    if (!plan.roles.includes(args.role)) {
      throw new Error(`Plan ${args.planId} is not available for role ${args.role}`);
    }
    if (plan.price <= 0) {
      throw new Error('Auto-renewal not supported for free plans');
    }

    const rzpPlanId = mapToRazorpayPlanId(args.planId);
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    // Reject the silent demo escape in production. Without this, an admin
    // who left RAZORPAY_KEY_ID empty in prod would get sub_demo_* ids and
    // a "subscription created" UX with no real Razorpay subscription, no
    // recurring debit, and no way for finance to reconcile.
    assertNotProductionDemo('subscription.createRazorpaySubscription');
    const isDemo = !keyId || keyId === 'rzp_test_demo' || !rzpPlanId;

    let subscriptionId: string;
    let shortUrl: string | null;
    let status: string;

    if (isDemo) {
      subscriptionId = `sub_demo_${Date.now()}`;
      shortUrl = null;
      status = 'created';
    } else {
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const subRes = await (rzp as unknown as {
        subscriptions: {
          create: (opts: Record<string, unknown>) => Promise<{
            id: string;
            short_url?: string;
            status?: string;
          }>;
        };
      }).subscriptions.create({
        plan_id: rzpPlanId,
        total_count: 12,
        customer_notify: 1,
        notes: { darshyaUserId: args.userId, darshyaPlanId: args.planId, role: args.role },
      });
      subscriptionId = subRes.id;
      shortUrl = subRes.short_url ?? null;
      status = subRes.status ?? 'created';
    }

    try {
      await prisma.transaction.create({
        data: {
          userId: args.userId,
          type: 'SUBSCRIPTION',
          amount: plan.price,
          status: 'PENDING',
          metadata: {
            kind: 'razorpay_subscription_create',
            razorpaySubscriptionId: subscriptionId,
            planId: args.planId,
            role: args.role,
            shortUrl,
            status,
          },
        },
      });
    } catch {
      // mock fallback — fine
    }

    if (isDemo) {
      try {
        await this.subscribe(args.userId, args.planId, args.role);
      } catch {
        // ignore
      }
    }

    return { subscriptionId, shortUrl, status, skipped: isDemo, reason: isDemo ? 'demo-mode' : undefined };
  }

  // createStripeAnnualSubscription — REMOVED 2026-08-11 with the Stripe rail
  // (owner directive). It opened a USD Stripe Checkout Session in subscription
  // mode for the NRI annual tier. Deleted rather than gated: Razorpay is the
  // only gateway and INR the only currency, and a dormant USD checkout is
  // exactly the kind of path a later edit re-enables by accident (RV-01). The
  // Razorpay monthly/annual subscription above is the sole rail; international
  // buyers return with PayPal-via-Razorpay.
  //
  // Plan.priceUsd is retained on the PLANS table for display and for that
  // future rail — nothing charges against it today.

  /**
   * Check if a user has an active premium subscription (NRI Premium tier).
   * Used by AQ ad-gate, NRI surcharge bypass, AI astro paywall (M3), etc.
   */
  async isPremium(userId: string): Promise<boolean> {
    try {
      const sub = await prisma.marketplaceSubscription.findFirst({
        where: {
          userId,
          status: 'ACTIVE',
          plan: 'ENTERPRISE',
          endDate: { gte: new Date() },
        },
      });
      return !!sub;
    } catch {
      const m = mockSubscriptions.get(userId);
      return !!(m && m.status === 'ACTIVE' && m.plan === 'ENTERPRISE');
    }
  }

  async cancelRazorpaySubscription(userId: string): Promise<{ cancelled: boolean; message: string }> {
    let rzpSubId: string | null = null;
    try {
      const recent = await prisma.transaction.findMany({
        where: { userId, type: 'SUBSCRIPTION' },
        orderBy: { createdAt: 'desc' },
        take: 25,
      });
      for (const t of recent) {
        const meta = (t as unknown as { metadata?: { razorpaySubscriptionId?: string; kind?: string } }).metadata;
        if (meta?.razorpaySubscriptionId && meta.kind === 'razorpay_subscription_create') {
          rzpSubId = meta.razorpaySubscriptionId;
          break;
        }
      }
    } catch {
      // fall through
    }

    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const isDemo = !keyId || keyId === 'rzp_test_demo' || !rzpSubId || rzpSubId.startsWith('sub_demo_');

    if (rzpSubId && !isDemo) {
      try {
        const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
        await (rzp as unknown as {
          subscriptions: { cancel: (id: string, cancelAtCycleEnd?: 0 | 1) => Promise<unknown> };
        }).subscriptions.cancel(rzpSubId, 1);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[subscription.service] Razorpay cancel failed:', err);
      }
    }

    const local = await this.cancel(userId);
    return {
      cancelled: local.cancelled || !!rzpSubId,
      message: rzpSubId
        ? 'Auto-renewal cancelled. Access continues until end of current billing cycle.'
        : local.message,
    };
  }

  async handleSubscriptionEvent(event: string, payload: unknown): Promise<{ handled: boolean; reason?: string }> {
    const sub = extractRazorpaySubscriptionFromEvent(payload);
    if (!sub?.id) return { handled: false, reason: 'no subscription in payload' };

    let userId: string | null = null;
    let planId: string | null = null;
    let role: string | null = null;
    try {
      const txns = await prisma.transaction.findMany({ where: { type: 'SUBSCRIPTION' }, orderBy: { createdAt: 'desc' }, take: 200 });
      for (const t of txns) {
        const meta = (t as unknown as { metadata?: { razorpaySubscriptionId?: string; planId?: string; role?: string } }).metadata;
        if (meta?.razorpaySubscriptionId === sub.id) {
          userId = (t as unknown as { userId: string }).userId;
          planId = meta.planId ?? null;
          role = meta.role ?? null;
          break;
        }
      }
    } catch {
      // ignore
    }

    if (!userId || !planId || !role) {
      return { handled: false, reason: 'no matching local subscription' };
    }

    switch (event) {
      case 'subscription.activated':
      case 'subscription.charged': {
        await this.subscribe(userId, planId, role);
        if (event === 'subscription.charged') {
          await safeSendEmail({
            userId,
            subject: 'Darshya — your subscription renewed',
            html: '<p>Your Darshya subscription has been renewed for another month. Continue your spiritual journey at <a href="https://darshya.online/ask-pandit">darshya.online</a>.</p>',
          });
        }
        return { handled: true };
      }
      case 'subscription.cancelled':
      case 'subscription.completed': {
        try {
          await prisma.marketplaceSubscription.updateMany({
            where: { userId, status: 'ACTIVE' },
            data: { status: event === 'subscription.completed' ? 'EXPIRED' : 'CANCELLED', endDate: new Date() },
          });
        } catch {
          // ignore
        }
        return { handled: true };
      }
      case 'subscription.halted': {
        try {
          await prisma.marketplaceSubscription.updateMany({
            where: { userId, status: 'ACTIVE' },
            data: { status: 'PAST_DUE' },
          });
        } catch {
          // ignore
        }
        await safeSendEmail({
          userId,
          subject: 'Darshya — payment failed',
          html: '<p>We could not renew your Darshya subscription. <a href="https://darshya.online/account/subscriptions">Update your payment method</a> to continue uninterrupted access.</p>',
        });
        return { handled: true };
      }
      default:
        return { handled: false, reason: `unhandled event: ${event}` };
    }
  }

  async cancel(userId: string): Promise<{ message: string; cancelled: boolean }> {
    try {
      const subscription = await prisma.marketplaceSubscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) {
        return { message: 'No active subscription found', cancelled: false };
      }

      await prisma.marketplaceSubscription.update({
        where: { id: subscription.id },
        data: { status: 'CANCELLED' },
      });

      return { message: 'Subscription cancelled. Access continues until end of current billing period.', cancelled: true };
    } catch {
      const existing = mockSubscriptions.get(userId);
      if (existing) {
        existing.status = 'CANCELLED';
        return { message: 'Subscription cancelled (demo).', cancelled: true };
      }
      return { message: 'No active subscription found', cancelled: false };
    }
  }
}

export const subscriptionService = new SubscriptionService();

// ─── Helpers ────────────────────────────────────────────────────────────────────

function mapToRazorpayPlanId(darshyaPlanId: string): string {
  const envMap: Record<string, string | undefined> = {
    astro_monthly: process.env.RAZORPAY_PLAN_ASTRO_MONTHLY,
    'plan-pandit-basic': process.env.RAZORPAY_PLAN_PANDIT_BASIC,
    'plan-pandit-pro': process.env.RAZORPAY_PLAN_PANDIT_PRO,
    'plan-astro-basic': process.env.RAZORPAY_PLAN_ASTRO_BASIC,
    'plan-astro-pro': process.env.RAZORPAY_PLAN_ASTRO_PRO,
    'plan-store-basic': process.env.RAZORPAY_PLAN_STORE_BASIC,
    'plan-store-pro': process.env.RAZORPAY_PLAN_STORE_PRO,
    'plan-wellness-basic': process.env.RAZORPAY_PLAN_WELLNESS_BASIC,
    'plan-temple-pro': process.env.RAZORPAY_PLAN_TEMPLE_PRO,
  };
  return envMap[darshyaPlanId] ?? '';
}

function extractRazorpaySubscriptionFromEvent(payload: unknown): { id: string; status?: string } | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as { payload?: { subscription?: { entity?: { id?: string; status?: string } } } };
  const entity = p.payload?.subscription?.entity;
  if (entity?.id) return { id: entity.id, status: entity.status };
  return null;
}

async function safeSendEmail(args: { userId: string; subject: string; html: string }): Promise<void> {
  try {
    const user = await prisma.user.findUnique({ where: { id: args.userId }, select: { email: true } });
    if (!user?.email) return;
    await sendEmail({ to: user.email, subject: args.subject, html: args.html });
  } catch {
    // best-effort — never break webhook handling
  }
}

export async function findUpcomingExpirations(daysAhead: number): Promise<Array<{ userId: string; endDate: Date; email: string | null }>> {
  const now = new Date();
  const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
  try {
    const subs = await prisma.marketplaceSubscription.findMany({
      where: { status: 'ACTIVE', endDate: { gte: now, lte: horizon } },
      take: 500,
    });
    const out: Array<{ userId: string; endDate: Date; email: string | null }> = [];
    for (const s of subs) {
      const u = await prisma.user.findUnique({ where: { id: s.userId }, select: { email: true } });
      out.push({ userId: s.userId, endDate: s.endDate, email: u?.email ?? null });
    }
    return out;
  } catch {
    return [];
  }
}
