# Bhaktisetu UX Design Patterns

> Consistent design language across web + mobile + email. Foundation for future feature design.

## Brand color discipline (4 worlds)

| World | Color | Hex | Use case |
|---|---|---|---|
| Worship | Saffron | `#9e6229` (saffron-600) | Pujas, primary CTAs, devotional actions |
| Library/Knowledge | Indigo | `#4f46e5` (indigo-600) | Scripture, wisdom content, references |
| Yatra/Commerce | Emerald | `#059669` (emerald-600) | Yatra packages, commerce success, completion |
| Today/Time | Amber | `#d97706` (amber-600) | Festivals, time-sensitive, urgency |
| Cool surface | Cream | `#fff7ed` (orange-50) | Backgrounds, cards |

### Discipline rules

- Each page has ONE primary world color
- Cross-world CTAs use neutral grey + world-specific accent
- Saffron is exclusively action-color (Book CTA, Subscribe button)
- Indigo for Library/scripture content (never Astrology bookings — those use saffron action)
- Emerald for successful commerce (booking confirmation, video proof ready)
- Amber for time-sensitive (festival countdown, today's deity)

## Typography hierarchy

### Web (apps/web)

- H1: 3xl on mobile, 5xl on desktop, font-bold, saffron-700
- H2: 2xl mobile, 3xl desktop, font-semibold, gray-900
- H3: xl mobile, 2xl desktop, font-semibold
- Body: base (17px), text-gray-700
- Small: sm (14px), text-gray-500
- Devanagari: var(--font-family-devanagari) when present

### Mobile (apps/mobile via Expo)

- Match web hierarchy
- Slightly larger touch targets (44px minimum)
- Hindi text larger than English (Indic readability)

### Email (React Email)

- Heading: 24px bold, saffron-700
- Body: 16px, gray-700, line-height 1.6
- Buttons: 18px, white text on saffron-600 bg, rounded
- Footer: 12px, gray-500

## Spacing rhythm

- Section padding: py-12 (48px vertical)
- Card padding: p-6 (24px)
- Text spacing: leading-relaxed (1.625)
- Mobile breakpoints: 768px (md), 1024px (lg), 1280px (xl)

## Interactive patterns

### Buttons

```typescript
// Primary action — saffron-600
<button className="px-6 py-3 bg-saffron-600 text-white rounded font-semibold hover:bg-saffron-700">
  Book Now
</button>

// Secondary action — outlined saffron
<button className="px-6 py-3 border-2 border-saffron-600 text-saffron-700 rounded font-semibold hover:bg-saffron-50">
  Learn More
</button>

// Destructive — red but rare
<button className="px-6 py-3 bg-red-600 text-white rounded font-semibold hover:bg-red-700">
  Cancel Booking
</button>
```

### Forms

```typescript
<label className="block text-sm font-semibold text-gray-700 mb-2">
  Email
</label>
<input
  type="email"
  className="w-full px-4 py-2 border border-gray-300 rounded focus:border-saffron-500 focus:ring-2 focus:ring-saffron-100 focus:outline-none"
  placeholder="you@example.com"
/>
```

### Cards

```typescript
<div className="bg-white p-6 rounded-lg shadow-sm border border-saffron-100 hover:shadow-md transition-shadow">
  <h3 className="text-lg font-semibold mb-2">{cardTitle}</h3>
  <p className="text-gray-600 mb-4">{cardDescription}</p>
  <a href="#" className="text-saffron-700 font-semibold hover:underline">Learn more →</a>
</div>
```

### Live darshan player

- 16:9 aspect ratio card
- Red "LIVE" pill in top-left when streaming
- Player controls below
- 2-line title + 1-line temple name above
- Saffron border when active

### Booking flow steps

1. Pick puja (browse /pujas list)
2. Pick pandit (filter by city/specialization)
3. Pick date + time (calendar UI)
4. Add devotee info (name + intent + special requests)
5. Add payment (Razorpay/Stripe checkout)
6. Confirmation page w/ Booking ID
7. Auto-WhatsApp + email confirmation

Each step: progress bar at top + back button + clear "Next" CTA.

## Mobile-specific patterns

### Bottom tab nav (5 tabs)

```typescript
<MobileBottomTabs>
  <Tab icon={HomeIcon} label="Home" href="/" />
  <Tab icon={EyeIcon} label="Darshan" href="/today" />
  <Tab icon={CalendarIcon} label="Book" href="/pujas" primary />
  <Tab icon={BookIcon} label="Library" href="/library" />
  <Tab icon={UserIcon} label="Profile" href="/profile" />
</MobileBottomTabs>
```

### Mobile sticky CTAs

- Sticky aarti CTA: bottom-6 right-6, scrolls in after 800px
- Sticky booking summary: when scrolling /pujas/[slug] booking flow
- Sticky live darshan indicator: when stream is active

## Accessibility (WCAG 2.2)

- Color contrast 4.5:1 minimum for body text
- 3:1 for large text + UI components
- Focus rings 2-3px offset 2px on `:focus-visible`
- Touch targets 44px minimum
- Alt text on all images
- ARIA labels for icon-only buttons
- Skip-to-content link in header
- Form labels associated with inputs

## Localization

- 6 languages: English (default), Hindi (Devanagari), Tamil, Telugu, Bengali, Marathi
- Right-to-left support reserved (Q4 2027+ if Arabic/Urdu users added)
- Devanagari typography mixed with Latin elegantly
- Hindi font fallback: Noto Sans Devanagari + Tiro fallback

## Email + WhatsApp templates

### Subject lines

- Booking confirmation: ✓ "Your {{puja}} booking confirmed — BS-XXX"
- Video proof: 📹 "Your {{puja}} video proof is ready"
- Festival reminder: 🪔 "Diwali Lakshmi Puja booking — 7 days left"
- Founder note: 🙏 "Personal note from Sunil — Bhaktisetu founder"

### Body tone

- First sentence: customer name + warm greeting (Namaste/Pranam)
- Specific factual information (no fluff)
- Single primary CTA (one decision per email)
- Closing: signed by founder OR team
- Footer: bhaktisetu.com + unsubscribe link

## Iconography

- Use Lucide icons (lightweight, consistent)
- Devotional-specific icons custom (Om, Trishul, Lotus)
- 24x24 standard, 48x48 large
- Color matches world (saffron for worship, indigo for library, etc.)

## Asset directory

- /og/default.png (1200x630, brand-themed)
- /og/puja/{slug}.png (dynamic per puja)
- /og/temple/{slug}.png (dynamic per temple)
- /images/deities/{slug}.png (200x200 thumb)
- /images/temples/{slug}.png (400x400 hero)

## Animation patterns

- TextReveal: word-by-word fade-in 60ms stagger (per existing component)
- ParallaxLayer: scroll-driven translateY for hero depth
- Sticky aarti CTA: fade-in + slide-up after 800px scroll
- Card hover: scale-1.02 + image scale-1.06 (1s ease)

## Founder discipline

- ALL new screens reviewed against this pattern doc
- A/B tests only test ONE pattern at a time
- Mobile + desktop parity always checked
- WCAG audit quarterly
- Brand color consistency monthly review
