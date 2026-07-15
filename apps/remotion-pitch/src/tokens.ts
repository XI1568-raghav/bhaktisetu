// Brand tokens — canonical saffron is #E16318 (true saffron).
// This is the single source of truth for saffron.500 per @poojly/ui
// (packages/ui/src/primitives/theme.ts). Web/mobile/admin should derive
// their saffron from the same value — do NOT hand-pick a per-app copper.
//
// The old code hardcoded copper #b87333 / rgba(184,115,51,...) in several
// components — that drift is fixed: every glow/shadow now derives from
// SAFFRON below. Do not reintroduce copper.

export const SAFFRON = '#E16318';
export const SAFFRON_DEEP = '#943B19';
export const SAFFRON_LIGHT = '#F99A48';
export const GOLD = '#d4a438';
export const INK = '#2a2520';
export const INK_DIM = '#6b635a';
export const BG = '#f5f3ef';
export const BG_SOFT = '#faf8f3';

// rgba helpers so glows/shadows always track the canonical saffron.
export const saffronGlow = (alpha: number) => `rgba(225, 99, 24, ${alpha})`;
export const goldGlow = (alpha: number) => `rgba(212, 164, 56, ${alpha})`;
export const inkShadow = (alpha: number) => `rgba(42, 37, 32, ${alpha})`;

// Fonts are loaded via @font-face in <FontStyle> (see components/FontStyle.tsx)
// from /fonts/*.woff2 in public/. Cabinet Grotesk + Satoshi are NOT on Google
// Fonts — they are Fontshare families bundled locally so the headless Chromium
// render uses the real brand typeface, not a Helvetica fallback.
export const FONT_DISPLAY = '"Cabinet Grotesk", "Helvetica Neue", Helvetica, sans-serif';
export const FONT_BODY = '"Satoshi", "Inter", system-ui, sans-serif';

// Canonical font file names (in public/fonts/).
export const FONT_FILES = {
  cabinetRegular: '/fonts/CabinetGrotesk-Regular.woff2',
  cabinetBold: '/fonts/CabinetGrotesk-Bold.woff2',
  satoshiRegular: '/fonts/Satoshi-Regular.woff2',
  satoshiMedium: '/fonts/Satoshi-Medium.woff2',
  satoshiBold: '/fonts/Satoshi-Bold.woff2',
} as const;

// --- Dark-mode SaaS demo palette (per Master Creative Prompt) ---
// Deep dark base with vibrant glowing saffron/gold brand accent.
export const VOID = '#0D0D12'; // deep dark base (#0D0D12)
export const VOID_2 = '#15151D'; // panel base
export const VOID_3 = '#1E1E28'; // raised panel
export const WHITE = '#F5F5F7'; // pristine text
export const LINE = 'rgba(255,255,255,0.08)'; // hairline borders on dark
export const LINE_BRIGHT = 'rgba(255,255,255,0.16)';

// mesh-gradient brand glow colors (saffron + gold + a warm magenta for richness)
export const MESH = {
  saffron: 'rgba(225, 99, 24, 0.55)',
  gold: 'rgba(212, 164, 56, 0.45)',
  magenta: 'rgba(225, 60, 90, 0.35)',
  void: 'rgba(13, 13, 18, 0)',
} as const;

// easing presets — NO linear. Custom bezier / spring feel.
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const; // fast snap, slow settle
export const EASE_IN_OUT_QUART = [0.76, 0, 0.24, 1] as const;
export const EASE_OUT_BACK = [0.34, 1.56, 0.64, 1] as const; // overshoot bounce
