import type { Metadata } from "next";
import { IMAGES } from "../../lib/images";
import { ApprovedProvidersStrip } from "../../components/ApprovedProvidersStrip";
import {
 Heart,
 Shield,
 Camera,
 MapPin,
 BadgeCheck,
 FileText,
 ChevronRight,
 Star,
 Users,
 IndianRupee,
 ArrowRight,
 Check,
 ChevronDown,
 Leaf,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
 title: "Gau Seva — Adopt a Cow",
 description:
 "Adopt a cow at a verified gaushala. Get monthly photo updates, visit anytime, and earn divine blessings. Support cow protection across India with Darshya.",
};

/* ── Hardcoded data (matches API) ─────────────────────────────────────────────── */

const gaushalas = [
 {
 id: "gs_001",
 name: "Shri Krishna Gaushala",
 location: "Vrindavan, Uttar Pradesh",
 totalCows: 500,
 availableCows: 3,
 affiliation: "ISKCON-affiliated",
 image: IMAGES.gaushala['cow-shelter'],
 description:
 "One of the most revered gaushalas in Vrindavan, affiliated with ISKCON. Home to 500+ cows including rare indigenous breeds.",
 },
 {
 id: "gs_002",
 name: "Kamdhenu Gaushala",
 location: "Jaipur, Rajasthan",
 totalCows: 1200,
 availableCows: 5,
 affiliation: "Government Registered",
 image: IMAGES.gaushala['tharparkar-cow'],
 description:
 "A government-registered gaushala spanning 50 acres. Houses 1200+ rescued cows with modern veterinary facility.",
 },
 {
 id: "gs_003",
 name: "Gokul Gaushala",
 location: "Mathura, Uttar Pradesh",
 totalCows: 350,
 availableCows: 4,
 affiliation: "Organic Products Certified",
 image: IMAGES.gaushala['gir-cow'],
 description:
 "A heritage gaushala in Mathura, operating since 1952. Known for preserving rare Indian cow breeds and organic A2 products.",
 },
];

const featuredCows = [
 {
 id: "cow_001",
 name: "Lakshmi",
 breed: "Gir",
 age: 5,
 gaushalaName: "Shri Krishna Gaushala",
 photo: IMAGES.gaushala['gir-cow'],
 healthStatus: "healthy",
 },
 {
 id: "cow_003",
 name: "Gauri",
 breed: "Tharparkar",
 age: 3,
 gaushalaName: "Shri Krishna Gaushala",
 photo: IMAGES.gaushala['tharparkar-cow'],
 healthStatus: "healthy",
 },
 {
 id: "cow_005",
 name: "Kamala",
 breed: "Gir",
 age: 4,
 gaushalaName: "Kamdhenu Gaushala",
 photo: IMAGES.gaushala['gir-cow'],
 healthStatus: "healthy",
 },
 {
 id: "cow_006",
 name: "Dhanvantari",
 breed: "Kankrej",
 age: 6,
 gaushalaName: "Kamdhenu Gaushala",
 photo: IMAGES.gaushala['gir-cow'],
 healthStatus: "under_treatment",
 },
 {
 id: "cow_008",
 name: "Bhola",
 breed: "Tharparkar",
 age: 2,
 gaushalaName: "Kamdhenu Gaushala",
 photo: IMAGES.gaushala['tharparkar-cow'],
 healthStatus: "healthy",
 },
 {
 id: "cow_010",
 name: "Surabhi",
 breed: "Gir",
 age: 6,
 gaushalaName: "Gokul Gaushala",
 photo: IMAGES.gaushala['gir-cow'],
 healthStatus: "healthy",
 },
 {
 id: "cow_011",
 name: "Kapila",
 breed: "Sahiwal",
 age: 4,
 gaushalaName: "Gokul Gaushala",
 photo: IMAGES.gaushala['sahiwal-cow'],
 healthStatus: "healthy",
 },
 {
 id: "cow_004",
 name: "Radha",
 breed: "Red Sindhi",
 age: 9,
 gaushalaName: "Shri Krishna Gaushala",
 photo: IMAGES.gaushala['red-sindhi-cow'],
 healthStatus: "senior_care",
 },
];

const adoptionPlans = [
 {
 id: "plan_daily",
 name: "Gau Seva",
 nameHindi: "\u0917\u094C \u0938\u0947\u0935\u093E",
 price: "\u20B951",
 period: "/day",
 popular: false,
 features: [
 "Daily feeding of one cow",
 "Monthly photo update via WhatsApp",
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
 features: [
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
 features: [
 "Full annual care of one cow",
 "Weekly photo & video updates",
 "Unlimited visits",
 "Framed certificate with cow photo",
 "Monthly health report",
 "80G tax receipt",
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
 features: [
 "Lifetime care of one cow",
 "Weekly photo & video updates",
 "Unlimited visits with family",
 "Premium framed certificate",
 "Monthly health report",
 "80G tax receipt",
 "Name plaque at gaushala",
 "Annual Gau Puja invitation",
 "Priority for new cow adoption",
 ],
 },
];

const faqs = [
 {
 q: "How do I know my donation is being used properly?",
 a: "Every adopter receives monthly photo and video updates of their cow via WhatsApp and email. You can also visit the gaushala anytime during visiting hours to see your cow in person. All our gaushalas are verified and audited regularly.",
 },
 {
 q: "Can I visit the cow I have adopted?",
 a: "Absolutely! All our gaushala partners allow adopters to visit their cows during visiting hours. Annual and Lifetime plan adopters get unlimited family visits. We recommend calling ahead to schedule your visit.",
 },
 {
 q: "Is my donation tax-deductible?",
 a: "Yes! Donations under the Annual (Gau Raksha) and Lifetime (Gau Daan) plans are eligible for tax deduction under Section 80G of the Income Tax Act. You will receive a valid 80G receipt for your records.",
 },
 {
 q: "What happens if the cow I adopted passes away?",
 a: "In the unfortunate event, we will immediately notify you and offer the option to transfer your adoption to another cow or receive a full refund for the remaining period. We maintain complete transparency throughout.",
 },
 {
 q: "Can I gift a cow adoption to someone?",
 a: "Yes! Cow adoption makes a deeply meaningful and spiritual gift. You can gift any plan to a loved one, and they will receive a beautiful adoption certificate along with all regular updates.",
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
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
 Healthy
 </span>
 );
 case "under_treatment":
 return (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
 <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
 Under Treatment
 </span>
 );
 case "senior_care":
 return (
 <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-700">
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
 <div className="min-h-screen">
 {/* ── Hero ────────────────────────────────────────────────────────────────── */}
 <section className="relative overflow-hidden bg-[#ede9e3]">

 <div className="relative max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 py-16 lg:py-24">
 <div className="text-center max-w-3xl mx-auto">
 <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron-600/10 text-saffron-700 text-sm font-medium mb-6 border border-saffron-200/40">
 <Leaf className="w-4 h-4" />
 Gau Seva — A Sacred Act of Devotion
 </div>
 <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-surface-800 leading-tight mb-6">
 Adopt a Cow,{" "}
 <span className="text-transparent bg-clip-text bg-gradient-to-r from-saffron-600 to-amber-600">
 Earn Divine Blessings
 </span>
 </h1>
 <p className="text-lg sm:text-xl text-surface-500 leading-relaxed mb-8 max-w-2xl mx-auto">
 Support verified gaushalas across India. Receive monthly photo
 updates of your adopted cow, visit anytime, and contribute to the
 protection of India's sacred cows.
 </p>
 <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
 <a
 href="#cows"
 className="inline-flex items-center gap-2 px-8 py-3.5 bg-saffron-600 text-white font-medium rounded-lg hover:bg-saffron-700 transition-all shadow-sm btn-press"
 >
 <Heart className="w-5 h-5" />
 Adopt a Cow
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
 label: "Verified Gaushalas",
 sub: "Audited & transparent",
 },
 {
 icon: Camera,
 label: "Monthly Photo Updates",
 sub: "See your cow thrive",
 },
 {
 icon: MapPin,
 label: "Visit Anytime",
 sub: "Open-door policy",
 },
 {
 icon: FileText,
 label: "Tax Receipt (80G)",
 sub: "Save on income tax",
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

 {/* ── Gaushalas Section ───────────────────────────────────────────────────── */}
 <section className="py-16 lg:py-20 bg-surface-50">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
 <div className="text-center mb-12">
 <h2 className="text-2xl font-semibold text-surface-800 mb-3">
 Our Verified Gaushalas
 </h2>
 <p className="text-surface-600 max-w-xl mx-auto">
 Each gaushala is personally verified by our team. We ensure
 highest standards of cow care and complete financial transparency.
 </p>
 </div>

 <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
 {gaushalas.map((gs) => (
 <div
 key={gs.id}
 className="group bg-[var(--color-surface)] rounded-xl overflow-hidden border border-[var(--color-border)] shadow-warm-sm card-hover transition-all duration-300"
 >
 <div className="relative h-48 overflow-hidden">
 <img
 src={gs.image}
 alt={gs.name}
 className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
 />
 <div className="absolute top-3 left-3">
 <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-sm text-[11px] font-semibold text-emerald-700">
 <BadgeCheck className="w-3.5 h-3.5" />
 Verified
 </span>
 </div>
 </div>
 <div className="p-5">
 <h3 className="text-lg font-bold text-surface-900 mb-1">
 {gs.name}
 </h3>
 <p className="text-sm text-surface-500 flex items-center gap-1 mb-3">
 <MapPin className="w-3.5 h-3.5" />
 {gs.location}
 </p>
 <p className="text-sm text-surface-600 mb-4 line-clamp-2">
 {gs.description}
 </p>
 <div className="flex items-center justify-between mb-4">
 <div className="text-center">
 <p className="text-lg font-bold text-surface-900">
 {gs.totalCows}+
 </p>
 <p className="text-[11px] text-surface-500">Total Cows</p>
 </div>
 <div className="h-8 w-px bg-surface-200" />
 <div className="text-center">
 <p className="text-lg font-bold text-emerald-600">
 {gs.availableCows}
 </p>
 <p className="text-[11px] text-surface-500">
 Available to Adopt
 </p>
 </div>
 <div className="h-8 w-px bg-surface-200" />
 <div className="text-center">
 <p className="text-xs font-medium text-surface-500">
 {gs.affiliation}
 </p>
 </div>
 </div>
 <Link
 href={`/gaushala/${gs.id}`}
 className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-saffron-50 text-saffron-700 font-medium rounded-lg hover:bg-saffron-100 transition-colors text-sm"
 >
 Explore Gaushala
 <ChevronRight className="w-4 h-4" />
 </Link>
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
 <p className="text-surface-600">
 Each cow has a unique story. Choose one to bring into your
 family and provide lifelong care.
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
 <img
 src={cow.photo}
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
 <span className="px-3 py-1 bg-saffron-600 text-white text-[10px] font-semibold uppercase tracking-wider rounded-full">
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
 <button
 className={`w-full py-3 rounded-lg font-medium text-sm transition-all btn-press ${
 plan.popular
 ? "bg-saffron-600 text-white hover:bg-saffron-700"
 : "bg-saffron-50 text-saffron-700 hover:bg-saffron-100"
 }`}
 >
 Select Plan
 </button>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* ── Impact Stats ────────────────────────────────────────────────────────── */}
 <section className="py-16 lg:py-20 bg-[#2a2520] text-white">
 <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
 <div className="text-center mb-12">
 <h2 className="text-2xl font-semibold mb-3">
 Our Collective Impact
 </h2>
 <p className="text-surface-400 max-w-xl mx-auto">
 Together, Darshya devotees are making a real difference in cow
 protection across India.
 </p>
 </div>

 <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
 {[
 {
 value: "5,000+",
 label: "Cows Protected",
 icon: Heart,
 },
 {
 value: "\u20B92Cr+",
 label: "Donated by Devotees",
 icon: IndianRupee,
 },
 {
 value: "100+",
 label: "Partner Gaushalas",
 icon: Shield,
 },
 {
 value: "25,000+",
 label: "Happy Adopters",
 icon: Users,
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
 <p className="text-saffron-100 text-lg mb-8 max-w-2xl mx-auto">
 The scriptures say that serving a cow is equivalent to serving all
 33 crore devas. Start your journey of divine blessings today.
 </p>
 <a
 href="#cows"
 className="inline-flex items-center gap-2 px-8 py-4 bg-white text-saffron-700 font-medium rounded-lg hover:bg-saffron-50 transition-all shadow-sm btn-press text-lg"
 >
 <Heart className="w-5 h-5" />
 Adopt a Cow Now
 </a>
 </div>
 </section>

 <ApprovedProvidersStrip
 type="gaushala"
 heading="Verified gaushalas on Darshya"
 subheading="Approved gaushalas you can support directly. Each one is reviewed before being listed."
 limit={8}
 />
 </div>
 );
}
