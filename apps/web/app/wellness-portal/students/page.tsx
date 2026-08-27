'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Search,
  User,
  Calendar,
  CheckCircle2,
  Mail,
  Phone,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import {
  getMyStudents,
  type WellnessStudent,
} from '../../../lib/wellness-api';
import { H1 } from '../../../components/ui/heading-recipe';

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Component ──────────────────────────────────────────────────

export default function WellnessStudentsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [students, setStudents] = useState<WellnessStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'attended' | 'enrolled'>('all');

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await getMyStudents(token);
      setStudents(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = students.filter((s) => {
    const term = search.trim().toLowerCase();
    const matchSearch =
      !term ||
      s.fullName.toLowerCase().includes(term) ||
      (s.email ?? '').toLowerCase().includes(term);
    const matchFilter =
      filter === 'all' ||
      (filter === 'attended' && s.hasAttended) ||
      (filter === 'enrolled' && !s.hasAttended);
    return matchSearch && matchFilter;
  });

  const attendedCount = students.filter((s) => s.hasAttended).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className={H1.portal}>Students</h1>
          <p className="text-surface-500 mt-1">
            {students.length} total student{students.length === 1 ? '' : 's'}
            {students.length > 0 && ` (${attendedCount} have attended)`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading || !token}
          className="p-1.5 rounded-md text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Refresh"
          aria-label="Refresh students"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Retry banner on error */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-red-700">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
          <button
            onClick={load}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

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
          {(['all', 'attended', 'enrolled'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-surface-200 text-surface-600 hover:border-emerald-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Students List */}
      {loading && students.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-surface-100 p-5 animate-pulse"
            >
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-surface-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-surface-100 rounded" />
                  <div className="h-3 w-56 bg-surface-100 rounded" />
                  <div className="h-3 w-32 bg-surface-100 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <Users className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">
            No students yet
          </h3>
          <p className="prose-meta text-surface-500 mt-1 max-w-sm text-center">
            {students.length === 0
              ? 'Students appear here once devotees enrol in any of your wellness sessions.'
              : 'No students match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="bg-white rounded-xl border border-surface-100 p-5 hover:border-emerald-200 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-surface-800">
                      {student.fullName}
                    </h3>
                    {student.hasAttended ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Attended
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        Enrolled
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500 mb-2">
                    {student.phone && (
                      <a
                        href={`tel:${student.phone.replace(/\s/g, '')}`}
                        className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        {student.phone}
                      </a>
                    )}
                    {student.email && (
                      <a
                        href={`mailto:${student.email}`}
                        className="flex items-center gap-1 hover:text-emerald-600 transition-colors"
                      >
                        <Mail className="w-3 h-3" />
                        {student.email}
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      {student.lastSession.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-surface-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Enrolled {formatDate(student.lastEnrolledAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {student.sessionCount} session
                      {student.sessionCount === 1 ? '' : 's'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
