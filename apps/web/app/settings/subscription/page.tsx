"use client";

/**
 * PM-02b (prod sweep 2026-08-12) — this page was 100% fabricated.
 *
 * What it used to render, from module-level constants and `useState`:
 *   MOCK_CURRENT_PLAN = "basic"      → "You're on the Basic plan — ₹499/month"
 *   MOCK_BILLING_HISTORY             → six invoices, all marked "Paid", all
 *                                      ₹499, inv_001…inv_006, Nov 2025–Apr 2026
 *   handleChangePlan()               → `setCurrentPlanId(planId)`, with the
 *                                      comment "In production, this would call
 *                                      the API". Cancelling just set local
 *                                      state to "free".
 * It also rendered the hardcoded Free/Basic/Pro/Enterprise ladder from
 * lib/pricing at ₹0/₹499/₹1,499/₹4,999 — prices nothing in the platform
 * charges. /pricing's paid CTA pointed here, so a pandit reading "Basic ₹499"
 * clicked through to a page confirming ₹499 against six invented receipts,
 * while the API bills Pandit Basic at ₹999.
 *
 * There is no honest way to keep any of that. The page now renders the same
 * SubscriptionPanel the working provider portals use, which lists the live
 * plans from GET /api/v1/subscriptions/plans and starts a real Razorpay
 * subscription. Roles with no marketplace plan are told so rather than shown a
 * plan they cannot buy.
 */

import Link from "next/link";
import { CreditCard } from "lucide-react";
import AuthGuard from "../../../components/AuthGuard";
import { SubscriptionPanel } from "../../../components/SubscriptionPanel";
import { useAuth } from "../../../lib/auth-context";
import type { ProviderRole } from "../../../lib/subscription-api";

import { buttonClass } from '../../../components/ui/button-recipe';
import { H1 } from '../../../components/ui/heading-recipe';
/** Web roles that the API actually sells marketplace plans to. */
const PROVIDER_ROLES: ProviderRole[] = [
  "priest",
  "astrologer",
  "wellness_instructor",
  "temple_manager",
  "store_owner",
  "gaushala_manager",
];

function isProviderRole(role: string | undefined): role is ProviderRole {
  return !!role && (PROVIDER_ROLES as string[]).includes(role);
}

export default function SubscriptionPage() {
  return (
    <AuthGuard>
      <SubscriptionInner />
    </AuthGuard>
  );
}

function SubscriptionInner() {
  const { user } = useAuth();
  const role = user?.role;

  return (
    <div className="min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
      <section className="py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-6 sm:px-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--color-primary)" }}
          >
            Settings
          </p>

          {isProviderRole(role) ? (
            <SubscriptionPanel
              role={role}
              title="Subscription"
              description="Your live plan and the marketplace plans available to you. Prices shown are the amounts billed at checkout."
            />
          ) : (
            <div
              className="rounded-xl p-6"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start gap-3">
                <CreditCard
                  className="w-5 h-5 mt-0.5 shrink-0"
                  style={{ color: "var(--color-primary)" }}
                />
                <div>
                  <h1
                    className={`${H1.portal} mb-1`}
                  >
                    Subscription
                  </h1>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    You have no marketplace subscription. Browsing, darshan,
                    content and your daily horoscope are free on a devotee
                    account, and nothing on it is billed on a recurring basis.
                  </p>
                  <Link
                    href="/pricing"
                    className={buttonClass('primary', 'md', 'mt-4 btn-press')}
                  >
                    See plans and prices
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
