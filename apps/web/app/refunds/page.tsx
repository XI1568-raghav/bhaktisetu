// TODO(2026-06): v2 draft pending lawyer review — see docs/legal/refund-policy-v2-draft.md
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import {
 COMPANY,
 grievanceOfficerLine,
 grievanceSlaLine,
 operatedByLine,
 postalContactLine,
} from "../../lib/company";
import {
 FULL_REFUND_HOURS_BEFORE,
 CANCELLATION_CUTOFF_HOURS,
 PARTIAL_REFUND_PERCENT,
 REFUND_SETTLEMENT_BANDS,
} from "../../lib/cancellation-policy";

/**
 * Hours of notice a consultation cancellation needs to be refunded in full.
 *
 * Mirrors apps/api/src/routes/consultation.ts, which is the only code that
 * decides it: a confirmed row is marked refundEligible only when
 * `scheduledMs >= Date.now() + 24 * 60 * 60 * 1000`. apps/web cannot import
 * from apps/api, so the number is mirrored here and
 * __tests__/refund-page-unbacked-promises.test.ts re-reads that handler and
 * fails if the two drift — the same anti-drift arrangement lib/cancellation-
 * policy uses for the puja ladder.
 */
const CONSULTATION_REFUND_NOTICE_HOURS = 24;

/**
 * Whether Darshya may describe a donation receipt as a Section 80G exemption
 * certificate. Same owner-controlled flag /donations and components/
 * DonationForm.tsx read, and the same predicate apps/api/src/lib/pdf-receipt.ts
 * gates the PDF's own 80G assertion on. One switch, every surface.
 */
const HAS_VERIFIED_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

export const metadata: Metadata = {
 title: "Refund & Cancellation Policy",
 description:
 "Darshya\u2019s refund policy for puja bookings, store orders, gaushala contributions, and chadhava offerings.",
 alternates: { canonical: "https://darshya.online/refunds" },
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title: "Refund & Cancellation Policy | Darshya",
 description:
 "Refund timelines and rules for pujas, astrology, donations, and store orders. Refunds via Razorpay in 5\u20137 business days.",
 url: "https://darshya.online/refunds",
 type: "website",
 },
};

export default function RefundsPage() {
 return (
 <div className="min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
 {/* Header */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-3xl mx-auto px-6 sm:px-8">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Legal
 </p>
 <h1
 className="heading-display text-2xl sm:text-3xl font-bold mb-3"
 style={{
 color: "var(--color-text)",
 lineHeight: "var(--leading-tight)",
 }}
 >
 Refund Policy
 </h1>
 <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
 Last updated: May 2, 2026
 </p>
 </div>
 </section>

 {/* Content */}
 <section className="py-14 sm:py-20">
 <div className="max-w-3xl mx-auto px-6 sm:px-8">
 <div className="space-y-10">
 <RefundSection title="1. Overview">
 <p>
 We want every devotee to have a positive experience on
 Darshya. This Refund Policy outlines when and how refunds
 are processed for various services on our platform. All
 refunds are processed to the original payment method unless
 otherwise noted.
 </p>
 </RefundSection>

 <RefundSection title="2. Puja Booking Refunds">
 <div
 className="p-4 rounded-xl mb-4"
 style={{
 background: "var(--color-primary-highlight)",
 border: "1px solid var(--color-border)",
 }}
 >
 <table className="w-full text-sm">
 <thead>
 <tr
 className="text-xs font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 <td className="pb-2">Cancellation Window</td>
 <td className="pb-2">Refund Amount</td>
 </tr>
 </thead>
 <tbody style={{ color: "var(--color-text-muted)" }}>
 {/* DB-06 (prod sweep 2026-08-12, P1) — THIS TABLE USED TO PUBLISH A
     DIFFERENT LADDER FROM THE ONE THAT RUNS.

     It read "More than 24 hours before -> 100% refund" and "6 to 24 hours
     -> 50% refund". The shipped policy is
     apps/api/src/services/cancellation.service.ts DEFAULT_CANCEL_POLICY
     (48h+ -> 100%, 24-48h -> 75%) on top of a HARD REFUSAL inside 24h in
     booking.service.ts cancelBooking. So the 24h row over-promised by a
     full tier, and the 6-24h row described a 50% refund the code refuses
     to produce at all — an unreachable promise on the page a devotee is
     pointed at from the checkout terms checkbox.

     The numbers now come from lib/cancellation-policy, the same module
     the checkout badge and the terms checkbox read, so the legal page and
     the payment screen cannot say different things again. */}
 <tr>
 <td className="py-1.5">
 {FULL_REFUND_HOURS_BEFORE} hours or more before the scheduled puja
 </td>
 <td className="py-1.5">100% refund</td>
 </tr>
 <tr>
 <td className="py-1.5">
 {CANCELLATION_CUTOFF_HOURS} to {FULL_REFUND_HOURS_BEFORE} hours
 before the scheduled puja
 </td>
 <td className="py-1.5">{PARTIAL_REFUND_PERCENT}% refund</td>
 </tr>
 <tr>
 <td className="py-1.5">
 Within {CANCELLATION_CUTOFF_HOURS} hours of the scheduled puja
 </td>
 <td className="py-1.5">
 Cancellation is not possible &mdash; the pandit is assigned and
 samagri is being prepared.
 </td>
 </tr>
 {/* LEG-01 residue (wave 2026-08-15) — this row read "100% refund + 10%
     platform credit", and the bullet below it repeated the offer.

     There is no rail behind the credit half. CreditLedgerEntry carries a
     `refund_to_credit` reason (apps/api/src/services/wallet.service.ts) and
     NOTHING writes it: the only two creditUser() call sites, in
     routes/referrals.ts and services/payment.service.ts, both pass
     'referral_reward'. So the platform could not have issued this credit even
     if support wanted to, on the page the checkout terms checkbox links to.

     The 100% refund is real — an admin can refund in full through
     services/refund.service.ts — so only the unbacked half is removed. Put the
     credit back when a refund_to_credit writer exists; the test
     __tests__/refund-page-unbacked-promises.test.ts flips its premise the
     moment one does. */}
 <tr>
 <td className="py-1.5">Puja not performed by temple</td>
 <td className="py-1.5">100% refund</td>
 </tr>
 <tr>
 <td className="py-1.5">
 No video proof {COMPANY.refunds.missingVideoEscalationHours} hours
 after the scheduled time
 </td>
 <td className="py-1.5">
 If the booking is still waiting on its assigned pandit, it is
 cancelled and sent for manual review. Any other status &mdash;
 a booking already marked completed, for example &mdash; needs
 an email from you. Where the pandit is at fault, the refund is
 100% of everything you paid.
 </td>
 </tr>
 </tbody>
 </table>
 </div>
 <ul>
 <li>
 Cancellations are processed through your booking history in
 your account dashboard, or by contacting
 support@darshya.online with your booking ID
 (BS-YYYYMMDD-XXXXX format).
 </li>
 <li>
 If a puja is cancelled by the temple due to unforeseen
 circumstances (natural disaster, temple closure, priest
 unavailability), you receive a full refund of everything you
 paid.
 </li>
 <li>
 Prasad delivery charges are refunded only if the entire
 booking is cancelled before the puja is performed.
 </li>
 {/* LEG-06: this used to read "we cancel the booking automatically and
     place it in our refund review queue", which described the sweep as
     though it saw every booking. escalateStaleBookings selects ONE status
     — `where: { status: 'priest_assigned', videoProofUrl: null }` in
     apps/api/src/services/booking.service.ts, against a nine-member
     BookingStatus enum. A booking a pandit has already advanced (the
     audit found three sitting in `completed` with videoProofUrl NULL) is
     invisible to it. Telling that devotee an automation is coming is the
     same failure as the original 48h promise, one step further in. */}
 <li>
 <strong>Missing video proof.</strong> Video is mandatory on
 every puja booking. {COMPANY.refunds.missingVideoEscalationHours}{" "}
 hours after your scheduled time an automatic sweep runs, and it
 covers one case: a booking still waiting on its assigned pandit.
 Those it cancels and places in our refund review queue. It does
 not reach a booking that has already been moved on &mdash; one
 marked completed, for example &mdash; so if yours shows as
 completed and no video ever arrived, email {COMPANY.supportEmail}{" "}
 rather than waiting for the sweep. Either way the refund is
 issued by a person, not by the sweep, so allow us{" "}
 {COMPANY.grievance.acknowledgeHours} hours to come back to you.
 Where the pandit is at fault you are refunded in full, and you
 never need to wait for the{" "}
 {COMPANY.refunds.missingVideoEscalationHours}-hour mark to write
 to us.
 </li>
 </ul>
 </RefundSection>

 <RefundSection title="3. Store Order Refunds">
 <ul>
 <li>
 <strong>Returnable Items:</strong> Puja items (murtis,
 diyas, puja thalis, rudraksha), books, and non-consumable
 products may be returned within 7 days of delivery. Items
 must be unused and in original packaging.
 </li>
 <li>
 <strong>Non-Returnable Items:</strong> Consumable items
 (incense, camphor, kumkum, haldi), prasad, and perishable
 items are non-returnable for hygiene and sanctity reasons.
 </li>
 <li>
 <strong>Damaged or Wrong Items:</strong> If you receive a
 damaged or incorrect item, contact us within 48 hours of
 delivery with photos. We will arrange a replacement or full
 refund including shipping costs.
 </li>
 <li>
 <strong>Return Shipping:</strong> Return shipping costs are
 borne by the customer for change-of-mind returns. For
 damaged or wrong items, we cover return shipping.
 </li>
 </ul>
 </RefundSection>

 <RefundSection title="4. Astrology & Wellness Sessions">
 {/* LEG-01 residue (wave 2026-08-15) — this paragraph published a SIX-hour
     full-refund window. The handler that decides it,
     apps/api/src/routes/consultation.ts, marks a confirmed consultation
     refund-eligible only when the session is at least
     CONSULTATION_REFUND_NOTICE_HOURS away
     (`cutoffMs = Date.now() + 24 * 60 * 60 * 1000`), so a devotee cancelling
     eight hours out read "full refund" here and the API recorded
     refundEligible:false. Same shape as LEG-01 on the puja ladder — the
     published promise was more generous than the engine — one product over.

     Copy now states the window the handler enforces. It also stops calling
     the outcome automatic: the endpoint sets a flag, it does not call
     Razorpay, so a person issues the money (the same correction LEG-06 made
     to the video-proof bullet in section 2). */}
 <p>
 Astrology and wellness consultations can be cancelled with at
 least {CONSULTATION_REFUND_NOTICE_HOURS} hours&rsquo; notice
 before the scheduled session and are then refunded in full.
 Inside that window, and once the session has started or the
 consultant has joined the video room, the booking is
 non-refundable. If the consultant fails to join within 15
 minutes of the scheduled start, you are entitled to a full
 refund or a free reschedule &mdash; email {COMPANY.supportEmail}{" "}
 and we will settle it. Consultation refunds are issued by a
 person rather than automatically, so allow us{" "}
 {COMPANY.grievance.acknowledgeHours} hours to come back to you.
 </p>
 </RefundSection>

 <RefundSection title="5. Gaushala Seva & Donations">
 {/* COM-16 + COM-02 residue (wave 2026-08-15). This paragraph carried both
     claims the sweep had already removed everywhere else, and carried them
     as the LEGAL JUSTIFICATION for keeping the donor's money.

     COM-16: "the funds are immediately allocated to the gaushala or
     beneficiary". Nothing allocates them. apps/api/src/routes/donations.ts
     writes no Commission, no PayoutRequest and no TemplePayout on any
     donation path; the gaushala and temple portals only LIST donations.
     The "100% to cause" badge was pulled from components/DonationForm.tsx
     for exactly this reason, and this page then went on asserting it.

     COM-02: "an 80G receipt is generated" / "Once an 80G receipt has been
     issued and claimed for tax benefit". lib/pdf-receipt.ts now gates the
     Section 80G assertion on is80GEligible (donee registration number AND
     PAN), and COMPANY.donationLegal.HAS_80G_VERIFIED is false, so what a
     donor actually receives today is a proof-of-donation receipt that says
     on its face it is not valid for a deduction. Telling them a claimed 80G
     deduction is why they cannot have their money back inverts that.

     The 7-day case-by-case review is unchanged — it is a real process and
     the only remedy this page can honestly offer. The 80G sentence is bound
     to the same owner-controlled flag /donations and DonationForm read, so
     it returns the day the registration does and not before. */}
 <p>
 Donations toward gau seva (cow feeding, medical care,
 adoption) and general charitable donations are treated as
 final once paid, because they are collected on behalf of the
 cause rather than sold to you as a service. If you believe a
 donation was made in error, contact {COMPANY.supportEmail}{" "}
 within 7 days of the donation with your receipt number; we
 review every such request individually and refund through
 Razorpay where the error is clear.
 </p>
 {HAS_VERIFIED_80G ? (
 <p>
 Where a donation has been receipted under Section 80G and
 that deduction has already been claimed, reversal is not
 possible.
 </p>
 ) : (
 <p>
 A receipt is emailed for every donation. It is a record of
 payment, not a Section 80G exemption certificate &mdash; see{" "}
 <a
 href="/donations"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 Donations
 </a>{" "}
 for what the receipt does and does not cover. No donation on
 this platform has been receipted under Section 80G, so no
 refund request is refused on that basis.
 </p>
 )}
 </RefundSection>

 <RefundSection title="6. Chadhava (Virtual Offerings)">
 <p>
 Virtual offerings (flowers, bhog, diya) made at temples are
 non-refundable once the offering has been processed. If the
 offering was not performed due to a platform error, you will
 receive a full refund.
 </p>
 </RefundSection>

 <RefundSection title="7. Live Darshan">
 <p>
 Live darshan is a free service and does not involve payments.
 Premium darshan features, if introduced in the future, will
 have their own refund terms communicated at the time of
 purchase.
 </p>
 </RefundSection>

 <RefundSection title="8. Refund Processing Timeline">
 {/* LEG-19 (prod sweep 2026-08-12): these four rows were retyped here,
     and three other pages retyped their own versions — /faqs said
     refunds are "usually instant" on the very method this table gives
     as one to three days, /nri-pujas quoted a single flat band and
     /why-darshya a fourth. The rows are unchanged; they now live in
     lib/cancellation-policy, and the other pages quote the sentence
     generated from them instead of writing their own. */}
 <ul>
 {REFUND_SETTLEMENT_BANDS.map((band) => (
 <li key={band.method}>
 <strong>{band.method}:</strong> {band.label}.
 </li>
 ))}
 {/* LEG-01 residue (wave 2026-08-15) — a fifth row read "Platform
     credits: Applied instantly to your Darshya wallet", the settlement
     half of the same unbacked promise removed from the table in section
     2. Refunds are never paid as credit: no call site writes a
     `refund_to_credit` CreditLedgerEntry, so every refund lands back on
     the payment method and only the four bands above apply. */}
 </ul>
 </RefundSection>

 <RefundSection title="9. How to Request a Refund">
 {/*
  LEG-18 (prod sweep 2026-08-12): step 2 named a refund button that has
  never existed anywhere in the app. The two controls that do exist live
  in apps/web/app/bookings/view/page.tsx, and the labels quoted below are
  asserted against that file by __tests__/legal-content-p2.test.ts — so
  renaming a button breaks the test instead of silently making this
  policy wrong again.
 */}
 <ol className="list-decimal pl-5 space-y-2">
 <li>
 Log in to your Darshya account and open{" "}
 <a
 href="/bookings"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 My Bookings
 </a>
 , then open the booking you want to cancel.
 </li>
 <li>
 On the booking page, use{" "}
 &quot;Cancel Booking&quot; if the puja has not been paid for or is
 still awaiting a pandit, or{" "}
 &quot;Request cancellation &amp; refund&quot; once it is confirmed.
 The page shows whichever of the two applies to that booking.
 </li>
 <li>
 Provide the reason for your refund request and any
 supporting information. The refund amount is the one set by the
 cancellation policy in section 2 above, not necessarily the full
 amount paid.
 </li>
 <li>
 Store orders, and anything you cannot reach from the booking
 page: email {COMPANY.supportEmail} with your booking or order ID,
 your registered email, and the reason.
 </li>
 </ol>
 </RefundSection>

 <RefundSection title="10. Disputes">
 <p>
 If you believe a refund has been incorrectly denied, you may
 escalate the matter to our grievance contact:
 </p>
 <ul>
 <li>{grievanceOfficerLine()}</li>
 <li>{grievanceSlaLine()}</li>
 </ul>
 </RefundSection>

 <RefundSection title="11. Contact">
 <p>For refund-related queries:</p>
 <ul>
 <li>Email: {COMPANY.supportEmail}</li>
 <li>Response window: {COMPANY.supportHours}</li>
 {postalContactLine() && <li>{postalContactLine()}</li>}
 </ul>
 <p>{operatedByLine()}</p>
 </RefundSection>
 </div>

 {/* Back link */}
 <div className="mt-12 pt-8" style={{ borderTop: "1px solid var(--color-border)" }}>
 <a
 href="/terms"
 className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
 style={{ color: "var(--color-primary)" }}
 >
 <ArrowLeft className="w-3.5 h-3.5" />
 Back to Terms of Service
 </a>
 </div>
 </div>
 </section>
 </div>
 );
}

function RefundSection({
 title,
 children,
}: {
 title: string;
 children: React.ReactNode;
}) {
 return (
 <div>
 <h3
 className="text-base font-semibold mb-3"
 style={{ color: "var(--color-text)" }}
 >
 {title}
 </h3>
 <div
 className="text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-sm"
 style={{ color: "var(--color-text-muted)" }}
 >
 {children}
 </div>
 </div>
 );
}
