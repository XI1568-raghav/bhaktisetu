'use client';

import { useState } from 'react';
import { Upload, Video, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { getSupabaseBrowserClient } from '../../lib/supabase';

interface Props {
  bookingId: string;
  bucket?: string;
  existingUrl?: string | null;
  onUploaded?: (publicUrl: string) => void | Promise<void>;
}

const MAX_FILE_SIZE_MB = 200;
const SUPPORTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];

/**
 * Uploads puja proof video to Supabase Storage. Storage was migrated from
 * Cloudflare R2 to Supabase per CLAUDE.md; bucket name defaults to
 * `booking-proofs` and must exist with appropriate RLS.
 *
 * Falls back to a manual URL input when Supabase env vars are missing
 * (graceful degradation per Darshya conventions).
 */
export default function VideoProofUpload({
  bookingId,
  bucket = 'booking-proofs',
  existingUrl,
  onUploaded,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(existingUrl ?? null);
  const [manualUrl, setManualUrl] = useState('');

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  async function handleFile(file: File) {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setError('Unsupported video format. Use MP4, WebM, MOV, or MKV.');
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large. Max ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    setError(null);
    setUploading(true);
    setProgress('Uploading…');
    try {
      const supabase = getSupabaseBrowserClient();
      const ext = file.name.split('.').pop() || 'mp4';
      const path = `${bookingId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = pub.publicUrl;
      setUploadedUrl(publicUrl);
      setProgress('Uploaded — submitting…');
      if (onUploaded) await onUploaded(publicUrl);
      setProgress(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setProgress(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleManualSubmit() {
    if (!manualUrl.trim()) return;
    setUploading(true);
    setError(null);
    try {
      if (onUploaded) await onUploaded(manualUrl.trim());
      setUploadedUrl(manualUrl.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setUploading(false);
    }
  }

  if (uploadedUrl) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-tulsi-green">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-semibold text-sm">Video proof uploaded</span>
        </div>
        <a
          href={uploadedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-saffron-600 hover:text-saffron-700"
        >
          <ExternalLink className="w-4 h-4" />
          View video
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasSupabase ? (
        <label className="block bg-surface-50 rounded-lg p-4 border-2 border-dashed border-surface-200 text-center cursor-pointer hover:bg-surface-100 transition-colors">
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin text-saffron-500 mx-auto" />
          ) : (
            <Upload className="w-8 h-8 text-surface-400 mx-auto mb-2" />
          )}
          <p className="text-sm font-medium text-surface-700">
            {uploading ? (progress ?? 'Uploading…') : 'Click to upload video'}
          </p>
          <p className="text-xs text-surface-500 mt-1">
            MP4, WebM, MOV up to {MAX_FILE_SIZE_MB}MB
          </p>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          Direct upload unavailable. Paste a video link below.
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-xs font-medium text-surface-500">
          Or paste video URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://… (YouTube, Drive, etc.)"
            className="flex-1 px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-saffron-200 focus:border-saffron-300"
          />
          <button
            type="button"
            onClick={handleManualSubmit}
            disabled={uploading || !manualUrl.trim()}
            className="px-4 py-2.5 bg-saffron-600 text-white text-sm font-medium rounded-lg hover:bg-saffron-700 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
