'use client';

import { useState } from 'react';
import { Search, Plus, X, Loader2, CheckCircle2, Beef } from 'lucide-react';

const cows = [
  { id: 'GS-001', name: 'Kamdhenu',   breed: 'Gir',        age: '4y 3m', status: 'Healthy',   weight: '420 kg', milk: '14L/day',  lastCheckup: '2026-04-10' },
  { id: 'GS-002', name: 'Nandini',    breed: 'Sahiwal',    age: '6y 1m', status: 'Treatment', weight: '380 kg', milk: '8L/day',   lastCheckup: '2026-04-20' },
  { id: 'GS-003', name: 'Surabhi',    breed: 'Tharparkar', age: '3y 7m', status: 'Healthy',   weight: '350 kg', milk: '10L/day',  lastCheckup: '2026-04-15' },
  { id: 'GS-004', name: 'Ganga',      breed: 'Gir',        age: '5y 2m', status: 'Pregnant',  weight: '460 kg', milk: '0L/day',   lastCheckup: '2026-04-18' },
  { id: 'GS-005', name: 'Yamuna',     breed: 'Sahiwal',    age: '2y 9m', status: 'Healthy',   weight: '310 kg', milk: '6L/day',   lastCheckup: '2026-04-12' },
  { id: 'GS-006', name: 'Godavari',   breed: 'Gir',        age: '7y 0m', status: 'Elderly',   weight: '390 kg', milk: '4L/day',   lastCheckup: '2026-04-05' },
  { id: 'GS-007', name: 'Saraswati',  breed: 'Tharparkar', age: '4y 5m', status: 'Healthy',   weight: '400 kg', milk: '11L/day',  lastCheckup: '2026-04-08' },
  { id: 'GS-008', name: 'Kaveri',     breed: 'Sahiwal',    age: '3y 2m', status: 'Healthy',   weight: '330 kg', milk: '9L/day',   lastCheckup: '2026-04-14' },
];

const statusConfig: Record<string, { color: string; badge: string }> = {
  Healthy:   { color: 'border-green-200',  badge: 'bg-green-100 text-green-700'  },
  Treatment: { color: 'border-red-200',    badge: 'bg-red-100 text-red-700'      },
  Pregnant:  { color: 'border-purple-200', badge: 'bg-purple-100 text-purple-700'},
  Elderly:   { color: 'border-gray-200',   badge: 'bg-gray-100 text-gray-600'    },
};

const statuses = ['All', 'Healthy', 'Treatment', 'Pregnant', 'Elderly'];

export default function CowsPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [newCow, setNewCow] = useState({ name: '', breed: '', age: '', weight: '', status: 'Healthy' });

  const handleRegister = async () => {
    if (!newCow.name.trim() || !newCow.breed.trim()) return;
    setRegistering(true);
    await new Promise((r) => setTimeout(r, 800));
    setRegistering(false);
    setRegistered(true);
    setTimeout(() => {
      setRegistered(false);
      setShowModal(false);
      setNewCow({ name: '', breed: '', age: '', weight: '', status: 'Healthy' });
    }, 1500);
  };

  const filtered = cows.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.breed.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'All' || c.status === filter;
    return matchSearch && matchFilter;
  });

  const needsAttention = cows.filter((c) => c.status === 'Treatment').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Cow Registry</h1>
          <p className="text-amber-700 text-sm mt-1">
            {cows.length} cows registered
            {needsAttention > 0 && (
              <span className="ml-2 text-red-600 font-medium">· {needsAttention} need attention</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-lg text-sm hover:bg-amber-900 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Register Cow
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, breed, or ID..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s
                ? 'bg-amber-800 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-amber-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Cow Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((c) => {
          const cfg = statusConfig[c.status] ?? { color: 'border-green-200', badge: 'bg-green-100 text-green-700' };
          return (
            <div
              key={c.id}
              className={`bg-white rounded-2xl p-5 shadow-sm border ${cfg.color} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--color-primary-highlight)' }}>
                    <Beef className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.id} · {c.breed}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cfg.badge}`}>
                  {c.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  ['Age',          c.age        ],
                  ['Weight',       c.weight     ],
                  ['Milk Yield',   c.milk       ],
                  ['Last Checkup', c.lastCheckup],
                ].map(([label, value]) => (
                  <div key={label} className="bg-amber-50 rounded-lg px-3 py-2">
                    <p className="text-amber-600 mb-0.5">{label}</p>
                    <p className="font-medium text-gray-800">{value}</p>
                  </div>
                ))}
              </div>

              <button className="mt-3 w-full text-xs text-amber-700 hover:text-amber-900 font-medium py-1 text-center border-t border-amber-100 pt-3">
                View Health Records →
              </button>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-3 text-center text-gray-400 py-8 text-sm">No cows match your search.</p>
        )}
      </div>

      {/* Register Cow Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-amber-900">Register New Cow</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Cow Name *', field: 'name', placeholder: 'e.g. Gaumata' },
                { label: 'Breed *', field: 'breed', placeholder: 'e.g. Gir, Sahiwal, Tharparkar' },
                { label: 'Age', field: 'age', placeholder: 'e.g. 3y 4m' },
                { label: 'Weight', field: 'weight', placeholder: 'e.g. 380 kg' },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
                  <input
                    value={newCow[field as keyof typeof newCow]}
                    onChange={(e) => setNewCow((p) => ({ ...p, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Health Status</label>
                <select
                  value={newCow.status}
                  onChange={(e) => setNewCow((p) => ({ ...p, status: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  {statuses.filter((s) => s !== 'All').map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleRegister}
                disabled={registering || registered}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-800 text-white rounded-lg text-sm font-medium hover:bg-amber-900 transition-colors disabled:opacity-60"
              >
                {registering ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</>
                ) : registered ? (
                  <><CheckCircle2 className="w-4 h-4" /> Registered!</>
                ) : 'Register Cow'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
