/**
 * WaveTap design tokens — single source of truth, shared by web (Tailwind v4)
 * and native (heroui-native / Uniwind).
 *
 * Derived from 09_DESIGN_SYSTEM.md. This is a hand-authored starter set —
 * to be REGENERATED from the W3C DTCG `design-tokens/` source once that lands
 * (the old design-tokens/ was removed pending a fresh build). Keep the shape
 * stable so it maps cleanly onto HeroUI's theme variables.
 */

export const colors = {
  // Warm neutrals
  neutral: {
    50: "#FAFAF8",
    100: "#F5F4F0",
    200: "#E8E6E0",
    300: "#D1CEC5",
    400: "#A8A49A",
    500: "#7A756B",
    600: "#5C5850",
    700: "#3D3A34",
    800: "#2A2824",
    900: "#1A1916",
  },
  // Hero accent — warm coral
  accent: {
    50: "#FFF5F2",
    100: "#FFE8E0",
    200: "#FFD0C0",
    300: "#FFB09A",
    400: "#FF8B6A",
    500: "#E8694A",
    600: "#C9523A",
    700: "#A13D2C",
  },
  semantic: {
    success: "#4A9A6B",
    warning: "#D4953A",
    error: "#C94A4A",
    info: "#4A7AC9",
  },
} as const;

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(26, 25, 22, 0.06)",
  md: "0 4px 12px rgba(26, 25, 22, 0.08)",
  lg: "0 8px 24px rgba(26, 25, 22, 0.12)",
  xl: "0 16px 48px rgba(26, 25, 22, 0.16)",
} as const;

export const fontSizes = {
  "heading-xl": "32px",
  "heading-lg": "24px",
  "heading-md": "20px",
  "body-lg": "18px",
  body: "16px",
  "body-sm": "14px",
} as const;

export const tokens = { colors, spacing, radius, shadows, fontSizes } as const;

export type Tokens = typeof tokens;
