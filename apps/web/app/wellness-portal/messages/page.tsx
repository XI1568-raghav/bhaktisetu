'use client';
export const runtime = 'edge';

import { Inbox } from '../../../components/Inbox';

export default function WellnessMessagesPage() {
  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-surface-800 mb-1">Student Messages</h1>
      <p className="text-sm text-surface-500 mb-4">Guide your students through chat and live sessions.</p>
      <Inbox role="provider" />
    </div>
  );
}
