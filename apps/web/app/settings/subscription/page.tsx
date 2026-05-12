"use client";

import { useState } from "react";
import {
 Check,
 X,
 CreditCard,
 ArrowUpRight,
 ArrowDownRight,
 AlertCircle,
 Calendar,
 Shield,
} from "lucide-react";
import {
 PLANS,
 formatPrice,
 getPlanById,
 type PlanId,
 type Plan,
} from "../../../lib/pricing";
import AuthGuard from "../../../components/AuthGuard";

// Mock: current user's subscription state
const MOCK_CURRENT_PLAN: PlanId = "basic";
const MOCK_NEXT_BILLING = "2026-05-16";
const MOCK_MEMBER_SINCE = "2025-11-01";

interface BillingRecord {
 id: string;
 date: string;
 description: string;
 amount: number;
 status: "paid" | "pending" | "failed";
}

const MOCK_BILLING_HISTORY: BillingRecord[] = [
 { id: "inv_006", date: "2026-04-01", description: "Basic Plan — April 2026", amount: 499, status: "paid" },
 { id: "inv_005", date: "2026-03-01", description: "Basic Plan — March 2026", amount: 499, status: "paid" },
 { id: "inv_004", date: "2026-02-01", description: "Basic Plan — February 2026", amount: 499, status: "paid" },
 { id: "inv_003", date: "2026-01-01", description: "Basic Plan — January 2026", amount: 499, status: "paid" },
 { id: "inv_002", date: "2025-12-01", description: "Basic Plan — December 2025", amount: 499, status: "paid" },
 { id: "inv_001", date: "2025-11-01", description: "Basic Plan — November 2025", amount: 499, status: "paid" },
];

function statusBadge(status: BillingRecord["status"]) {
 const map = {
 paid: { bg: "color-mix(in oklch, #437a22 12%, transparent)", color: "#437a22", label: "Paid" },
 pending: { bg: "color-mix(in oklch, #964219 12%, transparent)", color: "#964219", label: "Pending" },
 failed: { bg: "color-mix(in oklch, #a12c7b 12%, transparent)", color: "#a12c7b", label: "Failed" },
 };
 const s = map[status];
 return (
 <span
 className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
 style={{ background: s.bg, color: s.color }}
 >
 {s.label}
 </span>
 );
}

export default function SubscriptionPage() {
 return (
  <AuthGuard>
   <SubscriptionInner />
  </AuthGuard>
 );
}

function SubscriptionInner() {
 const [currentPlanId, setCurrentPlanId] = useState<PlanId>(MOCK_CURRENT_PLAN);
 const [showCancelModal, setShowCancelModal] = useState(false);
 const currentPlan = getPlanById(currentPlanId);

 function handleChangePlan(planId: PlanId) {
 // In production, this would call the API
 setCurrentPlanId(planId);
 }

 return (
 <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
 {/* Header */}
 <section className="py-10 sm:py-14">
 <div className="max-w-4xl mx-auto px-6 sm:px-8">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-2"
 style={{ color: "var(--color-primary)" }}
 >
 Settings
 </p>
 <h1
 className="text-xl sm:text-2xl font-bold mb-1"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 lineHeight: "var(--leading-tight)",
 }}
 >
 Subscription
 </h1>
 <p
 className="text-sm"
 style={{ color: "var(--color-text-muted)" }}
 >
 Manage your plan, view billing history, and update payment methods.
 </p>
 </div>
 </section>

 {/* Current plan card */}
 <section className="pb-10">
 <div className="max-w-4xl mx-auto px-6 sm:px-8">
 <div
 className="rounded-xl p-5 sm:p-6"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
 <div>
 <div className="flex items-center gap-2 mb-1">
 <Shield
 className="w-4 h-4"
 style={{ color: "var(--color-primary)" }}
 />
 <h2
 className="text-sm font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 Current Plan: {currentPlan.name}
 </h2>
 {currentPlan.popular && (
 <span
 className="px-2 py-0.5 rounded-full text-xs font-medium"
 style={{
 background: "var(--color-primary)",
 color: "var(--color-text-inverse)",
 }}
 >
 Popular
 </span>
 )}
 </div>
 <p
 className="text-xs"
 style={{ color: "var(--color-text-muted)" }}
 >
 {currentPlan.description}
 </p>
 </div>
 <div className="text-right">
 <span
 className="text-xl font-bold"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 {formatPrice(currentPlan.price)}
 </span>
 {currentPlan.price > 0 && (
 <span
 className="text-xs ml-1"
 style={{ color: "var(--color-text-faint)" }}
 >
 /month
 </span>
 )}
 </div>
 </div>

 {/* Plan stats */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
 {[
 {
 label: "Commission rate",
 value: `${currentPlan.commissionOverride}%`,
 },
 {
 label: "Max listings",
 value:
 currentPlan.maxListings === null
 ? "Unlimited"
 : String(currentPlan.maxListings),
 },
 { label: "Next billing", value: MOCK_NEXT_BILLING },
 { label: "Member since", value: MOCK_MEMBER_SINCE },
 ].map((stat) => (
 <div
 key={stat.label}
 className="p-3 rounded-lg"
 style={{ background: "var(--color-bg)" }}
 >
 <p
 className="text-xs mb-0.5"
 style={{ color: "var(--color-text-faint)" }}
 >
 {stat.label}
 </p>
 <p
 className="text-sm font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 {stat.value}
 </p>
 </div>
 ))}
 </div>

 {/* Features checklist */}
 <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
 {currentPlan.features.map((f) => (
 <div key={f.text} className="flex items-center gap-2">
 {f.included ? (
 <Check
 className="w-3.5 h-3.5"
 style={{ color: "var(--color-status-success)" }}
 />
 ) : (
 <X
 className="w-3.5 h-3.5"
 style={{ color: "var(--color-text-faint)" }}
 />
 )}
 <span
 className="text-xs"
 style={{
 color: f.included
 ? "var(--color-text)"
 : "var(--color-text-faint)",
 }}
 >
 {f.text}
 </span>
 </div>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* Upgrade / Downgrade options */}
 <section
 className="py-10"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-4xl mx-auto px-6 sm:px-8">
 <h2
 className="text-sm font-semibold mb-5"
 style={{ color: "var(--color-text)" }}
 >
 Change Plan
 </h2>
 <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
 {PLANS.map((plan) => {
 const isCurrent = plan.id === currentPlanId;
 const isUpgrade =
 PLANS.findIndex((p) => p.id === plan.id) >
 PLANS.findIndex((p) => p.id === currentPlanId);

 return (
 <div
 key={plan.id}
 className="rounded-xl p-4 flex flex-col"
 style={{
 background: "var(--color-bg)",
 border: isCurrent
 ? "2px solid var(--color-primary)"
 : "1px solid var(--color-border)",
 opacity: isCurrent ? 1 : 0.9,
 }}
 >
 <div className="flex items-center justify-between mb-2">
 <h3
 className="text-sm font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 {plan.name}
 </h3>
 {isCurrent && (
 <span
 className="text-xs font-medium px-2 py-0.5 rounded-full"
 style={{
 background: "var(--color-primary-highlight)",
 color: "var(--color-primary)",
 }}
 >
 Current
 </span>
 )}
 </div>
 <p
 className="text-lg font-bold mb-1"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 {formatPrice(plan.price)}
 {plan.price > 0 && (
 <span
 className="text-xs font-normal ml-0.5"
 style={{ color: "var(--color-text-faint)" }}
 >
 /mo
 </span>
 )}
 </p>
 <p
 className="text-xs mb-3"
 style={{ color: "var(--color-text-muted)" }}
 >
 {plan.commissionOverride}% commission
 </p>
 <div className="mt-auto">
 {isCurrent ? (
 <div
 className="text-center py-2 rounded-lg text-xs font-medium"
 style={{
 background: "var(--color-surface-offset)",
 color: "var(--color-text-faint)",
 }}
 >
 Active Plan
 </div>
 ) : (
 <button
 onClick={() => handleChangePlan(plan.id)}
 className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium btn-press transition-colors"
 style={
 isUpgrade
 ? {
 background: "var(--color-primary)",
 color: "var(--color-text-inverse)",
 }
 : {
 background: "var(--color-surface-offset)",
 color: "var(--color-text)",
 }
 }
 >
 {isUpgrade ? (
 <>
 Upgrade <ArrowUpRight className="w-3.5 h-3.5" />
 </>
 ) : (
 <>
 Downgrade <ArrowDownRight className="w-3.5 h-3.5" />
 </>
 )}
 </button>
 )}
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* Billing history */}
 <section className="py-10">
 <div className="max-w-4xl mx-auto px-6 sm:px-8">
 <div className="flex items-center justify-between mb-5">
 <h2
 className="text-sm font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 Billing History
 </h2>
 <button
 className="text-xs font-medium flex items-center gap-1"
 style={{ color: "var(--color-primary)" }}
 >
 <CreditCard className="w-3.5 h-3.5" />
 Update Payment Method
 </button>
 </div>

 <div
 className="rounded-xl overflow-hidden"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr style={{ background: "var(--color-surface-offset)" }}>
 <th
 className="text-left px-5 py-3 text-xs font-semibold"
 style={{ color: "var(--color-text-muted)" }}
 >
 Date
 </th>
 <th
 className="text-left px-4 py-3 text-xs font-semibold"
 style={{ color: "var(--color-text-muted)" }}
 >
 Description
 </th>
 <th
 className="text-right px-4 py-3 text-xs font-semibold"
 style={{ color: "var(--color-text-muted)" }}
 >
 Amount
 </th>
 <th
 className="text-center px-4 py-3 text-xs font-semibold"
 style={{ color: "var(--color-text-muted)" }}
 >
 Status
 </th>
 </tr>
 </thead>
 <tbody>
 {MOCK_BILLING_HISTORY.map((record) => (
 <tr
 key={record.id}
 style={{ borderTop: "1px solid var(--color-border)" }}
 >
 <td
 className="px-5 py-3 text-xs"
 style={{ color: "var(--color-text-muted)" }}
 >
 <span className="flex items-center gap-1.5">
 <Calendar className="w-3 h-3" />
 {record.date}
 </span>
 </td>
 <td
 className="px-4 py-3 text-xs"
 style={{ color: "var(--color-text)" }}
 >
 {record.description}
 </td>
 <td
 className="px-4 py-3 text-xs text-right font-medium"
 style={{ color: "var(--color-text)" }}
 >
 {formatPrice(record.amount)}
 </td>
 <td className="px-4 py-3 text-center">
 {statusBadge(record.status)}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </section>

 {/* Cancel subscription */}
 <section className="pb-14">
 <div className="max-w-4xl mx-auto px-6 sm:px-8">
 <div
 className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div className="flex items-start gap-3">
 <AlertCircle
 className="w-5 h-5 mt-0.5 shrink-0"
 style={{ color: "var(--color-status-warning)" }}
 />
 <div>
 <p
 className="text-sm font-medium mb-0.5"
 style={{ color: "var(--color-text)" }}
 >
 Cancel Subscription
 </p>
 <p
 className="text-xs"
 style={{ color: "var(--color-text-muted)" }}
 >
 Your plan stays active until the end of the billing period.
 You&apos;ll revert to the Free tier after that.
 </p>
 </div>
 </div>
 <button
 onClick={() => setShowCancelModal(true)}
 className="shrink-0 px-4 py-2 rounded-lg text-xs font-medium btn-press transition-colors"
 style={{
 background: "color-mix(in oklch, #a12c7b 10%, transparent)",
 color: "#a12c7b",
 }}
 >
 Cancel Plan
 </button>
 </div>

 {/* Cancel confirmation modal */}
 {showCancelModal && (
 <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
 <div
 className="absolute inset-0"
 style={{ background: "rgba(0,0,0,0.4)" }}
 onClick={() => setShowCancelModal(false)}
 />
 <div
 className="relative rounded-xl p-6 max-w-sm w-full"
 style={{
 background: "var(--color-surface)",
 boxShadow: "var(--shadow-lg)",
 }}
 >
 <h3
 className="text-sm font-semibold mb-2"
 style={{ color: "var(--color-text)" }}
 >
 Are you sure?
 </h3>
 <p
 className="text-xs mb-5 leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 Cancelling will revert you to the Free plan at the end of this
 billing cycle. Your commission rate will increase to 30% and
 listings will be limited to 5.
 </p>
 <div className="flex gap-3">
 <button
 onClick={() => setShowCancelModal(false)}
 className="flex-1 py-2 rounded-lg text-xs font-medium btn-press"
 style={{
 background: "var(--color-surface-offset)",
 color: "var(--color-text)",
 }}
 >
 Keep Plan
 </button>
 <button
 onClick={() => {
 setCurrentPlanId("free");
 setShowCancelModal(false);
 }}
 className="flex-1 py-2 rounded-lg text-xs font-medium btn-press"
 style={{
 background: "color-mix(in oklch, #a12c7b 12%, transparent)",
 color: "#a12c7b",
 }}
 >
 Confirm Cancel
 </button>
 </div>
 </div>
 </div>
 )}
 </div>
 </section>
 </div>
 );
}
