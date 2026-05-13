import type { Metadata } from "next";
import { Heart, Users, Globe, BookOpen, Flame, Shield } from "lucide-react";
import { organizationJsonLd } from "../../lib/jsonld";

export const metadata: Metadata = {
 title: "About Us",
 description:
 "Darshya bridges devotees to the divine through technology. Learn about our mission, values, and the team building India\u2019s devotional super-app.",
 alternates: { canonical: "https://darshya.online/about" },
 openGraph: {
   title: "About Us | Darshya",
   description:
   "Darshya bridges devotees to the divine through technology. Learn about our mission, values, and the team building India\u2019s devotional super-app.",
   url: "https://darshya.online/about",
   type: "website",
   // TODO: add /og-default.png (1200x630) to apps/web/public/
   images: ["/og-default.png"],
 },
 twitter: {
   card: "summary_large_image",
   title: "About Us | Darshya",
   description:
   "Darshya bridges devotees to the divine through technology. Learn about our mission, values, and the team building India\u2019s devotional super-app.",
   images: ["/og-default.png"],
 },
};

const values = [
 {
 icon: Flame,
 title: "Shraddha (Devotion)",
 description:
 "Every feature we build begins with reverence for the traditions we serve. Technology is the bridge, not the destination.",
 },
 {
 icon: Shield,
 title: "Satya (Integrity)",
 description:
 "Transparent pricing, verified temples, video-proof pujas. We earn trust through accountability at every step.",
 },
 {
 icon: Users,
 title: "Seva (Service)",
 description:
 "We exist to serve devotees, priests, and temples. Our success is measured by the spiritual experiences we enable.",
 },
 {
 icon: Globe,
 title: "Sangam (Connection)",
 description:
 "Bridging the distance between devotees worldwide and sacred spaces across Bharat, one darshan at a time.",
 },
 {
 icon: BookOpen,
 title: "Parampara (Tradition)",
 description:
 "We preserve the authenticity of rituals, mantras, and practices. Digital convenience without diluting dharmic heritage.",
 },
 {
 icon: Heart,
 title: "Karuna (Compassion)",
 description:
 "From gau seva to accessible puja booking, we build with empathy for every devotee\u2019s journey and circumstance.",
 },
];

const milestones = [
 { year: "2023", event: "Darshya founded in Bengaluru" },
 { year: "2023", event: "First 50 temples onboarded across Karnataka and Tamil Nadu" },
 { year: "2024", event: "Live darshan streaming launched with AWS IVS" },
 { year: "2024", event: "Puja booking with video proof goes live" },
 { year: "2025", event: "Ask Pandit AI spiritual guidance launched" },
 { year: "2025", event: "Gaushala seva and NRI devotee features added" },
 { year: "2026", event: "Public early-access launch — onboarding founding devotees" },
];

export default function AboutPage() {
 return (
 <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
 <script
   type="application/ld+json"
   dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
 />
 {/* Hero */}
 <section
 className="relative overflow-hidden py-16 sm:py-24"
 style={{ background: "linear-gradient(135deg, #2a2520, #3a3530)" }}
 >
 <div
 className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20"
 style={{ background: "var(--color-primary)", filter: "blur(100px)" }}
 />
 <div className="relative max-w-4xl mx-auto px-6 sm:px-8 text-center">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-4"
 style={{ color: "var(--color-primary)" }}
 >
 Our Story
 </p>
 <h1
 className="text-2xl sm:text-3xl font-bold mb-6"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text-inverse)",
 lineHeight: "var(--leading-tight)",
 }}
 >
 Bridging Devotees to the Divine
 </h1>
 <p
 className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
 style={{ color: "var(--color-text-faint)" }}
 >
 Darshya was born from a simple observation: millions of devotees
 across Bharat and the diaspora yearn to stay connected with their
 kuldevta, participate in temple rituals, and experience darshan —
 but distance, time, and accessibility stand in the way. We set out
 to change that.
 </p>
 </div>
 </section>

 {/* Mission */}
 <section className="py-14 sm:py-20">
 <div className="max-w-4xl mx-auto px-6 sm:px-8">
 <div className="grid md:grid-cols-2 gap-10">
 <div>
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Mission
 </p>
 <h2
 className="text-xl sm:text-2xl font-bold mb-4"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 lineHeight: "var(--leading-tight)",
 }}
 >
 Making Bhakti Accessible to Every Home
 </h2>
 <p
 className="text-sm leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 We are building India&apos;s most trusted devotional platform — one
 that brings the sanctity of the temple directly to the devotee.
 Through live darshan, authenticated puja bookings with video
 proof, rich spiritual content, and a curated sacred store, we
 serve as the digital setu between faith and everyday life.
 </p>
 </div>
 <div>
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Vision
 </p>
 <h2
 className="text-xl sm:text-2xl font-bold mb-4"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 lineHeight: "var(--leading-tight)",
 }}
 >
 India&apos;s Spiritual Companion for the Digital Age
 </h2>
 <p
 className="text-sm leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 We envision a world where no devotee feels disconnected from
 their faith. Whether you are a grandmother in a village seeking
 her morning aarti, an NRI family wanting to perform pitru
 tarpan, or a young professional exploring mantra meditation —
 Darshya will be your companion on the spiritual path.
 </p>
 </div>
 </div>
 </div>
 </section>

 {/* Values */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-5xl mx-auto px-6 sm:px-8">
 <div className="text-center mb-12">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Our Values
 </p>
 <h2
 className="text-xl sm:text-2xl font-bold"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Built on Dharmic Principles
 </h2>
 </div>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {values.map((value) => {
 const Icon = value.icon;
 return (
 <div
 key={value.title}
 className="p-5 rounded-xl card-hover"
 style={{
 background: "var(--color-bg)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div
 className="w-9 h-9 rounded-lg flex items-center justify-center mb-3"
 style={{ background: "var(--color-primary-highlight)" }}
 >
 <Icon
 className="w-4 h-4"
 style={{ color: "var(--color-primary)" }}
 />
 </div>
 <h3
 className="text-sm font-semibold mb-2"
 style={{ color: "var(--color-text)" }}
 >
 {value.title}
 </h3>
 <p
 className="text-sm leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 {value.description}
 </p>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* Timeline */}
 <section className="py-14 sm:py-20">
 <div className="max-w-3xl mx-auto px-6 sm:px-8">
 <div className="text-center mb-12">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Our Journey
 </p>
 <h2
 className="text-xl sm:text-2xl font-bold"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Milestones Along the Path
 </h2>
 </div>
 <div className="space-y-0">
 {milestones.map((item, i) => (
 <div key={i} className="flex gap-5 pb-6 last:pb-0">
 <div className="flex flex-col items-center">
 <div
 className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
 style={{ background: "var(--color-primary)" }}
 />
 {i < milestones.length - 1 && (
 <div
 className="w-px flex-1 mt-1"
 style={{ background: "var(--color-border)" }}
 />
 )}
 </div>
 <div className="pb-2">
 <span
 className="text-xs font-semibold"
 style={{ color: "var(--color-primary)" }}
 >
 {item.year}
 </span>
 <p
 className="text-sm mt-0.5"
 style={{ color: "var(--color-text)" }}
 >
 {item.event}
 </p>
 </div>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Team */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-4xl mx-auto px-6 sm:px-8 text-center">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 The Team
 </p>
 <h2
 className="text-xl sm:text-2xl font-bold mb-4"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Devotees Building for Devotees
 </h2>
 <p
 className="text-sm leading-relaxed max-w-2xl mx-auto mb-8"
 style={{ color: "var(--color-text-muted)" }}
 >
 We are a small, focused team of engineers, designers, and domain
 experts based in Bengaluru. Our team includes temple archaka
 families, IIT alumni, and ex-startup operators who share a deep
 personal connection to Sanatan Dharma. Every sprint starts with a
 morning prayer.
 </p>
 <a
 href="/careers"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg btn-press transition-colors"
 style={{
 background: "var(--color-primary)",
 color: "var(--color-text-inverse)",
 }}
 >
 Join Our Team
 </a>
 </div>
 </section>
 </div>
 );
}
