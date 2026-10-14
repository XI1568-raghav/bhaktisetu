'use client';

import { useState } from 'react';
import { MAX_BLOCK_REASON } from '../../lib/admin-block';

/** Confirm step before blocking an account; the reason is optional and sent as blockedReason. */
export default function BlockUserDialog({
  userLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  userLabel: string;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" data-testid="block-dialog">
      <div className="bg-white rounded-xl border border-surface-100 w-full max-w-md p-5 shadow-xl">
        <h3 className="font-semibold text-surface-800">Block {userLabel}?</h3>
        <p className="text-sm text-surface-600 mt-2">
          They will be signed out and refused on every request until you unblock them. The reason is shown to them when they try to sign in.
        </p>
        <label htmlFor="block-reason" className="block text-xs font-medium text-surface-500 mt-3">
          Reason (optional)
        </label>
        <textarea
          id="block-reason"
          data-testid="block-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={MAX_BLOCK_REASON}
          rows={3}
          className="w-full mt-1 px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" disabled={busy} onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-surface-600 hover:bg-surface-50">
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            data-testid="block-confirm"
            onClick={() => onConfirm(reason)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            Block account
          </button>
        </div>
      </div>
    </div>
  );
}
