'use client';
export const runtime = 'edge';

import { Mail, Clock, Send, Briefcase, Handshake, Scale, Newspaper, MessageSquare } from "lucide-react";
import Link from "next/link";
import { COMPANY, postalContactLine } from "../../lib/company";

type EscalationItem = { label: string; email: string; icon: typeof Briefcase };
const escalationEmails: EscalationItem[] = ([
  COMPANY.specialtyEmails.sales        ? { label: "Sales & enterprise",  email: COMPANY.specialtyEmails.sales,        icon: Briefcase  } : null,
  COMPANY.specialtyEmails.partnerships ? { label: "Temple partnerships", email: COMPANY.specialtyEmails.partnerships, icon: Handshake  } : null,
  COMPANY.specialtyEmails.press        ? { label: "Press & media",       email: COMPANY.specialtyEmails.press,        icon: Newspaper  } : null,
  COMPANY.specialtyEmails.legal        ? { label: "Legal & compliance",  email: COMPANY.specialtyEmails.legal,        icon: Scale      } : null,
] satisfies (EscalationItem | null)[]).filter((x): x is EscalationItem => Boolean(x));

const contactMethods: Array<{ icon: typeof Mail; title: string; detail: string; description: string }> = [
  {
    icon: Mail,
    title: "Email Support",
    detail: COMPANY.supportEmail,
    description: `For booking queries, account issues, and general help. ${COMPANY.supportHours}.`,
  },
  ...(postalContactLine() ? [{
    icon: Mail,
    title: "Postal address",
    detail: COMPANY.legalEntity?.name ?? COMPANY.brand,
    description: postalContactLine()!,
  }] : []),
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
            hear from you. Email is currently the fastest way to reach us.
          </p>
        </div>
      </section>

      {/* Specialty inboxes (only those configured in lib/company.ts) */}
      {escalationEmails.length > 0 && (
        <section className="pb-10">
          <div className="max-w-4xl mx-auto px-6 sm:px-8">
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
            >
              <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--color-text)" }}>
                Specialty inboxes
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <a href={`mailto:${item.email}`} className="text-xs" style={{ color: "var(--color-primary)" }}>
                          {item.email}
                        </a>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Contact methods + form */}
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
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                  >
                    <div className="flex items-center gap-2.5 mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--color-primary-highlight)" }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>{method.title}</p>
                        <p className="text-xs" style={{ color: "var(--color-primary)" }}>{method.detail}</p>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                      {method.description}
                    </p>
                  </div>
                );
              })}

              {/* In-app support tickets — already exists at /support */}
              <Link
                href="/support"
                className="block p-4 rounded-xl"
                style={{ background: "var(--color-primary-highlight)", border: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
                  <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>
                    In-app support tickets
                  </p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  Logged-in users can open a tracked ticket from the support center for any account or booking-specific issue.
                </p>
              </Link>

              <div
                className="p-4 rounded-xl"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-3.5 h-3.5" style={{ color: "var(--color-primary)" }} />
                  <p className="text-xs font-semibold" style={{ color: "var(--color-text)" }}>Response window</p>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  {COMPANY.supportHours}.
                </p>
              </div>
            </div>

            {/* Right: Contact form */}
            <div className="md:col-span-3">
              <div
                className="p-6 rounded-xl"
                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
              >
                <h2 className="text-base font-semibold mb-5" style={{ color: "var(--color-text)" }}>
                  Send us a message
                </h2>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const subject = encodeURIComponent(`[${fd.get('subject') ?? 'general'}] ${fd.get('name') ?? 'Web visitor'}`);
                    const body = encodeURIComponent(String(fd.get('message') ?? ''));
                    window.location.href = `mailto:${COMPANY.supportEmail}?subject=${subject}&body=${body}`;
                  }}
                >
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="contact-name" className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
                        Full name
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        placeholder="Your name"
                        className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors"
                        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                      />
                    </div>
                    <div>
                      <label htmlFor="contact-email" className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
                        Email
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors"
                        style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact-subject" className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
                      Subject
                    </label>
                    <select
                      id="contact-subject"
                      name="subject"
                      className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors"
                      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                    >
                      <option value="general">General query</option>
                      <option value="booking">Puja booking query</option>
                      <option value="darshan">Live darshan issue</option>
                      <option value="refund">Refund request</option>
                      <option value="temple">Temple partnership</option>
                      <option value="technical">Technical support</option>
                      <option value="feedback">Feedback &amp; suggestions</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text)" }}>
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      placeholder="Describe your query in detail..."
                      className="w-full px-3 py-2 text-sm rounded-lg outline-none transition-colors resize-y"
                      style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text)" }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg btn-press transition-colors"
                    style={{ background: "var(--color-primary)", color: "var(--color-text-inverse)" }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Open in email
                  </button>
                  <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                    Opens your default mail client pre-filled. Or write directly to {COMPANY.supportEmail}.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
