/** PATCH /admin/users/:id body for a block; blockedReason is optional (API max 500). */
export const MAX_BLOCK_REASON = 500;

export function blockUpdates(reason: string): { blocked: true; blockedReason?: string } {
  const r = reason.trim().slice(0, MAX_BLOCK_REASON);
  return r ? { blocked: true, blockedReason: r } : { blocked: true };
}
