import type { Metadata } from "next";
import { Calendar, ArrowRight, Tag } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Insights on Hindu traditions, temple technology, spiritual practices, and Darshya product updates.",
};

const posts = [
  {
    title: "Why Video Proof Matters for Online Puja Bookings",
    excerpt:
      "Trust is the foundation of devotion. We explain how video-proof pujas ensure authenticity and give devotees peace of mind when booking rituals remotely.",
    date: "April 10, 2026",
    category: "Product",
    slug: "#",
  },
  {
    title: "Understanding Panchang: A Guide for Modern Devotees",
    excerpt:
      "Tithi, nakshatra, yoga, karana \u2014 the Hindu almanac holds deep wisdom for daily life. Here\u2019s a practical guide to reading and using the Panchang in your spiritual routine.",
    date: "March 28, 2026",
    category: "Traditions",
    slug: "#",
  },
  {
    title: "How Live Darshan Technology Works Behind the Scenes",
    excerpt:
      "From temple cameras to AWS IVS streaming to your phone in under 3 seconds. A technical look at how we deliver real-time darshan with devotional-grade reliability.",
    date: "March 15, 2026",
    category: "Engineering",
    slug: "#",
  },
  {
    title: "The Significance of Sankalp in Hindu Rituals",
    excerpt:
      "Before any puja begins, the priest takes a formal sankalp \u2014 declaring the devotee\u2019s name, gotra, and intention. Understanding why this ancient practice matters.",
    date: "February 22, 2026",
    category: "Traditions",
    slug: "#",
  },
  {
    title: "Serving the Diaspora: Building for NRI Devotees",
    excerpt:
      "Millions of Hindus abroad want to stay connected with their family temples. How Darshya designs features for devotees across time zones and currencies.",
    date: "February 8, 2026",
    category: "Product",
    slug: "#",
  },
  {
    title: "Gau Seva in the Digital Age: Our Gaushala Initiative",
    excerpt:
      "Cow care is a sacred duty in Sanatan Dharma. We partnered with verified gaushalas to let devotees sponsor daily feeding and medical care for Gaumata.",
    date: "January 18, 2026",
    category: "Impact",
    slug: "#",
  },
];

const categoryColors: Record<string, string> = {
  Product: "var(--color-primary)",
  Traditions: "#D4A438",
  Engineering: "var(--color-info)",
  Impact: "var(--color-success)",
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
            updates, spiritual knowledge, and the journey of building
            Darshya.
          </p>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="grid sm:grid-cols-2 gap-5">
            {posts.map((post) => (
              <article
                key={post.title}
                className="p-5 rounded-xl card-hover flex flex-col"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md"
                    style={{
                      background: `color-mix(in oklch, ${categoryColors[post.category] || "var(--color-primary)"} 10%, transparent)`,
                      color: categoryColors[post.category] || "var(--color-primary)",
                    }}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {post.category}
                  </span>
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--color-text-faint)" }}
                  >
                    <Calendar className="w-2.5 h-2.5" />
                    {post.date}
                  </span>
                </div>
                <h2
                  className="text-sm font-semibold mb-2"
                  style={{ color: "var(--color-text)" }}
                >
                  {post.title}
                </h2>
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {post.excerpt}
                </p>
                <div className="mt-4">
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium"
                    style={{ color: "var(--color-primary)" }}
                  >
                    Read more <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
