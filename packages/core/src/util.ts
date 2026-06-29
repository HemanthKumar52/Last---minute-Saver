/** Clamp a number to [0,1]. */
export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Round to one decimal place. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
