'use client';

import { useState } from 'react';
import {
 MessageSquare,
 Phone,
 Video,
 Calendar,
 Clock,
 User,
 Star,
 Filter,
 IndianRupee,
 CheckCircle2,
 Loader2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

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
}

// ─── Mock Data ──────────────────────────────────────────────────

const mockConsultations: Consultation[] = [
 { id: '1', clientName: 'Rohit Sharma', type: 'Kundli Reading', mode: 'video', scheduledAt: '2026-04-16T14:00:00', duration: 30, rate: 800, status: 'scheduled' },
 { id: '2', clientName: 'Neha Gupta', type: 'Marriage Compatibility', mode: 'call', scheduledAt: '2026-04-16T15:30:00', duration: 45, rate: 1200, status: 'scheduled' },
 { id: '3', clientName: 'Suresh Pandey', type: 'Career Consultation', mode: 'chat', scheduledAt: '2026-04-16T17:00:00', duration: 20, rate: 500, status: 'scheduled' },
 { id: '4', clientName: 'Anjali Mishra', type: 'Gemstone Recommendation', mode: 'video', scheduledAt: '2026-04-17T10:00:00', duration: 30, rate: 800, status: 'scheduled' },
 { id: '5', clientName: 'Karan Malhotra', type: 'Kundli Reading', mode: 'call', scheduledAt: '2026-04-17T14:00:00', duration: 30, rate: 800, status: 'scheduled' },
 // Past
 { id: '6', clientName: 'Priya Verma', type: 'Kundli Reading', mode: 'video', scheduledAt: '2026-04-15T10:00:00', duration: 30, rate: 800, status: 'completed', rating: 5, notes: 'Very accurate predictions about career change.' },
 { id: '7', clientName: 'Amit Saxena', type: 'Vastu Consultation', mode: 'call', scheduledAt: '2026-04-15T12:00:00', duration: 45, rate: 1200, status: 'completed', rating: 4 },
 { id: '8', clientName: 'Deepika Jain', type: 'Marriage Compatibility', mode: 'video', scheduledAt: '2026-04-14T11:00:00', duration: 45, rate: 1200, status: 'completed', rating: 5, notes: 'Both families very satisfied with the analysis.' },
 { id: '9', clientName: 'Vikas Yadav', type: 'Career Consultation', mode: 'chat', scheduledAt: '2026-04-14T16:00:00', duration: 20, rate: 500, status: 'completed', rating: 4 },
 { id: '10', clientName: 'Meena Agarwal', type: 'Gemstone Recommendation', mode: 'call', scheduledAt: '2026-04-13T09:30:00', duration: 30, rate: 800, status: 'completed', rating: 5 },
 { id: '11', clientName: 'Sanjay Patel', type: 'Kundli Reading', mode: 'video', scheduledAt: '2026-04-13T14:00:00', duration: 30, rate: 800, status: 'no_show' },
 { id: '12', clientName: 'Rekha Iyer', type: 'Marriage Compatibility', mode: 'call', scheduledAt: '2026-04-12T11:00:00', duration: 45, rate: 1200, status: 'cancelled' },
];

// ─── Helpers ────────────────────────────────────────────────────

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
 case 'call': return { icon: Phone, label: 'Call', cls: 'bg-blue-100 text-blue-700' };
 default: return { icon: MessageSquare, label: 'Chat', cls: 'bg-saffron-100 text-saffron-700' };
 }
}

function getStatusConfig(status: string) {
 const map: Record<string, { label: string; cls: string }> = {
 scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700' },
 in_progress: { label: 'In Progress', cls: 'bg-purple-100 text-purple-700' },
 completed: { label: 'Completed', cls: 'bg-green-100 text-green-700' },
 cancelled: { label: 'Cancelled', cls: 'bg-surface-100 text-surface-600' },
 no_show: { label: 'No Show', cls: 'bg-red-100 text-red-700' },
 };
 return map[status] ?? { label: status, cls: 'bg-surface-100 text-surface-600' };
}

// ─── Component ──────────────────────────────────────────────────

export default function AstrologerConsultationsPage() {
 const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
 const [consultations, setConsultations] = useState(mockConsultations);
 const [joiningId, setJoiningId] = useState<string | null>(null);
 const [joinedId, setJoinedId] = useState<string | null>(null);

 const upcoming = consultations.filter((c) => c.status === 'scheduled' || c.status === 'in_progress');
 const past = consultations.filter((c) => ['completed', 'cancelled', 'no_show'].includes(c.status));
 const displayed = activeTab === 'upcoming' ? upcoming : past;

 const handleJoin = async (id: string) => {
 setJoiningId(id);
 await new Promise((r) => setTimeout(r, 1000));
 setConsultations((prev) =>
 prev.map((c) => c.id === id ? { ...c, status: 'in_progress' as const } : c)
 );
 setJoiningId(null);
 setJoinedId(id);
 setTimeout(() => setJoinedId(null), 3000);
 };

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

 {/* Tabs */}
 <div className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 border border-surface-100">
 {tabs.map((tab) => (
 <button
 key={tab.key}
 onClick={() => setActiveTab(tab.key)}
 className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
 activeTab === tab.key
 ? 'bg-purple-600 text-white shadow-sm'
 : 'text-surface-600 hover:bg-surface-50'
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

 {/* List */}
 {displayed.length === 0 ? (
 <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
 <MessageSquare className="w-12 h-12 text-surface-300 mb-4" />
 <h3 className="text-lg font-semibold text-surface-700">
 No {activeTab} consultations
 </h3>
 </div>
 ) : (
 <div className="space-y-3">
 {displayed.map((consultation) => {
 const modeCfg = getModeConfig(consultation.mode);
 const ModeIcon = modeCfg.icon;
 const statusCfg = getStatusConfig(consultation.status);

 return (
 <div key={consultation.id} className="bg-white rounded-xl border border-surface-100 p-5 hover:border-purple-200 transition-all">
 <div className="flex flex-col sm:flex-row sm:items-start gap-4">
 <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
 <ModeIcon className="w-5 h-5 text-purple-500" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex flex-wrap items-center gap-2 mb-1">
 <h3 className="text-base font-semibold text-surface-800">{consultation.clientName}</h3>
 <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.cls}`}>
 {statusCfg.label}
 </span>
 <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${modeCfg.cls}`}>
 {modeCfg.label}
 </span>
 </div>
 <p className="text-sm text-surface-600">{consultation.type}</p>
 <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-surface-400">
 <span className="flex items-center gap-1">
 <Calendar className="w-3 h-3" />
 {formatDateTime(consultation.scheduledAt)}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 {consultation.duration} min
 </span>
 {consultation.rating && (
 <span className="flex items-center gap-1">
 <Star className="w-3 h-3 text-temple-gold fill-temple-gold" />
 {consultation.rating}/5
 </span>
 )}
 </div>
 {consultation.notes && (
 <p className="text-xs text-surface-400 mt-2 italic">&ldquo;{consultation.notes}&rdquo;</p>
 )}
 </div>
 <div className="text-right shrink-0">
 <p className="text-sm font-bold text-surface-800">{formatCurrency(consultation.rate)}</p>
 <p className="text-xs text-surface-400">Rate</p>
 {(consultation.status === 'scheduled' || consultation.status === 'in_progress') && (
 <button
 onClick={() => handleJoin(consultation.id)}
 disabled={joiningId === consultation.id}
 className={`mt-2 inline-flex items-center gap-1 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60 ${
 joinedId === consultation.id
 ? 'bg-green-600 hover:bg-green-700'
 : consultation.status === 'in_progress'
 ? 'bg-green-600 hover:bg-green-700'
 : 'bg-purple-600 hover:bg-purple-700'
 }`}
 >
 {joiningId === consultation.id ? (
 <><Loader2 className="w-3 h-3 animate-spin" /> Joining...</>
 ) : joinedId === consultation.id ? (
 <><CheckCircle2 className="w-3 h-3" /> Joined!</>
 ) : consultation.status === 'in_progress' ? (
 <><Video className="w-3 h-3" /> Rejoin</>
 ) : (
 <><Video className="w-3 h-3" /> Join</>
 )}
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
