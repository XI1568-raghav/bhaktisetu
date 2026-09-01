import type { Metadata } from "next";
import { CANCELLATION_POLICY_SENTENCE } from "../../lib/cancellation-policy";
import { COMPANY, operatedByLine, postalContactLine, legalContactEmail } from "../../lib/company";
import { H1 } from '../../components/ui/heading-recipe';
import { HAS_80G } from '../../lib/eighty-g';

export const metadata: Metadata = {
 title: "Terms of Service",
 description:
 "Terms of service for using Darshya \u2014 puja bookings, live darshan, store purchases, and all platform services.",
 alternates: { canonical: "https://darshya.online/terms" },
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title: "Terms of Service | Darshya",
 description:
 "Eligibility, services, payments, liability, and dispute resolution for the Darshya platform.",
 url: "https://darshya.online/terms",
 type: "website",
 },
};

export default function TermsPage() {
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
 className={`${H1.catalogue} mb-3`}
 >
 Terms of Service
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
 <TermsSection title="1. Acceptance of Terms">
 <p>
 By accessing or using the Darshya platform (website at
 darshya.online, mobile applications, and related services),
 you agree to be bound by these Terms of Service (&quot;Terms&quot;).
 If you do not agree to these Terms, please do not use the
 Platform. {operatedByLine()} The platform operator reserves the right to
 modify these Terms at any time, with changes effective upon
 posting to the Platform.
 </p>
 </TermsSection>

 <TermsSection title="2. Eligibility">
 <p>
 You must be at least 18 years of age to create an account and
 use the Platform independently. Users between 13 and 18 may
 use the Platform with parental or guardian consent. By using
 the Platform, you represent that you meet these eligibility
 requirements.
 </p>
 </TermsSection>

 <TermsSection title="3. Account Registration">
 <ul>
 <li>
 You must provide accurate and complete information during
 registration and keep your account information updated.
 </li>
 <li>
 You are responsible for maintaining the confidentiality of
 your login credentials and for all activities that occur
 under your account.
 </li>
 <li>
 You must notify us immediately at support@darshya.online if
 you suspect unauthorized access to your account.
 </li>
 <li>
 We reserve the right to suspend or terminate accounts that
 violate these Terms or engage in fraudulent activity.
 </li>
 </ul>
 </TermsSection>

 <TermsSection title="4. Puja Booking Services">
 <h4>4.1 Nature of Service</h4>
 <p>
 Darshya acts as an intermediary platform connecting devotees
 with verified temples and priests for puja bookings. We
 facilitate the booking, payment processing, and delivery of
 video proof. The actual ritual is performed by the temple&apos;s
 priest according to traditional Vedic procedures.
 </p>

 <h4>4.2 Sankalp Information</h4>
 <p>
 You are responsible for providing accurate sankalp details
 (devotee name, gotra, nakshatra, and purpose). Darshya is
 not liable for any errors in the performance of a puja due to
 incorrect sankalp information provided by you.
 </p>

 <h4>4.3 Video Proof</h4>
 {/* LEG-06 (prod sweep 2026-08-12): this clause used to state a flat
     48-hour delivery as an operative term while /refunds published the
     real regime — escalateStaleBookings runs at 72h, covers a booking
     still in `priest_assigned`, and issues no refund of its own. Terms
     are the operative document in a dispute, so a delivery window
     written here as a guarantee is a guarantee. It is now stated as the
     target it is, with the escalation the platform actually runs. */}
 <p>
 All puja bookings include video proof of the ritual
 performance. We aim to deliver the video link within{" "}
 {COMPANY.refunds.videoProofTargetLabel} of the scheduled puja.
 This is a service target rather than a guaranteed window: where
 no video has been uploaded{" "}
 {COMPANY.refunds.missingVideoEscalationHours} hours after the
 scheduled slot, an automated sweep cancels a booking still
 awaiting its assigned pandit and refers it for manual refund
 review, and a booking in any other state is reviewed on request
 to {COMPANY.supportEmail}. Where the pandit is at fault the
 refund is 100% of the amount paid. Videos are retained for 90
 days from the date of performance.
 </p>

 <h4>4.4 Prasad Delivery</h4>
 <p>
 Where a puja includes prasad delivery, we aim to deliver
 within 7&ndash;14 business days within India. Delivery timelines
 may vary based on temple location and logistics. International
 prasad delivery is subject to customs regulations in the
 destination country.
 </p>
 </TermsSection>

 <TermsSection title="5. Live Darshan">
 <p>
 Live darshan streams are provided on a best-effort basis and
 are subject to temple schedules, internet connectivity at the
 temple, and maintenance windows. We do not guarantee
 uninterrupted streaming. Darshan timings and availability are
 determined by the respective temples and may change without
 notice.
 </p>
 </TermsSection>

 <TermsSection title="6. Store & E-Commerce">
 <ul>
 <li>
 Products listed on the Darshya store are sourced from
 verified suppliers. Product descriptions, images, and prices
 are provided as accurately as possible, but minor variations
 may occur.
 </li>
 <li>
 All prices are displayed in Indian Rupees (INR). Prices include
 applicable taxes unless stated otherwise.
 </li>
 <li>
 Orders are confirmed upon successful payment processing.
 We reserve the right to cancel orders in cases of pricing
 errors, stock unavailability, or suspected fraud.
 </li>
 <li>
 Shipping timelines vary by product type and delivery
 location. Estimated delivery dates are provided at checkout.
 </li>
 </ul>
 </TermsSection>

 <TermsSection title="7. Payments">
 <ul>
 <li>
 All payments, domestic and international, are processed through
 Razorpay and billed in Indian Rupees (INR).
 </li>
 <li>
 Accepted payment methods include UPI, debit cards, credit
 cards, net banking, and digital wallets. International cards
 are accepted and billed in INR; your bank applies its own
 conversion rate and any foreign-transaction fee.
 </li>
 <li>
 Platform commission is a uniform <strong>20%</strong> of the
 transaction value across every service category &mdash; puja
 bookings, astrology consultations, wellness sessions and store
 products alike. The provider (pandit, astrologer, instructor,
 store owner) receives the remaining <strong>80%</strong>. Where a
 temple is party to a booking, the temple&apos;s revenue share is
 paid out of the platform&apos;s 20%, not deducted from the
 provider&apos;s 80%.
 </li>
 <li>
 Donations carry <strong>0% commission</strong>. Every donation
 receipt is issued free of charge &mdash; there is no per-receipt
 fee.{' '}
 {!HAS_80G &&
  'That receipt is proof of payment and not a Section 80G tax-exemption certificate: Darshya holds no 80G registration, so no donation made today is claimable as an 80G deduction.'}
 </li>
 <li>
 Priest, astrologer, and provider payouts are processed
 after successful service delivery (e.g., video proof for
 puja, completed session for astrology). Payouts are gated
 on Aadhaar / bank verification per RBI norms.
 </li>
 </ul>
 </TermsSection>

 <TermsSection title="8. Cancellations & Refunds">
 <p>
 For details on cancellations and refunds, please refer to our{" "}
 <a
 href="/refunds"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 Refund Policy
 </a>
 . Key points:
 </p>
 <ul>
 {/* DB-06 (prod sweep 2026-08-12, P1) — this clause used to read
     "cancelled up to 24 hours before the scheduled time for a full
     refund", a FOURTH ladder, more generous than the one the API runs
     (cancellation.service.ts DEFAULT_CANCEL_POLICY: 48h+ 100%,
     24-48h 75%, plus a hard refusal inside 24h). Terms are the
     operative document in a dispute, so this is the last place that
     may disagree with checkout. It now renders the same sentence the
     payment-step checkbox renders, from lib/cancellation-policy. */}
 <li>{CANCELLATION_POLICY_SENTENCE}</li>
 <li>
 If the pandit or temple cancels, you are refunded in full.
 </li>
 <li>
 Store orders may be returned within 7 days of delivery for
 eligible items. Consumable items (prasad, incense, etc.)
 are non-returnable.
 </li>
 </ul>
 </TermsSection>

 <TermsSection title="9. User Conduct">
 <p>You agree not to:</p>
 <ul>
 <li>
 Use the Platform for any purpose that is unlawful, harmful,
 or disrespectful to Hindu or any religious traditions.
 </li>
 <li>
 Impersonate any person or entity, or provide false identity
 or sankalp information.
 </li>
 <li>
 Attempt to disrupt, hack, or interfere with the Platform&apos;s
 operations, security, or infrastructure.
 </li>
 <li>
 Record, redistribute, or commercially exploit live darshan
 streams without written permission.
 </li>
 <li>
 Post or transmit abusive, defamatory, or obscene content
 through the Platform.
 </li>
 </ul>
 </TermsSection>

 <TermsSection title="10. Intellectual Property">
 <p>
 All content on the Platform &mdash; including text, images,
 logos, design elements, audio recordings (bhajans, aartis,
 mantras), and video streams &mdash; is the property of
 Darshya or its licensors and is protected by copyright and
 trademark laws. You may not reproduce, distribute, or create
 derivative works from our content without prior written
 consent.
 </p>
 </TermsSection>

 <TermsSection title="11. Limitation of Liability">
 <p>
 Darshya acts as a technology platform facilitating
 devotional services. To the fullest extent permitted by law:
 </p>
 <ul>
 <li>
 We are not liable for the quality, accuracy, or
 completeness of any religious ritual performed by third-party
 priests or temples.
 </li>
 <li>
 We are not liable for interruptions to live darshan
 services caused by factors beyond our control (internet
 outages, temple closures, natural events).
 </li>
 <li>
 Our aggregate total liability for any and all claims
 arising from your use of the Platform shall not exceed the
 greater of (a) the amount you paid to us in the 12 months
 preceding the claim, or (b) INR ₹10,000. This cap applies
 to the fullest extent permitted by Indian law.
 </li>
 <li>
 You agree to indemnify and hold harmless Darshya, its
 operators, and partners against any third-party claims
 arising from your misuse of the Platform, false sankalp
 information, violation of these Terms, or infringement of
 any rights of another party.
 </li>
 </ul>
 </TermsSection>

 <TermsSection title="12. Governing Law & Dispute Resolution">
 <p>
 These Terms shall be governed by and construed in accordance
 with the laws of India, without regard to conflict-of-law
 principles. Any disputes arising from these Terms or your use
 of the Platform shall be resolved through arbitration under
 the Arbitration and Conciliation Act, 1996, conducted in
 English by a sole arbitrator in Bengaluru, Karnataka, India.
 Subject to arbitration, the courts of Bengaluru shall have
 exclusive jurisdiction over any matter arising from these
 Terms.
 </p>
 </TermsSection>

 <TermsSection title="13. Contact">
 <p>
 For questions regarding these Terms of Service, contact us at:
 </p>
 <ul>
 <li>Email: {legalContactEmail()}</li>
 {postalContactLine() && <li>{postalContactLine()}</li>}
 </ul>
 </TermsSection>
 </div>
 </div>
 </section>
 </div>
 );
}

function TermsSection({
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
