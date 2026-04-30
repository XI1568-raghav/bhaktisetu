'use client';

import { useState, useEffect, useCallback } from 'react';
import {
 MessageSquare,
 Phone,
 Video,
 Calendar,
 Clock,
 Star,
 Loader2,
 CheckCircle2,
 X,
} from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { API_BASE_URL } from '../../../lib/api-config';

type TabKey = 'upcoming' | 'past';

interface Consultation {
  id: string;
  clientName: string;
  type: string;
  mode: 'video' | 'call' | 'chat';
  scheduledAt: string;
  duration: number;
  rate: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  rating?: number;
  notes?: string;
  roomUrl?: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getModeConfig(mode: string) {
  switch (mode) {
    case 'video': return { icon: Video, label: 'Video', cls: 'bg-purple-100 text-purple-700' };
    case 'call':  return { icon: Phone, label: 'Call',  cls: 'bg-blue-100 text-blue-700' };
    default:      return { icon: MessageSquare, label: 'Chat', cls: 'bg-saffron-100 text-saffron-700' };
  }
}

function getStatusConfig(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    scheduled:   { label: 'Scheduled',   cls: 'bg-blue-100 text-blue-700' },
    in_progress: { label: 'In Progress', cls: 'bg-purple-100 text-purple-700' },
    completed:   { label: 'Completed',   cls: 'bg-green-100 text-green-700' },
    cancelled:   { label: 'Cancelled',   cls: 'bg-surface-100 text-surface-600' },
    no_show:     { label: 'No Show',     cls: 'bg-red-100 text-red-700' },
  };
  return map[status] ?? { label: status, cls: 'bg-surface-100 text-surface-600' };
}

export default function AstrologerConsultationsPage() {
  const { session } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchConsultations = useCallback(async () => {
    if (!session?.accessToken) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/astrology/consultations?role=astrologer`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`API ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
      }
      const data = await res.json();
      const raw: Consultation[] = data.consultations ?? data.data ?? [];
      setConsultations(raw);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  async function handleJoin(c: Consultation) {
    setActionId(c.id);
    setActionError(null);
    try {
      let url = c.roomUrl ?? null;
      if (!url) {
        const res = await fetch(`${API_BASE_URL}/astrology/consultations/${c.id}/start-call`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.accessToken ?? ''}` },
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Start-call ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
        }
        const data = await res.json();
        url = data.roomUrl ?? data.data?.roomUrl ?? null;
        if (!url) throw new Error('No roomUrl returned');
      }
      window.open(url, '_blank', 'noopener,noreferrer');
      await fetchConsultations();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not start call');
    } finally {
      setActionId(null);
    }
  }

  async function handlePatch(c: Consultation, status: 'COMPLETED' | 'CANCELLED') {
    setActionId(c.id);
    setActionError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/astrology/consultations/${c.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session?.accessToken ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Update ${res.status}${body ? `: ${body.slice(0, 120)}` : ''}`);
      }
      await fetchConsultations();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setActionId(null);
    }
  }

  const upcoming = consultations.filter((c) => c.status === 'scheduled' || c.status === 'in_progress');
  const past = consultations.filter((c) => ['completed', 'cancelled', 'no_show'].includes(c.status));
  const displayed = activeTab === 'upcoming' ? upcoming : past;

  const tabs = [
    { key: 'upcoming' as TabKey, label: 'Upcoming', count: upcoming.length },
    { key: 'past' as TabKey, label: 'Past', count: past.length },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-800">Consultations</h1>
        <p className="text-surface-500 mt-1">Manage your upcoming and past sessions</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not load consultations: {error}
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 border border-surface-100">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-purple-600 text-white shadow-sm' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            {tab.label}
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-surface-100 text-surface-500'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          <span className="ml-3 text-surface-500">Loading consultations...</span>
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <MessageSquare className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No {activeTab} consultations</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((consultation) => {
            const modeCfg = getModeConfig(consultation.mode);
            const ModeIcon = modeCfg.icon;
            const statusCfg = getStatusConfig(consultation.status);
            const isActing = actionId === consultation.id;
            const canJoin = consultation.status === 'scheduled' || consultation.status === 'in_progress';
            const canCancel = consultation.status === 'scheduled';
            const canEnd = consultation.status === 'in_progress';

            return (
              <div key={consultation.id} className="bg-white rounded-xl border border-surface-100 p-5 hover:border-purple-200 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                    <ModeIcon className="w-5 h-5 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-surface-800">{consultation.clientName}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.cls}`}>{statusCfg.label}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${modeCfg.cls}`}>{modeCfg.label}</span>
                    </div>
                    <p className="text-sm text-surface-600">{consultation.type}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-surface-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDateTime(consultation.scheduledAt)}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{consultation.duration} min</span>
                      {consultation.rating && (
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-temple-gold fill-temple-gold" />{consultation.rating}/5</span>
                      )}
                    </div>
                    {consultation.notes && <p className="text-xs text-surface-400 mt-2 italic">&ldquo;{consultation.notes}&rdquo;</p>}
                  </div>
                  <div className="text-right shrink-0 flex flex-col gap-2 items-end">
                    <p className="text-sm font-bold text-surface-800">{formatCurrency(consultation.rate)}</p>
                    <p className="text-xs text-surface-400 -mt-1">Rate</p>
                    {canJoin && (
                      <button
                        onClick={() => handleJoin(consultation)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors disabled:opacity-60"
                      >
                        {isActing ? <><Loader2 className="w-3 h-3 animate-spin" />...</> : <><Video className="w-3 h-3" />{consultation.status === 'in_progress' ? 'Rejoin' : 'Join'}</>}
                      </button>
                    )}
                    {canEnd && (
                      <button
                        onClick={() => handlePatch(consultation, 'COMPLETED')}
                        disabled={isActing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        <CheckCircle2 className="w-3 h-3" /> End
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => handlePatch(consultation, 'CANCELLED')}
                        disabled={isActing}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-60"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    )}
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
