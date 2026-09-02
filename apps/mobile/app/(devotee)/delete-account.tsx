import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { apiBase } from '../../lib/api';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * delete-account.tsx — the in-app half of LC-DEL.
 *
 * WHY THIS SCREEN EXISTS
 * ----------------------
 * `apps/api/src/routes/account.ts` and `account-deletion.service.ts` shipped a
 * complete, tested deletion pipeline earlier today — and no way for a devotee
 * to reach it. Apple Guideline 5.1.1(v) is explicit that the deletion must be
 * INITIABLE FROM INSIDE THE APP; a link out to a web page does not satisfy it
 * (Google Play wants the in-app path *and* a public web URL, which is a
 * separate deliverable). Until this file existed, the entire backend satisfied
 * neither store. This screen is that surface and nothing else: it renders what
 * the server says and forwards what the user decides.
 *
 * THE SERVER OWNS THE SENTENCES
 * -----------------------------
 * Every refusal from the service carries a stable machine `code` AND a human
 * sentence that names the next step — "Withdraw them (Payouts → Request
 * payout) before deleting your account", and so on for LAST_ADMIN,
 * PAYOUT_IN_FLIGHT, UNSETTLED_EARNINGS, BOOKING_IN_FLIGHT,
 * ASSIGNED_BOOKING_IN_FLIGHT, ORDER_IN_FLIGHT, STORE_ORDER_UNFULFILLED and
 * SESSION_SCHEDULED. This screen renders `message` verbatim and never
 * substitutes copy of its own, because the server's sentence is the one that
 * knows the count, the rupee amount and the screen to go fix it on. A
 * client-side lookup table of pretty strings would drift the first time a guard
 * changed, and the drifted version is the one the devotee would act on.
 *
 * `/deletion-eligibility` is called ON MOUNT, before the destructive control is
 * ever shown, so a devotee with three unfinished bookings reads that fact
 * first instead of discovering it after typing a confirmation code.
 *
 * TWO STEPS, DELIBERATELY
 * -----------------------
 * `POST /deletion-request` mints a single-use 6-digit code and delivers it to
 * the phone or mailbox on the account; `POST /delete/confirm` requires it back.
 * That is the only identity check this codebase can perform — `User` has no
 * password column, every credential is an OTP or a magic link — so re-proving
 * control of the rail is the second factor. It is not collapsed into one tap
 * here for the same reason it is not collapsed in the service: on an OTP-only
 * product, a one-tap irreversible wipe hands anyone holding a borrowed phone a
 * destroy button over a devotee's booking history and wallet.
 *
 * THE SPINNER THAT NEVER STOPS
 * ----------------------------
 * `lib/api.ts`'s `apiPost` is a bare `fetch` with no AbortController, and a
 * bare fetch never settles on a half-open socket — captive portal, flaky
 * mobile data, a cold Render dyno. That is the live P0 in TASKS.md: the line
 * after the `await` never runs, so the spinner turns forever and no error is
 * ever shown. `(auth)/forgot-password.tsx` enforces its own 20s budget for the
 * same reason. This screen does not use `apiPost` at all — it builds its own
 * authenticated fetch (the established pattern in checkout.tsx,
 * gurukul-portal.tsx, lesson.tsx) and so can abort properly. Every call below
 * goes through `request()`, which arms an AbortController AND races a timer, so
 * a stalled socket produces an error a devotee can read and retry. A
 * destructive flow that hangs silently is worse than one that fails loudly.
 */

// 20s matches (auth)/forgot-password.tsx and the web client's
// `fetchWithTimeout` budget in apps/web/lib/api-config.ts. One product, one
// patience threshold.
const REQUEST_TIMEOUT_MS = 20_000;

const ACCOUNT_API = '/api/v1/account';

// ─── Server shapes ───────────────────────────────────────────────────────────
//
// Mirrors of `DeletionBlocker`, `DeletionEligibility` and `DeletionStatusView`
// in apps/api/src/services/account-deletion.service.ts. Written against the
// route handlers rather than assumed: every account route answers
// `{ data: … }`, and every refusal answers
// `{ error, code, message, …details }`.

interface DeletionBlocker {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface Eligibility {
  deletable: boolean;
  blockers: DeletionBlocker[];
  warnings: DeletionBlocker[];
  gracePeriodDays: number;
}

type DeletionStatus =
  | 'none'
  | 'pending_confirmation'
  | 'scheduled'
  | 'purged'
  | 'cancelled'
  | 'expired';

interface StatusView {
  status: DeletionStatus;
  requestId: string | null;
  requestedAt: string | null;
  confirmedAt: string | null;
  purgeAfter: string | null;
  purgedAt: string | null;
  daysRemaining: number | null;
  gracePeriodDays: number;
}

interface RequestResult {
  requestId: string;
  channel: string;
  expiresInSec: number;
  gracePeriodDays: number;
  warnings: DeletionBlocker[];
  devCode?: string;
}

interface ConfirmResult {
  status: 'scheduled' | 'purged';
  requestId: string;
  purgeAfter: string | null;
  gracePeriodDays: number;
  message: string;
  warnings?: string[];
}

interface CancelResult {
  cancelled: boolean;
  message: string;
}

/** The one warning the service raises, and the only one that gates a button. */
const WALLET_FORFEIT = 'WALLET_BALANCE_FORFEIT';

// ─── Transport ───────────────────────────────────────────────────────────────

type Failure = {
  ok: false;
  status: number;
  /** The service's machine code, or a synthetic one for transport failures. */
  code: string;
  /** The service's own sentence. Rendered verbatim wherever it exists. */
  message: string;
  /** Present on a 409: every guard that currently fails, not just the first. */
  blockers: DeletionBlocker[];
};

type ApiResult<T> = { ok: true; data: T } | Failure;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v : null;
}

/**
 * Reads the `blockers` array the service attaches to a 409. The rule from
 * lib/api-contracts.ts holds here: an unrecognised shape yields an EMPTY list,
 * never an invented one — a fabricated reason on an irreversible screen is
 * worse than no reason.
 */
function readBlockers(payload: unknown): DeletionBlocker[] {
  if (!isRecord(payload) || !Array.isArray(payload.blockers)) return [];
  const out: DeletionBlocker[] = [];
  for (const raw of payload.blockers) {
    if (!isRecord(raw)) continue;
    const code = str(raw.code);
    const message = str(raw.message);
    if (code && message) {
      out.push({
        code,
        message,
        details: isRecord(raw.details) ? raw.details : undefined,
      });
    }
  }
  return out;
}

function readWarnings(payload: unknown): DeletionBlocker[] {
  if (!isRecord(payload) || !Array.isArray(payload.warnings)) return [];
  const out: DeletionBlocker[] = [];
  for (const raw of payload.warnings) {
    if (!isRecord(raw)) continue;
    const code = str(raw.code);
    const message = str(raw.message);
    if (code && message) {
      out.push({
        code,
        message,
        details: isRecord(raw.details) ? raw.details : undefined,
      });
    }
  }
  return out;
}

/**
 * Settle `p` within `ms` no matter what the socket does. The AbortController in
 * `request()` is the real fix; this race is the belt to that pair of braces,
 * because `fetch`'s abort is not guaranteed to reject on every RN platform
 * version and this screen must never leave a spinner turning.
 */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('DARSHYA_TIMEOUT')), ms);
  });
  return Promise.race([p, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}

const NETWORK_MESSAGE =
  'Could not reach Darshya. Check your connection and try again — nothing was changed.';

function transportFailure(): Failure {
  return { ok: false, status: 0, code: 'NETWORK', message: NETWORK_MESSAGE, blockers: [] };
}

function fallbackMessage(status: number): string {
  if (status === 401 || status === 403) {
    return 'Your session has expired. Sign in again to delete your account.';
  }
  if (status === 429) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  return `Something went wrong (HTTP ${status}). Nothing was changed — please try again.`;
}

async function request<T>(
  token: string,
  path: string,
  init?: { method: 'POST'; body: unknown },
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (init) headers['Content-Type'] = 'application/json';

    const res = await withTimeout(
      fetch(`${apiBase()}${ACCOUNT_API}${path}`, {
        method: init ? init.method : 'GET',
        headers,
        ...(init ? { body: JSON.stringify(init.body) } : {}),
        signal: controller.signal,
      }),
      REQUEST_TIMEOUT_MS + 1_000,
    );

    // A body that never finishes streaming hangs exactly like a socket that
    // never opens, so the read gets the same budget.
    const payload = (await withTimeout(
      res.json().catch(() => null),
      REQUEST_TIMEOUT_MS,
    )) as unknown;

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        code: (isRecord(payload) && str(payload.code)) || `HTTP_${res.status}`,
        message:
          (isRecord(payload) && str(payload.message)) ||
          (isRecord(payload) && str(payload.error)) ||
          fallbackMessage(res.status),
        blockers: readBlockers(payload),
      };
    }

    const data = isRecord(payload) && 'data' in payload ? payload.data : payload;
    return { ok: true, data: data as T };
  } catch {
    // Timeout, abort, DNS failure, TLS failure — indistinguishable to the
    // devotee and identical in consequence: nothing happened.
    return transportFailure();
  } finally {
    clearTimeout(abortTimer);
  }
}

// ─── Formatting ──────────────────────────────────────────────────────────────

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Written out by hand rather than through `toLocaleDateString`, so an iPhone
 * and an Android phone show a devotee the SAME deletion date. Intl's presence
 * and its default locale differ across Hermes builds; a deadline is not a
 * string to let the runtime improvise on.
 */
function formatDate(iso: string | null): string {
  if (!iso) return 'the scheduled date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'the scheduled date';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

// ─── Small presentational pieces ─────────────────────────────────────────────

function Banner({
  tone,
  icon,
  children,
}: {
  tone: 'danger' | 'warn' | 'info';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
}) {
  const palette =
    tone === 'danger'
      ? { bg: '#FEF2F2', border: '#FECACA', fg: colors.red[600] }
      : tone === 'warn'
        ? { bg: colors.amber[50], border: colors.amber[200], fg: colors.amber[700] }
        : { bg: colors.stone[100], border: colors.stone[200], fg: colors.stone[600] };
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border }]}>
      <Ionicons name={icon} size={18} color={palette.fg} style={styles.bannerIcon} />
      <View style={styles.bannerBody}>{children}</View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  busy,
  disabled,
  tone = 'danger',
  hint,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: 'danger' | 'neutral';
  hint?: string;
}) {
  const inactive = Boolean(busy || disabled);
  return (
    <TouchableOpacity
      style={[
        styles.primaryBtn,
        tone === 'danger' ? styles.primaryBtnDanger : styles.primaryBtnNeutral,
        inactive && styles.primaryBtnDisabled,
      ]}
      onPress={onPress}
      disabled={inactive}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled: inactive, busy: Boolean(busy) }}
    >
      {busy ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function SecondaryButton({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.secondaryBtn, busy && styles.primaryBtnDisabled]}
      onPress={onPress}
      disabled={busy}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(busy), busy: Boolean(busy) }}
    >
      {busy ? (
        <ActivityIndicator color={colors.stone[700]} />
      ) : (
        <Text style={styles.secondaryBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

/**
 * What survives a deletion and what does not, stated before the user commits.
 *
 * This is not boilerplate. `account-deletion.service.ts` never deletes the
 * `users` row — it anonymises it in place, because `puja_bookings.user_id` and
 * `payments.user_id` are RESTRICT relations that a real DELETE cannot get past,
 * and twenty others are CASCADE relations that a real DELETE would use to
 * destroy donation receipts and paid enrollments outright. Indian income-tax
 * and accounting rules require those records be kept for years. Telling the
 * devotee so is both what they are owed and what makes the retention
 * defensible: consented, disclosed, and narrower than the data being destroyed.
 */
function WhatHappensCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>What is deleted</Text>
      <Text style={styles.cardBody}>
        Your name, email address, phone number, birth and astrology details, saved addresses,
        the messages you wrote, your support tickets, your device notification tokens and your
        sign-in identity are erased. Nothing about you remains searchable or contactable.
      </Text>

      <View style={styles.cardRule} />

      <Text style={styles.cardTitle}>What is kept, anonymised</Text>
      <Text style={styles.cardBody}>
        Bookings, payments and donation receipts are kept as financial records because Indian
        tax law requires it — but the identity is severed. Amounts, dates and reference numbers
        stay; your name, contact details and address are stripped off them. The remaining rows
        point to nobody.
      </Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

type Step = 'review' | 'code' | 'done';

export default function DeleteAccountScreen() {
  const { session, signOut } = useAuth();
  const token = session?.accessToken ?? null;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [status, setStatus] = useState<StatusView | null>(null);

  const [step, setStep] = useState<Step>('review');
  const [reason, setReason] = useState('');
  const [acknowledgeForfeit, setAcknowledgeForfeit] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [channel, setChannel] = useState<string>('');
  const [code, setCode] = useState('');

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<ConfirmResult | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);

    const [eligRes, statusRes] = await Promise.all([
      request<Eligibility>(token, '/deletion-eligibility'),
      request<StatusView>(token, '/deletion-status'),
    ]);

    if (!eligRes.ok) {
      setLoadError(eligRes.message);
      setLoading(false);
      return;
    }
    setEligibility({
      deletable: Boolean(eligRes.data.deletable),
      blockers: Array.isArray(eligRes.data.blockers) ? eligRes.data.blockers : [],
      warnings: Array.isArray(eligRes.data.warnings) ? eligRes.data.warnings : [],
      gracePeriodDays: Number(eligRes.data.gracePeriodDays) || 30,
    });

    // A failed status read is not fatal: eligibility alone is enough to render
    // the review step honestly, and `status` only ever ADDS a scheduled/purged
    // panel. Failing the whole screen on it would hide a working flow.
    if (statusRes.ok) setStatus(statusRes.data);

    setLoading(false);
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Step 1: ask for a code ────────────────────────────────────────────────

  const forfeitWarning =
    eligibility?.warnings.find((w) => w.code === WALLET_FORFEIT) ?? null;
  const otherWarnings =
    eligibility?.warnings.filter((w) => w.code !== WALLET_FORFEIT) ?? [];
  const blockers = eligibility?.blockers ?? [];
  const graceDays = eligibility?.gracePeriodDays ?? status?.gracePeriodDays ?? 30;

  async function requestCode() {
    if (!token) return;
    setBusy(true);
    setActionError(null);

    const body: { reason?: string; acknowledgeForfeit?: boolean } = {};
    const trimmedReason = reason.trim();
    if (trimmedReason) body.reason = trimmedReason.slice(0, 1000);
    if (acknowledgeForfeit) body.acknowledgeForfeit = true;

    const res = await request<RequestResult>(token, '/deletion-request', {
      method: 'POST',
      body,
    });
    setBusy(false);

    if (res.ok) {
      setRequestId(res.data.requestId);
      setChannel(res.data.channel ?? '');
      setCode('');
      setStep('code');
      return;
    }

    // A 409 means a guard fired between mount and tap — a booking landed, a
    // payout entered processing. Fold the server's own list back into the
    // eligibility state so the review step redraws with the real reason
    // instead of an error toast that says nothing actionable.
    if (res.status === 409) {
      if (res.code === WALLET_FORFEIT) {
        // The balance appeared (or the tick was lost). Show the amount, force
        // the acknowledgement, do not proceed.
        setEligibility((prev) =>
          prev
            ? {
                ...prev,
                warnings: prev.warnings.some((w) => w.code === WALLET_FORFEIT)
                  ? prev.warnings
                  : [...prev.warnings, { code: WALLET_FORFEIT, message: res.message }],
              }
            : prev,
        );
        setAcknowledgeForfeit(false);
        setActionError(res.message);
        return;
      }
      const fresh = res.blockers.length > 0 ? res.blockers : [{ code: res.code, message: res.message }];
      setEligibility((prev) =>
        prev ? { ...prev, deletable: false, blockers: fresh } : prev,
      );
      return;
    }

    setActionError(res.message);
  }

  // ── Step 2: confirm with the code ─────────────────────────────────────────

  async function confirmDeletion() {
    if (!token || !requestId) return;
    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setActionError('Enter the 6-digit code we sent you.');
      return;
    }

    setBusy(true);
    setActionError(null);

    // `immediate` is deliberately not sent and not offered. The 30-day window
    // is the whole safety net on an OTP-only product, and a screen that offers
    // "delete right now" next to it is a screen that talks people out of the
    // safe option.
    const res = await request<ConfirmResult>(token, '/delete/confirm', {
      method: 'POST',
      body: { requestId, code: trimmed },
    });
    setBusy(false);

    if (res.ok) {
      setCompletion(res.data);
      setStep('done');
      return;
    }

    if (res.status === 409) {
      // The guards are re-run at confirm time; something changed. Send the
      // devotee back to the review step where the reason is rendered in full.
      const fresh = res.blockers.length > 0 ? res.blockers : [{ code: res.code, message: res.message }];
      setEligibility((prev) => (prev ? { ...prev, deletable: false, blockers: fresh } : prev));
      setStep('review');
      setRequestId(null);
      setCode('');
      return;
    }

    // CODE_INCORRECT, CODE_EXPIRED, TOO_MANY_ATTEMPTS, REQUEST_NOT_PENDING,
    // REQUEST_NOT_FOUND — all carry a sentence that names the next step, so
    // they are shown against the code field rather than replaced.
    setActionError(res.message);
    if (res.code === 'CODE_EXPIRED' || res.code === 'TOO_MANY_ATTEMPTS' || res.code === 'REQUEST_NOT_FOUND' || res.code === 'REQUEST_NOT_PENDING') {
      setRequestId(null);
      setCode('');
      setStep('review');
    }
  }

  // ── Cancel a scheduled deletion ───────────────────────────────────────────

  async function cancelDeletion() {
    if (!token) return;
    setBusy(true);
    setActionError(null);
    const res = await request<CancelResult>(token, '/deletion-request/cancel', {
      method: 'POST',
      body: {},
    });
    setBusy(false);

    if (!res.ok) {
      setActionError(res.message);
      return;
    }
    setRequestId(null);
    setCode('');
    setStep('review');
    await load();
  }

  /**
   * The deletion is recorded; the session is not this screen's to keep.
   *
   * Sign-out runs on the devotee's tap rather than automatically on success,
   * and that ordering is forced: `RoleGuard` in `(devotee)/_layout.tsx`
   * redirects to `/(auth)/login` the instant `isAuthenticated` flips, which
   * would tear this screen down mid-render and take the server's confirmation
   * message with it. So the outcome is shown first, acknowledged, and only then
   * is the session dropped.
   */
  async function finishAndSignOut() {
    setBusy(true);
    await signOut();
    router.replace('/(auth)/login' as never);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  function renderBody() {
    if (!token) {
      return (
        <View style={styles.stateBox}>
          <Ionicons name="lock-closed-outline" size={40} color={colors.stone[300]} />
          <Text style={styles.stateTitle}>Sign in first</Text>
          <Text style={styles.stateBody}>
            Deleting an account needs a signed-in session, so we know whose account to delete.
          </Text>
          <PrimaryButton
            label="Sign in"
            tone="neutral"
            onPress={() => router.replace('/(auth)/login' as never)}
          />
        </View>
      );
    }

    if (loading) {
      return (
        <View style={styles.stateBox}>
          <ActivityIndicator size="large" color={colors.saffron[600]} />
          <Text style={styles.stateBody}>Checking your account…</Text>
        </View>
      );
    }

    if (loadError) {
      return (
        <View style={styles.stateBox}>
          <Ionicons name="cloud-offline-outline" size={40} color={colors.stone[300]} />
          <Text style={styles.stateTitle}>Could not load your account</Text>
          <Text style={styles.stateBody}>{loadError}</Text>
          <PrimaryButton label="Try again" tone="neutral" onPress={() => void load()} />
        </View>
      );
    }

    // Already gone. Nothing left to offer but the door.
    if (status?.status === 'purged') {
      return (
        <View style={styles.stateBox}>
          <Ionicons name="checkmark-circle-outline" size={40} color={colors.stone[400]} />
          <Text style={styles.stateTitle}>This account has been deleted</Text>
          <Text style={styles.stateBody}>
            Your personal data was erased on {formatDate(status.purgedAt)}. Financial records
            remain in anonymised form as Indian tax law requires. There is nothing left to
            cancel.
          </Text>
          <PrimaryButton label="Sign out" tone="neutral" onPress={() => void finishAndSignOut()} busy={busy} />
        </View>
      );
    }

    // A deletion is already scheduled: the countdown is the screen, and Cancel
    // is the primary action. This is the whole reason the grace period exists.
    if (status?.status === 'scheduled' && step !== 'done') {
      const days = status.daysRemaining;
      return (
        <>
          <View style={styles.countdownCard}>
            <Text style={styles.countdownNumber}>{days ?? '—'}</Text>
            <Text style={styles.countdownUnit}>
              {days === null ? 'days remaining' : `${plural(days, 'day', 'days')} remaining`}
            </Text>
            <Text style={styles.countdownDate}>
              Your account is scheduled for deletion on {formatDate(status.purgeAfter)}.
            </Text>
          </View>

          <Banner tone="info" icon="information-circle-outline">
            <Text style={styles.bannerText}>
              You can still change your mind. Cancelling restores everything — nothing has been
              removed yet. After {formatDate(status.purgeAfter)} it cannot be undone.
            </Text>
          </Banner>

          {actionError ? (
            <Banner tone="danger" icon="alert-circle-outline">
              <Text style={styles.bannerText}>{actionError}</Text>
            </Banner>
          ) : null}

          <PrimaryButton
            label="Keep my account"
            tone="neutral"
            onPress={() => void cancelDeletion()}
            busy={busy}
            hint="Cancels the scheduled deletion and restores your account"
          />

          <WhatHappensCard />
        </>
      );
    }

    // Deletion done in this session — show the server's own sentence, then out.
    if (step === 'done' && completion) {
      return (
        <View style={styles.stateBox}>
          <Ionicons name="time-outline" size={40} color={colors.amber[600]} />
          <Text style={styles.stateTitle}>
            {completion.status === 'purged' ? 'Your account has been deleted' : 'Deletion scheduled'}
          </Text>
          <Text style={styles.stateBody}>{completion.message}</Text>
          {completion.status === 'scheduled' ? (
            <Text style={styles.stateBody}>
              Sign in again any time before {formatDate(completion.purgeAfter)} and open Settings
              → Delete account to cancel.
            </Text>
          ) : null}
          <PrimaryButton
            label="Sign out"
            tone="neutral"
            onPress={() => void finishAndSignOut()}
            busy={busy}
            hint="Signs you out and returns to the sign-in screen"
          />
        </View>
      );
    }

    // Step 2 — the code.
    if (step === 'code') {
      return (
        <>
          <Banner tone="warn" icon="key-outline">
            <Text style={styles.bannerTitle}>Enter your confirmation code</Text>
            <Text style={styles.bannerText}>
              {channel === 'whatsapp'
                ? 'We sent a 6-digit code to your registered phone number on WhatsApp.'
                : channel === 'email'
                  ? 'We sent a 6-digit code to your registered email address.'
                  : 'We sent you a 6-digit code. It can only be used once.'}
            </Text>
          </Banner>

          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(t) => {
              setCode(t.replace(/\D/g, '').slice(0, 6));
              if (actionError) setActionError(null);
            }}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="000000"
            placeholderTextColor={colors.stone[300]}
            textContentType="oneTimeCode"
            autoFocus
            accessibilityLabel="Six digit confirmation code"
            accessibilityHint="Enter the code sent to your registered phone or email"
          />

          {actionError ? (
            <Banner tone="danger" icon="alert-circle-outline">
              <Text style={styles.bannerText}>{actionError}</Text>
            </Banner>
          ) : null}

          <Text style={styles.finalWarning}>
            Confirming schedules your account for deletion in {graceDays}{' '}
            {plural(graceDays, 'day', 'days')}. You can cancel at any point during those{' '}
            {graceDays} {plural(graceDays, 'day', 'days')}.
          </Text>

          <PrimaryButton
            label="Delete my account"
            onPress={() => void confirmDeletion()}
            busy={busy}
            disabled={code.length !== 6}
            hint={`Schedules your account for deletion in ${graceDays} days`}
          />
          <SecondaryButton
            label="Go back"
            onPress={() => {
              setStep('review');
              setActionError(null);
              setCode('');
            }}
          />
        </>
      );
    }

    // Step 1 — review. Blockers first: a devotee who cannot delete today should
    // read why before scrolling past a destructive button.
    return (
      <>
        {blockers.length > 0 ? (
          <>
            <Banner tone="warn" icon="hand-left-outline">
              <Text style={styles.bannerTitle}>
                {blockers.length === 1
                  ? 'One thing has to be settled first'
                  : `${blockers.length} things have to be settled first`}
              </Text>
              <Text style={styles.bannerText}>
                Your account cannot be deleted while these are open. Each one names what to do.
              </Text>
            </Banner>

            {/* The server's sentence, verbatim. See the module note. */}
            {blockers.map((b) => (
              <View key={b.code} style={styles.blockerRow}>
                <Ionicons name="ellipse" size={8} color={colors.red[600]} style={styles.blockerDot} />
                <Text style={styles.blockerText}>{b.message}</Text>
              </View>
            ))}

            <SecondaryButton label="Check again" onPress={() => void load()} busy={busy} />
            <WhatHappensCard />
          </>
        ) : (
          <>
            <Banner tone="danger" icon="warning-outline">
              <Text style={styles.bannerTitle}>Deleting your account is permanent</Text>
              <Text style={styles.bannerText}>
                After a {graceDays}-day grace period your personal data is erased and cannot be
                recovered. You can cancel at any time during those {graceDays} days.
              </Text>
            </Banner>

            <WhatHappensCard />

            {otherWarnings.map((w) => (
              <Banner key={w.code} tone="warn" icon="information-circle-outline">
                <Text style={styles.bannerText}>{w.message}</Text>
              </Banner>
            ))}

            {/*
              WALLET CREDIT is a warning, not a blocker — credit can only be
              spent, never withdrawn, so blocking on it would make some accounts
              permanently undeletable, which is the store violation this whole
              feature exists to fix. The service refuses without
              `acknowledgeForfeit` whenever the balance is non-zero, so the
              amount is shown and ticked here before the button unlocks. Nobody
              loses money they were never told about.
            */}
            {forfeitWarning ? (
              <TouchableOpacity
                style={[styles.ackRow, acknowledgeForfeit && styles.ackRowChecked]}
                onPress={() => setAcknowledgeForfeit((v) => !v)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acknowledgeForfeit }}
                accessibilityLabel="I understand my wallet balance will be forfeited"
                accessibilityHint={forfeitWarning.message}
              >
                <View style={[styles.checkbox, acknowledgeForfeit && styles.checkboxChecked]}>
                  {acknowledgeForfeit ? (
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                  ) : null}
                </View>
                <View style={styles.ackBody}>
                  <Text style={styles.ackTitle}>{forfeitWarning.message}</Text>
                  <Text style={styles.ackHint}>
                    Tap to confirm you understand this balance will be lost.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.label}>Why are you leaving? (optional)</Text>
            <TextInput
              style={styles.reasonInput}
              value={reason}
              onChangeText={setReason}
              placeholder="This helps us improve Darshya. It never changes the outcome."
              placeholderTextColor={colors.stone[300]}
              multiline
              maxLength={1000}
              accessibilityLabel="Reason for leaving, optional"
            />

            {actionError ? (
              <Banner tone="danger" icon="alert-circle-outline">
                <Text style={styles.bannerText}>{actionError}</Text>
              </Banner>
            ) : null}

            <Text style={styles.finalWarning}>
              The next step sends a 6-digit code to your registered phone or email. Nothing is
              deleted until you enter it.
            </Text>

            <PrimaryButton
              label="Continue to delete my account"
              onPress={() => void requestCode()}
              busy={busy}
              disabled={Boolean(forfeitWarning) && !acknowledgeForfeit}
              hint="Sends a confirmation code. Nothing is deleted yet."
            />
            <SecondaryButton label="Keep my account" onPress={() => router.back()} />
          </>
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.stone[800]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Delete account</Text>
          <Text style={styles.subtitle}>Permanent, after a {graceDays}-day grace period</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderBody()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.stone[50] },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.stone[100],
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.stone[900] },
  subtitle: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  content: { padding: spacing.md, paddingBottom: spacing['2xl'], gap: spacing.sm },

  // States
  stateBox: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  stateTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.stone[900],
    textAlign: 'center',
  },
  stateBody: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    textAlign: 'center',
    lineHeight: 21,
  },

  // Banners
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  bannerIcon: { marginTop: 1 },
  bannerBody: { flex: 1, gap: 4 },
  bannerTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  bannerText: { fontSize: fontSize.base, color: colors.stone[700], lineHeight: 20 },

  // Blockers
  blockerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone[100],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  blockerDot: { marginTop: 7 },
  blockerText: { flex: 1, fontSize: fontSize.base, color: colors.stone[800], lineHeight: 20 },

  // What happens
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  cardBody: { fontSize: fontSize.sm, color: colors.stone[600], lineHeight: 19 },
  cardRule: { height: 1, backgroundColor: colors.stone[100], marginVertical: spacing.sm },

  // Wallet forfeit acknowledgement
  ackRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minHeight: 44,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.amber[200],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  ackRowChecked: { borderColor: colors.amber[500], backgroundColor: colors.amber[50] },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.stone[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.amber[600], borderColor: colors.amber[600] },
  ackBody: { flex: 1, gap: 2 },
  ackTitle: { fontSize: fontSize.base, color: colors.stone[900], lineHeight: 20, fontWeight: '600' },
  ackHint: { fontSize: fontSize.sm, color: colors.stone[500] },

  // Inputs
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.stone[600],
    marginTop: spacing.sm,
  },
  reasonInput: {
    minHeight: 88,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.base,
    color: colors.stone[900],
    textAlignVertical: 'top',
  },
  codeInput: {
    height: 60,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.stone[200],
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    letterSpacing: 10,
    textAlign: 'center',
    color: colors.stone[900],
  },

  finalWarning: {
    fontSize: fontSize.sm,
    color: colors.stone[500],
    lineHeight: 18,
    marginTop: spacing.xs,
  },

  // Buttons
  primaryBtn: {
    minHeight: 52,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  primaryBtnDanger: { backgroundColor: colors.red[600] },
  primaryBtnNeutral: { backgroundColor: colors.stone[800] },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: colors.white, fontSize: fontSize.lg, fontWeight: '700' },
  secondaryBtn: {
    minHeight: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.stone[200],
    backgroundColor: colors.white,
  },
  secondaryBtnText: { color: colors.stone[700], fontSize: fontSize.lg, fontWeight: '600' },

  // Countdown
  countdownCard: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.amber[200],
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  countdownNumber: {
    fontSize: fontSize['4xl'],
    fontWeight: '800',
    color: colors.amber[700],
    lineHeight: 40,
  },
  countdownUnit: { fontSize: fontSize.base, fontWeight: '600', color: colors.amber[700] },
  countdownDate: {
    fontSize: fontSize.sm,
    color: colors.stone[600],
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.xs,
  },
});
