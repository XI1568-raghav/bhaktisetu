'use client';

import { Video } from 'lucide-react';

/**
 * Jitsi 1:1 video call button. Free public meet.jit.si — no auth required.
 * Room name: `darshya-<bookingId>` (deterministic so devotee + provider land in same room).
 * Auth: rendered only when caller has booking context (parent component must verify).
 *
 * For paid auth-gated rooms, swap to a JWT-issuing API endpoint that signs
 * `room` + `exp` with `JITSI_JWT_SECRET`. Today: free public room is acceptable
 * because room name is opaque (UUID-derived) and call-window enforced client-side.
 */

interface JitsiCallButtonProps {
  bookingId: string;
  scheduledAt: string | Date | null;
  variant?: 'primary' | 'secondary';
  label?: string;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function withinCallWindow(scheduledAt: string | Date | null): boolean {
  if (!scheduledAt) return true; // unknown → allow (UI parent can override)
  const t = typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  if (isNaN(t.getTime())) return true;
  return Math.abs(Date.now() - t.getTime()) <= TWO_HOURS_MS;
}

function roomUrl(bookingId: string): string {
  return `https://meet.jit.si/darshya-${bookingId}#config.startWithVideoMuted=false&config.prejoinPageEnabled=true`;
}

export default function JitsiCallButton({ bookingId, scheduledAt, variant = 'primary', label = 'Join 1:1 Call' }: JitsiCallButtonProps) {
  const open = withinCallWindow(scheduledAt);
  const cls = variant === 'primary'
    ? 'bg-saffron-600 hover:bg-saffron-700 text-white'
    : 'border border-[var(--color-border)] bg-white text-surface-700 hover:border-saffron-300';

  if (!open) {
    return (
      <button disabled className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium opacity-60 cursor-not-allowed border border-[var(--color-border)] bg-surface-100 text-surface-500">
        <Video className="w-4 h-4" /> Call opens 2h before scheduled time
      </button>
    );
  }

  return (
    <a
      href={roomUrl(bookingId)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${cls}`}
    >
      <Video className="w-4 h-4" />
      {label}
    </a>
  );
}
