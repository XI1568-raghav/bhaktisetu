'use client';
export const runtime = 'edge';

import { Inbox } from '../../../components/Inbox';

export default function AstrologerMessagesPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-surface-800 mb-1">Client Messages</h1>
      <p className="text-sm text-surface-500 mb-4">Consult with clients via chat or video call.</p>
      <Inbox role="provider" />
    </div>
  );
}
