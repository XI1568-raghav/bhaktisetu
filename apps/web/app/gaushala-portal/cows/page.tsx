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
  healthy: { color: 'border-[var(--color-border)]', badge: 'bg-[#e7f0e0] text-[#3f6b1f]' },
  treatment: { color: 'border-[#f59e54]', badge: 'bg-[#fef2e8] text-[#943b19]' },
  pregnant: { color: 'border-[var(--color-border)]', badge: 'bg-[var(--color-primary-highlight)] text-[var(--color-primary-active)]' },
  recovering: { color: 'border-[var(--color-border)]', badge: 'bg-[var(--color-primary-highlight)] text-[var(--color-primary-active)]' },
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
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>Cow Registry</h1>
          <p className="text-[var(--color-text-muted)] text-sm mt-1">
            {cows.length} cows registered
            {needsAttention > 0 && (
              <span className="ml-2 font-medium text-[#943b19]">· {needsAttention} need attention</span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Register Cow
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-faint)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, breed, or tag..."
            className="pl-9 pr-4 py-2 text-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg w-64 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </div>
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === s
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-primary-highlight)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[var(--color-text-muted)]"><Loader2 className="w-4 h-4 animate-spin" /> Loading cows…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const cfg = statusConfig[c.healthStatus] ?? { color: 'border-[var(--color-border)]', badge: 'bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]' };
            return (
              <div
                key={c.id}
                className={`bg-[var(--color-surface)] rounded-xl p-5 shadow-sm border ${cfg.color} hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: 'var(--color-primary-highlight)' }}>
                      <Beef className="w-5 h-5 text-[var(--color-primary-active)]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--color-text)]">{c.name}</p>
                      <p className="text-xs text-[var(--color-text-faint)]">{c.tagNumber} · {c.breed ?? 'Unknown breed'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${cfg.badge}`}>
                    {c.healthStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[var(--color-surface-offset)] rounded-lg px-3 py-2">
                    <p className="text-[var(--color-text-muted)] mb-0.5">Age</p>
                    <p className="font-medium text-[var(--color-text)]">{c.ageYears != null ? `${c.ageYears}y` : '—'}</p>
                  </div>
                  <div className="bg-[var(--color-surface-offset)] rounded-lg px-3 py-2">
                    <p className="text-[var(--color-text-muted)] mb-0.5">Gender</p>
                    <p className="font-medium text-[var(--color-text)] capitalize">{c.gender}</p>
                  </div>
                  <div className="bg-[var(--color-surface-offset)] rounded-lg px-3 py-2 col-span-2">
                    <p className="text-[var(--color-text-muted)] mb-0.5">Arrival</p>
                    <p className="font-medium text-[var(--color-text)]">{new Date(c.arrivalDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>

                <button
                  onClick={() => openDetail(c)}
                  className="mt-3 w-full text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium py-1 text-center border-t border-[var(--color-border)] pt-3"
                >
                  View Health Details →
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <Beef className="w-10 h-10 mx-auto text-[var(--color-text-faint)] mb-3" />
              <p className="text-[var(--color-text-muted)] text-sm mb-3">No cows registered yet.</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] text-sm font-medium"
              >
                + Register your first cow
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(42, 37, 32, 0.55)' }}>
          <div className="rounded-xl shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>Register New Cow</h2>
              <button onClick={() => setShowModal(false)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Tag Number *" value={newCow.tagNumber} onChange={(v) => setNewCow((p) => ({ ...p, tagNumber: v }))} placeholder="e.g. GS-001" />
              <Field label="Cow Name *" value={newCow.name} onChange={(v) => setNewCow((p) => ({ ...p, name: v }))} placeholder="e.g. Gaumata" />
              <Field label="Breed" value={newCow.breed} onChange={(v) => setNewCow((p) => ({ ...p, breed: v }))} placeholder="Gir, Sahiwal, Tharparkar…" />
              <Field label="Age (years)" value={newCow.ageYears} onChange={(v) => setNewCow((p) => ({ ...p, ageYears: v }))} placeholder="e.g. 4" type="number" />
              <div>
                <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1 block">Gender</label>
                <select
                  value={newCow.gender}
                  onChange={(e) => setNewCow((p) => ({ ...p, gender: e.target.value as 'female' | 'male' }))}
                  className="w-full px-3 py-2 text-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1 block">Health Status</label>
                <select
                  value={newCow.healthStatus}
                  onChange={(e) => setNewCow((p) => ({ ...p, healthStatus: e.target.value as any }))}
                  className="w-full px-3 py-2 text-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                >
                  <option value="healthy">Healthy</option>
                  <option value="treatment">Treatment</option>
                  <option value="pregnant">Pregnant</option>
                  <option value="recovering">Recovering</option>
                </select>
              </div>
              <Field label="Notes" value={newCow.notes} onChange={(v) => setNewCow((p) => ({ ...p, notes: v }))} placeholder="Optional" />
              {registerError && (
                <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg bg-[#fef2e8] border border-[#f59e54] text-[#943b19]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-px" /> <span>{registerError}</span>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleRegister}
                disabled={registering || registered}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-60"
              >
                {registering ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Registering…</>
                ) : registered ? (
                  <><CheckCircle2 className="w-4 h-4" /> Registered!</>
                ) : 'Register Cow'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-primary)] rounded-lg text-sm font-medium hover:bg-[var(--color-primary-highlight)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {detailCow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(42, 37, 32, 0.55)' }}>
          <div className="rounded-xl shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-text)]" style={{ fontFamily: 'var(--font-display)' }}>{detailCow.name}</h2>
                <p className="text-xs text-[var(--color-text-muted)]">{detailCow.tagNumber} · {detailCow.breed ?? '—'}</p>
              </div>
              <button onClick={() => setDetailCow(null)} className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5 text-xs">
              <Stat label="Age" value={detailCow.ageYears != null ? `${detailCow.ageYears}y` : '—'} />
              <Stat label="Gender" value={detailCow.gender} />
              <Stat label="Status" value={detailCow.healthStatus} />
            </div>

            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Add Health Record</h3>
            <div className="space-y-3 mb-5 p-4 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)]">
              <select
                value={newRecord.recordType}
                onChange={(e) => setNewRecord((p) => ({ ...p, recordType: e.target.value as any }))}
                className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
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
                className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
              <textarea
                value={newRecord.notes}
                onChange={(e) => setNewRecord((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Notes *"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-primary)]"
              />
              <button
                onClick={addHealthRecord}
                disabled={savingRecord || !newRecord.notes.trim()}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:bg-[var(--color-primary-hover)] disabled:opacity-60"
              >
                {savingRecord ? 'Saving…' : 'Add Record'}
              </button>
            </div>

            <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">History</h3>
            {detailLoading ? (
              <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
            ) : detailRecords.length === 0 ? (
              <p className="text-sm text-[var(--color-text-faint)] text-center py-6">No health records yet.</p>
            ) : (
              <div className="space-y-2">
                {detailRecords.map((r) => (
                  <div key={r.id} className="border border-[var(--color-border)] rounded-lg p-3 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-[var(--color-text)] capitalize">{r.recordType.replace('_', ' ')}</span>
                      <span className="text-xs text-[var(--color-text-faint)]">{new Date(r.recordedAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    {r.vetName && <p className="text-xs text-[var(--color-text-muted)] mb-1">Vet: {r.vetName}</p>}
                    <p className="text-[var(--color-text)]">{r.notes}</p>
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
      <label className="text-xs text-[var(--color-text-muted)] uppercase tracking-wide mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-surface-offset)] rounded-lg px-3 py-2 border border-[var(--color-border)]">
      <p className="text-[var(--color-text-muted)] mb-0.5 text-[10px] uppercase tracking-wide">{label}</p>
      <p className="font-medium text-[var(--color-text)] capitalize">{value}</p>
    </div>
  );
}
