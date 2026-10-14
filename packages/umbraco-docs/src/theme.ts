/**
 * The violet every TheBuilder Umbraco docs site shares, from the middle of the family's
 * blue-violet-pink gradient. Each shade meets WCAG AA (4.5:1) as link text on its mode's
 * background and with its button label: white on the light shade (4.9:1), dark on the dark shade
 * (7.6:1), which Blume picks automatically.
 */
export const DOCS_ACCENT = { light: "#7557e8", dark: "#a78bfa" } as const;

/**
 * The shared Blume theme for package docs sites, so they look like one family. Spread it into
 * `theme` in `blume.config.ts`, before any site-specific settings. Needs Blume 2, which takes an
 * accent per color mode.
 */
export const docsTheme = {
  accent: DOCS_ACCENT,
  fonts: { display: "inter-tight" },
} as const;
