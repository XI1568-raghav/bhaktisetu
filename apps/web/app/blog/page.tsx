export const runtime = 'edge';
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, Sparkles } from "lucide-react";

export const metadata: Metadata = {
	title: "Blog",
	description:
		"Insights on Hindu traditions, temple technology, spiritual practices, and Darshya product updates. Coming soon — subscribe to be notified of our first essays.",
};

export default function BlogPage() {
	return (
		<div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
			{/* Hero */}
			<section className="py-14 sm:py-20">
				<div className="max-w-4xl mx-auto px-6 sm:px-8">
					<p
						className="text-xs font-semibold uppercase tracking-widest mb-3"
						style={{ color: "var(--color-primary)" }}
					>
						Blog
					</p>
					<h1
						className="text-2xl sm:text-3xl font-bold mb-4"
						style={{
							fontFamily: "var(--font-display)",
							color: "var(--color-text)",
							lineHeight: "var(--leading-tight)",
						}}
					>
						Stories, Insights & Updates
					</h1>
					<p
						className="text-sm max-w-xl leading-relaxed"
						style={{ color: "var(--color-text-muted)" }}
					>
						Exploring the intersection of technology and tradition. Product
						updates, spiritual knowledge, and the journey of building Darshya.
					</p>
				</div>
			</section>

			{/* Empty / pre-launch state */}
			<section className="pb-16 sm:pb-24">
				<div className="max-w-2xl mx-auto px-6 sm:px-8">
					<div
						className="p-8 rounded-xl text-center"
						style={{
							background: "var(--color-surface)",
							border: "1px solid var(--color-border)",
						}}
					>
						<div
							className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-5"
							style={{ background: "var(--color-primary-highlight)" }}
						>
							<Sparkles
								className="w-5 h-5"
								style={{ color: "var(--color-primary)" }}
							/>
						</div>
						<h2
							className="text-lg font-semibold mb-3"
							style={{
								fontFamily: "var(--font-display)",
								color: "var(--color-text)",
							}}
						>
							Our first essays are on the way
						</h2>
						<p
							className="text-sm leading-relaxed mb-6 max-w-md mx-auto"
							style={{ color: "var(--color-text-muted)" }}
						>
							We&apos;re drafting deep-dives on temple technology, Sanatan
							traditions, and how Darshya is built. Join the early-access
							waitlist and we&apos;ll email you the first piece.
						</p>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
							<Link
								href="/waitlist"
								className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg btn-press transition-colors"
								style={{
									background: "var(--color-primary)",
									color: "var(--color-text-inverse)",
								}}
							>
								Join the waitlist <ArrowRight className="w-3.5 h-3.5" />
							</Link>
							<a
								href="mailto:hello@darshya.online?subject=Blog%20updates"
								className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors"
								style={{
									background: "var(--color-bg)",
									color: "var(--color-text)",
									border: "1px solid var(--color-border)",
								}}
							>
								<Mail className="w-3.5 h-3.5" /> Email me when live
							</a>
						</div>
					</div>

					{/* Topics we&rsquo;ll cover */}
					<div className="mt-10">
						<p
							className="text-xs font-semibold uppercase tracking-widest mb-4 text-center"
							style={{ color: "var(--color-text-muted)" }}
						>
							Topics we&apos;ll cover
						</p>
						<div className="grid sm:grid-cols-2 gap-3">
							{[
								"Why video proof matters for online puja bookings",
								"Understanding Panchang for modern devotees",
								"How live darshan technology works behind the scenes",
								"The significance of Sankalp in Hindu rituals",
								"Building for the NRI Hindu diaspora",
								"Gau seva in the digital age",
							].map((topic) => (
								<div
									key={topic}
									className="p-3 rounded-lg text-xs"
									style={{
										background: "var(--color-surface)",
										border: "1px solid var(--color-border)",
										color: "var(--color-text-muted)",
									}}
								>
									{topic}
								</div>
							))}
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
