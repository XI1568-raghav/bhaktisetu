// Structured FAQ data — drives /faqs hub + per-page FAQPage JSON-LD.
// Grouped by topic. Each FAQ MUST be 1 question + 1 plain-text answer (no
// markdown — JSON-LD doesn't render it). Answers should be 30-80 words for
// optimal rich-snippet eligibility per Google's FAQ guidelines.

export interface Faq {
  q: string;
  a: string;
}

export interface FaqGroup {
  slug: string;
  title: string;
  description: string;
  faqs: Faq[];
}

export const FAQ_GROUPS: FaqGroup[] = [
  {
    slug: 'puja-booking',
    title: 'Puja Booking',
    description: 'Booking, sankalp, video proof, prasad delivery.',
    faqs: [
      {
        q: 'How do I book a puja online on Darshya?',
        a: "Pick a puja from our /pujas catalogue, choose a verified pandit and temple, enter the sankalp details (your name, gotra, intent), pick a date, and pay. You'll receive a booking number (format BS-YYYYMMDD-XXXXX), a WhatsApp confirmation, and video proof of the puja within 24-48 hours after the ceremony.",
      },
      {
        q: 'What is video proof and is it mandatory?',
        a: "Video proof is a 5-10 minute recording showing the pandit performing your puja with your sankalp named aloud. It is mandatory for every puja booking on Darshya — no exceptions. The video is uploaded to your account within 24-48 hours of the ceremony and is available for download for 90 days.",
      },
      {
        q: 'Can I cancel or reschedule a puja booking?',
        a: 'Yes. You can cancel or reschedule up to 24 hours before the scheduled puja time for a full refund. Within 24 hours, cancellations are not permitted because materials (samagri) have already been procured and the pandit slot is locked. Reschedule via /support or WhatsApp.',
      },
      {
        q: 'Will I receive prasad at my home address?',
        a: 'Yes, prasad delivery is included with most puja packages. We use registered postal courier and delivery takes 5-10 working days within India and 10-20 days for NRI addresses. Prasad consists of consecrated items like sacred thread, kumkum, vibhuti, sweets, or a coconut depending on the puja type.',
      },
      {
        q: 'Are the pandits verified?',
        a: 'Yes. Every pandit on Darshya undergoes Aadhaar verification, Vedic credential verification (often gurukul-trained), reference checks from at least 2 temples or senior pandits, and a probationary first-30-day video review. We display a trust score on every pandit profile.',
      },
    ],
  },
  {
    slug: 'live-darshan',
    title: 'Live Darshan',
    description: 'Streaming, recording, temple coverage.',
    faqs: [
      {
        q: 'Which temples have live darshan on Darshya?',
        a: 'We currently stream live darshan from Kashi Vishwanath (Varanasi), Tirumala Tirupati (Andhra Pradesh), Siddhivinayak (Mumbai), Somnath (Gujarat), Mahakaleshwar (Ujjain), Jagannath Puri (Odisha), and 25+ other major temples. Aarti timings are highlighted in your local time zone.',
      },
      {
        q: 'Is live darshan free?',
        a: 'Yes, all live darshan streams on Darshya are completely free with no signup required. Premium features like recorded aarti library, multi-camera angles, and HD downloads are part of our Premium plan (₹199/month domestic or $9/month for NRI users).',
      },
      {
        q: 'Can I record or download live darshan?',
        a: 'Premium subscribers can download aarti recordings from the past 7 days. Free users can watch live streams but cannot download. We respect temple policies — recordings that temples explicitly prohibit are not retained on our servers.',
      },
    ],
  },
  {
    slug: 'pricing-refunds',
    title: 'Pricing & Refunds',
    description: 'Costs, NRI pricing, payment methods, 80G receipts.',
    faqs: [
      {
        q: 'Why is NRI pricing higher than Indian pricing?',
        a: "NRI pricing is roughly 9-10× domestic for parity reasons — currency conversion, international payment processing fees (3-4% higher than domestic UPI), USD-denominated infrastructure costs, and a small donation to the temple's gaushala or annadanam. The exact breakdown is shown at checkout.",
      },
      {
        q: 'Do you issue 80G tax-deduction receipts for donations?',
        a: 'Yes, for all donations to verified temples and gaushalas with valid 80G registration. The receipt is auto-generated within 24 hours, emailed to you, and downloadable from your account. Format: DR-YYYYMMDD-XXXX. You must provide your PAN at the time of donation for the 80G receipt to be valid.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'Domestic India: UPI (all apps), credit/debit cards (Visa/Mastercard/RuPay), net banking, wallets (Paytm, PhonePe, Amazon Pay). NRI users: international credit cards, PayPal, Stripe, and bank transfer for amounts above $500. We do not accept cash on delivery or cheques.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Refunds are processed within 24 hours and typically credited to the original payment method within 3-7 working days. UPI refunds are usually instant, credit/debit cards 5-7 days, international cards 7-14 days. You receive an email + WhatsApp notification when the refund is initiated.',
      },
    ],
  },
  {
    slug: 'nri-specific',
    title: 'NRI / International',
    description: 'For devotees outside India — pricing, delivery, compliance.',
    faqs: [
      {
        q: 'I live abroad — can I book a puja for my family in India?',
        a: 'Yes, this is one of our most popular use cases. You book online from anywhere, your family in India can attend in person if they wish, or the entire puja can be conducted with only your sankalp recited by the pandit. Video proof is delivered to you via WhatsApp/email regardless of location.',
      },
      {
        q: 'Can I gift a puja to someone in India?',
        a: 'Yes, our Gift Puja feature lets you (NRI sender) pay for a puja and have video proof + WhatsApp confirmation sent to a recipient in India. The recipient receives the sankalp in their name. Available at /gift on our site.',
      },
      {
        q: 'Do you have an annual NRI membership?',
        a: 'Yes — Darshya NRI Premium at ₹5000/year or $60/year includes 4 free pujas per year, monthly panchang calendar, priority WhatsApp support, prasad shipping discount, and access to NRI-exclusive aarti recordings. Detail at /nri.',
      },
    ],
  },
  {
    slug: 'yatra',
    title: 'Yatra & Pilgrimage',
    description: 'Char Dham, Jyotirlinga, custom yatra packages.',
    faqs: [
      {
        q: 'Do you book full yatra packages (hotel + transport + temple darshan)?',
        a: 'Yes, our yatra desk handles end-to-end pilgrimage planning — Char Dham, 12 Jyotirlinga, Sapta Puri, Pancha Bhoota and custom itineraries. We coordinate hotels (verified ratings), transport (private cab/bus), VIP darshan slots where available, and meals. Inquiry-only model: submit at /yatra/{slug}/book and our team responds within 24 hours.',
      },
      {
        q: 'What is the best time for Char Dham yatra?',
        a: 'The Char Dham temples are open only April-October, closed November-March due to Himalayan snow. Best windows: May-June (post-snow, pre-monsoon) and September-October (post-monsoon, clear skies). Avoid June-August monsoon — landslides frequently block roads. Helicopter packages reduce yatra from 12 days to 2-3 days.',
      },
      {
        q: 'Is online registration mandatory for Char Dham?',
        a: 'Yes, since 2022 the Uttarakhand government has mandated online registration on uttarakhandtourism.gov.in for all Char Dham pilgrims. Our yatra desk handles this for you when you book a package. Registration is free; daily caps apply on each temple.',
      },
    ],
  },
];

export function allFaqs(): Faq[] {
  return FAQ_GROUPS.flatMap((g) => g.faqs);
}

export function faqPageJsonLd(faqs: Faq[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
