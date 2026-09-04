import type { Metadata } from "next";
import Link from "next/link";
import {
 COMPANY,
 postalContactLine,
 rightsContactEmail,
} from "../../lib/company";
import { H1 } from "../../components/ui/heading-recipe";

/**
 * /data-deletion — the PUBLIC account-deletion request page (LC-DEL).
 *
 * WHY IT EXISTS, AND WHY IT CANNOT LIVE UNDER /account.
 *
 * Google Play's Data safety form asks for a URL where a user can request
 * deletion of their account and data, and a Play reviewer opens that URL
 * SIGNED OUT — they have no Darshya account and will not make one. The only
 * erasure UI this product had was app/account/privacy, which is wrapped in
 * <AuthGuard> and whose own layout declares it "a signed-in surface:
 * noindex, nofollow" (app/account/privacy/layout.tsx:19-24). A reviewer
 * hitting it sees a login screen, and the Data safety declaration fails.
 *
 * So the requirement is not "another erasure form" — it is a page that
 * renders completely for a visitor with no cookie. Three things had to hold
 * for that, and all three were checked rather than assumed:
 *
 *   1. middleware.ts gates only the eight prefixes in PORTAL_PREFIXES
 *      (/admin, /priest, /store-admin, /astrologer-portal, /wellness-portal,
 *      /gaushala-portal, /temple-portal, /payouts). `/data-deletion` is in
 *      none of them, so the middleware's only effect here is the locale
 *      cookie read and the Content-Language header — no redirect.
 *   2. The only layout above this route is the root layout, which imposes
 *      chrome, not a gate.
 *   3. This file is a Server Component with no `use client`, no auth-context
 *      read and no fetch. Nothing on it can be blocked by a missing session.
 *
 * WHY THERE IS NO FORM ON THIS PAGE. Darshya has NO password column — every
 * credential is an OTP or a magic link (see the account-deletion service
 * header). A public "type your email and we will delete the account" form is
 * therefore an unauthenticated destroy button aimed at anyone whose address
 * is guessable: no possession factor, no knowledge factor, nothing between an
 * attacker and a devotee's booking history. Play asks for a page that tells a
 * user how to request deletion; it does not ask for an anonymous delete
 * endpoint. So this page routes people to the two authenticated paths and,
 * for anyone locked out of both, to the identity-checked support channel.
 *
 * EVERY FACT BELOW IS READ OFF THE IMPLEMENTATION, not drafted from a
 * template — apps/api/src/services/account-deletion.service.ts is the source
 * for the hard-delete list, the anonymise-and-retain list, the 30-day grace
 * window, the blocking states and the PAN rules.
 * __tests__/data-deletion-page.test.ts pins the ones a reviewer checks.
 */

const LAST_UPDATED = "September 2, 2026";

/** Mirrors GRACE_PERIOD_DAYS in apps/api/src/services/account-deletion.service.ts. */
const GRACE_PERIOD_DAYS = 30;

/**
 * The statutory window an erasure request is tracked against. Not a promise
 * invented here: confirmDeletion() files a `dsar_requests` row with
 * `sla_deadline = now() + interval '30 days'`, the same deadline every DPDP
 * request filed from /account/privacy carries.
 */
const DSAR_SLA_DAYS = 30;

export const metadata: Metadata = {
 title: "Delete Your Account",
 description:
 "How to delete your Darshya account and personal data — in the app, on the web, or by writing to us. What is erased, what is kept for tax and accounting, and the 30-day grace period.",
 alternates: { canonical: "https://darshya.online/data-deletion" },
 // Stated explicitly rather than left to the default. This page is useless to
 // a Play reviewer if it is ever noindexed, and it is the one legal page whose
 // discoverability is a store requirement.
 robots: { index: true, follow: true },
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title: "Delete Your Account | Darshya",
 description:
 "Request deletion of your Darshya account and personal data. What is erased, what is retained and why, and how long it takes.",
 url: "https://darshya.online/data-deletion",
 type: "website",
 },
};

const RETENTION_ROWS: Array<{ data: string; outcome: string; when: string }> = [
 {
 data: "Name, email, phone",
 outcome: "Permanently deleted",
 when: `After the ${GRACE_PERIOD_DAYS}-day grace period`,
 },
 {
 data: "Birth details, gotra, nakshatra, kundli inputs",
 outcome: "Permanently deleted",
 when: `After the ${GRACE_PERIOD_DAYS}-day grace period`,
 },
 {
 data: "Addresses, message bodies, support-ticket text",
 outcome: "Permanently deleted",
 when: `After the ${GRACE_PERIOD_DAYS}-day grace period`,
 },
 {
 data: "Device push tokens, notification preferences",
 outcome: "Deleted; sending stops at once",
 when: "Immediately on request",
 },
 {
 data: "Login credentials and auth identity",
 outcome: "Permanently deleted",
 when: `After the ${GRACE_PERIOD_DAYS}-day grace period`,
 },
 {
 data: "KYC bank account, IFSC, Aadhaar reference",
 outcome: "Permanently deleted",
 when: `After the ${GRACE_PERIOD_DAYS}-day grace period`,
 },
 {
 data: "Bookings, payments, commissions, payouts, donations",
 outcome: "Anonymised and retained; identity stripped",
 when: "Kept as long as Indian tax and accounting law requires",
 },
 {
 data: "PAN of a payee who has been paid",
 outcome: "Retained for TDS reporting",
 when: "Kept as long as Indian tax law requires",
 },
];

export default function DataDeletionPage() {
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
 <h1 className={`${H1.catalogue} mb-3`}>
 Delete Your Account and Data
 </h1>
 <p
 className="text-sm leading-relaxed mb-3"
 style={{ color: "var(--color-text-muted)" }}
 >
 This page applies to the {COMPANY.brand} mobile app and to the
 website at {COMPANY.domain}. You do not need to be signed in to read
 it.
 </p>
 <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
 Last updated: {LAST_UPDATED}
 </p>
 </div>
 </section>

 {/* Content */}
 <section className="py-14 sm:py-20">
 <div className="max-w-3xl mx-auto px-6 sm:px-8">
 <div className="space-y-10">
 <div
 className="rounded-xl border p-5 sm:p-6"
 style={{
 borderColor: "var(--color-border)",
 background: "var(--color-surface)",
 }}
 >
 <h2
 className="text-base font-semibold mb-3"
 style={{ color: "var(--color-text)" }}
 >
 In short
 </h2>
 <ul
 className="text-sm leading-relaxed space-y-2 list-disc pl-5"
 style={{ color: "var(--color-text-muted)" }}
 >
 <li>
 Ask from inside the {COMPANY.brand} app (
 <strong>Settings &rarr; Delete account</strong>), or on the web
 at{" "}
 <Link
 href="/account/privacy"
 className="underline underline-offset-2"
 style={{ color: "var(--color-primary)" }}
 >
 {COMPANY.domain}/account/privacy
 </Link>
 . If you cannot sign in, write to{" "}
 <a
 href={`mailto:${rightsContactEmail()}`}
 className="underline underline-offset-2"
 style={{ color: "var(--color-primary)" }}
 >
 {rightsContactEmail()}
 </a>
 .
 </li>
 <li>
 Your personal data — name, email, phone, birth details,
 addresses, messages, device tokens, login credentials — is
 destroyed.
 </li>
 <li>
 Financial and regulatory records — bookings, payments,
 commissions, payouts, donation receipts — are stripped of your
 identity and kept, because Indian tax and accounting rules
 require it.
 </li>
 <li>
 There is a {GRACE_PERIOD_DAYS}-day grace period before anything
 is destroyed. You can cancel the deletion at any point inside
 it.
 </li>
 </ul>
 </div>

 <Section title="1. How to request deletion">
 <h4>Option A — inside the {COMPANY.brand} app (fastest)</h4>
 <p>
 Open the app, go to{" "}
 <strong>Settings &rarr; Delete account</strong>, and follow the
 prompts. We send a one-time confirmation code to the email address
 or phone number on the account; entering it schedules the
 deletion. This path is self-service and needs nobody at our end.
 </p>

 <h4>Option B — on the web, signed in</h4>
 <p>
 Sign in at {COMPANY.domain}, open{" "}
 <Link
 href="/account/privacy"
 className="underline underline-offset-2"
 style={{ color: "var(--color-primary)" }}
 >
 Your Data &amp; Privacy
 </Link>
 , choose <strong>&quot;Delete my account and data&quot;</strong>{" "}
 and submit. The request is tracked on that same screen until it is
 closed.
 </p>

 <h4>Option C — if you cannot sign in at all</h4>
 <p>
 Email{" "}
 <a
 href={`mailto:${rightsContactEmail()}`}
 className="underline underline-offset-2"
 style={{ color: "var(--color-primary)" }}
 >
 {rightsContactEmail()}
 </a>{" "}
 from the email address on the account, with the subject{" "}
 <strong>Account deletion</strong>. If you signed up by phone and no
 longer control that number, raise it through{" "}
 <Link
 href="/support"
 className="underline underline-offset-2"
 style={{ color: "var(--color-primary)" }}
 >
 our support centre
 </Link>{" "}
 or the{" "}
 <Link
 href="/contact"
 className="underline underline-offset-2"
 style={{ color: "var(--color-primary)" }}
 >
 contact form
 </Link>
 , and we will verify you another way before acting.
 </p>
 <p>
 We do not delete an account on an email alone. {COMPANY.brand} has
 no password — every login is a one-time code or a magic link — so a
 request that skipped verification would let anyone who knows your
 address destroy your booking history. Every route above confirms
 that the request came from you.
 </p>
 <p>
 Erasure requests are tracked against the {DSAR_SLA_DAYS}-day
 statutory window that India&rsquo;s Digital Personal Data
 Protection Act sets for a data-principal request — the same
 deadline every request filed from the account screen carries.
 </p>
 </Section>

 <Section
 title={`2. What happens after you ask — the ${GRACE_PERIOD_DAYS}-day grace period`}
 >
 <ul>
 <li>
 <strong>Immediately:</strong> we stop every outbound channel —
 push notifications, WhatsApp messages, marketing email. You will
 not keep hearing from us while the window runs.
 </li>
 <li>
 <strong>For {GRACE_PERIOD_DAYS} days:</strong> the account stays
 usable and the deletion is reversible. Sign in and cancel it, or
 ask support to, and nothing is lost. This window exists because
 our logins are one-time codes: a hijacked SIM or a forwarded
 email should not be a one-tap destroy button over
 somebody&rsquo;s records.
 </li>
 <li>
 <strong>After {GRACE_PERIOD_DAYS} days:</strong> a scheduled job
 destroys the personal data listed in section 3 and anonymises
 the records listed in section 4. This step cannot be undone.
 </li>
 </ul>
 <p>
 If you would rather not wait, the app also offers an immediate
 deletion once you have entered the confirmation code. It skips the
 grace period, and it is irreversible the moment you confirm.
 </p>
 </Section>

 <Section title="3. What is permanently deleted">
 <p>These are erased outright — not hidden, not archived:</p>
 <ul>
 <li>Your name, email address and phone number.</li>
 <li>
 Birth details and astrology inputs used for kundli and sankalp —
 date, time and place of birth, gotra, nakshatra, rashi, kuldevta
 and family-member details.
 </li>
 <li>
 Delivery and postal addresses, including the copies written onto
 past store orders and bookings.
 </li>
 <li>
 Message bodies you wrote — chat conversations, support-ticket
 text, notes attached to a request.
 </li>
 <li>
 Device push-notification tokens and notification preferences.
 </li>
 <li>
 Login identities and credentials, including the account held in
 our authentication provider, so the account cannot be signed into
 or recreated from an old link.
 </li>
 <li>
 For pandits, temples, astrologers, teachers and sellers: KYC bank
 account number, IFSC, account-holder name and the Aadhaar
 reference.
 </li>
 </ul>
 </Section>

 <Section title="4. What is kept, anonymised — and why">
 <p>
 Bookings, payments, commissions, payout requests, temple payouts
 and donation receipts are <strong>not</strong> deleted. Amounts,
 dates, booking numbers and payment-gateway references stay; your
 identity is severed from them, and every copy of your name, email,
 phone or address that had been written onto those rows is stripped.
 Where your account still has to be referenced, it reads as{" "}
 <strong>&quot;Deleted User&quot;</strong>.
 </p>
 <p>There are two reasons, and both are real:</p>
 <ul>
 <li>
 <strong>The law requires it.</strong> Indian income-tax and
 accounting rules require financial records to be retained for
 years after the transaction. A deletion that destroyed them would
 put us in breach.
 </li>
 <li>
 <strong>They are not only yours.</strong> A booking is also a
 pandit&rsquo;s earnings record and a temple&rsquo;s payout
 record; a donation receipt is also the recipient&rsquo;s. Erasing
 the row would erase their side of it too.
 </li>
 </ul>
 <p>Two tax identifiers are treated separately from the rest of KYC:</p>
 <ul>
 <li>
 <strong>A donor&rsquo;s PAN.</strong>{" "}
 {COMPANY.donationLegal.HAS_80G_VERIFIED
 ? "Kept only on donations that actually produced a Section 80G receipt, because that certificate may have to be reissued. Deleted everywhere else."
 : `Deleted. Retaining it would only be defensible against a Section 80G certificate, and ${COMPANY.brand} does not hold one — so there is no receipt to reissue and no basis to keep it.`}
 </li>
 <li>
 <strong>A payee&rsquo;s PAN</strong> — a pandit, temple,
 astrologer, teacher or seller who has actually been paid. Kept
 for TDS reporting under the Income-tax Act. Bank account, IFSC,
 account-holder name and the Aadhaar reference are destroyed
 regardless.
 </li>
 </ul>
 <p>
 One consequence stated plainly, because it is the honest
 description of what happens: the account record itself is not
 dropped from the database. It is overwritten in place and left
 standing so the financial records that point at it stay valid. What
 survives is an identifier that resolves to nobody.
 </p>
 </Section>

 <Section title="5. Retention at a glance">
 <div className="overflow-x-auto">
 <table className="w-full min-w-[30rem] text-left border-collapse">
 <thead>
 <tr>
 <th
 className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide border-b"
 style={{
 color: "var(--color-text)",
 borderColor: "var(--color-border)",
 }}
 >
 Data
 </th>
 <th
 className="py-2 pr-4 text-xs font-semibold uppercase tracking-wide border-b"
 style={{
 color: "var(--color-text)",
 borderColor: "var(--color-border)",
 }}
 >
 What happens
 </th>
 <th
 className="py-2 text-xs font-semibold uppercase tracking-wide border-b"
 style={{
 color: "var(--color-text)",
 borderColor: "var(--color-border)",
 }}
 >
 When
 </th>
 </tr>
 </thead>
 <tbody>
 {RETENTION_ROWS.map((row) => (
 <tr key={row.data}>
 <td
 className="py-3 pr-4 align-top border-b"
 style={{ borderColor: "var(--color-border)" }}
 >
 {row.data}
 </td>
 <td
 className="py-3 pr-4 align-top border-b"
 style={{ borderColor: "var(--color-border)" }}
 >
 {row.outcome}
 </td>
 <td
 className="py-3 align-top border-b"
 style={{ borderColor: "var(--color-border)" }}
 >
 {row.when}
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 <p>
 Ordinary backups roll over on their own schedule, so a copy of a
 deleted record can persist in an encrypted backup for a short period
 after the purge. Backups are never used to restore a deleted
 account.
 </p>
 </Section>

 <Section title="6. When deletion is refused until something is settled">
 <p>
 We will not delete an account in the middle of a transaction,
 because doing so strands somebody — a devotee who has paid for an
 undelivered puja, or a pandit who has performed one and not been
 paid. The request is refused, with the reason, while any of these is
 open:
 </p>
 <ul>
 <li>
 A puja booking that is awaiting payment, confirmed, assigned to a
 pandit, in progress, or awaiting video proof.
 </li>
 <li>
 A store order that is pending, confirmed, being processed or
 shipped.
 </li>
 <li>
 A payout request that is pending or already being processed.
 </li>
 </ul>
 <p>
 Complete or cancel the item, then ask again. Nothing else blocks a
 deletion.
 </p>
 </Section>

 <Section title="7. Contact">
 <p>
 If any of this did not work, or you want to check on a request you
 already made:
 </p>
 <ul>
 <li>
 Email:{" "}
 <a
 href={`mailto:${rightsContactEmail()}`}
 className="underline underline-offset-2"
 style={{ color: "var(--color-primary)" }}
 >
 {rightsContactEmail()}
 </a>
 </li>
 <li>
 Support centre:{" "}
 <Link
 href="/support"
 className="underline underline-offset-2"
 style={{ color: "var(--color-primary)" }}
 >
 {COMPANY.domain}/support
 </Link>
 </li>
 <li>
 Contact form:{" "}
 <Link
 href="/contact"
 className="underline underline-offset-2"
 style={{ color: "var(--color-primary)" }}
 >
 {COMPANY.domain}/contact
 </Link>
 </li>
 {postalContactLine() && <li>{postalContactLine()}</li>}
 </ul>
 <p>
 How we collect and use data in the first place is set out in our{" "}
 <Link
 href="/privacy"
 className="underline underline-offset-2"
 style={{ color: "var(--color-primary)" }}
 >
 Privacy Policy
 </Link>
 .
 </p>
 </Section>
 </div>
 </div>
 </section>
 </div>
 );
}

function Section({
 title,
 children,
}: {
 title: string;
 children: React.ReactNode;
}) {
 return (
 <div>
 <h2
 className="text-base font-semibold mb-3"
 style={{ color: "var(--color-text)" }}
 >
 {title}
 </h2>
 <div
 className="text-sm leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-2 [&_h4]:text-sm [&_table]:text-sm"
 style={{ color: "var(--color-text-muted)" }}
 >
 {children}
 </div>
 </div>
 );
}
