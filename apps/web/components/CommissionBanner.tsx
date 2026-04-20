"use client";

import { ArrowUpRight, Percent } from "lucide-react";
import {
  getPlanById,
  getUpgradePlan,
  formatPrice,
  type PlanId,
  type ProviderRole,
  getCommissionRate,
} from "../lib/pricing";

interface CommissionBannerProps {
  currentPlanId: PlanId;
  role: ProviderRole;
}

export function CommissionBanner({ currentPlanId, role }: CommissionBannerProps) {
  const currentPlan = getPlanById(currentPlanId);
  const upgradePlan = getUpgradePlan(currentPlanId);
  const currentRate = getCommissionRate(role, currentPlanId);
  const upgradeRate = upgradePlan ? getCommissionRate(role, upgradePlan.id) : null;

  return (
    <div
      className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      style={{
        background: "var(--color-primary-highlight)",
        border: "1px solid color-mix(in oklch, var(--color-primary) 20%, transparent)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: "color-mix(in oklch, var(--color-primary) 15%, transparent)",
          }}
        >
          <Percent className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            You&apos;re on the{" "}
            <span className="font-semibold">{currentPlan.name}</span> plan.
            Commission: <span className="font-semibold">{currentRate}%</span>
          </p>
          {upgradePlan && upgradeRate !== null && (
            <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
              Upgrade to {upgradePlan.name} to reduce commission from {currentRate}%
              to {upgradeRate}%.
              {upgradePlan.price > 0 && (
                <span> Just {formatPrice(upgradePlan.price)}/mo.</span>
              )}
            </p>
          )}
        </div>
      </div>

      {upgradePlan && (
        <a
          href="/settings/subscription"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium shrink-0 btn-press transition-colors"
          style={{
            background: "var(--color-primary)",
            color: "var(--color-text-inverse)",
          }}
        >
          Upgrade to {upgradePlan.name}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
}
