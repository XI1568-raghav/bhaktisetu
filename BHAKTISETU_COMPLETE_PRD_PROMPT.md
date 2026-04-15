# BHAKTISETU — Complete PRD & Implementation Prompt

> **Purpose**: This is a self-contained, end-to-end prompt to build Bhaktisetu from scratch. Give this entire document to Claude Code, Cursor, or any AI coding assistant. It contains market research, competitor analysis, revenue models, feature specifications, tech stack, database schema, API design, UI/UX specs, AI features, testing strategy, and deployment plan — everything needed to build and launch a production-ready devotional super-app.

---

## 1. EXECUTIVE SUMMARY

Build **Bhaktisetu** — India's first integrated devotional super-app combining live temple darshan, puja booking with video proof, spiritual content (aartis/mantras/chalisas), AI-powered spiritual guidance, e-commerce, and gaushala seva in one platform.

**Market**: $58.56B Indian religious market (2023), projected $90-100B by 2032. Digital devotion growing at 28-35% CAGR. 900+ spiritual tech startups. NRI users generate 9-10x ARPU ($81/month vs $7-9 domestic).

**Differentiator**: No competitor integrates ALL of: darshan + puja with video proof + AI spiritual counsel + content + commerce + gaushala. We are the "super-app" that connects the full devotional journey.

**MVP Revenue Target**: 10K DAU, ₹20-30 Lakh/month within 3 months of launch.

---

## 2. MARKET RESEARCH & COMPETITOR ANALYSIS

### 2.1 Market Size & Growth

| Metric | Value |
|---|---|
| India Religious Market (2023) | $58.56 Billion |
| Projected (2032) | $90-100 Billion |
| Digital Devotion CAGR | 28-35% |
| Online Spiritual Services Share | 18% (2023) → 36% (2030) |
| Spiritual Tech Startups in India | 900+ |
| Funding in Spiritual Tech (2023) | $51M (up from $5M in 2022) |

### 2.2 Competitor Deep Dive

#### Tier 1: Market Leaders

**AstroTalk** — ₹1,214 Cr FY25 Revenue
- 35M+ MAU, astrology consultations (chat/call)
- AI: Bhrigoo.ai (first AI Vedic astrologer), kundli interpretations
- Revenue: Per-minute consultations (₹5-50/min), e-commerce (₹140 Cr in first year)
- Weakness: Single vertical (astrology only), no temple/darshan/puja booking
- Funding: $20M Series C

**Sri Mandir (AppsForBharat)** — $12M ARR, 40M+ downloads
- Darshan + temple offerings, 70+ verified temples
- NRI ARPU: $81/month (9x domestic at $7-9)
- Weakness: No astrology, limited content/education, low domestic ARPU
- Funding: $53.4M total, Series C $20M (2025), $175M valuation

#### Tier 2: Funded Challengers

**VAMA** — ₹19.5 Cr FY24, 250 temple partnerships
- E-puja, e-darshan, spiritual e-commerce, expanding to offline travel
- 70% revenue from temple services; Funding: $7.36M

**DevDham** — 150+ temples across 16 states
- Multi-faith (Hinduism, Buddhism, Sikhism, Jainism)
- Funding: ₹6 Cr seed (Titan Capital, All In Capital)

**UtsavApp** — 1L+ active users, 60+ temple partnerships
- Puja + prasad + priest consultations
- Funding: Pre-Series A (Equanimity + India Quotient)

**Bhagva** — VR-powered darshan, pandit booking
- VR darshan of 12 Jyotirlingas and Char Dham
- Women empowerment (agarbatti making, solar diyas)
- Funding: $1M Pre-Series A

**Japam** — ₹30 Cr revenue, spiritual D2C e-commerce
- Spiritual jewellery, Jyotish AI companion, Karma Points gamification
- AOV: ₹700, 30% repeat rate

**Melooha** — AI-powered astrology SaaS
- 200+ proprietary algorithms, 110+ countries
- Non-fear-based astrology (major differentiator)
- Funding: $2.6M seed

#### Tier 3: Niche Players
- **DharmikVibes**: Luxury yatra for HNIs/NRIs (private jets, VIP darshan)
- **Temple Connect**: 7,000+ temples onboarded but poor UX
- **Shemaroo Bhakti**: Listed media company, 24/7 darshan, devotional content
- **Devaseva**: 10L+ devotees, Agama Vidhi compliance focus
- **mymandir**: 5M+ users, WhatsApp integration (content only)

### 2.3 White Space Analysis (Bhaktisetu's Opportunity)

| Gap | Competitor Status | Bhaktisetu Solution |
|---|---|---|
| No super-app exists | Everyone is single-vertical | Integrate ALL: darshan + puja + content + commerce + AI |
| No AI across full journey | AstroTalk has astrology AI only | AI counsel → puja booking → video proof → commerce |
| No priest verification + video proof | No competitor does this | Mandatory video proof, verified priests, payout gating |
| No panchang-driven personalization | Basic horoscopes only | Every content/puja recommendation tied to current panchang |
| NRI monetization underserved | Sri Mandir has $81 ARPU but limited features | Full NRI tier with USD pricing, international shipping, Stripe |
| Temple SaaS missing | No self-serve temple onboarding | Free temple dashboard, revenue sharing |

---

## 3. REVENUE MODEL (Three Pillars)

### Pillar 1: Spiritual Access (45% of revenue at scale)
- **Puja Booking Commissions**: 20-40% on ₹100-₹25,000 bookings
- **NRI Premium Subscriptions**: ₹99-4,999/month (USD equivalent)
- **Live Darshan Premium Access**: Ad-free, HD, multi-angle
- **Temple SaaS**: Free onboarding, premium analytics/features

### Pillar 2: Engagement & Learning (15%)
- **Bhakti Pass Subscription**: ₹49/month (ad-free content, premium aartis)
- **Courses Marketplace**: Vedic knowledge, yoga certification (30% commission)
- **Creator Fund**: Revenue sharing with content creators
- **Advertising**: Sponsored temple promotions, festival campaigns

### Pillar 3: Purposeful Commerce (40%)
- **Prasad Delivery**: 20-40% margin, ₹200-500 per order
- **Bhakti Store**: Rudraksha, puja items, idols, books (25-30% margin)
- **Gaushala Partnerships**: Cow feeding ₹50/day, adoption ₹5,000/month
- **B2B Prasad Wholesaling**: Bulk orders for temples/events

### Unit Economics
- CAC (early): ₹10-20 (organic via SEO + temple partnerships)
- CAC (scale): ₹50-100 (paid digital)
- LTV: ₹1,200-1,800 (casual) to ₹48,000-72,000 (NRI premium)
- LTV:CAC Ratio: 12-20:1 (casual) to 480-1200:1 (premium NRI)

### Pricing Structure
| Product | Domestic (INR) | NRI (USD) |
|---|---|---|
| Puja Booking | ₹100-25,000 | $25-500 |
| Bhakti Pass | ₹49/month | $4.99/month |
| NRI Premium | — | $9.99-49.99/month |
| Prasad Delivery | ₹200-500 | $15-40 |
| Store Products | ₹99-5,000 | $10-200 |
| Gaushala (cow feeding) | ₹50/day | $5/day |

---

## 4. COMPLETE FEATURE SPECIFICATION

### 4.1 Core Features (MVP — Month 1-3)

#### Temple Discovery
- Browse 5+ verified temples (expanding to 200+)
- Filter by city, state, tradition (Shaiva/Vaishnava/Shakta/Smarta), deity
- Geo-search: "temples near me" with radius
- Temple detail: description, history, gallery, timings, dress code, contact, map
- Verified badge, trust score (0-100)
- Reviews and ratings from booking customers

#### Puja Booking (Core Revenue Engine)
- 10 puja types (Rudrabhishek, Ganesh Puja, Satyanarayan Katha, Maha Mrityunjay Jaap, Lakshmi Puja, Navgraha Shanti, Sunderkand Path, Hanuman Chalisa Path, Ram Charit Manas Path, Pitru Dosh Nivaran)
- Temple-specific pricing with NRI multiplier
- Slot-based availability (morning/afternoon/evening, max bookings per slot)
- 4-step booking wizard: Temple+Date+Slot → Devotee Details → Review+Prasad → Payment
- AI Sankalp generator (Sanskrit prayer text with transliteration)
- Booking number: BS-YYYYMMDD-XXXXX format
- Status tracking: pending_payment → confirmed → priest_assigned → in_progress → completed → video_uploaded → delivered
- Video proof mandatory (priest uploads after completion)
- Prasad delivery option (+₹150, address selection)
- Review/rating after delivery
- 24-hour cancellation window

#### Payment System
- Razorpay (domestic): UPI, cards, netbanking, wallets
- Stripe (international): USD for NRI users
- Webhook handling for async payment events
- Automatic refund on eligible cancellations
- Priest payout system (70% of booking after video proof)

#### Live Darshan
- Live temple streams (AWS IVS, <3s latency)
- Viewer count tracking
- Premium streams (Bhakti Pass subscribers)
- Scheduled streams with reminders
- VOD replay of past darshans

#### Spiritual Content
- 8 content types: aarti, chalisa, mantra, bhajan, story, article, shloka, video_reel
- Audio player with waveform visualization, seekable progress, volume control
- Daily curated picks (rotated by day-of-year)
- Full-text search across title, body, tags, deity
- Multilingual (10 Indian languages)
- Premium content gating (Bhakti Pass)

#### Daily Panchang
- Tithi, Nakshatra, Yoga, Karana, Var
- Sunrise/sunset, Rahu Kaal, Shubh Muhurat
- Festival calendar with reminders
- Vrat (fasting day) notifications
- Date navigation (prev/next day)

#### E-Commerce Store
- 25-30 SKUs: puja thali sets, rudraksha, idols, books, incense, diyas
- Product catalog with collections/categories
- Cart with quantity management
- Price: original + discounted, free delivery over ₹499, 5% GST
- Checkout with address selection + Razorpay payment
- Order tracking

#### User System
- Phone OTP authentication (Supabase Auth)
- Profile: name, phone, email, gotra, nakshatra, rashi, preferred language
- NRI toggle with country selector (auto-detects pricing tier)
- Saved addresses for prasad delivery
- Booking history, order history, subscription management

#### Priest Portal
- Priest dashboard: earnings (total/monthly/pending), booking counts, rating
- Assigned bookings management: accept, start, complete, upload video
- Video proof upload (URL or file)
- Payout history with bank transfer/UPI tracking
- Profile management: bio, specializations, languages, experience

### 4.2 AI Features (Differentiator)

#### "Ask a Pandit" AI Chatbot
- Claude API with RAG on 85+ scripture verses (Bhagavad Gita, Upanishads, mantras)
- Streaming SSE responses with typing indicator
- Scripture citation cards (chapter:verse, Sanskrit, transliteration, English, Hindi)
- Conversation history with multi-conversation support
- Suggested questions for new users
- Hindi + English support
- Demo mode (works without API key with curated responses)
- Cost: ~$80-150/month per 1K users (with prompt caching)

#### Smart Puja Recommendation Engine
- Rule-based: nakshatra → deity affinity → puja category mapping
- 27 nakshatras mapped to ruling deities
- 12 rashis mapped to elements and deity affinities
- 10 life events (career, health, marriage, education, etc.) mapped to puja types
- Claude enhancement: personalized 2-3 line explanation per recommendation
- Top 3 recommendations with auspicious dates from panchang
- "Recommended for You" widget on dashboard + puja pages

#### AI Sankalp Generator
- Input: devotee name, gotra, nakshatra, puja type, deity, intention
- 10 example sankalpas as few-shot context
- Output: Sanskrit text + transliteration + English + Hindi translation
- Integrated in booking Step 2 (one-click "Generate Sankalp")
- User can edit before finalizing

#### AI Content Personalization
- Time-of-day mapping: morning→aartis, evening→bhajans, night→meditation mantras
- Panchang integration: festival-specific content on festival days
- User rashi/nakshatra→deity affinity→relevant content
- "For You Today" section on home page + content hub
- Falls back to daily picks for unauthenticated users

#### Multilingual Translation
- Claude-powered translation preserving spiritual terminology
- Hindi ↔ English (expandable to all 10 languages)
- SHA-256 hash-based DB caching (no repeated API calls)
- Language switcher on content pages

### 4.3 Admin Panel
- Temple CRUD (create, verify, enable darshan, manage priests)
- Priest verification queue (Aadhaar check, approve/reject)
- Puja type management (create, pricing, enable/disable)
- Content CMS (create, edit, publish workflow)
- Booking management (view all, assign priests, resolve issues)
- Payment/payout dashboard (revenue reports, pending payouts)
- User management (search, view profiles, manage subscriptions)

---

## 5. TECH STACK SPECIFICATION (Best of April 2026)

### 5.1 Architecture: Turborepo Monorepo

```
bhaktisetu/
├── apps/
│   ├── web/                    # Next.js 15 (main website, port 3000)
│   ├── api/                    # Fastify 5 backend (port 4000)
│   ├── admin/                  # Admin dashboard (Next.js, port 3001)
│   ├── mobile/                 # React Native Expo
│   └── medusa-store/           # MedusaJS commerce (future)
├── packages/
│   ├── ui/                     # ShadcnUI component library (Button, Card, Badge)
│   ├── shared/                 # TypeScript types, Zod validators, constants, utils
│   ├── api-client/             # React Query hooks + typed fetch client
│   ├── config/                 # Shared ESLint/TS/Tailwind configs
│   └── analytics/              # PostHog event tracking
├── tooling/tsconfig/           # Base, Next.js, Node.js TS configs
├── .github/workflows/          # CI/CD pipelines
├── e2e/                        # Playwright E2E tests
├── turbo.json                  # Build pipeline config
├── pnpm-workspace.yaml
└── CLAUDE.md                   # AI assistant project context
```

### 5.2 Technology Choices

| Layer | Technology | Version | Why |
|---|---|---|---|
| **Monorepo** | Turborepo + pnpm | 2.4+ / 10.33+ | Build caching, parallel tasks, strict deps |
| **Frontend** | Next.js + React | 15 / 19 | RSC, SSR/SSG, Turbopack, SEO |
| **UI** | Tailwind CSS + ShadcnUI | v4 | Utility-first, fully customizable, CVA variants |
| **Backend** | Fastify | 5 | Fastest Node.js framework, plugin ecosystem |
| **ORM** | Prisma | 6.6+ | Type-safe queries, migrations, schema-as-code |
| **Database** | PostgreSQL (Supabase) | 16 | Auth + Realtime + Storage + RLS in one |
| **Cache** | Upstash Redis | — | Serverless, pay-per-request |
| **Queue** | BullMQ | 5.45+ | Background jobs (payouts, notifications) |
| **Payments** | Razorpay + Stripe | — | Domestic + International |
| **AI** | Claude API (Anthropic) | Sonnet 4.6 | Best reasoning, prompt caching (90% cost reduction) |
| **Streaming** | AWS IVS | — | Low-latency broadcast, $0.20/hr/channel |
| **Mobile** | React Native (Expo) | 52 | Shared TypeScript codebase |
| **CMS** | Sanity | — | Headless, localization, rich content |
| **Deployment** | Vercel + Railway + Cloudflare | — | Best-in-class per layer |
| **Monitoring** | Sentry + PostHog | — | Errors + analytics + feature flags |
| **Testing** | Vitest + Playwright | 3.1+ | Unit/integration + E2E |

### 5.3 Key Dependencies

```json
// Backend (apps/api)
"@anthropic-ai/sdk": "^0.39.0",
"@prisma/client": "^6.6.0",
"@supabase/supabase-js": "^2.49.4",
"fastify": "^5.3.2",
"@fastify/cors": "^11.0.1",
"@fastify/helmet": "^13.0.1",
"@fastify/rate-limit": "^10.2.1",
"razorpay": "^2.9.5",
"ioredis": "^5.6.1",
"bullmq": "^5.45.2",
"zod": "^3.24.4"

// Frontend (apps/web)
"next": "^15.3.1",
"react": "^19.1.0",
"@tanstack/react-query": "^5.74.4",
"tailwindcss": "^4.1.4",
"lucide-react": "^0.503.0",
"@supabase/supabase-js": "^2.49.4"
```

---

## 6. DATABASE SCHEMA (Complete Prisma)

Design the database with these 17+ models:

### Core Models
- **User**: id (UUID), phone (unique), email, fullName, avatarUrl, preferredLanguage (enum: 10 Indian languages), locationCity, locationState, isNri (boolean), nriCountry, gotra, nakshatra, rashi, subscriptionTier (free/bhakti_pass/premium), timestamps
- **UserAddress**: id, userId (FK), label, line1, line2, city, state, pincode, country, isDefault, lat, lng
- **Temple**: id, name, nameLocal, slug (unique), description, deityPrimary, deities[], tradition (enum), addressLine, city, state, pincode, country, lat, lng, phone, email, websiteUrl, images (JSON), timingInfo (JSON), isVerified, verificationDate, trustScore (0-100), liveDarshanEnabled, streamUrl, status (enum), timestamps
- **Priest**: id, userId (FK unique), displayName, specializations[], languages[], experienceYears, aadhaarVerified, certificationDocs (JSON), ratingAvg, ratingCount, isVerified, verificationStatus (enum), bio, avatarUrl, commissionRate (default 0.70), status (enum), timestamps
- **TemplePriest**: id, templeId (FK), priestId (FK), isPrimary, joinedAt — unique(templeId, priestId)

### Booking Models
- **PujaType**: id, name, nameLocal, slug (unique), description, category (enum: 7 types), deity, durationMinutes, basePrice (Decimal 10,2), nriPrice (Decimal 10,2), samagriIncluded, samagriItems (JSON), images (JSON), videoProofMandatory (default true), isActive, sortOrder, timestamps
- **TemplePujaOffering**: id, templeId (FK), pujaTypeId (FK), priceOverride (Decimal?), availableSlots (JSON), maxBookingsPerSlot (default 5), isActive — unique(templeId, pujaTypeId)
- **PujaBooking**: id, bookingNumber (unique, "BS-YYYYMMDD-XXXXX"), userId (FK), templeId (FK), pujaTypeId (FK), priestId (FK?), templePujaOfferingId (FK), scheduledDate (Date), scheduledTimeSlot, devoteeNames (JSON: [{name, gotra, nakshatra}]), sankalpDetails, specialInstructions, priceAmount (Decimal), currency, platformCommission (Decimal), priestPayout (Decimal), status (enum: 9 states), videoProofUrl, videoUploadedAt, prasadDeliveryRequested, prasadDeliveryAddressId (FK?), prasadTrackingId, rating (1-5?), reviewText, cancelledAt, cancellationReason, timestamps

### Payment Models
- **Payment**: id, userId (FK), bookingId (FK?), orderId, amount (Decimal), currency, paymentGateway (enum: razorpay/stripe/phonepe), gatewayPaymentId, gatewayOrderId, status (enum: 6 states), method, refundAmount (Decimal?), metadata (JSON), timestamps
- **PriestPayout**: id, priestId (FK), bookingId (FK), amount (Decimal), status (enum: 4 states), payoutMethod, payoutReference, processedAt, createdAt

### Content Models
- **ContentItem**: id, type (enum: 8 types), title, titleLocal, slug (unique), body (Text), audioUrl, videoUrl, imageUrl, deity, language (enum), durationSeconds, tags[], isPremium, viewCount, likeCount, sortOrder, status (enum: 3 states), publishedAt, timestamps
- **DailyPanchang**: id, date (unique Date), tithi, nakshatra, yoga, karana, sunrise, sunset, rahuKaal, shubhMuhurat (JSON), festivals[], vrat[], specialInfo, locationCity

### Streaming
- **LiveDarshanStream**: id, templeId (FK), streamKey, playbackUrl, status (enum: offline/live/scheduled), scheduledStart, actualStart, viewerCount, peakViewers, isPremium, timestamps

### Subscriptions
- **Subscription**: id, userId (FK), plan (enum: 4 plans), price (Decimal), currency, status (enum: 4 states), currentPeriodStart, currentPeriodEnd, gatewaySubscriptionId, autoRenew, timestamps

### AI Models
- **AiConversation**: id, userId (FK), title, messages (JSON), timestamps
- **AiTranslationCache**: id, sourceText, sourceLanguage, targetLanguage, translatedText, contentHash (unique), createdAt

### Index Strategy
- Users: phone, email, isNri
- Temples: slug, city, state, isVerified, GiST on (lat, lng)
- PujaBookings: userId, templeId, status, scheduledDate, composite(templeId, scheduledDate, status)
- ContentItems: slug, type, deity, language, GIN on tags
- Payments: gatewayPaymentId, userId, status
- DailyPanchang: unique on date

---

## 7. API DESIGN (14 Route Modules, 110+ Endpoints)

### Authentication (/api/v1/auth)
```
POST /send-otp          — Send OTP to phone (Supabase Auth)
POST /verify-otp        — Verify OTP, upsert user, return session
POST /refresh           — Refresh access token
POST /logout            — Invalidate session
GET  /me                — Get current user profile [AUTH]
```

### Users (/api/v1/users)
```
GET    /me              — Full profile [AUTH]
PATCH  /me              — Update profile [AUTH]
GET    /me/addresses    — List addresses [AUTH]
POST   /me/addresses    — Add address [AUTH]
PATCH  /me/addresses/:id — Update address [AUTH]
DELETE /me/addresses/:id — Delete address [AUTH]
GET    /me/bookings     — My bookings (paginated) [AUTH]
GET    /me/subscription — Subscription status [AUTH]
```

### Temples (/api/v1/temples)
```
GET /                   — List (city, state, tradition, deity, search, liveDarshan filters)
GET /search             — Full-text search
GET /nearby             — Geo-query (lat, lng, radius)
GET /:slug              — Temple detail with priests, pujas, darshan
GET /:slug/pujas        — Available pujas at temple
GET /:slug/darshan      — Live darshan stream info
GET /:slug/reviews      — Temple reviews from bookings
```

### Pujas (/api/v1/pujas)
```
GET /types              — All puja types (category, deity filters)
GET /types/:slug        — Puja detail with temple offerings
GET /availability       — Slot availability (templeId, pujaTypeId, date)
```

### Bookings (/api/v1/bookings)
```
POST   /book            — Create booking [AUTH]
GET    /my              — User's bookings (paginated, status filter) [AUTH]
GET    /availability    — Check slot availability
GET    /:id             — Booking detail [AUTH]
PATCH  /:id             — Update status [AUTH]
POST   /:id/cancel      — Cancel booking [AUTH]
GET    /:id/video       — Video proof URL [AUTH]
POST   /:id/review      — Submit rating + review [AUTH]
```

### Payments (/api/v1/payments)
```
POST /create-order      — Create Razorpay order [AUTH]
POST /verify            — Verify payment signature [AUTH]
POST /webhook           — Razorpay webhook (signature verified, NO AUTH)
GET  /:id               — Payment details [AUTH]
POST /:id/refund        — Process refund [ADMIN]
```

### Content (/api/v1/content)
```
GET /                   — List (type, deity, language, isPremium, search)
GET /daily              — Today's curated picks
GET /search             — Full-text search
GET /categories         — Content types with counts
GET /:slug              — Content detail (increments view count)
POST /:id/like          — Like/unlike [AUTH]
```

### Darshan (/api/v1/darshan)
```
GET /live               — Currently live streams
GET /scheduled          — Upcoming scheduled streams
GET /:id/stream         — Stream playback URL (premium check)
POST /:id/join          — Register viewer
POST /:id/leave         — Deregister viewer
```

### Panchang (/api/v1/panchang)
```
GET /today              — Today's panchang
GET /:date              — Specific date
GET /festivals          — Upcoming festivals (days param)
GET /muhurat            — Shubh muhurat for date range
```

### Store (/api/v1/store)
```
GET /products           — Product catalog (collection, category, search, sort, price range)
GET /products/:handle   — Product detail
GET /collections        — Product collections
POST /cart              — Create cart [AUTH]
POST /cart/items        — Add to cart [AUTH]
PATCH /cart/items/:id   — Update quantity [AUTH]
DELETE /cart/items/:id  — Remove from cart [AUTH]
POST /cart/checkout     — Initiate checkout [AUTH]
GET /orders/:id         — Order detail [AUTH]
```

### Subscriptions (/api/v1/subscriptions)
```
GET  /plans             — Available plans
POST /subscribe         — Subscribe [AUTH]
POST /cancel            — Cancel subscription [AUTH]
POST /webhook           — Payment webhook
```

### Priest Portal (/api/v1/priest) [PRIEST ROLE]
```
GET   /dashboard         — Earnings, bookings, rating
GET   /bookings          — Assigned bookings
PATCH /bookings/:id/accept  — Accept booking
PATCH /bookings/:id/start   — Start puja
PATCH /bookings/:id/complete — Complete puja
POST  /bookings/:id/video   — Upload video proof
GET   /payouts           — Payout history
GET   /profile           — Priest profile
PATCH /profile           — Update profile
```

### AI (/api/v1/ai)
```
POST   /chat             — Streaming SSE chat [AUTH]
GET    /conversations    — List conversations [AUTH]
GET    /conversations/:id — Get conversation [AUTH]
DELETE /conversations/:id — Delete conversation [AUTH]
POST   /recommend-puja   — Puja recommendations
POST   /generate-sankalp — Sanskrit sankalp [AUTH]
GET    /personalize-content — Personalized content
POST   /translate        — Translation with caching
```

### Admin (/api/v1/admin) [ADMIN ROLE]
```
GET /dashboard           — Revenue metrics
CRUD /temples            — Temple management
CRUD /priests            — Priest verification
CRUD /pujas              — Puja type management
CRUD /content            — Content CMS
GET /bookings            — All bookings with filters
GET /payments            — Payment reports
CRUD /users              — User management
```

---

## 8. UI/UX SPECIFICATIONS

### 8.1 Design System
- **Primary**: Orange/Saffron (#EA580C, orange-600) — represents devotion, auspiciousness
- **Accent**: Amber/Gold (#F59E0B) — temple domes, divine light
- **Success**: Green (#16A34A) — verified, completed
- **Neutral**: Stone palette (stone-50 to stone-900) — text, backgrounds
- **Fonts**: Noto Sans (Latin) + Noto Sans Devanagari (Hindi)
- **Corners**: rounded-2xl (16px) for cards, rounded-xl for buttons
- **Shadows**: Soft, orange-tinted (hover: shadow-orange-100/50)
- **Icons**: Lucide React (consistent line-style icons)

### 8.2 Web Pages (27 routes)

**Public**: Home, Temples (list + detail), Pujas (list + detail), Darshan (hub + viewer), Content (hub + detail), Panchang, Store (catalog + detail), Ask Pandit

**Authenticated**: Dashboard, Profile, Bookings (list + detail), Cart, Checkout

**Priest Portal**: Dashboard, Bookings (list + detail), Payouts, Profile

**Auth**: Login (phone OTP with 6-digit auto-focus input)

### 8.3 Mobile App (React Native Expo)
- 5-tab navigation: Home, Temples, Darshan, Content, Profile
- Saffron tab bar, matching web theme
- Floating "Ask Pandit" FAB on home screen
- Bottom mini audio player for content
- Shared TypeScript types from packages/shared

---

## 9. CODING CONVENTIONS & ARCHITECTURE RULES

### TypeScript
- Strict mode everywhere (`"strict": true`)
- No `any` types (use `unknown` + type guards)
- Zod for ALL external input validation
- Prisma Decimal handling (never raw floating point for money)

### Backend
- Services are class-based singletons exported as `const serviceInstance = new ServiceClass()`
- Routes delegate to services, never contain business logic
- Auth middleware via Fastify preHandler hooks
- Rate limiting on public endpoints
- Error responses: `{ error: string, details?: unknown }`
- Pagination: `{ data: T[], pagination: { page, limit, total, totalPages } }`

### Frontend
- Server Components by default (SSR/SSG for SEO)
- Client Components only when needed (`'use client'` for interactivity)
- All API calls wrapped in try/catch with fallback data
- React Query for client-side data fetching
- ISR with revalidation tags for dynamic pages
- Mobile-first responsive design

### File Naming
- kebab-case for files (`temple.service.ts`)
- PascalCase for components (`AudioPlayer.tsx`)
- Co-located tests (`*.test.ts` next to source)

### Business Rules
1. Video proof is MANDATORY for all puja bookings
2. Priest payout only after video upload
3. Platform commission: 20-40% (configured per temple)
4. NRI pricing: 9-10x domestic (per puja type)
5. 24-hour cancellation window for confirmed bookings
6. Booking number format: BS-YYYYMMDD-XXXXX
7. All temples must be verified before going live
8. Priests require Aadhaar verification for payouts

---

## 10. TESTING STRATEGY

### Unit Tests (Vitest)
- Target: 90%+ on services, 100% on validators/utils
- Mock Prisma for database calls
- Test every state machine transition
- Test every Zod schema with valid + invalid inputs
- Test every utility function with edge cases

### E2E Tests (Playwright)
- 5 critical user journeys:
  1. Devotee booking flow (browse → book → pay → confirm)
  2. Content consumption (browse → play audio → navigate)
  3. Auth flow (login → OTP → dashboard → profile)
  4. Store purchase (browse → cart → checkout)
  5. Priest flow (login → accept → complete → upload video)

### Regression
- `pnpm turbo build` — all routes build
- `pnpm turbo type-check` — zero TS errors
- `pnpm turbo test` — all tests pass

---

## 11. DEPLOYMENT & CI/CD

### Infrastructure
| Component | Service |
|---|---|
| Web (Next.js) | Vercel (edge, ISR, auto-deploy) |
| API (Fastify) | Railway (container, auto-deploy) |
| Database | Supabase (managed PostgreSQL) |
| Cache | Upstash Redis |
| CDN | Cloudflare |
| Streaming | AWS IVS (ap-south-1) |
| Video Storage | AWS S3 + CloudFront |
| Mobile Builds | EAS Build (Expo) |

### CI/CD (GitHub Actions)
- PR: lint → type-check → test → build
- Main: deploy API (Railway) → deploy Web (Vercel) → run migrations → E2E smoke tests
- Mobile: manual trigger → EAS build → submit to stores

---

## 12. SEED DATA (for development/demo)

Create comprehensive seed data:
- 5 real Indian temples (Kashi Vishwanath, Tirumala Tirupati, Siddhivinayak, Somnath, Jagannath Puri) with full descriptions, coordinates, timing info, images
- 10 puja types with domestic/NRI pricing and samagri lists
- Temple-puja offerings with time slots (morning/afternoon/evening)
- 20+ content items (aartis, chalisas, mantras, articles) with Hindi text
- 30 days of panchang data with festivals and vrats
- 2 verified priests linked to temples
- 3 test users (domestic, NRI, priest)
- 5 sample bookings in various statuses
- Live darshan stream configurations

---

## 13. IMPLEMENTATION SEQUENCE

### Month 1: Foundation
- Week 1: Turborepo setup, Prisma schema, all package configs, CI/CD, CLAUDE.md
- Week 2: Phone OTP auth, user profiles, temple data seeding, temple listing/detail pages (SSR)
- Week 3: Puja booking backend (services, Razorpay integration, state machine)
- Week 4: Puja booking frontend (4-step wizard, payment, status tracker)

### Month 2: Content + Commerce + Darshan
- Week 5: Content system (API, audio player, panchang widget, daily content)
- Week 6: Live darshan (video player, viewer tracking, stream management)
- Week 7: E-commerce store (product catalog, cart, checkout)
- Week 8: Priest portal (dashboard, video upload, payouts)

### Month 3: AI + Polish + Launch
- Week 9: AI chatbot (Claude RAG), puja recommendation engine, sankalp generator
- Week 10: Content personalization, translation, subscriptions
- Week 11: Mobile app (Expo, 5 screens), admin dashboard, SEO optimization
- Week 12: Testing (unit + E2E), security audit, load testing, soft launch

---

## 14. SUCCESS METRICS

| Metric | Target (Month 3) | Target (Month 12) |
|---|---|---|
| DAU | 10,000 | 300,000 |
| Monthly Revenue | ₹20-30 Lakh | ₹75-120 Lakh |
| Bookings/Month | 5,000 | 50,000 |
| NRI Users | 500 | 10,000 |
| Temples Onboarded | 5 | 50 |
| Content Items | 50 | 500 |
| App Rating | 4.5+ | 4.7+ |
| Test Coverage | 90% | 95% |

---

## 15. ENVIRONMENT VARIABLES

```env
# Database
DATABASE_URL=postgresql://postgres:***REMOVED***@db.project.supabase.co:5432/postgres

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Razorpay
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Stripe (NRI)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
AWS_S3_BUCKET=bhaktisetu-media

# Redis
REDIS_URL=redis://default:...@redis.upstash.io:6379

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=phc_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:4000/api/v1
API_PORT=4000
```

---

> **Instructions to Claude**: Build this entire platform following the specifications above. Start with the Turborepo monorepo setup, then work through the implementation sequence month by month. Use the Superpowers development methodology: brainstorm → plan → TDD → execute → review → verify. Every feature should have fallback data so the UI works even without a running API. Prioritize the booking flow (core revenue) and AI chatbot (key differentiator). Make it beautiful with the saffron/spiritual theme. Make it production-ready.
