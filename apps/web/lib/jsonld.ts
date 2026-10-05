// Shared JSON-LD schema builders. Render via:
//   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

import { COMPANY } from './company';
import { NRI_PREMIUM_IS_SELLABLE } from '../app/nri/plan-availability';

export const SITE_URL = 'https://darshya.online';

/**
 * TC-01 (P0, trust) — the 80G gate, applied to structured data.
 *
 * COM-02 gated the 80G deduction promise on ~7 rendered pages and left this
 * file alone, which made it the worst-placed copy of the claim in the repo: a
 * JSON-LD payload is machine-readable, is quoted back by Google to devotees who
 * never open the page, and is syndicated into rich results. Five lines here
 * asserted a deduction the platform cannot deliver, one of them
 * ("80G receipts use real PAN and donee 80G registration numbers") a direct
 * statement about `is80GEligible()`, which returns false for every donation
 * because `gaushala_profiles.regn_80g` and `.pan` are read in one place and
 * written nowhere.
 *
 * `HAS_80G_VERIFIED` is false, `eightyGNumber` and `pan` are both null, and
 * apps/api/src/lib/pdf-receipt.ts prints "Proof of donation — not a tax
 * exemption certificate" on every receipt it mints. Same owner-controlled gate
 * as lib/company.ts, app/gaushala/page.tsx, app/nri/page.tsx and lib/faqs.ts —
 * flip the flag and every sentence below returns unchanged.
 */
const HAS_80G = COMPANY.donationLegal.HAS_80G_VERIFIED;

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Darshya',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "India's devotional super-app — live darshan, puja booking with video proof, AI spiritual guidance, gaushala seva.",
  sameAs: [
    'https://www.instagram.com/darshya.online',
    'https://www.facebook.com/darshya.online',
    'https://www.youtube.com/@darshya',
    'https://www.linkedin.com/company/darshya',
    'https://github.com/darshya-online',
  ],
  foundingDate: '2026-01',
  founder: { '@type': 'Person', name: 'Darshya Founder' },
  alternateName: ['Darshya App', 'Darshya Online', 'darshya.online'],
  knowsAbout: [
    'Hindu puja booking',
    'Live darshan streaming',
    'Vedic astrology',
    'Free kundli',
    'Panchang',
    'Bhagavad Gita',
    'Gaushala seva',
    'NRI devotional services',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      email: 'support@darshya.online',
      telephone: '+91-92551-09400',
      contactType: 'customer support',
      areaServed: ['IN', 'US', 'GB', 'CA', 'AU', 'AE', 'SG'],
      availableLanguage: ['English', 'Hindi'],
    },
  ],
};

// SearchAction enables Google Sitelinks search box once site is indexed and
// authority threshold is met. Harmless until then.
export const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Darshya',
  url: SITE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

export function articleJsonLd(args: {
  title: string;
  description?: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: args.title,
    description: args.description,
    image: args.image ? [args.image] : undefined,
    datePublished: args.datePublished,
    dateModified: args.dateModified || args.datePublished,
    author: { '@type': args.authorName ? 'Person' : 'Organization', name: args.authorName || 'Darshya' },
    publisher: {
      '@type': 'Organization',
      name: 'Darshya',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': args.url },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function productJsonLd(args: {
  name: string;
  description?: string;
  image?: string;
  sku?: string;
  priceInr?: number;
  priceUsd?: number;
  url: string;
  inStock?: boolean;
}) {
  const offers: Record<string, unknown>[] = [];
  if (args.priceInr != null) {
    offers.push({
      '@type': 'Offer',
      price: String(args.priceInr),
      priceCurrency: 'INR',
      url: args.url,
      availability: args.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    });
  }
  // The USD Offer was removed 2026-08-11 with the Stripe rail. Structured data
  // is worse than prose here: Google renders the price directly in search
  // results, so a $ figure sent a devotee to an INR-only Razorpay checkout.
  // `priceUsd` is still accepted by the signature (callers pass it) and simply
  // no longer emits an offer.
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: args.name,
    description: args.description,
    image: args.image ? [args.image] : undefined,
    sku: args.sku,
    offers: offers.length > 1 ? offers : offers[0],
  };
}

export function eventJsonLd(args: {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  url: string;
  image?: string;
  locationName?: string;
  locationAddress?: string;
  isOnline?: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: args.name,
    description: args.description,
    startDate: args.startDate,
    endDate: args.endDate || args.startDate,
    eventAttendanceMode: args.isOnline
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: args.locationName
      ? {
          '@type': args.isOnline ? 'VirtualLocation' : 'Place',
          name: args.locationName,
          ...(args.locationAddress ? { address: args.locationAddress } : {}),
          ...(args.isOnline ? { url: args.url } : {}),
        }
      : undefined,
    image: args.image ? [args.image] : undefined,
    url: args.url,
    organizer: { '@type': 'Organization', name: 'Darshya', url: SITE_URL },
  };
}

export function placeJsonLd(args: {
  name: string;
  description?: string;
  image?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  url: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: args.name,
    description: args.description,
    image: args.image ? [args.image] : undefined,
    url: args.url,
    address: args.address
      ? {
          '@type': 'PostalAddress',
          streetAddress: args.address,
          addressLocality: args.city,
          addressRegion: args.region,
          addressCountry: args.country || 'IN',
        }
      : undefined,
    geo:
      args.latitude != null && args.longitude != null
        ? { '@type': 'GeoCoordinates', latitude: args.latitude, longitude: args.longitude }
        : undefined,
  };
}

/**
 * What a donation receipt actually is, in structured data.
 *
 * Kept as its own trailing sentence on purpose: app/nri/page.tsx sanitises the
 * description it emits by dropping any sentence containing "80G" while the
 * owner flag is false, so the disclaimer has to be separable from the sentence
 * that names the receipt at all. That page-level sanitiser is now a no-op for
 * the false branch's first three sentences and stays correct either way.
 */
const RECEIPT_CLAUSE = HAS_80G
  ? 'Donations made on Darshya receive an 80G receipt PDF carrying the donee registration number and PAN.'
  : 'Donations made on Darshya receive a numbered receipt PDF by email. That receipt is proof of payment and not an 80G tax-exemption certificate, because Darshya holds no Section 80G registration.';

/**
 * TC-04 (P1) — the Offer this file published for a plan the API refuses to sell.
 *
 * `nri_premium_yearly` is withdrawn: all six of its benefits carry
 * `enforcedBy: null` in apps/api/src/services/subscription-entitlements.ts, so
 * `nriPremiumIsSellable()` is false, `getPlans()` filters it out and both
 * activation rails answer 400. This object nonetheless shipped
 * `offers[0] = { price: '5000', availability: InStock }`, which is a
 * machine-readable in-stock ₹5,000 offer for something nobody can buy, and
 * app/nri/page.tsx spreads it and overrides only `description` — so the Offer
 * reached Google verbatim. The offers array is dropped entirely while the plan
 * is withdrawn rather than marked Discontinued: a Discontinued Offer still
 * publishes the price.
 */
export const nriPremiumServiceJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  serviceType: 'Subscription',
  name: 'NRI Premium',
  provider: {
    '@type': 'Organization',
    name: 'Darshya',
    url: SITE_URL,
  },
  areaServed: ['United States', 'United Kingdom', 'Canada', 'Australia', 'India'],
  description:
    'Annual all-access subscription for the Indian diaspora, billed in INR through Razorpay.' +
    (NRI_PREMIUM_IS_SELLABLE
      ? ''
      : ' This tier is not currently sold — Darshya withdrew it rather than charge for benefits it could not yet deliver, and existing subscriptions keep running to their end date.') +
    ` ${RECEIPT_CLAUSE}`,
  ...(NRI_PREMIUM_IS_SELLABLE
    ? {
        offers: [
          {
            '@type': 'Offer',
            price: '5000',
            priceCurrency: 'INR',
            url: `${SITE_URL}/nri`,
            availability: 'https://schema.org/InStock',
          },
        ],
      }
    : {}),
};

// Brand-entity FAQ — targets "what is darshya", "who founded darshya",
// "is darshya legit", "darshya vs sri mandir", "darshya app download".
// Surfaced on /about + /. Eligible for Google rich-result FAQ snippets.
export const brandFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Darshya?',
      acceptedAnswer: {
        '@type': 'Answer',
        // TC-01 (2026-08-28): "approved astrologers" was a vetting claim the
        // data model cannot record. AstrologerProfile (apps/api/prisma/schema
        // .prisma) carries ONLY `approved` — no isVerified, no aadhaarVerified,
        // no verificationStatus — while Priest has all three and Temple has
        // isVerified. TC-02 established the same fact when it removed the
        // "Aadhaar + qualification verified badge" from /become-astrologer;
        // this copy of it survived because the lane's vetting guard enumerates
        // the rendered pages and never the structured data.
        //
        // `approved` is real and enforced: an admin writes it, and
        // astrology.service.ts admits only an approved profile into a
        // consultation. It is also the word already shipping on the funnel
        // (LiveAstrologersClient.tsx:300, "a real, approved Darshya profile").
        //
        // "verified temples" is left ALONE on purpose — Temple.isVerified is a
        // real indexed column with a writer, and lib/platform-stats.ts filters
        // the count it publishes on exactly that flag. Scrubbing the word
        // wholesale would delete a true claim to fix a false one.
        text:
          "Darshya is India's devotional super-app at darshya.online. Devotees worldwide book pujas at verified temples with priest video proof, watch live darshan, read panchang, talk to approved astrologers, donate to gaushalas" +
          (HAS_80G ? ' with 80G receipts' : ' and receive a numbered donation receipt') +
          ', and shop sacred items — all in one place. Available in English, Hindi, Tamil, Telugu, Bengali, and Marathi.',
      },
    },
    {
      '@type': 'Question',
      name: 'Who founded Darshya?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Darshya was founded by Raghav Sindhwani (Co-founder, Product & AI; previously Senior AI Product Manager at Bounteous) and Atishey Jain (Co-founder, Engineering; previously software engineer at Amazon) in 2026. Both are based in India and ship the product as a small, founder-led team.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Darshya legitimate and safe to use?',
      acceptedAnswer: {
        '@type': 'Answer',
        // TC-01 + TC-08. The removed sentence made two claims that are false in
        // the code. "80G receipts use real PAN and donee 80G registration
        // numbers" is a direct statement about `is80GEligible()`, which needs
        // BOTH a donee registration number and a PAN and never gets either —
        // `gaushala_profiles.regn_80g` and `.pan` are read in one place and
        // written nowhere, which is why pdf-receipt.ts stamps every receipt
        // "Proof of donation — not a tax exemption certificate". And "Priests
        // are Aadhaar-verified" describes a public credential check that does
        // not exist: `Priest.aadhaarVerified` has no writer outside
        // apps/api/prisma/seed.ts and is read in exactly one place,
        // payment.service.ts, as a PAYOUT gate.
        text:
          'Yes. Every puja booking on Darshya requires the priest to upload a video recording before payout — no video, no money. A pandit is paid only once Aadhaar-based KYC is on file, which is a payout gate rather than a public credential check: we do not yet run independent credential verification or temple reference checks.' +
          (HAS_80G ? ' 80G receipts use real PAN and donee 80G registration numbers.' : '') +
          ' Payments process through Razorpay, billed in INR.',
      },
    },
    {
      '@type': 'Question',
      name: 'How is Darshya different from Sri Mandir, Utsav, or AstroSage?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Darshya is the only Indian devotional app that makes priest video proof mandatory for every puja booking — not optional, not opt-out. It also offers transparent NRI pricing, gaushala donations with' +
          (HAS_80G ? ' real 80G receipts' : ' a numbered receipt for every contribution') +
          ', and one unified app for puja, darshan, astrology, panchang, gaushala seva, and store. Sri Mandir focuses on puja-only; Utsav focuses on community; AstroSage focuses on jyotish.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where can I download or use Darshya?',
      acceptedAnswer: {
        '@type': 'Answer',
        // LEG-09 + TC-01. "donate in USD" outlived the rail that could take
        // USD: the Stripe checkout was removed 2026-08-11 and every payment
        // now goes through Razorpay in INR, so the card's issuer does the
        // conversion. The 80G half is gated like every other surface.
        text:
          'Use Darshya on the web at https://darshya.online from any device. The Android app is rolling out on Google Play. The iOS app is on the roadmap. NRI devotees in the United States, United Kingdom, Canada, Australia, the UAE, and Singapore can book and donate with an international card, billed in INR through Razorpay' +
          (HAS_80G ? ', with full 80G receipts where eligible' : '') +
          '.',
      },
    },
  ],
};

export type StoreProductLite = {
  id: string | number;
  title: string;
  handle?: string;
  price?: number;
  rating?: number;
  reviewCount?: number;
};

export function storeItemListJsonLd(products: StoreProductLite[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Darshya Store — Sacred Essentials',
    url: `${SITE_URL}/store`,
    numberOfItems: products.length,
    itemListElement: products.slice(0, 50).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: p.handle ? `${SITE_URL}/store/${p.handle}` : `${SITE_URL}/store`,
      name: p.title,
    })),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Puja offers (SEO-05, prod sweep 2026-08-12)
//
// /pujas/rudrabhishek shipped `highPrice: Number(puja.basePrice) * 5` — ₹5,500
// against a ₹1,100 puja whose two enumerated Offers were both ₹1,100, whose DB
// row is 1100.00, and whose page renders exactly one distinct rupee amount.
// Google's structured-data policy requires the marked-up price to match the
// price on the page: an AggregateOffer spanning ₹1,100–₹5,500 is a manual-action
// risk, and it breaks trust for the first devotee who clicks a ₹5,500
// expectation and lands on ₹1,100.
//
// Rules encoded here, all of them "quote only what a devotee can actually pay":
//   * bounds come from the ENUMERATED offers, never from an arithmetic guess;
//   * only bookable (active) temples set those bounds — a price nobody can buy
//     must not become the ceiling advertised to Google;
//   * one distinct price ⇒ one `Offer`, not an `AggregateOffer` with a
//     degenerate range;
//   * every Offer url points at /pujas/book?slug=… , the URL that actually
//     serves the form. /pujas/{slug}/book is a redirect stub, so the old markup
//     handed Google a set of 307s.
// Guarded by __tests__/seo/structured-data-honesty.test.ts.
// ──────────────────────────────────────────────────────────────────────────

export type PujaOfferTemple = {
  templeSlug: string;
  templeName: string;
  templeCity?: string | null;
  templeState?: string | null;
  priceOverride?: number | string | null;
  isActive: boolean;
};

const IN_STOCK = 'https://schema.org/InStock';
const OUT_OF_STOCK = 'https://schema.org/OutOfStock';

/** Effective price for one temple: its override when it has a usable one, else
 *  the catalogue base price. Never NaN — a NaN in JSON-LD serialises to null. */
function effectivePrice(basePrice: number | string, override: number | string | null | undefined): number {
  const base = Number(basePrice);
  if (override === null || override === undefined || override === '') {
    return Number.isFinite(base) ? base : 0;
  }
  const p = Number(override);
  return Number.isFinite(p) && p > 0 ? p : Number.isFinite(base) ? base : 0;
}

export function bookingUrl(pujaSlug: string, templeSlug?: string): string {
  const q = new URLSearchParams({ slug: pujaSlug });
  if (templeSlug) q.set('temple', templeSlug);
  return `${SITE_URL}/pujas/book?${q.toString()}`;
}

export function pujaOffersJsonLd(puja: {
  slug: string;
  name?: string;
  basePrice: number | string;
  temples: PujaOfferTemple[];
}): Record<string, unknown> {
  const bookable = puja.temples.filter((t) => t.isActive);

  // No bookable temple: the page still shows the catalogue price, so mark that
  // one price out of stock rather than inventing a range or omitting the offer.
  if (bookable.length === 0) {
    return {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: effectivePrice(puja.basePrice, null),
      availability: OUT_OF_STOCK,
      url: bookingUrl(puja.slug),
    };
  }

  const offers = bookable.map((temple) => {
    const area = [temple.templeCity, temple.templeState].filter(Boolean).join(', ');
    return {
      '@type': 'Offer',
      name: puja.name ? `${puja.name} at ${temple.templeName}` : temple.templeName,
      price: effectivePrice(puja.basePrice, temple.priceOverride),
      priceCurrency: 'INR',
      availability: IN_STOCK,
      url: bookingUrl(puja.slug, temple.templeSlug),
      ...(area ? { areaServed: { '@type': 'Place', name: area } } : {}),
    };
  });

  const prices = offers.map((o) => o.price);
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);

  if (lowPrice === highPrice) {
    return {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: lowPrice,
      availability: IN_STOCK,
      url: bookingUrl(puja.slug),
    };
  }

  return {
    '@type': 'AggregateOffer',
    priceCurrency: 'INR',
    lowPrice,
    highPrice,
    offerCount: offers.length,
    availability: IN_STOCK,
    url: `${SITE_URL}/pujas/${puja.slug}`,
    offers,
  };
}
