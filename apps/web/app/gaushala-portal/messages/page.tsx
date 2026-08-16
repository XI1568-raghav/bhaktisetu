'use client';

import { Inbox } from '../../../components/Inbox';
import { H1 } from '../../../components/ui/heading-recipe';

export default function GaushalaMessagesPage() {
  return (
    <div className="max-w-5xl">
      <h1 className={`${H1.portal} mb-1`}>Donor Messages</h1>
      <p className="text-sm text-surface-500 mb-4">Update donors on the cows they sponsor.</p>
      <Inbox role="provider" />
    </div>
  );
}
