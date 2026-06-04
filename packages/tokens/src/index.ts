/**
 * WaveTap design tokens — single source of truth, shared by web (Tailwind v4)
 * and native (heroui-native / Uniwind).
 *
 * The values are AUTHORED as W3C DTCG JSON in `design-tokens/` and compiled
 * into `tokens.gen.ts` + `theme.css` by `build.mjs`. This file just re-exports
 * the generated tokens. To change a token: edit `design-tokens/*.json`, then
 * `pnpm --filter @wavetap/tokens build`.
 *
 * Web applies the brand by importing `@wavetap/tokens/theme.css` (HeroUI v3
 * variable overrides). Native consumes these JS objects directly via Uniwind.
 * Never hardcode a hex, size, or radius — reference a token.
 */
export {
  colors,
  spacing,
  radius,
  shadows,
  fontFamily,
  fontSizes,
  fontWeights,
  lineHeights,
  tokens,
  type Tokens,
} from "./tokens.gen";
