# 🧠 CLAUDE CODE — ELABORATE UI/UX MASTER PROMPT
### Inspired by Medtech Dashboard Reference Design
**Version:** 1.0 | **Target:** Web App + Mobile Application

---

## 📌 CONTEXT & OBJECTIVE

You are rebuilding / updating an existing application's **complete UI/UX system** — both web and mobile — using the attached Medtech dashboard screenshot as the **primary design reference**. This prompt governs every visual, interaction, and behavioral decision across all pages.

Your goal is not to copy the reference — it is to **extract its soul**: the warmth, the whitespace philosophy, the organic illustration style, the soft color language, and the editorial card hierarchy — then apply those principles to *this application's* content, brand, and purpose.

The home page must **tell a story** — not list features. Every page must feel like it belongs to the same living design system.

---

## 🎨 SECTION 1 — VISUAL IDENTITY

### 1.1 Brand Adaptation Rule
- Read the application's **existing name, domain, and purpose** first.
- Generate a **custom inline SVG logo** that reflects the app's personality.
  - Geometric, minimal — think Paul Rand meets modern SaaS.
  - Works at 24px and 200px. Monochrome first.
  - Use `currentColor` so it adapts to dark/light mode automatically.
- Update **all brand references** (logo, app name, tagline, favicon) to match the application context.
- Never use placeholder names. If unsure, derive the name from the app's core function.

### 1.2 Color Palette — Warm Neutral Foundation
Derive the palette from this reference philosophy. Override with brand colors only if they exist.

```css
/* PRIMARY SURFACE SYSTEM — Warm cream/sand, inspired by reference */
:root {
  --color-bg:              #f5f3ef;   /* Page background — warm off-white */
  --color-surface:         #faf9f6;   /* Card background */
  --color-surface-2:       #ffffff;   /* Elevated card / modal */
  --color-surface-offset:  #ede9e3;   /* Sidebar, sunken sections */
  --color-surface-dynamic: #e4dfd8;   /* Hover states on surfaces */
  --color-divider:         #dbd6cf;
  --color-border:          oklch(from #4a4540 l c h / 0.10);

  /* TEXT */
  --color-text:            #2a2520;   /* Primary — near black, warm */
  --color-text-muted:      #7a756e;   /* Secondary / metadata */
  --color-text-faint:      #b5b0a8;   /* Disabled / placeholder */
  --color-text-inverse:    #f9f8f4;

  /* ACCENT — derive from app category */
  /* Healthcare/Science:  teal #01696f  */
  /* Finance/Analytics:   indigo #3d5a9e */
  /* Education/Learning:  sage green #4a7c59 */
  /* Productivity/Tools:  warm amber #b87333 */
  --color-primary:        #01696f;    /* → REPLACE with app-appropriate accent */
  --color-primary-hover:  #0c4e54;
  --color-primary-active: #0f3638;
  --color-primary-highlight: #d0dedd;

  /* STATUS COLORS */
  --color-success:        #437a22;
  --color-warning:        #964219;
  --color-error:          #a12c7b;
  --color-info:           #006494;

  /* ILLUSTRATION PALETTE — For organic card artwork */
  --color-art-1: #c8d8d4;   /* Muted teal — like the reference weekly report card */
  --color-art-2: #f2c4a8;   /* Warm peach — like the reference study cards */
  --color-art-3: #e8ddd0;   /* Warm neutral */
  --color-art-4: #d4c9bc;   /* Sand */

  /* RADIUS TOKENS */
  --radius-sm:   0.375rem;
  --radius-md:   0.625rem;
  --radius-lg:   1rem;
  --radius-xl:   1.375rem;
  --radius-2xl:  1.75rem;
  --radius-full: 9999px;

  /* SHADOWS — warm-tinted */
  --shadow-sm: 0 1px 3px oklch(0.25 0.02 60 / 0.06);
  --shadow-md: 0 4px 16px oklch(0.25 0.02 60 / 0.09);
  --shadow-lg: 0 12px 40px oklch(0.25 0.02 60 / 0.13);
  --shadow-float: 0 2px 8px oklch(0.25 0.02 60 / 0.07), 0 16px 48px oklch(0.25 0.02 60 / 0.08);

  /* SPACING */
  --space-1: 0.25rem;   --space-2: 0.5rem;   --space-3: 0.75rem;
  --space-4: 1rem;      --space-5: 1.25rem;  --space-6: 1.5rem;
  --space-8: 2rem;      --space-10: 2.5rem;  --space-12: 3rem;
  --space-16: 4rem;     --space-20: 5rem;    --space-24: 6rem;
}

/* DARK MODE */
[data-theme="dark"] {
  --color-bg:              #18161400;  /* Near-black warm */
  --color-surface:         #1e1c1a;
  --color-surface-2:       #242220;
  --color-surface-offset:  #141312;
  --color-surface-dynamic: #2e2c29;
  --color-divider:         #2a2826;
  --color-border:          oklch(from #ffffff l c h / 0.08);
  --color-text:            #d4d0ca;
  --color-text-muted:      #807c76;
  --color-text-faint:      #504e4b;
  --color-primary:         #4f9ea3;
  --color-primary-hover:   #3a8890;
  --color-shadow-base:     oklch(0 0 0 / 0.35);
}
```

### 1.3 Typography System

**Font Pairing Rule:** Pick fonts that match the app's emotional register:
- **Medical/Science:** `Instrument Serif` (display) + `DM Sans` (body)
- **Productivity/SaaS:** `Cabinet Grotesk` (display) + `Satoshi` (body)
- **Education/Learning:** `Zodiak` (display) + `General Sans` (body)
- **Finance/Data:** `Geist` (display + body, monospace for numbers)

```html
<!-- LOAD VIA FONTSHARE (preferred) — replace with detected pairing -->
<link href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&f[]=satoshi@300,400,500,700&display=swap" rel="stylesheet">
```

```css
:root {
  --font-display: 'Cabinet Grotesk', 'Helvetica Neue', sans-serif;
  --font-body:    'Satoshi', 'Inter', sans-serif;
  --font-mono:    'JetBrains Mono', 'Fira Code', monospace;

  /* TYPE SCALE — fluid, clamp-based */
  --text-xs:   clamp(0.75rem,  0.7rem  + 0.25vw, 0.875rem);
  --text-sm:   clamp(0.875rem, 0.8rem  + 0.35vw, 1rem);
  --text-base: clamp(1rem,     0.95rem + 0.25vw, 1.125rem);
  --text-lg:   clamp(1.125rem, 1rem    + 0.75vw, 1.5rem);
  --text-xl:   clamp(1.5rem,   1.2rem  + 1.25vw, 2.25rem);

  /* WEB APP CAP: never exceed --text-xl (2.25rem) in app UI */
  /* Home/marketing sections may use --text-2xl for ONE hero moment */
  --text-2xl:  clamp(2rem,     1.2rem  + 2.5vw,  3.5rem);
}
```

**Hierarchy Rules (strictly enforced):**
- `--text-xl` → Page titles only. ONE per screen. Display font.
- `--text-lg` → Card headings, section labels. Body font bold.
- `--text-base` → All body text, descriptions, content.
- `--text-sm` → Nav items, buttons, form labels.
- `--text-xs` → Timestamps, status tags, metadata badges.
- **No text smaller than 12px ever.**

---

## 🏗️ SECTION 2 — LAYOUT ARCHITECTURE

### 2.1 Web App Shell (Desktop ≥ 1024px)

```
┌──────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed)  │  MAIN CONTENT AREA                 │
│  ───────────────────────│───────────────────────────────────  │
│  [Logo + App Name]      │  [Top Bar: Breadcrumb + Actions]   │
│                         │  ─────────────────────────────────  │
│  Nav Group 1            │                                     │
│   ● Dashboard           │       PAGE CONTENT                  │
│   ● [Primary Pages]     │       (Single scroll region)        │
│                         │                                     │
│  Nav Group 2            │                                     │
│   ● [Secondary Pages]   │                                     │
│                         │                                     │
│  [Spacer]               │                                     │
│                         │                                     │
│  [User Avatar + Name]   │                                     │
│  [Settings]             │                                     │
│  [Log out]              │                                     │
└──────────────────────────────────────────────────────────────┘
```

**Critical layout rules:**
- ONE scroll region: only `main` scrolls. Sidebar and header are `position: sticky`.
- Sidebar width: `240px` desktop → `64px` icon-only on collapsed → bottom nav on mobile.
- Content max-width: `var(--content-wide)` = 1200px centered in main.
- Right panel (notifications/quick info): optional third column at ≥1280px, collapses to drawer on smaller screens.

### 2.2 Mobile Shell (< 768px)

```
┌────────────────────────┐
│  [Top Bar]             │  Fixed, 56px
│  Logo   ≡  Avatar  🔔  │
├────────────────────────┤
│                        │
│   PAGE CONTENT         │  Single scroll
│   Full-width cards     │
│   16px horizontal pad  │
│                        │
├────────────────────────┤
│  [Bottom Tab Bar]      │  Fixed, 64px + safe area
│  🏠  📚  📊  👤       │
└────────────────────────┘
```

### 2.3 Card Grid System (Reference-Inspired)

The reference uses a **bento-style irregular grid** — not uniform rows. Implement this pattern:

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: var(--space-4);
}

/* Featured card spans 8 columns */
.card--featured { grid-column: span 8; }

/* Secondary cards span 4 */
.card--secondary { grid-column: span 4; }

/* Half-width cards */
.card--half { grid-column: span 6; }

/* Full-width cards */
.card--full { grid-column: span 12; }

/* Responsive collapse */
@media (max-width: 768px) {
  .bento-grid > * { grid-column: span 12 !important; }
}
```

---

## 🧩 SECTION 3 — COMPONENT SYSTEM

### 3.1 Cards (Core Component — Reference-Derived)

Cards are the primary content container. Three distinct card types from the reference:

**Type A — Illustrated Feature Card (like "Weekly Report")**
```
┌────────────────────────────────────────────┐
│  Title (--text-lg, bold)                   │
│  Subtitle (--text-sm, muted)               │
│                            [Organic Art]   │
│  [CTA Button]                              │
└────────────────────────────────────────────┘
```
- Background: soft gradient using `--color-art-1` or `--color-art-2`
- Organic SVG/CSS art in the bottom-right corner (shell, leaf, flower motif)
- Padding: `var(--space-6)`
- Radius: `var(--radius-xl)`
- Hover: `translateY(-2px)` + `box-shadow: var(--shadow-md)`
- Transition: `all 300ms cubic-bezier(0.16, 1, 0.3, 1)`

**Type B — Status Card (like task/notification items)**
```
┌────────────────────────────────────────────┐
│  [Category tag]              [Time ago]    │
│  Title (--text-base, semibold)             │
│  ─────────────────────────────────────────│
│  [● Status indicator]  Status label        │
└────────────────────────────────────────────┘
```
- Background: `var(--color-surface)`
- Border: `1px solid var(--color-border)`
- Status indicator: colored dot (`8px` circle) — green=done, amber=pending, red=urgent
- Hover: background shifts to `var(--color-surface-dynamic)`

**Type C — Progress Card (like "My Learnings")**
```
┌──────────────────────────────┐
│  [Icon square]               │
│  Item Name (--text-sm)       │
│  [████████░░] XX% progress   │
└──────────────────────────────┘
```
- 2-column grid of 2×2 cards
- Icon square: `40px`, `var(--radius-lg)`, soft colored bg from illustration palette
- Progress bar: `4px` height, rounded, `--color-primary` fill on `--color-surface-offset` track
- Animate progress fill on mount: width from 0 to value over `800ms ease-out`

### 3.2 Sidebar Navigation

```css
.sidebar {
  width: 240px;
  height: 100vh;
  position: sticky;
  top: 0;
  background: var(--color-surface-offset);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  padding: var(--space-6) var(--space-4);
  overflow-y: auto;
  scrollbar-width: none;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-item:hover {
  background: var(--color-surface-dynamic);
  color: var(--color-text);
}

.nav-item.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

/* Sub-items (like Genetics 101, DNA synthesis) */
.nav-sub-item {
  padding-left: var(--space-8);
  font-size: var(--text-xs);
  font-weight: 400;
}

.nav-sub-item::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--color-text-faint);
  /* colored dot matches reference: orange, teal, dark */
}
```

### 3.3 Avatar Stack (Reference Pattern)

```html
<div class="avatar-stack">
  <img class="avatar" src="..." alt="User 1" />
  <img class="avatar" src="..." alt="User 2" />
  <img class="avatar" src="..." alt="User 3" />
  <span class="avatar avatar--count">+5</span>
</div>
```

```css
.avatar-stack { display: flex; }
.avatar {
  width: 28px; height: 28px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-bg);
  margin-left: -8px;
  object-fit: cover;
}
.avatar:first-child { margin-left: 0; }
.avatar--count {
  background: var(--color-surface-dynamic);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### 3.4 Status Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
}
.badge--success { background: color-mix(in oklch, var(--color-success) 12%, transparent); color: var(--color-success); }
.badge--warning { background: color-mix(in oklch, var(--color-warning) 12%, transparent); color: var(--color-warning); }
.badge--error   { background: color-mix(in oklch, var(--color-error) 12%, transparent); color: var(--color-error); }
.badge--info    { background: color-mix(in oklch, var(--color-info) 12%, transparent); color: var(--color-info); }
.badge--neutral { background: var(--color-surface-offset); color: var(--color-text-muted); }
```

### 3.5 Floating Action Button (Reference Bottom-Right)

```css
.fab {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  width: 44px; height: 44px;
  border-radius: var(--radius-full);
  background: var(--color-text);
  color: var(--color-text-inverse);
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--shadow-float);
  cursor: pointer;
  transition: transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
              box-shadow 200ms ease;
  z-index: 100;
}
.fab:hover { transform: scale(1.08); box-shadow: var(--shadow-lg); }
.fab:active { transform: scale(0.95); }
```

---

## 🎬 SECTION 4 — ANIMATION & INTERACTION SYSTEM

### 4.1 Core Easing Curves (Use Exclusively)

```css
:root {
  --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);   /* Bouncy — FABs, modals */
  --ease-smooth:   cubic-bezier(0.16, 1, 0.3, 1);        /* Standard — cards, nav */
  --ease-enter:    cubic-bezier(0, 0, 0.2, 1);            /* Elements appearing */
  --ease-exit:     cubic-bezier(0.4, 0, 1, 1);            /* Elements disappearing */
  --ease-data:     cubic-bezier(0.4, 0, 0.2, 1);          /* Charts, progress bars */

  --duration-fast:   120ms;
  --duration-base:   220ms;
  --duration-slow:   380ms;
  --duration-xslow:  600ms;
}
```

### 4.2 Scroll Reveal Sequence

Every page uses **staggered entrance animations** on scroll. Apply via Intersection Observer:

```javascript
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      entry.target.style.animationDelay = `${i * 60}ms`;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
```

```css
[data-reveal] {
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity var(--duration-slow) var(--ease-enter),
    transform var(--duration-slow) var(--ease-enter);
}

[data-reveal].is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger variants */
[data-reveal="fade"]  { transform: none; }
[data-reveal="up"]    { transform: translateY(16px); }
[data-reveal="scale"] { transform: scale(0.97); }
[data-reveal="left"]  { transform: translateX(-16px); }

@media (prefers-reduced-motion: reduce) {
  [data-reveal] { opacity: 1; transform: none; transition: none; }
}
```

### 4.3 Page Transitions

```css
/* Soft fade between route changes */
.page-enter {
  animation: pageEnter var(--duration-slow) var(--ease-enter) forwards;
}

@keyframes pageEnter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### 4.4 Interactive Micro-Interactions

| Element | Interaction | CSS |
|---|---|---|
| Card hover | Lift + shadow grow | `translateY(-2px)` + `shadow-md` |
| Nav item hover | Bg fill + color shift | `background: var(--color-surface-dynamic)` |
| Button press | Scale down | `active: scale(0.97)` |
| FAB | Spring scale | `hover: scale(1.08)` |
| Progress bar | Count up on mount | JS counter + CSS width animate |
| Avatar hover | Scale up | `scale(1.15)` |
| Status badge | Pulse dot (for urgent) | `@keyframes pulse` |
| Toggle | Slide + color | `translateX` with spring easing |

### 4.5 Number Animation (for Stats/Progress)

```javascript
function animateCounter(el, target, duration = 1200) {
  const start = performance.now();
  const initial = 0;
  const update = (now) => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
    el.textContent = Math.round(initial + (target - initial) * eased);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
```

---

## 🏠 SECTION 5 — HOME PAGE (STORY-DRIVEN STRUCTURE)

The home page **must narrate a journey**, not list features. Follow this 7-act structure:

### Act 1 — The Hook (Hero Section)
- Full-width hero, no sidebar (landing/marketing context)
- ONE bold statement: what transformation does this app enable?
- Organic animated illustration in the background (CSS, no heavy libs)
- CTA: "Get started" → app dashboard | "See how it works" → scroll trigger

### Act 2 — The Problem (Pain Acknowledgment)
- 2-3 short, punchy statements of what life looks like WITHOUT this tool
- Use muted colors, slightly denser layout — evoke friction

### Act 3 — The Revelation (Product Introduction)
- Animated product screenshot / interactive mockup slides in
- Brief description: what is this, who is it for
- Use the warm card palette from the reference

### Act 4 — The Features (Shown, Not Listed)
- **NOT** a 3-column icon grid — use staggered cards with illustrations
- Each feature: full bleed section with visual on one side, copy on the other
- Alternate left/right to create reading rhythm
- Use `--color-art-1` through `--color-art-4` backgrounds per section
- Feature cards use the organic illustration style from the reference

### Act 5 — Social Proof
- Testimonials: avatar + name + role + quote
- NOT carousel — vertical staggered masonry layout
- Muted warm backgrounds, no borders (shadow elevation only)

### Act 6 — The Numbers
- 3-4 KPI stats that animate on scroll
- Large `--text-2xl` display font
- Warm accent underlines

### Act 7 — The CTA
- Full-bleed warm gradient section
- Final conversion moment
- Simple two-option split: Primary CTA + subtle text link

---

## 📱 SECTION 6 — MOBILE-SPECIFIC RULES

### 6.1 Touch Interaction Standards
- Minimum tap target: **44×44px** — no exceptions
- All interactive elements have `:active` state: `transform: scale(0.97)` + opacity `0.85`
- Swipe gestures for: dismissing notifications, navigating between tabs, pulling to refresh
- Long-press context menus on cards (where applicable)

### 6.2 Mobile Navigation
- Bottom tab bar: max 5 items. Icons + labels under 10 chars.
- Active tab: filled icon + primary color + slight elevation
- Tab bar background: `var(--color-surface)` with `backdrop-filter: blur(12px)` for glassmorphism effect
- Safe area insets respected: `padding-bottom: calc(var(--space-4) + env(safe-area-inset-bottom))`

### 6.3 Mobile Card Adaptations
- Full-width cards (no bento grid on mobile < 768px)
- Illustrated cards: artwork shifts to right side at 30% width
- Status cards: horizontal scroll container for multiple statuses
- Progress cards: 2-column `2×2` grid → single column below 400px

### 6.4 Mobile Typography
- Body: `--text-base` minimum (iOS zoom prevention)
- Section headings: `--text-lg`
- Card titles: `--text-base` semibold
- Metadata: `--text-xs` (12px floor, always)

---

## ⚙️ SECTION 7 — UX FUNDAMENTALS

### 7.1 Hierarchy Rules (Every Screen)
1. **ONE primary action per screen** — all other actions are secondary or tertiary
2. **F-pattern reading** — most important info top-left, secondary info follows natural scan
3. **Proximity** — related elements grouped with tighter spacing than unrelated elements
4. **Contrast** — not just color; use size, weight, and spacing to create hierarchy

### 7.2 Feedback States (ALL Must Be Designed)
Every interactive element needs:
- Default state
- Hover state (cursor: pointer)
- Focus state (visible ring: `2px solid var(--color-primary)`)
- Active/pressed state
- Disabled state (opacity: 0.4, cursor: not-allowed)
- Loading state (skeleton or spinner)
- Error state
- Success state

### 7.3 Empty States
Never show a blank screen. Every empty state must have:
- Relevant icon or soft illustration
- Warm explanatory message (first person: "You haven't added...")
- Primary action to resolve it
- Optional: animated entrance

### 7.4 Loading States
- **Skeleton screens** (NOT spinners) for content areas
- Skeleton matches the real layout shape exactly
- Shimmer animation: 1.5s `ease-in-out` infinite
- Respect `prefers-reduced-motion`: static skeleton, no shimmer

### 7.5 Error Handling
- Inline validation: message appears below field, `--color-error`, icon
- Never use alert() dialogs
- Page-level errors: full-width banner, dismissible, warm amber background
- Network errors: persistent toast, retry action included

---

## 🔒 SECTION 8 — ACCESSIBILITY (NON-NEGOTIABLE)

```
✅ Semantic HTML: nav, main, aside, section, article, header, footer
✅ One <h1> per page, logical heading hierarchy (h1 → h2 → h3)
✅ WCAG AA: 4.5:1 for body text, 3:1 for large text (24px+)
✅ All interactive elements keyboard-navigable (Tab, Enter, Space, Escape)
✅ Visible :focus-visible ring on every focusable element
✅ Alt text on all <img> elements; decorative: alt=""
✅ aria-label on all icon-only buttons
✅ Form inputs: <label for="..."> always paired
✅ prefers-reduced-motion: disable all animations
✅ prefers-color-scheme: respected as default; manual toggle available
✅ Touch targets: 44×44px minimum
✅ Skip navigation link as first focusable element
✅ No color as the ONLY means of conveying information
```

---

## 🌿 SECTION 9 — ORGANIC ILLUSTRATION STYLE (Reference-Derived)

The reference uses **3D-rendered organic art** — shell spirals, flower petals, leaf forms — in warm peach, teal, and cream palettes. Replicate this aesthetic using CSS and SVG:

### CSS Organic Shape Generator
```css
/* Organic blob shape for card decoration */
.organic-shape {
  position: absolute;
  bottom: -20px;
  right: -20px;
  width: 140px;
  height: 140px;
  opacity: 0.6;
  pointer-events: none;
}

/* Shell spiral using conic gradient */
.art-shell {
  background: conic-gradient(
    from 0deg,
    var(--color-art-1),
    var(--color-art-3),
    var(--color-art-2),
    var(--color-art-1)
  );
  border-radius: 60% 40% 70% 30% / 50% 60% 40% 70%;
  animation: morphShape 8s ease-in-out infinite;
}

@keyframes morphShape {
  0%, 100% { border-radius: 60% 40% 70% 30% / 50% 60% 40% 70%; }
  33%       { border-radius: 40% 60% 30% 70% / 60% 40% 70% 30%; }
  66%       { border-radius: 70% 30% 50% 50% / 30% 70% 60% 40%; }
}
```

### Illustration Color Rules Per Card Type
- **Report/Analytics card:** `--color-art-1` (muted teal-green)
- **Study/Learning card:** `--color-art-2` (warm peach-coral)
- **Event/Social card:** `--color-art-3` (warm neutral)
- **Alert/Priority card:** subtle `--color-art-4` (sand)

---

## 📐 SECTION 10 — DESIGN INTELLIGENCE RULES

These are the "thinking" rules — how to make intelligent design decisions when the prompt is ambiguous:

### 10.1 Spacing Intelligence
- Content breathing: section `padding-block: clamp(var(--space-8), 5vw, var(--space-16))`
- Card internal: `padding: var(--space-5)` to `var(--space-6)`
- Dense UI (tables, lists): `padding: var(--space-3)` per row
- Never use arbitrary pixel values — always reference a spacing token

### 10.2 Color Intelligence
- If a brand color exists: use it as `--color-primary`, ensure 4.5:1 contrast
- If no brand color: use teal `#01696f` as the default
- Max 2 non-neutral accent colors visible per viewport
- Charts may use extended palette (all `--color-*` tokens)
- Never use gradients on interactive buttons — solid accent only

### 10.3 Hierarchy Intelligence
- When unsure which element should be most prominent: ask "what action drives the most value?"
- That element gets the highest visual weight
- Everything else recedes to support it

### 10.4 Component Intelligence
- When choosing between a modal and a new page: **modal** if < 5 form fields; **new page** if > 5 or complex
- When choosing between a table and cards: **table** if > 5 columns; **cards** if visual/narrative
- When choosing between a toast and inline feedback: **inline** for errors; **toast** for success confirmations

### 10.5 Mobile Intelligence
- If a desktop layout has 3+ columns: stack to 1 column on mobile
- If a desktop table has > 4 columns: convert to card list on mobile
- If a feature requires hover: provide tap alternative on mobile
- Charts on mobile: reduce to sparklines or KPI numbers below 480px

---

## 🚀 SECTION 11 — IMPLEMENTATION CHECKLIST

Before marking any page as complete, verify all items:

### Visual
- [ ] Warm neutral background (no pure white, no pure black)
- [ ] Organic illustrated card art present on main dashboard
- [ ] SVG logo generated and placed
- [ ] Light + dark mode both render correctly
- [ ] Font pairing loaded via CDN (Fontshare preferred)
- [ ] Color count: ≤ 2 non-neutral accents per viewport
- [ ] All radius tokens used correctly (no arbitrary border-radius)
- [ ] Shadows are warm-tinted, not cold gray

### Interaction
- [ ] All cards have hover lift effect
- [ ] Scroll reveal animations on data-reveal elements
- [ ] Progress bars animate on mount
- [ ] Counters animate on scroll-enter
- [ ] FAB has spring animation
- [ ] Page transitions implemented

### UX
- [ ] Empty states designed for all data containers
- [ ] Loading skeletons match real layout
- [ ] Error states designed
- [ ] All form fields have paired labels
- [ ] Primary action is visually dominant on every screen

### Accessibility
- [ ] No text under 12px
- [ ] All contrast ratios pass WCAG AA
- [ ] Focus rings visible
- [ ] All icons have aria-labels
- [ ] Heading hierarchy logical

### Mobile
- [ ] Bottom nav bar implemented
- [ ] All tap targets ≥ 44px
- [ ] Cards go full-width below 768px
- [ ] No hover-only interactions
- [ ] Safe area insets respected

### Performance
- [ ] Images: `loading="lazy"`, `decoding="async"`, dimensions set
- [ ] Fonts: preconnect + font-display: swap
- [ ] JS: deferred or type="module"
- [ ] Animations respect prefers-reduced-motion

---

## 💡 ANTI-PATTERNS — NEVER DO THESE

```
🚫 Icon in a colored circle as a feature decoration — use flat icons or none
🚫 Gradient on buttons — solid accent color only
🚫 3-column symmetrical feature grid — use bento/staggered layout
🚫 Centered ALL text — left-align by default, center only hero headlines
🚫 Colored left-border on cards — use surface elevation instead
🚫 Pure CSS neon glows or electric accents — this is warm, not cyberpunk
🚫 Lorem ipsum in final output — all text must be application-specific
🚫 Generic hero copy ("Empowering your journey") — be specific to the app
🚫 Alert() dialogs — always use inline or custom toast patterns
🚫 localStorage/sessionStorage — use in-memory state (sandbox compatibility)
🚫 External images via guessed URLs — use generate_image or CDN only
🚫 Text below 12px — absolute minimum floor
🚫 More than 4-5 distinct type styles per page — audit ruthlessly
🚫 Purple/violet gradient backgrounds — warm neutrals only
🚫 Equal visual weight on 2+ CTAs — always ONE dominant action
```

---

## 📦 FILE STRUCTURE

```
[app-name]/
├── [app-name].html          ← Main app shell (descriptive filename)
├── assets/
│   ├── logo.svg             ← Custom SVG logo (inline preferred)
│   ├── illustrations/       ← Organic art assets
│   └── icons/               ← Any custom icons
└── (pages served via hash routing: #dashboard, #education, #settings)
```

---

*This prompt is a living design contract. Every decision made during development should trace back to one of the principles above. When in doubt: warm, minimal, purposeful.*

