'use client';

import { useState } from 'react';
import {
  IndianRupee,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  PiggyBank,
  Send,
  ChevronRight,
} from 'lucide-react';

// ── Mock Revenue Data ─────────────────────────────────────────────────────────

const overviewCards = [
  { label: 'Total Revenue', value: 'Rs. 1.24Cr', change: '+22.4%', up: true, icon: IndianRupee, color: 'bg-green-50 text-green-600' },
  { label: 'Commissions Earned', value: 'Rs. 31.2L', change: '+18.1%', up: true, icon: Wallet, color: 'bg-saffron-50 text-saffron-600' },
  { label: 'Subscriptions', value: 'Rs. 8.6L', change: '+34.5%', up: true, icon: CreditCard, color: 'bg-blue-50 text-blue-600' },
  { label: 'Pending Payouts', value: 'Rs. 4.8L', change: '+2.1%', up: true, icon: Send, color: 'bg-amber-50 text-amber-600' },
];

const revenueBySource = [
  { source: 'Puja Bookings', amount: 7240000, pct: 58.4, color: 'bg-saffron-500' },
  { source: 'Store Sales', amount: 2860000, pct: 23.1, color: 'bg-green-500' },
  { source: 'Astrology Consultations', amount: 1120000, pct: 9.0, color: 'bg-purple-500' },
  { source: 'Wellness Classes', amount: 680000, pct: 5.5, color: 'bg-teal-500' },
  { source: 'Gaushala Donations', amount: 320000, pct: 2.6, color: 'bg-amber-500' },
  { source: 'Temple Chadhava', amount: 180000, pct: 1.4, color: 'bg-red-500' },
];

const monthlyTrend = [
  { month: 'Nov', amount: 1420000 },
  { month: 'Dec', amount: 1680000 },
  { month: 'Jan', amount: 1540000 },
  { month: 'Feb', amount: 1870000 },
  { month: 'Mar', amount: 2210000 },
  { month: 'Apr', amount: 2480000 },
];

const maxMonthly = Math.max(...monthlyTrend.map((m) => m.amount));

const topEarners = [
  { name: 'Pandit Ramesh Sharma', role: 'Pandit', city: 'Varanasi', earnings: 485000, pujas: 342 },
  { name: 'Shri Ganesh Puja Store', role: 'Store', city: 'Ahmedabad', earnings: 892000, pujas: 1234 },
  { name: 'Rakesh Tiwari', role: 'Astrologer', city: 'Pune', earnings: 312000, pujas: 487 },
  { name: 'Ananya Devi', role: 'Wellness', city: 'Rishikesh', earnings: 234000, pujas: 156 },
  { name: 'Swami Dayananda', role: 'Temple Mgr', city: 'Haridwar', earnings: 650000, pujas: 89 },
  { name: 'Pandit Hari Om Mishra', role: 'Pandit', city: 'Kashi', earnings: 378000, pujas: 276 },
  { name: 'Vikram Patel', role: 'Store', city: 'Ahmedabad', earnings: 445000, pujas: 892 },
  { name: 'Dinesh Chaudhary', role: 'Gaushala', city: 'Mathura', earnings: 180000, pujas: 45 },
];

const commissionRates = [
  { category: 'Puja Bookings', rate: '25%', amount: 'Rs. 18.1L' },
  { category: 'Store Sales', rate: '15%', amount: 'Rs. 4.3L' },
  { category: 'Astrology', rate: '30%', amount: 'Rs. 3.4L' },
  { category: 'Wellness Classes', rate: '20%', amount: 'Rs. 1.4L' },
  { category: 'Gaushala Donations', rate: '10%', amount: 'Rs. 0.3L' },
  { category: 'Temple Chadhava', rate: '20%', amount: 'Rs. 0.4L' },
];

const pendingPayouts = [
  { name: 'Pandit Ramesh Sharma', role: 'Pandit', amount: 42000, dueDate: '2026-04-20' },
  { name: 'Ananya Devi', role: 'Wellness', amount: 18500, dueDate: '2026-04-20' },
  { name: 'Rakesh Tiwari', role: 'Astrologer', amount: 28000, dueDate: '2026-04-22' },
  { name: 'Vikram Patel', role: 'Store', amount: 65000, dueDate: '2026-04-22' },
  { name: 'Pandit Hari Om Mishra', role: 'Pandit', amount: 31500, dueDate: '2026-04-25' },
  { name: 'Swami Dayananda', role: 'Temple', amount: 55000, dueDate: '2026-04-25' },
];

const roleBadgeColors: Record<string, string> = {
  Pandit: 'bg-saffron-50 text-saffron-700',
  Store: 'bg-green-50 text-green-700',
  Astrologer: 'bg-purple-50 text-purple-700',
  Wellness: 'bg-teal-50 text-teal-700',
  Gaushala: 'bg-amber-50 text-amber-700',
  'Temple Mgr': 'bg-red-50 text-red-700',
  Temple: 'bg-red-50 text-red-700',
};

export default function AdminRevenuePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-surface-800">Revenue</h1>
        <p className="text-sm text-surface-500 mt-0.5">Platform revenue, commissions, and payout management</p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-[var(--color-surface)] rounded-xl p-5 border border-[var(--color-border)]">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${card.up ? 'text-green-600' : 'text-red-600'}`}>
                  {card.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {card.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-surface-800 mt-3">{card.value}</p>
              <p className="text-sm text-surface-500 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by source */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="text-sm font-semibold text-surface-800 mb-4">Revenue by Source</h2>
          <div className="space-y-3">
            {revenueBySource.map((item) => (
              <div key={item.source}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-surface-600">{item.source}</span>
                  <span className="text-surface-800 font-medium">
                    Rs. {(item.amount / 100000).toFixed(1)}L ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly trend (CSS bar chart) */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
          <h2 className="text-sm font-semibold text-surface-800 mb-4">Monthly Revenue Trend</h2>
          <div className="flex items-end gap-3 h-48 px-2">
            {monthlyTrend.map((m) => {
              const height = (m.amount / maxMonthly) * 100;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-surface-800">
                    Rs. {(m.amount / 100000).toFixed(1)}L
                  </span>
                  <div className="w-full bg-surface-100 rounded-t-md relative" style={{ height: '160px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-saffron-500 rounded-t-md transition-all duration-500"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-xs text-surface-500">{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top earners */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-surface-800">Top Earners</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Role</th>
                  <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {topEarners.map((e, i) => (
                  <tr key={e.name} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
                    <td className="py-2.5 px-5">
                      <p className="font-medium text-surface-800">{e.name}</p>
                      <p className="text-xs text-surface-400">{e.city}</p>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[e.role] || 'bg-surface-100 text-surface-600'}`}>
                        {e.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-5 text-right font-medium text-surface-800">
                      Rs. {e.earnings.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Commission rates */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-surface-800">Commission Rates by Category</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Category</th>
                  <th className="text-center py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Rate</th>
                  <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Earned</th>
                </tr>
              </thead>
              <tbody>
                {commissionRates.map((c, i) => (
                  <tr key={c.category} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
                    <td className="py-2.5 px-5 text-surface-800">{c.category}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 bg-saffron-50 text-saffron-700 rounded-full text-xs font-semibold">{c.rate}</span>
                    </td>
                    <td className="py-2.5 px-5 text-right font-medium text-surface-800">{c.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending payouts */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-semibold text-surface-800">Pending Payouts</h2>
          <button className="text-xs text-saffron-600 font-medium hover:text-saffron-700 flex items-center gap-1">
            Process All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Role</th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Due Date</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Amount</th>
                <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayouts.map((p, i) => (
                <tr key={p.name + p.dueDate} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
                  <td className="py-2.5 px-5 font-medium text-surface-800">{p.name}</td>
                  <td className="py-2.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColors[p.role] || 'bg-surface-100 text-surface-600'}`}>
                      {p.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-surface-500">
                    {new Date(p.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="py-2.5 px-4 text-right font-semibold text-surface-800">
                    Rs. {p.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-5 text-right">
                    <button className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition-colors">
                      Pay Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
