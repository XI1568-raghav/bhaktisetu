# Schema.org JSON-LD — 9 Page-Level Additions Ready-to-Implement

> Companion to R-Q1-E-007 spec. Engineer copies snippets directly to each page metadata.

## 1. /store/[handle] → Product schema

```typescript
// apps/web/app/store/[handle]/page.tsx
const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.images,
  brand: { '@type': 'Brand', name: 'Bhaktisetu' },
  sku: product.sku,
  offers: {
    '@type': 'Offer',
    price: product.priceInr,
    priceCurrency: 'INR',
    availability: product.inStock ? 'InStock' : 'OutOfStock',
    seller: { '@type': 'Organization', name: 'Bhaktisetu Foundation' }
  },
  aggregateRating: product.reviewCount > 0 ? {
    '@type': 'AggregateRating',
    ratingValue: product.avgRating,
    reviewCount: product.reviewCount
  } : undefined
}
```

## 2. /yatra/[slug] → TouristTrip schema

```typescript
const yatraSchema = {
  '@context': 'https://schema.org',
  '@type': 'TouristTrip',
  name: yatra.name,
  description: yatra.description,
  image: yatra.images,
  itinerary: yatra.days.map((day, i) => ({
    '@type': 'TouristAttraction',
    name: day.name,
    description: day.description,
    position: i + 1
  })),
  offers: {
    '@type': 'Offer',
    price: yatra.priceInr,
    priceCurrency: 'INR',
    validFrom: yatra.bookingFrom,
    availability: 'InStock'
  },
  provider: { '@type': 'Organization', name: 'Bhaktisetu Foundation' }
}
```

## 3. /gita → Book schema

```typescript
const bookSchema = {
  '@context': 'https://schema.org',
  '@type': 'Book',
  name: 'Bhagavad Gita',
  author: { '@type': 'Person', name: 'Vyasa (Veda Vyasa)' },
  numberOfPages: 700,
  bookEdition: 'Classical Sanskrit + Bhaktisetu English Translation',
  inLanguage: ['sa', 'hi', 'en'],
  bookFormat: 'EBook',
  publisher: { '@type': 'Organization', name: 'Bhaktisetu Foundation' },
  hasPart: [
    { '@type': 'Chapter', name: 'Arjuna Vishada Yoga', position: 1 },
    // ... 17 more chapters
  ]
}
```

## 4. /gita/chapter-[N] → Chapter schema

```typescript
const chapterSchema = {
  '@context': 'https://schema.org',
  '@type': 'Chapter',
  name: chapter.name,
  position: chapter.number,
  isPartOf: {
    '@type': 'Book',
    name: 'Bhagavad Gita',
    author: { '@type': 'Person', name: 'Vyasa' }
  },
  description: chapter.summary,
  inLanguage: ['sa', 'hi', 'en']
}
```

## 5. /why-darshya → FAQPage schema

```typescript
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(faq => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer
    }
  }))
}
// Min 10 Q&A pairs for Google rich-snippet eligibility
```

## 6. /astrology/[id] → Service schema

```typescript
const astrologyServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: astrologer.name + ' — Vedic Astrology Consultation',
  description: astrologer.bio,
  provider: { '@type': 'Person', name: astrologer.name },
  serviceType: 'Vedic Astrology Consultation',
  areaServed: { '@type': 'Country', name: 'India' },
  offers: astrologer.tiers.map(tier => ({
    '@type': 'Offer',
    price: tier.priceInr,
    priceCurrency: 'INR',
    name: tier.name,
    description: tier.description
  }))
}
```

## 7. /pujas/[slug] → Service schema

```typescript
const pujaServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: puja.name + ' Booking',
  description: puja.description,
  serviceType: 'ReligiousService',
  provider: { '@type': 'Organization', name: 'Bhaktisetu Foundation' },
  areaServed: { '@type': 'Country', name: 'India' },
  offers: {
    '@type': 'Offer',
    price: puja.priceInr,
    priceCurrency: 'INR',
    description: 'Includes verified pandit + 24hr video proof + 80G receipt'
  },
  brand: { '@type': 'Brand', name: 'Bhaktisetu' }
}
```

## 8. /temples/[slug] → TouristAttraction + PostalAddress schema

```typescript
const templeSchema = {
  '@context': 'https://schema.org',
  '@type': 'TouristAttraction',
  name: temple.name,
  description: temple.description,
  image: temple.images,
  address: {
    '@type': 'PostalAddress',
    addressLocality: temple.city,
    addressRegion: temple.state,
    addressCountry: 'IN',
    postalCode: temple.pincode
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: temple.lat,
    longitude: temple.lng
  },
  openingHoursSpecification: temple.darshanTimings.map(slot => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: slot.days,
    opens: slot.opens,
    closes: slot.closes
  }))
}
```

## 9. /aarti/[slug] → CreativeWork schema

```typescript
const aartiSchema = {
  '@context': 'https://schema.org',
  '@type': 'CreativeWork',
  name: aarti.name,
  alternateName: aarti.sanskrit,
  author: { '@type': 'Person', name: aarti.composer || 'Traditional' },
  inLanguage: ['sa', 'hi', 'en'],
  datePublished: aarti.composedDate || 'Traditional',
  about: {
    '@type': 'Thing',
    name: aarti.deity,
    description: aarti.deityContext
  }
}
```

## Implementation pattern

```typescript
// apps/web/app/.../page.tsx
export const metadata = {
  other: {
    'application/ld+json': JSON.stringify(schemaObject)
  }
}
```

OR via `<script>` tag in component with `nonce={nonce}` (post R-Q1-E-006 codemod).

## Verify

- Google Rich Results Test: https://search.google.com/test/rich-results
- Schema.org Validator: https://validator.schema.org/
- Bhaktisetu schema-validator agent (probes 14 URLs daily)

## Engineering ticket

Engineer: copy each snippet to respective page.tsx file. Time estimate: 30 min per page × 9 = 4.5 hours.
