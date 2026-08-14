/**
 * Single source of truth for company / legal facts surfaced on public pages.
 *
 * Edit ONE file when corporate identity changes. Pages import from here so
 * we never drift between Privacy / Terms / Contact / Refunds.
 *
 * The defaults below describe the *current* truth: a solo founder pre-
 * incorporation. Once you incorporate or activate offices/phones, replace
 * the relevant fields. Setting a field to `null` makes the page omit it
 * cleanly instead of rendering placeholder text.
 *
 * Fields ending in `_VERIFIED` are gates: pages render the corresponding
 * legal claim only when the gate is true. Keep them `false` until you
 * actually have the registration / address / phone in hand.
 */

export const COMPANY = {
  /** Public-facing brand name. Always safe to display. */
  brand: 'Darshya',

  /** Apex domain (no scheme, no path). */
  domain: 'darshya.online',

  /** Generic email for users — already wired into mailto: links. */
  supportEmail: 'support@darshya.online',

  /** Support hours we actually staff. Conservative until SLA is real. */
  supportHours: 'Within 24 hours, Monday – Saturday',

  /**
   * Set to true ONLY after the Section 8 Foundation is registered and you
   * have the Certificate of Incorporation in hand. Per F-001 decision the
   * platform operates as "Bhaktisetu Foundation" (Section 8 not-for-profit),
   * NOT as a Private Limited company. Until the certificate lands, pages
   * render "Darshya is operated by an independent founder in India"
   * instead of claiming a corporate entity.
   */
  IS_INCORPORATED_VERIFIED: false,

  /** Filled when IS_INCORPORATED_VERIFIED becomes true. */
  legalEntity: null as null | {
    /** "Bhaktisetu Foundation" — exactly as on the Section 8 Certificate of Incorporation. Never "Pvt. Ltd." per F-001. */
    name: string;
    /** CIN issued by MCA, 21 chars (Section 8 prefix U85100…). */
    cin: string;
    /** GSTIN, 15 chars. Optional. */
    gstin?: string;
    /** Registered office (full postal address, single string). */
    registeredAddress: string;
  },

  /**
   * Set to true ONLY after the regional support phones are actually
   * answerable. Until then, the Contact page omits the phone block
   * entirely and points users at email + ticket form.
   */
  HAS_PHONE_SUPPORT_VERIFIED: true,

  /** Filled when HAS_PHONE_SUPPORT_VERIFIED becomes true. */
  phones: [
    {
      region: 'India (founder direct)',
      flag: '🇮🇳',
      phone: '+91 92551 09400',
      hours: 'Mon – Sat, 9:00 AM – 7:00 PM IST',
    },
  ] as null | Array<{
    region: string;
    flag: string;
    phone: string;
    hours: string;
  }>,

  /**
   * Set to true ONLY once every alias in `specialtyEmails` below has been
   * provisioned AND a test message has been delivered to a monitored inbox.
   *
   * LEG-16 (prod sweep 2026-08-12): the comment on `specialtyEmails` used to
   * read "support@ is already in supportEmail; the others are aspirational" —
   * and every legal page nonetheless printed privacy@ / legal@ as THE channel
   * for a DPDP or UK-GDPR rights request. If the alias does not resolve, the
   * one statutory channel a data principal has bounces in silence, which is
   * worse than publishing no specialty address at all.
   *
   * While this is false, `rightsContactEmail()` and `legalContactEmail()`
   * return `supportEmail`, which is the inbox the product already answers.
   * Provisioning the aliases is an owner/DNS action; flipping this boolean is
   * the only code change it needs.
   */
  HAS_SPECIALTY_INBOXES_VERIFIED: false,

  /**
   * Specialty inboxes. Set to null to hide a row entirely. These are read
   * through the helpers below, never directly by a page — the helpers are what
   * apply HAS_SPECIALTY_INBOXES_VERIFIED.
   */
  specialtyEmails: {
    sales: 'sales@darshya.online' as string | null,
    partnerships: 'partners@darshya.online' as string | null,
    press: 'press@darshya.online' as string | null,
    legal: 'legal@darshya.online' as string | null,
    privacy: 'privacy@darshya.online' as string | null,
  },

  /**
   * Grievance redressal contact. IT Rules 2021 Rule 3(2) and the Consumer
   * Protection (E-Commerce) Rules 2020 Rule 4(5) both require the NAME,
   * DESIGNATION and contact details of a grievance officer — not just an alias.
   *
   * LEG-11 (prod sweep 2026-08-12): /privacy promised "acknowledge within 48
   * hours, resolve within 30 days" while /refunds promised "respond within 15
   * business days", both against an unattributed alias that this file did not
   * even declare. One block, one SLA, rendered from here on every page that
   * mentions grievances.
   */
  grievance: {
    /**
     * Set true ONLY when a real person is appointed and the name below is
     * theirs. Until then pages publish the inbox + SLA and say the officer is
     * being appointed, rather than naming nobody and implying one exists.
     */
    HAS_NAMED_OFFICER_VERIFIED: false,
    /** Filled when HAS_NAMED_OFFICER_VERIFIED becomes true. */
    officerName: null as null | string,
    /** e.g. "Grievance Officer & Nodal Contact". */
    officerDesignation: null as null | string,
    /** Phone shown alongside the officer. Null hides the line. */
    officerPhone: null as null | string,
    email: 'grievance@darshya.online',
    /** Single acknowledgement SLA. 24h satisfies both rule sets. */
    acknowledgeHours: 24,
    /** Single resolution SLA. 15 business days satisfies both rule sets. */
    resolveBusinessDays: 15,
  },

  /** Refund policy facts surfaced on /refunds and /terms. */
  refunds: {
    /** Hours before scheduled time that a free cancellation is allowed. */
    freeCancellationHoursBeforeService: 24,
    /** Days the refund takes to settle to the originating method. */
    refundSettlementDays: '5–7 business days',
    /**
     * Hours after the scheduled slot at which a booking with no video proof is
     * auto-cancelled and routed to the admin refund queue. Mirrors
     * `escalateStaleBookings(staleHours = 72)` in
     * apps/api/src/services/booking.service.ts — that sweep issues NO refund of
     * its own, so /refunds must not advertise an automatic one.
     */
    missingVideoEscalationHours: 72,
  },

  /**
   * Store delivery facts. These are the numbers the cart actually charges —
   * components/CartContext.tsx computes `subtotal >= 499 ? 0 : 49`. /shipping
   * used to publish a ₹999 threshold and a ₹49–₹99 weight band that no code
   * path implements (LEG-12); it now renders from here so the shipping policy
   * and the cart cannot drift apart again.
   */
  store: {
    freeDeliveryAboveInr: 499,
    flatDeliveryFeeInr: 49,
  },

  /** Bank for 80G donation receipts. Public-safe. */
  donationLegal: {
    /** Set true only when 80G(5) certificate is on file. */
    HAS_80G_VERIFIED: false,
    /** "AAATD0000F" — only when HAS_80G_VERIFIED. */
    pan: null as null | string,
    /** 80G(5) regn number. */
    eightyGNumber: null as null | string,
    /**
     * CSR-1 (MCA Form CSR-1) registration, required before a company may route
     * CSR spend to an implementing agency.
     *
     * LEG-14 (prod sweep 2026-08-12): /csr-match published, to corporate CSR
     * buyers, "Bhaktisetu is 80G certified + CSR-1 registered" — while this
     * file said HAS_80G_VERIFIED false, pan null, eightyGNumber null and
     * IS_INCORPORATED_VERIFIED false. A CSR-1 claim is worse than the
     * consumer-side 80G one: the donor company's own CSR compliance rests on
     * it. Set true only with the filed CSR-1 acknowledgement in hand.
     */
    HAS_CSR1_VERIFIED: false,
    /** CSR Registration Number (CSR00012345) — only when HAS_CSR1_VERIFIED. */
    csr1Number: null as null | string,
  },

  /**
   * Indirect-tax facts. PM-09 (prod sweep 2026-08-12): no surface in the
   * pricing model said anything about GST — /pricing published bare INR plan
   * prices, the API plan objects carry no tax field, and the store checkout
   * was adding a browser-computed 5% "GST (est.)" on top of a business with no
   * GSTIN (removed in COM-06/S-09, which settled the doctrine: quote
   * tax-inclusive prices until a GSTIN and per-HSN rates exist).
   *
   * Flip HAS_GST_REGISTRATION_VERIFIED the day the GSTIN is issued, fill
   * `gstin`, and re-read every page that calls `taxTreatmentLine()`.
   */
  tax: {
    HAS_GST_REGISTRATION_VERIFIED: false,
    /** 15-char GSTIN — only when HAS_GST_REGISTRATION_VERIFIED. */
    gstin: null as null | string,
  },
} as const;

/**
 * Helper: returns the most legally accurate "operated by" line. Use this
 * anywhere a Privacy/Terms page wants to identify the operator without
 * fabricating a corporate identity.
 */
export function operatedByLine(): string {
  if (COMPANY.IS_INCORPORATED_VERIFIED && COMPANY.legalEntity) {
    return `${COMPANY.legalEntity.name} (operating the ${COMPANY.brand} platform at ${COMPANY.domain})`;
  }
  return `${COMPANY.brand} is an independently-operated platform based in India. Until incorporation completes, contracts and notices should be addressed to ${COMPANY.supportEmail}.`;
}

/**
 * The address a user is told to write to for a given specialty. Returns the
 * alias only when the inboxes have been verified as deliverable; otherwise the
 * staffed support inbox.
 *
 * LEG-16: a statutory rights channel that bounces is a compliance failure, and
 * the previous behaviour published one the codebase itself called aspirational.
 */
export function specialtyEmail(kind: keyof typeof COMPANY.specialtyEmails): string {
  if (!COMPANY.HAS_SPECIALTY_INBOXES_VERIFIED) return COMPANY.supportEmail;
  return COMPANY.specialtyEmails[kind] ?? COMPANY.supportEmail;
}

/** Where a DPDP / UK-GDPR data-rights request must be sent. */
export function rightsContactEmail(): string {
  return specialtyEmail('privacy');
}

/** Where a legal or compliance notice must be sent. */
export function legalContactEmail(): string {
  return specialtyEmail('legal');
}

export function postalContactLine(): string | null {
  if (COMPANY.IS_INCORPORATED_VERIFIED && COMPANY.legalEntity) {
    return `Mail: ${COMPANY.legalEntity.name}, ${COMPANY.legalEntity.registeredAddress}`;
  }
  return null;
}

/**
 * Helper: who the grievance goes to. Names the officer once appointed;
 * otherwise says plainly that the appointment is pending instead of implying
 * an officer exists behind an unattributed alias.
 */
export function grievanceOfficerLine(): string {
  const g = COMPANY.grievance;
  if (g.HAS_NAMED_OFFICER_VERIFIED && g.officerName) {
    const designation = g.officerDesignation ? `, ${g.officerDesignation}` : '';
    const phone = g.officerPhone ? ` · ${g.officerPhone}` : '';
    return `${g.officerName}${designation} — ${g.email}${phone}`;
  }
  return `${g.email} — a named grievance officer has not yet been appointed; complaints sent to this address are handled by the platform operator.`;
}

/** Helper: the single grievance SLA sentence, used verbatim on every page. */
export function grievanceSlaLine(): string {
  const g = COMPANY.grievance;
  return `We acknowledge every complaint within ${g.acknowledgeHours} hours and aim to resolve it within ${g.resolveBusinessDays} business days.`;
}

/**
 * Helper: what a published price does about tax.
 *
 * PM-09 — the honest statement today is that the amount shown is the amount
 * charged: `subscription.service.subscribe()` writes `amount: plan.price` and
 * `createRazorpaySubscription` bills that same figure, and
 * `apps/api/src/lib/store-pricing.ts` computes `subtotal + delivery` with no
 * tax line at all. Nothing anywhere adds a percentage at checkout. Once a
 * GSTIN exists this must be replaced with a real tax breakdown, which is why
 * the sentence is gated rather than hardcoded.
 */
export function taxTreatmentLine(): string {
  if (COMPANY.tax.HAS_GST_REGISTRATION_VERIFIED && COMPANY.tax.gstin) {
    return `Prices are inclusive of applicable Indian taxes. GSTIN ${COMPANY.tax.gstin}; the tax component is itemised on your invoice.`;
  }
  return `Prices are the full amount charged in INR — nothing is added at checkout. ${COMPANY.brand} is not GST-registered yet, so no GST is collected and no document we issue is a GST tax invoice. When registration lands, tax will be shown as its own line before you pay, not added on top of a price you already agreed to.`;
}

/**
 * Helper: whether the platform may publish a Section 80G / CSR-1 claim.
 * Both registrations are separate gates; a CSR buyer needs both.
 */
export function csrCredentialLine(): string {
  const d = COMPANY.donationLegal;
  if (d.HAS_80G_VERIFIED && d.HAS_CSR1_VERIFIED && d.eightyGNumber && d.csr1Number) {
    return `${COMPANY.brand} holds 80G registration ${d.eightyGNumber} and CSR-1 registration ${d.csr1Number}.`;
  }
  return `${COMPANY.brand} does not yet hold 80G or CSR-1 registration, so a contribution made through this page cannot be treated as CSR spend or claimed as an 80G deduction today. We will publish both registration numbers here the day they are issued; nothing on this page should be relied on for CSR compliance until then.`;
}

/** Helper: "Free delivery above ₹499, otherwise a flat ₹49" as one sentence. */
export function deliveryFeeLine(): string {
  return `Free delivery on domestic orders of ₹${COMPANY.store.freeDeliveryAboveInr.toLocaleString('en-IN')} and above. Below that, a flat ₹${COMPANY.store.flatDeliveryFeeInr} applies — the same fee for every weight and every destination.`;
}
