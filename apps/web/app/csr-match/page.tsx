import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CsrMatchClient from './CsrMatchClient';

/**
 * LEG-14 (prod sweep 2026-08-12) — /csr-match returned 200 on every
 * environment and told corporate CSR buyers, in writing, "Bhaktisetu is 80G
 * certified + CSR-1 registered". lib/company.ts says HAS_80G_VERIFIED false,
 * pan null, eightyGNumber null, IS_INCORPORATED_VERIFIED false. The only
 * "control" was a source comment reading "Dev-server only. NOT deployed until
 * founder approves 80G + CSR-1 compliance attestation" — a comment does not
 * gate a route.
 *
 * The gate is now real: the page 404s unless ENABLE_CSR_MATCH is explicitly
 * "true" in the server environment. It is deliberately NOT a NEXT_PUBLIC_
 * variable — this must be an operator decision, not something inlined into the
 * client bundle. The certification sentence inside the page is rendered from
 * company.ts, so even with the flag on it cannot claim a registration the
 * platform does not hold.
 */
function csrMatchEnabled(): boolean {
  return process.env.ENABLE_CSR_MATCH === 'true';
}

export const metadata: Metadata = {
  // SEO-03: the root layout's title template already appends " | Darshya", so
  // carrying the brand here rendered "CSR Donation Match · Darshya | Darshya"
  // and burned ~11 chars of a ~60-char SERP budget.
  title: 'CSR Donation Match',
  description:
    'Employee pledges matched from your CSR budget, routed to verified temple adoption programmes.',
  robots: { index: false, follow: false },
};

export default function CsrMatchPage() {
  if (!csrMatchEnabled()) notFound();
  return <CsrMatchClient />;
}
