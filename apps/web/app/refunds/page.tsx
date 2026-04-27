import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { COMPANY, postalContactLine } from "../../lib/company";

export const metadata: Metadata = {
 title: "Refund Policy",
 description:
 "Darshya\u2019s refund policy for puja bookings, store orders, gaushala contributions, and chadhava offerings.",
};

export default function RefundsPage() {
 return (
 <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
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
 Last updated: April 1, 2026
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
 <td className="py-1.5">Within 24 hours of scheduled puja</td>
 <td className="py-1.5">No refund (preparations begun)</td>
 </tr>
 <tr>
 <td className="py-1.5">Puja not performed by temple</td>
 <td className="py-1.5">100% refund + 10% platform credit</td>
 </tr>
 <tr>
 <td className="py-1.5">Video proof not provided within 48 hours</td>
 <td className="py-1.5">Full refund or reschedule option</td>
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

 <RefundSection title="4. Gaushala Seva Contributions">
 <p>
 Donations made toward gau seva (cow feeding, medical care,
 adoption) are non-refundable as they are processed as
 charitable contributions and the funds are immediately
 allocated to the gaushala. You will receive a receipt and
 photo/video update of the seva performed.
 </p>
 </RefundSection>

 <RefundSection title="5. Chadhava (Virtual Offerings)">
 <p>
 Virtual offerings (flowers, bhog, diya) made at temples are
 non-refundable once the offering has been processed. If the
 offering was not performed due to a platform error, you will
 receive a full refund.
 </p>
 </RefundSection>

 <RefundSection title="6. Live Darshan">
 <p>
 Live darshan is a free service and does not involve payments.
 Premium darshan features, if introduced in the future, will
 have their own refund terms communicated at the time of
 purchase.
 </p>
 </RefundSection>

 <RefundSection title="7. Refund Processing Timeline">
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
 <strong>International Cards (Stripe):</strong> 7&ndash;14
 business days, depending on your bank.
 </li>
 <li>
 <strong>Platform Credits:</strong> Applied instantly to your
 Darshya wallet.
 </li>
 </ul>
 </RefundSection>

 <RefundSection title="8. How to Request a Refund">
 <ol className="list-decimal pl-5 space-y-2">
 <li>
 Log in to your Darshya account and navigate to your
 booking or order history.
 </li>
 <li>
 Select the item or booking and click &quot;Request Refund.&quot;
 </li>
 <li>
 Provide the reason for your refund request and any
 supporting information.
 </li>
 <li>
 Alternatively, email support@darshya.online with your
 booking/order ID, registered email, and reason for the
 refund.
 </li>
 </ol>
 </RefundSection>

 <RefundSection title="9. Disputes">
 <p>
 If you believe a refund has been incorrectly denied, you may
 escalate the matter by emailing grievance@darshya.online. Our
 Grievance Officer will review and respond within 15 business
 days.
 </p>
 </RefundSection>

 <RefundSection title="10. Contact">
 <p>For refund-related queries:</p>
 <ul>
 <li>Email: {COMPANY.supportEmail}</li>
 <li>Response window: {COMPANY.supportHours}</li>
 {postalContactLine() && <li>{postalContactLine()}</li>}
 </ul>
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
