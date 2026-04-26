import type { Metadata } from "next";
import { MapPin, Clock, Briefcase, Heart, Zap, Users, BookOpen, Coffee } from "lucide-react";

export const metadata: Metadata = {
 title: "Careers",
 description:
 "Join Darshya and help build India\u2019s devotional super-app. We\u2019re hiring engineers, designers, and operators who care about faith and technology.",
};

const benefits = [
 {
 icon: Heart,
 title: "Mission with Meaning",
 description: "Work on something that touches millions of devotees\u2019 spiritual lives daily.",
 },
 {
 icon: Zap,
 title: "Startup Speed",
 description: "Ship fast, learn fast. No bureaucracy. Direct impact from day one.",
 },
 {
 icon: Users,
 title: "Small, Elite Team",
 description: "Work alongside IIT alumni, ex-startup operators, and temple domain experts.",
 },
 {
 icon: BookOpen,
 title: "Learning Budget",
 description: "Annual learning stipend for courses, conferences, and books of your choice.",
 },
 {
 icon: Coffee,
 title: "Flexible Work",
 description: "Remote-first with optional co-working in Bengaluru. Async by default.",
 },
 {
 icon: Briefcase,
 title: "Competitive Comp",
 description: "Market-rate salary, meaningful ESOPs, and health insurance for you + family.",
 },
];

const openings = [
 {
 title: "Senior Full-Stack Engineer",
 team: "Engineering",
 location: "Bengaluru / Remote",
 type: "Full-time",
 description:
 "Own end-to-end features across our Next.js frontend and Fastify API. Strong TypeScript, React, and Prisma experience required.",
 },
 {
 title: "React Native Engineer",
 team: "Mobile",
 location: "Bengaluru / Remote",
 type: "Full-time",
 description:
 "Build and ship our Expo-based mobile app. Experience with Expo Router, native modules, and live streaming SDKs is a plus.",
 },
 {
 title: "Product Designer",
 team: "Design",
 location: "Bengaluru / Remote",
 type: "Full-time",
 description:
 "Design devotional experiences that feel warm, accessible, and authentic. Figma mastery and mobile-first design thinking required.",
 },
 {
 title: "Temple Partnerships Lead",
 team: "Operations",
 location: "Bengaluru",
 type: "Full-time",
 description:
 "Build and manage relationships with temples across India. Must be fluent in Hindi and at least one South Indian language. Travel required.",
 },
 {
 title: "Content & Community Manager",
 team: "Marketing",
 location: "Remote",
 type: "Full-time",
 description:
 "Curate spiritual content, manage social channels, and grow our devotee community. Deep knowledge of Hindu traditions expected.",
 },
];

export default function CareersPage() {
 return (
 <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
 {/* Hero */}
 <section
 className="relative overflow-hidden py-16 sm:py-24"
 style={{ background: "linear-gradient(135deg, #2a2520, #3a3530)" }}
 >
 <div
 className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-15"
 style={{ background: "var(--color-primary)", filter: "blur(100px)" }}
 />
 <div className="relative max-w-4xl mx-auto px-6 sm:px-8 text-center">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-4"
 style={{ color: "var(--color-primary)" }}
 >
 Careers at Darshya
 </p>
 <h1
 className="text-2xl sm:text-3xl font-bold mb-6"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text-inverse)",
 lineHeight: "var(--leading-tight)",
 }}
 >
 Build Technology That Serves Faith
 </h1>
 <p
 className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed"
 style={{ color: "var(--color-text-faint)" }}
 >
 We&apos;re a small team solving a massive problem: making India&apos;s $58B
 devotional ecosystem accessible through technology. If you care
 about craftsmanship and dharma, we should talk.
 </p>
 </div>
 </section>

 {/* Benefits */}
 <section className="py-14 sm:py-20">
 <div className="max-w-5xl mx-auto px-6 sm:px-8">
 <div className="text-center mb-12">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Why Darshya
 </p>
 <h2
 className="text-xl sm:text-2xl font-bold"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 More Than a Job
 </h2>
 </div>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
 {benefits.map((benefit) => {
 const Icon = benefit.icon;
 return (
 <div
 key={benefit.title}
 className="p-5 rounded-xl"
 style={{
 background: "var(--color-surface)",
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
 className="text-sm font-semibold mb-1.5"
 style={{ color: "var(--color-text)" }}
 >
 {benefit.title}
 </h3>
 <p
 className="text-sm leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 {benefit.description}
 </p>
 </div>
 );
 })}
 </div>
 </div>
 </section>

 {/* Open Positions */}
 <section
 className="py-14 sm:py-20"
 style={{ background: "var(--color-surface)" }}
 >
 <div className="max-w-4xl mx-auto px-6 sm:px-8">
 <div className="text-center mb-12">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-3"
 style={{ color: "var(--color-primary)" }}
 >
 Open Positions
 </p>
 <h2
 className="text-xl sm:text-2xl font-bold"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Current Openings
 </h2>
 </div>
 <div className="space-y-4">
 {openings.map((job) => (
 <div
 key={job.title}
 className="p-5 rounded-xl card-hover"
 style={{
 background: "var(--color-bg)",
 border: "1px solid var(--color-border)",
 }}
 >
 <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
 <div>
 <h3
 className="text-sm font-semibold"
 style={{ color: "var(--color-text)" }}
 >
 {job.title}
 </h3>
 <p
 className="text-xs mt-0.5"
 style={{ color: "var(--color-primary)" }}
 >
 {job.team}
 </p>
 </div>
 <div className="flex items-center gap-3 text-xs shrink-0" style={{ color: "var(--color-text-muted)" }}>
 <span className="flex items-center gap-1">
 <MapPin className="w-3 h-3" />
 {job.location}
 </span>
 <span className="flex items-center gap-1">
 <Clock className="w-3 h-3" />
 {job.type}
 </span>
 </div>
 </div>
 <p
 className="text-sm leading-relaxed"
 style={{ color: "var(--color-text-muted)" }}
 >
 {job.description}
 </p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* CTA */}
 <section className="py-14 sm:py-20">
 <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center">
 <h2
 className="text-xl sm:text-2xl font-bold mb-4"
 style={{
 fontFamily: "var(--font-display)",
 color: "var(--color-text)",
 }}
 >
 Don&apos;t See Your Role?
 </h2>
 <p
 className="text-sm leading-relaxed mb-6 max-w-xl mx-auto"
 style={{ color: "var(--color-text-muted)" }}
 >
 We are always looking for exceptional people who share our mission.
 Send us your resume and a short note about why Darshya resonates
 with you.
 </p>
 <a
 href="mailto:careers@darshya.online"
 className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg btn-press transition-colors"
 style={{
 background: "var(--color-primary)",
 color: "var(--color-text-inverse)",
 }}
 >
 Email careers@darshya.online
 </a>
 </div>
 </section>
 </div>
 );
}
