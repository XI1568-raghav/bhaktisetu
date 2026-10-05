import type { Metadata } from "next";
import { getGaushalaImage, remoteSrcSet, IMG_W } from "../../lib/images";
import { ApprovedProvidersStrip } from "../../components/ApprovedProvidersStrip";
import {
 Heart,
 Shield,
 Camera,
 MapPin,
 BadgeCheck,
 FileText,
 Star,
 Users,
 IndianRupee,
 ArrowRight,
 Check,
 ChevronDown,
 Leaf,
} from "lucide-react";
import Link from "next/link";
import { COMPANY } from "../../lib/company";
import { HAS_ADOPTION_EXTRAS } from "../../lib/launch-gates";
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';

/**
 * COM-02 (prod sweep 2026-08-12): every 80G claim on this page is gated on the
 * one owner-controlled flag that records whether Darshya actually holds an
 * 80G(5) certificate. It is false today, and `donationLegal.eightyGNumber` is
 * null, so the receipt the donor receives is not an 80G instrument
 * (apps/api/src/lib/pdf-receipt.ts says so on the PDF itself now). Selling
 * "80G tax receipt" as a plan feature, badging "Save on income tax", and
 * answering "Is my donation tax-deductible?" with "Yes!" was a tax
 * misrepresentation to the donor. The copy returns the day the flag flips.
 */
const HAS_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

export const metadata: Metadata = {
 alternates: { canonical: 'https://darshya.online/gaushala' },
 title: "Gau Seva — Support a Gaushala",
 description:
 "Support a gaushala through Darshya. Choose a gau seva plan, get a receipt for every contribution, and help protect India's cows.",
};

/* ── Hardcoded data (matches API) ─────────────────────────────────────────────── */

// TC-11 (P2, trust) — THE THREE FABRICATED GAUSHALAS ARE GONE.
//
// This file used to carry `const gaushalas = [...]`: three cards naming real
// organisations in Vrindavan, Jaipur and Mathura, each stamped with a green
// "Verified" badge and a third-party credential a developer typed into the
// source ("ISKCON-affiliated", "Government Registered", "Organic Products
// Certified"), under the heading "Our Verified Gaushalas" and the sentence
// "Each gaushala is personally verified by our team. We ensure highest
// standards of cow care and complete financial transparency."
//
// None of it is performed anywhere in the product. GaushalaProfile.verified
// exists in the schema and nothing writes it — admin.service.ts approves by
// setting `approved`, routes/gaushala-portal.ts never mentions verification,
// and the only `verified: true` in apps/api is a MOCK fixture in
// provider.service.ts. Nothing audits a gaushala and no endpoint publishes one's
// finances. Awarding a named third party a credential on that basis is the most
// exposed version of this defect on the site.
//
// /donations had the identical fixtures removed for the same reason (S-05) and
// replaced with `getApprovedProviders('gaushala')` plus an honest empty state.
// This page already renders that component at the bottom, so the deletion
// leaves a real listing rather than a hole. Put a curated section back only when
// there is a signed partner to put in it.
const featuredCows = [
 {
 id: "cow_001",
 name: "Lakshmi",
 breed: "Gir",
 age: 5,
 gaushalaName: "Shri Krishna Gaushala",
 photo: getGaushalaImage('gir-cow'),
 healthStatus: "healthy",
 },
 {
 id: "cow_003",
 name: "Gauri",
 breed: "Tharparkar",
 age: 3,
 gaushalaName: "Shri Krishna Gaushala",
 photo: getGaushalaImage('tharparkar-cow'),
 healthStatus: "healthy",
 },
 {
 id: "cow_005",
 name: "Kamala",
 breed: "Gir",
 age: 4,
 gaushalaName: "Kamdhenu Gaushala",
 photo: getGaushalaImage('gir-cow'),
 healthStatus: "healthy",
 },
 {
 id: "cow_006",
 name: "Dhanvantari",
 breed: "Kankrej",
 age: 6,
 gaushalaName: "Kamdhenu Gaushala",
 photo: getGaushalaImage('gir-cow'),
 healthStatus: "under_treatment",
 },
 {
 id: "cow_008",
 name: "Bhola",
 breed: "Tharparkar",
 age: 2,
 gaushalaName: "Kamdhenu Gaushala",
 photo: getGaushalaImage('tharparkar-cow'),
 healthStatus: "healthy",
 },
 {
 id: "cow_010",
 name: "Surabhi",
 breed: "Gir",
 age: 6,
 gaushalaName: "Gokul Gaushala",
 photo: getGaushalaImage('gir-cow'),
 healthStatus: "healthy",
 },
 {
 id: "cow_011",
 name: "Kapila",
 breed: "Sahiwal",
 age: 4,
 gaushalaName: "Gokul Gaushala",
 photo: getGaushalaImage('sahiwal-cow'),
 healthStatus: "healthy",
 },
 {
 id: "cow_004",
 name: "Radha",
 breed: "Red Sindhi",
 age: 9,
 gaushalaName: "Shri Krishna Gaushala",
 photo: getGaushalaImage('red-sindhi-cow'),
 healthStatus: "senior_care",
 },
];

// Claim-gating (2026-10-05): `features` is what a contribution gets today (it
// goes to cow care at an approved gaushala; the donor gets a numbered receipt).
// `extras` are per-donor deliverables — donor wall, certificate, photo/video
// updates, health reports, visits, plaque, Gau Puja invitation — that no code
// backs: nothing attaches a donor to a cow, no endpoint lets a gaushala post an
// update or issue a certificate. They are shown only when HAS_ADOPTION_EXTRAS
// flips (lib/launch-gates.ts); until then they render as "Coming soon".
const RECEIPT_FEATURE = HAS_80G
 ? "80G tax receipt"
 : "Numbered donation receipt PDF (not a tax-exemption certificate)";

const adoptionPlanDefs = [
 {
 id: "plan_daily",
 name: "Gau Seva",
 nameHindi: "\u0917\u094C \u0938\u0947\u0935\u093E",
 price: "\u20B951",
 period: "/day",
 popular: false,
 features: ["Goes towards the daily feed and care of cows at an approved gaushala", RECEIPT_FEATURE],
 extras: [
 "Daily feeding of one cow",
 "Photo updates from the gaushala",
 "Name on gaushala donor wall",
 "Digital seva certificate",
 ],
 },
 {
 id: "plan_monthly",
 name: "Gau Palan",
 nameHindi: "\u0917\u094C \u092A\u093E\u0932\u0928",
 price: "\u20B93,000",
 period: "/month",
 popular: true,
 features: ["Goes towards a month of cow care at an approved gaushala", RECEIPT_FEATURE],
 extras: [
 "Full monthly care of one cow",
 "Weekly photo & video updates",
 "Visit your cow anytime",
 "Digital certificate with cow details",
 "Monthly health report",
 ],
 },
 {
 id: "plan_annual",
 name: "Gau Raksha",
 nameHindi: "\u0917\u094C \u0930\u0915\u094D\u0937\u093E",
 price: "\u20B930,000",
 period: "/year",
 popular: false,
 features: ["Goes towards a year of cow care at an approved gaushala", RECEIPT_FEATURE],
 extras: [
 "Full annual care of one cow",
 "Weekly photo & video updates",
 "Unlimited visits",
 "Framed certificate with cow photo",
 "Monthly health report",
 "Festival special updates",
 ],
 },
 {
 id: "plan_lifetime",
 name: "Gau Daan",
 nameHindi: "\u0917\u094C \u0926\u093E\u0928",
 price: "\u20B92,25,000",
 period: "one-time",
 popular: false,
 features: ["Goes towards long-term cow care at an approved gaushala", RECEIPT_FEATURE],
 extras: [
 "Lifetime care of one cow",
 "Weekly photo & video updates",
 "Unlimited visits with family",
 "Premium framed certificate",
 "Monthly health report",
 "Name plaque at gaushala",
 "Annual Gau Puja invitation",
 "Priority for new cow adoption",
 ],
 },
];

const adoptionPlans = adoptionPlanDefs.map(({ features, extras, ...plan }) => ({
 ...plan,
 features: HAS_ADOPTION_EXTRAS ? [...features, ...extras] : features,
 comingSoon: HAS_ADOPTION_EXTRAS ? [] : extras,
}));

const faqs = [
 {
 q: "How do I know my donation is being used properly?",
 // TC-11: the last clause used to read "All our gaushalas are verified and
 // audited regularly." Nothing verifies or audits a gaushala anywhere in the
 // product — GaushalaProfile.verified is never written, the admin path sets
 // `approved`, and no endpoint publishes a gaushala's finances. What IS true
 // is that a gaushala is reviewed by hand before it appears in the listing.
 a: HAS_ADOPTION_EXTRAS
 ? "Photo updates of your cow are posted on the cow\'s page when the gaushala provides them; we do not promise a monthly schedule or delivery by WhatsApp or email. You can also visit the gaushala anytime during visiting hours to see your cow in person. Each gaushala listed on Darshya is reviewed and approved by us before it goes live; we do not audit their books, so treat the updates and your own visit as the evidence."
 : "Your contribution is receipted with a numbered PDF. Photo updates of your cow, health reports and visits are coming soon; they are not part of a contribution today. Each gaushala listed on Darshya is reviewed and approved by us before it goes live, but we do not audit their books or publish their finances.",
 },
 {
 q: HAS_ADOPTION_EXTRAS ? "Can I visit the cow I have adopted?" : "Can I visit a gaushala?",
 a: HAS_ADOPTION_EXTRAS
 ? "Absolutely! All our gaushala partners allow adopters to visit their cows during visiting hours. Annual and Lifetime plan adopters get unlimited family visits. We recommend calling ahead to schedule your visit."
 : "Visits are not arranged through Darshya yet; adopter visits are coming soon. Contact a gaushala directly to ask about visiting.",
 },
 {
 q: "Is my donation tax-deductible?",
 a: HAS_80G
 ? "Yes. Donations under the Annual (Gau Raksha) and Lifetime (Gau Daan) plans are eligible for deduction under Section 80G of the Income Tax Act, and the receipt we email carries our registration number and PAN."
 : "Not yet. Darshya does not hold a Section 80G registration today, so a donation made here cannot be claimed as a deduction. You will receive a receipt PDF by email as proof of your donation, and we will publish the registration number on this page the day it is issued.",
 },
 {
 q: "What happens if the cow I adopted passes away?",
 // TC-11 (adjacent, same sentence): this promised "a full refund for the
 // remaining period" alongside "complete transparency throughout". There is
 // no remaining period to refund — a gau seva contribution goes through the
 // one-off donations rail, and refund.service.processRefund only ever refunds
 // a PujaBooking. Transferring the seva is something a human can actually do;
 // an automatic pro-rata refund is not.
 a: "In the unfortunate event, we will notify you and move your seva to another cow at the same gaushala. If you would rather stop, write to us and we will review it by hand — a contribution is a one-off donation rather than a subscription, so there is no automatic pro-rata refund behind it.",
 },
 {
 q: "Can I gift a cow adoption to someone?",
 a: HAS_ADOPTION_EXTRAS
 ? "Yes! Cow adoption makes a deeply meaningful and spiritual gift. You can gift any plan to a loved one, and they will receive a beautiful adoption certificate along with all regular updates."
 : "Gifting a cow adoption, with a certificate for the recipient, is coming soon. Today a contribution is made in your own name and you receive the receipt.",
 },
 {
 q: "What breeds of cows are available for adoption?",
 a: "Our gaushalas house indigenous Indian breeds including Gir, Sahiwal, Tharparkar, Red Sindhi, and Kankrej. These desi breeds produce nutritious A2 milk and are an integral part of India's heritage.",
 },
];

/* ── Health status helpers ────────────────────────────────────────────────────── */

function healthBadge(status: string) {
 switch (status) {
 case "healthy":
 return (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 Healthy
 </span>
 );
 case "under_treatment":
 return (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
 <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
 Under Treatment
 </span>
 );
 case "senior_care":
 return (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
 <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
 Senior Care
 </span>
 );
 default:
 return null;
 }
}

/* ── Page Component ───────────────────────────────────────────────────────────── */

export default function GaushalaPage() {
 return (
 <div className="min-h-[100dvh]">
 {/* ── Hero ────────────────────────────────────────────────────────────────── */}
 <section className="relative overflow-hidden bg-[#ede9e3]">

 <div className="relative max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-24">
 <div className="text-center max-w-3xl mx-auto">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron-600/10 text-saffron-700 text-sm font-medium mb-6 border border-saffron-200/40">
 <Leaf className="w-4 h-4" />
 Gau Seva — A Sacred Act of Devotion
 </div>
 <h1 className={`${H1.marketing} mb-6`}>
 Support a Gaushala,{" "}
 <span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron-600 to-amber-600">
 Earn Divine Blessings
 </span>
 </h1>
 <p className="prose-lead text-surface-500 leading-relaxed mb-8 max-w-2xl mx-auto">
 Support gaushalas across India. Choose a gau seva plan, get a numbered receipt for
 every contribution, and contribute to the protection of India's sacred cows.{!HAS_ADOPTION_EXTRAS && " Photo updates, certificates and visits are coming soon."}
 </p>
 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
 <a
 href="#cows"
 className={buttonClass('primary', 'md', 'shadow-sm btn-press')}
 >
 <Heart className="w-5 h-5" />
 Choose gau seva
 </a>
 <a
 href="#plans"
 className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-surface-700 font-medium rounded-lg hover:bg-surface-50 transition-all border border-[var(--color-border)] shadow-sm"
 >
 View Plans
 <ArrowRight className="w-4 h-4" />
 </a>
 </div>
 </div>
 </div>
 </section>

 {/* ── Trust Badges ────────────────────────────────────────────────────────── */}
 <section className="bg-[var(--color-surface)] border-y border-[var(--color-border)]">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
 <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
 {[
 {
 icon: BadgeCheck,
 // TC-11: this badge read "Verified Gaushalas / Audited & transparent".
 // Neither happens: GaushalaProfile.verified is written nowhere, nothing
 // audits a gaushala, and no endpoint publishes one's finances. Approval
 // by hand before listing is the process that actually exists.
 label: "Reviewed Gaushalas",
 sub: "Approved before they are listed",
 },
 {
 icon: Camera,
 label: "Photo Updates",
 sub: HAS_ADOPTION_EXTRAS ? "Posted by the gaushala when available" : "Coming soon",
 },
 {
 icon: MapPin,
 label: HAS_ADOPTION_EXTRAS ? "Visit Anytime" : "Gaushala Visits",
 sub: HAS_ADOPTION_EXTRAS ? "Open-door policy" : "Coming soon",
 },
 {
 icon: FileText,
 label: HAS_80G ? "Tax Receipt (80G)" : "Donation Receipt",
 sub: HAS_80G ? "Save on income tax" : "A numbered PDF receipt",
 },
 ].map((badge) => (
 <div
 key={badge.label}
 className="flex items-center gap-3 text-center md:text-left"
 >
 <div className="w-10 h-10 rounded-xl bg-saffron-50 flex items-center justify-center shrink-0">
 <badge.icon className="w-5 h-5 text-saffron-600" />
 </div>
 <div>
 <p className="text-sm font-semibold text-surface-800">
 {badge.label}
 </p>
 <p className="text-xs text-surface-500">{badge.sub}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>


 {/* ── Featured Cows Section ───────────────────────────────────────────────── */}
 <section id="cows" className="py-16 lg:py-20 bg-white">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
 <div className="flex items-end justify-between mb-10">
 <div>
 <h2 className="text-2xl font-semibold text-surface-800 mb-3">
 Cows Available for Adoption
 </h2>
 {/* DF-08 (prod sweep 2026-08-12): these eight entries are the cow_00X
     fixtures. The finding asked for them to be removed so "only real
     adoptable cows are shown" — but there is no real adoptable inventory
     to show: GET /gaushala/cows is served from the in-memory
     gaushalaService fixture and GET /gaushala/:id deliberately returns
     `cows: []` rather than grafting fixtures onto a real gaushala, so
     deleting them leaves this page with nothing at all. What must not
     happen is a donor reading a fixture as an animal they can adopt
     today, so the listing says what it is. Replace this line the moment a
     counted inventory endpoint exists. */}
 <p className="text-surface-600">
 Each cow has a unique story. Choose one to bring into your
 family and provide lifelong care.
 </p>
 {/* TC-11, second pass. The disclaimer DF-08 added to make the fixtures
     honest reintroduced the exact claim TC-11 had just removed ("a
     verified partner gaushala" — nothing in the product writes
     GaushalaProfile.verified; the admin path sets `approved`) and added a
     new one on top of it: nothing assigns a cow to a donor. The only
     endpoint that ever did was POST /gaushala/adopt, deleted under COM-19
     and now held down by apps/api/src/routes/gaushala.adopt-removed.test.ts.
     A confirmed donation writes a Donation row against a gaushala donee and
     stops there. So the disclosure now says what a contribution actually
     buys, and drops the word the product has not earned. */}
 <p className="text-sm text-surface-500 mt-2">
 These are sample listings that show how adoption works — they are not an
 inventory of animals you can claim. A contribution funds cow care at an
 approved gaushala; it does not reserve a particular cow, and no cow shown
 here is allocated to a donor.
 </p>
 </div>
 </div>

 <div className="flex gap-5 overflow-x-auto pb-4 -mx-6 px-6 snap-x snap-mandatory scrollbar-hide">
 {featuredCows.map((cow) => (
 <Link
 key={cow.id}
 href={`/gaushala/${cow.id}`}
 className="group min-w-[260px] sm:min-w-[280px] bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] card-hover transition-all duration-300 snap-start shrink-0"
 >
 <div className="relative h-44 overflow-hidden">
 {/* CWV-01 residual 3 — /gaushala was one of the two routes that emitted
     ZERO srcset (the other, the homepage, was closed in the 2026-08-23
     pass). Every one of these eight cards asked Commons for the 500px
     thumb regardless of device, into a card that is `min-w-[260px]
     sm:min-w-[280px]` — so a 1x phone downloaded a 500px image for a
     260px slot.

     Measured against Commons on 2026-09-01, per unique file:
       Gir_cow.jpg                    500px 85,574 B  ->  330px 39,267 B
       Tharparkar_01.JPG              500px 68,454 B  ->  330px 32,743 B
       Sahiwala_01.JPG                500px 75,914 B  ->  330px 35,097 B
       Red_Sindhi_Cow_at_Pakistan.jpg 500px 54,087 B  ->  330px 25,539 B
       unique total                        284,029 B  ->      132,646 B
     i.e. -151,383 B (-53.3%) for a 1x viewport. A 2x device still needs
     520 CSS px of pixels for the 260px slot and still picks the 500px
     candidate, so nothing gets softer — this only stops 1x devices
     paying for pixels they cannot show.

     `sizes` states the two real slot widths rather than a viewport
     fraction: the strip is a horizontal snap-scroller, so the card width
     is fixed by min-w-*, not by the viewport. 250 is in the ladder so a
     narrow 1x device that renders the 260px card can still land one step
     down; IMG_W.CARD is what `cow.photo` itself is, so the top candidate
     and the src stay the same URL and no extra fetch is introduced. */}
 <img
 src={cow.photo}
 srcSet={remoteSrcSet(cow.photo, [250, 330, IMG_W.CARD])}
 sizes="(max-width: 639px) 260px, 280px"
 width={330}
 height={176}
 loading="lazy"
 decoding="async"
 alt={cow.name}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 <div className="absolute top-2.5 right-2.5">
 {healthBadge(cow.healthStatus)}
 </div>
 </div>
 <div className="p-4">
 <h3 className="text-base font-bold text-surface-900 mb-0.5">
 {cow.name}
 </h3>
 <p className="text-xs text-surface-500 mb-2">
 {cow.breed} &middot; {cow.age} years old
 </p>
 <p className="text-xs text-surface-500 flex items-center gap-1">
 <MapPin className="w-3 h-3" />
 {cow.gaushalaName}
 </p>
 <div className="mt-3 pt-3 border-t border-surface-100">
 <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600 group-hover:text-emerald-700 transition-colors">
 Adopt {cow.name}
 <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
 </span>
 </div>
 </div>
 </Link>
 ))}
 </div>
 </div>
 </section>

 {/* ── Adoption Plans Section ──────────────────────────────────────────────── */}
 <section
 id="plans"
 className="py-16 lg:py-20 bg-surface-50"
 >
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
 <div className="text-center mb-12">
 <h2 className="text-2xl font-semibold text-surface-800 mb-3">
 Choose Your Seva Plan
 </h2>
 <p className="text-surface-600 max-w-xl mx-auto">
 Every plan directly supports cow care, feeding, and medical
 treatment. Pick the one that suits your capacity.
 </p>
 </div>

 <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
 {adoptionPlans.map((plan) => (
 <div
 key={plan.id}
 className={`relative bg-white rounded-xl border ${plan.popular ? 'pt-9 pb-6 px-6' : 'p-6'} flex flex-col transition-all duration-300 hover:shadow-md ${
 plan.popular
 ? "border-saffron-300 shadow-sm ring-1 ring-saffron-200"
 : "border-surface-200 hover:border-surface-300"
 }`}
 >
 {plan.popular && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
 <span className="px-3 py-1 bg-saffron-600 text-white text-xs font-semibold uppercase tracking-wider rounded-full">
 Most Popular
 </span>
 </div>
 )}
 <div className="mb-4">
 <p className="text-sm font-medium text-surface-500 mb-1" style={{ fontFamily: 'var(--font-noto-devanagari)' }}>
 {plan.nameHindi}
 </p>
 <h3 className="text-lg font-semibold tracking-tight text-surface-800" style={{ fontFamily: 'var(--font-display)' }}>
 {plan.name}
 </h3>
 </div>
 <div className="mb-6">
 <span className="text-lg font-semibold text-surface-800">
 {plan.price}
 </span>
 <span className="text-sm text-surface-500 ml-1">
 {plan.period}
 </span>
 </div>
 <ul className="space-y-2.5 mb-6 flex-1">
 {plan.features.map((feature) => (
 <li
 key={feature}
 className="flex items-start gap-2 text-sm text-surface-600"
 >
 <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
 {feature}
 </li>
 ))}
 </ul>
 {plan.comingSoon.length > 0 && (
 <p className="mb-6 text-xs text-surface-500">
 Coming soon: {plan.comingSoon.join(", ").replace(/^./, (c) => c.toLowerCase())}.
 </p>
 )}
 {/* LC-09: was a bare <button> with no onClick inside a plain <div> —
     all four tiers dead, with no wrapping link to fall back to. The
     cow detail page already deep-links this way (app/gaushala/[id]/
     page.tsx); the index grid was simply left behind. */}
 <Link
 href={`/donations?planId=${encodeURIComponent(plan.id)}`}
 className={`w-full py-3 rounded-lg font-medium text-sm transition-all btn-press text-center ${
 plan.popular
 ? "bg-saffron-600 text-white hover:bg-saffron-700"
 : "bg-saffron-50 text-saffron-700 hover:bg-saffron-100"
 }`}
 >
 Select Plan
 </Link>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ── What Gau Seva Funds ─────────────────────────────────────────────────── */}
 {/* DF-05 / DF-08 (prod sweep 2026-08-12) — THE INVENTED SCOREBOARD IS GONE.

     This section published four achievement figures as fact:
       "5,000+ Cows Protected", "₹2Cr+ Donated by Devotees",
       "100+ Partner Gaushalas", "25,000+ Happy Adopters"
     on a platform with zero completed adoptions and three seeded gaushalas.
     It is the same defect DF-05 filed for the homepage's "200+ temples"
     against a catalogue of 20 — a number a devotee can disprove by clicking
     through, on the one product where trust IS the proposition.

     There is no counted source to replace them with: adoptions live in the
     donations rail and nothing aggregates them for a public page. So this
     states what a contribution BUYS, which is true today and needs no
     counter. Put numbers back only when an endpoint counts them — see
     lib/platform-stats.ts for the rule that governs published counts. */}
 <section className="py-16 lg:py-20 bg-[#2a2520] text-white">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
 <div className="text-center mb-12">
 <h2 className="text-2xl font-semibold mb-3">
 What your gau seva pays for
 </h2>
 <p className="text-surface-400 max-w-xl mx-auto">
 Every contribution goes to a gaushala we have approved for listing, and is receipted. Here is
 what it covers.
 </p>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
 {[
 {
 value: "Fodder",
 label: "Green fodder, dry chara and mineral feed",
 icon: Heart,
 },
 {
 value: "Care",
 label: "Veterinary visits, vaccination and treatment",
 icon: Shield,
 },
 {
 value: "Shelter",
 label: "Shed upkeep, bedding and water",
 icon: Users,
 },
 {
 // TC-01: the one 80G assertion on this page that escaped COM-02's gate.
 // Everything else here branches on HAS_80G — the trust strip, the plan
 // feature list, the tax-deductibility FAQ — and this tile went on
 // promising "Tax-deductible receipt on eligible donations" three
 // sections further down. There are no eligible donations: is80GEligible()
 // needs a donee registration number AND PAN, gaushala_profiles.regn_80g
 // and .pan are read in one place and written nowhere, so the receipt
 // generator prints "Proof of donation — not a tax exemption certificate"
 // on every receipt it has ever issued.
 value: HAS_80G ? "80G" : "Receipt",
 label: HAS_80G
 ? "Tax-deductible receipt on eligible donations"
 : "A numbered PDF receipt for every contribution",
 icon: IndianRupee,
 },
 ].map((stat) => (
 <div key={stat.label} className="text-center">
 <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-emerald-500/10 flex items-center justify-center">
 <stat.icon className="w-7 h-7 text-emerald-400" />
 </div>
 <p className="text-xl font-semibold text-white mb-1">
 {stat.value}
 </p>
 <p className="text-sm text-surface-400">{stat.label}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ── FAQ Section ─────────────────────────────────────────────────────────── */}
 <section className="py-16 lg:py-20 bg-white">
 <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-10">
 <div className="text-center mb-12">
 <h2 className="text-2xl font-semibold text-surface-800 mb-3">
 Frequently Asked Questions
 </h2>
 <p className="text-surface-600">
 Everything you need to know about cow adoption through Darshya.
 </p>
 </div>

 <div className="space-y-4">
 {faqs.map((faq, i) => (
 <details
 key={i}
 className="group bg-surface-50 rounded-xl border border-surface-100 overflow-hidden"
 >
 <summary className="flex items-center justify-between cursor-pointer px-6 py-4 text-left">
 <span className="text-sm font-semibold text-surface-800 pr-4">
 {faq.q}
 </span>
 <ChevronDown className="w-5 h-5 text-surface-400 shrink-0 group-open:rotate-180 transition-transform duration-200" />
 </summary>
 <div className="px-6 pb-4 -mt-1">
 <p className="text-sm text-surface-600 leading-relaxed">
 {faq.a}
 </p>
 </div>
 </details>
 ))}
 </div>
 </div>
 </section>

 {/* ── CTA Banner ──────────────────────────────────────────────────────────── */}
 <section className="py-16 lg:py-20 bg-saffron-700">
 <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10 text-center">
 <h2 className="text-2xl font-semibold text-white mb-4">
 Begin Your Gau Seva Today
 </h2>
 <p className="prose-lead text-saffron-100 mb-8 max-w-2xl mx-auto">
 The scriptures say that serving a cow is equivalent to serving all
 33 crore devas. Start your journey of divine blessings today.
 </p>
 <a
 href="#cows"
 className="inline-flex items-center gap-2 px-8 py-4 bg-white text-saffron-700 font-medium rounded-lg hover:bg-saffron-50 transition-all shadow-sm btn-press text-lg"
 >
 <Heart className="w-5 h-5" />
 Choose gau seva
 </a>
 </div>
 </section>

 <ApprovedProvidersStrip
 type="gaushala"
 heading="Approved gaushalas on Darshya"
 subheading="Approved gaushalas you can support directly. Each one is reviewed before being listed."
 limit={8}
 />
 </div>
 );
}
