'use client';

import { useState } from 'react';
import {
  Users,
  Search,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  Star,
  Mail,
  Phone,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  phone: string;
  email: string;
  enrolledSessions: string[];
  joinedDate: string;
  totalAttended: number;
  lastAttended: string;
  status: 'active' | 'inactive' | 'paused';
}

// ─── Mock Data ──────────────────────────────────────────────────

const mockStudents: Student[] = [
  {
    id: '1', name: 'Meera Joshi', phone: '+91 98765 43210', email: 'meera@email.com',
    enrolledSessions: ['Morning Hatha Yoga', 'Pranayama & Meditation'],
    joinedDate: '2025-11-15', totalAttended: 84, lastAttended: '2026-04-16', status: 'active',
  },
  {
    id: '2', name: 'Arjun Nair', phone: '+91 87654 32109', email: 'arjun.nair@email.com',
    enrolledSessions: ['Morning Hatha Yoga', 'Evening Meditation Circle'],
    joinedDate: '2026-01-08', totalAttended: 42, lastAttended: '2026-04-15', status: 'active',
  },
  {
    id: '3', name: 'Kavita Sharma', phone: '+91 76543 21098', email: 'kavita.s@email.com',
    enrolledSessions: ['Private Yoga Therapy'],
    joinedDate: '2026-02-20', totalAttended: 8, lastAttended: '2026-04-14', status: 'active',
  },
  {
    id: '4', name: 'Rahul Bansal', phone: '+91 65432 10987', email: 'rahul.b@email.com',
    enrolledSessions: ['Morning Hatha Yoga', 'Weekend Vipassana Retreat'],
    joinedDate: '2025-09-01', totalAttended: 120, lastAttended: '2026-04-16', status: 'active',
  },
  {
    id: '5', name: 'Pooja Reddy', phone: '+91 54321 09876', email: 'pooja.r@email.com',
    enrolledSessions: ['Evening Meditation Circle', 'Pranayama & Meditation'],
    joinedDate: '2026-03-10', totalAttended: 18, lastAttended: '2026-04-14', status: 'active',
  },
  {
    id: '6', name: 'Siddharth Kaul', phone: '+91 43210 98765', email: 'sid.kaul@email.com',
    enrolledSessions: ['Morning Hatha Yoga'],
    joinedDate: '2025-12-01', totalAttended: 55, lastAttended: '2026-04-10', status: 'active',
  },
  {
    id: '7', name: 'Divya Pillai', phone: '+91 32109 87654', email: 'divya.p@email.com',
    enrolledSessions: ['Pranayama & Meditation', 'Kundalini Awakening'],
    joinedDate: '2026-01-20', totalAttended: 30, lastAttended: '2026-04-12', status: 'active',
  },
  {
    id: '8', name: 'Arun Mehta', phone: '+91 21098 76543', email: 'arun.m@email.com',
    enrolledSessions: ['Evening Meditation Circle'],
    joinedDate: '2026-03-25', totalAttended: 6, lastAttended: '2026-04-08', status: 'paused',
  },
  {
    id: '9', name: 'Nisha Kapoor', phone: '+91 10987 65432', email: 'nisha.k@email.com',
    enrolledSessions: ['Morning Hatha Yoga', 'Private Yoga Therapy'],
    joinedDate: '2025-10-15', totalAttended: 96, lastAttended: '2026-03-28', status: 'inactive',
  },
  {
    id: '10', name: 'Vikram Singh', phone: '+91 99876 54321', email: 'vikram.s@email.com',
    enrolledSessions: ['Weekend Vipassana Retreat'],
    joinedDate: '2026-02-01', totalAttended: 4, lastAttended: '2026-04-06', status: 'active',
  },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'Active', cls: 'bg-green-100 text-green-700' },
    paused: { label: 'Paused', cls: 'bg-amber-100 text-amber-700' },
    inactive: { label: 'Inactive', cls: 'bg-surface-100 text-surface-500' },
  };
  return map[status] ?? { label: status, cls: 'bg-surface-100 text-surface-600' };
}

// ─── Component ──────────────────────────────────────────────────

export default function WellnessStudentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'inactive'>('all');

  const filtered = mockStudents.filter((s) => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = mockStudents.filter((s) => s.status === 'active').length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-800">Students</h1>
        <p className="text-surface-500 mt-1">
          {mockStudents.length} total students ({activeCount} active)
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300"
            placeholder="Search by name or email..."
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'active', 'paused', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-2.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === f
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-surface-200 text-surface-600 hover:border-emerald-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Students List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <Users className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No students found</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => {
            const statusBadge = getStatusBadge(student.status);
            return (
              <div key={student.id} className="bg-white rounded-xl border border-surface-100 p-5 hover:border-emerald-200 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-surface-800">{student.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500 mb-2">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{student.phone}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{student.email}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {student.enrolledSessions.map((session) => (
                        <span key={session} className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          {session}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-surface-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Joined {formatDate(student.joinedDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {student.totalAttended} sessions attended
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last: {formatDate(student.lastAttended)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
