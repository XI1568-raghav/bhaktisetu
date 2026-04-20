'use client';

import {
  TrendingUp,
  Users,
  Calendar,
  MapPin,
  Download,
  Flame,
  Star,
  BarChart3,
} from 'lucide-react';

// ── Mock Data ─────────────────────────────────────────────────────────────────

const userGrowth = [
  { month: 'Nov 25', users: 6200 },
  { month: 'Dec 25', users: 7100 },
  { month: 'Jan 26', users: 8400 },
  { month: 'Feb 26', users: 9600 },
  { month: 'Mar 26', users: 11200 },
  { month: 'Apr 26', users: 12847 },
];

const maxUsers = Math.max(...userGrowth.map((m) => m.users));

const bookingStats = [
  { label: 'Total Bookings', value: '8,432', change: '+15.2%' },
  { label: 'Completed', value: '7,156', change: '+12.8%' },
  { label: 'In Progress', value: '842', change: '+24.1%' },
  { label: 'Cancelled', value: '434', change: '-3.2%' },
];

const popularPujas = [
  { name: 'Satyanarayan Puja', bookings: 1245, revenue: 'Rs. 18.7L', rating: 4.9 },
  { name: 'Rudrabhishek', bookings: 892, revenue: 'Rs. 15.6L', rating: 4.8 },
  { name: 'Griha Pravesh Puja', bookings: 756, revenue: 'Rs. 12.1L', rating: 4.7 },
  { name: 'Navgraha Shanti', bookings: 634, revenue: 'Rs. 10.8L', rating: 4.8 },
  { name: 'Kaal Sarp Dosh Nivaran', bookings: 578, revenue: 'Rs. 9.2L', rating: 4.6 },
  { name: 'Sunderkand Path', bookings: 445, revenue: 'Rs. 5.3L', rating: 4.9 },
  { name: 'Vastu Shanti', bookings: 389, revenue: 'Rs. 7.8L', rating: 4.5 },
  { name: 'Maha Mrityunjay Jaap', bookings: 312, revenue: 'Rs. 6.2L', rating: 4.7 },
];

const maxBookings = Math.max(...popularPujas.map((p) => p.bookings));

const popularServices = [
  { name: 'Kundli Analysis', type: 'Astrology', sessions: 892, rating: 4.7 },
  { name: 'Hatha Yoga', type: 'Wellness', sessions: 678, rating: 4.9 },
  { name: 'Pranayama Course', type: 'Wellness', sessions: 534, rating: 4.8 },
  { name: 'Match Making', type: 'Astrology', sessions: 456, rating: 4.6 },
  { name: 'Meditation Class', type: 'Wellness', sessions: 423, rating: 4.8 },
];

const geographicDistribution = [
  { state: 'Uttar Pradesh', users: 2845, pct: 22.1 },
  { state: 'Maharashtra', users: 2120, pct: 16.5 },
  { state: 'Delhi NCR', users: 1680, pct: 13.1 },
  { state: 'Gujarat', users: 1234, pct: 9.6 },
  { state: 'Rajasthan', users: 998, pct: 7.8 },
  { state: 'Madhya Pradesh', users: 876, pct: 6.8 },
  { state: 'Tamil Nadu', users: 756, pct: 5.9 },
  { state: 'Karnataka', users: 645, pct: 5.0 },
  { state: 'Bihar', users: 534, pct: 4.2 },
  { state: 'Others', users: 1159, pct: 9.0 },
];

const maxStatePct = Math.max(...geographicDistribution.map((g) => g.pct));

export default function AdminReportsPage() {
  const handleExport = (type: string) => {
    // Mock export — in production, call API endpoint
    alert(`Export "${type}" report triggered (demo)`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-surface-800">Reports</h1>
          <p className="text-sm text-surface-500 mt-0.5">Analytics, trends, and platform insights</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('users')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium text-surface-700 rounded-lg hover:bg-surface-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Users
          </button>
          <button
            onClick={() => handleExport('revenue')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-medium text-surface-700 rounded-lg hover:bg-surface-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Revenue
          </button>
          <button
            onClick={() => handleExport('bookings')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-saffron-600 text-white text-xs font-medium rounded-lg hover:bg-saffron-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export All
          </button>
        </div>
      </div>

      {/* User growth chart */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> User Growth
          </h2>
          <span className="text-xs text-green-600 font-medium flex items-center gap-0.5">
            <TrendingUp className="w-3 h-3" /> +107% in 6 months
          </span>
        </div>
        <div className="flex items-end gap-4 h-48 px-2">
          {userGrowth.map((m) => {
            const height = (m.users / maxUsers) * 100;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-semibold text-surface-800">
                  {(m.users / 1000).toFixed(1)}K
                </span>
                <div className="w-full bg-surface-100 rounded-t-md relative" style={{ height: '150px' }}>
                  <div
                    className="absolute bottom-0 w-full bg-blue-500 rounded-t-md transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-xs text-surface-500">{m.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {bookingStats.map((stat) => (
          <div key={stat.label} className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
            <p className="text-xs text-surface-500">{stat.label}</p>
            <p className="text-xl font-bold text-surface-800 mt-1">{stat.value}</p>
            <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
              {stat.change} vs last month
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular pujas */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
              <Flame className="w-4 h-4 text-saffron-500" /> Popular Pujas
            </h2>
          </div>
          <div className="p-5 space-y-3">
            {popularPujas.map((puja, i) => (
              <div key={puja.name} className="flex items-center gap-3">
                <span className="text-xs font-bold text-surface-400 w-5 text-right">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-surface-800 truncate">{puja.name}</span>
                    <span className="text-xs text-surface-500 shrink-0 ml-2">{puja.bookings} bookings</span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-saffron-400"
                      style={{ width: `${(puja.bookings / maxBookings) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-surface-500">{puja.revenue}</span>
                    <span className="text-xs text-amber-600 flex items-center gap-0.5">
                      <Star className="w-3 h-3" /> {puja.rating}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular services + Geographic distribution */}
        <div className="space-y-6">
          {/* Popular services */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-500" /> Popular Services
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Service</th>
                    <th className="text-left py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Type</th>
                    <th className="text-right py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Sessions</th>
                    <th className="text-right py-2.5 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {popularServices.map((s, i) => (
                    <tr key={s.name} className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}>
                      <td className="py-2.5 px-5 font-medium text-surface-800">{s.name}</td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.type === 'Astrology' ? 'bg-purple-50 text-purple-700' : 'bg-teal-50 text-teal-700'}`}>
                          {s.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right text-surface-600">{s.sessions}</td>
                      <td className="py-2.5 px-5 text-right text-amber-600 font-medium flex items-center justify-end gap-0.5">
                        <Star className="w-3 h-3" /> {s.rating}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Geographic distribution */}
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
            <h2 className="text-sm font-semibold text-surface-800 flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-red-500" /> Geographic Distribution
            </h2>
            <div className="space-y-2.5">
              {geographicDistribution.map((g) => (
                <div key={g.state}>
                  <div className="flex items-center justify-between text-sm mb-0.5">
                    <span className="text-surface-600">{g.state}</span>
                    <span className="text-surface-800 font-medium text-xs">
                      {g.users.toLocaleString('en-IN')} ({g.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{ width: `${(g.pct / maxStatePct) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
