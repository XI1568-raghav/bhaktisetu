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
