'use client';

/**
 * R-Q3-E-001 — Voice AI Pandit v1 client widget
 *
 * Push-to-talk: hold the saffron mic to record (MediaRecorder webm/opus),
 * release → POST audio/base64 → /api/v1/voice-pandit/turn → autoplay the
 * returned mp3 + render the transcript+reply pair.
 *
 * Single round-trip target: <3 s (mic-stop → first audio frame). Latency
 * breakdown surfaced inline so the founder can spot regressions live.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, Loader2, Volume2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.darshya.online';

type TurnResponse = {
  transcript: string;
  reply: string;
  audioBase64: string;
  audioMimeType: string;
  latency_ms: number;
  breakdown_ms?: { stt: number; llm: number; tts: number };
  demo?: boolean;
  language: 'en' | 'hi';
};

type Status = 'idle' | 'recording' | 'uploading' | 'playing' | 'error';

export default function VoicePanditButton({ language = 'en' }: { language?: 'en' | 'hi' }) {
  const [status, setStatus] = useState<Status>('idle');
  const [lastTurn, setLastTurn] = useState<TurnResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      // Cleanup on unmount — release the mic
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  const fireAnalytics = useCallback((event: string, props?: Record<string, unknown>) => {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { posthog?: { capture?: (e: string, p?: unknown) => void } };
    try {
      w.posthog?.capture?.(event, props);
    } catch {
      /* posthog optional */
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (status !== 'idle' && status !== 'error') return;
    try {
      // Reuse a single stream across turns when possible — re-acquiring the
      // mic adds ~200 ms each turn on some browsers.
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      // Pick the best supported mime type the browser advertises. webm/opus
      // is universal on Chrome/Edge/Firefox; Safari needs mp4/aac.
      const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const mimeType =
        candidates.find((c) => (window as unknown as { MediaRecorder?: { isTypeSupported?: (m: string) => boolean } }).MediaRecorder?.isTypeSupported?.(c)) ??
        '';
      const rec = mimeType
        ? new MediaRecorder(streamRef.current, { mimeType })
        : new MediaRecorder(streamRef.current);
      recorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.start();
      setStatus('recording');
      fireAnalytics('voice_pandit_session_started', { language });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'mic permission denied';
      setError(msg);
      setStatus('error');
      fireAnalytics('voice_pandit_session_error', { stage: 'mic', message: msg });
    }
  }, [status, language, fireAnalytics]);

  const stopAndSend = useCallback(async () => {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') return;
    setStatus('uploading');

    // Wait for the final data chunk before flushing
    const stopped = new Promise<void>((res) => {
      rec.onstop = () => res();
    });
    rec.stop();
    await stopped;

    const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
    const t0 = performance.now();
    try {
      const audioBase64 = await blobToBase64(blob);
      const res = await fetch(`${API_BASE}/api/v1/voice-pandit/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType: blob.type, language }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`turn failed: ${res.status} ${body.slice(0, 120)}`);
      }
      const turn = (await res.json()) as TurnResponse;
      const wallClient = Math.round(performance.now() - t0);
      setLastTurn(turn);
      fireAnalytics('voice_pandit_turn_complete', {
        latency_ms_server: turn.latency_ms,
        latency_ms_client: wallClient,
        stt_ms: turn.breakdown_ms?.stt,
        llm_ms: turn.breakdown_ms?.llm,
        tts_ms: turn.breakdown_ms?.tts,
        language: turn.language,
        demo: turn.demo,
      });

      if (turn.audioBase64) {
        setStatus('playing');
        const url = `data:${turn.audioMimeType || 'audio/mpeg'};base64,${turn.audioBase64}`;
        const audio = audioRef.current ?? new Audio();
        audio.src = url;
        audio.onended = () => setStatus('idle');
        audio.onerror = () => setStatus('idle');
        audioRef.current = audio;
        await audio.play().catch(() => {
          // Autoplay can be blocked — surface as ready-to-tap
          setStatus('idle');
        });
      } else {
        setStatus('idle');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'request failed';
      setError(msg);
      setStatus('error');
      fireAnalytics('voice_pandit_session_error', { stage: 'upload', message: msg });
    }
  }, [language, fireAnalytics]);

  const label =
    status === 'recording'
      ? 'Release to send'
      : status === 'uploading'
        ? 'Thinking…'
        : status === 'playing'
          ? 'Pandit Ji is speaking'
          : 'Hold to ask';

  return (
    <div className="rounded-xl border border-saffron-200 bg-saffron-50/50 p-4 my-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={label}
          onMouseDown={start}
          onMouseUp={stopAndSend}
          onMouseLeave={() => {
            if (status === 'recording') stopAndSend();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            start();
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            stopAndSend();
          }}
          disabled={status === 'uploading' || status === 'playing'}
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-transform ${
            status === 'recording'
              ? 'bg-red-600 scale-110 animate-pulse'
              : status === 'uploading'
                ? 'bg-saffron-400 cursor-wait'
                : status === 'playing'
                  ? 'bg-emerald-600'
                  : 'bg-saffron-600 hover:bg-saffron-700'
          }`}
        >
          {status === 'uploading' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : status === 'playing' ? (
            <Volume2 className="h-5 w-5" />
          ) : status === 'recording' ? (
            <Square className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-surface-800">Voice Pandit Ji</p>
          <p className="text-xs text-surface-500">{label}</p>
        </div>
        {lastTurn && (
          <span className="hidden text-xs text-surface-500 sm:inline">
            {lastTurn.latency_ms} ms
            {lastTurn.demo ? ' · demo' : ''}
          </span>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {lastTurn && (
        <div className="mt-3 space-y-2 text-sm">
          {lastTurn.transcript && (
            <p className="text-surface-700">
              <span className="font-semibold text-surface-500">You: </span>
              {lastTurn.transcript}
            </p>
          )}
          {lastTurn.reply && (
            <p className="text-surface-800">
              <span className="font-semibold text-saffron-700">Pandit Ji: </span>
              {lastTurn.reply}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const data = reader.result;
      if (typeof data !== 'string') {
        rej(new Error('blob read failed'));
        return;
      }
      // data: prefix removed — server expects pure base64
      const idx = data.indexOf(',');
      res(idx >= 0 ? data.slice(idx + 1) : data);
    };
    reader.onerror = () => rej(reader.error ?? new Error('blob read failed'));
    reader.readAsDataURL(blob);
  });
}
