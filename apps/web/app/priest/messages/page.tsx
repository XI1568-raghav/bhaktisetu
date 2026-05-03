'use client';
export const runtime = 'edge';

import { Inbox } from '../../../components/Inbox';

export default function PriestMessagesPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-surface-800 mb-1">Devotee Messages</h1>
      <p className="text-sm text-surface-500 mb-4">Reply to devotees you&apos;re serving and start video calls.</p>
      <Inbox role="provider" />
    </div>
  );
}
