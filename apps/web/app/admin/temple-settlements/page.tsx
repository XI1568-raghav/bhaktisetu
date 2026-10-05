'use client';

/**
 * A temple earns a share of every puja booked at it and receives the donations
 * made to it. Darshya collects both and sends them on by hand. This screen shows
 * what each temple is owed and where to send it, and records the transfer once
 * the admin has made it. It moves no money itself.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../../../lib/auth-context';
import { H1 } from '../../../components/ui/heading-recipe';
import { userFacingMessage } from '../../../lib/friendly-error';
import { listTempleBalances, recordTempleTransfer, type TempleBalance, type TransferKind } from './settlement-api';

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Target {
  temple: TempleBalance;
  kind: TransferKind;
  owed: number;
}

export default function AdminTempleSettlementsPage() {
  const { session } = useAuth();
  const token = session?.accessToken;

  const [rows, setRows] = useState<TempleBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // State is stale inside the handler's closure; the latch that stops a
  // double-click recording twice has to be a ref.
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoadError(null);
      setRows(await listTempleBalances(token));
    } catch (err) {
      setLoadError(userFacingMessage(err, 'Could not load temple balances.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  function open(temple: TempleBalance, kind: TransferKind) {
    const owed = kind === 'puja-share' ? temple.pujaShareOwedInr : temple.donationsOwedInr;
    setTarget({ temple, kind, owed });
    setAmount(String(owed));
    setReference('');
    setActionError(null);
    setSuccess(null);
  }

  async function confirm() {
    if (!target || inFlight.current) return;
    const ref = reference.trim();
    const amt = Number(amount);
    if (ref.length < 3) {
      setActionError('Enter the transfer reference (UTR / UPI ref), so this can be matched to the bank statement later.');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setActionError('Enter the amount you transferred, in rupees.');
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setActionError(null);
    try {
      await recordTempleTransfer(token, target.kind, { templeId: target.temple.templeId, amountInr: amt, reference: ref });
      setSuccess(`${inr(amt)} to ${target.temple.name} recorded (ref ${ref}).`);
      setTarget(null);
      await load();
    } catch (err) {
      setActionError(userFacingMessage(err, 'Could not record this transfer.'));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className={`${H1.portal} mb-1`}>Temple funds</h1>
      <p className="text-sm text-surface-500 mb-6">
        A temple earns a share of each puja booked at it, payable once the puja has been performed, and receives the
        donations made to it. Darshya collects both. Send the money to the temple by bank transfer, then record the
        transfer here. Recording does not move money by itself.
      </p>

      {success && (
        <div role="status" className="mb-4 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {loadError && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-surface-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
      ) : rows.length === 0 && !loadError ? (
        <p className="text-sm text-surface-500">No temple has earned a puja share or received a donation yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.templeId} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <p className="font-semibold text-surface-800">{r.name}</p>
              <div className="mt-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-surface-500">Puja share to send</p>
                  <p className="text-lg font-semibold text-surface-800">{inr(r.pujaShareOwedInr)}</p>
                  <p className="text-xs text-surface-500">
                    sent {inr(r.pujaShareSentInr)}
                    {r.pujaShareHeldInr > 0 && ` · ${inr(r.pujaShareHeldInr)} held until the puja is performed`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-surface-500">Donations to send</p>
                  <p className="text-lg font-semibold text-surface-800">{inr(r.donationsOwedInr)}</p>
                  <p className="text-xs text-surface-500">
                    {r.donationsCount} donation{r.donationsCount === 1 ? '' : 's'} · received {inr(r.donationsPaidInr)} · sent {inr(r.donationsSentInr)}
                  </p>
                </div>
              </div>
              <div className="mt-3 text-sm">
                {r.payTo ? (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    {r.payTo.holderName && (<><dt className="text-surface-500">Account holder</dt><dd className="text-surface-800">{r.payTo.holderName}</dd></>)}
                    <dt className="text-surface-500">Account number</dt><dd className="font-mono text-surface-800">{r.payTo.accountNumber}</dd>
                    <dt className="text-surface-500">IFSC</dt><dd className="font-mono text-surface-800">{r.payTo.ifsc}</dd>
                  </dl>
                ) : (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    No bank details on file for this temple. Ask its manager to add them in their KYC before you send money.
                  </p>
                )}
              </div>
              {(r.pujaShareOwedInr > 0 || r.donationsOwedInr > 0) && (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {r.pujaShareOwedInr > 0 && (
                    <button type="button" onClick={() => open(r, 'puja-share')}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700">
                      Record puja share transfer
                    </button>
                  )}
                  {r.donationsOwedInr > 0 && (
                    <button type="button" onClick={() => open(r, 'donations')}
                      className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700">
                      Record donation transfer
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="settle-title" className="w-full max-w-md rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 shadow-xl">
            <h2 id="settle-title" className="text-base font-semibold text-surface-800">
              Record {target.kind === 'puja-share' ? 'puja share' : 'donation'} transfer to {target.temple.name}
            </h2>
            <p className="text-sm text-surface-500 mt-1">
              {target.kind === 'puja-share'
                ? `${inr(target.owed)} is payable. One transfer settles every payable booking, so record that exact amount.`
                : `Owed ${inr(target.owed)}. Record a transfer you have already made.`}
            </p>
            <label htmlFor="settle-amount" className="mt-4 block text-sm font-medium text-surface-700">Amount transferred (₹)</label>
            <input id="settle-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" />
            <label htmlFor="settle-ref" className="mt-3 block text-sm font-medium text-surface-700">Transfer reference (UTR / UPI ref)</label>
            <input id="settle-ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 418923456789"
              className="mt-1 w-full rounded-md border border-[var(--color-border)] px-3 py-2 text-sm" />
            {actionError && (
              <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setTarget(null)} disabled={submitting}
                className="px-3 py-1.5 text-sm rounded-md border border-[var(--color-border)] text-surface-600 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={confirm} disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-white text-sm font-medium rounded-md bg-green-600 hover:bg-green-700 disabled:opacity-60">
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm transfer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
