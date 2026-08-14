'use client';

/**
 * /admin/settings — what the platform is configured to do, read-only.
 *
 * AO-10 (prod sweep 2026-08-12, P1): this screen was a control panel with
 * nothing behind it. `handleSave` was `await new Promise(r => setTimeout(r,
 * 700))` — it rendered "Saved!", issued ZERO requests, and every value reverted
 * on reload. A founder discounting a category to win supply would believe the
 * discount was live while the ledger kept charging the old rate.
 *
 * The numbers were invented as well. Six hardcoded rates ["25","15","30","20",
 * "10","20"] were presented as the platform's take, including "Astrology
 * Consultations 30%" while the live commission for Acharya Vinod Sharma was
 * gross Rs 500 / platform cut Rs 100 = 20%. The Admins tab listed three people
 * who do not exist and its Add / Remove buttons only pushed to local state
 * (POST /admin/users answers "User created" and creates nobody — AO-16). The
 * subscription plans were a fixture price list with dead Active/Inactive
 * switches, and four Platform toggles persisted nothing at all.
 *
 * There is no GET/PUT /admin/settings endpoint of any kind — no config table,
 * nothing for the ledger to read. So this screen becomes the honest version of
 * itself: the take rates the ledger HAS applied, the plans the API actually
 * serves, and the accounts that actually hold the admin role. No control that
 * cannot write, and no number this page invented.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Crown, IndianRupee, Loader2, Shield } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import AuthGuard from '../../../components/AuthGuard';
import { listCommissions, type Commission } from '../../../lib/commission-api';
import { listPlans, type SubscriptionPlan } from '../../../lib/subscription-api';
import { fetchAllAdminUsers, type AdminUserRecord } from '../users/users-api';

/**
 * The INTENDED platform take: `DEFAULT_PRIEST_SHARE = 0.8` in
 * apps/api/src/services/booking.service.ts, and the 0.20 default on
 * StoreProfile.commission.
 *
 * Deliberately labelled "intended" and never rendered as the rate in force.
 * booking.service.ts carries an open, owner-gated schema mismatch: prisma still
 * declares `Priest.commissionRate @default(0.70)`, so a pandit onboarded through
 * the normal flow is billed at a 30% platform take, and the ledger on this
 * machine holds 10 rows at 33.10%, 5 at 20% and 1 at 23.54%. A screen that
 * announced a flat "20%" would be wrong for most of the money that has actually
 * moved — which is the class of defect this page is being fixed for.
 */
const INTENDED_TAKE_RATE_PCT = 20;

const roleLabels: Record<string, string> = {
  PANDIT: 'Pandit',
  PRIEST: 'Pandit',
  STORE_OWNER: 'Store',
  ASTROLOGER: 'Astrologer',
  WELLNESS_INSTRUCTOR: 'Wellness',
  GAUSHALA_MANAGER: 'Gaushala',
  TEMPLE_MANAGER: 'Temple Mgr',
  DEVOTEE: 'Devotee',
  ADMIN: 'Admin',
};

type TabId = 'commissions' | 'subscriptions' | 'admins';

const TABS: Array<{ id: TabId; label: string; icon: typeof IndianRupee }> = [
  { id: 'commissions', label: 'Commissions', icon: IndianRupee },
  { id: 'subscriptions', label: 'Subscriptions', icon: Crown },
  { id: 'admins', label: 'Admins', icon: Shield },
];

interface RateBucket {
  ratePercent: number;
  rows: number;
  providerEarnings: number;
  platformCut: number;
}

function formatInr(amount: number): string {
  return `Rs. ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Distinct take rates the ledger has actually charged, biggest bucket first. */
function bucketByRate(rows: Commission[]): RateBucket[] {
  const buckets = new Map<number, RateBucket>();
  for (const row of rows) {
    const rate = typeof row.ratePercent === 'number' ? row.ratePercent : null;
    if (rate === null) continue;
    const bucket = buckets.get(rate) ?? {
      ratePercent: rate,
      rows: 0,
      providerEarnings: 0,
      platformCut: 0,
    };
    bucket.rows += 1;
    bucket.providerEarnings += Number(row.amount) || 0;
    bucket.platformCut += Number(row.platformCut ?? 0) || 0;
    buckets.set(rate, bucket);
  }
  return Array.from(buckets.values()).sort((a, b) => b.rows - a.rows);
}

export default function AdminSettingsPage() {
  return (
    <AuthGuard allowedRoles={['admin']}>
      <AdminSettingsContent />
    </AuthGuard>
  );
}

function AdminSettingsContent() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [activeTab, setActiveTab] = useState<TabId>('commissions');

  const [ledger, setLedger] = useState<Commission[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(true);
  const [adminsError, setAdminsError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await listCommissions(token, { pageSize: 200 });
        if (cancelled) return;
        setLedger(page.items);
        setLedgerTotal(page.total);
      } catch (err) {
        if (!cancelled) {
          setLedger([]);
          setLedgerError(err instanceof Error ? err.message : 'Could not load the commission ledger.');
        }
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    })();

    (async () => {
      try {
        const rows = await listPlans();
        if (!cancelled) setPlans(rows);
      } catch (err) {
        if (!cancelled) {
          setPlans([]);
          setPlansError(err instanceof Error ? err.message : 'Could not load subscription plans.');
        }
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();

    (async () => {
      try {
        const directory = await fetchAllAdminUsers(token);
        if (cancelled) return;
        setAdmins(directory.users.filter((u) => (u.roles ?? []).includes('ADMIN')));
      } catch (err) {
        if (!cancelled) {
          setAdmins([]);
          setAdminsError(err instanceof Error ? err.message : 'Could not load admin accounts.');
        }
      } finally {
        if (!cancelled) setAdminsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const rateBuckets = bucketByRate(ledger);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-surface-800">Settings</h1>
        <p className="text-sm text-surface-500 mt-0.5">
          What the platform is configured to do. Everything here is read-only — there is no
          settings endpoint, so a control on this screen could only pretend.
        </p>
      </div>

      <div className="flex gap-1 bg-[var(--color-surface)] rounded-lg p-1 border border-[var(--color-border)] w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-saffron-600 text-white'
                  : 'text-surface-500 hover:text-surface-700 hover:bg-surface-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ─── commissions ──────────────────────────────────────────────────── */}
      {activeTab === 'commissions' && (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
            <h2 className="text-sm font-semibold text-surface-800 mb-1">Take rate in force</h2>
            <p className="text-xs text-surface-500 mb-4">
              The rate is stamped on each Commission row when it is created, so the only truthful
              answer to &ldquo;what do we charge?&rdquo; is what the ledger has charged.
            </p>

            {ledgerError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Commission ledger unavailable — {ledgerError}. The rates actually charged cannot
                  be shown, and no figure is substituted for them.
                </span>
              </div>
            )}

            {ledgerLoading ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-surface-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Reading the ledger…
              </p>
            ) : rateBuckets.length === 0 ? (
              !ledgerError && (
                <p className="mt-4 text-sm text-surface-500">
                  No commission has been charged yet, so no rate has been applied. The intended take
                  rate is {INTENDED_TAKE_RATE_PCT}% platform / {100 - INTENDED_TAKE_RATE_PCT}%
                  provider — an intention, not a measurement.
                </p>
              )
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-2.5 pr-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Rate charged</th>
                      <th className="text-center py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Commissions</th>
                      <th className="text-right py-2.5 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Provider earned</th>
                      <th className="text-right py-2.5 pl-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Platform cut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateBuckets.map((b) => (
                      <tr key={b.ratePercent} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="py-2.5 pr-4 font-medium text-surface-800">{b.ratePercent}%</td>
                        <td className="py-2.5 px-4 text-center text-surface-600">{b.rows}</td>
                        <td className="py-2.5 px-4 text-right text-surface-700">{formatInr(b.providerEarnings)}</td>
                        <td className="py-2.5 pl-4 text-right font-medium text-surface-800">{formatInr(b.platformCut)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {ledgerTotal > ledger.length && (
                  <p className="mt-3 text-xs text-amber-700">
                    Measured over the {ledger.length} most recent of {ledgerTotal} commissions —
                    older rows may carry other rates.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
            <h2 className="text-sm font-semibold text-surface-800 mb-2">Where the rate is set</h2>
            <ul className="text-sm text-surface-600 space-y-1.5 list-disc pl-5">
              <li>
                Intended take: {INTENDED_TAKE_RATE_PCT}% platform /{' '}
                {100 - INTENDED_TAKE_RATE_PCT}% provider. Rows above that differ are not a display
                fault — a pandit&apos;s stored share is the source of truth, and its schema default
                is still the pre-revamp 70% (a 30% platform take). Reconciling the two is an open
                owner decision recorded in the booking service.
              </li>
              <li>
                A pandit&apos;s own share lives on their provider record and is applied when the
                booking creates its commission — it cannot be changed retroactively.
              </li>
              <li>
                Rates already charged are immutable: <code>Commission.percentage</code> is what that
                booking was billed, and reconciliation depends on it staying that way.
              </li>
              <li>
                There is no platform-wide rate switch. Editing one from here would need a config
                table the ledger reads, which does not exist yet.
              </li>
            </ul>
            <Link href="/admin/commissions" className="inline-block mt-3 text-sm text-saffron-600 font-medium">
              Open the commission ledger
            </Link>
          </div>
        </div>
      )}

      {/* ─── subscriptions ────────────────────────────────────────────────── */}
      {activeTab === 'subscriptions' && (
        <div className="space-y-4">
          <p className="text-xs text-surface-500">
            Plans as the API serves them to providers. Prices come from the same rows
            /subscriptions/subscribe charges, so this screen cannot disagree with the bill.
          </p>

          {plansError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Plans unavailable — {plansError}. This is not an empty plan list.</span>
            </div>
          )}

          {plansLoading ? (
            <p className="flex items-center gap-2 text-sm text-surface-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading plans…
            </p>
          ) : plans.length === 0 ? (
            !plansError && (
              <p className="text-sm text-surface-500">The API is serving no subscription plans.</p>
            )
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-surface-800">{plan.name}</h3>
                    {plan.role && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-surface-100 text-surface-600">
                        {roleLabels[plan.role] ?? plan.role}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-surface-700">
                    {plan.priceMonthly === 0
                      ? 'Free'
                      : `Rs. ${plan.priceMonthly.toLocaleString('en-IN')}/month`}
                  </p>
                </div>
                {plan.description && (
                  <p className="text-sm text-surface-500 mt-1">{plan.description}</p>
                )}
                {plan.features.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {plan.features.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center px-2 py-0.5 bg-surface-50 text-surface-600 text-xs rounded-full"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── admins ───────────────────────────────────────────────────────── */}
      {activeTab === 'admins' && (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <div className="px-5 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-surface-800">Admin accounts</h2>
              <p className="text-xs text-surface-500 mt-0.5">
                Accounts holding the ADMIN role assignment.
              </p>
            </div>

            {adminsError && (
              <div className="mx-5 mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Admin accounts unavailable — {adminsError}. This is not &ldquo;no admins&rdquo;.</span>
              </div>
            )}

            {adminsLoading ? (
              <p className="flex items-center gap-2 text-sm text-surface-500 p-5">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading admin accounts…
              </p>
            ) : admins.length === 0 ? (
              <p className="p-5 text-sm text-surface-500">
                {adminsError ? 'Admin accounts could not be loaded.' : 'No account holds the admin role.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 px-5 text-xs font-medium text-surface-500 uppercase tracking-wide">Name</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Email</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-surface-500 uppercase tracking-wide">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((a, i) => (
                      <tr
                        key={a.id}
                        className={`border-b border-[var(--color-border)] last:border-0 ${i % 2 === 1 ? 'bg-surface-50/30' : ''}`}
                      >
                        <td className="py-3 px-5">
                          <Link
                            href={`/admin/users/${a.id}`}
                            className="font-medium text-surface-800 hover:text-saffron-600"
                          >
                            {a.fullName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-surface-500">{a.email ?? '—'}</td>
                        <td className="py-3 px-4 text-surface-500">
                          {new Date(a.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-5">
            <h2 className="text-sm font-semibold text-surface-800 mb-2">Granting admin access</h2>
            <p className="text-sm text-surface-600">
              Change an existing account&apos;s role from{' '}
              <Link href="/admin/users" className="text-saffron-600 font-medium">
                User Management
              </Link>
              . There is deliberately no &ldquo;Add Admin&rdquo; form here: POST /admin/users answers
              &ldquo;User created&rdquo; without creating anyone, so a form on this screen would hand
              out admin access that does not exist.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
