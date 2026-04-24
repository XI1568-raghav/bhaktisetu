'use client';

import { useAuth } from '../../lib/auth-context';
import Link from 'next/link';

const stats = [
  { label: 'Total Cows',        value: '247',    change: '+3 this month',   emoji: '🐄', color: 'bg-amber-50 border-amber-200'   },
  { label: 'Active Donors',     value: '1,842',  change: '+128 this month', emoji: '❤️', color: 'bg-rose-50 border-rose-200'     },
  { label: 'Monthly Donations', value: '₹3.2L',  change: '+12% vs last',   emoji: '💰', color: 'bg-green-50 border-green-200'   },
  { label: 'Volunteers Today',  value: '34',     change: '6 new signups',  emoji: '🙏', color: 'bg-blue-50 border-blue-200'     },
];

const recentDonations = [
  { name: 'Ramesh Sharma',  amount: '₹5,100',  type: 'Gau Seva',     time: '2h ago'  },
  { name: 'Priya Agarwal',  amount: '₹2,500',  type: 'Feed Sponsor', time: '4h ago'  },
  { name: 'Vijay Kumar',    amount: '₹11,000', type: 'Medical Fund', time: '1d ago'  },
  { name: 'Sunita Devi',    amount: '₹1,100',  type: 'Gau Seva',     time: '1d ago'  },
  { name: 'Ankit Mehta',    amount: '₹21,000', type: 'Adoption',     time: '2d ago'  },
];

const cowHighlights = [
  { id: 'GS-001', name: 'Kamdhenu',  breed: 'Gir',        status: 'Healthy',   age: '4y' },
  { id: 'GS-002', name: 'Nandini',   breed: 'Sahiwal',    status: 'Treatment', age: '6y' },
  { id: 'GS-003', name: 'Surabhi',   breed: 'Tharparkar', status: 'Healthy',   age: '3y' },
  { id: 'GS-004', name: 'Ganga',     breed: 'Gir',        status: 'Pregnant',  age: '5y' },
];

const statusColor: Record<string, string> = {
  Healthy:   'bg-green-100 text-green-700',
  Treatment: 'bg-red-100 text-red-700',
  Pregnant:  'bg-purple-100 text-purple-700',
};

export default function GaushalaDashboard() {
  const { user } = useAuth();

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-amber-900">Jai Gau Mata 🐄</h1>
        <p className="text-amber-700 mt-1 text-sm">
          Welcome back, {user?.fullName}. Here&apos;s your gaushala overview.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl p-5 shadow-sm border ${s.color}`}>
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{s.emoji}</span>
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100">
                {s.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-900">{s.value}</p>
            <p className="text-sm text-amber-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Two-column */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Donations */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-50 flex items-center justify-between">
            <h2 className="font-semibold text-amber-900">Recent Donations</h2>
            <Link href="/gaushala-portal/donations" className="text-xs text-amber-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-amber-50">
            {recentDonations.map((d) => (
              <div key={d.name + d.time} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.type} · {d.time}</p>
                </div>
                <span className="text-sm font-semibold text-amber-700">{d.amount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cow Registry Preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-50 flex items-center justify-between">
            <h2 className="font-semibold text-amber-900">Cow Registry</h2>
            <Link href="/gaushala-portal/cows" className="text-xs text-amber-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-amber-50">
            {cowHighlights.map((c) => (
              <div key={c.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🐄</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.breed} · {c.age} · #{c.id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-800 rounded-2xl p-6 text-white">
        <h2 className="font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Record Donation', href: '/gaushala-portal/donations', emoji: '💰' },
            { label: 'Add New Cow',     href: '/gaushala-portal/cows',      emoji: '🐄' },
            { label: 'Manage Volunteers', href: '/gaushala-portal/volunteers', emoji: '🙏' },
            { label: 'Update Profile',  href: '/gaushala-portal/profile',   emoji: '⚙️' },
          ].map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex flex-col items-center gap-2 p-3 bg-white/10 hover:bg-white/20
                         rounded-xl text-center transition-colors"
            >
              <span className="text-2xl">{a.emoji}</span>
              <span className="text-xs font-medium text-amber-100">{a.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
