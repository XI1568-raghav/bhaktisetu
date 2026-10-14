/**
 * Suspended-account notice. The API refuses a blocked user with 403 and a message
 * "Account suspended: <reason>" or "This account has been suspended." Instead of a
 * silent sign-out the app keeps the sentence and the login screen shows it.
 */

export const SUSPENDED_MESSAGE = 'This account has been suspended.';

export function isSuspendedMessage(message: unknown): boolean {
  return typeof message === 'string' && /suspended/i.test(message);
}

export function isSuspendedError(err: unknown): boolean {
  const e = err as { statusCode?: unknown; message?: unknown } | null;
  return e?.statusCode === 403 && isSuspendedMessage(e.message);
}

/** The text shown on the login screen, including the operator's reason when given. */
export function suspendedNoticeText(message: string): string {
  const hit = /account suspended:\s*(.+)$/i.exec(message.trim());
  const reason = hit ? hit[1]!.trim().slice(0, 300) : '';
  return `${SUSPENDED_MESSAGE}${reason ? ` Reason: ${reason}.` : ''} Contact support@darshya.online if you think this is a mistake.`;
}

let notice: string | null = null;
const listeners = new Set<(n: string | null) => void>();

export function setSuspendedNotice(message: string | null): void {
  notice = message === null ? null : suspendedNoticeText(message);
  listeners.forEach((l) => l(notice));
}

export function peekSuspendedNotice(): string | null {
  return notice;
}

export function subscribeSuspendedNotice(fn: (n: string | null) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
