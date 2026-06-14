/**
 * Helpers for R-Q1-CS-006 — WA blast 21 founder-network contacts asking 5 referrals each.
 *
 * The blast itself is a manual founder-action (warm personal-network outreach is not
 * automatable without burning trust + violating WA Cloud API policy — see
 * docs/cs/R-Q1-CS-006-handoff.md). These helpers exist so that:
 *   - The two canonical message templates stay versioned with code and covered by tests.
 *   - The founder (or a future drip job) can call `renderWarmIntroMessage()` to produce
 *     a paste-ready message with a stable UTM-tagged share link.
 *   - Downstream signup attribution can rely on the `wa-warm-intro` source tag.
 */

export type WarmIntroAudience = "friends-family" | "professional";

export interface WarmIntroContact {
  name: string;
  audience: WarmIntroAudience;
}

export interface RenderWarmIntroOptions {
  /**
   * Base URL of the landing page to share. Defaults to production.
   * Override only in tests or for staging blasts.
   */
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://darshya.online";
const REFERRAL_SOURCE_TAG = "wa-warm-intro";

/**
 * Returns the share URL with the founder's warm-intro UTM tags appended.
 * Signup attribution joins on `utm_source=wa-warm-intro`.
 */
export function buildWarmIntroShareUrl(baseUrl: string = DEFAULT_BASE_URL): string {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", REFERRAL_SOURCE_TAG);
  url.searchParams.set("utm_medium", "whatsapp");
  url.searchParams.set("utm_campaign", "r-q1-cs-006");
  return url.toString();
}

/**
 * Returns the rendered, paste-ready WhatsApp message for one contact.
 *
 * The two templates are intentionally distinct in tone:
 *   - friends-family — warmer, namaste open, asks for a personal forward
 *   - professional   — quicker, founder-mode ask, offers a one-pager follow-up
 *
 * Both end with the same share URL so reply attribution is uniform.
 */
export function renderWarmIntroMessage(
  contact: WarmIntroContact,
  opts: RenderWarmIntroOptions = {},
): string {
  const shareUrl = buildWarmIntroShareUrl(opts.baseUrl);
  const name = contact.name.trim();
  if (!name) {
    throw new Error("renderWarmIntroMessage: contact.name is required");
  }

  if (contact.audience === "friends-family") {
    return [
      `Namaste ${name} 🙏`,
      "",
      "Hope you and family are well. I've been quietly building something for the",
      `last few months — Darshya (${shareUrl}) — a devotional super-app where`,
      "Indians and NRIs can book live darshan, pujas (with video proof), astrology",
      "consults, and 80G donations to verified temples.",
      "",
      "We're going live this week and I'm asking 5 close friends to share with 5",
      "people they think would genuinely benefit (parents who book pujas, NRI",
      "relatives missing home, anyone interested in Vedic astrology).",
      "",
      "Would you share with 5 people? No formal pitch needed — just \"my friend",
      `built this, it's legit, check it out: ${shareUrl}\"`,
      "",
      "Thank you 🙏",
    ].join("\n");
  }

  return [
    `Hi ${name},`,
    "",
    "Hope you're doing well. Quick founder-mode ask:",
    "",
    `I've been building Darshya (${shareUrl}) — a devotional super-app for`,
    "Indian/NRI Hindus. Live darshan, video-proof pujas, astrology, 80G temple",
    "donations. Going live this week.",
    "",
    "Would really appreciate if you could share with 5 people in your network",
    "who might find it useful — parents/relatives who book pujas, NRI friends,",
    "anyone into Vedic stuff. A line from you (\"I know the founder, it's the",
    "real thing\") carries 100x more weight than any ad.",
    "",
    "Happy to send a one-pager if helpful. Thank you.",
  ].join("\n");
}

/**
 * Bulk-render helper. Returns one message per contact, in input order, so the
 * founder can paste-loop them into WA without re-running the renderer per row.
 * Each message is independent — there is no batching/broadcast semantics here.
 */
export function renderWarmIntroBatch(
  contacts: ReadonlyArray<WarmIntroContact>,
  opts: RenderWarmIntroOptions = {},
): Array<{ name: string; message: string }> {
  return contacts.map((c) => ({
    name: c.name,
    message: renderWarmIntroMessage(c, opts),
  }));
}

export const WA_WARM_INTRO_SOURCE_TAG = REFERRAL_SOURCE_TAG;
