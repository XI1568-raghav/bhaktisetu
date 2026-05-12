"use client";

import { useState } from "react";
import {
 TrendingUp,
 Clock,
 Percent,
 ArrowUpRight,
 Wallet,
 Building2,
 CreditCard,
 Download,
 Filter,
} from "lucide-react";
import { formatPrice } from "../../../lib/pricing";
import AuthGuard from "../../../components/AuthGuard";

// ── Mock data ─────────────────────────────────────────────────────────────

interface MonthlyEarning {
 month: string;
 shortMonth: string;
 gross: number;
 commission: number;
 net: number;
}

const MOCK_MONTHLY: MonthlyEarning[] = [
 { month: "November 2025", shortMonth: "Nov", gross: 18500, commission: 3700, net: 14800 },
 { month: "December 2025", shortMonth: "Dec", gross: 32000, commission: 6400, net: 25600 },
 { month: "January 2026", shortMonth: "Jan", gross: 27500, commission: 5500, net: 22000 },
 { month: "February 2026", shortMonth: "Feb", gross: 41000, commission: 8200, net: 32800 },
 { month: "March 2026", shortMonth: "Mar", gross: 38000, commission: 7600, net: 30400 },
 { month: "April 2026", shortMonth: "Apr", gross: 24000, commission: 4800, net: 19200 },
];

interface Transaction {
 id: string;
 date: string;
 type: "puja_booking" | "product_sale" | "consultation" | "donation";
 description: string;
 gross: number;
 commission: number;
 net: number;
 status: "completed" | "pending" | "processing";
}

const MOCK_TRANSACTIONS: Transaction[] = [
 { id: "TXN-20260415-001", date: "2026-04-15", type: "puja_booking", description: "Satyanarayan Puja — Kashi Vishwanath", gross: 2100, commission: 420, net: 1680, status: "completed" },
 { id: "TXN-20260414-002", date: "2026-04-14", type: "product_sale", description: "Brass Puja Thali Set x2", gross: 2598, commission: 390, net: 2208, status: "completed" },
 { id: "TXN-20260413-003", date: "2026-04-13", type: "consultation", description: "Kundli Match — Pandit Sharma", gross: 1500, commission: 300, net: 1200, status: "processing" },
 { id: "TXN-20260412-004", date: "2026-04-12", type: "puja_booking", description: "Rudrabhishek — Mahakaleshwar", gross: 3500, commission: 700, net: 2800, status: "completed" },
 { id: "TXN-20260411-005", date: "2026-04-11", type: "donation", description: "Donation — Tirupati Balaji", gross: 5000, commission: 500, net: 4500, status: "completed" },
 { id: "TXN-20260410-006", date: "2026-04-10", type: "puja_booking", description: "Navgraha Shanti Puja", gross: 1800, commission: 360, net: 1440, status: "completed" },
 { id: "TXN-20260409-007", date: "2026-04-09", type: "product_sale", description: "5 Mukhi Rudraksha Mala", gross: 599, commission: 90, net: 509, status: "pending" },
 { id: "TXN-20260408-008", date: "2026-04-08", type: "consultation", description: "Horoscope Reading — Astrologer Iyer", gross: 800, commission: 160, net: 640, status: "completed" },
];

const typeLabels: Record<Transaction["type"], string> = {
 puja_booking: "Puja",
 product_sale: "Store",
 consultation: "Consultation",
 donation: "Donation",
};

const typeColors: Record<Transaction["type"], string> = {
 puja_booking: "#b87333",
 product_sale: "#16a34a",
 consultation: "#0ea5e9",
 donation: "#D4A438",
};

const statusStyles: Record<Transaction["status"], { bg: string; color: string }> = {
 completed: { bg: "color-mix(in oklch, #437a22 12%, transparent)", color: "#437a22" },
 pending: { bg: "color-mix(in oklch, #964219 12%, transparent)", color: "#964219" },
 processing: { bg: "color-mix(in oklch, #006494 12%, transparent)", color: "#006494" },
};

export default function EarningsPage() {
 return (
  <AuthGuard>
   <EarningsInner />
  </AuthGuard>
 );
}

function EarningsInner() {
 const [filterType, setFilterType] = useState<Transaction["type"] | "all">("all");

 const totalGross = MOCK_MONTHLY.reduce((s, m) => s + m.gross, 0);
 const totalCommission = MOCK_MONTHLY.reduce((s, m) => s + m.commission, 0);
 const totalNet = MOCK_MONTHLY.reduce((s, m) => s + m.net, 0);
 const pendingPayout = MOCK_TRANSACTIONS
 .filter((t) => t.status === "pending" || t.status === "processing")
 .reduce((s, t) => s + t.net, 0);

 const maxGross = Math.max(...MOCK_MONTHLY.map((m) => m.gross));

 const filteredTransactions =
 filterType === "all"
 ? MOCK_TRANSACTIONS
 : MOCK_TRANSACTIONS.filter((t) => t.type === filterType);

 return (
 <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
 {/* Header */}
 <section className="py-10 sm:py-14">
 <div className="max-w-5xl mx-auto px-6 sm:px-8">
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
 Earnings
 </h1>
 <p
 className="text-sm"
 style={{ color: "var(--color-text-muted)" }}
 >
 Track your revenue, commissions, and payouts.
 </p>
 </div>
 </section>

 {/* Summary cards */}
 <section className="pb-10">
 <div className="max-w-5xl mx-auto px-6 sm:px-8">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {[
 {
 label: "Total Earnings",
 value: formatPrice(totalNet),
 icon: TrendingUp,
 accent: "var(--color-status-success)",
 },
 {
 label: "Gross Revenue",
 value: formatPrice(totalGross),
 icon: Wallet,
 accent: "var(--color-primary)",
 },
 {
 label: "Commission Paid",
 value: formatPrice(totalCommission),
 icon: Percent,
 accent: "var(--color-status-warning)",
 },
 {
 label: "Pending Payout",
 value: formatPrice(pendingPayout),
 icon: Clock,
 accent: "var(--color-status-info)",
 },
 ].map((card) => {
 const Icon = card.icon;
 return (
 <div
 key={card.label}
 className="rounded-xl p-4"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div className="flex items-center gap-2 mb-2">
 <div
 className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{
 background: `color-mix(in oklch, ${card.accent} 12%, transparent)`,
 }}
 >
 <Icon className="w-3.5 h-3.5" style={{ color: card.accent }} />
 </div>
 <span
 className="text-xs"
 style={{ color: "var(--color-text-faint)" }}
 >
 {card.label}
 </span>
 </div>
 <p
 className="text-lg font-bold"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 {card.value}
 </p>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* Earnings bar chart */}
 <section
 className="py-10"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-5xl mx-auto px-6 sm:px-8">
 <h2
 className="text-sm font-semibold mb-5"
 style={{ color: "var(--color-text)" }}
 >
 Monthly Earnings
 </h2>
 <div
 className="rounded-xl p-5"
 style={{
 background: "var(--color-bg)",
 border: "1px solid var(--color-border)",
 }}
 >
 {/* Bar chart — pure CSS */}
 <div className="flex items-end gap-3 sm:gap-5 h-48">
 {MOCK_MONTHLY.map((m) => {
 const grossPct = (m.gross / maxGross) * 100;
 const netPct = (m.net / maxGross) * 100;
 return (
 <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
 <span
 className="text-xs font-medium mb-1"
 style={{ color: "var(--color-text)" }}
 >
 {formatPrice(m.net)}
 </span>
 <div className="w-full flex flex-col items-center gap-0.5" style={{ height: "140px" }}>
 <div className="w-full flex gap-0.5 items-end" style={{ height: "100%" }}>
 {/* Gross bar */}
 <div
 className="flex-1 rounded-t-md transition-all duration-500"
 style={{
 height: `${grossPct}%`,
 background: "var(--color-surface-offset)",
 }}
 title={`Gross: ${formatPrice(m.gross)}`}
 />
 {/* Net bar */}
 <div
 className="flex-1 rounded-t-md transition-all duration-500"
 style={{
 height: `${netPct}%`,
 background: "var(--color-primary)",
 }}
 title={`Net: ${formatPrice(m.net)}`}
 />
 </div>
 </div>
 <span
 className="text-xs mt-1"
 style={{ color: "var(--color-text-faint)" }}
 >
 {m.shortMonth}
 </span>
 </div>
 );
 })}
 </div>
 {/* Legend */}
 <div className="flex items-center gap-5 mt-4 justify-center">
 <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
 <span className="w-3 h-3 rounded-sm" style={{ background: "var(--color-surface-offset)" }} />
 Gross
 </span>
 <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
 <span className="w-3 h-3 rounded-sm" style={{ background: "var(--color-primary)" }} />
 Net Earnings
 </span>
 </div>
 </div>
 </div>
 </section>

 {/* Transaction history */}
 <section className="py-10">
 <div className="max-w-5xl mx-auto px-6 sm:px-8">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
 <h2
 className="text-sm font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 Transaction History
 </h2>
 <div className="flex items-center gap-2">
 <Filter className="w-3.5 h-3.5" style={{ color: "var(--color-text-faint)" }} />
 <select
 value={filterType}
 onChange={(e) => setFilterType(e.target.value as Transaction["type"] | "all")}
 className="text-xs px-3 py-1.5 rounded-lg appearance-none cursor-pointer"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 color: "var(--color-text)",
 }}
 >
 <option value="all">All Types</option>
 <option value="puja_booking">Puja Bookings</option>
 <option value="product_sale">Product Sales</option>
 <option value="consultation">Consultations</option>
 <option value="donation">Donations</option>
 </select>
 </div>
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
 <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Date</th>
 <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Type</th>
 <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Description</th>
 <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Gross</th>
 <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Commission</th>
 <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Net</th>
 <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>Status</th>
 </tr>
 </thead>
 <tbody>
 {filteredTransactions.map((txn) => {
 const ss = statusStyles[txn.status];
 return (
 <tr key={txn.id} style={{ borderTop: "1px solid var(--color-border)" }}>
 <td className="px-5 py-3 text-xs" style={{ color: "var(--color-text-muted)" }}>{txn.date}</td>
 <td className="px-4 py-3">
 <span
 className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
 style={{
 background: `color-mix(in oklch, ${typeColors[txn.type]} 12%, transparent)`,
 color: typeColors[txn.type],
 }}
 >
 {typeLabels[txn.type]}
 </span>
 </td>
 <td className="px-4 py-3 text-xs" style={{ color: "var(--color-text)" }}>{txn.description}</td>
 <td className="px-4 py-3 text-xs text-right" style={{ color: "var(--color-text)" }}>{formatPrice(txn.gross)}</td>
 <td className="px-4 py-3 text-xs text-right" style={{ color: "var(--color-status-warning)" }}>-{formatPrice(txn.commission)}</td>
 <td className="px-4 py-3 text-xs text-right font-medium" style={{ color: "var(--color-text)" }}>{formatPrice(txn.net)}</td>
 <td className="px-4 py-3 text-center">
 <span
 className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
 style={{ background: ss.bg, color: ss.color }}
 >
 {txn.status}
 </span>
 </td>
 </tr>
 );
 })}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </section>

 {/* Request payout + Bank details */}
 <section
 className="py-10"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-5xl mx-auto px-6 sm:px-8">
 <div className="grid md:grid-cols-2 gap-6">
 {/* Request Payout */}
 <div
 className="rounded-xl p-5"
 style={{
 background: "var(--color-bg)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div className="flex items-center gap-2 mb-4">
 <Wallet className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
 <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
 Request Payout
 </h3>
 </div>
 <p className="text-xs mb-4 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
 Automatic weekly payouts run every Monday. You can also request
 an instant payout for completed transactions.
 </p>
 <div className="flex items-center justify-between mb-4">
 <span className="text-xs" style={{ color: "var(--color-text-faint)" }}>Available balance</span>
 <span className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
 {formatPrice(pendingPayout)}
 </span>
 </div>
 <button
 className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium btn-press transition-colors"
 style={{
 background: "var(--color-primary)",
 color: "var(--color-text-inverse)",
 }}
 >
 <Download className="w-4 h-4" />
 Request Instant Payout
 </button>
 </div>

 {/* Bank Account Details (mock form) */}
 <div
 className="rounded-xl p-5"
 style={{
 background: "var(--color-bg)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div className="flex items-center gap-2 mb-4">
 <Building2 className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
 <h3 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
 Bank Account
 </h3>
 </div>
 <div className="space-y-3">
 <div>
 <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
 Account Holder Name
 </label>
 <input
 type="text"
 defaultValue="Pandit Ramesh Sharma"
 className="w-full text-xs px-3 py-2 rounded-lg"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 color: "var(--color-text)",
 }}
 />
 </div>
 <div>
 <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
 Account Number
 </label>
 <input
 type="text"
 defaultValue="**** **** **** 4289"
 className="w-full text-xs px-3 py-2 rounded-lg"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 color: "var(--color-text)",
 }}
 />
 </div>
 <div>
 <label className="block text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
 IFSC Code
 </label>
 <input
 type="text"
 defaultValue="SBIN0001234"
 className="w-full text-xs px-3 py-2 rounded-lg"
 style={{
 background: "var(--color-surface)",
 border: "1px solid var(--color-border)",
 color: "var(--color-text)",
 }}
 />
 </div>
 <button
 className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium btn-press transition-colors"
 style={{
 background: "var(--color-surface-offset)",
 color: "var(--color-text)",
 }}
 >
 <CreditCard className="w-3.5 h-3.5" />
 Update Bank Details
 </button>
 </div>
 </div>
 </div>
 </div>
 </section>
 </div>
 );
}
