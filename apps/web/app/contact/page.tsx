'use client';

import { Mail, Phone, MapPin, Clock, MessageCircle, Send, Globe, Briefcase, Handshake, Scale, Newspaper } from "lucide-react";

const regionalPhones = [
  { region: "India", flag: "🇮🇳", phone: "+91-80-6900-9000", hours: "8:00 AM – 11:00 PM IST · Daily" },
  { region: "United States", flag: "🇺🇸", phone: "+1 (408) 900-0900", hours: "9:00 AM – 8:00 PM PT · Mon–Sat" },
  { region: "United Kingdom", flag: "🇬🇧", phone: "+44 20 4525 9000", hours: "9:00 AM – 7:00 PM GMT · Mon–Sat" },
  { region: "Canada", flag: "🇨🇦", phone: "+1 (416) 900-0900", hours: "9:00 AM – 8:00 PM ET · Mon–Sat" },
  { region: "Australia", flag: "🇦🇺", phone: "+61 2 8319 0900", hours: "9:00 AM – 7:00 PM AEST · Mon–Sat" },
  { region: "UAE", flag: "🇦🇪", phone: "+971 4 556 0900", hours: "9:00 AM – 9:00 PM GST · Sat–Thu" },
];

const escalationEmails = [
  { label: "Sales & enterprise", email: "sales@darshya.online", icon: Briefcase },
  { label: "Temple partnerships", email: "partners@darshya.online", icon: Handshake },
  { label: "Press & media", email: "press@darshya.online", icon: Newspaper },
  { label: "Legal & compliance", email: "legal@darshya.online", icon: Scale },
];

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    detail: "support@darshya.online",
    description: "For booking queries, account issues, and general help. We respond within 24 hours.",
  },
  {
    icon: Phone,
    title: "Phone",
    detail: "+91 80-BHAKTI-00",
    description: "Available Monday to Saturday, 9 AM \u2013 6 PM IST. Closed on major Hindu festivals.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    detail: "+91 80-BHAKTI-00",
    description: "Send us a message on WhatsApp for quick queries about bookings or darshan schedules.",
  },
  {
    icon: MapPin,
    title: "Office",
    detail: "Bengaluru, Karnataka",
    description: "Darshya Technologies Pvt. Ltd., HSR Layout, Bengaluru \u2013 560102, India.",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      {/* Hero */}
      <section className="py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--color-primary)" }}
          >
            Contact Us
          </p>
          <h1
            className="text-2xl sm:text-3xl font-bold mb-4"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--color-text)",
              lineHeight: "var(--leading-tight)",
            }}
          >
            We&apos;re Here to Help
          </h1>
          <p
            className="text-sm max-w-xl leading-relaxed"
            style={{ color: "var(--color-text-muted)" }}
          >
            Whether you have a question about a puja booking, need technical
            support, or want to partner with us as a temple, we&apos;d love to
            hear from you.
          </p>
        </div>
      </section>

      {/* Global phones + office hours */}
      <section className="pb-10">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4" style={{ color: "var(--color-primary)" }} />
            <h2 className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              Global support lines
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {regionalPhones.map((r) => (
              <div
                key={r.region}
                className="rounded-xl p-4"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{r.flag}</span>
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                    {r.region}
                  </span>
                </div>
                <a
                  href={`tel:${r.phone.replace(/[^+\d]/g, "")}`}
                  className="text-sm font-mono block mb-1"
                  style={{ color: "var(--color-primary)" }}
                >
                  {r.phone}
                </a>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {r.hours}
                </p>
              </div>
            ))}
          </div>

          {/* Escalation emails + WhatsApp widget */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text)" }}>
                Specialized inboxes
              </h3>
              <ul className="space-y-3">
                {escalationEmails.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.email} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--color-primary-highlight)" }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
                      </div>
                      <div>
                        <div className="text-xs font-medium" style={{ color: "var(--color-text)" }}>
                          {item.label}
                        </div>
                        <a
                          href={`mailto:${item.email}`}
                          className="text-xs"
                          style={{ color: "var(--color-primary)" }}
                        >
                          {item.email}
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* WhatsApp widget mockup */}
            <div
              className="rounded-xl p-5 flex flex-col"
              style={{
                background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
                border: "1px solid rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">WhatsApp Support</div>
                  <div className="text-xs text-white/80 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Agent online · avg 2 min reply
                  </div>
                </div>
              </div>
              <div className="bg-white/95 rounded-lg p-3 text-xs text-surface-700 mb-4">
                <p className="mb-1.5"><span className="font-semibold">Darshya:</span> Namaste! Reply with your ticket ID or tell us what&apos;s wrong.</p>
                <p className="text-[10px] text-surface-400">Just now</p>
              </div>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noreferrer"
                className="mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-green-700 text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Start WhatsApp chat
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Methods + Form */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-4xl mx-auto px-6 sm:px-8">
          <div className="grid md:grid-cols-5 gap-8">
            {/* Left: Contact methods */}
            <div className="md:col-span-2 space-y-4">
              {contactMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <div
                    key={method.title}
                    className="p-4 rounded-xl"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--color-primary-highlight)" }}
                      >
                        <Icon
                          className="w-3.5 h-3.5"
                          style={{ color: "var(--color-primary)" }}
                        />
                      </div>
                      <div>
                        <p
                          className="text-xs font-semibold"
                          style={{ color: "var(--color-text)" }}
                        >
                          {method.title}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: "var(--color-primary)" }}
                        >
                          {method.detail}
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {method.description}
                    </p>
                  </div>
                );
              })}

              <div
                className="p-4 rounded-xl"
                style={{
                  background: "var(--color-primary-highlight)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock
                    className="w-3.5 h-3.5"
                    style={{ color: "var(--color-primary)" }}
                  />
                  <p
                    className="text-xs font-semibold"
                    style={{ color: "var(--color-text)" }}
                  >
                    Support Hours
                  </p>
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Monday \u2013 Saturday: 9:00 AM \u2013 6:00 PM IST<br />
                  Sunday: Email only<br />
                  Holidays: Closed on Diwali, Holi, Maha Shivaratri
                </p>
              </div>
            </div>

            {/* Right: Contact form */}
            <div className="md:col-span-3">
              <div
                className="p-6 rounded-xl"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <h2
                  className="text-base font-semibold mb-5"
                  style={{ color: "var(--color-text)" }}
                >
                  Send Us a Message
                </h2>
                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="contact-name"
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--color-text)" }}
                      >
                        Full Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        placeholder="Your name"
                        className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors"
                        style={{
                          background: "var(--color-bg)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)",
                        }}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="block text-xs font-medium mb-1.5"
                        style={{ color: "var(--color-text)" }}
                      >
                        Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors"
                        style={{
                          background: "var(--color-bg)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text)",
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="contact-subject"
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--color-text)" }}
                    >
                      Subject
                    </label>
                    <select
                      id="contact-subject"
                      className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors"
                      style={{
                        background: "var(--color-bg)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                      }}
                    >
                      <option value="">Select a topic</option>
                      <option value="booking">Puja Booking Query</option>
                      <option value="darshan">Live Darshan Issue</option>
                      <option value="refund">Refund Request</option>
                      <option value="temple">Temple Partnership</option>
                      <option value="technical">Technical Support</option>
                      <option value="feedback">Feedback & Suggestions</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="contact-message"
                      className="block text-xs font-medium mb-1.5"
                      style={{ color: "var(--color-text)" }}
                    >
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      placeholder="Describe your query in detail..."
                      className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors resize-y"
                      style={{
                        background: "var(--color-bg)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text)",
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg btn-press transition-colors"
                    style={{
                      background: "var(--color-primary)",
                      color: "var(--color-text-inverse)",
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
