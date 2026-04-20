'use client';

import { Mail, Phone, MapPin, Clock, MessageCircle, Send } from "lucide-react";

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    detail: "support@poojly.com",
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
    description: "Poojly Technologies Pvt. Ltd., HSR Layout, Bengaluru \u2013 560102, India.",
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
