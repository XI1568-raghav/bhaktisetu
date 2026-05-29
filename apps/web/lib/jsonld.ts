// Shared JSON-LD schema builders. Render via:
//   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

export const SITE_URL = 'https://darshya.online';

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Darshya',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "India's devotional super-app — live darshan, puja booking with video proof, AI spiritual guidance, gaushala seva.",
  sameAs: [
    'https://twitter.com/darshya_app',
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
  if (args.priceUsd != null) {
    offers.push({
      '@type': 'Offer',
      price: String(args.priceUsd),
      priceCurrency: 'USD',
      url: args.url,
      availability: args.inStock === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    });
  }
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
    'Annual all-access subscription for the Indian diaspora. No NRI surcharge on bookings, weekly 1:1 priest video call, priority booking, free 80G receipts, unlimited AI Pandit chat.',
  offers: [
    {
      '@type': 'Offer',
      price: '5000',
      priceCurrency: 'INR',
      url: `${SITE_URL}/nri`,
      availability: 'https://schema.org/InStock',
    },
    {
      '@type': 'Offer',
      price: '60',
      priceCurrency: 'USD',
      url: `${SITE_URL}/nri`,
      availability: 'https://schema.org/InStock',
    },
  ],
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
        text:
          "Darshya is India's devotional super-app at darshya.online. Devotees worldwide book pujas at verified temples with priest video proof, watch live darshan, read panchang, talk to verified astrologers, donate to gaushalas with 80G receipts, and shop sacred items — all in one place. Available in English, Hindi, Tamil, Telugu, Bengali, and Marathi.",
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
        text:
          'Yes. Every puja booking on Darshya requires the priest to upload a video recording before payout — no video, no money. Priests are Aadhaar-verified, temples are vetted before they go live, and 80G receipts use real PAN and donee 80G registration numbers. Payments process through Razorpay (domestic INR) and Stripe (NRI USD).',
      },
    },
    {
      '@type': 'Question',
      name: 'How is Darshya different from Sri Mandir, Utsav, or AstroSage?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Darshya is the only Indian devotional app that makes priest video proof mandatory for every puja booking — not optional, not opt-out. It also offers transparent NRI pricing in USD, gaushala donations with real 80G receipts, and one unified app for puja, darshan, astrology, panchang, gaushala seva, and store. Sri Mandir focuses on puja-only; Utsav focuses on community; AstroSage focuses on jyotish.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where can I download or use Darshya?',
      acceptedAnswer: {
        '@type': 'Answer',
        text:
          'Use Darshya on the web at https://darshya.online from any device. The Android app is rolling out on Google Play. The iOS app is on the roadmap. NRI devotees in the United States, United Kingdom, Canada, Australia, the UAE, and Singapore can book and donate in USD with full 80G receipts where eligible.',
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
