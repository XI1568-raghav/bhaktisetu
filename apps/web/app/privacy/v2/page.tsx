import type { Metadata } from "next";
import Link from "next/link";
import { H1 } from '../../../components/ui/heading-recipe';
import {
 COMPANY,
 grievanceOfficerLine,
 grievanceSlaLine,
 operatedByLine,
 postalContactLine,
 rightsContactEmail,
} from "../../../lib/company";

export const metadata: Metadata = {
 title: "Privacy Policy v2 (Multi-Geo)",
 description:
 "Darshya's multi-geo Privacy Policy v2 covering India DPDP, EU GDPR, US CCPA, UK, Canada PIPEDA, and Australia Privacy Act 1988.",
 alternates: { canonical: "https://darshya.online/privacy/v2" },
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title: "Privacy Policy v2 (Multi-Geo) | Darshya",
 description:
 "Darshya's multi-geo Privacy Policy v2 covering DPDP + GDPR + CCPA + UK + Canada + Australia.",
 url: "https://darshya.online/privacy/v2",
 type: "website",
 },
};

export default function PrivacyV2Page() {
 return (
 <div className="min-h-[100dvh]" style={{ background: "var(--color-bg)" }}>
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-3xl mx-auto px-6 sm:px-8">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Legal · Multi-Geo
 </p>
 <h1
 className={`${H1.catalogue} mb-3`}
 >
 Privacy Policy v2 (Multi-Geo)
 </h1>
 <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
 Effective: 2026-06-14 · Version 2.0 · Applies globally
 </p>
 <p className="text-sm mt-4" style={{ color: "var(--color-text-muted)" }}>
 Looking for the prior India-only version? See the{" "}
 <Link href="/privacy" className="underline" style={{ color: "var(--color-primary)" }}>
 Privacy Policy v1
 </Link>
 .
 </p>
 </div>
 </section>

 <section className="py-14 sm:py-20">
 <div className="max-w-3xl mx-auto px-6 sm:px-8 space-y-10">
 <PolicySection title="1. Scope and applicability">
 <p>
 {operatedByLine()} This Policy v2 governs how Darshya processes personal data
 across all jurisdictions where it operates: India (DPDP Act 2023), the European
 Union and EEA (GDPR + ePrivacy), the United Kingdom (UK GDPR), the United
 States (CCPA/CPRA for California residents and analogous state laws elsewhere),
 Canada (PIPEDA), and Australia (Privacy Act 1988 + Australian Privacy
 Principles).
 </p>
 <p>
 We auto-detect your geo via IP and browser locale to present the right legal
 basis and rights section. Where geo cannot be detected, we default to the
 strictest combined standard (GDPR + DPDP).
 </p>
 </PolicySection>

 <PolicySection title="2. Data we collect">
 <ul className="list-disc list-inside space-y-2">
 <li>
 <strong>Account data:</strong> phone number, email, name, optional gotra,
 city/country.
 </li>
 <li>
 <strong>Booking and devotional data:</strong> puja type, scheduled date,
 sankalp (intent), temple selection, video proof links.
 </li>
 <li>
 <strong>Payment data:</strong> handled by Razorpay, our payment processor for
 domestic and international transactions. We do not store card numbers.
 </li>
 <li>
 <strong>Device data:</strong> IP address (anonymised after 30 days),
 user-agent, OS, browser, language.
 </li>
 <li>
 <strong>Analytics:</strong> PostHog event stream. EU/UK users must opt in via
 our consent banner. Other geos opt out at any time.
 </li>
 </ul>
 </PolicySection>

 <PolicySection title="3. Purposes and legal basis (per regime)">
 <p>
 We process personal data under the following legal bases. Where multiple bases
 apply, we rely on the most user-protective.
 </p>
 <ul className="list-disc list-inside space-y-2">
 <li>
 <strong>India (DPDP):</strong> express consent for processing, contractual
 necessity for bookings, legitimate use for service improvement.
 </li>
 <li>
 <strong>EU/EEA (GDPR Art 6):</strong> (a) consent for analytics + marketing,
 (b) contract for puja bookings, (c) legal obligation for tax/80G receipts, (d)
 legitimate interest for fraud prevention.
 </li>
 <li>
 <strong>UK (UK GDPR):</strong> mirrors EU basis above; ICO is supervisory authority.
 </li>
 <li>
 <strong>US — California (CCPA/CPRA):</strong> notice at collection, opt-out
 of sale/sharing, opt-out of targeted advertising. We do not sell personal
 information.
 </li>
 <li>
 <strong>Canada (PIPEDA):</strong> meaningful consent, accountability,
 limiting collection. Provincial laws (Quebec Law 25, BC PIPA, Alberta PIPA)
 honoured where stricter.
 </li>
 <li>
 <strong>Australia (Privacy Act 1988 + APPs):</strong> APP 3 collection
 notice, APP 6 use and disclosure, APP 12 access rights.
 </li>
 </ul>
 </PolicySection>

 <PolicySection title="4. Cookies and tracking (Consent Management)">
 <p>
 For EU, EEA, UK and California visitors, we display an explicit Consent
 Management Platform (CMP) banner on first visit. You may grant or refuse
 analytics, advertising, and functional cookies independently. Strictly
 necessary cookies (session, CSRF) do not require consent.
 </p>
 <p>
 For all other geos, the same controls are available via Settings → Privacy →
 Cookie preferences.
 </p>
 </PolicySection>

 <PolicySection title="5. Cross-border data transfer">
 {/*
  TC-10. This section used to open with "Primary data centres are in
  Mumbai, India (Supabase ap-south-1)." That was false, and falsely
  reassuring in the direction that matters: it told an Indian data
  principal their data stays in India, when no part of the deployment is
  in India at all.

  What the repository actually shows:
   - render.yaml pins BOTH services (the `bhaktisetu` API and
     `darshya-web`) to `region: oregon`. Every application server is in
     the United States. Render does not offer an India region, so no
     Render deployment could have put primary compute in Mumbai.
   - The recorded production database host is
     `aws-1-ap-northeast-1.pooler.supabase.com` — AWS Tokyo. It appears in
     three tracked audit artifacts: docs/audit/prod-sweep-raw-2026-08-12.md,
     docs/audit/agent-results-wave1.json and
     docs/audit/agent-results-partials.json. `ap-south-1` appears nowhere
     as a Supabase region; the only ap-south-1 in the tree is AWS_REGION
     for S3/IVS in .env.example, which is a different service.

  The compute region is named here because render.yaml pins it and
  app/privacy/__tests__/privacy-data-residency.test.ts cross-checks the two
  — move the service to Frankfurt or Singapore without updating this
  sentence and that test fails. The database region is deliberately NOT
  named: it lives in a deployment environment variable rather than in the
  repo, so a region id here could rot silently, which is exactly how
  `ap-south-1` came to sit next to a Tokyo database and how the sibling
  policy came to say "EU-region" about the same one. What is stated
  instead is the property that holds whichever region is configured, and
  that is the property the DPDP transfer question turns on: the data is
  outside India.

  TO NAME THE DATABASE REGION HERE: pin it in the repository first (an
  asserted region in render.yaml env config, or a startup check that
  resolves the DIRECT_URL host and refuses to boot on a mismatch), then
  add it to the cross-check in the test above. Until then this paragraph
  must stay at the jurisdiction level.
 */}
 <p>
 Your personal data is stored and processed outside India. Our application
 servers run in the United States (Render, Oregon region), and our managed
 Postgres database is hosted by Supabase in an Asia-Pacific region outside
 India. Some processors operate in the US (Anthropic for AI Pandit, Resend
 for transactional email) or the EU (Cloudflare edge POPs).
 </p>
 <p>
 EU/UK personal data crossing to the US is protected via Standard Contractual
 Clauses (SCCs) and supplementary measures per Schrems II. Because none of the
 infrastructure above sits in India, personal data of users in India is
 transferred abroad in every case; those transfers are made in line with DPDP
 Section 16. California data transfers are limited to service-provider
 relationships permitted under CCPA §1798.140.
 </p>
 </PolicySection>

 <PolicySection title="6. Your rights (per regime)">
 <div className="space-y-4">
 <RightsBlock geo="India (DPDP Act 2023)">
 Access, correction, completion, updating, erasure, withdrawal of consent,
 grievance redressal within 30 days. Contact our Data Protection Officer.
 </RightsBlock>
 <RightsBlock geo="EU / EEA / UK (GDPR / UK GDPR)">
 Access, rectification, erasure (right to be forgotten), restriction,
 portability, objection, automated-decision opt-out. Complaint to your
 local supervisory authority (e.g. CNIL, BfDI, ICO) is your right.
 </RightsBlock>
 <RightsBlock geo="California, USA (CCPA / CPRA)">
 Right to know, right to delete, right to correct, right to opt-out of sale
 or sharing, right to limit use of sensitive personal information,
 non-discrimination for exercising rights. Authorised agent requests honoured.
 </RightsBlock>
 <RightsBlock geo="Canada (PIPEDA + Provincial)">
 Right to access, right to challenge accuracy, complaint to OPC or provincial
 commissioner.
 </RightsBlock>
 <RightsBlock geo="Australia (Privacy Act 1988)">
 APP 12 access, APP 13 correction, complaint to OAIC.
 </RightsBlock>
 </div>
 <p className="mt-4">
 To exercise any right, email{" "}
 <a
 href={`mailto:${rightsContactEmail()}`}
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 {rightsContactEmail()}
 </a>
 . We respond within 30 days (DPDP/GDPR) or 45 days (CCPA), extendable once
 with notice.
 </p>
 </PolicySection>

 <PolicySection title="7. Data Protection Officer and grievance contact">
 <p>
 <strong>Data protection contact:</strong>{" "}
 <a
 href={`mailto:${rightsContactEmail()}`}
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 {rightsContactEmail()}
 </a>
 </p>
 {/* LEG-11: this used to point at /grievance, a route that does not exist,
 and at a dpo@ inbox this codebase never declared. One grievance block,
 owned by lib/company.ts, identical to /privacy, /refunds and /contact. */}
 <p>
 <strong>India grievance redressal:</strong> {grievanceOfficerLine()}{" "}
 {grievanceSlaLine()} See also our{" "}
 <Link
 href="/privacy"
 className="underline"
 style={{ color: "var(--color-primary)" }}
 >
 India privacy notice
 </Link>
 .
 </p>
 <p>
 <strong>EU/UK representative:</strong> to be appointed under GDPR Art 27 /
 UK GDPR Art 27 prior to active EU/UK marketing. Until then, use the data
 protection contact above.
 </p>
 <p>{postalContactLine()}</p>
 </PolicySection>

 <PolicySection title="8. Data retention">
 <p>
 We retain personal data only as long as necessary for the purposes outlined
 above or as required by law.
 </p>
 <ul className="list-disc list-inside space-y-2">
 <li>Account data: lifetime of account + 7 years post-deletion (tax law).</li>
 <li>Booking + payment records: 7 years (Indian Income Tax Act / GST).</li>
 <li>Video proof of puja: 12 months from puja date.</li>
 <li>Analytics: 26 months (GA4 default) or sooner on opt-out.</li>
 <li>Anonymised IP logs: 30 days.</li>
 </ul>
 </PolicySection>

 <PolicySection title="9. Children">
 <p>
 Darshya is not directed at children under 18. We do not knowingly collect
 data from minors. If we learn we have collected data from a person under 18,
 we delete it immediately and notify the parent or guardian where possible.
 </p>
 </PolicySection>

 <PolicySection title="10. Changes to this Policy">
 <p>
 Material changes are notified via email, WhatsApp (where you have given
 consent) and an in-app banner at least 30 days before they take effect. The
 current version and effective date appear at the top of this page.
 </p>
 </PolicySection>

 <PolicySection title="11. Version history">
 <ul className="list-disc list-inside space-y-2">
 <li>v2.0 — 2026-06-14 — Multi-geo (DPDP + GDPR + CCPA + UK + PIPEDA + Privacy Act 1988).</li>
 <li>
 v1.0 — 2026-05-02 — India-only DPDP baseline (see{" "}
 <Link href="/privacy" className="underline" style={{ color: "var(--color-primary)" }}>
 /privacy
 </Link>
 ).
 </li>
 </ul>
 </PolicySection>
 </div>
 </section>
 </div>
 );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
 return (
 <section>
 <h2
 className="text-lg sm:text-xl font-semibold mb-4"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 {title}
 </h2>
 <div
 className="space-y-4 text-sm leading-relaxed"
 style={{ color: "var(--color-text)" }}
 >
 {children}
 </div>
 </section>
 );
}

function RightsBlock({ geo, children }: { geo: string; children: React.ReactNode }) {
 return (
 <div
 className="rounded-lg border p-4"
 style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
 >
 <p className="font-semibold mb-2" style={{ color: "var(--color-text)" }}>
 {geo}
 </p>
 <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
 {children}
 </p>
 </div>
 );
}

void COMPANY;
