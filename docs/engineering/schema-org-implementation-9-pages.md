# Schema.org JSON-LD Implementation — 9 Pages Code-Ready

> Actual code snippets to copy-paste into each page metadata. Replaces R-Q1-E-007 spec with implementation.

## Implementation pattern

Each page exports `metadata` with `other: { 'application/ld+json': JSON.stringify(schemaObject) }`. CF Pages embeds this in HTML head automatically.

## Page 1: /store/[handle] — Product Schema

```typescript
// apps/web/app/store/[handle]/page.tsx
import { getProduct } from '@/lib/products'

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params
  const product = getProduct(handle)
  if (!product) return {}
  
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images.map(img => `https://darshya.online${img}`),
    brand: { '@type': 'Brand', name: 'Bhaktisetu' },
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      price: product.priceInr.toString(),
      priceCurrency: 'INR',
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Bhaktisetu Foundation' },
      url: `https://darshya.online/store/${handle}`
    },
    aggregateRating: product.reviewCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: product.avgRating.toString(),
      reviewCount: product.reviewCount.toString()
    } : undefined
  }
  
  return {
    title: `${product.name} — Bhaktisetu`,
    description: product.description,
    other: {
      'application/ld+json': JSON.stringify(schema)
    }
  }
}
```

## Page 2: /yatra/[slug] — TouristTrip Schema

```typescript
// apps/web/app/yatra/[slug]/page.tsx
const yatraSchema = {
  '@context': 'https://schema.org',
  '@type': 'TouristTrip',
  name: yatra.name,
  description: yatra.description,
  image: yatra.images.map(img => `https://darshya.online${img}`),
  itinerary: yatra.days.map((day, i) => ({
    '@type': 'TouristAttraction',
    name: day.name,
    description: day.description,
    position: i + 1
  })),
  offers: {
    '@type': 'Offer',
    price: yatra.priceInr.toString(),
    priceCurrency: 'INR',
    validFrom: yatra.bookingFrom,
    availability: 'https://schema.org/InStock'
  },
  provider: { '@type': 'Organization', name: 'Bhaktisetu Foundation' }
}
```

## Page 3: /gita — Book Schema

```typescript
// apps/web/app/gita/page.tsx
export const metadata = {
  other: {
    'application/ld+json': JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: 'Bhagavad Gita',
      author: { '@type': 'Person', name: 'Vyasa (Veda Vyasa)' },
      numberOfPages: 700,
      bookEdition: 'Classical Sanskrit + Bhaktisetu English Translation',
      inLanguage: ['sa', 'hi', 'en'],
      bookFormat: 'EBook',
      publisher: { '@type': 'Organization', name: 'Bhaktisetu Foundation' }
    })
  }
}
```

## Page 4: /gita/chapter-[N] — Chapter Schema

```typescript
// apps/web/app/gita/chapter-[N]/page.tsx
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

## Page 5: /why-darshya — FAQPage Schema

```typescript
// apps/web/app/why-darshya/page.tsx
const faqs = [
  { question: 'What is Bhaktisetu?', answer: 'Verified pandit puja booking platform...' },
  { question: 'How does video proof work?', answer: 'Pandit records...' },
  // ... 10+ Q&A pairs for rich-snippet eligibility
]

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
```

## Page 6: /astrology/[id] — Service Schema

```typescript
// apps/web/app/astrology/[id]/page.tsx
const astrologyServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: `${astrologer.name} — Vedic Astrology Consultation`,
  description: astrologer.bio,
  provider: { '@type': 'Person', name: astrologer.name },
  serviceType: 'Vedic Astrology Consultation',
  areaServed: { '@type': 'Country', name: 'India' },
  offers: astrologer.tiers.map(tier => ({
    '@type': 'Offer',
    price: tier.priceInr.toString(),
    priceCurrency: 'INR',
    name: tier.name,
    description: tier.description
  }))
}
```

## Page 7: /pujas/[slug] — Service Schema

```typescript
// apps/web/app/pujas/[slug]/page.tsx
const pujaServiceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: `${puja.name} Booking`,
  description: puja.description,
  serviceType: 'ReligiousService',
  provider: { '@type': 'Organization', name: 'Bhaktisetu Foundation' },
  areaServed: { '@type': 'Country', name: 'India' },
  offers: {
    '@type': 'Offer',
    price: puja.priceInr.toString(),
    priceCurrency: 'INR',
    description: 'Includes verified pandit + 24hr video proof + 80G receipt'
  },
  brand: { '@type': 'Brand', name: 'Bhaktisetu' }
}
```

## Page 8: /temples/[slug] — TouristAttraction + PostalAddress Schema

```typescript
// apps/web/app/temples/[slug]/page.tsx
const templeSchema = {
  '@context': 'https://schema.org',
  '@type': 'TouristAttraction',
  name: temple.name,
  description: temple.description,
  image: temple.images.map(img => `https://darshya.online${img}`),
  address: {
    '@type': 'PostalAddress',
    addressLocality: temple.city,
    addressRegion: temple.state,
    addressCountry: 'IN',
    postalCode: temple.pincode
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: temple.lat.toString(),
    longitude: temple.lng.toString()
  },
  openingHoursSpecification: temple.darshanTimings.map(slot => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: slot.days,
    opens: slot.opens,
    closes: slot.closes
  }))
}
```

## Page 9: /aarti/[slug] — CreativeWork Schema

```typescript
// apps/web/app/aarti/[slug]/page.tsx
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

## Implementation timeline

| Week | Page | Estimated Hours |
|---|---|---|
| W1 | /pujas/[slug] | 1.5 hr |
| W1 | /temples/[slug] | 1.5 hr |
| W2 | /aarti/[slug] | 1 hr |
| W2 | /store/[handle] | 1 hr |
| W3 | /yatra/[slug] | 1 hr |
| W3 | /astrology/[id] | 1 hr |
| W4 | /gita + /gita/chapter-[N] | 1.5 hr |
| W4 | /why-darshya | 1 hr |
| **Total** | **9 pages** | **9.5 hours** |

## Verification

```bash
# Build verify
pnpm next build

# Google Rich Results Test
curl -X POST 'https://searchconsole.googleapis.com/v1/urlTestingTools/mobileFriendlyTest:run' \
  -d '{"url":"https://darshya.online/pujas/rudrabhishek"}'

# Schema validator
curl https://darshya.online/pujas/rudrabhishek | grep 'application/ld\+json'
```

## Expected SEO impact

- Rich snippet eligibility for 9 page types
- 2-5x click-through rate uplift from search results
- Knowledge Graph eligibility for Brand + Service entries
- Google "People also ask" appearance
- Improved Lighthouse SEO score (+5-10 points per page)
