'use client';

import { useState } from 'react';
import { Upload, Video, Loader2, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { API_BASE_URL } from '../../lib/api-config';
import ProofLink from './ProofLink';
// RES-09: both catches below rendered `e.message` verbatim — see the notes at
// each one for what that actually put on a pandit's screen.
import { userFacingMessage } from '../../lib/friendly-error';
import { buttonClass } from '../../components/ui/button-recipe';

interface Props {
  bookingId: string;
  existingUrl?: string | null;
  /** Receives the private object key (uploaded file) or the external URL (pasted link). */
  onUploaded?: (keyOrUrl: string) => void | Promise<void>;
}

// Fallback only: the real limit comes back from the API with the signed upload URL.
const DEFAULT_MAX_MB = 50;
const SUPPORTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

/**
 * Uploads puja proof video to PRIVATE storage through the API: ask
 * POST /priest/bookings/:id/video-proof/signed-url for a one-off upload URL, PUT
 * the file there, then hand the returned object key to the caller, which
 * registers it on the booking. Nothing is written to a bucket with the user's own
 * credentials and no public URL exists for the file. A pasted external link
 * (Drive, YouTube) is still accepted.
 */
export default function VideoProofUpload({
  bookingId,
  existingUrl,
  onUploaded,
}: Props) {
  const { session } = useAuth();
  const [maxMb, setMaxMb] = useState(DEFAULT_MAX_MB);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(existingUrl ?? null);
  const [manualUrl, setManualUrl] = useState('');

  async function handleFile(file: File) {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setError('Unsupported video format. Use MP4, WebM or MOV.');
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setError(`That video is larger than ${maxMb} MB. Please trim it or record at a lower quality and try again.`);
      return;
    }
    setError(null);
    setUploading(true);
    setProgress('Uploading…');
    try {
      const signRes = await fetch(`${API_BASE_URL}/priest/bookings/${bookingId}/video-proof/signed-url`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.accessToken ?? ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!signRes.ok) {
        const body = (await signRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Could not start the upload.');
      }
      const signed = (await signRes.json()) as { uploadUrl: string; key: string; maxSizeMb?: number; headers?: Record<string, string> };
      if (signed.maxSizeMb) {
        setMaxMb(signed.maxSizeMb);
        if (file.size > signed.maxSizeMb * 1024 * 1024) {
          throw new Error(`That video is larger than ${signed.maxSizeMb} MB. Please trim it or record at a lower quality and try again.`);
        }
      }
      const put = await fetch(signed.uploadUrl, {
        method: 'PUT',
        headers: signed.headers ?? { 'Content-Type': file.type },
        body: file,
      });
      if (put.status === 413) {
        throw new Error(`That video is too large for upload (limit ${signed.maxSizeMb ?? maxMb} MB). Please trim it or record at a lower quality and try again.`);
      }
      if (!put.ok) throw new Error('The upload did not go through. Please try again.');
      setUploadedUrl(signed.key);
      setProgress('Uploaded — submitting…');
      if (onUploaded) await onUploaded(signed.key);
      setProgress(null);
    } catch (e) {
      // RES-09 (2026-09-02): this rendered the raw error message. The throw two
      // lines up is `upErr`, a Supabase `StorageError`, so what a pandit read
      // when an upload was refused was the storage layer's own wording — "new
      // row violates row-level security policy", "The resource already exists",
      // "Payload too large", "Bucket not found" — none of which tells them what
      // to do, and one of which (the RLS one) names an internal mechanism.
      //
      // Video proof is MANDATORY for every puja booking (PROJECT_CONTEXT.md
      // business rule 1), so this is the screen that stands between a completed
      // puja and the pandit being paid for it. `userFacingMessage` passes
      // through anything already fit to read, classifies what it recognises
      // (network, auth, rate limit, 5xx), and otherwise uses the fallback here.
      setError(
        userFacingMessage(e, 'We could not upload that video. Please check your connection and try again.'),
      );
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
      // RES-09: `onUploaded` is the caller's API write (marking the booking
      // video_uploaded). It is a bare `fetch` on every current caller, so a
      // rejection here is the browser's own string — "Failed to fetch", "Load
      // failed" — and the pandit sees it having just uploaded 200 MB.
      setError(
        userFacingMessage(e, 'The video uploaded, but we could not attach it to the booking. Please try again.'),
      );
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
        <ProofLink
          bookingId={bookingId}
          stored={uploadedUrl}
          token={session?.accessToken}
          className="inline-flex items-center gap-1.5 text-sm text-saffron-600 hover:text-saffron-700"
        >
          <ExternalLink className="w-4 h-4" />
          View video
        </ProofLink>
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
            MP4, WebM, MOV up to {maxMb} MB
          </p>
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>

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
            className={buttonClass('primary', 'md')}
            aria-label="Submit link"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            <span>Submit link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
