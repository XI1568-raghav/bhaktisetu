'use client';

import { useMemo, useState } from 'react';

const PLATFORM_FEE_INR_PER_MONTH = {
  Starter: 999,
  Pro: 2999,
  Enterprise: 4999,
} as const;

type Tier = keyof typeof PLATFORM_FEE_INR_PER_MONTH;

function inr(n: number): string {
  if (!Number.isFinite(n)) return '₹0';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export default function RoiCalculator() {
  const [monthlyDonations, setMonthlyDonations] = useState<number>(200);
  const [avgDonationInr, setAvgDonationInr] = useState<number>(501);
  const [adminHoursPerWeek, setAdminHoursPerWeek] = useState<number>(8);
  const [tier, setTier] = useState<Tier>('Pro');

  const result = useMemo(() => {
    const monthlyGmv = monthlyDonations * avgDonationInr;
    const annualGmv = monthlyGmv * 12;
    // Manual ops cost: assume ₹400/hr fully loaded admin time saved
    const adminCostPerYear = adminHoursPerWeek * 52 * 400;
    // 80G receipt manual cost: ₹15 per receipt avoided
    const eightyGSavings = monthlyDonations * 12 * 15;
    // Donor retention uplift: assume 8% recurring donor retention improvement on annual GMV
    const retentionUplift = annualGmv * 0.08;
    // Total annual benefit
    const totalBenefit = adminCostPerYear + eightyGSavings + retentionUplift;
    // Platform cost: 12 months at list price
    const annualPlatformCost = PLATFORM_FEE_INR_PER_MONTH[tier] * 12;
    // Pilot first-year cost: 3 months at 50% + 9 months at full
    const pilotFirstYearCost =
      PLATFORM_FEE_INR_PER_MONTH[tier] * 0.5 * 3 + PLATFORM_FEE_INR_PER_MONTH[tier] * 9;
    const netBenefitListYear1 = totalBenefit - annualPlatformCost;
    const netBenefitPilotYear1 = totalBenefit - pilotFirstYearCost;
    const roiMultipleList = annualPlatformCost > 0 ? totalBenefit / annualPlatformCost : 0;

    return {
      monthlyGmv,
      annualGmv,
      adminCostPerYear,
      eightyGSavings,
      retentionUplift,
      totalBenefit,
      annualPlatformCost,
      pilotFirstYearCost,
      netBenefitListYear1,
      netBenefitPilotYear1,
      roiMultipleList,
    };
  }, [monthlyDonations, avgDonationInr, adminHoursPerWeek, tier]);

  return (
    <div className="rounded-2xl border border-surface-200 bg-cream-50 p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-surface-800">Monthly online donations (count)</span>
            <input
              type="number"
              min={0}
              step={10}
              value={monthlyDonations}
              onChange={(e) => setMonthlyDonations(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-base"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-surface-800">Average donation amount (₹)</span>
            <input
              type="number"
              min={0}
              step={51}
              value={avgDonationInr}
              onChange={(e) => setAvgDonationInr(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-base"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-surface-800">
              Admin hours/week spent on donor ops + 80G PDFs
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={adminHoursPerWeek}
              onChange={(e) => setAdminHoursPerWeek(Math.max(0, Number(e.target.value) || 0))}
              className="mt-1 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-base"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-surface-800">Pricing tier</span>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as Tier)}
              className="mt-1 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-base"
            >
              <option value="Starter">Starter · ₹999/mo</option>
              <option value="Pro">Pro · ₹2,999/mo</option>
              <option value="Enterprise">Enterprise · ₹4,999/mo</option>
            </select>
          </label>
        </div>

        <div className="space-y-3 rounded-xl bg-white p-5">
          <h3 className="font-display text-lg font-bold text-indigo-900">Estimated annual impact</h3>
          <Row label="Annual donation GMV processed" value={inr(result.annualGmv)} />
          <Row label="Admin time saved (₹400/hr)" value={inr(result.adminCostPerYear)} accent="emerald" />
          <Row label="80G PDF automation (₹15/receipt)" value={inr(result.eightyGSavings)} accent="emerald" />
          <Row label="Donor retention uplift (+8%)" value={inr(result.retentionUplift)} accent="emerald" />
          <div className="my-2 border-t border-surface-200" />
          <Row label="Total annual benefit" value={inr(result.totalBenefit)} bold />
          <Row
            label={`Platform cost (${tier} list)`}
            value={`-${inr(result.annualPlatformCost)}`}
            accent="saffron"
          />
          <Row
            label="Net benefit year 1 (list)"
            value={inr(result.netBenefitListYear1)}
            bold
            accent="indigo"
          />
          <Row
            label="Net benefit year 1 (pilot terms)"
            value={inr(result.netBenefitPilotYear1)}
            bold
            accent="indigo"
          />
          <Row
            label="ROI multiple (benefit / list cost)"
            value={`${result.roiMultipleList.toFixed(1)}×`}
            bold
          />
        </div>
      </div>
      <p className="mt-4 text-xs text-surface-600">
        Estimates assume mid-market rates: ₹400/hr loaded admin time, ₹15 per manually-issued 80G PDF, 8%
        recurring donor retention lift from native CRM. Your actual numbers will vary; founder will
        co-build a custom ROI deck during pilot onboarding.
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: 'emerald' | 'saffron' | 'indigo';
}) {
  const accentClass =
    accent === 'emerald'
      ? 'text-emerald-700'
      : accent === 'saffron'
        ? 'text-saffron-700'
        : accent === 'indigo'
          ? 'text-indigo-800'
          : 'text-surface-900';
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-surface-700">{label}</span>
      <span className={`${bold ? 'font-bold' : 'font-medium'} ${accentClass}`}>{value}</span>
    </div>
  );
}
