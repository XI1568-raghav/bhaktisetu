'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Upload, X, FileText } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';
import { friendlyApiError } from '../../../lib/friendly-error';
import { H1 } from '../../../components/ui/heading-recipe';

type LeadRole = 'TEMPLE' | 'PRIEST' | 'ASTROLOGER' | 'WELLNESS_INSTRUCTOR' | 'GAUSHALA';
type LeadStatus = 'NEW' | 'QUEUED' | 'EMAILED' | 'REPLIED' | 'CONVERTED' | 'BOUNCED' | 'UNSUBSCRIBED';

interface Lead {
  id: string;
  role: LeadRole;
  name: string;
  city: string | null;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  source: string;
  sourceUrl: string | null;
  status: LeadStatus;
  contactCount: number;
  lastContactedAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface OutreachLog {
  id: string;
  channel: string;
  templateKey: string;
  status: string;
  sentAt: string;
  errorMsg: string | null;
}

interface LeadDetail extends Lead {
  outreachLogs?: OutreachLog[];
}

interface StatsResponse {
  byRole: Record<string, Record<string, number>>;
  total: number;
  replied: number;
  converted: number;
}

const ROLE_TABS: Array<{ value: 'ALL' | LeadRole; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'TEMPLE', label: 'Temples' },
  { value: 'PRIEST', label: 'Priests' },
  { value: 'ASTROLOGER', label: 'Astrologers' },
  { value: 'WELLNESS_INSTRUCTOR', label: 'Wellness' },
  { value: 'GAUSHALA', label: 'Gaushala' },
];

const STATUS_CHIPS: Array<{ value: 'ALL' | LeadStatus; label: string; color: string }> = [
  { value: 'ALL', label: 'All', color: 'bg-surface-100 text-surface-700' },
  { value: 'NEW', label: 'New', color: 'bg-blue-50 text-blue-700' },
  { value: 'EMAILED', label: 'Emailed', color: 'bg-amber-50 text-amber-700' },
  { value: 'REPLIED', label: 'Replied', color: 'bg-green-50 text-green-700' },
  { value: 'CONVERTED', label: 'Converted', color: 'bg-saffron-50 text-saffron-700' },
  { value: 'UNSUBSCRIBED', label: 'Unsub', color: 'bg-red-50 text-red-700' },
];

const STATUS_BADGE: Record<LeadStatus, string> = {
  NEW: 'bg-blue-50 text-blue-700',
  QUEUED: 'bg-purple-50 text-purple-700',
  EMAILED: 'bg-amber-50 text-amber-700',
  REPLIED: 'bg-green-50 text-green-700',
  CONVERTED: 'bg-saffron-50 text-saffron-700',
  BOUNCED: 'bg-red-50 text-red-700',
  UNSUBSCRIBED: 'bg-surface-100 text-surface-500',
};

async function authFetch<T>(token: string | undefined, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export default function AdminLeadsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [roleFilter, setRoleFilter] = useState<'ALL' | LeadRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [cityFilter, setCityFilter] = useState('');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LeadDetail | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [decisionReason, setDecisionReason] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (roleFilter !== 'ALL') params.set('role', roleFilter);
        if (statusFilter !== 'ALL') params.set('status', statusFilter);
        if (cityFilter) params.set('city', cityFilter);
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
        const data = await authFetch<{ data: Lead[]; total: number }>(
          token,
          `/admin/leads?${params.toString()}`,
        );
        if (cancelled) return;
        setLeads(data.data);
        setTotal(data.total);
      } catch (err) {
        // P1 #208: friendly copy instead of raw "401 Unauthorized".
        if (!cancelled) setError(friendlyApiError(err).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, roleFilter, statusFilter, cityFilter, page, pageSize]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await authFetch<StatsResponse>(token, '/admin/leads/stats');
        if (!cancelled) setStats(s);
      } catch {
        // soft-fail; header just shows zeroes
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const repliedThisWeek = useMemo(() => stats?.replied ?? 0, [stats]);
  const convertedThisMonth = useMemo(() => stats?.converted ?? 0, [stats]);
  const totalLeads = useMemo(() => stats?.total ?? 0, [stats]);

  const openDrawer = async (lead: Lead) => {
    if (!token) return;
    try {
      const r = await authFetch<{ lead: LeadDetail }>(token, `/admin/leads/${lead.id}`);
      setSelected(r.lead);
    } catch {
      setSelected(lead);
    }
  };

  const submitNote = async () => {
    if (!selected || !noteInput.trim() || !token) return;
    try {
      const r = await authFetch<{ lead: LeadDetail }>(token, `/admin/leads/${selected.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: noteInput.trim() }),
      });
      setSelected({ ...selected, notes: r.lead.notes });
      setNoteInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Note failed');
    }
  };

  const transitionStatus = async (newStatus: LeadStatus, sendEmail: boolean) => {
    if (!selected || !token) return;
    setStatusBusy(true);
    try {
      const r = await authFetch<{ lead: LeadDetail }>(
        token,
        `/admin/leads/${selected.id}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status: newStatus, sendEmail, reason: decisionReason.trim() }),
        }
      );
      setSelected({ ...selected, ...r.lead });
      setLeads((prev) => prev.map((l) => (l.id === r.lead.id ? { ...l, status: r.lead.status } : l)));
      setDecisionReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setStatusBusy(false);
    }
  };

  const submitImport = async () => {
    if (!token) return;
    setImportBusy(true);
    setError(null);
    try {
      const parsed = JSON.parse(importJson);
      const res = await authFetch<{ inserted: number; skipped: number }>(token, '/admin/leads/import', {
        method: 'POST',
        body: JSON.stringify(parsed),
      });
      setImportOpen(false);
      setImportJson('');
      alert(`Imported ${res.inserted} leads, skipped ${res.skipped}`);
      setPage(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className={H1.portal}>Lead Pipeline</h1>
          <p className="text-sm text-surface-500 mt-0.5">Provider outreach across roles</p>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-saffron-600 text-white rounded-lg hover:bg-saffron-700"
        >
          <Upload className="w-4 h-4" /> Import CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Leads" value={totalLeads.toLocaleString('en-IN')} />
        <StatCard label="Replied" value={repliedThisWeek.toLocaleString('en-IN')} />
        <StatCard label="Converted" value={convertedThisMonth.toLocaleString('en-IN')} />
      </div>

      {/* Role tabs */}
      <div className="flex gap-2 flex-wrap border-b border-[var(--color-border)] pb-2">
        {ROLE_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setRoleFilter(t.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              roleFilter === t.value
                ? 'bg-saffron-600 text-white'
                : 'bg-surface-50 text-surface-600 hover:bg-surface-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status chips + city filter */}
      <div className="flex gap-2 flex-wrap items-center">
        {STATUS_CHIPS.map((c) => (
          <button
            key={c.value}
            onClick={() => {
              setStatusFilter(c.value);
              setPage(1);
            }}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
              statusFilter === c.value ? 'ring-2 ring-saffron-500 ' + c.color : c.color + ' opacity-70'
            }`}
          >
            {c.label}
          </button>
        ))}
        <input
          type="text"
          placeholder="Filter by city..."
          value={cityFilter}
          onChange={(e) => {
            setCityFilter(e.target.value);
            setPage(1);
          }}
          className="ml-auto px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg bg-white"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      {/* Leads table */}
      <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-surface-50">
                <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase">Role</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase">City</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase">Contacts</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase">Last Contact</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase">Source</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Loader2 className="w-5 h-5 animate-spin text-saffron-600 mx-auto" />
                  </td>
                </tr>
              )}
              {!loading && leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-surface-500 text-sm">
                    No leads found
                  </td>
                </tr>
              )}
              {!loading &&
                leads.map((l, i) => (
                  <tr
                    key={l.id}
                    onClick={() => openDrawer(l)}
                    className={`border-b border-[var(--color-border)] last:border-0 cursor-pointer hover:bg-saffron-50/30 ${
                      i % 2 === 1 ? 'bg-surface-50/50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-medium text-surface-800">{l.name}</td>
                    <td className="py-3 px-4 text-surface-600">{l.role.replace('_', ' ')}</td>
                    <td className="py-3 px-4 text-surface-500">{l.city || '—'}</td>
                    <td className="py-3 px-4 text-surface-500">{l.contactCount}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-surface-500 text-xs">
                      {l.lastContactedAt ? new Date(l.lastContactedAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="py-3 px-4 text-surface-500 text-xs">
                      {l.sourceUrl ? (
                        <a
                          href={l.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-saffron-600 hover:underline"
                        >
                          {l.source}
                        </a>
                      ) : (
                        l.source
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--color-border)]">
            <span className="text-xs text-surface-500">
              Page {page} of {totalPages} · {total} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm rounded-lg border border-[var(--color-border)] disabled:opacity-50"
              >
                Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm rounded-lg border border-[var(--color-border)] disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setSelected(null)} />
          <div className="w-full max-w-xl bg-white h-full overflow-y-auto p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-surface-800">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="p-1 text-surface-500 hover:text-surface-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Role">{selected.role}</Row>
              <Row label="Status">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[selected.status]}`}>
                  {selected.status}
                </span>
              </Row>
              <Row label="City">{selected.city || '—'}</Row>
              <Row label="State">{selected.state || '—'}</Row>
              <Row label="Email">{selected.email || '—'}</Row>
              <Row label="Phone">{selected.phone || '—'}</Row>
              <Row label="Source">{selected.source}</Row>
              <Row label="Source URL">
                {selected.sourceUrl ? (
                  <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="text-saffron-600 underline break-all">
                    {selected.sourceUrl}
                  </a>
                ) : (
                  '—'
                )}
              </Row>
              <Row label="Contact Count">{selected.contactCount}</Row>
              <Row label="Last Contacted">
                {selected.lastContactedAt ? new Date(selected.lastContactedAt).toLocaleString('en-IN') : '—'}
              </Row>
              <Row label="Created">{new Date(selected.createdAt).toLocaleString('en-IN')}</Row>
            </dl>

            <h3 className="mt-6 mb-2 text-sm font-semibold text-surface-800">Outreach History</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(selected.outreachLogs ?? []).length === 0 && (
                <p className="text-xs text-surface-500">No outreach yet.</p>
              )}
              {(selected.outreachLogs ?? []).map((log) => (
                <div key={log.id} className="text-xs border border-[var(--color-border)] rounded p-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{log.templateKey}</span>
                    <span className="text-surface-500">{new Date(log.sentAt).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="text-surface-600">
                    {log.channel} · {log.status}
                    {log.errorMsg && <span className="text-red-600"> · {log.errorMsg}</span>}
                  </div>
                </div>
              ))}
            </div>

            <h3 className="mt-6 mb-2 text-sm font-semibold text-surface-800">Decision</h3>
            <div className="space-y-2 mb-2">
              <input
                type="text"
                placeholder="Reason or welcome note (sent in email)"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => transitionStatus('CONVERTED', true)}
                  disabled={statusBusy || selected.status === 'CONVERTED'}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white disabled:opacity-50"
                >
                  Approve + send welcome
                </button>
                <button
                  onClick={() => transitionStatus('UNSUBSCRIBED', true)}
                  disabled={statusBusy || selected.status === 'UNSUBSCRIBED'}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white disabled:opacity-50"
                >
                  Reject + send note
                </button>
                <button
                  onClick={() => transitionStatus('QUEUED', false)}
                  disabled={statusBusy}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-100 text-surface-700 disabled:opacity-50"
                >
                  Queue for outreach
                </button>
              </div>
              <p className="text-xs text-surface-500">
                Approve transitions status to CONVERTED + emails sign-in link. Reject emails a polite decline. Queue is internal-only (no email).
              </p>
            </div>

            <h3 className="mt-6 mb-2 text-sm font-semibold text-surface-800">Notes</h3>
            <pre className="text-xs whitespace-pre-wrap bg-surface-50 border border-[var(--color-border)] rounded p-2 max-h-48 overflow-y-auto">
              {selected.notes || '—'}
            </pre>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="flex-1 px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg"
              />
              <button
                onClick={submitNote}
                disabled={!noteInput.trim()}
                className="px-3 py-1.5 text-sm bg-saffron-600 text-white rounded-lg disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import dialog */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-surface-800 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Import Leads
              </h2>
              <button onClick={() => setImportOpen(false)}>
                <X className="w-4 h-4 text-surface-500" />
              </button>
            </div>
            <p className="text-xs text-surface-500 mb-2">
              Paste JSON: {`{ "role": "TEMPLE", "leads": [{ "name": "...", "email": "...", "source": "..." }] }`}
            </p>
            <textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              className="w-full h-48 text-xs font-mono border border-[var(--color-border)] rounded-lg p-2"
              placeholder='{"role":"TEMPLE","leads":[]}'
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setImportOpen(false)}
                className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={submitImport}
                disabled={importBusy || !importJson.trim()}
                className="px-3 py-1.5 text-sm bg-saffron-600 text-white rounded-lg disabled:opacity-50"
              >
                {importBusy ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
      <p className="text-xs text-surface-500">{label}</p>
      <p className="text-2xl font-bold text-surface-800 mt-1">{value}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-surface-500">{label}</dt>
      <dd className="text-surface-800 text-right break-all">{children}</dd>
    </div>
  );
}
