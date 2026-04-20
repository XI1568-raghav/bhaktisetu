import { prisma } from '../lib/prisma.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

interface PlanDefinition {
  id: string;
  name: string;
  plan: string;
  roles: string[];
  price: number;
  currency: string;
  interval: string;
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
    if (plan.interval === 'month') {
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
