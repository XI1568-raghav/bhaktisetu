import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Darshya\u2019s privacy policy. Learn how we collect, use, and protect your personal and devotional data.",
};

export default function PrivacyPage() {
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
            Privacy Policy
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
            <PolicySection title="1. Introduction">
              <p>
                Darshya Technologies Private Limited (&quot;Darshya,&quot; &quot;we,&quot;
                &quot;our,&quot; or &quot;us&quot;) operates the Darshya platform, including the
                website at darshya.online, mobile applications, and related
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
                  Razorpay (domestic) and Stripe (international). We do not store
                  your full card number, CVV, or bank credentials on our servers.
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

            <PolicySection title="4. Information Sharing">
              <p>We share your information only in these limited circumstances:</p>
              <ul>
                <li>
                  <strong>Temple Priests:</strong> Sankalp details (devotee name,
                  gotra, nakshatra, and puja purpose) are shared with the
                  assigned priest solely for performing the booked ritual.
                </li>
                <li>
                  <strong>Payment Processors:</strong> Razorpay and Stripe process
                  your payment data under their own privacy policies and PCI DSS
                  compliance.
                </li>
                <li>
                  <strong>Delivery Partners:</strong> Your shipping address is
                  shared with logistics providers for prasad and store order
                  deliveries.
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
              <ul>
                <li>All data transmitted over HTTPS/TLS encryption.</li>
                <li>Database hosted on Supabase with row-level security policies.</li>
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
                any time by contacting support@darshya.online. Upon deletion,
                we remove personal data within 30 days, except where retention
                is required by law.
              </p>
            </PolicySection>

            <PolicySection title="7. Cookies & Analytics">
              <p>
                We use essential cookies for authentication and session
                management. We use PostHog for anonymous product analytics to
                understand feature usage and improve the Platform. You may
                disable non-essential cookies through your browser settings.
                Our Platform functions without non-essential cookies, though
                some personalization features may be limited.
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
              <p>
                To exercise any of these rights, email us at
                privacy@darshya.online with your registered email address.
              </p>
            </PolicySection>

            <PolicySection title="9. Children's Privacy">
              <p>
                Darshya is not directed at children under the age of 13. We
                do not knowingly collect personal information from children. If
                we become aware that a child under 13 has provided us with
                personal data, we will take steps to delete such information.
                Minors between 13 and 18 may use the Platform with parental
                consent.
              </p>
            </PolicySection>

            <PolicySection title="10. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. Material
                changes will be communicated via email or a prominent notice on
                the Platform at least 15 days before they take effect. Your
                continued use of the Platform after the effective date
                constitutes acceptance of the revised policy.
              </p>
            </PolicySection>

            <PolicySection title="11. Contact Us">
              <p>
                For privacy-related queries or to exercise your data rights:
              </p>
              <ul>
                <li>Email: privacy@darshya.online</li>
                <li>
                  Mail: Darshya Technologies Pvt. Ltd., HSR Layout,
                  Bengaluru &ndash; 560102, Karnataka, India
                </li>
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
