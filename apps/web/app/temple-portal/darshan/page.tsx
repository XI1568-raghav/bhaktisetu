'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Wifi,
  X,
  AlertCircle,
} from 'lucide-react';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/auth-context';
import { userFacingMessage } from '../../../lib/friendly-error';
import {
  listDarshanStreams,
  createDarshanStream,
  deleteDarshanStream,
  setDarshanStreamStatus,
  type DarshanStream,
  type DarshanStreamProvider,
} from '../../../lib/temple-api';
import { DateTimeInput } from '../../../components/ui/DateInput';
import { buildDarshanPayload, type DarshanFormErrors } from '../../../lib/darshan-stream-input';
import { H1 } from '../../../components/ui/heading-recipe';
import { buttonClass } from '../../../components/ui/button-recipe';

// ─── Helpers ────────────────────────────────────────────────────

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Convert ISO 8601 → "YYYY-MM-DDTHH:mm" in local TZ for datetime-local input
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Component ──────────────────────────────────────────────────

export default function TempleDarshanPage() {
  return (
    <AuthGuard allowedRoles={['temple_manager', 'admin']}>
      <TempleDarshanPageContent />
    </AuthGuard>
  );
}

function TempleDarshanPageContent() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [streams, setStreams] = useState<DarshanStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSchedule, setFormSchedule] = useState('');
  const [formCamera, setFormCamera] = useState('');
  const [formProvider, setFormProvider] = useState<DarshanStreamProvider>('YOUTUBE');
  const [formStreamKey, setFormStreamKey] = useState('');
  const [formPlaybackUrl, setFormPlaybackUrl] = useState('');
  const [formYoutubeSource, setFormYoutubeSource] = useState('');
  // DateTimeInput keeps its own date/time parts; remount it when the form is cleared.
  const [formResetKey, setFormResetKey] = useState(0);
  const [formErrors, setFormErrors] = useState<DarshanFormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listDarshanStreams(token);
      setStreams(data);
    } catch (err) {
      setError(userFacingMessage(err, 'We could not load your darshan streams. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void load();
  }, [token, load]);

  function resetForm() {
    setFormTitle('');
    setFormDesc('');
    setFormSchedule('');
    setFormCamera('');
    setFormProvider('YOUTUBE');
    setFormStreamKey('');
    setFormPlaybackUrl('');
    setFormYoutubeSource('');
    setFormErrors({});
    setFormError(null);
    setFormResetKey((k) => k + 1);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setFormError(null);
    const built = buildDarshanPayload({
      title: formTitle,
      description: formDesc,
      cameraLocation: formCamera,
      provider: formProvider,
      youtubeSource: formYoutubeSource,
      streamKey: formStreamKey,
      playbackUrl: formPlaybackUrl,
      scheduledStart: formSchedule,
    });
    if (!built.ok) {
      setFormErrors(built.errors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    try {
      const created = await createDarshanStream(token, built.payload);
      setStreams((prev) => [created, ...prev]);
      resetForm();
    } catch (err) {
      setFormError(userFacingMessage(err, 'We could not create that stream. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleLive(stream: DarshanStream) {
    if (!token) return;
    const next = stream.status === 'live' ? 'ended' : 'live';
    setBusyId(stream.id);
    const prev = streams;
    setStreams((cur) =>
      cur.map((s) =>
        s.id === stream.id
          ? { ...s, status: next === 'ended' ? 'offline' : 'live' }
          : s,
      ),
    );
    try {
      const updated = await setDarshanStreamStatus(token, stream.id, next);
      setStreams((cur) => cur.map((s) => (s.id === stream.id ? updated : s)));
    } catch (err) {
      setStreams(prev);
      setError(userFacingMessage(err, 'We could not change the stream status. Please try again.'));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!confirm('Delete this stream?')) return;
    setBusyId(id);
    const prev = streams;
    setStreams((cur) => cur.filter((s) => s.id !== id));
    try {
      await deleteDarshanStream(token, id);
    } catch (err) {
      setStreams(prev);
      setError(userFacingMessage(err, 'We could not delete that stream. Please try again.'));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="h-8 w-40 bg-surface-100 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const liveCount = streams.filter((s) => s.status === 'live').length;
  const totalViewers = streams.reduce((sum, s) => sum + s.viewerCount, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={H1.portal}>Live Darshan</h1>
          <p className="text-surface-500 mt-1">
            {liveCount} live stream{liveCount !== 1 ? 's' : ''} &middot;{' '}
            {totalViewers.toLocaleString('en-IN')} viewers
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className={buttonClass('primary', 'md')}
        >
          <Plus className="w-4 h-4" />
          Schedule Stream
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            onClick={() => void load()}
            className="ml-2 text-xs font-medium text-red-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-saffron-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-surface-800">
              Schedule New Stream
            </h2>
            <button
              onClick={resetForm}
              className="p-1.5 text-surface-400 hover:text-surface-600 rounded-lg hover:bg-surface-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form noValidate onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Stream Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
                  placeholder="e.g. Morning Mangal Aarti"
                  aria-invalid={Boolean(formErrors.title)}
                />
                {formErrors.title && (
                  <p role="alert" className="prose-meta text-red-700 mt-1">{formErrors.title}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1.5">
                  Camera Location
                </label>
                <input
                  type="text"
                  value={formCamera}
                  onChange={(e) => setFormCamera(e.target.value)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
                  placeholder="e.g. Main Sanctum Camera"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Description
              </label>
              <textarea
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 resize-none"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="darshan-provider" className="block text-sm font-medium text-surface-700 mb-1.5">
                  Where will you stream from?
                </label>
                <select
                  id="darshan-provider"
                  value={formProvider}
                  onChange={(e) => {
                    setFormProvider(e.target.value as DarshanStreamProvider);
                    setFormErrors({});
                  }}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 bg-white"
                >
                  <option value="YOUTUBE">YouTube (easiest)</option>
                  <option value="IVS">AWS IVS</option>
                  <option value="EXTERNAL_RTMP">Other RTMP / HLS encoder</option>
                </select>
              </div>
              <div>
                <span className="block text-sm font-medium text-surface-700 mb-1.5">
                  Scheduled Start (optional)
                </span>
                <DateTimeInput
                  key={formResetKey}
                  ariaLabel="Scheduled start"
                  value={formSchedule}
                  onChange={(v) => setFormSchedule(v)}
                />
                {formErrors.scheduledStart ? (
                  <p role="alert" className="prose-meta text-red-700 mt-1">{formErrors.scheduledStart}</p>
                ) : (
                  <p className="prose-meta text-surface-500 mt-1">Leave blank to start it yourself with Go Live.</p>
                )}
              </div>
            </div>
            {formProvider === 'YOUTUBE' ? (
              <div>
                <label htmlFor="darshan-youtube" className="block text-sm font-medium text-surface-700 mb-1.5">
                  YouTube video link or channel ID *
                </label>
                <input
                  id="darshan-youtube"
                  type="text"
                  value={formYoutubeSource}
                  onChange={(e) => setFormYoutubeSource(e.target.value)}
                  aria-invalid={Boolean(formErrors.youtubeSource)}
                  className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
                  placeholder="https://www.youtube.com/watch?v=… or UC…"
                />
                {formErrors.youtubeSource ? (
                  <p role="alert" className="prose-meta text-red-700 mt-1">{formErrors.youtubeSource}</p>
                ) : (
                  <p className="prose-meta text-surface-500 mt-1">
                    That is all we need. We build the stream key and playback address from it. For a temple that
                    streams every day, the channel ID (starts with UC) keeps working after each broadcast ends.
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="darshan-key" className="block text-sm font-medium text-surface-700 mb-1.5">
                    {formProvider === 'IVS' ? 'IVS stream key *' : 'Stream key *'}
                  </label>
                  <input
                    id="darshan-key"
                    type="text"
                    value={formStreamKey}
                    onChange={(e) => setFormStreamKey(e.target.value)}
                    aria-invalid={Boolean(formErrors.streamKey)}
                    className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 font-mono"
                    autoComplete="off"
                  />
                  {formErrors.streamKey ? (
                    <p role="alert" className="prose-meta text-red-700 mt-1">{formErrors.streamKey}</p>
                  ) : (
                    <p className="prose-meta text-surface-500 mt-1">The key your encoder (OBS, a camera) streams with. Keep it private.</p>
                  )}
                </div>
                <div>
                  <label htmlFor="darshan-url" className="block text-sm font-medium text-surface-700 mb-1.5">
                    Playback address *
                  </label>
                  <input
                    id="darshan-url"
                    type="text"
                    inputMode="url"
                    value={formPlaybackUrl}
                    onChange={(e) => setFormPlaybackUrl(e.target.value)}
                    aria-invalid={Boolean(formErrors.playbackUrl)}
                    className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200"
                    placeholder="https://…/playlist.m3u8"
                  />
                  {formErrors.playbackUrl ? (
                    <p role="alert" className="prose-meta text-red-700 mt-1">{formErrors.playbackUrl}</p>
                  ) : (
                    <p className="prose-meta text-surface-500 mt-1">The https address devotees watch from (usually ends in .m3u8).</p>
                  )}
                </div>
                {formProvider === 'EXTERNAL_RTMP' && (
                  <p className="prose-meta text-amber-800 md:col-span-2">
                    Devotees can watch YouTube and AWS IVS streams on Darshya today. Streams from other encoders are saved
                    here but are not shown on the public darshan page yet.
                  </p>
                )}
              </div>
            )}
            {formError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </p>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={buttonClass('primary', 'md')}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Scheduling...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Schedule
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 text-surface-600 font-medium text-sm rounded-lg hover:bg-surface-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-surface-100 bg-white py-16">
          <Video className="w-12 h-12 text-surface-300 mb-4" />
          <h3 className="text-lg font-semibold text-surface-700">
            No streams scheduled
          </h3>
        </div>
      ) : (
        <div className="space-y-3">
          {streams.map((stream) => {
            const isLive = stream.status === 'live';
            const isBusy = busyId === stream.id;
            const scheduledLabel = formatDateTime(
              stream.scheduledStart ?? stream.createdAt,
            );
            // toLocalInput retained for future edit modal; suppress unused warning
            void toLocalInput;
            return (
              <div
                key={stream.id}
                className={`bg-white rounded-xl border p-5 transition-all ${
                  isLive ? 'border-red-200 bg-red-50/20' : 'border-surface-100'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isLive ? 'bg-red-100' : 'bg-purple-50'
                    }`}
                  >
                    {isLive ? (
                      <Wifi className="w-5 h-5 text-red-500 animate-pulse" />
                    ) : (
                      <Video className="w-5 h-5 text-purple-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-surface-800">
                        {stream.title ?? 'Untitled stream'}
                      </h3>
                      {isLive && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                          LIVE
                        </span>
                      )}
                      {stream.status === 'scheduled' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          Scheduled
                        </span>
                      )}
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-surface-100 text-surface-600">
                        {stream.streamProvider}
                      </span>
                    </div>
                    {stream.description && (
                      <p className="text-sm text-surface-500 mt-0.5">
                        {stream.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-surface-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {scheduledLabel}
                      </span>
                      {stream.cameraLocation && (
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          {stream.cameraLocation}
                        </span>
                      )}
                      {isLive && (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <Eye className="w-3 h-3" />
                          {stream.viewerCount.toLocaleString('en-IN')} watching
                        </span>
                      )}
                      {stream.peakViewers > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Peak {stream.peakViewers.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => void handleToggleLive(stream)}
                      disabled={isBusy}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                        isLive
                          ? 'bg-red-500 text-white hover:bg-red-600'
                          : 'bg-tulsi-green-dark text-white hover:opacity-90'
                      }`}
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isLive ? (
                        <>
                          <Square className="w-3.5 h-3.5" /> Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> Go Live
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => void handleDelete(stream.id)}
                      disabled={isBusy}
                      className="p-2 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
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
