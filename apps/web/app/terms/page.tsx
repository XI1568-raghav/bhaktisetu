import type { Metadata } from "next";
import { COMPANY, operatedByLine, postalContactLine } from "../../lib/company";

export const metadata: Metadata = {
 title: "Terms of Service",
 description:
 "Terms of service for using Darshya \u2014 puja bookings, live darshan, store purchases, and all platform services.",
};

export default function TermsPage() {
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
 Terms of Service
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
 <p>
 All puja bookings include video proof of the ritual
 performance. Video links are delivered within 48 hours of the
 scheduled puja. Videos are retained for 90 days from the date
 of performance.
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
 All prices are displayed in INR for domestic users and USD
 for international users. Prices include applicable taxes
 unless stated otherwise.
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
 Domestic payments are processed through Razorpay.
 International payments are processed through Stripe.
 </li>
 <li>
 Accepted payment methods include UPI, debit cards, credit
 cards, net banking, and digital wallets (domestic) and
 credit/debit cards (international).
 </li>
 <li>
 All transactions are in Indian Rupees (INR) for domestic
 users. International users are charged in USD at the
 applicable rate.
 </li>
 <li>
 Platform commission on puja bookings ranges from 20&ndash;40%
 as configured per temple. Priest payouts are processed
 after successful video proof submission.
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
 <li>
 Puja bookings may be cancelled up to 24 hours before the
 scheduled time for a full refund.
 </li>
 <li>
 Cancellations within 24 hours of the scheduled time are
 non-refundable, as preparations may have begun.
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
 Our total liability for any claim arising from your use of
 the Platform shall not exceed the amount you paid to us in
 the 12 months preceding the claim.
 </li>
 </ul>
 </TermsSection>

 <TermsSection title="12. Dispute Resolution">
 <p>
 Any disputes arising from these Terms or your use of the
 Platform shall be resolved through arbitration in accordance
 with the Arbitration and Conciliation Act, 1996. The
 arbitration shall be conducted in Bengaluru, Karnataka, India.
 The language of arbitration shall be English. These Terms
 shall be governed by and construed in accordance with the laws
 of India.
 </p>
 </TermsSection>

 <TermsSection title="13. Contact">
 <p>
 For questions regarding these Terms of Service, contact us at:
 </p>
 <ul>
 <li>Email: {COMPANY.specialtyEmails.legal ?? COMPANY.supportEmail}</li>
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
