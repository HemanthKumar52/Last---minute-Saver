/**
 * @clutch/tokens — the single source of truth for Clutch's design language.
 * Consumed by apps/web (Tailwind v4 CSS vars mirror these) and apps/mobile (NativeWind).
 * Built on the Claude design system: warm cream canvas, scarce coral action, dark-navy AI surface.
 */

export const colors = {
  // Calm surfaces
  canvas: "#faf9f5",
  surfaceSoft: "#f5f0e8",
  surfaceCard: "#efe9de",
  surfaceCreamStrong: "#e8e0d2",
  // The AI engine surface
  surfaceDark: "#181715",
  surfaceDarkElevated: "#252320",
  surfaceDarkSoft: "#1f1e1b",
  // Text
  ink: "#141413",
  body: "#3d3d3a",
  bodyStrong: "#252523",
  muted: "#6c6a64",
  mutedSoft: "#8e8b82",
  // Lines
  hairline: "#e6dfd8",
  hairlineSoft: "#ebe6df",
  // The Action (coral) — scarce, primary CTA only
  action: "#cc785c",
  actionPress: "#a9583e",
  actionDisabled: "#e6dfd8",
  onAction: "#ffffff",
  // On dark
  onDark: "#faf9f5",
  onDarkSoft: "#a09d96",
  // Radar — semantic, the only strong color signal
  radarGreen: "#5db872",
  radarAmber: "#e8a55a",
  radarRed: "#c64545",
} as const;

export type ColorToken = keyof typeof colors;

/** 4px-based spacing scale (px). */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 96,
} as const;

/** Border radius scale (px). */
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  pill: 9999,
} as const;

/** Font CSS variables (wired by next/font on web, expo-font on mobile). */
export const font = {
  display: "var(--font-display)", // EB Garamond — slab-serif display substitute
  body: "var(--font-body)", // Inter — humanist sans
  mono: "var(--font-mono)", // JetBrains Mono — tabular countdown
} as const;

/** Type scale: [fontSize px, lineHeight, letterSpacing px]. */
export const type = {
  displayXl: { size: 60, line: 1.05, tracking: -1.5, family: font.display, weight: 400 },
  displayLg: { size: 44, line: 1.1, tracking: -1, family: font.display, weight: 400 },
  displayMd: { size: 34, line: 1.15, tracking: -0.5, family: font.display, weight: 400 },
  displaySm: { size: 26, line: 1.2, tracking: -0.3, family: font.display, weight: 400 },
  titleLg: { size: 22, line: 1.3, tracking: 0, family: font.body, weight: 500 },
  titleMd: { size: 18, line: 1.4, tracking: 0, family: font.body, weight: 500 },
  titleSm: { size: 16, line: 1.4, tracking: 0, family: font.body, weight: 500 },
  bodyMd: { size: 16, line: 1.55, tracking: 0, family: font.body, weight: 400 },
  bodySm: { size: 14, line: 1.55, tracking: 0, family: font.body, weight: 400 },
  caption: { size: 13, line: 1.4, tracking: 0, family: font.body, weight: 500 },
  captionUpper: { size: 12, line: 1.4, tracking: 1.5, family: font.body, weight: 500 },
} as const;

export type RadarState = "green" | "amber" | "red";

export const radarColor: Record<RadarState, string> = {
  green: colors.radarGreen,
  amber: colors.radarAmber,
  red: colors.radarRed,
};

/** Parse a #rrggbb hex into [r,g,b]. */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear interpolation between two hex colors. t in [0,1]. */
export function lerpColor(a: string, b: string, t: number): string {
  const tt = Math.max(0, Math.min(1, t));
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * tt, ag + (bg - ag) * tt, ab + (bb - ab) * tt);
}

/**
 * The Save Me button color: coral when calm, interpolating to red as urgency rises.
 * `urgency` in [0,1] — typically derived from the most-urgent task's slack ratio (see @clutch/core).
 */
export function saveMeColor(urgency: number): string {
  return lerpColor(colors.action, colors.radarRed, urgency);
}
