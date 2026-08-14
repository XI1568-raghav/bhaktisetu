"use client";

/**
 * ⚠ DO NOT MOUNT THIS UNTIL PM-01 IS RESOLVED (prod sweep 2026-08-12).
 *
 * As of 2026-08-13 this component has no importers anywhere in apps/web, which
 * is the only reason it is not a live defect. Both numbers it prints come from
 * `getCommissionRate`, i.e. `COMMISSION_RATES[].rates` — the tier ladder that
 * NO server code applies (grep `commissionOverride` across apps/api: no
 * matches). So it would tell a free-tier pandit "Commission: 30%" when the
 * platform actually takes 20% (schema.prisma Priest.commissionRate @default
 * 0.80), and then sell them an upgrade to a rate that is never charged.
 *
 * /pricing was corrected to publish `chargedCommissionRate` only. If this
 * banner is ever wanted on a provider dashboard, it has to be rebuilt on the
 * same source — and the "upgrade to reduce commission" half needs the tier
 * discount to exist in apps/api/src/lib/commission-math.ts first. Whether that
 * discount ships at all is the owner's decision, so nothing here is rewritten
 * to pre-empt it.
 */

import { ArrowUpRight, Percent } from "lucide-react";
import {
 getPlanById,
 getUpgradePlan,
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
 {/* PM-02b: this used to append "Just ₹1,499/mo" from the hardcoded
   ladder in lib/pricing. That number was never charged — the real
   price is role-specific and lives in the API — so the banner now
   sends the user to the plan page to read the price it will bill. */}
 <span> See your plan options for the exact price.</span>
 </p>
 )}
 </div>
 </div>

 {upgradePlan && (
 <a
 href="/pricing"
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
