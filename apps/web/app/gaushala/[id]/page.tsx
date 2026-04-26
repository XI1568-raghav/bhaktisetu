export const runtime = 'edge';
import type { Metadata } from "next";
import { IMAGES } from "../../../lib/images";
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

export const metadata: Metadata = {
 title: "Cow Details — Gau Seva",
 description:
 "View cow details, health status, and monthly updates. Adopt this cow and receive regular photo updates.",
};

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
 IMAGES.gaushala['gir-cow'],
 healthStatus: "healthy",
 description:
 "Lakshmi is a gentle 5-year-old Gir cow with beautiful long ears and a calm temperament. She was rescued as a calf from a dairy that was shutting down. Now she is the star of the gaushala, often seen nuzzling visitors for treats. She gives 8 liters of rich A2 milk daily.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 IMAGES.gaushala['gir-cow'],
 description:
 "Lakshmi is doing well! She enjoyed the spring sunshine and has been very active. Vet checkup: healthy weight at 420kg.",
 },
 {
 date: "2026-02-15",
 photo:
 IMAGES.gaushala['tharparkar-cow'],
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
 IMAGES.gaushala['tharparkar-cow'],
 healthStatus: "healthy",
 description:
 "Gauri is a young 3-year-old Tharparkar cow with a beautiful grey-white coat. She is playful and curious, often leading the herd during morning walks. Being from a desert breed, she is remarkably resilient and low-maintenance.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 IMAGES.gaushala['tharparkar-cow'],
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
 IMAGES.gaushala['red-sindhi-cow'],
 healthStatus: "senior_care",
 description:
 "Radha is a 9-year-old Red Sindhi cow with a distinctive reddish-brown coat. She is one of the oldest residents at the gaushala and is treated with special care. Though she no longer gives milk, she is loved by everyone for her gentle nature.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 IMAGES.gaushala['red-sindhi-cow'],
 description:
 "Radha is receiving special senior care diet. Joint supplements have been added. She enjoys sunbathing in the afternoon.",
 },
 {
 date: "2026-02-15",
 photo:
 IMAGES.gaushala['gir-cow'],
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
 IMAGES.gaushala['cow-shelter'],
 healthStatus: "healthy",
 description:
 "Kamala is a 4-year-old Gir cow rescued from an illegal dairy operation in Jaipur. Despite her difficult past, she has blossomed into a healthy and affectionate cow. She is one of the highest milk producers at the gaushala.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 IMAGES.gaushala['cow-shelter'],
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
 IMAGES.gaushala['gir-cow'],
 healthStatus: "under_treatment",
 description:
 "Dhanvantari is a 6-year-old Kankrej bull, a majestic breed from Gujarat. He was found injured on a highway and brought to the gaushala. Currently undergoing treatment for a leg fracture but recovering well under expert veterinary care.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 IMAGES.gaushala['gir-cow'],
 description:
 "Dhanvantari is showing great improvement! The leg splint was adjusted. He can now walk short distances. Expected full recovery in 6 weeks.",
 },
 {
 date: "2026-02-15",
 photo:
 IMAGES.gaushala['tharparkar-cow'],
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
 IMAGES.gaushala['red-sindhi-cow'],
 healthStatus: "healthy",
 description:
 "Bhola is an adorable 2-year-old Tharparkar calf, born right here at Kamdhenu Gaushala. He is playful, energetic, and already a visitor favorite. Named 'Bhola' (innocent) for his trusting and sweet nature.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 IMAGES.gaushala['red-sindhi-cow'],
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
 IMAGES.gaushala['tharparkar-cow'],
 healthStatus: "healthy",
 description:
 "Surabhi is a magnificent 6-year-old Gir cow, the pride of Gokul Gaushala. Her A2 milk is used to produce the gaushala's famous organic ghee. She was hand-raised from birth and is incredibly friendly with humans.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 IMAGES.gaushala['tharparkar-cow'],
 description:
 "Surabhi produced 10 liters of rich A2 milk today. She is in excellent health. New organic fodder mix has been well received.",
 },
 {
 date: "2026-02-15",
 photo:
 IMAGES.gaushala['gir-cow'],
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
 IMAGES.gaushala['tharparkar-cow'],
 healthStatus: "healthy",
 description:
 "Kapila is a 4-year-old Sahiwal cow named after the sacred Kapila cow of Hindu mythology. She is known for her exceptionally creamy milk and calm temperament. Kapila is part of the gaushala's breed conservation program.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 IMAGES.gaushala['tharparkar-cow'],
 description:
 "Kapila is thriving in the conservation program. She has been selected for the indigenous breed documentation project. Health is excellent.",
 },
 ],
 },
};

/* Default fallback for unknown IDs */
const defaultCow = {
 id: "cow_001",
 name: "Lakshmi",
 breed: "Gir",
 age: 5,
 gaushalaId: "gs_001",
 gaushalaName: "Shri Krishna Gaushala",
 gaushalaLocation: "Vrindavan, Uttar Pradesh",
 photo:
 IMAGES.gaushala['gir-cow'],
 healthStatus: "healthy",
 description:
 "Lakshmi is a gentle 5-year-old Gir cow with beautiful long ears and a calm temperament. She was rescued as a calf from a dairy that was shutting down.",
 isAdopted: false,
 adopterName: null,
 monthlyUpdates: [
 {
 date: "2026-03-15",
 photo:
 IMAGES.gaushala['gir-cow'],
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
 description: "Annual care + 80G",
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
 phone: "+91 9876543210",
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
 phone: "+91 9123456780",
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
 phone: "+91 9988776655",
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
 <div className="min-h-screen bg-surface-50">
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
 src={cow.photo}
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
 <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-2">
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
 <button
 key={plan.id}
 className={`relative p-3 rounded-xl border text-left transition-all hover:shadow-md ${
 plan.popular
 ? "border-emerald-400 bg-white ring-1 ring-emerald-200"
 : "border-surface-200 bg-white hover:border-emerald-300"
 }`}
 >
 {plan.popular && (
 <span className="absolute -top-2 right-2 px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-bold uppercase tracking-wider rounded-full">
 Popular
 </span>
 )}
 <p className="text-xs text-surface-500 mb-0.5">
 {plan.name}
 </p>
 <p className="text-sm font-bold text-surface-900">
 {plan.price}
 </p>
 <p className="text-[11px] text-surface-400 mt-0.5">
 {plan.description}
 </p>
 </button>
 ))}
 </div>
 <button className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md shadow-emerald-500/20 btn-press flex items-center justify-center gap-2">
 <Heart className="w-5 h-5" />
 Adopt {cow.name}
 </button>
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
 {/* self-start prevents the column from stretching to match the left
 col's height, which would otherwise let the sticky card cover
 content beneath it once the user scrolls past its natural end.
 max-h on the sticky card ensures it never exceeds viewport. */}
 <div className="space-y-6 self-start">
 {/* Quick adopt CTA (sticky on desktop) */}
 {!cow.isAdopted && (
 <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-6 text-white shadow-lg lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
 <h3 className="text-lg font-bold mb-2">
 Adopt {cow.name} Today
 </h3>
 <p className="text-emerald-100 text-sm mb-4 leading-relaxed">
 Your seva directly provides food, shelter, and medical care.
 Receive monthly photo updates.
 </p>
 <div className="space-y-2 mb-5">
 {[
 "Monthly photo & video updates",
 "Visit your cow anytime",
 "80G tax receipt (annual/lifetime)",
 "Digital adoption certificate",
 ].map((item) => (
 <div
 key={item}
 className="flex items-center gap-2 text-sm text-emerald-50"
 >
 <Check className="w-4 h-4 text-emerald-300 shrink-0" />
 {item}
 </div>
 ))}
 </div>
 <button className="w-full py-3 bg-white text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-all btn-press flex items-center justify-center gap-2">
 <Heart className="w-5 h-5" />
 Adopt Now
 </button>
 <p className="text-emerald-200 text-[11px] text-center mt-3">
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

 <div className="h-px bg-surface-100" />

 <div>
 <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">
 Facilities
 </p>
 <div className="flex flex-wrap gap-1.5">
 {gsInfo.facilities.map((f) => (
 <span
 key={f}
 className="px-2.5 py-1 bg-surface-50 border border-surface-100 rounded-lg text-[11px] font-medium text-surface-600"
 >
 {f}
 </span>
 ))}
 </div>
 </div>
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
