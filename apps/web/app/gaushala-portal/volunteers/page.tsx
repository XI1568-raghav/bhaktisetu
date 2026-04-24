'use client';

import { useState } from 'react';
import { Search, UserPlus, Phone, Mail, MapPin, Calendar } from 'lucide-react';

const volunteers = [
  { id: 'V001', name: 'Ramesh Gupta',   role: 'Caretaker',      phone: '+91 98765 11111', location: 'Mathura',   joined: '2023-01-10', status: 'Active',    shifts: 'Mon–Fri, 6am–12pm', tasks: ['Feeding', 'Cleaning'] },
  { id: 'V002', name: 'Sunita Sharma',  role: 'Veterinary Aid', phone: '+91 98765 22222', location: 'Vrindavan', joined: '2023-03-22', status: 'Active',    shifts: 'Weekends',           tasks: ['Health checks', 'Medicine'] },
  { id: 'V003', name: 'Mohan Das',      role: 'Caretaker',      phone: '+91 98765 33333', location: 'Mathura',   joined: '2023-06-05', status: 'Active',    shifts: 'Daily, 4pm–8pm',    tasks: ['Feeding', 'Milking'] },
  { id: 'V004', name: 'Priya Kumari',   role: 'Admin Support',  phone: '+91 98765 44444', location: 'Agra',      joined: '2024-01-15', status: 'Active',    shifts: 'Mon–Sat, 9am–1pm',  tasks: ['Record keeping', 'Donor calls'] },
  { id: 'V005', name: 'Vijay Singh',    role: 'Caretaker',      phone: '+91 98765 55555', location: 'Vrindavan', joined: '2024-02-20', status: 'Inactive', shifts: 'On-call',            tasks: ['Emergency care'] },
  { id: 'V006', name: 'Kavita Verma',   role: 'Fundraiser',     phone: '+91 98765 66666', location: 'Delhi',     joined: '2024-03-01', status: 'Active',    shifts: 'Flexible',           tasks: ['Campaign outreach', 'Social media'] },
];

const roleColors: Record<string, string> = {
  'Caretaker':      'bg-amber-100 text-amber-700',
  'Veterinary Aid': 'bg-green-100 text-green-700',
  'Admin Support':  'bg-blue-100 text-blue-700',
  'Fundraiser':     'bg-purple-100 text-purple-700',
};

const stats = [
  { label: 'Total Volunteers', value: '34',   emoji: '🙏' },
  { label: 'Active This Month', value: '28',  emoji: '✅' },
  { label: 'Hours Contributed', value: '420', emoji: '⏱️' },
  { label: 'New This Month',    value: '6',   emoji: '🌟' },
];

export default function VolunteersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filtered = volunteers.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.role.toLowerCase().includes(search.toLowerCase()) ||
      v.location.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-amber-900">Volunteers</h1>
          <p className="text-amber-700 text-sm mt-1">
            {volunteers.filter((v) => v.status === 'Active').length} active volunteers serving the gaushala
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-amber-800 text-white rounded-lg text-sm hover:bg-amber-900 transition-colors">
          <UserPlus className="w-4 h-4" />
          Add Volunteer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-amber-100">
            <p className="text-2xl mb-1">{s.emoji}</p>
            <p className="text-2xl font-bold text-amber-900">{s.value}</p>
            <p className="text-xs text-amber-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, or location..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {['All', 'Active', 'Inactive'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-amber-800 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-amber-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Volunteer Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((v) => (
          <div key={v.id} className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 font-bold text-lg">
                  {v.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{v.name}</p>
                  <p className="text-xs text-gray-400">{v.id}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[v.role] ?? 'bg-gray-100 text-gray-600'}`}>
                  {v.role}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  v.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {v.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{v.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{v.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{v.shifts}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-amber-50 pt-3">
              {v.tasks.map((t) => (
                <span key={t} className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-3 text-center text-gray-400 py-8 text-sm">No volunteers match your search.</p>
        )}
      </div>

      {/* Upcoming Volunteer Schedule */}
      <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          This Week&apos;s Schedule
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-amber-50">
                {['Volunteer', 'Role', 'Day', 'Shift', 'Tasks'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-amber-800 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {volunteers.filter((v) => v.status === 'Active').slice(0, 5).map((v) => (
                <tr key={v.id} className="hover:bg-amber-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{v.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[v.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {v.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{v.shifts.split(',')[0]}</td>
                  <td className="px-4 py-3 text-gray-500">{v.shifts.split(',')[1]?.trim() ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{v.tasks.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
