'use client';

import { Inbox } from '../../../components/Inbox';

export default function StoreAdminMessagesPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-surface-800 mb-1">Customer Messages</h1>
      <p className="text-sm text-surface-500 mb-4">Resolve customer order questions in real time.</p>
      <Inbox role="provider" />
    </div>
  );
}
