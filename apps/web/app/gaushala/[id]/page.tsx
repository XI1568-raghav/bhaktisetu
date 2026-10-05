import type { Metadata } from "next";
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';

export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(allCows).map((id) => ({ id }));
}

import { getGaushalaImage, remoteImage, remoteSrcSet, IMG_W } from "../../../lib/images";
import { COMPANY } from "../../../lib/company";
import {
 Heart,
 MapPin,
 Calendar,
 ArrowLeft,
 Share2,
 Gift,
 Check,
 ChevronRight,
 BadgeCheck,
 Phone,
 Mail,
 Clock,
 Camera,
} from "lucide-react";
import Link from "next/link";

// Per-cow canonical: a single hardcoded `metadata.alternates.canonical` on a
// dynamic segment would declare every cow detail page to be the same URL
// (prod sweep 2026-08-12, SEO-01).
export async function generateMetadata({
 params,
}: {
 params: Promise<{ id: string }>;
}): Promise<Metadata> {
 const { id } = await params;
 return {
  title: "Cow Details — Gau Seva",
  alternates: { canonical: `https://darshya.online/gaushala/${id}` },
  description:
   "View cow details, health status, and monthly updates. Adopt this cow and receive regular photo updates.",
 };
}

/* ── Fallback data (used for all cow detail pages in MVP) ─────────────────────── */

const allCows: Record<
 string,
 {
 id: string;
 name: string;
 breed: string;
 age: number;
 gaushalaId: string;
 gaushalaName: string;
 gaushalaLocation: string;
 photo: string;
 healthStatus: string;
 description: string;
 isAdopted: boolean;
 adopterName: string | null;
 monthlyUpdates: { date: string; photo: string; description: string }[];
 }
> = {
 cow_001: {
 id: "cow_001",
 name: "Lakshmi",
 breed: "Gir",
 age: 5,
 gaushalaId: "gs_001",
 gaushalaName: "Shri Krishna Gaushala",
 gaushalaLocation: "Vrindavan, Uttar Pradesh",
 photo:
 getGaushalaImage('gir-cow'),
 healthStatus: "healthy",
 description:
 "Lakshmi is a gentle 5-year-old Gir cow with beautiful long ears and a calm temperament. She was rescued as a calf from a dairy that was shutting down. Now she is the star of the gaushala, often seen nuzzling visitors for treats. She gives 8 liters of rich A2 milk daily.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 getGaushalaImage('gir-cow'),
 description:
 "Lakshmi is doing well! She enjoyed the spring sunshine and has been very active. Vet checkup: healthy weight at 420kg.",
 },
 {
 date: "2026-02-15",
 photo:
 getGaushalaImage('tharparkar-cow'),
 description:
 "Lakshmi participated in the Gau Puja ceremony this month. She was adorned with marigold garlands. All health parameters normal.",
 },
 ],
 },
 cow_003: {
 id: "cow_003",
 name: "Gauri",
 breed: "Tharparkar",
 age: 3,
 gaushalaId: "gs_001",
 gaushalaName: "Shri Krishna Gaushala",
 gaushalaLocation: "Vrindavan, Uttar Pradesh",
 photo:
 getGaushalaImage('tharparkar-cow'),
 healthStatus: "healthy",
 description:
 "Gauri is a young 3-year-old Tharparkar cow with a beautiful grey-white coat. She is playful and curious, often leading the herd during morning walks. Being from a desert breed, she is remarkably resilient and low-maintenance.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 getGaushalaImage('tharparkar-cow'),
 description:
 "Gauri has grown beautifully this month. She is very social and friendly with all the caretakers. Weight gain is on track.",
 },
 ],
 },
 cow_004: {
 id: "cow_004",
 name: "Radha",
 breed: "Red Sindhi",
 age: 9,
 gaushalaId: "gs_001",
 gaushalaName: "Shri Krishna Gaushala",
 gaushalaLocation: "Vrindavan, Uttar Pradesh",
 photo:
 getGaushalaImage('red-sindhi-cow'),
 healthStatus: "senior_care",
 description:
 "Radha is a 9-year-old Red Sindhi cow with a distinctive reddish-brown coat. She is one of the oldest residents at the gaushala and is treated with special care. Though she no longer gives milk, she is loved by everyone for her gentle nature.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 getGaushalaImage('red-sindhi-cow'),
 description:
 "Radha is receiving special senior care diet. Joint supplements have been added. She enjoys sunbathing in the afternoon.",
 },
 {
 date: "2026-02-15",
 photo:
 getGaushalaImage('gir-cow'),
 description:
 "Radha had a vet checkup. Slight arthritis detected — started on herbal treatment. Spirits remain high.",
 },
 ],
 },
 cow_005: {
 id: "cow_005",
 name: "Kamala",
 breed: "Gir",
 age: 4,
 gaushalaId: "gs_002",
 gaushalaName: "Kamdhenu Gaushala",
 gaushalaLocation: "Jaipur, Rajasthan",
 photo:
 getGaushalaImage('cow-shelter'),
 healthStatus: "healthy",
 description:
 "Kamala is a 4-year-old Gir cow rescued from an illegal dairy operation in Jaipur. Despite her difficult past, she has blossomed into a healthy and affectionate cow. She is one of the highest milk producers at the gaushala.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 getGaushalaImage('cow-shelter'),
 description:
 "Kamala is flourishing! She has fully recovered from her rescue trauma. Milk yield: 12 liters/day. She loves her new organic diet.",
 },
 ],
 },
 cow_006: {
 id: "cow_006",
 name: "Dhanvantari",
 breed: "Kankrej",
 age: 6,
 gaushalaId: "gs_002",
 gaushalaName: "Kamdhenu Gaushala",
 gaushalaLocation: "Jaipur, Rajasthan",
 photo:
 getGaushalaImage('gir-cow'),
 healthStatus: "under_treatment",
 description:
 "Dhanvantari is a 6-year-old Kankrej bull, a majestic breed from Gujarat. He was found injured on a highway and brought to the gaushala. Currently undergoing treatment for a leg fracture but recovering well under expert veterinary care.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 getGaushalaImage('gir-cow'),
 description:
 "Dhanvantari is showing great improvement! The leg splint was adjusted. He can now walk short distances. Expected full recovery in 6 weeks.",
 },
 {
 date: "2026-02-15",
 photo:
 getGaushalaImage('tharparkar-cow'),
 description:
 "Surgery was successful. Dhanvantari is resting and eating well. Pain management is being handled with ayurvedic medicines.",
 },
 ],
 },
 cow_008: {
 id: "cow_008",
 name: "Bhola",
 breed: "Tharparkar",
 age: 2,
 gaushalaId: "gs_002",
 gaushalaName: "Kamdhenu Gaushala",
 gaushalaLocation: "Jaipur, Rajasthan",
 photo:
 getGaushalaImage('red-sindhi-cow'),
 healthStatus: "healthy",
 description:
 "Bhola is an adorable 2-year-old Tharparkar calf, born right here at Kamdhenu Gaushala. He is playful, energetic, and already a visitor favorite. Named 'Bhola' (innocent) for his trusting and sweet nature.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 getGaushalaImage('red-sindhi-cow'),
 description:
 "Bhola is growing fast! He has gained 15kg this month. Very active and playful — loves running around the open paddock.",
 },
 ],
 },
 cow_010: {
 id: "cow_010",
 name: "Surabhi",
 breed: "Gir",
 age: 6,
 gaushalaId: "gs_003",
 gaushalaName: "Gokul Gaushala",
 gaushalaLocation: "Mathura, Uttar Pradesh",
 photo:
 getGaushalaImage('tharparkar-cow'),
 healthStatus: "healthy",
 description:
 "Surabhi is a magnificent 6-year-old Gir cow, the pride of Gokul Gaushala. Her A2 milk is used to produce the gaushala's famous organic ghee. She was hand-raised from birth and is incredibly friendly with humans.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 getGaushalaImage('tharparkar-cow'),
 description:
 "Surabhi produced 10 liters of rich A2 milk today. She is in excellent health. New organic fodder mix has been well received.",
 },
 {
 date: "2026-02-15",
 photo:
 getGaushalaImage('gir-cow'),
 description:
 "Surabhi participated in the Go Puja on Makar Sankranti. She was decorated with flowers and tilak. All vitals excellent.",
 },
 ],
 },
 cow_011: {
 id: "cow_011",
 name: "Kapila",
 breed: "Sahiwal",
 age: 4,
 gaushalaId: "gs_003",
 gaushalaName: "Gokul Gaushala",
 gaushalaLocation: "Mathura, Uttar Pradesh",
 photo:
 getGaushalaImage('tharparkar-cow'),
 healthStatus: "healthy",
 description:
 "Kapila is a 4-year-old Sahiwal cow named after the sacred Kapila cow of Hindu mythology. She is known for her exceptionally creamy milk and calm temperament. Kapila is part of the gaushala's breed conservation program.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 getGaushalaImage('tharparkar-cow'),
 description:
 "Kapila is thriving in the conservation program. She has been selected for the indigenous breed documentation project. Health is excellent.",
 },
 ],
 },
};

/* Default fallback for unknown IDs */
/**
 * TC-11 (P2, trust) — whether anything on this page may name a donee.
 *
 * Every record in `allCows` below is a fixture typed into this file, and there
 * is no counted adoptable inventory anywhere in the product: `GET /gaushala/:id`
 * deliberately returns `cows: []` rather than grafting fixtures onto a real
 * gaushala, and `GET /gaushala/cows` is served from an in-memory array in
 * gaushala.service.ts. DF-08 kept the fixtures on purpose — deleting them
 * empties the page — under a "sample listings" disclosure on the index.
 *
 * What the index does NOT do, and this page did, is push the fixture's
 * `gaushalaName` into the live donation flow. Every CTA here was built as
 *   /donations?causeId=gs_001&causeKind=gaushala&causeName=Shri%20Krishna%20Gaushala
 * and the primary button read "Donate to Shri Krishna Gaushala". `gs_001` is
 * not a row: `resolveGaushalaDonee()` refuses it and POST /donations/create-order
 * answers 400 `gaushala_not_onboarded`. So the page named a real third-party
 * organisation as the recipient of a donation it cannot receive and cannot be
 * paid, and the devotee filled a form that could only fail. No money is
 * misrouted — the API blocks it — but the claim is false before the API ever
 * sees it.
 *
 * The index already models the honest flow: link to /donations with the plan
 * prefilled and let the devotee pick a gaushala that is actually approved. This
 * page does the same while the listing is a sample. The real-record branch is
 * kept, not deleted, because it is the shape a DB-backed cow must use; flip
 * this constant in the change that makes `allCows` come from an endpoint.
 */
const LISTING_IS_SAMPLE = true;

const defaultCow = {
 id: "cow_001",
 name: "Lakshmi",
 breed: "Gir",
 age: 5,
 gaushalaId: "gs_001",
 gaushalaName: "Shri Krishna Gaushala",
 gaushalaLocation: "Vrindavan, Uttar Pradesh",
 photo:
 getGaushalaImage('gir-cow'),
 healthStatus: "healthy",
 description:
 "Lakshmi is a gentle 5-year-old Gir cow with beautiful long ears and a calm temperament. She was rescued as a calf from a dairy that was shutting down.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 getGaushalaImage('gir-cow'),
 description:
 "Lakshmi is doing well! She enjoyed the spring sunshine and has been very active.",
 },
 ],
};

const adoptionPlans = [
 {
 id: "plan_daily",
 name: "Gau Seva",
 price: "\u20B951/day",
 description: "Daily feeding",
 },
 {
 id: "plan_monthly",
 name: "Gau Palan",
 price: "\u20B93,000/mo",
 description: "Full monthly care",
 popular: true,
 },
 {
 id: "plan_annual",
 name: "Gau Raksha",
 price: "\u20B930,000/yr",
 description: COMPANY.donationLegal.HAS_80G_VERIFIED ? "Annual care + 80G" : "Annual care",
 },
 {
 id: "plan_lifetime",
 name: "Gau Daan",
 price: "\u20B92,25,000",
 description: "Lifetime care",
 },
];

const gaushalaInfo: Record<
 string,
 {
 phone: string;
 email: string;
 hours: string;
 facilities: string[];
 }
> = {
 gs_001: {
 phone: "+91 92551 09400",
 email: "info@krishnagaushala.org",
 hours: "6:00 AM - 7:00 PM (All days)",
 facilities: [
 "Veterinary Hospital",
 "Organic Farm",
 "Visitor Center",
 "Gau Puja Hall",
 ],
 },
 gs_002: {
 phone: "+91 92551 09400",
 email: "seva@kamdhenugaushala.in",
 hours: "7:00 AM - 6:00 PM (Mon-Sat)",
 facilities: [
 "50-Acre Campus",
 "Modern Veterinary ICU",
 "Organic Dairy",
 "Training Center",
 ],
 },
 gs_003: {
 phone: "+91 92551 09400",
 email: "contact@gokulgaushala.org",
 hours: "5:30 AM - 8:00 PM (All days)",
 facilities: [
 "Heritage Site",
 "Breed Conservation",
 "A2 Milk Dairy",
 "Goseva Training",
 ],
 },
};

/* ── Health badge helper ──────────────────────────────────────────────────────── */

function healthBadge(status: string) {
 switch (status) {
 case "healthy":
 return (
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-700">
 <span className="w-2 h-2 rounded-full bg-emerald-500" />
 Healthy
 </span>
 );
 case "under_treatment":
 return (
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
 <span className="w-2 h-2 rounded-full bg-amber-500" />
 Under Treatment
 </span>
 );
 case "senior_care":
 return (
 <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
 <span className="w-2 h-2 rounded-full bg-blue-500" />
 Senior Care
 </span>
 );
 default:
 return null;
 }
}

function formatDate(dateStr: string): string {
 const d = new Date(dateStr);
 return d.toLocaleDateString("en-IN", {
 day: "numeric",
 month: "long",
 year: "numeric",
 });
}

/* ── Page Component ───────────────────────────────────────────────────────────── */

export default async function CowDetailPage({
 params,
}: {
 params: Promise<{ id: string }>;
}) {
 const { id } = await params;
 const cow = allCows[id] ?? defaultCow;
 const gsInfo = (gaushalaInfo[cow.gaushalaId] ?? gaushalaInfo["gs_001"])!;

 return (
 <div className="min-h-[100dvh] bg-surface-50">
 {/* ── Breadcrumb ────────────────────────────────────────────────────────── */}
 <div className="bg-white border-b border-surface-100">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-3">
 <nav className="flex items-center gap-2 text-sm text-surface-500">
 <Link
 href="/gaushala"
 className="hover:text-emerald-600 transition-colors flex items-center gap-1"
 >
 <ArrowLeft className="w-3.5 h-3.5" />
 Gau Seva
 </Link>
 <ChevronRight className="w-3.5 h-3.5" />
 <span className="text-surface-800 font-medium">{cow.name}</span>
 </nav>
 </div>
 </div>

 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-8 lg:py-12">
 <div className="grid lg:grid-cols-3 gap-8">
 {/* ── Main Content (left 2 cols) ──────────────────────────────────── */}
 <div className="lg:col-span-2 space-y-8">
 {/* Cow photo & info */}
 <div className="bg-white rounded-xl overflow-hidden border border-surface-100 shadow-sm">
 <div className="relative h-72 sm:h-96 overflow-hidden">
 <img
 src={remoteImage(cow.photo, IMG_W.WIDE)}
 srcSet={remoteSrcSet(cow.photo, [IMG_W.CARD, IMG_W.WIDE])}
 sizes="(max-width: 1024px) 100vw, 720px"
 width={960}
 height={540}
 loading="eager"
 fetchPriority="high"
 decoding="async"
 alt={cow.name}
 className="w-full h-full object-cover"
 />
 <div className="absolute bottom-4 left-4">
 {healthBadge(cow.healthStatus)}
 </div>
 </div>
 <div className="p-6 sm:p-8">
 <div className="flex items-start justify-between mb-4">
 <div>
 <h1 className={`${H1.catalogue} mb-2`}>
 {cow.name}
 </h1>
 <div className="flex flex-wrap items-center gap-3 text-sm text-surface-500">
 <span className="font-medium text-surface-700">
 {cow.breed}
 </span>
 <span className="w-1 h-1 rounded-full bg-surface-300" />
 <span>{cow.age} years old</span>
 <span className="w-1 h-1 rounded-full bg-surface-300" />
 <span className="flex items-center gap-1">
 <MapPin className="w-3.5 h-3.5" />
 {cow.gaushalaName}
 </span>
 </div>
 </div>
 <div className="flex gap-2 shrink-0">
 <button className="p-2.5 rounded-xl border border-surface-200 text-surface-500 hover:text-surface-700 hover:bg-surface-50 transition-all">
 <Share2 className="w-5 h-5" />
 </button>
 <button className="p-2.5 rounded-xl border border-surface-200 text-surface-500 hover:text-surface-700 hover:bg-surface-50 transition-all">
 <Gift className="w-5 h-5" />
 </button>
 </div>
 </div>

 <p className="text-surface-600 leading-relaxed mb-6">
 {cow.description}
 </p>

 {/* TC-11. /gaushala carries a "sample listings" disclosure and this page,
     which is where the money button lives, carried none — a devotee arriving
     from search saw an individually named animal with a health status, a
     monthly update timeline and a donate button, with nothing telling them it
     is illustrative. */}
 {LISTING_IS_SAMPLE && (
 <div className="mb-6 p-4 rounded-xl bg-surface-100 border border-surface-200">
 <p className="text-sm text-surface-700 leading-relaxed">
 <strong className="text-surface-900">This is a sample listing.</strong>{" "}
 {cow.name}, the gaushala named here and the updates below are
 illustrative — they show how gau seva works on Darshya. There is no
 adoptable-cow inventory yet, so a contribution funds cow care at an
 approved gaushala you choose on the donation page rather than
 reserving this animal.
 </p>
 </div>
 )}

 {/* Adoption status */}
 {cow.isAdopted ? (
 <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
 <p className="text-sm font-semibold text-amber-800">
 This cow has been adopted by {cow.adopterName}
 </p>
 <p className="text-sm text-amber-600 mt-1">
 You can still explore other available cows for adoption.
 </p>
 <Link
 href="/gaushala"
 className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors"
 >
 Browse Available Cows
 <ChevronRight className="w-4 h-4" />
 </Link>
 </div>
 ) : (
 <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
 <p className="text-sm font-semibold text-emerald-800 mb-3">
 {cow.name} is available for adoption! Choose a plan:
 </p>
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {adoptionPlans.map((plan) => (
 // Gau-seva revamp: plan buttons were dead <button> with no onClick. Point
 // each to the donations flow with the planId prefilled so the devotee pays
 // the real plan amount through Razorpay, not a dead click. (The receipt is
 // a proof-of-donation PDF, not an 80G instrument — HAS_80G_VERIFIED is
 // false and the generator stamps every receipt "Proof of donation — not a
 // tax exemption certificate".)
 //
 // TC-11: the cause is no longer prefilled from the fixture. See
 // LISTING_IS_SAMPLE above.
 <Link
 key={plan.id}
 href={
 LISTING_IS_SAMPLE
 ? `/donations?planId=${encodeURIComponent(plan.id)}`
 : `/donations?causeId=${encodeURIComponent(cow.gaushalaId)}&causeKind=gaushala&causeName=${encodeURIComponent(cow.gaushalaName)}&planId=${encodeURIComponent(plan.id)}`
 }
 className={`relative p-3 rounded-xl border text-left transition-all hover:shadow-md block ${
 plan.popular
 ? "border-emerald-400 bg-white ring-1 ring-emerald-200"
 : "border-surface-200 bg-white hover:border-emerald-300"
 }`}
 >
 {plan.popular && (
 <span className="absolute -top-2 right-2 px-2 py-0.5 bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-full">
 Popular
 </span>
 )}
 <p className="text-xs text-surface-500 mb-0.5">
 {plan.name}
 </p>
 <p className="text-sm font-bold text-surface-900">
 {plan.price}
 </p>
 <p className="text-xs text-surface-400 mt-0.5">
 {plan.description}
 </p>
 </Link>
 ))}
 </div>
 <Link
 href={
 LISTING_IS_SAMPLE
 ? "/donations"
 : `/donations?causeId=${encodeURIComponent(cow.gaushalaId)}&causeKind=gaushala&causeName=${encodeURIComponent(cow.gaushalaName)}`
 }
 className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md shadow-emerald-500/20 btn-press flex items-center justify-center gap-2"
 >
 <Heart className="w-5 h-5" />
 {LISTING_IS_SAMPLE
 ? "Choose a gaushala to support"
 : `Donate to ${cow.gaushalaName}`}
 </Link>
 </div>
 )}
 </div>
 </div>

 {/* Monthly Updates Timeline */}
 <div className="bg-white rounded-xl border border-surface-100 shadow-sm p-6 sm:p-8">
 <h2 className="text-xl font-bold text-surface-900 mb-6 flex items-center gap-2">
 <Camera className="w-5 h-5 text-emerald-600" />
 Monthly Updates
 </h2>

 {cow.monthlyUpdates.length === 0 ? (
 <p className="text-surface-500 text-sm">
 No updates available yet. Check back soon!
 </p>
 ) : (
 <div className="space-y-6">
 {cow.monthlyUpdates.map((update, idx) => (
 <div key={idx} className="flex gap-4">
 {/* Timeline line */}
 <div className="flex flex-col items-center">
 <div className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 mt-1" />
 {idx < cow.monthlyUpdates.length - 1 && (
 <div className="w-0.5 flex-1 bg-emerald-200 mt-1" />
 )}
 </div>

 <div className="flex-1 pb-2">
 <p className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1.5">
 <Calendar className="w-3.5 h-3.5" />
 {formatDate(update.date)}
 </p>
 <div className="rounded-xl overflow-hidden border border-surface-100">
 <img
 src={update.photo}
 width={500}
 height={192}
 loading="lazy"
 decoding="async"
 alt={`${cow.name} update - ${update.date}`}
 className="w-full h-48 object-cover"
 />
 <div className="p-4">
 <p className="text-sm text-surface-600 leading-relaxed">
 {update.description}
 </p>
 </div>
 </div>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 {/* ── Sidebar (right col) ─────────────────────────────────────────── */}
 {/* Removed lg:sticky on the Adopt card. With sticky, the card stayed
 pinned while the gaushala-details card scrolled UP behind it,
 visually overlapping what should have been visible. The page isn't
 long enough to need a sticky CTA — the sidebar simply scrolls with
 the rest of the content. */}
 <div className="space-y-6 self-start">
 {/* Quick adopt CTA */}
 {!cow.isAdopted && (
 <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 text-white shadow-lg">
 <h3 className="text-lg font-bold mb-2">
 {LISTING_IS_SAMPLE ? "Support gau seva today" : `Adopt ${cow.name} Today`}
 </h3>
 <p className="text-emerald-100 text-sm mb-4 leading-relaxed">
 Your seva directly provides food, shelter, and medical care at an
 approved gaushala.
 </p>
 {/* TC-11: "Visit by arrangement with the gaushala", "Monthly photo & video updates" and
     a "Digital adoption certificate" are per-animal entitlements of an
     adoption that cannot happen — POST /gaushala/adopt was deleted under
     COM-19 and no donation attaches a cow to a donor. The receipt is the
     one item on the list the product actually issues. */}
 <div className="space-y-2 mb-5">
 {(LISTING_IS_SAMPLE
 ? ["Numbered donation receipt PDF"]
 : [
 "Photo updates when the gaushala posts them",
 "Visit by arrangement with the gaushala",
 "Numbered donation receipt PDF",
 "Digital adoption certificate",
 ]
 ).map((item) => (
 <div
 key={item}
 className="flex items-center gap-2 text-sm text-emerald-50"
 >
 <Check className="w-4 h-4 text-emerald-300 shrink-0" />
 {item}
 </div>
 ))}
 </div>
 <Link
 href={
 LISTING_IS_SAMPLE
 ? "/donations"
 : `/donations?causeId=${encodeURIComponent(cow.gaushalaId)}&causeKind=gaushala&causeName=${encodeURIComponent(cow.gaushalaName)}`
 }
 className="w-full py-3 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-all btn-press flex items-center justify-center gap-2"
 >
 <Heart className="w-5 h-5" />
 Donate Now
 </Link>
 <p className="text-emerald-200 text-xs text-center mt-3">
 Starting from just Rs 51/day
 </p>
 </div>
 )}

 {/* Gaushala info card */}
 <div className="bg-white rounded-xl border border-surface-100 shadow-sm p-6">
 <div className="flex items-center gap-2 mb-4">
 <BadgeCheck className="w-5 h-5 text-emerald-600" />
 <h3 className="text-base font-bold text-surface-900">
 Gaushala Details
 </h3>
 </div>

 <div className="space-y-4">
 <div>
 <p className="text-sm font-semibold text-surface-800">
 {cow.gaushalaName}
 </p>
 <p className="text-xs text-surface-500 flex items-center gap-1 mt-0.5">
 <MapPin className="w-3 h-3" />
 {cow.gaushalaLocation}
 </p>
 </div>

 <div className="h-px bg-surface-100" />

 {/* TC-11. This block published a phone number, an email address, opening
     hours and a facilities list for a named third-party organisation, all
     typed into this file. The "gaushala" email (info@krishnagaushala.org,
     seva@kamdhenugaushala.in) is on a real outside domain we do not
     control, and the "gaushala" phone number is Darshya's own WhatsApp line
     (+91 92551 09400 — the same number /faqs publishes as ours), so a
     devotee ringing the gaushala reached us. Contact details for a sample
     listing are directed at the only inbox that can actually answer. */}
 {LISTING_IS_SAMPLE ? (
 <div className="space-y-3">
 <div className="flex items-center gap-2 text-sm text-surface-600">
 <Mail className="w-4 h-4 text-surface-400" />
 {COMPANY.supportEmail}
 </div>
 <p className="text-xs text-surface-500 leading-relaxed">
 Sample listing — we do not publish contact details or visiting hours
 for a gaushala until it is onboarded. Write to us and we will point
 you at an approved one.
 </p>
 </div>
 ) : (
 <div className="space-y-3">
 <div className="flex items-center gap-2 text-sm text-surface-600">
 <Phone className="w-4 h-4 text-surface-400" />
 {gsInfo.phone}
 </div>
 <div className="flex items-center gap-2 text-sm text-surface-600">
 <Mail className="w-4 h-4 text-surface-400" />
 {gsInfo.email}
 </div>
 <div className="flex items-center gap-2 text-sm text-surface-600">
 <Clock className="w-4 h-4 text-surface-400" />
 {gsInfo.hours}
 </div>
 </div>
 )}

 <div className="h-px bg-surface-100" />

 {/* TC-11: "Veterinary Hospital", "50-Acre Campus", "Modern Veterinary
     ICU" are facility claims about a named outside organisation, typed
     into this file and inspected by nobody. */}
 {!LISTING_IS_SAMPLE && (
 <div>
 <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
 Facilities
 </p>
 <div className="flex flex-wrap gap-1.5">
 {gsInfo.facilities.map((f) => (
 <span
 key={f}
 className="px-2.5 py-1 bg-surface-50 border border-surface-100 rounded-lg text-xs font-medium text-surface-600"
 >
 {f}
 </span>
 ))}
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Action buttons */}
 <div className="bg-white rounded-xl border border-surface-100 shadow-sm p-6 space-y-3">
 <button className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl border border-surface-200 text-surface-700 font-medium text-sm hover:bg-surface-50 transition-all">
 <Share2 className="w-4 h-4" />
 Share This Cow's Story
 </button>
 <button className="w-full py-2.5 flex items-center justify-center gap-2 rounded-xl border border-surface-200 text-surface-700 font-medium text-sm hover:bg-surface-50 transition-all">
 <Gift className="w-4 h-4" />
 Gift This Adoption
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
