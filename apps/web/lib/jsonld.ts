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
};

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
