import { emailConfig, getEmailQuotaSnapshot } from './email.js';
import { whatsapp } from './whatsapp.js';
import { webPushConfig } from './web-push.js';
import { fcmConfig, expoPushConfig } from './fcm.js';
import { captureException } from './sentry.js';

/**
 * NOTIF-03 — the single authoritative answer to "can this product reach anybody?".
 *
 * Every outbound transport in this API is env-or-noop: no credential, no send,
 * `{ok:false, skipped:true}`, and historically no caller looked. Measured against
 * the running API, all four transports were dark and nothing in the product said
 * so — the magic-link route buried the skip in an `info` string, the FCM probe
 * answered `{ok:true,skipped:true}`, and the web-push probe answered
 * `{ok:true,sent:0}` with a real subscription row present.
 *
 * ── Why this module exists rather than a second env read ────────────────────
 *
 * The obvious implementation of a status surface is `!!process.env.RESEND_API_KEY`.
 * That is the bug, one level up: the status page and the sender would then be two
 * independent derivations of the same question, and the first time a transport
 * adds a condition (a parsed private key, a second required var) the status page
 * keeps saying "configured" for a channel that no-ops.
 *
 * So this module reads NOTHING from `process.env`. It reads the exact same
 * module-level flags the send functions themselves branch on:
 *
 *   emailConfig.enabled   ← the `apiKey` that decides `sendEmail`'s `if (!resend)`
 *   whatsapp.enabled      ← the `enabled` that decides `callGraph`'s early return
 *   webPushConfig.enabled ← the `enabled` that decides `sendPush`'s early return
 *   fcmConfig.enabled     ← the `enabled` that decides `sendFcm`'s early return
 *
 * One flag, two readers. `notification-channels.contract.notif03.test.ts` pins
 * the tie by asserting that whenever this module reports a channel unconfigured,
 * that channel's own sender returns `skipped:true`.
 *
 * ── Why the payload is booleans, numbers and fixed strings only ─────────────
 *
 * A status surface that echoes credential material is a worse defect than the
 * one it fixes. Nothing here is derived from a credential's VALUE: not a prefix,
 * not a mask, not a length, not a hash. `requires` lists env var NAMES from the
 * frozen constant below — never from introspecting the environment. Every other
 * field is a boolean, a small integer, or one of a closed set of literals.
 *
 * ── What this can and cannot prove ─────────────────────────────────────────
 *
 * For three of four channels the honest claim is only "credentials are present,
 * so sends are attempted rather than discarded". Nothing in the codebase records
 * whether WhatsApp/web-push/FCM deliveries then succeed, so `evidence` says
 * `config-only` and the state never claims more than `configured`.
 *
 * Email is the exception: lib/email.ts keeps per-day counters (SCAL-11), so a
 * configured channel that the provider is currently refusing on quota is
 * reported as `degraded` — configured, and still not delivering.
 */

export type ChannelName = 'email' | 'whatsapp' | 'webPush' | 'fcm';

/**
 * - `not_configured` — credentials absent. Every send is a silent no-op.
 * - `configured`     — credentials present. Sends are attempted.
 * - `degraded`       — credentials present AND a runtime counter proves the
 *                      channel is not currently delivering. Only reachable for
 *                      channels whose `evidence` is `runtime-counters`.
 */
export type ChannelState = 'not_configured' | 'configured' | 'degraded';

/**
 * How much this report actually knows.
 * - `config-only`      — presence of credentials, and nothing about delivery.
 * - `runtime-counters` — the transport records attempts/failures in-process.
 */
export type ChannelEvidence = 'config-only' | 'runtime-counters';

/**
 * Env var NAMES each channel needs. Names, never values — this constant is the
 * only source of the `requires` field, so no code path can put a credential
 * value into the response by accident.
 */
export const CHANNEL_ENV_REQUIREMENTS: Readonly<Record<ChannelName, readonly string[]>> =
  Object.freeze({
    email: Object.freeze(['RESEND_API_KEY']),
    whatsapp: Object.freeze(['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN']),
    webPush: Object.freeze(['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY']),
    fcm: Object.freeze(['FCM_PROJECT_ID', 'FCM_CLIENT_EMAIL', 'FCM_PRIVATE_KEY']),
  }) as Readonly<Record<ChannelName, readonly string[]>>;

export const CHANNEL_NAMES: readonly ChannelName[] = Object.freeze([
  'email',
  'whatsapp',
  'webPush',
  'fcm',
] as const);

export type EmailCounters = ReturnType<typeof getEmailQuotaSnapshot>;

/**
 * Why a configured channel is not delivering, ordered by severity.
 *
 * - `total_failure`    — a meaningful sample was attempted and NOTHING landed.
 * - `systemic_failure` — most sends are failing, but some are landing.
 * - `quota_refusal`    — the provider refused at least one send on quota.
 */
export type DegradedReason = 'total_failure' | 'systemic_failure' | 'quota_refusal';

export interface ChannelReport {
  state: ChannelState;
  /** True when sends are attempted rather than discarded. */
  configured: boolean;
  /** Env var names, never values. */
  requires: readonly string[];
  evidence: ChannelEvidence;
  /** Numbers only. Present when `evidence` is `runtime-counters`. */
  counters?: EmailCounters;
  /**
   * Present only when `state` is `degraded`. Severity, so a pager rule can
   * separate "page now, nothing is being delivered" from "raise a ticket".
   */
  reason?: DegradedReason;
  /** failed/attempted for the current UTC day, 0 when nothing was attempted. */
  failureRate?: number;
  /** Operator-facing text. Interpolates counters only — never anything from the env. */
  note?: string;
}

export interface ChannelStatus {
  /** True only when EVERY outbound channel can actually deliver. */
  ok: boolean;
  /** Flat map kept for existing consumers and uptime checks. */
  channels: Record<ChannelName, boolean>;
  /** The channels that would silently no-op right now. */
  unconfigured: ChannelName[];
  /** Configured, and provably not delivering. Only email can populate this. */
  degraded: ChannelName[];
  detail: Record<ChannelName, ChannelReport>;
  /** SCAL-11: today's Resend counters, so the 100/day cap is visible early. */
  email: EmailCounters & { enabled: boolean };
  /**
   * Push rail 1. Expo needs no server credential, so `enabled` says "this
   * service can call Expo", not "push is provisioned" — the FCM/APNs keys that
   * decide that live in the EAS project and are not observable from here.
   * Deliberately NOT counted in `ok`.
   */
  expoPush: { enabled: boolean; enhancedSecurity: boolean };
  checkedAt: string;
}

const CONFIG_ONLY_NOTE =
  'Credential presence only — nothing in this service records whether sends on this channel are delivered.';

/**
 * ── Why a RATE over a minimum sample, and why these two numbers ─────────────
 *
 * The first version of this rule escalated only on `rateLimited > 0` and left
 * `failed` alone, reasoning that one bad recipient address is not a channel
 * fault. That reasoning is correct and is preserved below — but it was applied
 * as an absolute, and an absolute is what broke it.
 *
 * Measured on the live API on 2026-09-03, with email CONFIGURED:
 *   attempted 48, sent 0, failed 48, rateLimited 0
 * Every transactional email in production failed that day, and this function
 * reported the channel healthy, because none of the failures was a quota
 * refusal. That is the defect this module exists to prevent, reproduced inside
 * the monitor itself: a green light over a total outage.
 *
 * So the trigger is failed/attempted over a floor, not a raw count.
 *
 * MIN_ATTEMPTS = 5. It has to be small relative to the 100/day Resend cap
 * (lib/email.ts) because the counters reset at UTC midnight — a floor of 30
 * would let the first third of every day's mail fail unseen, and on a quiet day
 * a 100%-failing channel would never be flagged at all. It also has to be big
 * enough that ONE incidental bad address cannot reach the rate threshold: at
 * n=1 a single bounce is 100%, at n=2 it is 50%, at n=3 it is 33%. Five is the
 * smallest floor that caps a single incidental failure at 20%, comfortably
 * under the threshold, and it is 5% of the daily cap. The cost is stated rather
 * than hidden: a day whose first four sends all fail reads healthy until the
 * fifth is attempted.
 *
 * FAILURE_RATE = 0.5. It must sit above the worst case the floor still admits
 * — two clustered incidental bounces at n=5 is 40% — and far below the regime
 * this rule exists to catch (the production case was 100%). Half is the
 * smallest threshold above that 40% which is also defensible without a traffic
 * model: transactional recipients are addresses the user typed at signup, so
 * bounces run at a few percent, and more mail failing than succeeding is never
 * explained by recipient quality. A single bad address can therefore never trip
 * this at any sample size the floor allows.
 */
export const DEGRADED_MIN_ATTEMPTS = 5;
export const DEGRADED_FAILURE_RATE = 0.5;

export interface DeliveryAssessment {
  degraded: boolean;
  reason?: DegradedReason;
  failureRate: number;
  note?: string;
}

/**
 * Grade a transport's own day counters. Pure, so the thresholds can be pinned
 * directly rather than inferred through a route.
 *
 * `attempted === sent + failed` holds by construction in lib/email.ts: a bulk
 * mail deferred under the SCAL-11 reserve returns BEFORE `attempted` is
 * incremented, so an idle day that only defers digests reads 0/0/0 and can
 * never be mistaken for an outage. `rateLimited` is a SUBSET of `failed`, which
 * is why a pure quota outage still reaches the `sent === 0` branch first — the
 * note then names quota as the cause, so severity and cause are both reported.
 */
export function assessDelivery(counters: EmailCounters): DeliveryAssessment {
  const { attempted, sent, failed, rateLimited } = counters;

  // Guard the divide: an idle channel is not a broken one, and 0/0 must not
  // become NaN and silently compare false against every threshold.
  const failureRate = attempted > 0 ? failed / attempted : 0;
  const rounded = Math.round(failureRate * 1000) / 1000;
  const sampled = attempted >= DEGRADED_MIN_ATTEMPTS;
  const quotaCause =
    rateLimited > 0
      ? ` The provider refused ${rateLimited} of them on quota (SCAL-11), which is the likely cause.`
      : '';

  if (sampled && sent === 0) {
    return {
      degraded: true,
      reason: 'total_failure',
      failureRate: rounded,
      note:
        `Configured, and NOTHING has been delivered today: ${attempted} attempted, 0 sent, ` +
        `${failed} failed.${quotaCause}`,
    };
  }

  if (sampled && failureRate >= DEGRADED_FAILURE_RATE) {
    return {
      degraded: true,
      reason: 'systemic_failure',
      failureRate: rounded,
      note:
        `Configured, but ${failed} of ${attempted} sends failed today ` +
        `(${Math.round(failureRate * 100)}%). Some mail is landing, so the transport works ` +
        `and the fault is partial.${quotaCause}`,
    };
  }

  // Kept from the original rule, which was right and merely insufficient: a
  // quota refusal is proof the channel is not delivering everything it was
  // asked to, at any sample size.
  if (rateLimited > 0) {
    return {
      degraded: true,
      reason: 'quota_refusal',
      failureRate: rounded,
      note: `Configured, but the provider refused ${rateLimited} send(s) today on quota (SCAL-11).`,
    };
  }

  return { degraded: false, failureRate: rounded };
}

/**
 * Readiness of the four outbound transports, derived from the transports' own
 * flags rather than a second read of the environment.
 */
export function getChannelStatus(): ChannelStatus {
  const emailQuota = getEmailQuotaSnapshot();

  const configured: Record<ChannelName, boolean> = {
    email: emailConfig.enabled,
    whatsapp: whatsapp.enabled,
    webPush: webPushConfig.enabled,
    fcm: fcmConfig.enabled,
  };

  // Email is the one channel with runtime evidence, so it is the one channel
  // whose report can distinguish "credentials present" from "actually
  // delivering". See assessDelivery for the thresholds and their derivation.
  const emailDelivery = assessDelivery(emailQuota);
  const emailDegraded = configured.email && emailDelivery.degraded;

  const detail: Record<ChannelName, ChannelReport> = {
    email: {
      state: !configured.email ? 'not_configured' : emailDegraded ? 'degraded' : 'configured',
      configured: configured.email,
      requires: CHANNEL_ENV_REQUIREMENTS.email,
      evidence: 'runtime-counters',
      counters: emailQuota,
      reason: emailDegraded ? emailDelivery.reason : undefined,
      failureRate: emailDelivery.failureRate,
      note: emailDegraded ? emailDelivery.note : undefined,
    },
    whatsapp: {
      state: configured.whatsapp ? 'configured' : 'not_configured',
      configured: configured.whatsapp,
      requires: CHANNEL_ENV_REQUIREMENTS.whatsapp,
      evidence: 'config-only',
      note: CONFIG_ONLY_NOTE,
    },
    webPush: {
      state: configured.webPush ? 'configured' : 'not_configured',
      configured: configured.webPush,
      requires: CHANNEL_ENV_REQUIREMENTS.webPush,
      evidence: 'config-only',
      note: CONFIG_ONLY_NOTE,
    },
    fcm: {
      state: configured.fcm ? 'configured' : 'not_configured',
      configured: configured.fcm,
      requires: CHANNEL_ENV_REQUIREMENTS.fcm,
      evidence: 'config-only',
      note: CONFIG_ONLY_NOTE,
    },
  };

  const unconfigured = CHANNEL_NAMES.filter((c) => !configured[c]);
  const degraded = CHANNEL_NAMES.filter((c) => detail[c].state === 'degraded');

  return {
    ok: unconfigured.length === 0 && degraded.length === 0,
    channels: configured,
    unconfigured,
    degraded,
    detail,
    email: { ...emailQuota, enabled: emailConfig.enabled },
    expoPush: {
      enabled: expoPushConfig.enabled,
      enhancedSecurity: expoPushConfig.enhancedSecurity,
    },
    checkedAt: new Date().toISOString(),
  };
}

/** Minimal logger shape — satisfied by Fastify's `server.log` and by console. */
export interface ChannelBootLogger {
  warn: (msg: string) => void;
  info: (msg: string) => void;
}

/**
 * NOTIF-03, third clause — "in production, fail the boot (or fire a startup
 * alert) if RESEND_API_KEY and VAPID keys are both absent".
 *
 * A startup ALERT rather than a boot failure, deliberately — but NOT for the
 * reason first written here. An earlier draft of this comment justified it with
 * "all four channels are dark in production today", which was measured on a
 * local checkout and is false in production. Measured against the live API on
 * 2026-09-03: email and webPush are CONFIGURED; whatsapp and fcm are dark.
 *
 * The conclusion survives the correction, on the real facts: the channels that
 * are actually unset in production are whatsapp and fcm, and refusing to boot
 * over those would take the entire API — bookings, payments, darshan — offline
 * for two channels the core flow does not depend on. That is strictly worse for
 * a devotee mid-booking than a silent WhatsApp. The operator needs to be told,
 * not locked out.
 *
 * Escalates to Sentry only when email AND web push are both dark, which is the
 * literal condition the finding names — that pair is the floor below which a
 * user cannot even receive a sign-in link. `captureException` no-ops without
 * SENTRY_DSN, so this is free in dev.
 *
 * Logs env var NAMES and channel names. No value, no fragment, no length.
 */
export function reportChannelReadinessAtBoot(log: ChannelBootLogger): ChannelStatus {
  const status = getChannelStatus();

  if (status.unconfigured.length === 0) {
    log.info('[NOTIF-03] All outbound channels configured: email, whatsapp, webPush, fcm.');
    return status;
  }

  const missingVars = status.unconfigured.flatMap((c) => CHANNEL_ENV_REQUIREMENTS[c]);
  log.warn(
    `[NOTIF-03] ${status.unconfigured.length}/${CHANNEL_NAMES.length} outbound channels are UNCONFIGURED ` +
      `(${status.unconfigured.join(', ')}) — every send on them is a silent no-op. ` +
      `Set: ${missingVars.join(', ')}. Full status: GET /health/channels (admin or ops token).`,
  );

  const signInIsDark = !status.channels.email && !status.channels.webPush;
  if (signInIsDark && process.env.NODE_ENV === 'production') {
    captureException(
      new Error(
        '[NOTIF-03] Production booted with email AND web push unconfigured — ' +
          'magic-link sign-in and every notification are silent no-ops.',
      ),
      { unconfigured: status.unconfigured, requires: missingVars },
    );
  }

  return status;
}
