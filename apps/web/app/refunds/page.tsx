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
 className="text-2xl sm:text-3xl font-bold mb-3"
 style={{
 fontFamily: "var(--font-display)",
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
 <tr>
 <td className="py-1.5">More than 24 hours before scheduled puja</td>
 <td className="py-1.5">100% refund</td>
 </tr>
 <tr>
 <td className="py-1.5">6 to 24 hours before scheduled puja</td>
 <td className="py-1.5">50% refund</td>
 </tr>
 <tr>
 <td className="py-1.5">Less than 6 hours before scheduled puja</td>
 <td className="py-1.5">No refund (preparations underway)</td>
 </tr>
 <tr>
 <td className="py-1.5">Puja not performed by temple</td>
 <td className="py-1.5">100% refund + 10% platform credit</td>
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
 unavailability), you will receive a full refund plus a 10%
 platform credit for future bookings.
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
 <p>
 Astrology and wellness consultations may be cancelled up to
 6 hours before the scheduled session for a full refund. Once
 the session has started or the consultant has joined the
 video room, the booking is non-refundable. If the consultant
 fails to join within 15 minutes of the scheduled start, you
 are entitled to a full refund or a free reschedule.
 </p>
 </RefundSection>

 <RefundSection title="5. Gaushala Seva & Donations">
 <p>
 Donations toward gau seva (cow feeding, medical care,
 adoption) and general charitable donations are
 non-refundable, as the funds are immediately allocated to
 the gaushala or beneficiary and an 80G receipt is generated.
 If you believe a donation was made in error, you must
 contact support@darshya.online within 7 days of the donation;
 we will review the request on a case-by-case basis. Once an
 80G receipt has been issued and claimed for tax benefit,
 reversal is not possible.
 </p>
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
 <ul>
 <li>
 <strong>UPI and Wallets:</strong> 1&ndash;3 business days.
 </li>
 <li>
 <strong>Debit/Credit Cards:</strong> 5&ndash;7 business days.
 </li>
 <li>
 <strong>Net Banking:</strong> 5&ndash;10 business days.
 </li>
 <li>
 <strong>International Cards:</strong> 7&ndash;14
 business days, depending on your bank.
 </li>
 <li>
 <strong>Platform Credits:</strong> Applied instantly to your
 Darshya wallet.
 </li>
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
