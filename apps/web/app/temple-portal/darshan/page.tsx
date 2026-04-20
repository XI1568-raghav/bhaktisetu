'use client';

import { useState, useEffect } from 'react';
import {
  Video,
  Play,
  Square,
  Clock,
  Eye,
  Calendar,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────

interface DarshanStream {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration: number;
  isLive: boolean;
  viewerCount: number;
  cameraLocation: string;
}

const STORAGE_KEY = 'poojly_temple_darshan_streams';

const defaultStreams: DarshanStream[] = [
  {
    id: '1',
    title: 'Morning Mangal Aarti',
    description: 'Live stream of the sacred Mangal Aarti performed at the sanctum sanctorum.',
    scheduledAt: '2026-04-17T04:00:00',
    duration: 45,
    isLive: false,
    viewerCount: 0,
    cameraLocation: 'Main Sanctum Camera',
  },
  {
    id: '2',
    title: 'Shringar Darshan',
    description: 'Deity adorned with flowers, jewels, and sacred garments for daily darshan.',
    scheduledAt: '2026-04-16T10:00:00',
    duration: 120,
    isLive: true,
    viewerCount: 342,
    cameraLocation: 'Main Sanctum Camera',
  },
  {
    id: '3',
    title: 'Evening Sandhya Aarti',
    description: 'Grand evening aarti with bells, conch shells, and devotional hymns.',
    scheduledAt: '2026-04-16T19:00:00',
    duration: 30,
    isLive: false,
    viewerCount: 0,
    cameraLocation: 'Aarti Hall Camera',
  },
  {
    id: '4',
    title: 'Shayan Aarti',
    description: 'Night aarti before the deity rests. Last darshan of the day.',
    scheduledAt: '2026-04-16T21:30:00',
    duration: 20,
    isLive: false,
    viewerCount: 0,
    cameraLocation: 'Main Sanctum Camera',
  },
];

// ─── Helpers ────────────────────────────────────────────────────

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ─── Component ──────────────────────────────────────────────────

export default function TempleDarshanPage() {
  const [streams, setStreams] = useState<DarshanStream[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSchedule, setFormSchedule] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [formCamera, setFormCamera] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setStreams(JSON.parse(stored));
    } else {
      setStreams(defaultStreams);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultStreams));
    }
  }, []);

  function persist(updated: DarshanStream[]) {
    setStreams(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function toggleLive(id: string) {
    const updated = streams.map((s) => {
      if (s.id !== id) return s;
      return {
        ...s,
        isLive: !s.isLive,
        viewerCount: !s.isLive ? Math.floor(Math.random() * 500) + 100 : 0,
      };
    });
    persist(updated);
  }

  function deleteStream(id: string) {
    persist(streams.filter((s) => s.id !== id));
  }

  function resetForm() {
    setFormTitle('');
    setFormDesc('');
    setFormSchedule('');
    setFormDuration('');
    setFormCamera('');
    setShowForm(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const newStream: DarshanStream = {
      id: generateId(),
      title: formTitle.trim(),
      description: formDesc.trim(),
      scheduledAt: formSchedule || new Date().toISOString(),
      duration: parseInt(formDuration) || 60,
      isLive: false,
      viewerCount: 0,
      cameraLocation: formCamera.trim() || 'Default Camera',
    };
    persist([...streams, newStream]);
    resetForm();
  }

  const liveCount = streams.filter((s) => s.isLive).length;
  const totalViewers = streams.reduce((sum, s) => sum + s.viewerCount, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-800">Live Darshan</h1>
          <p className="text-surface-500 mt-1">
            {liveCount} live stream{liveCount !== 1 ? 's' : ''} &middot; {totalViewers.toLocaleString('en-IN')} viewers
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule Stream
        </button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-saffron-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-surface-800">Schedule New Stream</h2>
            <button onClick={resetForm} className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Stream Title *</label>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
                  placeholder="e.g. Morning Mangal Aarti" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Camera Location</label>
                <input type="text" value={formCamera} onChange={(e) => setFormCamera(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
                  placeholder="e.g. Main Sanctum Camera" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Description</label>
              <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={2}
                className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300 resize-none" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Scheduled Time</label>
                <input type="datetime-local" value={formSchedule} onChange={(e) => setFormSchedule(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">Duration (minutes)</label>
                <input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
                  placeholder="60" min="5" />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-saffron-600 text-white font-medium text-sm rounded-lg hover:bg-saffron-700 transition-colors">
                <Save className="w-4 h-4" /> Schedule
              </button>
              <button type="button" onClick={resetForm}
                className="px-5 py-2.5 text-surface-600 font-medium text-sm rounded-lg hover:bg-surface-100 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Streams */}
      {streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <Video className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">No streams scheduled</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {streams.map((stream) => (
            <div key={stream.id}
              className={`bg-white rounded-xl border p-5 transition-all ${
                stream.isLive ? 'border-red-200 bg-red-50/20' : 'border-surface-100'
              }`}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  stream.isLive ? 'bg-red-100' : 'bg-purple-50'
                }`}>
                  {stream.isLive ? (
                    <Wifi className="w-5 h-5 text-red-500 animate-pulse" />
                  ) : (
                    <Video className="w-5 h-5 text-purple-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold text-surface-800">{stream.title}</h3>
                    {stream.isLive && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                        LIVE
                      </span>
                    )}
                  </div>
                  {stream.description && <p className="text-sm text-surface-500 mt-0.5">{stream.description}</p>}
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-surface-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDateTime(stream.scheduledAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {stream.duration} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      {stream.cameraLocation}
                    </span>
                    {stream.isLive && (
                      <span className="flex items-center gap-1 text-red-500 font-medium">
                        <Eye className="w-3 h-3" />
                        {stream.viewerCount.toLocaleString('en-IN')} watching
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleLive(stream.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                      stream.isLive
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-tulsi-green text-white hover:opacity-90'
                    }`}
                  >
                    {stream.isLive ? (
                      <><Square className="w-3.5 h-3.5" /> Stop</>
                    ) : (
                      <><Play className="w-3.5 h-3.5" /> Go Live</>
                    )}
                  </button>
                  <button
                    onClick={() => deleteStream(stream.id)}
                    className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
