import type { Metadata } from "next";


export const metadata: Metadata = {
 title: "UK Privacy Notice | Darshya",
 description:
 "UK-specific privacy notice for Darshya users. Lawful basis, your UK GDPR rights, transfers, and how to contact us.",
 alternates: { canonical: "https://darshya.online/legal/privacy-uk" },
 openGraph: {
 title: "UK Privacy Notice | Darshya",
 description:
 "UK-specific privacy notice for Darshya users. Lawful basis, your UK GDPR rights, transfers, and how to contact us.",
 url: "https://darshya.online/legal/privacy-uk",
 type: "website",
 },
};

export default function PrivacyUkPage() {
 return (
 <div className="min-h-[100dvh] bg-white">
 <section className="border-b border-surface-200 bg-surface-50 py-12 sm:py-16">
 <div className="mx-auto max-w-3xl px-6 sm:px-8">
 <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-saffron-700">
 Legal · United Kingdom
 </p>
 <h1 className="text-3xl font-semibold text-surface-900 sm:text-4xl">
 UK Privacy Notice
 </h1>
 <p className="mt-3 text-base text-surface-700">
 This UK addendum supplements our main{" "}
 <a href="/privacy" className="underline">
 Privacy Policy
 </a>{" "}
 and explains how Darshya handles personal data of UK residents under the UK
 GDPR and the Data Protection Act 2018.
 </p>
 <p className="mt-2 text-sm text-surface-600">Last updated: 14 June 2026</p>
 </div>
 </section>

 <section className="mx-auto max-w-3xl px-6 py-10 sm:px-8 sm:py-14">
 <article className="prose prose-slate max-w-none">
 <h2>Who we are</h2>
 <p>
 Bhaktisetu Technologies Pvt Ltd (&quot;Darshya&quot;, &quot;we&quot;, &quot;our&quot;) is the
 controller of personal data we collect from UK residents. You can reach our
 privacy team at{" "}
 <a href="mailto:privacy@darshya.online">privacy@darshya.online</a>.
 </p>
 <p>
 As we do not have a UK or EU establishment, we are in the process of
 appointing a UK representative under Article 27 UK GDPR. Contact details
 will be published here once finalised.
 </p>

 <h2>What we collect and why</h2>
 <p>
 Detailed processing records are in our{" "}
 <a href="https://github.com/" rel="nofollow" className="underline">
 ROPA
 </a>
 . In short, we process:
 </p>
 <ul>
 <li>
 <strong>Account data</strong> (name, email, phone) to operate your account
 — lawful basis: contract.
 </li>
 <li>
 <strong>Booking data</strong> (puja type, date, recipient) to deliver the
 service — lawful basis: contract.
 </li>
 <li>
 <strong>Payment data</strong> (amount, billing country, last4) for
 invoicing — lawful basis: contract and legal obligation.
 </li>
 <li>
 <strong>Marketing data</strong> (preferences, engagement) for festival
 reminders — lawful basis: consent. You can withdraw any time.
 </li>
 <li>
 <strong>Analytics data</strong> (pseudonymised events) to improve the
 product — lawful basis: consent via our cookie banner.
 </li>
 </ul>

 <h2>How long we keep it</h2>
 <p>
 Bookings, invoices and payment data are retained for 7 years to meet Indian
 tax law. Marketing data is retained until you withdraw consent, with a
 12-month suppression list to honour your opt-out. Analytics data is retained
 for 13 months.
 </p>

 <h2>International transfers</h2>
 <p>
 Your data is processed in India (our home jurisdiction) and may be processed
 by sub-processors in the United States (Stripe, Resend, Twilio) and the EU
 (PostHog). For all transfers we rely on either the UK International Data
 Transfer Agreement (IDTA), the UK Addendum to the EU Standard Contractual
 Clauses, or applicable adequacy regulations. A copy of the relevant
 safeguards is available on request.
 </p>

 <h2>Your UK GDPR rights</h2>
 <p>You can ask us to:</p>
 <ul>
 <li>access the data we hold about you (Art. 15);</li>
 <li>correct inaccurate data (Art. 16);</li>
 <li>erase your data (Art. 17), subject to legal-hold exceptions;</li>
 <li>restrict our processing (Art. 18);</li>
 <li>receive a portable copy (Art. 20);</li>
 <li>object to processing including marketing (Art. 21).</li>
 </ul>
 <p>
 Email <a href="mailto:privacy@darshya.online">privacy@darshya.online</a>{" "}
 with the subject line &quot;UK DSAR&quot; or use the in-app request tool in your
 account settings. We respond within 30 days. There is no fee unless a
 request is manifestly unfounded or excessive.
 </p>

 <h2>Complaints</h2>
 <p>
 We hope to resolve any concern directly. You also have the right to lodge a
 complaint with the UK Information Commissioner&apos;s Office (ICO):
 </p>
 <p>
 <a href="https://ico.org.uk/" rel="noreferrer" target="_blank">
 ico.org.uk
 </a>{" "}
 · 0303 123 1113 · Wycliffe House, Water Lane, Wilmslow, Cheshire, SK9 5AF.
 </p>

 <h2>Children</h2>
 <p>
 Our services are not directed to children under 13. We do not knowingly
 collect personal data from children. If you believe a child has provided us
 data, contact{" "}
 <a href="mailto:privacy@darshya.online">privacy@darshya.online</a> and we
 will delete it.
 </p>

 <h2>Cookies and tracking</h2>
 <p>
 See our <a href="/legal/cookies">Cookie Policy</a> for the full list of
 cookies and how to change your preferences. Non-essential cookies (analytics,
 marketing) only run with your consent and you can change settings any time.
 </p>

 <h2>Changes to this notice</h2>
 <p>
 We&apos;ll post material changes here and, where required, notify you by email.
 The &quot;last updated&quot; date above always reflects the most recent revision.
 </p>
 </article>
 </section>
 </div>
 );
}
