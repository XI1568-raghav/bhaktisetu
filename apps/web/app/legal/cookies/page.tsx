import type { Metadata } from "next";
import CookieSettingsButton from "../../../components/CookieSettingsButton";
import { rightsContactEmail } from "../../../lib/company";
import { H1 } from '../../../components/ui/heading-recipe';


export const metadata: Metadata = {
 title: "Cookie Policy",
 description:
 "How Darshya uses cookies, the categories we run, and how to change your consent at any time.",
 alternates: { canonical: "https://darshya.online/legal/cookies" },
 openGraph: {
 images: ['/images/golden-temple-og.jpg'],
 title: "Cookie Policy | Darshya",
 description:
 "How Darshya uses cookies, the categories we run, and how to change your consent at any time.",
 url: "https://darshya.online/legal/cookies",
 type: "website",
 },
};

export default function CookiePolicyPage() {
 return (
 <div className="min-h-[100dvh] bg-white">
 <section className="border-b border-surface-200 bg-surface-50 py-12 sm:py-16">
 <div className="mx-auto max-w-3xl px-6 sm:px-8">
 <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-saffron-700">
 Legal
 </p>
 <h1 className={H1.catalogue}>
 Cookie Policy
 </h1>
 <p className="mt-3 text-base text-surface-700">
 We use cookies and similar technologies for essential service delivery and,
 with your consent, for analytics and marketing. You can change your choices
 at any time.
 </p>
 <p className="mt-2 text-sm text-surface-600">Last updated: 14 June 2026</p>
 </div>
 </section>

 <section className="mx-auto max-w-3xl px-6 py-10 sm:px-8 sm:py-14">
 <article className="prose prose-slate max-w-none">
 <h2>Categories we use</h2>
 <table>
 <thead>
 <tr>
 <th>Category</th>
 <th>Purpose</th>
 <th>Examples</th>
 <th>Lawful basis</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td>Essential</td>
 <td>Sign-in, cart, fraud protection, load balancing</td>
 <td>session, csrf, cf_clearance</td>
 <td>Strictly necessary (no consent required)</td>
 </tr>
 <tr>
 <td>Analytics</td>
 <td>Product analytics, performance monitoring</td>
 <td>PostHog (EU), Cloudflare Web Analytics</td>
 <td>Consent</td>
 </tr>
 <tr>
 <td>Marketing</td>
 <td>Conversion measurement, retargeting</td>
 <td>Google Ads pixel, Meta Pixel</td>
 <td>Consent</td>
 </tr>
 </tbody>
 </table>

 <h2>Your choices</h2>
 <p>
 The first time you visit, our cookie banner asks you to Accept all, Reject
 all, or set per-category preferences. Reject-all and Accept-all buttons are
 the same size and prominence, as required by the UK ICO.
 </p>
 {/* LEG-15: this paragraph used to tell the reader to delete a
     localStorage key by hand. Withdrawal must be as easy as consent
     (UK GDPR Art. 7(3), DPDP Act s.6(4)), so the control lives here. */}
 <p>
 You can change or withdraw your choices at any time — it takes the same
 one click that granted them. The button below re-opens the same
 preference panel you saw on your first visit, with your current
 choices already selected.
 </p>
 <p>
 <CookieSettingsButton />
 </p>
 <p>
 Prefer we do it for you? Email{" "}
 <a href={`mailto:${rightsContactEmail()}`}>{rightsContactEmail()}</a> and we
 will clear the record of your consent on request.
 </p>

 <h2>Browser controls</h2>
 <p>
 Most browsers let you block cookies entirely or by category. Doing so may
 break parts of the site that rely on essential cookies (sign-in, cart).
 </p>

 <h2>Re-prompt</h2>
 <p>
 We re-prompt for consent at least every 12 months or after a material change
 to this policy.
 </p>

 <h2>Contact</h2>
 <p>
 Questions about cookies or your data?{" "}
 <a href={`mailto:${rightsContactEmail()}`}>{rightsContactEmail()}</a>. UK
 residents may also see our{" "}
 <a href="/legal/privacy-uk">UK Privacy Notice</a>.
 </p>
 </article>
 </section>
 </div>
 );
}
