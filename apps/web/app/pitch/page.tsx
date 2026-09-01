import Link from 'next/link';
import Image from 'next/image';
import { HAS_80G, RECEIPT_NOUN } from '../../lib/eighty-g';

const SLIDES = [
  '01-hook',
  '02-market',
  '03-problem',
  '04-product',
  '05-moat',
  '06-portals',
  '07-tech',
  '08-traction',
  '09-gtm',
  '10-economics',
  '11-team',
  '12-ask',
];

export default function PitchPage() {
  return (
    <>
      <DeckNav />

      <Slide id="01-hook" num="01 / 12">
        <span className="pitch-eyebrow">Darshya · Investor Brief</span>
        <h1 className="pitch-h1">
          Devotion,
          <br />
          <span className="pitch-grad-text">verified.</span>
        </h1>
        <p className="pitch-lead">
          India spends <span className="pitch-callout">₹4 lakh crore</span> a year on devotion —
          temple visits, pujas, astrology, gaushala seva, pilgrimages. The category is offline,
          fragmented, and untrusted. Darshya is the trust layer — live today.
        </p>
        <div className="pitch-row">
          <Link href="https://darshya.online" target="_blank" className="pitch-cta">
            Open the live product →
          </Link>
          <a href="#demo-reel" className="pitch-cta-ghost">
            Watch 60-sec reel ↓
          </a>
          <a href="#04-product" className="pitch-cta-ghost">
            See it work ↓
          </a>
        </div>
        <div id="demo-reel" style={{ marginTop: 48 }}>
          <img width={1920} height={1080}             className="pitch-media"
            src="/pitch/img/01-home-hero.png"
            alt="Darshya home — live darshan, daily panchang, temple finder"
            loading="lazy"
            style={{ width: '100%', maxHeight: '70vh', borderRadius: 12, objectFit: 'cover' }}
          />
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--ink-dim)' }}>
            Live product preview · open{' '}
            <a
              href="https://darshya.online"
              style={{ textDecoration: 'underline', color: 'var(--saffron-deep)' }}
            >
              darshya.online
            </a>
          </p>
        </div>
      </Slide>

      <Slide id="02-market" num="02 / 12">
        <span className="pitch-eyebrow">Market</span>
        <h2 className="pitch-h2">
          Devotional commerce is bigger than EdTech and HealthTech in India — combined.
        </h2>
        <div className="pitch-grid pitch-grid-3" style={{ marginTop: 32 }}>
          <Stat value="₹4L Cr" label="annual devotional spend (TAM)" />
          <Stat value="₹65K Cr" label="serviceable online opportunity (SAM)" />
          <Stat value="$43M" label="raised by single competitor (Sri Mandir, AppsForBharat)" />
        </div>
        <p className="pitch-lead" style={{ marginTop: 32 }}>
          The category has woken up. AppsForBharat raised Series B in 2023. Devdham, Utsav, Bhakti,
          MyMandir — all chasing the surface area. None has cracked{' '}
          <em>verifiable temple commerce</em>.
        </p>
      </Slide>

      <Slide id="03-problem" num="03 / 12">
        <span className="pitch-eyebrow">Problem</span>
        <h2 className="pitch-h2">
          The devotee can't trust the priest. The priest can't reach the devotee.
        </h2>
        <div className="pitch-grid pitch-grid-2" style={{ marginTop: 32 }}>
          <Card title="For the devotee">
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--ink-dim)', lineHeight: 1.7 }}>
              <li>Pays ₹1,500 for a puja, never sees it happen</li>
              <li>"Astrologer" on Whatsapp is anonymous</li>
              <li>Gaushala donation receipts are paper, no 80G</li>
              <li>NRI families pay 9× and trust strangers</li>
            </ul>
          </Card>
          <Card title="For the temple / priest">
            <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--ink-dim)', lineHeight: 1.7 }}>
              <li>No digital storefront, no booking system</li>
              <li>Aggregators take 40-50% margins</li>
              <li>No way to prove the seva was performed</li>
              <li>Cash-only payouts, no Aadhaar-gated KYC</li>
            </ul>
          </Card>
        </div>
      </Slide>

      <Slide id="04-product" num="04 / 12">
        <span className="pitch-eyebrow">Product</span>
        <h2 className="pitch-h2">A live, working super-app — not slideware.</h2>
        <p className="pitch-lead">
          Darshya runs in production at{' '}
          <a href="https://darshya.online" target="_blank" style={{ color: 'var(--saffron-deep)' }}>
            darshya.online
          </a>
          . Every screen below is captured from the real product, today.
        </p>
        <div className="pitch-media-grid" style={{ marginTop: 32 }}>
          <MediaCard
            src="/pitch/img/01-home-hero.png"
            caption="Home — live darshan, daily panchang, temple finder"
            href="https://darshya.online"
          />
          <MediaCard
            src="/pitch/img/02-temples-grid.png"
            caption="20+ verified temples, JSON-LD SEO"
            href="https://darshya.online/temples"
          />
          <MediaCard
            src="/pitch/img/04-pujas-grid.png"
            caption="Puja booking with sankalp + video proof"
            href="https://darshya.online/pujas"
          />
          <MediaCard
            src="/pitch/img/06-darshan.png"
            caption="Live darshan — AWS IVS streaming"
            href="https://darshya.online/darshan"
          />
          <MediaCard
            src="/pitch/img/08-astrology.png"
            caption="Astrology + horoscope, AI panditji"
            href="https://darshya.online/astrology"
          />
          <MediaCard
            src="/pitch/img/09-gaushala.png"
            caption={`Gaushala adoption + ${RECEIPT_NOUN}`}
            href="https://darshya.online/gaushala"
          />
        </div>
      </Slide>

      <Slide id="05-moat" num="05 / 12">
        <span className="pitch-eyebrow">Differentiation</span>
        <h2 className="pitch-h2">
          Video proof. Verified priests.
          <br />
          <span className="pitch-grad-text">
            A trust moat the competition cannot replicate quickly.
          </span>
        </h2>
        <div className="pitch-grid pitch-grid-3" style={{ marginTop: 32 }}>
          <Card title="Video-proof puja booking">
            Every paid puja requires the priest to upload a recording before payout is released.
            Aadhaar-verified providers, escrow-released settlement.
          </Card>
          <Card title="Eight role portals">
            Devotee, Priest, Astrologer, Wellness, Gaushala, Yatra, Temple Admin, Platform Admin —
            each with KYC, payouts, dashboards. Not a booking widget. A two-sided market.
          </Card>
          <Card title={HAS_80G ? '80G + INR/USD priced' : 'Receipted + INR/USD priced'}>
            Auto-generated numbered donation receipts (DR-YYYYMMDD-XXXX){HAS_80G ? ', 80G-valid' : ' — proof of payment, not yet an 80G certificate'}. Native Razorpay. NRI pricing
            9-10× domestic, configured per puja. Built for Indian + diaspora from day zero.
          </Card>
        </div>
      </Slide>

      <Slide id="06-portals" num="06 / 12">
        <span className="pitch-eyebrow">Surface area</span>
        <h2 className="pitch-h2">One product, eight separate user journeys.</h2>
        <img width={1920} height={1080}           className="pitch-media"
          src="/pitch/img/04-pujas-grid.png"
          alt="Puja booking with sankalp + video proof"
          loading="lazy"
          style={{ marginTop: 24, maxHeight: '60vh', objectFit: 'cover', borderRadius: 12 }}
        />
        <div className="pitch-row" style={{ marginTop: 24 }}>
          <span className="pitch-tag">Devotee</span>
          <span className="pitch-tag">Priest</span>
          <span className="pitch-tag">Astrologer</span>
          <span className="pitch-tag">Wellness instructor</span>
          <span className="pitch-tag">Gaushala</span>
          <span className="pitch-tag">Yatra companion</span>
          <span className="pitch-tag">Temple admin</span>
          <span className="pitch-tag">Platform admin</span>
        </div>
      </Slide>

      <Slide id="07-tech" num="07 / 12">
        <span className="pitch-eyebrow">Tech moat</span>
        <h2 className="pitch-h2">
          Production-grade.
          <br />
          <span className="pitch-grad-text">Zero infra spend.</span>
        </h2>
        <p className="pitch-lead">
          The entire stack runs on free tiers — Supabase, Render, Cloudflare, Groq, Resend, Sentry.
          We can absorb 10,000 MAU before the first dollar of infrastructure cost.
        </p>
        <table className="pitch-table" style={{ marginTop: 24 }}>
          <thead>
            <tr>
              <th>Layer</th>
              <th>Stack</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Web</td>
              <td>Next.js 15 + React 19 + Tailwind v4</td>
              <td>SSR, ISR, JSON-LD, edge-deployable</td>
            </tr>
            <tr>
              <td>API</td>
              <td>Fastify 5 + Prisma + PostgreSQL</td>
              <td>Type-safe, fast, Sentry-instrumented</td>
            </tr>
            <tr>
              <td>Mobile</td>
              <td>Expo SDK 52 + Expo Router</td>
              <td>Single TS codebase for iOS + Android</td>
            </tr>
            <tr>
              <td>AI</td>
              <td>Groq (Llama 3.3 70B)</td>
              <td>1500 tok/s, free tier covers MVP load</td>
            </tr>
            <tr>
              <td>Streaming</td>
              <td>AWS IVS + Jitsi</td>
              <td>Live darshan + 1:1 consultations</td>
            </tr>
            <tr>
              <td>Payments</td>
              <td>Razorpay</td>
              <td>INR + 9-10× NRI pricing native</td>
            </tr>
            <tr>
              <td>Storage</td>
              <td>Cloudflare R2</td>
              <td>10 GB free, zero egress</td>
            </tr>
          </tbody>
        </table>
      </Slide>

      <Slide id="08-traction" num="08 / 12">
        <span className="pitch-eyebrow">Where we are</span>
        <h2 className="pitch-h2">Day 0 — but the rails are live.</h2>
        <div className="pitch-grid pitch-grid-4" style={{ marginTop: 32 }}>
          <Stat value="20" label="verified temples seeded" />
          <Stat value="8" label="role portals shipped" />
          <Stat value="100%" label="HMAC-verified payment webhooks" />
          <Stat value="$0" label="monthly infra burn" />
        </div>
        <p className="pitch-lead" style={{ marginTop: 32 }}>
          Razorpay live. Demo accounts work end-to-end across all eight portals. Mobile
          binary in EAS Build pipeline. The first 90 days are about real-MAU + real-GMV, not feature
          work.
        </p>
      </Slide>

      <Slide id="09-gtm" num="09 / 12">
        <span className="pitch-eyebrow">Go-to-market</span>
        <h2 className="pitch-h2">Bharat first. Diaspora is the upside.</h2>
        <div className="pitch-grid pitch-grid-3" style={{ marginTop: 32 }}>
          <Card title="Phase 1 · Days 1–30">
            <strong style={{ color: 'var(--saffron-deep)' }}>Anchor temples</strong>
            <p style={{ color: 'var(--ink-dim)', marginTop: 8 }}>
              Five lighthouse temples + two gaushalas in Varanasi, Mathura, Tirupati. Hand-onboard.
              Verify the loop end-to-end.
            </p>
          </Card>
          <Card title="Phase 2 · Days 31–60">
            <strong style={{ color: 'var(--saffron-deep)' }}>Public launch</strong>
            <p style={{ color: 'var(--ink-dim)', marginTop: 8 }}>
              PostHog on every funnel. Performance-gated paid acquisition. Target: 1,000 MAU, 10
              paid pujas, ₹50K GMV.
            </p>
          </Card>
          <Card title="Phase 3 · Days 61–90">
            <strong style={{ color: 'var(--saffron-deep)' }}>NRI activation</strong>
            <p style={{ color: 'var(--ink-dim)', marginTop: 8 }}>
              USD pricing, US/UK/Canada paid social, diaspora newsletter partnerships. Compound the
              unit economics 9×.
            </p>
          </Card>
        </div>
      </Slide>

      <Slide id="10-economics" num="10 / 12">
        <span className="pitch-eyebrow">Unit economics</span>
        <h2 className="pitch-h2">A puja booking is a high-margin transaction.</h2>
        <div className="pitch-grid pitch-grid-2" style={{ marginTop: 32 }}>
          <Card title="Domestic puja">
            <table className="pitch-table">
              <tbody>
                <tr>
                  <td>Avg ticket</td>
                  <td style={{ textAlign: 'right' }}>₹1,500</td>
                </tr>
                <tr>
                  <td>Platform commission</td>
                  <td style={{ textAlign: 'right' }}>20–40%</td>
                </tr>
                <tr>
                  <td>Payment fee</td>
                  <td style={{ textAlign: 'right' }}>2%</td>
                </tr>
                <tr>
                  <td>
                    <strong>Net contribution</strong>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--saffron-deep)' }}>
                    <strong>₹420</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
          <Card title="NRI puja (US/UK)">
            <table className="pitch-table">
              <tbody>
                <tr>
                  <td>Avg ticket</td>
                  <td style={{ textAlign: 'right' }}>$165 (₹13,500)</td>
                </tr>
                <tr>
                  <td>Platform commission</td>
                  <td style={{ textAlign: 'right' }}>30–45%</td>
                </tr>
                <tr>
                  <td>Payment fee</td>
                  <td style={{ textAlign: 'right' }}>3%</td>
                </tr>
                <tr>
                  <td>
                    <strong>Net contribution</strong>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--saffron-deep)' }}>
                    <strong>₹4,800</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </Card>
        </div>
        <p className="pitch-lead" style={{ marginTop: 24 }}>
          One NRI puja ≈ ten domestic. Platform commission scales with trust, not with effort. Video
          proof is the unlock.
        </p>
      </Slide>

      <Slide id="11-team" num="11 / 12">
        <span className="pitch-eyebrow">Team</span>
        <h2 className="pitch-h2">Solo founder. Full-stack. Shipped.</h2>
        <p className="pitch-lead">
          Built and shipped the live product, end-to-end — web, API, mobile, eight portals, payment
          + auth + AI integrations — in &lt; 90 days, on $0 budget. Operator first, founder second.
          Hiring co-founder + first engineer post-seed.
        </p>
        <hr className="pitch-divine-rule" />
        <p className="pitch-lead">
          What this proves: low-burn, fast-iteration, deep ownership. What we're hiring:
          distribution + temple-side relationships.
        </p>
      </Slide>

      <Slide id="12-ask" num="12 / 12">
        <span className="pitch-eyebrow">Ask</span>
        <h1 className="pitch-h1">
          ₹2–5 Cr seed.
          <br />
          <span className="pitch-grad-text">18-month runway to PMF + Series A.</span>
        </h1>
        <div className="pitch-grid pitch-grid-3" style={{ marginTop: 32 }}>
          <Card title="50% — Distribution">
            Anchor-temple BD, performance marketing, NRI activation
          </Card>
          <Card title="30% — Team">Co-founder + 2 engineers + 1 operations lead</Card>
          <Card title="20% — Trust infra">Aadhaar/PAN KYC, video moderation, customer ops</Card>
        </div>
        <div className="pitch-row" style={{ marginTop: 48 }}>
          <Link href="https://darshya.online" target="_blank" className="pitch-cta">
            Open the product →
          </Link>
          <a href="mailto:founder@darshya.online" className="pitch-cta-ghost">
            founder@darshya.online ✉
          </a>
        </div>
      </Slide>

      <footer className="pitch-foot">
        <span>© 2026 Darshya · Confidential — for diligence purposes only</span>
        <span>
          <Link href="/" style={{ color: 'var(--ink-dim)' }}>
            ← Back to site
          </Link>
        </span>
      </footer>
    </>
  );
}

function Slide({ id, num, children }: { id: string; num: string; children: React.ReactNode }) {
  return (
    <section id={id} className="pitch-slide">
      <span className="pitch-num">{num}</span>
      {children}
    </section>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="pitch-stat">{value}</div>
      <div className="pitch-stat-label">{label}</div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pitch-card">
      <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600 }}>{title}</h3>
      <div style={{ color: 'var(--ink-dim)', lineHeight: 1.65, fontSize: 15 }}>{children}</div>
    </div>
  );
}

function MediaCard({ src, caption, href }: { src: string; caption: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="pitch-card"
      style={{ display: 'block', textDecoration: 'none', color: 'inherit', padding: 12 }}
    >
      <Image
        src={src}
        alt={caption}
        width={1920}
        height={1080}
        className="pitch-media"
        style={{ aspectRatio: '16/9', objectFit: 'cover' }}
        unoptimized
      />
      <div style={{ padding: '12px 4px 4px', fontSize: 14, color: 'var(--ink-dim)' }}>
        {caption}
      </div>
    </a>
  );
}

function DeckNav() {
  return (
    <nav className="pitch-deck-nav" aria-label="Deck navigation">
      {SLIDES.map((s, i) => (
        <a key={s} href={`#${s}`} title={s} aria-label={`Slide ${i + 1}`}>
          <span className="pitch-dot" />
        </a>
      ))}
    </nav>
  );
}
