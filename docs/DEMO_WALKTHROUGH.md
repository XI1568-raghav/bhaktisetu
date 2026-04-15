# Bhaktisetu Demo Walkthrough

Complete demo guide for showcasing all features of Bhaktisetu -- India's devotional super-app.

---

## Prerequisites

1. **Node.js 20+** -- Verify with `node -v`
2. **pnpm** -- Install with `npm install -g pnpm` (v10+ recommended)
3. **Expo Go app** -- Install on your phone from App Store / Google Play (for mobile demo)
4. **PostgreSQL** -- Either local or a Supabase project (for full API mode)
5. **Git** -- For cloning and version control

---

## Setup Steps

### 1. Install Dependencies

```bash
cd Bhaktisetu
pnpm install
```

### 2. Environment Configuration

Create `.env.local` files for the API and web apps:

**apps/api/.env.local**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/bhaktisetu
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_SECRET=your-razorpay-secret
ANTHROPIC_API_KEY=sk-ant-xxxxx
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-at-least-32-chars
PORT=4000
```

**apps/web/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

> **Note:** The web app and mobile app work with static fallback data when the API is unavailable. You can demo most features without a running database.

### 3. Start Development Servers

```bash
# Start all services (API on :4000, Web on :3000)
pnpm dev
```

### 4. Start Mobile App (separate terminal)

```bash
cd apps/mobile
npx expo start
```

Scan the QR code with Expo Go on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## Web Demo Script (17 Steps)

### Landing & Navigation

**Step 1: Homepage**
- Open `http://localhost:3000` in your browser
- **Expected:** Hero section with "India's Devotional Super-App" tagline, saffron gradient header, featured temples, live darshan previews, and quick action buttons
- **Highlight:** Notice the Om symbol branding and saffron/amber color palette throughout

**Step 2: Temple Directory**
- Click "Temples" in the navigation bar
- **Expected:** Grid of 5 temple cards with images, LIVE badges, trust score ratings, city/state info
- **Highlight:** Kashi Vishwanath and Tirumala show LIVE badges with viewer counts. Jagannath Puri shows as verified but no live stream
- Try the search bar -- type "Shiva" to filter temples by deity

**Step 3: Temple Detail**
- Click on "Shri Kashi Vishwanath Temple"
- **Expected:** Temple detail page with full description, location (Varanasi), tradition (Shaiva), Jyotirlinga badge, live darshan embed area, available pujas, and reviews

### Live Darshan

**Step 4: Darshan Listing**
- Navigate to the "Darshan" page from the main nav
- **Expected:** Grid of live streams with LIVE/SCHEDULED status badges, viewer counts, temple names, and city info
- **Highlight:** 4 temples currently live, 4 more scheduled for later

**Step 5: Darshan Stream**
- Click on any live darshan stream card
- **Expected:** Full stream viewer page with video player area, temple info, live chat placeholder, chadhava (virtual offering) options, and viewer count

### Puja Booking (Golden Path)

**Step 6: Browse Pujas**
- Navigate to "Pujas" from the main nav
- **Expected:** List of available pujas with deity, price (INR), rating, and "Book Now" buttons
- **Highlight:** Rudrabhishek (Rs 1,100), Satyanarayan Katha (Rs 2,100), and more

**Step 7: Puja Detail**
- Click on "Rudrabhishek"
- **Expected:** Detailed puja page with description, what's included, priest info, temple, duration, pricing (INR + USD for NRI), and booking form
- **Highlight:** NRI pricing shown as ~$130 (approximately 9-10x domestic)

**Step 8: Book a Puja**
- Fill in the sankalp form: name, gotra, nakshatra, prayer intention
- Select a date and time slot
- Click "Proceed to Payment"
- **Expected:** Razorpay payment dialog (test mode) or payment summary page
- **Highlight:** Booking number generated in BS-YYYYMMDD-XXXXX format

### Spiritual Content

**Step 9: Content Library**
- Navigate to "Content" from the main nav
- **Expected:** Segmented tabs for Aarti, Chalisa, Mantra, Bhajan categories
- Content items show title, deity, duration, and play buttons

**Step 10: Play Content**
- Click play on "Hanuman Chalisa"
- **Expected:** Audio player UI appears with play/pause, progress bar, and track info

**Step 11: Content Detail**
- Click on any content item title
- **Expected:** Full content page with lyrics/text, audio player, related content, and deity info

### Panchang

**Step 12: Daily Panchang**
- Navigate to "Panchang" from the main nav
- **Expected:** Today's Hindu calendar with tithi, nakshatra, yoga, karana, sunrise/sunset, rahu kaal, and festival info
- **Highlight:** Auspicious/inauspicious time indicators with color coding

### AI Features

**Step 13: Ask AI Pandit**
- Navigate to "Ask a Pandit" from the main nav (or click the sparkle FAB)
- **Expected:** Chat interface with suggested questions and input field
- Type: "What puja should I do for career growth?"
- **Expected:** AI responds with personalized puja recommendation based on the question, with scripture references

**Step 14: Follow-up Question**
- Type: "Tell me more about Satyanarayan Katha"
- **Expected:** Detailed response about the puja, its significance, ideal timing, and a "Book Now" call-to-action

### E-Commerce Store

**Step 15: Devotional Store**
- Navigate to "Store" from the main nav
- **Expected:** Product grid with puja samagri, idols, books, and devotional items
- **Highlight:** Prices in INR with product images and categories

**Step 16: Product & Cart**
- Click on a product, then "Add to Cart"
- Navigate to Cart page
- **Expected:** Cart with item details, quantity selector, price total, and "Proceed to Checkout"

### Priest Dashboard

**Step 17: Priest Portal**
- Navigate to `/priest` in the URL bar
- **Expected:** Priest dashboard with upcoming bookings, booking management, payout history, and profile settings
- **Highlight:** Booking cards show status (pending/confirmed/completed), video proof upload requirement, and payout amounts

---

## Mobile Demo Script (10 Steps)

### Setup

**Step 1: Launch App**
- Scan QR code from `npx expo start` with Expo Go
- **Expected:** App launches with saffron splash screen, then loads into the Home tab
- **Highlight:** 5 tabs at bottom: Home, Temples, Darshan, Content, Profile

### Home Tab

**Step 2: Home Screen Walkthrough**
- Scroll through the home screen
- **Expected:**
  - "Namaste" welcome header with Om symbol
  - Live Darshan horizontal carousel with 3 temple stream cards (LIVE badges, viewer counts)
  - Popular Pujas horizontal carousel with 4 puja cards (name, deity, price, rating)
  - Today's Panchang card with tithi, nakshatra, sunrise, sunset, rahu kaal
  - Saffron "Ask AI Pandit" floating action button in bottom-right

**Step 3: Interaction**
- Tap on a Live Darshan card
- Tap on a Popular Puja card
- Tap the "Ask AI Pandit" FAB
- **Expected:** Touch feedback on all interactive elements (opacity change)

### Temples Tab

**Step 4: Temple List**
- Tap the "Temples" tab
- **Expected:** Search bar at top, 5 temple cards in a vertical list
- Each card shows: temple name, city/state, deity, tradition, trust score as star rating, LIVE badge (where applicable), "View Temple" button

**Step 5: Temple Search**
- Type "Mumbai" in the search bar
- **Expected:** List filters to show only Siddhivinayak Temple
- Clear search to see all temples again

### Darshan Tab

**Step 6: Live Darshan Grid**
- Tap the "Darshan" tab
- **Expected:**
  - "Live Now" section with 4 stream cards in 2-column grid (LIVE badge, viewer count, play button overlay)
  - "Upcoming" section with 4 scheduled stream cards (SCHEDULED badge, scheduled time)
  - Notification reminder card at the bottom

### Content Tab

**Step 7: Browse Content**
- Tap the "Content" tab
- **Expected:** Segmented control with 4 tabs: Aarti | Chalisa | Mantra | Bhajan
- Aarti tab shows content items with title, deity, duration, type badge, play button

**Step 8: Play Audio**
- Tap play on "Om Jai Jagdish Hare"
- **Expected:** Item highlights with saffron accent, mini player appears at bottom with title, deity, pause button, and progress bar
- Tap "Chalisa" segment tab
- **Expected:** Content switches to show Hanuman Chalisa and Shiv Chalisa
- Mini player persists at bottom

### Profile Tab

**Step 9: Profile Screen**
- Tap the "Profile" tab
- **Expected:** Guest state with:
  - Person icon avatar placeholder
  - "Welcome, Devotee" heading
  - Sign In button (saffron) and "Create Account" link
  - Quick Links section: My Bookings, Subscription, Addresses, Settings
  - More section: Help & Support, About Bhaktisetu, Share App
  - App version footer "Bhaktisetu -- Version 1.0.0 -- Made with devotion in India"

**Step 10: Navigation Flow**
- Tap through all 5 tabs quickly
- **Expected:** Smooth tab transitions with no lag, consistent saffron/white theme across all screens
- Each tab remembers its scroll position when you return

---

## Test Commands

Run from the project root (`Bhaktisetu/`):

```bash
# Run all unit tests
pnpm test:unit

# Build all apps and packages
pnpm turbo build

# Type-check all packages
pnpm turbo type-check

# Run linting
pnpm turbo lint

# Run tests via Turbo
pnpm turbo test

# Format code
pnpm format
```

### Individual App Commands

```bash
# API server only
cd apps/api && pnpm dev

# Web app only
cd apps/web && pnpm dev

# Mobile app only
cd apps/mobile && npx expo start

# Shared package type-check
cd packages/shared && pnpm type-check
```

---

## Architecture Notes

- **Monorepo:** Turborepo + pnpm workspaces manage all apps and packages
- **Fallback data:** Web and mobile apps render with static fallback data when the API/database is unavailable, so demos work offline
- **Shared types:** `@bhaktisetu/shared` provides TypeScript types, Zod validators, and constants used by all apps
- **Theme consistency:** Saffron (#EA580C) is the primary brand color across web (Tailwind) and mobile (React Native StyleSheet)
- **API contract:** RESTful API at `/api/v1/` with endpoints for temples, pujas, darshan, content, panchang, bookings, AI, auth, payments, and store
