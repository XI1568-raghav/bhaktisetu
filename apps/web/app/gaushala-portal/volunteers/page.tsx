'use client';

import { useEffect, useState } from 'react';
import { Search, UserPlus, Phone, Mail, Calendar, HandHeart, CheckCircle2, Loader2, X, AlertCircle, Trash2 } from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';

type Volunteer = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  role: string;
  active: boolean;
  joinedAt: string;
  notes: string | null;
};

const roleColors: Record<string, string> = {
  general: 'bg-amber-100 text-amber-700',
  feeding: 'bg-green-100 text-green-700',
  medical: 'bg-blue-100 text-blue-700',
  cleaning: 'bg-purple-100 text-purple-700',
};

export default function VolunteersPage() {
  return (
    <AuthGuard allowedRoles={['gaushala_manager', 'admin']}>
      <VolunteersContent />
    </AuthGuard>
  );
}

function VolunteersContent() {
  const { session } = useAuth();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    role: 'general' as 'general' | 'feeding' | 'medical' | 'cleaning',
    notes: '',
  });

  const token = session?.accessToken;

  const load = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${API_BASE_URL}/gaushala-portal/volunteers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const j = await r.json();
        setVolunteers(Array.isArray(j.volunteers) ? j.volunteers : []);
      }
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleAdd = async () => {
    if (!token) return;
    if (!form.fullName.trim()) {
      setError('Name required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: any = { fullName: form.fullName.trim(), role: form.role };
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.email.trim()) body.email = form.email.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();
      const r = await fetch(`${API_BASE_URL}/gaushala-portal/volunteers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setError(j.error ?? `Failed (${r.status})`);
        setSaving(false);
        return;
      }
      await load();
      setShowModal(false);
      setForm({ fullName: '', phone: '', email: '', role: 'general', notes: '' });
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (v: Volunteer) => {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/gaushala-portal/volunteers/${v.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ active: !v.active }),
      });
      await load();
    } catch {
      // graceful
    }
  };

  const remove = async (v: Volunteer) => {
    if (!token) return;
    if (!confirm(`Remove ${v.fullName}?`)) return;
    try {
      await fetch(`${API_BASE_URL}/gaushala-portal/volunteers/${v.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      await load();
    } catch {
      // graceful
    }
  };

  const filtered = volunteers.filter((v) => {
    const q = search.toLowerCase();
    const matchSearch =
      v.fullName.toLowerCase().includes(q) ||
      v.role.toLowerCase().includes(q) ||
      (v.phone ?? '').includes(q);
    const matchStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Active' && v.active) ||
      (statusFilter === 'Inactive' && !v.active);
    return matchSearch && matchStatus;
  });

  const activeCount = volunteers.filter((v) => v.active).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-amber-900">Volunteers</h1>
          <p className="text-sm mt-1 text-amber-700">{activeCount} active volunteer{activeCount === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors text-white bg-amber-800 hover:bg-amber-900"
        >
          <UserPlus className="w-4 h-4" />
          Add Volunteer
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard label="Total Volunteers" value={volunteers.length} Icon={HandHeart} />
        <StatCard label="Active" value={activeCount} Icon={CheckCircle2} />
        <StatCard label="New This Month" value={countNewThisMonth(volunteers)} Icon={UserPlus} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, phone…"
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-72 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {(['All', 'Active', 'Inactive'] as const).map((s) => (
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

      {loading ? (
        <div className="flex items-center gap-2 text-amber-700"><Loader2 className="w-4 h-4 animate-spin" /> Loading volunteers…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl p-5 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-amber-200 rounded-full flex items-center justify-center text-amber-800 font-bold text-lg">
                    {v.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{v.fullName}</p>
                    <p className="text-xs text-gray-400">Joined {new Date(v.joinedAt).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${roleColors[v.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {v.role}
                  </span>
                  <button
                    onClick={() => toggleActive(v)}
                    className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer ${
                      v.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {v.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-600 mb-3">
                {v.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{v.phone}</span>
                  </div>
                )}
                {v.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{v.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{new Date(v.joinedAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              {v.notes && <p className="text-xs text-gray-500 italic border-t border-amber-50 pt-2 mb-2">{v.notes}</p>}

              <button
                onClick={() => remove(v)}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-amber-100">
              <HandHeart className="w-10 h-10 mx-auto text-amber-300 mb-3" />
              <p className="text-gray-500 text-sm mb-3">No volunteers yet.</p>
              <button onClick={() => setShowModal(true)} className="text-amber-700 hover:text-amber-900 text-sm font-medium">
                + Add your first volunteer
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-amber-900">Add Volunteer</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Full Name *" value={form.fullName} onChange={(v) => setForm((p) => ({ ...p, fullName: v }))} placeholder="e.g. Ramesh Gupta" />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} placeholder="+91 98765 43210" />
              <Field label="Email" value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} placeholder="optional" />
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as any }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="general">General</option>
                  <option value="feeding">Feeding</option>
                  <option value="medical">Medical</option>
                  <option value="cleaning">Cleaning</option>
                </select>
              </div>
              <Field label="Notes" value={form.notes} onChange={(v) => setForm((p) => ({ ...p, notes: v }))} placeholder="Optional" />
              {error && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAdd}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-800 text-white rounded-lg text-sm font-medium hover:bg-amber-900 disabled:opacity-60"
              >
                {saving ? (<><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>) : 'Add Volunteer'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-50"
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

function StatCard({ label, value, Icon }: { label: string; value: number; Icon: any }) {
  return (
    <div className="rounded-xl p-5 border bg-white border-amber-100">
      <Icon className="w-5 h-5 mb-3 text-amber-700" />
      <p className="text-xl font-semibold tracking-tight text-gray-900">{value}</p>
      <p className="text-xs mt-1 text-gray-500">{label}</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );
}

function countNewThisMonth(list: Volunteer[]): number {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return list.filter((v) => new Date(v.joinedAt).getTime() >= monthStart).length;
}
