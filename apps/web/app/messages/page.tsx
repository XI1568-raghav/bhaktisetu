'use client';

import AuthGuard from '../../components/AuthGuard';
import { Inbox } from '../../components/Inbox';

export default function DevoteeMessagesPage() {
  return (
    <AuthGuard>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold text-surface-800 mb-1">Messages</h1>
        <p className="text-sm text-surface-500 mb-4">Chat with your priests, astrologers, and providers.</p>
        <Inbox role="devotee" />
      </div>
    </AuthGuard>
  );
}
