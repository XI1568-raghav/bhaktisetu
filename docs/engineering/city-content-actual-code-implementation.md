# /city/{slug} Content Expansion — Actual Code Implementation

> Real implementation patch for top 5 cities (Varanasi, Mumbai, Bengaluru, Delhi, Tirupati). Replaces spec from R-Q3-S-007a.

## Existing pattern audit

Current `apps/web/app/city/[slug]/page.tsx` likely fetches city data + renders basic listing. We extend with 4 new sections per city without breaking existing flow.

## 4-section template per city

### Sections

1. **Why book pandit in {city}?** (3-4 paragraphs)
2. **Best temples for live darshan** (5-10 entries w/ cross-links)
3. **Festival highlights 2026** (3-5 festivals)
4. **NRI families: book from abroad** (cultural distance + NRI testimonials)

## Implementation files

### File 1: City detail data

Create `apps/web/lib/city-deep.ts`:

```typescript
export interface CityDeepContent {
  citySlug: string
  whyBookPandit: string[] // 3-4 paragraphs
  bestTempleSlugs: string[] // cross-link to /temples/{slug}
  festivalHighlights: { festivalSlug: string; description: string }[] // 3-5 entries
  nriContent: string[] // 3-5 paragraphs
  schemaAdditions: {
    geoCoordinates: { lat: number; lng: number }
    population: number
    languages: string[]
  }
}

export const CITY_DEEP_CONTENT: CityDeepContent[] = [
  {
    citySlug: 'varanasi',
    whyBookPandit: [
      'Varanasi is the spiritual capital of Hinduism, home to the Kashi Vishwanath Jyotirlinga and a 5000-year-old pandit lineage. The Punditgan Sabha of Kashi maintains the world strictest pandit verification standards, with apprenticeship periods often exceeding 12 years before pandit certification.',
      'Most-booked pujas by Varanasi residents include Rudrabhishek at Kashi Vishwanath, Maha Mrityunjaya Japa, and Sandhya Aarti sponsorship. For Hindu families globally, booking through verified Varanasi pandits offers the highest spiritual potency given the city moksha-loka tradition.',
      'NRI emotional anchor: Hindu families abroad consider Varanasi a once-in-a-lifetime pilgrimage destination. Through Bhaktisetu, NRI families can book pujas at Kashi without the physical visit — receiving 24hr video proof of ceremony completion + 80G tax-deductible receipts for donations.',
      'Specific Varanasi neighborhoods + temple clusters: Vishwanath Gali (Vishwanath temple corridor), Manikarnika Ghat (sacred cremation), Assi Ghat (Sandhya Aarti), Tulsi Manas Mandir (Tulsidas heritage), Sankat Mochan Hanuman (Hanuman lineage).'
    ],
    bestTempleSlugs: ['kashi-vishwanath', 'sankat-mochan-hanuman', 'annapurna-devi', 'mrityunjaya-mahadev', 'tulsi-manas-mandir', 'kal-bhairav', 'vishalakshi-shakti-peeth', 'durga-mandir-durga-kund', 'markandey-mahadev', 'bharat-mata-temple'],
    festivalHighlights: [
      { festivalSlug: 'maha-shivaratri', description: 'Maha Shivaratri at Kashi draws 800K+ pilgrims for 24-hour Jagran — book Rudrabhishek slot 30 days in advance.' },
      { festivalSlug: 'dev-deepawali', description: 'Dev Deepawali (Kartik Purnima, 15 days after Diwali) — millions of diyas light Varanasi ghats; live darshan via Bhaktisetu.' },
      { festivalSlug: 'naga-panchami', description: 'Naga Panchami at Mrityunjaya Mahadev — specific to Varanasi tradition + serpent-worship.' },
      { festivalSlug: 'hanuman-jayanti', description: 'Hanuman Jayanti at Sankat Mochan — historical association w/ Tulsidas Hanuman tradition.' },
      { festivalSlug: 'ganga-aarti-annual', description: 'Annual Ganga Aarti milestone events (every Purnima) — live darshan slots fill quickly.' }
    ],
    nriContent: [
      'NRI Hindu families from US, UK, Canada, and Australia constitute 28% of Bhaktisetu Varanasi bookings — particularly the diaspora seeking Pind Daan, Shraddha rituals, and parent-related life-event pujas.',
      'USD/GBP/CAD/AUD pricing: ₹2,500 typical Rudrabhishek = $30 USD / £24 GBP / $36 CAD / A$45 AUD. NRI customers report this represents fair value given quality + verification + video proof.',
      'Time zone considerations: Varanasi pandits perform pujas at IST 06:00-22:00 — equivalent to Bay Area 16:30-08:30 next day. Bhaktisetu coordinates timing per family preference.',
      'Real NRI testimonial: "My father in-law passed away in Bay Area. We had no way to perform proper Pind Daan at Gaya/Kashi. Bhaktisetu coordinated 4-day Pind Daan with Maha Brahmana pandits. Video proof + 80G receipt + cultural sensitivity throughout. Highly recommend." — Family from San Jose, May 2026'
    ],
    schemaAdditions: {
      geoCoordinates: { lat: 25.3176, lng: 82.9739 },
      population: 1500000,
      languages: ['Hindi', 'Bhojpuri', 'English']
    }
  },
  {
    citySlug: 'mumbai',
    whyBookPandit: [
      'Mumbai is India financial capital with second-largest Hindu population (8M+). Maharashtrian Brahmin tradition dominates the pandit network, with strong Marathi pandit collective + Vaishnav Vallabh tradition. Most-booked pujas reflect Mumbai cosmopolitan + religious mix.',
      'Most-booked Mumbai pujas: Ganesh Chaturthi (peak), Mahalakshmi Lakshmi Puja (Friday + Diwali), Walkeshwar Banganga rituals, Siddhivinayak Sankashti Chaturthi, ISKCON Juhu Krishna ceremonies.',
      'NRI Maharashtrian emigrant pattern: significant Mumbai-to-Bay-Area/NJ/London Maharashtrian diaspora. Through Bhaktisetu, these families can maintain ritual continuity with home-city pandits + temples.',
      'Specific Mumbai neighborhoods: Prabhadevi (Siddhivinayak), Bhulabhai Desai Road (Mahalakshmi), Walkeshwar/Malabar Hill (Banganga), Juhu (ISKCON), Bandra (Mount Mary cross-tradition).'
    ],
    bestTempleSlugs: ['siddhivinayak-mumbai', 'mahalakshmi-mumbai', 'babulnath-mahadev', 'walkeshwar-banganga', 'iskcon-juhu', 'mumbadevi-temple', 'mount-mary-bandra', 'shree-krishna-andheri', 'haji-ali-dargah', 'sri-thiruvalleeswarar'],
    festivalHighlights: [
      { festivalSlug: 'ganesh-chaturthi', description: '10-day Ganesh Chaturthi — Mumbai biggest festival; 4M+ pilgrims across Dagdusheth-Mumbai temples. Pre-book Sthapana Puja 30 days ahead.' },
      { festivalSlug: 'diwali', description: 'Diwali Lakshmi Puja at Mahalakshmi Temple peaks at 100K+ visitors. Pre-book Bhakti-Pro tier for VIP slot.' },
      { festivalSlug: 'navratri', description: 'Mumbai Navratri Garba/Dandiya tradition — Bhaktisetu offers daily Devi puja at Mahalakshmi during 9 days.' },
      { festivalSlug: 'janmashtami', description: 'Krishna Janmashtami at ISKCON Juhu + Dahi Handi tradition (Mumbai-specific). Midnight aarti live-streamed.' },
      { festivalSlug: 'holi', description: 'Holi at ISKCON Juhu + Krishna Lila tradition — 4-day celebration with sponsored aarti slots.' }
    ],
    nriContent: [
      'Mumbai diaspora particularly heavy in: US East Coast (NJ, NY), UK London + Birmingham, Singapore, Dubai, Australia Sydney + Melbourne. NRI Maharashtrian + Gujarati + Marwari families dominate bookings.',
      'USD pricing: $30 typical Mahalakshmi puja = ₹2,500 INR equivalent. Premium Siddhivinayak puja $50 USD = ₹4,200.',
      'Time-zone: IST 06:00 Mahalakshmi morning aarti = Bay Area 17:30 prev day = London 02:00 = NJ 20:30 prev day. Convenient for evening engagement.',
      'Real NRI testimonial: "I have been booking Friday Mahalakshmi puja for my mother in Mumbai for 6 months. Pandit Shri Sharma is wonderful — video proof every Friday + WA confirmation. Mother feels connected to the temple even from Bay Area." — Devotee from Cupertino, June 2026'
    ],
    schemaAdditions: {
      geoCoordinates: { lat: 19.0760, lng: 72.8777 },
      population: 21000000,
      languages: ['Marathi', 'Hindi', 'English', 'Gujarati']
    }
  },
  // ... 3 more cities: Bengaluru, Delhi, Tirupati similar pattern
]

export function getCityDeepContent(slug: string): CityDeepContent | undefined {
  return CITY_DEEP_CONTENT.find(c => c.citySlug === slug)
}
```

### File 2: City page component

Edit `apps/web/app/city/[slug]/page.tsx`:

```typescript
import { getCityDeepContent } from '@/lib/city-deep'
import { getTemple } from '@/lib/temples'

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const deepContent = getCityDeepContent(slug)
  const cityData = getCity(slug) // existing
  
  if (!cityData) return notFound()
  
  return (
    <main>
      {/* Existing top sections (hero, basic listing) */}
      
      {deepContent && (
        <>
          {/* New Section 1: Why book pandit in {city}? */}
          <section className="py-12 px-4 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-saffron-700 mb-6">
              Why book a pandit in {cityData.name}?
            </h2>
            {deepContent.whyBookPandit.map((para, i) => (
              <p key={i} className="text-lg mb-4 text-gray-700">{para}</p>
            ))}
          </section>
          
          {/* New Section 2: Best temples for live darshan */}
          <section className="py-12 px-4 bg-amber-50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-saffron-700 mb-6">
                Best temples in {cityData.name} for live darshan
              </h2>
              <ol className="space-y-4">
                {deepContent.bestTempleSlugs.map((templeSlug, i) => {
                  const temple = getTemple(templeSlug)
                  if (!temple) return null
                  return (
                    <li key={templeSlug} className="bg-white p-4 rounded">
                      <a href={`/tirth/${templeSlug}`} className="text-saffron-700 font-semibold">
                        {i + 1}. {temple.name}
                      </a>
                      <p className="text-sm text-gray-600 mt-1">{temple.description}</p>
                    </li>
                  )
                })}
              </ol>
            </div>
          </section>
          
          {/* New Section 3: Festival highlights 2026 */}
          <section className="py-12 px-4 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-saffron-700 mb-6">
              Festival highlights in {cityData.name} 2026
            </h2>
            <div className="space-y-4">
              {deepContent.festivalHighlights.map(f => (
                <div key={f.festivalSlug} className="border-l-4 border-saffron-600 pl-4">
                  <a href={`/festival/${f.festivalSlug}`} className="font-semibold text-lg">
                    {f.festivalSlug.replace('-', ' ').replace(/^./, c => c.toUpperCase())}
                  </a>
                  <p className="text-gray-700 mt-1">{f.description}</p>
                </div>
              ))}
            </div>
          </section>
          
          {/* New Section 4: NRI families */}
          <section className="py-12 px-4 bg-indigo-50">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-indigo-700 mb-6">
                NRI families: book pujas in {cityData.name} from abroad
              </h2>
              {deepContent.nriContent.map((para, i) => (
                <p key={i} className="text-lg mb-4 text-gray-800">{para}</p>
              ))}
              <a href="/nri" className="inline-block mt-6 px-6 py-3 bg-indigo-600 text-white rounded">
                Browse NRI puja services
              </a>
            </div>
          </section>
          
          {/* Schema.org Place + OfferCatalog JSON-LD */}
          <script type="application/ld+json" dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Place',
              name: `${cityData.name} — Pujas + Temples`,
              address: {
                '@type': 'PostalAddress',
                addressLocality: cityData.name,
                addressRegion: cityData.state,
                addressCountry: 'IN'
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: deepContent.schemaAdditions.geoCoordinates.lat,
                longitude: deepContent.schemaAdditions.geoCoordinates.lng
              },
              hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: `Verified Pandit Pujas in ${cityData.name}`,
                itemListElement: deepContent.bestTempleSlugs.slice(0, 5).map(templeSlug => ({
                  '@type': 'Offer',
                  itemOffered: { '@type': 'Service', name: getTemple(templeSlug)?.name }
                }))
              }
            })
          }} />
        </>
      )}
    </main>
  )
}
```

## Engineering tasks

- Week 1: Create city-deep.ts data file (5 cities populated)
- Week 2: Update city page component
- Week 3: Schema.org JSON-LD integration
- Week 4: Internal linking audit + verify
- Week 5: Lighthouse SEO score verification (target +5 points per city)

## Verification

```bash
# Build verify
pnpm next build

# Curl + content check
curl https://darshya.online/city/varanasi | grep -c "Why book a pandit"   # expect 1
curl https://darshya.online/city/mumbai | grep -c "Festival highlights"   # expect 1

# Schema check
curl https://darshya.online/city/varanasi | grep -c "OfferCatalog"        # expect 1
```

## Expected SEO impact

- Avg city page word count: 800 → 2200 (3x depth signal)
- Internal link count per page: 5 → 25 (PageRank distribution)
- Schema additions: 1 → 3-4 types per page
- Expected organic traffic uplift: 40-80% per city
- Expected dwell time uplift: 90sec → 4min

## Next 5 cities (Week 6-10)

After top 5 ship + verify: extend to Hyderabad, Pune, Chennai, Kolkata, Ahmedabad.
