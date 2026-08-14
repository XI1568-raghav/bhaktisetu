'use client';

/**
 * /admin/users/view?id=<uuid> — legacy redirect.
 *
 * AO-06 (prod sweep 2026-08-12, P1): this file WAS the product's only
 * user-detail screen, and it was a hardcoded map of nine invented people
 * ("Arjun Sharma", "Pandit Ramesh Sharma", …) keyed by fake ids u001–u012. It
 * made no API call, so every real uuid rendered "User not found. This may be a
 * demo limitation." to an operator working a live account, and its Approve /
 * Block / Reset-password / Delete buttons had no handlers at all. When an id DID
 * match, the page showed one person's verified identity — name, email, phone,
 * earnings — for a completely different account, which is the worst outcome
 * available on a moderation screen.
 *
 * The real record lives at /admin/users/[id]. This route stays only so links
 * and bookmarks that still carry ?id= land there instead of 404-ing.
 */

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function AdminUserViewRedirect() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params?.get('id') ?? '';

  useEffect(() => {
    if (id) router.replace(`/admin/users/${encodeURIComponent(id)}`);
  }, [id, router]);

  if (!id) {
    return (
      <div className="space-y-4">
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-saffron-600">
          Back to Users
        </Link>
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-10 text-center">
          <p className="text-sm text-surface-500">
            No user id was supplied, so there is no account to open.
          </p>
        </div>
      </div>
    );
  }

  return (
    <p className="p-8 text-sm text-surface-500">
      Opening the account record…{' '}
      <Link href={`/admin/users/${encodeURIComponent(id)}`} className="text-saffron-600 font-medium">
        Continue
      </Link>
    </p>
  );
}

export default function AdminUserViewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-surface-500">Loading…</div>}>
      <AdminUserViewRedirect />
    </Suspense>
  );
}
