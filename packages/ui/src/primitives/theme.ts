// ──────────────────────────────────────────────
// @poojly/ui — Design Tokens / Theme
// Spiritual saffron-based design system
//
// CANONICAL SAFFRON SOURCE: `saffron.500 = #E16318` (true saffron / kesari).
// This file is the single source of truth for the brand saffron. Web
// (apps/web/globals.css), mobile (apps/mobile/lib/theme.ts) and remotion
// (apps/remotion-pitch/src/tokens.ts) should derive their saffron from this
// value rather than hardcoding their own. (A2 owns globals.css, A3 owns the
// mobile theme, A7 owns remotion — they sync to #E16318 per their specs.)
// ──────────────────────────────────────────────

export const theme = {
  colors: {
    // Primary — Saffron / Kesari
    saffron: {
      50: "#FFF8F0",
      100: "#FFEFD6",
      200: "#FFDAA8",
      300: "#FFC170",
      400: "#FFA63D",
      500: "#E16318", // canonical true saffron (kesari) — single source of truth
      600: "#E07800",
      700: "#B85E00",
      800: "#8C4700",
      900: "#6B3500",
      950: "#3D1D00",
    },

    // Secondary — Temple Red / Sindoor
    sindoor: {
      50: "#FFF5F5",
      100: "#FFE0E0",
      200: "#FFC7C7",
      300: "#FFA0A0",
      400: "#FF6B6B",
      500: "#E53E3E",
      600: "#C53030",
      700: "#9B2C2C",
      800: "#822727",
      900: "#63171B",
      950: "#3B0D0D",
    },

    // Accent — Sacred Green / Tulsi
    tulsi: {
      50: "#F0FFF4",
      100: "#C6F6D5",
      200: "#9AE6B4",
      300: "#68D391",
      400: "#48BB78",
      500: "#38A169",
      600: "#2F855A",
      700: "#276749",
      800: "#22543D",
      900: "#1C4532",
      950: "#0D2818",
    },

    // Neutral — Warm Stone
    stone: {
      50: "#FAFAF9",
      100: "#F5F5F4",
      200: "#E7E5E4",
      300: "#D6D3D1",
      400: "#A8A29E",
      500: "#78716C",
      600: "#57534E",
      700: "#44403C",
      800: "#292524",
      900: "#1C1917",
      950: "#0C0A09",
    },

    // Sacred Gold — for highlights and premium
    gold: {
      50: "#FFFDF5",
      100: "#FFF9E0",
      200: "#FFF0B8",
      300: "#FFE480",
      400: "#FFD54F",
      500: "#FFC107",
      600: "#E5A100",
      700: "#B88000",
      800: "#8C6200",
      900: "#6B4A00",
      950: "#3D2A00",
    },

    // Spiritual Purple — for meditation / premium content
    mystic: {
      50: "#FAF5FF",
      100: "#F3E8FF",
      200: "#E9D5FF",
      300: "#D8B4FE",
      400: "#C084FC",
      500: "#A855F7",
      600: "#9333EA",
      700: "#7E22CE",
      800: "#6B21A8",
      900: "#581C87",
      950: "#3B0764",
    },

    // Semantic
    success: "#38A169",
    warning: "#DD6B20",
    error: "#E53E3E",
    info: "#3182CE",

    // Surfaces
    background: "#FFFBF5",
    surface: "#FFFFFF",
    surfaceElevated: "#FFFDF7",
    border: "#E7E5E4",
    borderLight: "#F5F5F4",
  },

  spacing: {
    px: "1px",
    0: "0",
    0.5: "0.125rem",
    1: "0.25rem",
    1.5: "0.375rem",
    2: "0.5rem",
    2.5: "0.625rem",
    3: "0.75rem",
    3.5: "0.875rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    7: "1.75rem",
    8: "2rem",
    9: "2.25rem",
    10: "2.5rem",
    12: "3rem",
    14: "3.5rem",
    16: "4rem",
    20: "5rem",
    24: "6rem",
    32: "8rem",
    40: "10rem",
    48: "12rem",
    56: "14rem",
    64: "16rem",
  },

  borderRadius: {
    none: "0",
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    "2xl": "1rem",
    "3xl": "1.5rem",
    full: "9999px",
  },

  fontSize: {
    xs: ["0.75rem", { lineHeight: "1rem" }],
    sm: ["0.875rem", { lineHeight: "1.25rem" }],
    base: ["1rem", { lineHeight: "1.5rem" }],
    lg: ["1.125rem", { lineHeight: "1.75rem" }],
    xl: ["1.25rem", { lineHeight: "1.75rem" }],
    "2xl": ["1.5rem", { lineHeight: "2rem" }],
    "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
    "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
    "5xl": ["3rem", { lineHeight: "1" }],
  },

  fontFamily: {
    sans: [
      "Inter",
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "Segoe UI",
      "sans-serif",
    ],
    serif: ["Noto Serif Devanagari", "Georgia", "serif"],
    devanagari: ["Noto Sans Devanagari", "sans-serif"],
    mono: ["JetBrains Mono", "Fira Code", "monospace"],
  },

  shadows: {
    sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)",
    xl: "0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
    glow: "0 0 20px rgba(225, 99, 24, 0.3)", // saffron.500 #E16318
    inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
  },

  animation: {
    durations: {
      fast: "150ms",
      normal: "250ms",
      slow: "400ms",
    },
    easings: {
      ease: "cubic-bezier(0.4, 0, 0.2, 1)",
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
      spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    },
  },

  zIndex: {
    dropdown: 50,
    sticky: 100,
    overlay: 200,
    modal: 300,
    popover: 400,
    toast: 500,
  },
} as const;

export type Theme = typeof theme;
