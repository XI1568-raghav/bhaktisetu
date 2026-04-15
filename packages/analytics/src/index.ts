// ──────────────────────────────────────────────
// @bhaktisetu/analytics — PostHog Analytics Wrapper
// ──────────────────────────────────────────────

import posthog from "posthog-js";

// ─── Types ───────────────────────────────────

export interface AnalyticsConfig {
  posthogKey: string;
  posthogHost?: string;
  /** Disable analytics (e.g., in development) */
  disabled?: boolean;
  /** Enable debug logging */
  debug?: boolean;
}

export interface UserTraits {
  displayName?: string;
  email?: string;
  phone?: string;
  tradition?: string;
  preferredLanguage?: string;
  subscriptionTier?: string;
  isNri?: boolean;
  country?: string;
  createdAt?: string;
}

export interface EventProperties {
  [key: string]: string | number | boolean | string[] | undefined;
}

// ─── State ───────────────────────────────────

let isInitialised = false;
let isDisabled = false;

// ─── Initialisation ──────────────────────────

/**
 * Initialise the analytics client. Call once at app startup.
 */
export function initAnalytics(config: AnalyticsConfig): void {
  if (config.disabled) {
    isDisabled = true;
    return;
  }

  if (typeof window === "undefined") {
    // SSR — skip init
    isDisabled = true;
    return;
  }

  if (isInitialised) {
    return;
  }

  posthog.init(config.posthogKey, {
    api_host: config.posthogHost ?? "https://us.i.posthog.com",
    capture_pageview: false, // We handle page views manually for SPA
    capture_pageleave: true,
    persistence: "localStorage+cookie",
    autocapture: true,
    disable_session_recording: false,
    loaded: (ph) => {
      if (config.debug) {
        ph.debug();
      }
    },
  });

  isInitialised = true;
}

// ─── Core Functions ──────────────────────────

/**
 * Identify a user with their traits for analytics personalisation.
 */
export function identifyUser(
  userId: string,
  traits?: UserTraits
): void {
  if (isDisabled || !isInitialised) return;

  posthog.identify(userId, traits);
}

/**
 * Reset identity (call on logout).
 */
export function resetUser(): void {
  if (isDisabled || !isInitialised) return;

  posthog.reset();
}

/**
 * Track a custom event.
 */
export function trackEvent(
  eventName: string,
  properties?: EventProperties
): void {
  if (isDisabled || !isInitialised) return;

  posthog.capture(eventName, properties);
}

/**
 * Track a page view (for SPA navigation).
 */
export function trackPageView(
  pageName?: string,
  properties?: EventProperties
): void {
  if (isDisabled || !isInitialised) return;

  posthog.capture("$pageview", {
    $current_url: typeof window !== "undefined" ? window.location.href : undefined,
    page_name: pageName,
    ...properties,
  });
}

/**
 * Set a super property that will be sent with every subsequent event.
 */
export function setSuperProperties(
  properties: EventProperties
): void {
  if (isDisabled || !isInitialised) return;

  posthog.register(properties);
}

/**
 * Check whether a feature flag is enabled.
 */
export function isFeatureEnabled(flagKey: string): boolean {
  if (isDisabled || !isInitialised) return false;

  return posthog.isFeatureEnabled(flagKey) ?? false;
}

/**
 * Get a feature flag value (for multivariate flags).
 */
export function getFeatureFlag(
  flagKey: string
): string | boolean | undefined {
  if (isDisabled || !isInitialised) return undefined;

  return posthog.getFeatureFlag(flagKey) ?? undefined;
}

/**
 * Add the user to a PostHog group (e.g., temple, family).
 */
export function setGroup(
  groupType: string,
  groupKey: string,
  groupProperties?: EventProperties
): void {
  if (isDisabled || !isInitialised) return;

  posthog.group(groupType, groupKey, groupProperties);
}

// ─── Pre-defined Event Helpers ───────────────

export const AnalyticsEvents = {
  // Booking flow
  bookingStarted: (props: {
    pujaTypeId: string;
    templeId: string;
    isOnline: boolean;
  }) => trackEvent("booking_started", props),

  bookingCompleted: (props: {
    bookingId: string;
    bookingNumber: string;
    amount: number;
    currency: string;
  }) => trackEvent("booking_completed", props),

  bookingCancelled: (props: {
    bookingId: string;
    reason?: string;
  }) => trackEvent("booking_cancelled", props),

  // Payment
  paymentInitiated: (props: {
    bookingId: string;
    amount: number;
    method: string;
  }) => trackEvent("payment_initiated", props),

  paymentSuccess: (props: {
    bookingId: string;
    amount: number;
    method: string;
  }) => trackEvent("payment_success", props),

  paymentFailed: (props: {
    bookingId: string;
    errorCode?: string;
  }) => trackEvent("payment_failed", props),

  // Temple
  templeViewed: (props: {
    templeId: string;
    templeSlug: string;
  }) => trackEvent("temple_viewed", props),

  // Content
  contentViewed: (props: {
    contentId: string;
    contentType: string;
    isPremium: boolean;
  }) => trackEvent("content_viewed", props),

  // Live darshan
  darshanStarted: (props: {
    streamId: string;
    templeId: string;
  }) => trackEvent("darshan_started", props),

  darshanEnded: (props: {
    streamId: string;
    watchDurationSecs: number;
  }) => trackEvent("darshan_ended", props),

  // Search
  searchPerformed: (props: {
    query: string;
    category?: string;
    resultCount: number;
  }) => trackEvent("search_performed", props),

  // Subscription
  subscriptionStarted: (props: {
    tier: string;
    amount: number;
    currency: string;
  }) => trackEvent("subscription_started", props),

  subscriptionCancelled: (props: {
    tier: string;
    reason?: string;
  }) => trackEvent("subscription_cancelled", props),
} as const;
