'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, X, Forward, ChevronDown } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { H1 } from '../../../components/ui/heading-recipe';
import { userFacingMessage } from '../../../lib/friendly-error';

interface Application {
  id: string;
  programId: string;
  programName: string | null;
  studentName: string;
  studentAgeYears: number;
  guardianName: string | null;
  guardianPhone: string | null;
  consentSigned: boolean;
  statement: string;
  status: 'submitted' | 'forwarded' | 'accepted' | 'rejected' | 'withdrawn';
  decisionNote: string | null;
  forwardedAt: string | null;
  decisionAt: string | null;
  createdAt: string;
}

type Decision = 'forwarded' | 'accepted' | 'rejected' | 'withdrawn';

function apiBase(): string {
  const b = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';
  return b.replace(/\/$/, '');
}

const statusStyle: Record<string, string> = {
  submitted: 'bg-blue-50 text-blue-700 border-blue-200',
  forwarded: 'bg-amber-50 text-amber-700 border-amber-200',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
  withdrawn: 'bg-surface-100 text-surface-600 border-surface-200',
};

export default function ApplicationsClient() {
  const { isAuthenticated, session } = useAuth();
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | Application['status']>('all');

  useEffect(() => {
    if (!isAuthenticated || !session?.accessToken) { setLoading(false); return; }
    fetch(`${apiBase()}/api/v1/gurukul-portal/applications`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data) => { setItems(data.applications ?? []); setError(null); })
      .catch((e) => setError(userFacingMessage(e, 'Failed to load')))
      .finally(() => setLoading(false));
  }, [isAuthenticated, session?.accessToken]);

  async function decide(id: string, status: Decision, decisionNote?: string) {
    if (!session?.accessToken) return;
    setBusyId(id);
    try {
      const res = await fetch(`${apiBase()}/api/v1/gurukul-portal/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.accessToken}` },
        body: JSON.stringify({ status, decisionNote }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems((arr) => arr.map((a) => a.id === id ? { ...a, ...data.application } : a));
    } catch (e) {
      alert(userFacingMessage(e, 'Action failed'));
    } finally {
      setBusyId(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-surface-600">Please <Link href="/auth/login" className="text-saffron-700 font-semibold">sign in</Link> to view applications.</p>
      </main>
    );
  }

  const filtered = filter === 'all' ? items : items.filter((a) => a.status === filter);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <Link href="/gurukul-portal" className="inline-flex items-center gap-1 text-sm text-saffron-700 hover:text-saffron-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to portal
      </Link>
      <h1 className={`${H1.portal} mb-2`}>Admission applications</h1>
      <p className="text-sm text-surface-600 mb-6">{items.length} total. Review applicant details and decide.</p>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'submitted', 'forwarded', 'accepted', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filter === f ? 'bg-saffron-600 text-white border-saffron-600' : 'bg-white text-surface-700 border-surface-200'}`}
          >
            {f === 'all' ? `All (${items.length})` : `${f} (${items.filter((a) => a.status === f).length})`}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-surface-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-surface-500">No applications match this filter.</p>
      )}

      <div className="space-y-3">
        {filtered.map((a) => {
          const open = expanded.has(a.id);
          const decided = ['accepted', 'rejected', 'withdrawn'].includes(a.status);
          return (
            <div key={a.id} className="bg-white border border-surface-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded((s) => {
                  const next = new Set(s);
                  if (next.has(a.id)) next.delete(a.id); else next.add(a.id);
                  return next;
                })}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-surface-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-surface-900">{a.studentName}</span>
                    <span className="text-xs text-surface-500">age {a.studentAgeYears}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusStyle[a.status]}`}>{a.status}</span>
                  </div>
                  <p className="text-xs text-surface-500 truncate">{a.programName ?? a.programId} · submitted {new Date(a.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-surface-400 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="border-t border-surface-100 p-4 space-y-3 bg-surface-50/50">
                  {a.guardianName && (
                    <div className="text-sm">
                      <span className="font-semibold text-surface-700">Guardian:</span> {a.guardianName}
                      {a.guardianPhone && <> · <a href={`tel:${a.guardianPhone}`} className="text-saffron-700">{a.guardianPhone}</a></>}
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="font-semibold text-surface-700">Consent signed:</span> {a.consentSigned ? 'Yes' : 'No'}
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-surface-700 mb-1">Statement of intent</p>
                    <p className="text-surface-700 whitespace-pre-line">{a.statement}</p>
                  </div>
                  {a.decisionNote && (
                    <div className="text-sm">
                      <p className="font-semibold text-surface-700 mb-1">Decision note</p>
                      <p className="text-surface-700">{a.decisionNote}</p>
                    </div>
                  )}
                  {!decided && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {a.status === 'submitted' && (
                        <button disabled={busyId === a.id} onClick={() => decide(a.id, 'forwarded')} className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                          <Forward className="w-4 h-4" /> Forward for review
                        </button>
                      )}
                      <button disabled={busyId === a.id} onClick={() => {
                        const note = prompt('Acceptance note (optional)') ?? undefined;
                        decide(a.id, 'accepted', note);
                      }} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                        <Check className="w-4 h-4" /> Accept
                      </button>
                      <button disabled={busyId === a.id} onClick={() => {
                        const note = prompt('Reason for rejection') ?? undefined;
                        if (note === undefined) return;
                        decide(a.id, 'rejected', note);
                      }} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50">
                        <X className="w-4 h-4" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
