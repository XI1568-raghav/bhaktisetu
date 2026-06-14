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
   * Specialty inboxes we publish on Contact. Set to null to hide a row.
   * support@ is already in supportEmail; the others are aspirational.
   */
  specialtyEmails: {
    sales: 'sales@darshya.online' as string | null,
    partnerships: 'partners@darshya.online' as string | null,
    press: 'press@darshya.online' as string | null,
    legal: 'legal@darshya.online' as string | null,
    privacy: 'privacy@darshya.online' as string | null,
  },

  /** Refund policy facts surfaced on /refunds and /terms. */
  refunds: {
    /** Hours before scheduled time that a free cancellation is allowed. */
    freeCancellationHoursBeforeService: 24,
    /** Days the refund takes to settle to the originating method. */
    refundSettlementDays: '5–7 business days',
  },

  /** Bank for 80G donation receipts. Public-safe. */
  donationLegal: {
    /** Set true only when 80G(5) certificate is on file. */
    HAS_80G_VERIFIED: false,
    /** "AAATD0000F" — only when HAS_80G_VERIFIED. */
    pan: null as null | string,
    /** 80G(5) regn number. */
    eightyGNumber: null as null | string,
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

export function postalContactLine(): string | null {
  if (COMPANY.IS_INCORPORATED_VERIFIED && COMPANY.legalEntity) {
    return `Mail: ${COMPANY.legalEntity.name}, ${COMPANY.legalEntity.registeredAddress}`;
  }
  return null;
}
