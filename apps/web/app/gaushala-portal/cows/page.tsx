'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, X, Loader2, CheckCircle2, Beef, AlertCircle } from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';

type Cow = {
  id: string;
  tagNumber: string;
  name: string;
  breed: string | null;
  ageYears: number | null;
  gender: string;
  healthStatus: string;
  arrivalDate: string;
  notes: string | null;
};

type HealthRecord = {
  id: string;
  recordType: string;
  notes: string;
  vetName: string | null;
  recordedAt: string;
};

const statusConfig: Record<string, { color: string; badge: string }> = {
  healthy: { color: 'border-green-200', badge: 'bg-green-100 text-green-700' },
  treatment: { color: 'border-red-200', badge: 'bg-red-100 text-red-700' },
  pregnant: { color: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  recovering: { color: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
};

const statuses = ['All', 'healthy', 'treatment', 'pregnant', 'recovering'];

export default function CowsPage() {
  return (
    <AuthGuard allowedRoles={['gaushala_manager', 'admin']}>
      <CowsPageContent />
    </AuthGuard>
  );
}

function CowsPageContent() {
  const { session } = useAuth();
  const [cows, setCows] = useState<Cow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [newCow, setNewCow] = useState({
    tagNumber: '',
    name: '',
    breed: '',
    ageYears: '',
    gender: 'female' as 'female' | 'male',
    healthStatus: 'healthy' as 'healthy' | 'treatment' | 'pregnant' | 'recovering',
    notes: '',
  });
  const [detailCow, setDetailCow] = useState<Cow | null>(null);
  const [detailRecords, setDetailRecords] = useState<HealthRecord[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newRecord, setNewRecord] = useState({
    recordType: 'checkup' as 'checkup' | 'vaccination' | 'treatment' | 'vet_visit',
    notes: '',
    vetName: '',
  });
  const [savingRecord, setSavingRecord] = useState(false);

  const token = session?.accessToken;

  const loadCows = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${API_BASE_URL}/gaushala-portal/cows`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const j = await r.json();
        setCows(Array.isArray(j.cows) ? j.cows : []);
      }
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleRegister = async () => {
    if (!token) return;
    if (!newCow.tagNumber.trim() || !newCow.name.trim()) {
      setRegisterError('Tag number and name required');
      return;
    }
    setRegistering(true);
    setRegisterError(null);
    try {
      const body: any = {
        tagNumber: newCow.tagNumber.trim(),
        name: newCow.name.trim(),
        gender: newCow.gender,
        healthStatus: newCow.healthStatus,
      };
      if (newCow.breed.trim()) body.breed = newCow.breed.trim();
      if (newCow.ageYears.trim()) body.ageYears = Number(newCow.ageYears);
      if (newCow.notes.trim()) body.notes = newCow.notes.trim();
      const r = await fetch(`${API_BASE_URL}/gaushala-portal/cows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setRegisterError(j.error ?? `Failed (${r.status})`);
        setRegistering(false);
        return;
      }
      setRegistered(true);
      await loadCows();
      setTimeout(() => {
        setRegistered(false);
        setShowModal(false);
        setNewCow({ tagNumber: '', name: '', breed: '', ageYears: '', gender: 'female', healthStatus: 'healthy', notes: '' });
      }, 1200);
    } catch {
      setRegisterError('Network error');
    } finally {
      setRegistering(false);
    }
  };

  const openDetail = async (c: Cow) => {
    if (!token) return;
    setDetailCow(c);
    setDetailLoading(true);
    setDetailRecords([]);
    try {
      const r = await fetch(`${API_BASE_URL}/gaushala-portal/cows/${c.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const j = await r.json();
        setDetailRecords(Array.isArray(j.cow?.healthRecords) ? j.cow.healthRecords : []);
      }
    } catch {
      // graceful
    } finally {
      setDetailLoading(false);
    }
  };

  const addHealthRecord = async () => {
    if (!token || !detailCow || !newRecord.notes.trim()) return;
    setSavingRecord(true);
    try {
      const body: any = { recordType: newRecord.recordType, notes: newRecord.notes.trim() };
      if (newRecord.vetName.trim()) body.vetName = newRecord.vetName.trim();
      const r = await fetch(`${API_BASE_URL}/gaushala-portal/cows/${detailCow.id}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const j = await r.json();
        setDetailRecords((p) => [j.record, ...p]);
        setNewRecord({ recordType: 'checkup', notes: '', vetName: '' });
      }
    } catch {
      // graceful
    } finally {
      setSavingRecord(false);
    }
  };

  const filtered = cows.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      c.name.toLowerCase().includes(q) ||
      (c.breed ?? '').toLowerCase().includes(q) ||
      c.tagNumber.toLowerCase().includes(q);
    const matchFilter = filter === 'All' || c.healthStatus === filter;
    return matchSearch && matchFilter;
  });

  const needsAttention = cows.filter((c) => c.healthStatus === 'treatment').length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, breed, or tag..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === s
                ? 'bg-amber-800 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-amber-50'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-amber-700"><Loader2 className="w-4 h-4 animate-spin" /> Loading cows…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const cfg = statusConfig[c.healthStatus] ?? { color: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' };
            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl p-5 shadow-sm border ${cfg.color} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center bg-amber-100">
                      <Beef className="w-5 h-5 text-amber-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.tagNumber} · {c.breed ?? 'Unknown breed'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${cfg.badge}`}>
                    {c.healthStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-amber-50 rounded-lg px-3 py-2">
                    <p className="text-amber-600 mb-0.5">Age</p>
                    <p className="font-medium text-gray-800">{c.ageYears != null ? `${c.ageYears}y` : '—'}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg px-3 py-2">
                    <p className="text-amber-600 mb-0.5">Gender</p>
                    <p className="font-medium text-gray-800 capitalize">{c.gender}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg px-3 py-2 col-span-2">
                    <p className="text-amber-600 mb-0.5">Arrival</p>
                    <p className="font-medium text-gray-800">{new Date(c.arrivalDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                <button
                  onClick={() => openDetail(c)}
                  className="mt-3 w-full text-xs text-amber-700 hover:text-amber-900 font-medium py-1 text-center border-t border-amber-100 pt-3"
                >
                  View Health Details →
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 bg-white rounded-2xl border border-amber-100">
              <Beef className="w-10 h-10 mx-auto text-amber-300 mb-3" />
              <p className="text-gray-500 text-sm mb-3">No cows registered yet.</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-amber-700 hover:text-amber-900 text-sm font-medium"
              >
                + Register your first cow
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-amber-900">Register New Cow</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Tag Number *" value={newCow.tagNumber} onChange={(v) => setNewCow((p) => ({ ...p, tagNumber: v }))} placeholder="e.g. GS-001" />
              <Field label="Cow Name *" value={newCow.name} onChange={(v) => setNewCow((p) => ({ ...p, name: v }))} placeholder="e.g. Gaumata" />
              <Field label="Breed" value={newCow.breed} onChange={(v) => setNewCow((p) => ({ ...p, breed: v }))} placeholder="Gir, Sahiwal, Tharparkar…" />
              <Field label="Age (years)" value={newCow.ageYears} onChange={(v) => setNewCow((p) => ({ ...p, ageYears: v }))} placeholder="e.g. 4" type="number" />
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Gender</label>
                <select
                  value={newCow.gender}
                  onChange={(e) => setNewCow((p) => ({ ...p, gender: e.target.value as 'female' | 'male' }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">Health Status</label>
                <select
                  value={newCow.healthStatus}
                  onChange={(e) => setNewCow((p) => ({ ...p, healthStatus: e.target.value as any }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="healthy">Healthy</option>
                  <option value="treatment">Treatment</option>
                  <option value="pregnant">Pregnant</option>
                  <option value="recovering">Recovering</option>
                </select>
              </div>
              <Field label="Notes" value={newCow.notes} onChange={(v) => setNewCow((p) => ({ ...p, notes: v }))} placeholder="Optional" />
              {registerError && (
                <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {registerError}
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleRegister}
                disabled={registering || registered}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-800 text-white rounded-lg text-sm font-medium hover:bg-amber-900 transition-colors disabled:opacity-60"
              >
                {registering ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>
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

      {detailCow && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-amber-900">{detailCow.name}</h2>
                <p className="text-xs text-gray-500">{detailCow.tagNumber} · {detailCow.breed ?? '—'}</p>
              </div>
              <button onClick={() => setDetailCow(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5 text-xs">
              <Stat label="Age" value={detailCow.ageYears != null ? `${detailCow.ageYears}y` : '—'} />
              <Stat label="Gender" value={detailCow.gender} />
              <Stat label="Status" value={detailCow.healthStatus} />
            </div>

            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Add Health Record</h3>
            <div className="space-y-3 mb-5 p-4 bg-amber-50 rounded-xl">
              <select
                value={newRecord.recordType}
                onChange={(e) => setNewRecord((p) => ({ ...p, recordType: e.target.value as any }))}
                className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white"
              >
                <option value="checkup">Checkup</option>
                <option value="vaccination">Vaccination</option>
                <option value="treatment">Treatment</option>
                <option value="vet_visit">Vet Visit</option>
              </select>
              <input
                value={newRecord.vetName}
                onChange={(e) => setNewRecord((p) => ({ ...p, vetName: e.target.value }))}
                placeholder="Vet name (optional)"
                className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white"
              />
              <textarea
                value={newRecord.notes}
                onChange={(e) => setNewRecord((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes *"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg bg-white"
              />
              <button
                onClick={addHealthRecord}
                disabled={savingRecord || !newRecord.notes.trim()}
                className="px-4 py-2 bg-amber-800 text-white rounded-lg text-sm hover:bg-amber-900 disabled:opacity-60"
              >
                {savingRecord ? 'Saving…' : 'Add Record'}
              </button>
            </div>

            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">History</h3>
            {detailLoading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : detailRecords.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No health records yet.</p>
            ) : (
              <div className="space-y-2">
                {detailRecords.map((r) => (
                  <div key={r.id} className="border border-amber-100 rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-amber-900 capitalize">{r.recordType.replace('_', ' ')}</span>
                      <span className="text-xs text-gray-400">{new Date(r.recordedAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    {r.vetName && <p className="text-xs text-gray-500 mb-1">Vet: {r.vetName}</p>}
                    <p className="text-gray-700">{r.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-500 uppercase tracking-wide mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-amber-50 rounded-lg px-3 py-2">
      <p className="text-amber-600 mb-0.5 text-[10px] uppercase tracking-wide">{label}</p>
      <p className="font-medium text-gray-800 capitalize">{value}</p>
    </div>
  );
}
