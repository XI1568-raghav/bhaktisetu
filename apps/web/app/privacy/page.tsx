import type { Metadata } from "next";
import {
 COMPANY,
 grievanceOfficerLine,
 grievanceSlaLine,
 operatedByLine,
 postalContactLine,
 rightsContactEmail,
} from "../../lib/company";
import CookieSettingsButton from "../../components/CookieSettingsButton";
import { H1 } from '../../components/ui/heading-recipe';

export const metadata: Metadata = {
 title: "Privacy Policy",
 description:
 "Darshya\u2019s privacy policy. Learn how we collect, use, and protect your personal and devotional data.",
 alternates: { canonical: "https://darshya.online/privacy" },
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title: "Privacy Policy | Darshya",
 description:
 "How Darshya collects, uses, and protects your personal and devotional data. DPDP Act 2023 compliant.",
 url: "https://darshya.online/privacy",
 type: "website",
 },
};

export default function PrivacyPage() {
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
 Privacy Policy
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
 <PolicySection title="1. Introduction">
 <p>
 {operatedByLine()} The Platform includes the
 website at {COMPANY.domain}, mobile applications, and related
 services (collectively, the &quot;Platform&quot;). This Privacy Policy
 explains how we collect, use, disclose, and protect your
 information when you use our Platform.
 </p>
 <p>
 We understand that devotional data is deeply personal. Your
 spiritual preferences, gotra, nakshatra, and ritual history are
 treated with the highest level of care and confidentiality.
 </p>
 </PolicySection>

 <PolicySection title="2. Information We Collect">
 <h4>2.1 Information You Provide</h4>
 <ul>
 <li>
 <strong>Account Information:</strong> Name, email address, phone
 number, and password when you create an account.
 </li>
 <li>
 <strong>Devotional Profile:</strong> Gotra, nakshatra (birth
 star), rashi (zodiac sign), kuldevta (family deity), and family
 member details — provided voluntarily for personalized puja
 recommendations and sankalp.
 </li>
 <li>
 <strong>Booking Information:</strong> Puja preferences, sankalp
 details (devotee name, gotra, purpose), delivery address for
 prasad, and booking history.
 </li>
 <li>
 <strong>Payment Information:</strong> Processed securely through
 Razorpay, for domestic and international payments alike. We do not
 store your full card number, CVV, or bank credentials on our servers.
 </li>
 <li>
 <strong>Communication Data:</strong> Messages sent through our
 contact form, support tickets, and feedback submissions.
 </li>
 </ul>

 <h4>2.2 Information Collected Automatically</h4>
 <ul>
 <li>
 <strong>Device Information:</strong> Browser type, device model,
 operating system, and screen resolution.
 </li>
 <li>
 <strong>Usage Data:</strong> Pages visited, features used,
 darshan viewing history, content preferences, and session
 duration.
 </li>
 <li>
 <strong>Location Data:</strong> Approximate location (city/state
 level) derived from IP address, used to show nearby temples and
 local panchang data. We do not track precise GPS location
 without explicit consent.
 </li>
 <li>
 <strong>Cookies & Analytics:</strong> We use PostHog for product
 analytics and essential cookies for session management. See
 Section 7 for details.
 </li>
 </ul>
 </PolicySection>

 <PolicySection title="3. How We Use Your Information">
 <ul>
 <li>
 To process and fulfill puja bookings, including transmitting
 sankalp details to the performing priest.
 </li>
 <li>
 To deliver live darshan streams and personalized content
 (aartis, bhajans, mantras) based on your preferences.
 </li>
 <li>
 To provide panchang, festival, and astrology information
 relevant to your location and nakshatra.
 </li>
 <li>
 To process payments and send booking confirmations,
 receipts, and video proof of completed pujas.
 </li>
 <li>
 To deliver purchased products from our store and send
 shipment tracking updates.
 </li>
 <li>
 To respond to your support queries and improve our services
 based on feedback.
 </li>
 <li>
 To send transactional notifications (booking status, payment
 confirmations). Marketing communications are sent only with
 your explicit opt-in consent.
 </li>
 </ul>
 </PolicySection>

 <PolicySection title="4. Information Sharing & Third-Party Processors">
 <p>We share your information only in these limited circumstances, and only with
 sub-processors that meet industry-standard security and contractual safeguards:</p>
 <ul>
 <li>
 <strong>Razorpay (Payments — India):</strong> Processes domestic
 INR transactions. Receives card/UPI/banking data directly; we
 do not store full card numbers or CVV.
 </li>
  <li>
 <strong>Supabase (Database & Auth):</strong> Stores account
 records, bookings, and content metadata in managed Postgres.
 Your browser never queries these tables directly; every read
 and write passes through our authenticated API, which checks
 your identity and role on each request.
 </li>
 <li>
 <strong>Cloudflare (CDN, DNS, Analytics):</strong> Routes web
 traffic, caches static assets, and provides cookieless
 privacy-first web analytics.
 </li>
 <li>
 <strong>Resend (Transactional Email):</strong> Delivers booking
 confirmations, receipts, and OTPs to your registered email.
 </li>
 <li>
 <strong>PostHog (Product Analytics):</strong> Anonymous,
 aggregated usage data to improve features. No PII is sent.
 </li>
 <li>
 <strong>Groq (AI Inference):</strong> Powers AI chat (Ask
 Pandit) and content recommendations. Prompt content is
 transmitted for inference and not retained for training.
 </li>
 <li>
 <strong>Temple Priests:</strong> Sankalp details (devotee name,
 gotra, nakshatra, and puja purpose) are shared with the
 assigned priest solely for performing the booked ritual.
 </li>
 <li>
 <strong>Delivery Partners (India Post, Delhivery, etc.):</strong>{" "}
 Your shipping address is shared with logistics providers for
 prasad and store order deliveries.
 </li>
 <li>
 <strong>Legal Requirements:</strong> We may disclose information
 if required by law, court order, or government regulation.
 </li>
 </ul>
 <p>
 We do not sell, rent, or trade your personal information to
 third parties for marketing purposes. We do not share your
 devotional profile data (gotra, nakshatra, spiritual
 preferences) with advertisers.
 </p>
 </PolicySection>

 <PolicySection title="5. Data Security">
 <p>
 We implement appropriate technical and organizational measures
 to protect your data:
 </p>
 {/*
  TC-10. This bullet used to read "Database hosted on Supabase with
  row-level security policies." That was a false security representation,
  not an overstatement: the 67 Prisma models are covered by zero RLS
  statements across 36 Prisma migrations and all of apps/api. The only
  ENABLE ROW LEVEL SECURITY / CREATE POLICY in the repository covers two
  auxiliary tables outside the Prisma chain (antim_sanskar_pandits,
  wedding_vendors, in supabase/migrations). Even if a policy existed, the
  application path would bypass it: Prisma connects as the Supabase
  `postgres` owner role, which is exempt unless FORCE ROW LEVEL SECURITY
  is set (it is set nowhere), and the admin Supabase client uses the
  service-role key, which bypasses RLS by design.

  What replaced it is verified true rather than merely safer: apps/web
  makes no PostgREST table query at all — the only browser Supabase data
  call in the app is `supabase.storage.from(bucket)` in
  components/provider/VideoProofUpload.tsx, which is Storage, not a table
  — and apps/mobile has no Supabase client. That property is now pinned
  by app/privacy/__tests__/privacy-claims-stay-true.test.ts, so the
  sentence cannot quietly become false again.

  TO MAKE THE ORIGINAL CLAIM TRUE (do not restore the sentence before all
  four are done): (1) ENABLE ROW LEVEL SECURITY plus a deny-by-default
  CREATE POLICY per user-data table, added as ordinary Prisma migrations
  so they are versioned and auto-applied on API boot; (2) ALTER TABLE ...
  FORCE ROW LEVEL SECURITY on each, or move Prisma off the owner role to
  a non-owner application role, otherwise every policy is inert for the
  path that carries all the traffic; (3) stop the admin client's
  service-role key from serving user-scoped reads, since it bypasses RLS
  unconditionally; (4) a migration test asserting relrowsecurity is true
  for every table this policy names. Steps 1, 2 and 4 are code; step 3 is
  an architecture change. Until then this bullet must describe
  application-layer authorisation, which is what actually runs.
 */}
 <ul>
 <li>All data transmitted over HTTPS/TLS encryption.</li>
 <li>
 Database access is restricted to our authenticated API. Every read
 and write is authorised in the application layer against your
 identity and role, and the database is never reachable from your
 browser or from a mobile app.
 </li>
 <li>Payment processing handled by PCI DSS Level 1 compliant providers.</li>
 <li>Priest access to sankalp data is limited to active bookings only.</li>
 <li>Regular security audits and vulnerability assessments.</li>
 <li>Employee access to user data is restricted on a need-to-know basis.</li>
 </ul>
 </PolicySection>

 <PolicySection title="6. Data Retention">
 <p>
 We retain your account data for as long as your account is
 active. Booking records and transaction history are retained for
 7 years as required by Indian tax and accounting regulations.
 You may request deletion of your account and associated data at
 any time from{" "}
 <a
 href="/account/privacy"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 Your data &amp; privacy
 </a>
 , or by contacting {COMPANY.supportEmail}. Upon deletion,
 we remove personal data within 30 days, except where retention
 is required by law.
 </p>
 </PolicySection>

 <PolicySection title="7. Cookies & Analytics">
 <p>
 We use essential cookies for authentication and session
 management. We use PostHog for anonymous product analytics to
 understand feature usage and improve the Platform. Our Platform
 functions without non-essential cookies, though some
 personalization features may be limited.
 </p>
 {/* LEG-15: withdrawal must be as easy as consent, so the control sits
     here as well as on the Cookie Policy — not an instruction to go
     hunting through browser settings. */}
 <p>
 Analytics and marketing cookies run only with your consent, and you
 can change or withdraw that choice at any time:
 </p>
 <p>
 <CookieSettingsButton />
 </p>
 <p>
 Full detail is in our{" "}
 <a
 href="/legal/cookies"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 Cookie Policy
 </a>
 .
 </p>
 </PolicySection>

 <PolicySection title="8. Your Rights">
 <p>You have the right to:</p>
 <ul>
 <li>Access the personal data we hold about you.</li>
 <li>Correct inaccurate or incomplete data.</li>
 <li>Request deletion of your account and data.</li>
 <li>Withdraw consent for marketing communications at any time.</li>
 <li>Request a copy of your data in a portable format.</li>
 <li>Object to processing of your data for specific purposes.</li>
 </ul>
 {/* LEG-16: this section used to offer exactly one channel — an email
     address this file's own single source of truth calls "aspirational" —
     while POST /api/v1/dpdp/dsar had been shipped and reachable from no UI
     at all. The self-serve screen is the primary route now; the inbox stays
     as the fallback for people without an account. */}
 <p>
 Signed in? Exercise any of these rights yourself at{" "}
 <a
 href="/account/privacy"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 Your data &amp; privacy
 </a>
 . Every request is logged with a statutory deadline and answered in
 writing.
 </p>
 <p>
 No account, or prefer email? Write to{" "}
 {rightsContactEmail()} from your
 registered email address and we will file it for you.
 </p>
 </PolicySection>

 <PolicySection title="9. DPDP Act 2023 Compliance (India)">
 <p>
 Darshya complies with the Digital Personal Data Protection Act,
 2023 (&quot;DPDP Act&quot;). For users in India, we act as a Data
 Fiduciary and process your personal data on the lawful basis of
 your consent or for performance of a contract (e.g., a booking).
 Specifically, we ensure that:
 </p>
 <ul>
 <li>
 Consent is obtained at the point of collection in clear, plain
 language; you may withdraw consent at any time without penalty.
 </li>
 <li>
 You may exercise your rights under Sections 11–14 of the Act:
 right to access, correction, erasure, grievance redressal, and
 nomination.
 </li>
 <li>
 We retain personal data only for as long as necessary for the
 specified purpose, or as required by Indian law.
 </li>
 <li>
 We notify the Data Protection Board of India and affected
 users of any personal data breach without undue delay.
 </li>
 <li>
 Children&apos;s data (under 18) is processed only with verifiable
 parental consent and never used for tracking, behavioural
 monitoring, or targeted advertising.
 </li>
 </ul>
 <p>
 <strong>Grievance redressal:</strong> For DPDP-related complaints,
 contact {grievanceOfficerLine()} {grievanceSlaLine()} This is the
 same contact and the same timeline published in our{" "}
 <a
 href="/refunds"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 Refund Policy
 </a>
 .
 </p>
 </PolicySection>

 <PolicySection title="10. Children's Privacy">
 <p>
 Darshya is not directed at children under the age of 13. We
 do not knowingly collect personal information from children. If
 we become aware that a child under 13 has provided us with
 personal data, we will take steps to delete such information.
 Minors between 13 and 18 may use the Platform with parental
 consent.
 </p>
 </PolicySection>

 <PolicySection title="11. Changes to This Policy">
 <p>
 We may update this Privacy Policy from time to time. Material
 changes will be communicated via email or a prominent notice on
 the Platform at least 15 days before they take effect. Your
 continued use of the Platform after the effective date
 constitutes acceptance of the revised policy.
 </p>
 </PolicySection>

 <PolicySection title="12. Contact Us">
 <p>
 For privacy-related queries or to exercise your data rights:
 </p>
 <ul>
 <li>Email: {rightsContactEmail()}</li>
 {postalContactLine() && <li>{postalContactLine()}</li>}
 </ul>
 </PolicySection>
 </div>
 </div>
 </section>
 </div>
 );
}

function PolicySection({
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
